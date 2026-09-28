import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import {
  TEST_POLICY_REPAIR_V40,
  V40_ALLOWED_PATHS,
  projectV40ToV39,
} from "../src/project-control-v40.js";
import {
  TEST_POLICY_INTEGRATION_V41,
  V41_ALLOWED_PATHS,
  inspectIntegrationRepository,
  projectV41ToV40,
  v41PathsAllowed,
  validateIntegrationPullRequestReceipt,
  type IntegrationCreationEvidence,
  type IntegrationLiveEvidence,
  type IntegrationLocalEvidence,
  type IntegrationMergeReceipt,
} from "../src/project-control-integration.js";

const root = new URL("../", import.meta.url);
const c = TEST_POLICY_INTEGRATION_V41;
const base = TEST_POLICY_REPAIR_V40.baseline;
const published: string = TEST_POLICY_REPAIR_V40.publishedBaseline;
const repository = "Eak-dev/malispang-lineOA";
const sourceBranch = "codex/test-policy-v40";
const targetBranch = "codex/mp-06-guardrailed-ai";
const controlPaths = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
] as const;
type Document = Record<string, unknown> & {
  version: string;
  testPolicyIntegrationV41: Record<string, unknown>;
  properties: Record<string, unknown>;
  required: string[];
};
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as Document;
const fixtures = () => ({
  r: read(controlPaths[0]),
  w: read(controlPaths[1]),
  s: read(controlPaths[2]),
});
const ownerRecord = () =>
  readFileSync(new URL("docs/project/OWNER_DECISION_LOG.md", root), "utf8");
