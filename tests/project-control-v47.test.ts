import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
} from "../src/project-control.js";
import {
  HARNESS_PUBLICATION_V43,
  type V43CheckoutReceipt,
} from "../src/project-control-v43.js";
import {
  KNOWLEDGE_PUBLICATION_V47 as c,
  V47_ALLOWED_PATHS,
  evaluateV47Action,
  inspectV47Repository,
  projectV47ToV46,
  v47AuthoritySummary,
  validateV47PullRequestReceipt,
  type V47LocalReceipt,
  type V47PushReceipt,
} from "../src/project-control-v47.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const executable = projectControlGitExecutable();
const git = (cwd: string, args: string[], input?: string) =>
  execFileSync(
    executable,
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "protocol.allow=never",
      "-c",
      "protocol.file.allow=always",
      "-c",
      "user.name=MP06 Synthetic",
      "-c",
      "user.email=synthetic@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
const read = (cwd: string, path: string) =>
  JSON.parse(readFileSync(join(cwd, path), "utf8")) as Record<string, unknown>;
const indexPath = (cwd: string) =>
  join(git(cwd, ["rev-parse", "--absolute-git-dir"]), "index");
const state = (cwd: string) => ({
  head: git(cwd, ["rev-parse", "HEAD"]),
  index: readFileSync(indexPath(cwd)),
  status: git(cwd, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--no-renames",
  ]),
  lock: existsSync(indexPath(cwd) + ".lock"),
});
async function withFixture(run: (cwd: string) => Promise<void> | void) {
  const operator = state(root),
    cwd = await mkdtemp(join(tmpdir(), "mp06-v47-"));
  try {
    git(root, [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      root,
      cwd,
    ]);
    git(cwd, ["checkout", "--quiet", "-B", c.headBranch, c.baseline]);
    git(cwd, [
      "remote",
      "set-url",
      "origin",
      "https://github.com/" + c.repository + ".git",
    ]);
    for (const path of V47_ALLOWED_PATHS) {
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await copyFile(join(root, path), join(cwd, path));
    }
    await run(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
    expect(state(root)).toEqual(operator);
  }
}
const commit = (cwd: string) => {
  git(cwd, ["add", "--all"]);
  git(cwd, ["commit", "--quiet", "-m", "Synthetic v47"]);
  return git(cwd, ["rev-parse", "HEAD"]);
};
function local(stage: "PRE_COMMIT" | "POST_COMMIT"): V47LocalReceipt {
  const old = HARNESS_PUBLICATION_V43,
    now = new Date().toISOString();
  return {
    kind: "V47_LOCAL_QUALIFICATION",
    controlVersion: c.version,
    baseline: c.baseline,
    pullRequest: 20,
    snapshotSha256: c.snapshotSha256,
    workspaceSha256: c.dependencyPatch.workspaceSha256,
    lockfileSha256: c.dependencyPatch.lockfileSha256,
    baselineAncestorOfCandidateParent: true,
    observedAt: now,
    checkedAt: now,
    local: {
      stage,
      repository: c.repository,
      headBranch: c.headBranch,
      baseBranch: c.baseBranch,
      baseHead: c.baseHead,
      head: stage === "PRE_COMMIT" ? c.baseline : "a".repeat(40),
      candidateParent: c.baseline,
      tree: "b".repeat(40),
      qualifiedTree: "b".repeat(40),
      diffSha256: "c".repeat(64),
      reviewedDiffSha256: "c".repeat(64),
      snapshotSha256: old.snapshotSha256,
      priorV42SourceSealSha256: old.priorV42SourceSealSha256,
      validation: stage === "PRE_COMMIT" ? "FOCUSED_PASS" : "FULL_PASS",
      independentReview: "NO_ACTIONABLE_FINDINGS",
      workingTreeMatchesIndex: true,
      workingTreeClean: stage === "POST_COMMIT",
      audit: "ZERO_AT_EVERY_SEVERITY",
      auditTree: "b".repeat(40),
      workspaceSha256: old.dependencyPatch.workspaceSha256,
      lockfileSha256: old.dependencyPatch.lockfileSha256,
    },
  };
}
function push(): V47PushReceipt {
  const now = new Date().toISOString();
  return {
    kind: "V47_EXISTING_DRAFT_PUSH",
    local: local("POST_COMMIT"),
    repository: c.repository,
    pullRequest: 20,
    headBranch: c.headBranch,
    baseBranch: c.baseBranch,
    baseHead: c.baseHead,
    publishedHead: c.publishedHead,
    state: "open",
    draft: true,
    merged: false,
    creationGrant: c.creationGrant,
    fastForwardFromPublishedHead: true,
    observedAt: now,
    checkedAt: now,
  };
}
function event(head: string) {
  return {
    number: 20,
    repository: { full_name: c.repository },
    pull_request: {
      number: 20,
      state: "open",
      draft: true,
      merged: false,
      head: { ref: c.headBranch, sha: head, repo: { full_name: c.repository } },
      base: {
        ref: c.baseBranch,
        sha: c.baseHead,
        repo: { full_name: c.repository },
      },
    },
  };
}
describe("v47 frozen TEST knowledge publication to existing Draft PR20", () => {
  it("projects current controls exactly to all immutable v46 control bytes", () => {
    const r = read(root, "config/project/roadmap.json"),
      w = read(root, "config/project/current-work.json"),
      s = read(root, "config/project/current-work.schema.json");
    const snapshot = read(root, c.snapshotPath).files as Record<string, string>;
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read(root, "config/project/roadmap.schema.json"),
        s,
        c.version,
      ),
    ).toEqual([]);
    expect(summarizeProjectAuthority(r, w)).toMatchObject(
      v47AuthoritySummary(),
    );
    expect(
      evaluateProjectAction(r, w, "COMMIT", undefined, local("PRE_COMMIT"))
        .allowed,
    ).toBe(true);
    expect(
      evaluateProjectAction(r, w, "PUSH_BRANCH", undefined, push()).allowed,
    ).toBe(true);
    expect(
      evaluateProjectAction(r, w, "MERGE", undefined, push()).allowed,
    ).toBe(false);
    expect(w.knowledgePublicationV47).toEqual(c);
    expect(v47AuthoritySummary()).toMatchObject({
      controlVersion: c.version,
      conditionalActions: ["COMMIT", "PUSH_BRANCH"],
      mergeAuthorized: false,
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
    });
    projectV47ToV46(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(value).toEqual(
        JSON.parse(Buffer.from(snapshot[path]!, "base64").toString("utf8")),
      );
  });
  it("requires new stage-specific, sealed v47 qualification envelopes", () => {
    expect(evaluateV47Action("COMMIT", local("PRE_COMMIT")).allowed).toBe(true);
    expect(evaluateV47Action("PUSH_BRANCH", push()).allowed).toBe(true);
    for (const action of [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ])
      expect(evaluateV47Action(action).allowed).toBe(true);
    for (const action of [
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE",
      "TEST_DEPLOY",
      "PRODUCTION_DEPLOY",
      "STORAGE_OBSERVATION",
      "SQL",
      "U2",
      "CLOSE_ISSUE",
      "UNKNOWN",
    ])
      expect(evaluateV47Action(action, push()).allowed).toBe(false);
    expect(
      evaluateV47Action("COMMIT", {
        ...local("PRE_COMMIT").local,
        kind: "V43_LOCAL_QUALIFICATION",
      }).allowed,
    ).toBe(false);
    expect(
      evaluateV47Action("COMMIT", {
        ...local("PRE_COMMIT"),
        kind: "V45_LOCAL_QUALIFICATION",
      }).allowed,
    ).toBe(false);
    expect(evaluateV47Action("COMMIT", local("POST_COMMIT")).allowed).toBe(
      false,
    );
    expect(evaluateV47Action("PUSH_BRANCH", local("POST_COMMIT")).allowed).toBe(
      false,
    );
  });
  it.each([
    ["snapshotSha256", "d".repeat(64)],
    ["baseline", c.publishedHead],
    ["pullRequest", 21],
    ["baselineAncestorOfCandidateParent", false],
    ["controlVersion", c.supersedes],
    ["extra", true],
    ["observedAt", "not-a-date"],
    ["checkedAt", "2999-01-01T00:00:00Z"],
    ["observedAt", "2020-01-01T00:00:00Z"],
  ])("rejects local envelope mismatch %s", (key, value) => {
    expect(
      evaluateV47Action("COMMIT", {
        ...local("PRE_COMMIT"),
        [key]: value,
      }).allowed,
    ).toBe(false);
  });
  it.each([
    ["candidateParent", c.publishedHead],
    ["head", c.baseHead],
    ["tree", "d".repeat(40)],
    ["qualifiedTree", "d".repeat(40)],
    ["reviewedDiffSha256", "d".repeat(64)],
    ["auditTree", "d".repeat(40)],
    ["audit", "UNKNOWN"],
    ["validation", "UNKNOWN"],
    ["independentReview", "UNKNOWN"],
    ["workingTreeMatchesIndex", false],
    ["lockfileSha256", "d".repeat(64)],
    ["extra", true],
  ])("rejects source qualification mismatch %s", (key, value) => {
    const evidence = local("PRE_COMMIT");
    Object.assign(evidence.local, { [key]: value });
    expect(evaluateV47Action("COMMIT", evidence).allowed).toBe(false);
  });
  it.each([
    ["publishedHead", c.baseline],
    ["baseHead", c.baseline],
    ["headBranch", "main"],
    ["baseBranch", "main"],
    ["repository", "other/repo"],
    ["pullRequest", 21],
    ["state", "closed"],
    ["draft", false],
    ["merged", true],
    ["fastForwardFromPublishedHead", false],
    ["creationGrant", "UNUSED"],
    ["extra", true],
    ["observedAt", "2020-01-01T00:00:00Z"],
    ["checkedAt", "2999-01-01T00:00:00Z"],
  ])("rejects fresh PR20 receipt mismatch %s", (key, value) => {
    expect(
      evaluateV47Action("PUSH_BRANCH", { ...push(), [key]: value }).allowed,
    ).toBe(false);
  });
  it("rejects getters and inherited envelope fields without invoking them", () => {
    const evidence = local("PRE_COMMIT");
    Object.defineProperty(evidence, "snapshotSha256", {
      get: () => {
        throw new Error("getter invoked");
      },
    });
    expect(evaluateV47Action("COMMIT", evidence).allowed).toBe(false);
    expect(
      evaluateV47Action("COMMIT", Object.create(local("PRE_COMMIT"))).allowed,
    ).toBe(false);
  });
  it("rejects original v47 receipts and missing, historical or wrong current dependency hashes", () => {
    expect(
      evaluateV47Action("COMMIT", {
        ...local("PRE_COMMIT"),
        controlVersion: "2026.09.30-v47",
      }).allowed,
    ).toBe(false);
    for (const field of ["workspaceSha256", "lockfileSha256"] as const) {
      const missing = { ...local("PRE_COMMIT") };
      Reflect.deleteProperty(missing, field);
      expect(evaluateV47Action("COMMIT", missing).allowed).toBe(false);
      for (const value of [
        "PENDING",
        "d".repeat(64),
        HARNESS_PUBLICATION_V43.dependencyPatch[field],
      ]) {
        expect(
          evaluateV47Action("COMMIT", {
            ...local("PRE_COMMIT"),
            [field]: value,
          }).allowed,
        ).toBe(false);
      }
    }
    const candidate = local("PRE_COMMIT");
    expect(candidate.local.workspaceSha256).toBe(
      HARNESS_PUBLICATION_V43.dependencyPatch.workspaceSha256,
    );
    expect(candidate.local.lockfileSha256).toBe(
      HARNESS_PUBLICATION_V43.dependencyPatch.lockfileSha256,
    );
    expect(evaluateV47Action("COMMIT", candidate).allowed).toBe(true);
    candidate.local.workspaceSha256 = c.dependencyPatch.workspaceSha256;
    expect(evaluateV47Action("COMMIT", candidate).allowed).toBe(false);
  });
  it("allows the complete original dependency pair only during baseline preparation and rejects committed reuse", async () => {
    await withFixture(async (cwd) => {
      for (const path of ["pnpm-workspace.yaml", "pnpm-lock.yaml"])
        await writeFile(
          join(cwd, path),
          execFileSync(
            executable,
            [
              "--no-replace-objects",
              "--no-optional-locks",
              "show",
              c.baseline + ":" + path,
            ],
            { cwd },
          ),
        );
      expect(inspectV47Repository(cwd, executable).dependencyPairState).toBe(
        "BASELINE_PREPARATION_ONLY",
      );
      git(cwd, ["add", "--all"]);
      expect(inspectV47Repository(cwd, executable).dependencyPairState).toBe(
        "BASELINE_PREPARATION_ONLY",
      );
      commit(cwd);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_DEPENDENCY_PAIR_NOT_EXACT_OR_SEALED",
      );
    });
  });
  it.each(["pnpm-workspace.yaml", "pnpm-lock.yaml"])(
    "rejects old/new mixed dependency pairs with original %s",
    async (path) => {
      await withFixture(async (cwd) => {
        await writeFile(
          join(cwd, path),
          execFileSync(
            executable,
            [
              "--no-replace-objects",
              "--no-optional-locks",
              "show",
              c.baseline + ":" + path,
            ],
            { cwd },
          ),
        );
        expect(() => inspectV47Repository(cwd, executable)).toThrow(
          "V47_DEPENDENCY_PAIR_NOT_EXACT_OR_SEALED",
        );
      });
    },
  );
  it("rejects unrelated workspace bytes and same-version lock integrity changes", async () => {
    await withFixture(async (cwd) => {
      const workspace = readFileSync(join(cwd, "pnpm-workspace.yaml"));
      await writeFile(
        join(cwd, "pnpm-workspace.yaml"),
        Buffer.concat([workspace, Buffer.from("\n# unrelated change\n")]),
      );
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_DEPENDENCY_PAIR_NOT_EXACT_OR_SEALED",
      );
      await writeFile(join(cwd, "pnpm-workspace.yaml"), workspace);
      const lockfile = readFileSync(join(cwd, "pnpm-lock.yaml"), "utf8");
      expect(lockfile).toContain("integrity: sha512-");
      await writeFile(
        join(cwd, "pnpm-lock.yaml"),
        lockfile.replace("integrity: sha512-", "integrity: sha512-A"),
      );
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_DEPENDENCY_PAIR_NOT_EXACT_OR_SEALED",
      );
    });
  });
  it("preserves the unpublished v47 failure record beyond the v46 snapshot prefix", async () => {
    await withFixture(async (cwd) => {
      const path = "docs/project/EXECUTION_GATES.md",
        original = readFileSync(join(cwd, path), "utf8");
      expect(original).toContain("run-Mh31yr");
      await writeFile(
        join(cwd, path),
        original.replace("run-Mh31yr", "run-Mh31yX"),
      );
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_PRIOR_PUBLICATION_HISTORY_REWRITTEN",
      );
    });
  });
  it("accepts unstaged, exact staged, committed and synthetic PR20 trees without operator mutation", async () => {
    await withFixture((cwd) => {
      const baselineIndex = readFileSync(indexPath(cwd));
      expect(inspectV47Repository(cwd, executable)).toMatchObject({
        mode: "LOCAL_PUBLICATION_PREPARATION",
        head: c.baseline,
        commitAuthorized: false,
      });
      expect(readFileSync(indexPath(cwd))).toEqual(baselineIndex);
      git(cwd, ["add", "--all"]);
      const stagedIndex = readFileSync(indexPath(cwd));
      expect(inspectV47Repository(cwd, executable).sourceHead).toBe(c.baseline);
      expect(readFileSync(indexPath(cwd))).toEqual(stagedIndex);
      const source = commit(cwd),
        tree = git(cwd, ["rev-parse", "HEAD^{tree}"]);
      expect(inspectV47Repository(cwd, executable)).toMatchObject({
        mode: "SOURCE_COMMIT",
        sourceHead: source,
        clean: true,
      });
      const merge = git(
        cwd,
        ["commit-tree", tree, "-p", c.baseHead, "-p", source],
        "Synthetic PR20 validation\n",
      );
      git(cwd, ["checkout", "--quiet", "--detach", merge]);
      const observed = {
        sha: merge,
        ref: "refs/pull/20/merge",
        merge,
        parents: [c.baseHead, source],
        tree,
        sourceTree: tree,
      };
      const receipt = validateV47PullRequestReceipt(event(source), observed);
      expect(receipt).not.toBeNull();
      expect(inspectV47Repository(cwd, executable, receipt!)).toMatchObject({
        mode: "DRAFT_PR20_SYNTHETIC_MERGE",
        sourceHead: source,
        clean: true,
        mergeAuthorized: false,
      });
      expect(() => inspectV47Repository(cwd, executable)).toThrow();
    });
  });
  it("preserves raw index bytes on stale identical-content stat and negative inspections", async () => {
    await withFixture(async (cwd) => {
      const path = join(cwd, "package.json"),
        bytes = readFileSync(path),
        before = readFileSync(indexPath(cwd));
      await writeFile(path, bytes);
      await utimes(path, new Date("2020-01-01"), new Date("2020-01-01"));
      inspectV47Repository(cwd, executable);
      expect(readFileSync(indexPath(cwd))).toEqual(before);
      await writeFile(path, Buffer.concat([bytes, Buffer.from("\n")]));
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_PATH_OUTSIDE_SCOPE",
      );
      expect(readFileSync(indexPath(cwd))).toEqual(before);
      expect(git(cwd, ["rev-parse", "HEAD"])).toBe(c.baseline);
    });
  });
  it.each([
    ["src/project-control-v46.ts", "V47_FROZEN_V46_PATH_DRIFT"],
    ["src/faq.ts", "V47_FROZEN_V46_PATH_DRIFT"],
    ["worker-tests/mp-06-pilot-control.test.ts", "V47_FROZEN_V46_PATH_DRIFT"],
    ["tests/project-control-v45.test.ts", "V47_FROZEN_V46_PATH_DRIFT"],
    [
      "tests/project-control-v46.test.ts",
      "V47_V46_FIXTURE_ADAPTER_SEAL_REQUIRED",
    ],
  ])("rejects changed frozen content %s", async (path, error) => {
    await withFixture(async (cwd) => {
      await writeFile(
        join(cwd, path),
        Buffer.concat([readFileSync(join(cwd, path)), Buffer.from("\n")]),
      );
      expect(() => inspectV47Repository(cwd, executable)).toThrow(error);
    });
  });
  it("rejects corrupted snapshots and partial staging", async () => {
    await withFixture(async (cwd) => {
      git(cwd, ["add", "config/project/roadmap.json"]);
      expect(() => inspectV47Repository(cwd, executable)).toThrow();
      await writeFile(join(cwd, c.snapshotPath), "{}");
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_SNAPSHOT_SEAL_MISMATCH",
      );
    });
  });
  it("rejects inherited control drift and historical document rewrites", async () => {
    await withFixture(async (cwd) => {
      const path = "config/project/current-work.json",
        original = readFileSync(join(cwd, path));
      const current = read(cwd, path);
      (current.testKnowledgeValidityV46 as Record<string, unknown>).commit =
        true;
      await writeFile(join(cwd, path), JSON.stringify(current));
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_INHERITED_CONTROL_DRIFT",
      );
      await writeFile(join(cwd, path), original);
      await writeFile(
        join(cwd, "docs/project/OWNER_DECISION_LOG.md"),
        "rewritten history\n",
      );
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_HISTORY_REWRITTEN",
      );
    });
  });
  it("rejects source history that temporarily changes and then restores a forbidden path", async () => {
    await withFixture(async (cwd) => {
      commit(cwd);
      const original = readFileSync(join(cwd, "package.json"));
      await writeFile(
        join(cwd, "package.json"),
        Buffer.concat([original, Buffer.from("\n")]),
      );
      commit(cwd);
      await writeFile(join(cwd, "package.json"), original);
      commit(cwd);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_SINGLE_PUBLICATION_CHILD_REQUIRED",
      );
    });
  });
  it("rejects source history that temporarily changes and then restores allowed but frozen knowledge", async () => {
    await withFixture(async (cwd) => {
      commit(cwd);
      const path = "src/faq.ts",
        original = readFileSync(join(cwd, path));
      await writeFile(
        join(cwd, path),
        Buffer.concat([original, Buffer.from("\n")]),
      );
      commit(cwd);
      await writeFile(join(cwd, path), original);
      commit(cwd);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_SINGLE_PUBLICATION_CHILD_REQUIRED",
      );
    });
  });
  it("rejects hidden flags, symlink paths and in-progress index locks", async () => {
    await withFixture(async (cwd) => {
      git(cwd, ["update-index", "--assume-unchanged", "package.json"]);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_HIDDEN_INDEX_FLAGS_REJECTED",
      );
      git(cwd, ["update-index", "--no-assume-unchanged", "package.json"]);
      await rm(join(cwd, "src/faq.ts"));
      await symlink(join(root, "src/faq.ts"), join(cwd, "src/faq.ts"));
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_NON_REGULAR_PATH",
      );
      await writeFile(indexPath(cwd) + ".lock", "synthetic lock");
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_IN_PROGRESS_OR_GRAFT_STATE",
      );
      expect(readFileSync(indexPath(cwd) + ".lock", "utf8")).toBe(
        "synthetic lock",
      );
    });
  });
  it("rejects wrong source branches and remote push destinations", async () => {
    await withFixture((cwd) => {
      git(cwd, ["branch", "-m", "synthetic-wrong-branch"]);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_SOURCE_BRANCH_MISMATCH",
      );
      git(cwd, ["branch", "-m", c.headBranch]);
      git(cwd, [
        "remote",
        "set-url",
        "--push",
        "origin",
        "https://github.com/other/repo.git",
      ]);
      expect(() => inspectV47Repository(cwd, executable)).toThrow(
        "V47_REPOSITORY_REMOTE_MISMATCH",
      );
    });
  });
  it("binds runner SHA/ref, repository, Draft state and ordered source-identical synthetic parents", () => {
    const head = "a".repeat(40),
      merge = "b".repeat(40),
      tree = "c".repeat(40);
    const observed: V43CheckoutReceipt = {
      sha: merge,
      ref: "refs/pull/20/merge",
      merge,
      parents: [c.baseHead, head],
      tree,
      sourceTree: tree,
    };
    expect(validateV47PullRequestReceipt(event(head), observed)).not.toBeNull();
    for (const patch of [
      { sha: head },
      { ref: "refs/heads/" + c.headBranch },
      { parents: [head, c.baseHead] },
      { sourceTree: "d".repeat(40) },
    ])
      expect(
        validateV47PullRequestReceipt(event(head), { ...observed, ...patch }),
      ).toBeNull();
    for (const patch of [
      { state: "closed" },
      { draft: false },
      { merged: true },
      { merged: undefined },
      { number: 21 },
    ]) {
      const payload = event(head);
      Object.assign(payload.pull_request, patch);
      expect(validateV47PullRequestReceipt(payload, observed)).toBeNull();
    }
    const wrongRepo = event(head);
    Object.assign(wrongRepo.pull_request.head.repo, {
      full_name: "other/repo",
    });
    expect(validateV47PullRequestReceipt(wrongRepo, observed)).toBeNull();
    expect(
      validateV47PullRequestReceipt(event(c.baseline), {
        ...observed,
        parents: [c.baseHead, c.baseline],
      }),
    ).toBeNull();
  });
});
