import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";
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

// Preserve every v41 assertion on its actual final source inputs while exercising
// today's imported dispatcher. The successor overlay must not rewrite history.
const sourceRoot = new URL("../", import.meta.url);
const historicalRoot = await mkdtemp(join(tmpdir(), "mp06-v41-regression-"));
afterAll(async () => {
  await rm(historicalRoot, { recursive: true, force: true });
});
try {
  execFileSync(
    projectControlGitExecutable(),
    [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      fileURLToPath(sourceRoot),
      historicalRoot,
    ],
    { stdio: "pipe" },
  );
  execFileSync(
    projectControlGitExecutable(),
    [
      "checkout",
      "--quiet",
      "--detach",
      "b1ab0d6ce86487c324df291235d53e86ca5da66e",
    ],
    { cwd: historicalRoot, stdio: "pipe" },
  );
} catch (error) {
  await rm(historicalRoot, { recursive: true, force: true });
  throw error;
}
const root = pathToFileURL(historicalRoot + "/");
async function validateHistoricalControl(
  validate = () => runProjectControlValidation(root),
) {
  const prior = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    await validate();
  } finally {
    if (prior === undefined) delete process.env.GITHUB_EVENT_NAME;
    else process.env.GITHUB_EVENT_NAME = prior;
  }
}
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
  it.each(["success", "failure"])(
    "restores the outer PR event after historical CLI %s",
    async (outcome) => {
      const prior = process.env.GITHUB_EVENT_NAME;
      process.env.GITHUB_EVENT_NAME = "pull_request";
      try {
        const call = validateHistoricalControl(async () => {
          expect(process.env.GITHUB_EVENT_NAME).toBe("push");
          if (outcome === "failure")
            throw new Error("synthetic historical validation failure");
          await runProjectControlValidation(root);
        });
        if (outcome === "failure")
          await expect(call).rejects.toThrow(
            "synthetic historical validation failure",
          );
        else await expect(call).resolves.toBeUndefined();
        expect(process.env.GITHUB_EVENT_NAME).toBe("pull_request");
      } finally {
        if (prior === undefined) delete process.env.GITHUB_EVENT_NAME;
        else process.env.GITHUB_EVENT_NAME = prior;
      }
    },
  );
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
    await expect(validateHistoricalControl()).resolves.toBeUndefined();
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
  local: localEvidence("POST_COMMIT"),
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

  it.each([
    "missing-local",
    "old-qualified-head",
    "pre-commit",
    "failed-validation",
    "failed-independent-review",
    "wrong-qualified-tree",
    "wrong-reviewed-diff",
    "dirty-source",
  ])(
    "binds the live reviewed HEAD to its post-commit qualification: %s",
    (variant) => {
      const evidence = liveEvidence();
      if (variant === "missing-local") delete record(evidence).local;
      if (variant === "old-qualified-head")
        evidence.local.head = "d".repeat(40);
      if (variant === "pre-commit")
        evidence.local = localEvidence("PRE_COMMIT");
      if (variant === "failed-validation")
        record(evidence.local).validation = "FAIL";
      if (variant === "failed-independent-review")
        record(evidence.local).independentReview = "ACTIONABLE_FINDINGS";
      if (variant === "wrong-qualified-tree")
        evidence.local.qualifiedTree = "d".repeat(40);
      if (variant === "wrong-reviewed-diff")
        evidence.local.reviewedDiffSha256 = "d".repeat(64);
      if (variant === "dirty-source") evidence.local.workingTreeClean = false;
      for (const name of [
        "READY_FOR_REVIEW",
        "MERGE_MP06_POLICY",
        "UPDATE_GITHUB_ROADMAP",
      ])
        expect(action(name, evidence), name).toBe(false);
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
  it("accepts the exact uncommitted overlay as local-only source", async () => {
    await withFixture((cwd) => {
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "LOCAL_SOURCE",
        remoteExecutionAuthorized: false,
      });
    });
  });

  it("accepts the exact synthetic committed source without integration authority", async () => {
    await withFixture((cwd) => {
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
    });
  });

  it("validates the synthetic committed source through the normal CLI", async () => {
    await withFixture(async (cwd) => {
      commit(cwd);
      await expect(
        runProjectControlValidation(pathToFileURL(cwd + "/")),
      ).resolves.toBeUndefined();
    });
  });

  it.each([
    "config/project/current-work.json",
    "docs/project/OWNER_DECISION_LOG.md",
  ])(
    "rejects a missing required index blob despite an intact working file: %s",
    async (path) => {
      await withFixture((cwd) => {
        commit(cwd);
        const original = readFileSync(join(cwd, path), "utf8");
        git(cwd, ["update-index", "--force-remove", path]);
        expect(readFileSync(join(cwd, path), "utf8")).toBe(original);
        expect(() =>
          inspectIntegrationRepository(cwd, projectControlGitExecutable()),
        ).toThrow(`V41_REQUIRED_BLOB_MISSING:${path}`);
      });
    },
  );

  it("reads committed UTF-8 evidence by byte lengths rather than embedded batch-like delimiters", async () => {
    await withFixture(async (cwd) => {
      const path = "docs/project/ROADMAP_CHANGELOG.md";
      const suffix =
        "\n## Synthetic byte-framing evidence\nมะลิปัง ขนมปัง 🍞\n" +
        "a".repeat(40) +
        " blob 999\n:config/project/current-work.json missing\n";
      await writeFile(
        join(cwd, path),
        readFileSync(join(cwd, path), "utf8") + suffix,
      );
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
    });
  });

  it("re-reads the index on a second invocation at the same committed HEAD", async () => {
    await withFixture(async (cwd) => {
      const source = commit(cwd);
      expect(
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "SOURCE_COMMIT",
        head: source,
        clean: true,
      });
      const path = "config/project/current-work.json";
      const original = readFileSync(join(cwd, path), "utf8");
      const changed = record(JSON.parse(original));
      changed.wp8fSuccessorOperationJournal = [];
      await writeFile(join(cwd, path), JSON.stringify(changed));
      git(cwd, ["add", path]);
      await writeFile(join(cwd, path), original);
      expect(git(cwd, ["rev-parse", "HEAD"])).toBe(source);
      expect(() =>
        inspectIntegrationRepository(cwd, projectControlGitExecutable()),
      ).toThrow("V41_INHERITED_CONTROL_DRIFT");
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

type MergeFixture = {
  cwd: string;
  source: string;
  tree: string;
  merge: string;
  receipt: NonNullable<
    ReturnType<typeof validateIntegrationPullRequestReceipt>
  >;
  integrated: IntegrationMergeReceipt;
};

/** One isolated merge fixture per case, with only one full inspector invocation
 * in each positive mode test. Preserve the ordinary per-test 5000ms budget. */
async function withMergeFixture(
  run: (fixture: MergeFixture) => Promise<void> | void,
) {
  await withFixture(async (cwd) => {
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
    const { event, observed } = eventFor(source, merge, tree);
    const receipt = validateIntegrationPullRequestReceipt(event, observed);
    expect(receipt).not.toBeNull();
    if (!receipt) throw new Error("Synthetic PR fixture was not accepted");
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
    await run({ cwd, source, tree, merge, receipt, integrated });
  });
}

type CliFixture = {
  root: URL;
  source: string;
  merge: string;
  eventPath: string;
  alternateEventPath: string;
  logMessages: () => unknown[];
};

/** Separate cases each get their own checkout/event/console/environment. Setup
 * performs no validation; each case exercises one CLI validation entrypoint. */
async function withCliFixture(
  number: 123 | 16,
  run: (fixture: CliFixture) => Promise<void>,
) {
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
      await run({
        root: pathToFileURL(cwd + "/"),
        source,
        merge,
        eventPath,
        alternateEventPath,
        logMessages: () =>
          log.mock.calls.map(([message]: unknown[]) => message),
      });
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
}

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
    ["modeled nullable metadata", null],
    ["matching supplied metadata", "b".repeat(40)],
    ["stale valid metadata", "d".repeat(40)],
  ])(
    "accepts %s only alongside the exact runner/Git tuple",
    (_name, metadata) => {
      const { event, observed } = eventFor();
      record(event.pull_request).merge_commit_sha = metadata;
      expect(
        validateIntegrationPullRequestReceipt(event, observed),
      ).toMatchObject({
        kind: "INTEGRATION",
        pr: 123,
        head: observed.parents[1],
        base: published,
        merge: observed.merge,
        tree: observed.tree,
      });
    },
  );

  it.each([
    ["uppercase hash", "D".repeat(40)],
    ["short hash", "d".repeat(39)],
    ["long hash", "d".repeat(41)],
    ["malformed hash", "not-a-git-sha"],
    ["empty string", ""],
    ["number", 123],
    ["boolean", false],
    ["object", {}],
    ["array", []],
  ])("rejects supplied nonnull merge metadata: %s", (_name, metadata) => {
    const { event, observed } = eventFor();
    record(event.pull_request).merge_commit_sha = metadata;
    expect(validateIntegrationPullRequestReceipt(event, observed)).toBeNull();
  });

  it.each([
    "runner-sha",
    "runner-ref",
    "ordered-parents",
    "tree",
    "source-tree",
  ])(
    "does not let modeled null metadata weaken the required %s binding",
    (variant) => {
      const { event, observed } = eventFor();
      record(event.pull_request).merge_commit_sha = null;
      if (variant === "runner-sha") observed.sha = "d".repeat(40);
      if (variant === "runner-ref") observed.ref = "refs/pull/456/merge";
      if (variant === "ordered-parents") observed.parents.reverse();
      if (variant === "tree") observed.tree = "d".repeat(40);
      if (variant === "source-tree") observed.sourceTree = "d".repeat(40);
      expect(validateIntegrationPullRequestReceipt(event, observed)).toBeNull();
    },
  );

  it.each([
    "runner-sha",
    "runner-ref",
    "ordered-parents",
    "extra-parent",
    "tree",
    "source-tree",
    "repository",
    "head-repository",
    "base-repository",
    "base-sha",
    "head-sha",
    "base-branch",
    "head-branch",
  ])(
    "does not let stale valid metadata rescue a mismatched %s binding",
    (variant) => {
      const { event, observed } = eventFor();
      record(event.pull_request).merge_commit_sha = "d".repeat(40);
      if (variant === "runner-sha") observed.sha = "e".repeat(40);
      if (variant === "runner-ref") observed.ref = "refs/pull/456/merge";
      if (variant === "ordered-parents") observed.parents.reverse();
      if (variant === "extra-parent") observed.parents.push("e".repeat(40));
      if (variant === "tree") observed.tree = "e".repeat(40);
      if (variant === "source-tree") observed.sourceTree = "e".repeat(40);
      if (variant === "repository") event.repository.full_name = "Other/repo";
      if (variant === "head-repository")
        event.pull_request.head.repo.full_name = "Other/repo";
      if (variant === "base-repository")
        event.pull_request.base.repo.full_name = "Other/repo";
      if (variant === "base-sha") event.pull_request.base.sha = "e".repeat(40);
      if (variant === "head-sha") event.pull_request.head.sha = "e".repeat(40);
      if (variant === "base-branch")
        event.pull_request.base.ref = "codex/phase-1a-foundation";
      if (variant === "head-branch")
        event.pull_request.head.ref = "codex/unapproved";
      expect(validateIntegrationPullRequestReceipt(event, observed)).toBeNull();
    },
  );

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
  it("keeps an unproven live integration structure-only", async () => {
    await withMergeFixture(({ cwd, source, tree, merge }) => {
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
    });
  });

  it("distinguishes a synthetic PR merge from its source and actual integration", async () => {
    await withMergeFixture(({ cwd, source, tree, merge, receipt }) => {
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
    });
  });

  it("requires the exact actual-merge receipt to report integrated", async () => {
    await withMergeFixture(({ cwd, source, tree, merge, integrated }) => {
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
    });
  });

  it.each([
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
  ] as const)(
    "rejects mismatched actual-merge receipt %s=%s",
    async (key, value) => {
      await withMergeFixture(({ cwd, integrated }) => {
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
      });
    },
  );

  it.each(["head", "tree"])(
    "rejects mismatched synthetic PR receipt %s",
    async (key) => {
      await withMergeFixture(({ cwd, receipt }) => {
        expect(() =>
          inspectIntegrationRepository(cwd, projectControlGitExecutable(), {
            kind: "PULL_REQUEST",
            receipt: { ...receipt, [key]: "d".repeat(40) },
          }),
        ).toThrow();
      });
    },
  );

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
  it.each([123, 16] as const)(
    "validates PR%d with stale optional merge metadata using the actual fixture Git tuple",
    async (number) => {
      await withCliFixture(number, async (fixture) => {
        const event = record(
          JSON.parse(await readFile(fixture.eventPath, "utf8")),
        );
        const staleMetadata = "d".repeat(40);
        expect(fixture.merge).not.toBe(staleMetadata);
        event.action = "synchronize";
        record(event.pull_request).merge_commit_sha = staleMetadata;
        await writeFile(fixture.eventPath, JSON.stringify(event));
        await expect(
          runProjectControlValidation(fixture.root),
        ).resolves.toBeUndefined();
        const prefix = "Project control validation passed: ";
        const message = fixture
          .logMessages()
          .find(
            (value) => typeof value === "string" && value.startsWith(prefix),
          );
        expect(message).toBeTypeOf("string");
        if (typeof message !== "string")
          throw new Error("Expected CLI validation summary");
        const summary = record(JSON.parse(message.slice(prefix.length)));
        expect(summary.repositoryInspection).toMatchObject({
          mode:
            number === 123 ? "SYNTHETIC_PR_MERGE" : "DOWNSTREAM_REVIEW_ONLY",
          head: fixture.merge,
          remoteExecutionAuthorized: false,
        });
      });
    },
  );

  it("validates a modeled opened event with null merge metadata against the actual fixture Git tuple", async () => {
    await withMergeFixture(async ({ cwd, source, tree, merge }) => {
      const { event } = eventFor(source, merge, tree);
      record(event).action = "opened";
      record(event.pull_request).merge_commit_sha = null;
      const directory = await mkdtemp(join(tmpdir(), "mp06-v41-null-event-"));
      const eventPath = join(directory, "opened-event.json");
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        await writeFile(eventPath, JSON.stringify(event));
        vi.stubEnv("GITHUB_EVENT_NAME", "pull_request");
        vi.stubEnv("GITHUB_EVENT_PATH", eventPath);
        vi.stubEnv("GITHUB_REPOSITORY", repository);
        vi.stubEnv("GITHUB_SHA", merge);
        vi.stubEnv("GITHUB_REF", "refs/pull/123/merge");
        const fixtureRoot = pathToFileURL(cwd + "/");
        await expect(
          runPullRequestControlValidation(fixtureRoot, eventPath),
        ).resolves.toBeUndefined();
        expect(
          log.mock.calls.some(
            ([message]) =>
              typeof message === "string" &&
              message.includes("SYNTHETIC_PR_MERGE"),
          ),
        ).toBe(true);
        vi.stubEnv("GITHUB_SHA", source);
        await expect(
          runPullRequestControlValidation(fixtureRoot, eventPath),
        ).rejects.toThrow("V41_PR_MERGE_IDENTITY_MISMATCH");
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
  });

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

  it.each([
    [123, "normal"],
    [123, "adapter"],
    [16, "normal"],
    [16, "adapter"],
  ] as const)(
    "validates exact PR%d via the %s CLI without historical fallback",
    async (number, entrypoint) => {
      await withCliFixture(number, async (fixture) => {
        const result =
          entrypoint === "normal"
            ? runProjectControlValidation(fixture.root)
            : runPullRequestControlValidation(fixture.root, fixture.eventPath);
        await expect(result).resolves.toBeUndefined();
        expect(
          fixture
            .logMessages()
            .some(
              (message) =>
                typeof message === "string" &&
                message.includes(
                  number === 123
                    ? "SYNTHETIC_PR_MERGE"
                    : "DOWNSTREAM_REVIEW_ONLY",
                ),
            ),
        ).toBe(true);
      });
    },
  );

  it.each(
    ([123, 16] as const).flatMap((number) => [
      { number, mismatch: "event-path" },
      { number, mismatch: "source-sha" },
      { number, mismatch: "pr-ref" },
      { number, mismatch: "repository" },
      { number, mismatch: "missing-event" },
    ]),
  )(
    "rejects exact PR$number CLI $mismatch without changing its checkout",
    async ({ number, mismatch }) => {
      await withCliFixture(number, async (fixture) => {
        if (mismatch === "event-path") {
          await expect(
            runPullRequestControlValidation(
              fixture.root,
              fixture.alternateEventPath,
            ),
          ).rejects.toThrow("V41_PR_EVENT_PATH_MISMATCH");
          return;
        }
        const untrustedMarker =
          "<script>synthetic-private-event-value</script>";
        if (mismatch === "source-sha") {
          vi.stubEnv("GITHUB_SHA", fixture.source);
          const event = JSON.parse(
            await readFile(fixture.eventPath, "utf8"),
          ) as Record<string, unknown>;
          event.body = untrustedMarker;
          await writeFile(fixture.eventPath, JSON.stringify(event));
        }
        if (mismatch === "pr-ref")
          vi.stubEnv("GITHUB_REF", "refs/pull/456/merge");
        if (mismatch === "repository")
          vi.stubEnv("GITHUB_REPOSITORY", "Other/repo");
        if (mismatch === "missing-event") vi.stubEnv("GITHUB_EVENT_PATH", "");
        const failure: unknown = await runProjectControlValidation(
          fixture.root,
        ).catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(Error);
        if (!(failure instanceof Error))
          throw new Error("Expected CLI rejection");
        expect(failure.message).toContain(
          mismatch === "repository" || mismatch === "missing-event"
            ? "V41_PR_EVENT_REQUIRED"
            : "V41_PR_MERGE_IDENTITY_MISMATCH",
        );
        if (mismatch === "source-sha") {
          const diagnostics = JSON.parse(
            failure.message.slice("V41_PR_MERGE_IDENTITY_MISMATCH:".length),
          ) as Record<string, unknown>;
          expect(diagnostics).toMatchObject({
            runnerShaMatchesCheckout: false,
            orderedParentsMatch: true,
            sourceTreeMatchesCheckout: true,
            mergeMetadata: "ABSENT",
          });
          expect(failure.message).not.toContain(untrustedMarker);
          expect(failure.message).not.toContain(fixture.source);
          expect(
            Object.values(diagnostics).every(
              (value) => typeof value === "boolean" || value === "ABSENT",
            ),
          ).toBe(true);
        }
      });
    },
  );
});