const record = (value: unknown) => value as Record<string, unknown>;
const git = (cwd: string, args: string[], input?: string) =>
  execFileSync(projectControlGitExecutable(), args, {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const identity = [
  "-c",
  "user.name=Synthetic Test",
  "-c",
  "user.email=synthetic@example.invalid",
  "-c",
  "commit.gpgsign=false",
];
const commit = (cwd: string, message = "synthetic v41 source fixture") => {
  git(cwd, ["add", "--all"]);
  git(cwd, [...identity, "commit", "--quiet", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
};

/** Git writes below affect only freshly created, disposable synthetic fixtures. */
async function withFixture(run: (cwd: string) => Promise<void> | void) {
  const cwd = await mkdtemp(join(tmpdir(), "mp06-v41-fixture-"));
  // A disposable source fixture is not the runner's real PR checkout. Dedicated
  // adapter tests below replace this with their own exact synthetic event.
  const priorEventName = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    git(fileURLToPath(root), [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      fileURLToPath(root),
      cwd,
    ]);
    git(cwd, ["checkout", "--quiet", "--detach", base]);
    for (const path of new Set([...V40_ALLOWED_PATHS, ...V41_ALLOWED_PATHS])) {
      if (!existsSync(new URL(path, root))) continue;
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await copyFile(new URL(path, root), join(cwd, path));
    }
    await run(cwd);
  } finally {
    if (priorEventName === undefined) delete process.env.GITHUB_EVENT_NAME;
    else process.env.GITHUB_EVENT_NAME = priorEventName;
    await rm(cwd, { recursive: true, force: true });
  }
}

describe("v41 exact control-only adoption, not runtime or tool authority", () => {
  it("validates current manifests and projects exactly to the qualified v40 snapshot", async () => {
    const { r, w, s } = fixtures();
    expect(r.version).toBe("2026.09.29-v41");
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ),
    ).toEqual([]);
    expect(validateWp8fOwnerDecisionRecord(ownerRecord(), r.version)).toBe(
      true,
    );
    await expect(runProjectControlValidation(root)).resolves.toBeUndefined();
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
      toolPermission: "NOT_EVALUATED",
    });
    for (const action of [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ])
      expect(evaluateProjectAction(r, w, action).allowed, action).toBe(true);
    const snapshot = JSON.parse(
      readFileSync(
        new URL("tests/fixtures/mp06-v40-qualified/snapshot.json", root),
        "utf8",
      ),
    ) as {
      files: Record<string, { content: string }>;
    };
    projectV41ToV40(r, w, s);
    for (const [index, value] of [r, w, s].entries())
      expect(value).toEqual(
        JSON.parse(snapshot.files[controlPaths[index]!]!.content),
      );
    expect(validateProjectControl(r, w).errors).toEqual([]);
    projectV40ToV39(r, w, s);
    for (const [index, value] of [r, w, s].entries())
      expect(value).toEqual(
        JSON.parse(
          git(fileURLToPath(root), ["show", `${base}:${controlPaths[index]!}`]),
        ),
      );
  });

  it.each(Object.keys(c))("rejects integration-authority drift: %s", (key) => {
    const { r, w } = fixtures();
    w.testPolicyIntegrationV41[key] = "unapproved";
    expect(validateProjectControl(r, w).errors.length).toBeGreaterThan(0);
    expect(evaluateProjectAction(r, w, "LOCAL_IMPLEMENTATION").allowed).toBe(
      false,
    );
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      status: "ROADMAP_UNVERIFIED",
      allowedActions: [],
      remoteExecutionAuthorized: false,
    });
  });

  it("rejects open schema, duplicate requirement, expanded grants and forged Owner records", () => {
    const { r, w, s } = fixtures();
    s.properties.testPolicyIntegrationV41 = { type: "object" };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ).length,
    ).toBeGreaterThan(0);
    const duplicate = fixtures().s;
    duplicate.required.push("testPolicyIntegrationV41");
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        duplicate,
        r.version,
      ).length,
    ).toBeGreaterThan(0);
    w.testPolicyIntegrationV41.extraGrant = true;
    expect(validateProjectControl(r, w).errors.length).toBeGreaterThan(0);
    for (const text of [
      "Owner approved",
      ownerRecord().replace("MP-OD-2026-09-29-V41", "MP-OD-2026-09-29-FORGED"),
      ownerRecord() + "\n## MP-OD-2026-09-29-V41 — duplicate",
    ])
      expect(validateWp8fOwnerDecisionRecord(text, r.version)).toBe(false);
  });

  it.each([
    "DEPLOY_TEST",
    "ACTIVATE_TEST",
    "SEND_LINE",
    "CALL_PROVIDER",
    "QUERY_STORAGE",
    "RELEASE_STORAGE_HOLD",
    "QUERY_PRODUCTION",
    "DEPLOY_PRODUCTION",
    "RESET",
    "REBASE",
    "FORCE_PUSH",
    "MERGE_DEFAULT_BRANCH",
    "MERGE_MP06_PR18",
    "MERGE_PR16",
    "CREATE_PR",
    "UPDATE_NOTION",
    "CLOSE_ISSUE",
    "ACTIVATE_SUCCESSOR_V22",
    "OPEN_CONTINUATION",
    "CLOSE_OWNER_HANDOFF",
    "START_MP07",
    "LOCAL_RUNTIME_IMPLEMENTATION",
    "UNKNOWN",
    "",
  ])(
    "denies %s despite caller approval and inherited legacy booleans",
    (action) => {
      const { r, w } = fixtures();
      expect(
        evaluateProjectAction(r, w, action, undefined, {
          approved: true,
          remoteExecution: true,
          toolPermission: "ALLOWED",
          ...summarizeProjectAuthority(r, w),
        }).allowed,
      ).toBe(false);
    },
  );

  it.each([
    "COMMIT",
    "PUSH_BRANCH",
    "CREATE_DRAFT_PR",
    "READY_FOR_REVIEW",
    "MERGE_MP06_POLICY",
    "UPDATE_GITHUB_ROADMAP",
  ])(
    "does not authorize %s from absent or generic caller evidence",
    (action) => {
      const { r, w } = fixtures();
      expect(evaluateProjectAction(r, w, action).allowed).toBe(false);
      expect(
        evaluateProjectAction(r, w, action, undefined, { approved: true })
          .allowed,
      ).toBe(false);
    },
  );

  it.each([
    "worker/index.ts",
    "worker/durable-objects.ts",
    "wrangler.jsonc",
    "package.json",
    "pnpm-lock.yaml",
    ".env",
    "../src/project-control.ts",
    "src/../src/project-control.ts",
    "src/project-control.ts\n",
    "tests/*.test.ts",
    ".github/workflows/ci.yml",
    "tests/fixtures/mp06-v40-qualified/arbitrary.json",
  ])("rejects out-of-scope, wildcard or aliased path %s", (path) => {
    expect(v41PathsAllowed([path])).toBe(false);
  });
});

