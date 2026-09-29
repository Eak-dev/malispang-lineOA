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
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
} from "../src/project-control.js";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import { HARNESS_PUBLICATION_V43 } from "../src/project-control-v43.js";
import {
  INSPECTOR_BATCH_V45 as c,
  V45_ALLOWED_PATHS,
  evaluateV45Action,
  inspectV45Repository,
  projectV45ToV43,
  validateV45PullRequestReceipt,
  type V45LocalReceipt,
  type V45PushReceipt,
} from "../src/project-control-v45.js";

const root = new URL("../", import.meta.url);
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as Record<
    string,
    unknown
  >;
const git = (cwd: string, args: string[], input?: string) =>
  execFileSync(
    projectControlGitExecutable(),
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
const environmentKeys = [
  "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH",
  "GITHUB_REPOSITORY",
  "GITHUB_SHA",
  "GITHUB_REF",
] as const;
async function withFixture(run: (cwd: string) => Promise<void> | void) {
  const cwd = await mkdtemp(join(tmpdir(), "mp06-v45-")),
    previous = environmentKeys.map((key) => [key, process.env[key]] as const);
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    git(fileURLToPath(root), [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      fileURLToPath(root),
      cwd,
    ]);
    git(cwd, ["checkout", "--quiet", "--detach", c.baseline]);
    for (const path of V45_ALLOWED_PATHS) {
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await copyFile(new URL(path, root), join(cwd, path));
    }
    await run(cwd);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
  }
}
const commit = (cwd: string) => {
  git(cwd, ["add", "--all"]);
  git(cwd, ["commit", "--quiet", "-m", "Synthetic v45"]);
  return git(cwd, ["rev-parse", "HEAD"]);
};
function local(stage: "PRE_COMMIT" | "POST_COMMIT"): V45LocalReceipt {
  const old = HARNESS_PUBLICATION_V43;
  return {
    kind: "V45_LOCAL_QUALIFICATION",
    controlVersion: c.version,
    baseline: c.baseline,
    pullRequest: 20,
    implementationSeals: { ...c.implementationSeals },
    measurement: "PAIRED_MEASURED_AND_REVIEWED",
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
function push(): V45PushReceipt {
  const now = new Date().toISOString();
  return {
    kind: "V45_EXISTING_DRAFT_PUSH",
    local: local("POST_COMMIT"),
    repository: c.repository,
    pullRequest: 20,
    headBranch: c.headBranch,
    baseBranch: c.baseBranch,
    baseHead: c.baseHead,
    publishedHead: c.baseline,
    state: "open",
    draft: true,
    merged: false,
    creationGrant: "CONSUMED_NO_NEW_PR",
    fastForwardFromPublishedHead: true,
    observedAt: now,
    checkedAt: now,
  };
}
function eventFor(
  head = "a".repeat(40),
  merge = "b".repeat(40),
  tree = "c".repeat(40),
) {
  return {
    event: {
      number: 20,
      repository: { full_name: c.repository as string },
      pull_request: {
        number: 20,
        state: "open",
        draft: true,
        merged: false as boolean | undefined,
        merge_commit_sha: merge as string | null | undefined,
        head: {
          ref: c.headBranch as string,
          sha: head,
          repo: { full_name: c.repository as string },
        },
        base: {
          ref: c.baseBranch as string,
          sha: c.baseHead as string,
          repo: { full_name: c.repository as string },
        },
      },
    },
    observed: {
      sha: merge,
      ref: "refs/pull/20/merge",
      merge,
      parents: [c.baseHead as string, head],
      tree,
      sourceTree: tree,
    },
  };
}

describe("v45 measured repair updates only existing Draft PR20", () => {
  it("projects exactly to immutable published v43 and validates current authority", async () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json"),
      s = read("config/project/current-work.schema.json");
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        c.version,
      ),
    ).toEqual([]);
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      pullRequest: 20,
      creationGrant: "CONSUMED_NO_NEW_PR",
      conditionalActions: ["COMMIT", "PUSH_BRANCH"],
      mergeAuthorized: false,
    });
    await expect(runProjectControlValidation(root)).resolves.toBeUndefined();
    projectV45ToV43(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(value).toEqual(
        JSON.parse(git(fileURLToPath(root), ["show", c.baseline + ":" + path])),
      );
  });
  it("requires sealed measured stage-specific receipts and denies all old/new-PR authority", () => {
    expect(evaluateV45Action("COMMIT", local("PRE_COMMIT")).allowed).toBe(true);
    expect(evaluateV45Action("PUSH_BRANCH", push()).allowed).toBe(true);
    expect(
      evaluateV45Action("COMMIT", {
        ...local("PRE_COMMIT"),
        local: {
          ...local("PRE_COMMIT").local,
          head: "d".repeat(40),
          candidateParent: "d".repeat(40),
        },
      }).allowed,
    ).toBe(true);
    for (const evidence of [
      { passed: true, approved: true },
      local("POST_COMMIT"),
      { kind: "V43_LOCAL_QUALIFICATION", ...local("PRE_COMMIT").local },
      { ...local("PRE_COMMIT"), extra: true },
      {
        ...local("PRE_COMMIT"),
        implementationSeals: {
          ...c.implementationSeals,
          "src/project-control.ts": "d".repeat(64),
        },
      },
      { ...local("PRE_COMMIT"), measurement: "NOT_MEASURED" },
      { ...local("PRE_COMMIT"), pullRequest: 21 },
      {
        ...local("PRE_COMMIT"),
        local: {
          ...local("PRE_COMMIT").local,
          candidateParent: "d".repeat(40),
        },
      },
      {
        ...local("PRE_COMMIT"),
        local: {
          ...local("PRE_COMMIT").local,
          head: c.baseHead,
          candidateParent: c.baseHead,
        },
      },
    ])
      expect(evaluateV45Action("COMMIT", evidence).allowed).toBe(false);
    for (const action of [
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE_MP06_POLICY",
      "MERGE_MP06_PR18",
      "DEPLOY_TEST",
      "QUERY_STORAGE",
      "QUERY_PRODUCTION",
      "CLOSE_ISSUE",
    ]) {
      expect(evaluateV45Action(action, push()).allowed).toBe(false);
      expect(
        evaluateProjectAction(
          read("config/project/roadmap.json"),
          read("config/project/current-work.json"),
          action,
          undefined,
          push(),
        ).allowed,
      ).toBe(false);
    }
    const getter = { ...local("PRE_COMMIT").local };
    Object.defineProperty(getter, "audit", {
      get() {
        throw new Error("must not execute getter");
      },
      enumerable: true,
    });
    expect(
      evaluateV45Action("COMMIT", { ...local("PRE_COMMIT"), local: getter })
        .allowed,
    ).toBe(false);
  });
  it("rejects stale, future, wrong-PR, same-head and non-full push receipts", () => {
    const stale = new Date(Date.now() - 120001).toISOString(),
      future = new Date(Date.now() + 60000).toISOString();
    for (const evidence of [
      local("POST_COMMIT"),
      { ...push(), observedAt: stale, checkedAt: stale },
      { ...push(), observedAt: future, checkedAt: future },
      { ...push(), draft: false },
      { ...push(), state: "closed" },
      { ...push(), merged: true },
      { ...push(), creationGrant: "UNUSED" },
      { ...push(), pullRequest: 21 },
      { ...push(), repository: "other/repo" },
      { ...push(), baseHead: "e".repeat(40) },
      { ...push(), headBranch: "other" },
      { ...push(), publishedHead: "a".repeat(40) },
      { ...push(), fastForwardFromPublishedHead: false },
      { ...push(), local: local("PRE_COMMIT") },
      {
        ...push(),
        local: {
          ...local("POST_COMMIT"),
          local: {
            ...local("POST_COMMIT").local,
            candidateParent: "a".repeat(40),
          },
        },
      },
      {
        ...push(),
        local: {
          ...local("POST_COMMIT"),
          local: {
            ...local("POST_COMMIT").local,
            reviewedDiffSha256: "d".repeat(64),
          },
        },
      },
    ])
      expect(evaluateV45Action("PUSH_BRANCH", evidence).allowed).toBe(false);
  });
  it("requires exact PR20, open Draft, runner parents/tree/source and repository/branches", () => {
    for (const metadata of [undefined, null, "d".repeat(40)]) {
      const { event, observed } = eventFor();
      event.pull_request.merge_commit_sha = metadata;
      expect(validateV45PullRequestReceipt(event, observed)).not.toBeNull();
    }
    for (const variant of [
      "pr",
      "repo",
      "headrepo",
      "baserepo",
      "branch",
      "basebranch",
      "base",
      "baseline-source",
      "draft",
      "closed",
      "merged",
      "missing-merged",
      "sha",
      "ref",
      "parents",
      "tree",
      "metadata",
    ]) {
      const { event, observed } = eventFor(),
        pr = event.pull_request;
      if (variant === "pr") {
        event.number = 21;
        pr.number = 21;
        observed.ref = "refs/pull/21/merge";
      } else if (variant === "repo") event.repository.full_name = "wrong";
      else if (variant === "headrepo") pr.head.repo.full_name = "wrong";
      else if (variant === "baserepo") pr.base.repo.full_name = "wrong";
      else if (variant === "branch") pr.head.ref = "wrong";
      else if (variant === "basebranch") pr.base.ref = "wrong";
      else if (variant === "base") pr.base.sha = "d".repeat(40);
      else if (variant === "baseline-source") {
        pr.head.sha = c.baseline;
        observed.parents[1] = c.baseline;
      } else if (variant === "draft") pr.draft = false;
      else if (variant === "closed") pr.state = "closed";
      else if (variant === "merged") pr.merged = true;
      else if (variant === "missing-merged") pr.merged = undefined;
      else if (variant === "sha") observed.sha = "d".repeat(40);
      else if (variant === "ref") observed.ref = "refs/heads/" + c.headBranch;
      else if (variant === "parents") observed.parents.reverse();
      else if (variant === "tree") observed.sourceTree = "d".repeat(40);
      else pr.merge_commit_sha = "invalid";
      expect(
        validateV45PullRequestReceipt(event, observed),
        variant,
      ).toBeNull();
    }
  });
  it.each(["uncommitted", "staged", "committed"])(
    "checks independent %s source state",
    async (stage) => {
      await withFixture((cwd) => {
        if (stage === "staged") git(cwd, ["add", "--all"]);
        if (stage === "committed") commit(cwd);
        const inspected = inspectV45Repository(
          cwd,
          projectControlGitExecutable(),
        );
        expect(inspected.mode).toBe(
          stage === "committed" ? "SOURCE_COMMIT" : "LOCAL_REPAIR",
        );
        expect(inspected.clean).toBe(stage === "committed");
      });
    },
  );
  it("checks exact CI synthetic [M,S] with both entrypoints", async () => {
    await withFixture(async (cwd) => {
      const source = commit(cwd),
        tree = git(cwd, ["rev-parse", "HEAD^{tree}"]);
      const merge = git(cwd, [
        "commit-tree",
        tree,
        "-p",
        c.baseHead,
        "-p",
        source,
        "-m",
        "Synthetic v45 PR20",
      ]);
      git(cwd, ["checkout", "--quiet", "--detach", merge]);
      const { event, observed } = eventFor(source, merge, tree),
        receipt = validateV45PullRequestReceipt(event, observed);
      if (!receipt) throw new Error("synthetic receipt missing");
      expect(
        inspectV45Repository(cwd, projectControlGitExecutable(), receipt).mode,
      ).toBe("DRAFT_PR20_SYNTHETIC_MERGE");
      expect(() =>
        inspectV45Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V45_SOURCE_MERGE_REJECTED");
      const directory = await mkdtemp(join(tmpdir(), "mp06-v45-event-")),
        eventPath = join(directory, "event.json");
      try {
        await writeFile(eventPath, JSON.stringify(event));
        Object.assign(process.env, {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_REPOSITORY: c.repository,
          GITHUB_SHA: merge,
          GITHUB_REF: observed.ref,
        });
        const url = pathToFileURL(cwd + "/");
        await expect(runProjectControlValidation(url)).resolves.toBeUndefined();
        await expect(
          runPullRequestControlValidation(url, eventPath),
        ).resolves.toBeUndefined();
        await expect(
          runPullRequestControlValidation(url, eventPath + ".other"),
        ).rejects.toThrow();
        event.number = 21;
        event.pull_request.number = 21;
        process.env.GITHUB_REF = "refs/pull/21/merge";
        await writeFile(eventPath, JSON.stringify(event));
        await expect(runProjectControlValidation(url)).rejects.toThrow(
          "V45_PR_MERGE_IDENTITY_MISMATCH",
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  });
  it.each([
    "protected",
    "staged-protected",
    "untracked",
    "dependency",
    "frozen-v43",
    "harness",
    "current-inspector",
    "batch-module",
    "batch-tests",
    "history",
    "schema",
    "authority",
    "assume-unchanged",
    "skip-worktree",
    "index-lock",
    "replacement",
    "symlink",
  ])("rejects %s drift", async (variant) => {
    await withFixture(async (cwd) => {
      if (variant === "untracked")
        await writeFile(join(cwd, "tests/unapproved.ts"), "// unexpected\n");
      else if (variant === "history")
        await writeFile(
          join(cwd, "docs/project/OWNER_DECISION_LOG.md"),
          "rewritten\n",
        );
      else if (variant === "index-lock")
        await writeFile(join(cwd, ".git/index.lock"), "");
      else if (variant === "replacement")
        git(cwd, ["update-ref", "refs/replace/" + c.baseline, c.baseHead]);
      else if (variant === "symlink") {
        await rm(join(cwd, "tests/project-control-v45.test.ts"));
        await symlink(
          "project-control-v43.test.ts",
          join(cwd, "tests/project-control-v45.test.ts"),
        );
      } else if (variant === "schema" || variant === "authority") {
        const path = join(
            cwd,
            variant === "schema"
              ? "config/project/current-work.schema.json"
              : "config/project/current-work.json",
          ),
          value = JSON.parse(readFileSync(path, "utf8")) as Record<
            string,
            unknown
          >;
        if (variant === "schema")
          (value.properties as Record<string, unknown>).unapproved = {
            type: "boolean",
          };
        else
          (value.harnessPublicationV43 as Record<string, unknown>).merge = true;
        await writeFile(path, JSON.stringify(value));
      } else {
        const path =
            variant === "dependency"
              ? "pnpm-lock.yaml"
              : variant === "current-inspector"
                ? "src/project-control.ts"
                : variant === "batch-module"
                  ? "src/project-control-git-batch.ts"
                  : variant === "batch-tests"
                    ? "tests/project-control-git-batch.test.ts"
                    : variant === "frozen-v43"
                      ? "src/project-control-v43.ts"
                      : variant === "harness"
                        ? c.harnessPath
                        : "worker/index.ts",
          file = join(cwd, path),
          bytes = readFileSync(file);
        if (variant === "assume-unchanged" || variant === "skip-worktree")
          git(cwd, ["update-index", "--" + variant, "--", path]);
        await writeFile(
          file,
          Buffer.concat([bytes, Buffer.from("\n// synthetic drift\n")]),
        );
        if (variant === "staged-protected") {
          git(cwd, ["add", "--", path]);
          await writeFile(file, bytes);
        }
      }
      expect(() =>
        inspectV45Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
  it("rejects partial baseline index and protected edit-and-restore history", async () => {
    await withFixture(async (cwd) => {
      git(cwd, ["add", "--", "src/project-control.ts"]);
      expect(() =>
        inspectV45Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V45_PARTIAL_BASELINE_INDEX_REJECTED");
      commit(cwd);
      const path = join(cwd, "worker/index.ts"),
        bytes = readFileSync(path);
      await writeFile(
        path,
        Buffer.concat([bytes, Buffer.from("\n// forbidden historical edit\n")]),
      );
      commit(cwd);
      await writeFile(path, bytes);
      commit(cwd);
      expect(() =>
        inspectV45Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V45_PATH_OUTSIDE_SCOPE");
    });
  });
});