const localEvidence = (
  stage: IntegrationLocalEvidence["stage"] = "PRE_COMMIT",
): IntegrationLocalEvidence => ({
  kind: "LOCAL_QUALIFICATION",
  repository,
  headBranch: sourceBranch,
  baseBranch: targetBranch,
  baseHead: published,
  stage,
  head: stage === "PRE_COMMIT" ? base : "a".repeat(40),
  candidateParent: base,
  tree: "b".repeat(40),
  qualifiedTree: "b".repeat(40),
  diffSha256: "c".repeat(64),
  reviewedDiffSha256: "c".repeat(64),
  snapshotSha256: c.qualifiedSnapshotSha256,
  validation: "PASS",
  independentReview: "NO_ACTIONABLE_FINDINGS",
  workingTreeClean: stage === "POST_COMMIT",
});
const dates = () => {
  const checked = Date.now();
  return {
    observedAt: new Date(checked - 1_000).toISOString(),
    checkedAt: new Date(checked).toISOString(),
  };
};
const creationEvidence = (): IntegrationCreationEvidence => ({
  kind: "DRAFT_CREATION",
  local: localEvidence("POST_COMMIT"),
  creationState: "UNUSED",
  existingPullRequests: [],
  ...dates(),
});
const liveEvidence = (): IntegrationLiveEvidence => ({
  kind: "LIVE_GITHUB_INTEGRATION",
  repository,
  headBranch: sourceBranch,
  baseBranch: targetBranch,
  baseHead: published,
  pullRequest: 123,
  headSha: "a".repeat(40),
  expectedHeadSha: "a".repeat(40),
  state: "open",
  draft: false,
  mergeMethod: "merge",
  ciHeadSha: "a".repeat(40),
  ciRunId: 1234,
  ciConclusion: "success",
  reviewHeadSha: "a".repeat(40),
  reviewCheckRunId: 5678,
  reviewCheckName: "Greptile Review",
  reviewConclusion: "success",
  unresolvedFindings: 0,
  reviewCommentsAdded: 0,
  creationState: "CONSUMED",
  creationPullRequest: 123,
  mergeState: "UNUSED",
  ...dates(),
});
const action = (name: string, evidence: unknown) => {
  const { r, w } = fixtures();
  return evaluateProjectAction(r, w, name, undefined, evidence).allowed;
};

describe("v41 staged publication gates require exact independently authenticated receipts", () => {
  it("distinguishes pre-commit qualification, committed-source push, creation and reviewed merge", () => {
    expect(action("COMMIT", localEvidence())).toBe(true);
    expect(action("PUSH_BRANCH", localEvidence("POST_COMMIT"))).toBe(true);
    expect(action("COMMIT", localEvidence("POST_COMMIT"))).toBe(false);
    expect(action("PUSH_BRANCH", localEvidence())).toBe(false);
    expect(action("CREATE_DRAFT_PR", creationEvidence())).toBe(true);
    const reviewed = liveEvidence();
    expect(action("READY_FOR_REVIEW", { ...reviewed, draft: true })).toBe(true);
    expect(action("MERGE_MP06_POLICY", { ...reviewed, draft: true })).toBe(
      false,
    );
    expect(action("MERGE_MP06_POLICY", reviewed)).toBe(true);
    expect(action("UPDATE_GITHUB_ROADMAP", reviewed)).toBe(true);
    // A successful tuple never becomes a transferable runtime/default-branch grant.
    for (const name of [
      "DEPLOY_TEST",
      "QUERY_STORAGE",
      "MERGE_DEFAULT_BRANCH",
      "MERGE_PR16",
      "MERGE_MP06_PR18",
      "CLOSE_ISSUE",
    ])
      expect(action(name, reviewed), name).toBe(false);
  });

  it.each([
    ["repository", "Other/repo"],
    ["headBranch", "codex/unapproved"],
    ["baseBranch", "main"],
    ["baseHead", "d".repeat(40)],
    ["head", "invalid"],
    ["candidateParent", "invalid"],
    ["qualifiedTree", "d".repeat(40)],
    ["tree", "invalid"],
    ["diffSha256", "invalid"],
    ["reviewedDiffSha256", "d".repeat(64)],
    ["snapshotSha256", "d".repeat(64)],
    ["validation", "NOT_RUN"],
    ["independentReview", "FINDINGS"],
    ["extraApproval", true],
  ])("rejects local qualification drift %s", (key, value) => {
    for (const [name, stage] of [
      ["COMMIT", "PRE_COMMIT"],
      ["PUSH_BRANCH", "POST_COMMIT"],
    ] as const) {
      const evidence = localEvidence(stage);
      record(evidence)[key] = value;
      expect(action(name, evidence), `${name}:${key}`).toBe(false);
    }
  });

  it("requires the pre-commit parent and a clean, genuinely new post-commit HEAD", () => {
    expect(
      action("COMMIT", { ...localEvidence(), candidateParent: "d".repeat(40) }),
    ).toBe(false);
    expect(
      action("PUSH_BRANCH", {
        ...localEvidence("POST_COMMIT"),
        workingTreeClean: false,
      }),
    ).toBe(false);
    expect(
      action("PUSH_BRANCH", { ...localEvidence("POST_COMMIT"), head: base }),
    ).toBe(false);
  });

  it.each([
    "consumed",
    "in-flight",
    "unknown",
    "existing-pr",
    "old-observation",
    "future-observation",
    "wrong-stage",
    "dirty-source",
    "extra-field",
  ])("does not create a duplicate or unverified Draft PR: %s", (variant) => {
    const evidence = creationEvidence();
    if (["consumed", "in-flight", "unknown"].includes(variant))
      record(evidence).creationState = variant.toUpperCase();
    if (variant === "existing-pr")
      record(evidence).existingPullRequests = [123];
    if (variant === "old-observation")
      evidence.observedAt = new Date(
        Date.parse(evidence.checkedAt) - 120_001,
      ).toISOString();
    if (variant === "future-observation")
      evidence.observedAt = new Date(
        Date.parse(evidence.checkedAt) + 1,
      ).toISOString();
    if (variant === "wrong-stage") evidence.local = localEvidence();
    if (variant === "dirty-source") evidence.local.workingTreeClean = false;
    if (variant === "extra-field") record(evidence).approved = true;
    expect(action("CREATE_DRAFT_PR", evidence)).toBe(false);
  });

  it.each([
    ["repository", "Other/repo"],
    ["headBranch", "codex/unapproved"],
    ["baseBranch", "main"],
    ["baseHead", "d".repeat(40)],
    ["pullRequest", 16],
    ["pullRequest", 18],
    ["pullRequest", 0],
    ["headSha", "d".repeat(40)],
    ["expectedHeadSha", "d".repeat(40)],
    ["state", "closed"],
    ["mergeMethod", "squash"],
    ["mergeMethod", "rebase"],
    ["ciHeadSha", "d".repeat(40)],
    ["ciRunId", 0],
    ["ciConclusion", "failure"],
    ["reviewHeadSha", "d".repeat(40)],
    ["reviewCheckRunId", 0],
    ["reviewCheckName", "Unverified Review"],
    ["reviewConclusion", "failure"],
    ["unresolvedFindings", 1],
    ["reviewCommentsAdded", 1],
    ["creationState", "UNUSED"],
    ["creationPullRequest", 456],
    ["mergeState", "CONSUMED"],
    ["mergeState", "IN_FLIGHT"],
    ["mergeState", "UNKNOWN"],
    ["observedAt", "invalid"],
    ["checkedAt", "invalid"],
    ["approved", true],
  ])(
    "rejects wrong/stale identity or reusable grant in live field %s=%s",
    (key, value) => {
      const evidence = liveEvidence();
      record(evidence)[key] = value;
      for (const name of [
        "READY_FOR_REVIEW",
        "MERGE_MP06_POLICY",
        "UPDATE_GITHUB_ROADMAP",
      ])
        expect(action(name, evidence), `${name}:${key}`).toBe(false);
    },
  );

  it.each(["stale", "future"])(
    "rejects %s observation even when CI and review SHAs agree",
    (variant) => {
      const evidence = liveEvidence();
      evidence.observedAt = new Date(
        Date.parse(evidence.checkedAt) + (variant === "stale" ? -120_001 : 1),
      ).toISOString();
      for (const name of [
        "READY_FOR_REVIEW",
        "MERGE_MP06_POLICY",
        "UPDATE_GITHUB_ROADMAP",
      ])
        expect(action(name, evidence)).toBe(false);
    },
  );

  it.each(["two-short-windows", "entirely-old-pair", "future-check"])(
    "checks absolute observation age, not only relative timestamps: %s",
    (variant) => {
      const evidence = liveEvidence();
      const now = Date.now();
      if (variant === "two-short-windows") {
        evidence.observedAt = new Date(now - 170_000).toISOString();
        evidence.checkedAt = new Date(now - 60_000).toISOString();
      } else if (variant === "entirely-old-pair") {
        evidence.observedAt = new Date(now - 600_000).toISOString();
        evidence.checkedAt = new Date(now - 599_000).toISOString();
      } else {
        evidence.observedAt = new Date(now - 1_000).toISOString();
        evidence.checkedAt = new Date(now + 60_000).toISOString();
      }
      const creation = {
        ...creationEvidence(),
        observedAt: evidence.observedAt,
        checkedAt: evidence.checkedAt,
      };
      expect(action("CREATE_DRAFT_PR", creation)).toBe(false);
      for (const name of [
        "READY_FOR_REVIEW",
        "MERGE_MP06_POLICY",
        "UPDATE_GITHUB_ROADMAP",
      ])
        expect(action(name, evidence), name).toBe(false);
    },
  );

  it("rejects non-data/accessor receipts without evaluating attacker-supplied getters", () => {
    let reads = 0;
    for (const [name, evidence] of [
      ["COMMIT", localEvidence()],
      ["CREATE_DRAFT_PR", creationEvidence()],
      ["MERGE_MP06_POLICY", liveEvidence()],
    ] as const) {
      Object.defineProperty(evidence, "kind", {
        enumerable: true,
        get() {
          reads++;
          throw new Error("getter must not run");
        },
      });
      expect(action(name, evidence)).toBe(false);
    }
    expect(reads).toBe(0);
  });
});

describe("v41 independently inspected source, index and full history", () => {
  it("accepts the exact uncommitted overlay and its synthetic committed source", async () => {
    await withFixture(async (cwd) => {
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "LOCAL_SOURCE",
        remoteExecutionAuthorized: false,
      });
      const source = commit(cwd);
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "SOURCE_COMMIT",
        sourceHead: source,
        head: source,
        clean: true,
        remoteExecutionAuthorized: false,
      });
      await expect(
        runProjectControlValidation(pathToFileURL(cwd + "/")),
      ).resolves.toBeUndefined();
    });
  });

  it.each([
    "journal-reset",
    "grant-reset",
    "root-authorization",
    "owner-history",
    "policy-history",
    "frozen-v40-module",
    "qualified-snapshot",
    "staged-manifest-restored",
    "staged-runtime-restored",
    "staged-symlink-restored",
    "staged-gitlink-restored",
    "committed-manifest-restored",
    "committed-runtime-restored",
    "committed-symlink-restored",
    "committed-baseline-reset",
    "shallow-history",
  ])("rejects independently observed %s", async (variant) => {
    await withFixture(async (cwd) => {
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).not.toThrow();
      if (variant.startsWith("committed")) commit(cwd);
      const path =
        variant.includes("symlink") || variant.includes("gitlink")
          ? "src/project-control.ts"
          : variant.includes("runtime")
            ? "worker/index.ts"
            : variant === "owner-history"
              ? "docs/project/OWNER_DECISION_LOG.md"
              : variant === "policy-history"
                ? "docs/project/TEST_OPERATION_POLICY_TH.md"
                : variant === "frozen-v40-module"
                  ? "src/project-control-v40.ts"
                  : variant === "qualified-snapshot"
                    ? "tests/fixtures/mp06-v40-qualified/snapshot.json"
                    : "config/project/current-work.json";
      const original = readFileSync(join(cwd, path), "utf8");
      if (variant.includes("symlink")) {
        await rm(join(cwd, path));
        await symlink("project-control-v40.ts", join(cwd, path));
      } else if (variant.includes("gitlink")) {
        git(cwd, [
          "update-index",
          "--add",
          "--cacheinfo",
          `160000,${git(cwd, ["rev-parse", "HEAD"])},${path}`,
        ]);
      } else if (variant === "shallow-history") {
        await writeFile(
          join(cwd, ".git", "shallow"),
          git(cwd, ["rev-parse", "HEAD"]) + "\n",
        );
      } else if (variant === "owner-history") {
        await writeFile(
          join(cwd, path),
          original.replace("Owner", "Rewritten"),
        );
      } else if (variant === "policy-history") {
        await writeFile(
          join(cwd, path),
          original + "\nforbidden policy revision\n",
        );
      } else if (
        variant.includes("runtime") ||
        variant === "frozen-v40-module"
      ) {
        await writeFile(
          join(cwd, path),
          original + "\n// forbidden mutation\n",
        );
      } else if (variant === "qualified-snapshot") {
        const snapshot = JSON.parse(original) as {
          files: Record<string, { content: string }>;
        };
        snapshot.files["src/project-control-v40.ts"]!.content +=
          "\n// tampered historical fixture\n";
        await writeFile(join(cwd, path), JSON.stringify(snapshot));
      } else if (variant === "committed-baseline-reset") {
        for (const controlPath of controlPaths)
          await writeFile(
            join(cwd, controlPath),
            git(cwd, ["show", `${base}:${controlPath}`]),
          );
      } else {
        const work = record(JSON.parse(original));
        if (variant === "grant-reset")
          record(work.devOperationsIntegrationV37).creationGrant = "UNUSED";
        else if (variant === "root-authorization")
          record(work.authorization).production = true;
        else work.wp8fSuccessorOperationJournal = [];
        await writeFile(join(cwd, path), JSON.stringify(work));
      }
      if (variant.startsWith("staged") && !variant.includes("gitlink")) {
        git(cwd, ["add", path]);
        if (variant.includes("symlink")) await rm(join(cwd, path));
        await writeFile(join(cwd, path), original);
      } else if (variant.startsWith("committed")) {
        commit(cwd, "synthetic forbidden mutation");
        if (variant === "committed-baseline-reset") {
          for (const controlPath of controlPaths)
            await copyFile(new URL(controlPath, root), join(cwd, controlPath));
        } else {
          if (variant.includes("symlink")) await rm(join(cwd, path));
          await writeFile(join(cwd, path), original);
        }
        commit(cwd, "synthetic restoration cannot erase history");
      }
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
});

const eventFor = (
  head = "a".repeat(40),
  merge = "b".repeat(40),
  tree = "c".repeat(40),
  number = 123,
) => ({
  event: {
    number,
    repository: { full_name: repository },
    pull_request: {
      number,
      state: "open",
      draft: true,
      head: { ref: sourceBranch, sha: head, repo: { full_name: repository } },
      base: {
        ref: targetBranch,
        sha: published,
        repo: { full_name: repository },
      },
    },
  },
  observed: {
    sha: merge,
    ref: `refs/pull/${number}/merge`,
    merge,
    parents: [published, head],
    tree,
    sourceTree: tree,
  },
});

describe("v41 exact PR event identity is structure, never approval", () => {
  it("accepts an actual allocated PR identity and binds source/merge/tree separately", () => {
    const { event, observed } = eventFor();
    expect(
      validateIntegrationPullRequestReceipt(event, observed),
    ).toMatchObject({
      kind: "INTEGRATION",
      repository,
      pr: 123,
      head: event.pull_request.head.sha,
      base: published,
      merge: observed.merge,
      tree: observed.tree,
    });
  });

  it.each([
    "repository",
    "head-repository",
    "base-repository",
    "head-branch",
    "base-branch",
    "base-sha",
    "head-sha",
    "number-mismatch",
    "zero-pr",
    "old-pr18",
    "pr16-with-source-route",
    "closed",
    "ref",
    "merge-sha",
    "reversed-parents",
    "extra-parent",
    "source-tree",
    "absent-tree",
  ])("rejects PR-event mismatch: %s", (variant) => {
    const { event, observed } = eventFor();
    if (variant === "repository") event.repository.full_name = "Other/repo";
    if (variant === "head-repository")
      event.pull_request.head.repo.full_name = "Other/repo";
    if (variant === "base-repository")
      event.pull_request.base.repo.full_name = "Other/repo";
    if (variant === "head-branch")
      event.pull_request.head.ref = "codex/unapproved";
    if (variant === "base-branch")
      event.pull_request.base.ref = "codex/phase-1a-foundation";
    if (variant === "base-sha") event.pull_request.base.sha = "d".repeat(40);
    if (variant === "head-sha") event.pull_request.head.sha = "d".repeat(40);
    if (variant === "number-mismatch") event.pull_request.number++;
    if (["zero-pr", "old-pr18", "pr16-with-source-route"].includes(variant)) {
      const number =
        variant === "zero-pr" ? 0 : variant === "old-pr18" ? 18 : 16;
      event.number = event.pull_request.number = number;
      observed.ref = `refs/pull/${number}/merge`;
    }
    if (variant === "closed") event.pull_request.state = "closed";
    if (variant === "ref") observed.ref = "refs/pull/456/merge";
    if (variant === "merge-sha") observed.sha = "d".repeat(40);
    if (variant === "reversed-parents") observed.parents.reverse();
    if (variant === "extra-parent") observed.parents.push("d".repeat(40));
    if (variant === "source-tree") observed.sourceTree = "d".repeat(40);
    if (variant === "absent-tree") observed.tree = "";
    expect(validateIntegrationPullRequestReceipt(event, observed)).toBeNull();
  });
});

describe("v41 source and precise ordinary integration edge", () => {
  it("keeps source, synthetic merge and unproven live integration distinct", async () => {
    await withFixture((cwd) => {
      const source = commit(cwd);
      const tree = git(cwd, ["rev-parse", `${source}^{tree}`]);
      const merge = git(cwd, [
        ...identity,
        "commit-tree",
        tree,
        "-p",
        published,
        "-p",
        source,
        "-m",
        "Synthetic Merge pull request #123 from Eak-dev/codex/test-policy-v40",
      ]);
      git(cwd, ["checkout", "--quiet", "--detach", merge]);
      expect(
        git(cwd, ["rev-list", "--parents", "-n", "1", merge])
          .split(" ")
          .slice(1),
      ).toEqual([published, source]);
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "MERGE_STRUCTURE_ONLY",
        sourceHead: source,
        head: merge,
        tree,
        clean: true,
        remoteExecutionAuthorized: false,
      });
      const { event, observed } = eventFor(source, merge, tree);
      const receipt = validateIntegrationPullRequestReceipt(event, observed);
      expect(receipt).not.toBeNull();
      if (!receipt) throw new Error("Synthetic PR fixture was not accepted");
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
          kind: "PULL_REQUEST",
          receipt,
        }),
      ).toMatchObject({
        mode: "SYNTHETIC_PR_MERGE",
        sourceHead: source,
        head: merge,
        tree,
        remoteExecutionAuthorized: false,
      });
      const integrated: IntegrationMergeReceipt = {
        repository,
        pr: 123,
        baseBranch: targetBranch,
        headBranch: sourceBranch,
        base: published,
        head: source,
        merge,
        tree,
        state: "closed",
        merged: true,
        method: "merge",
        htmlUrl: `https://github.com/${repository}/pull/123`,
      };
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
          kind: "INTEGRATED",
          receipt: integrated,
        }),
      ).toMatchObject({
        mode: "INTEGRATED",
        sourceHead: source,
        head: merge,
        tree,
        remoteExecutionAuthorized: false,
      });
      for (const [key, value] of [
        ["pr", 16],
        ["pr", 18],
        ["repository", "Other/repo"],
        ["headBranch", "codex/unapproved"],
        ["baseBranch", "main"],
        ["base", "d".repeat(40)],
        ["head", "d".repeat(40)],
        ["merge", "d".repeat(40)],
        ["tree", "d".repeat(40)],
        ["state", "open"],
        ["merged", false],
        ["method", "squash"],
        ["htmlUrl", `https://github.com/${repository}/pull/456`],
      ] as const) {
        const invalid = { ...integrated };
        record(invalid)[key] = value;
        expect(
          () =>
            inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
              kind: "INTEGRATED",
              receipt: invalid,
            }),
          key,
        ).toThrow();
      }
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
          kind: "PULL_REQUEST",
          receipt: { ...receipt, head: "d".repeat(40) },
        }),
      ).toThrow();
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
          kind: "PULL_REQUEST",
          receipt: { ...receipt, tree: "d".repeat(40) },
        }),
      ).toThrow();
    });
  });

  it("validates downstream PR16 as review-only without authorizing its merge", async () => {
    await withFixture((cwd) => {
      const source = commit(cwd);
      const tree = git(cwd, ["rev-parse", `${source}^{tree}`]);
      const integrated = git(cwd, [
        ...identity,
        "commit-tree",
        tree,
        "-p",
        published,
        "-p",
        source,
        "-m",
        "Synthetic MP06 policy integration",
      ]);
      const downstream = git(cwd, [
        ...identity,
        "commit-tree",
        tree,
        "-p",
        c.downstreamBaseHead,
        "-p",
        integrated,
        "-m",
        "Synthetic PR16 review-only merge",
      ]);
      git(cwd, ["checkout", "--quiet", "--detach", downstream]);
      const { event, observed } = eventFor(integrated, downstream, tree, 16);
      event.pull_request.head.ref = targetBranch;
      event.pull_request.base.ref = c.downstreamBaseBranch;
      event.pull_request.base.sha = c.downstreamBaseHead;
      observed.parents = [c.downstreamBaseHead, integrated];
      const receipt = validateIntegrationPullRequestReceipt(event, observed);
      expect(receipt).toMatchObject({ kind: "DOWNSTREAM_REVIEW_ONLY", pr: 16 });
      if (!receipt) throw new Error("Synthetic PR16 fixture was not accepted");
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
          kind: "PULL_REQUEST",
          receipt,
        }),
      ).toMatchObject({
        mode: "DOWNSTREAM_REVIEW_ONLY",
        sourceHead: source,
        head: downstream,
        remoteExecutionAuthorized: false,
      });
      event.pull_request.draft = false;
      expect(validateIntegrationPullRequestReceipt(event, observed)).toBeNull();
      expect(
        action("MERGE_MP06_POLICY", {
          ...liveEvidence(),
          pullRequest: 16,
          creationPullRequest: 16,
        }),
      ).toBe(false);
      expect(action("MERGE_PR16", liveEvidence())).toBe(false);
    });
  });

  it.each([
    "reversed-parents",
    "wrong-base",
    "extra-parent",
    "divergent-tree",
    "extra-merge",
    "post-merge-commit",
  ])("rejects malformed actual Git integration: %s", async (variant) => {
    await withFixture(async (cwd) => {
      const source = commit(cwd);
      let tree = git(cwd, ["rev-parse", `${source}^{tree}`]);
      const parents = [published, source];
      if (variant === "reversed-parents") parents.reverse();
      if (variant === "wrong-base")
        parents[0] = git(cwd, ["rev-parse", `${published}^1`]);
      if (variant === "extra-parent") parents.push(base);
      if (variant === "divergent-tree") {
        const path = "worker/index.ts";
        await writeFile(
          join(cwd, path),
          readFileSync(join(cwd, path), "utf8") +
            "\n// forbidden integration-tree drift\n",
        );
        git(cwd, ["add", path]);
        tree = git(cwd, ["write-tree"]);
      }
      const merge = git(cwd, [
        ...identity,
        "commit-tree",
        tree,
        ...parents.flatMap((parent) => ["-p", parent]),
        "-m",
        `synthetic ${variant} merge fixture`,
      ]);
      // A checkout of the committed synthetic tree clears only fixture-local
      // staged content; no operator checkout or branch is touched by this test.
      git(cwd, ["checkout", "--quiet", "--detach", merge]);
      if (variant === "extra-merge" || variant === "post-merge-commit") {
        const nextParents =
          variant === "extra-merge" ? [merge, source] : [merge];
        const next = git(cwd, [
          ...identity,
          "commit-tree",
          tree,
          ...nextParents.flatMap((parent) => ["-p", parent]),
          "-m",
          "synthetic unapproved post-integration history",
        ]);
        git(cwd, ["checkout", "--quiet", "--detach", next]);
      }
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
});

describe("v41 CLI PR adapter uses the actual event and restores test environment", () => {
  it("does not misidentify a disposable local source as the runner's real PR checkout", async () => {
    vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
    vi.stubEnv(
      "GITHUB_EVENT_PATH",
      "/synthetic-unavailable-real-runner-event.json",
    );
    try {
      await withFixture(async (cwd) => {
        expect(process.env.GITHUB_EVENT_NAME).toBe("push");
        await expect(
          runProjectControlValidation(pathToFileURL(cwd + "/")),
        ).resolves.toBeUndefined();
      });
      expect(process.env.GITHUB_EVENT_NAME).toBe("pull_request");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([123, 16])(
    "validates exact PR%d context without falling back to historical PR15 rules",
    async (number) => {
      await withFixture(async (cwd) => {
        const source = commit(cwd);
        const tree = git(cwd, ["rev-parse", `${source}^{tree}`]);
        const integration = git(cwd, [
          ...identity,
          "commit-tree",
          tree,
          "-p",
          published,
          "-p",
          source,
          "-m",
          "Synthetic MP06 policy merge for CLI",
        ]);
        const merge =
          number === 123
            ? integration
            : git(cwd, [
                ...identity,
                "commit-tree",
                tree,
                "-p",
                c.downstreamBaseHead,
                "-p",
                integration,
                "-m",
                "Synthetic downstream PR16 merge for CLI",
              ]);
        git(cwd, ["checkout", "--quiet", "--detach", merge]);
        const { event } = eventFor(
          number === 123 ? source : integration,
          merge,
          tree,
          number,
        );
        if (number === 16) {
          event.pull_request.head.ref = targetBranch;
          event.pull_request.base.ref = c.downstreamBaseBranch;
          event.pull_request.base.sha = c.downstreamBaseHead;
        }
        const directory = await mkdtemp(join(tmpdir(), "mp06-v41-pr-event-"));
        const eventPath = join(directory, "event.json");
        const alternateEventPath = join(directory, "alternate-event.json");
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
          await writeFile(eventPath, JSON.stringify(event));
          await writeFile(alternateEventPath, JSON.stringify(event));
          vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
          vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
          vi.stubEnv("GITHUB_REPOSITORY", repository);
          vi.stubEnv("GITHUB_SHA", merge);
          vi.stubEnv("GITHUB_REF", `refs/pull/${number}/merge`);
          const fixtureRoot = pathToFileURL(cwd + "/");
          await expect(
            runProjectControlValidation(fixtureRoot),
          ).resolves.toBeUndefined();
          await expect(
            runPullRequestControlValidation(fixtureRoot, eventPath),
          ).resolves.toBeUndefined();
          expect(
            log.mock.calls.some(
              ([message]) =>
                typeof message === "string" &&
                message.includes(
                  number === 123
                    ? "SYNTHETIC_PR_MERGE"
                    : "DOWNSTREAM_REVIEW_ONLY",
                ),
            ),
          ).toBe(true);
          await expect(
            runPullRequestControlValidation(fixtureRoot, alternateEventPath),
          ).rejects.toThrow("V41_PR_EVENT_PATH_MISMATCH");
          vi.stubEnv("GITHUB_SHA", source);
          await expect(
            runProjectControlValidation(fixtureRoot),
          ).rejects.toThrow("V41_PR_MERGE_IDENTITY_MISMATCH");
          vi.stubEnv("GITHUB_SHA", merge);
          vi.stubEnv("GITHUB_REF", "refs/pull/456/merge");
          await expect(
            runProjectControlValidation(fixtureRoot),
          ).rejects.toThrow("V41_PR_MERGE_IDENTITY_MISMATCH");
          vi.stubEnv("GITHUB_REF", `refs/pull/${number}/merge`);
          vi.stubEnv("GITHUB_REPOSITORY", "Other/repo");
          await expect(
            runProjectControlValidation(fixtureRoot),
          ).rejects.toThrow("V41_PR_EVENT_REQUIRED");
          vi.stubEnv("GITHUB_REPOSITORY", repository);
          vi.stubEnv("GITHUB_EVENT_PATH", "");
          await expect(
            runProjectControlValidation(fixtureRoot),
          ).rejects.toThrow("V41_PR_EVENT_REQUIRED");
          expect(git(cwd, ["rev-parse", "HEAD"])).toBe(merge);
          expect(
            git(cwd, ["status", "--porcelain=v1", "--untracked-files=all"]),
          ).toBe("");
        } finally {
          vi.unstubAllEnvs();
          log.mockRestore();
          await rm(directory, { recursive: true, force: true });
        }
      });
    },
  );
});
