import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  validateProjectControl,
  validateSchemaDocuments,
} from "../src/project-control.js";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import {
  HARNESS_PUBLICATION_V43,
  V43_ALLOWED_PATHS,
  evaluateV43Action,
  inspectV43Repository,
  projectV43ToV42,
  readQualifiedV42Snapshot,
  validateV43PullRequestReceipt,
  type V43LocalReceipt,
  type V43CreationReceipt,
} from "../src/project-control-v43.js";

const root = new URL("../", import.meta.url),
  c = HARNESS_PUBLICATION_V43;
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
  const cwd = await mkdtemp(join(tmpdir(), "mp06-v43-fixture-"));
  const previous = environmentKeys.map(
    (key) => [key, process.env[key]] as const,
  );
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    git(fileURLToPath(root), [
      "clone",
      "--quiet",
      "--shared",
      "--no-checkout",
      fileURLToPath(root),
      cwd,
    ]);
    git(cwd, ["checkout", "--quiet", "--detach", c.baseline]);
    for (const path of V43_ALLOWED_PATHS) {
      if (!existsSync(new URL(path, root))) continue;
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
  git(cwd, ["commit", "--quiet", "-m", "Synthetic v43 source"]);
  return git(cwd, ["rev-parse", "HEAD"]);
};
function eventFor(
  head = "a".repeat(40),
  merge = "b".repeat(40),
  tree = "c".repeat(40),
) {
  return {
    event: {
      number: 123,
      repository: { full_name: c.repository as string },
      pull_request: {
        number: 123,
        state: "open",
        draft: true,
        merged: false,
        merge_commit_sha: merge as string | null | undefined,
        head: {
          ref: c.headBranch as string,
          sha: head,
          repo: { full_name: c.repository as string },
        },
        base: {
          ref: c.baseBranch as string,
          sha: c.baseline as string,
          repo: { full_name: c.repository as string },
        },
      },
    },
    observed: {
      sha: merge as string | undefined,
      ref: "refs/pull/123/merge" as string | undefined,
      merge,
      tree,
      sourceTree: tree,
      parents: [c.baseline as string, head],
    },
  };
}
function local(stage: V43LocalReceipt["stage"]): V43LocalReceipt {
  return {
    kind: "V43_LOCAL_QUALIFICATION",
    stage,
    repository: c.repository,
    headBranch: c.headBranch,
    baseBranch: c.baseBranch,
    baseHead: c.baseline,
    head: stage === "PRE_COMMIT" ? c.baseline : "a".repeat(40),
    candidateParent: c.baseline,
    tree: "b".repeat(40),
    qualifiedTree: "b".repeat(40),
    diffSha256: "c".repeat(64),
    reviewedDiffSha256: "c".repeat(64),
    snapshotSha256: c.snapshotSha256,
    priorV42SourceSealSha256: c.priorV42SourceSealSha256,
    validation: stage === "PRE_COMMIT" ? "FOCUSED_PASS" : "FULL_PASS",
    independentReview: "NO_ACTIONABLE_FINDINGS",
    workingTreeMatchesIndex: true,
    workingTreeClean: stage === "POST_COMMIT",
    audit: "ZERO_AT_EVERY_SEVERITY",
    auditTree: "b".repeat(40),
    workspaceSha256: c.dependencyPatch.workspaceSha256,
    lockfileSha256: c.dependencyPatch.lockfileSha256,
  };
}
const creation = (): V43CreationReceipt => ({
  kind: "V43_DRAFT_CREATION",
  local: local("POST_COMMIT"),
  creationState: "UNUSED",
  existingPullRequests: [],
  observedAt: new Date(Date.now() - 1000).toISOString(),
  checkedAt: new Date().toISOString(),
});

describe("v43 exact Draft publication without renewed integration authority", () => {
  it("projects exactly to qualified v42 and validates this actual checkout", async () => {
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
    await expect(runProjectControlValidation(root)).resolves.toBeUndefined();
    const snapshot = readQualifiedV42Snapshot(fileURLToPath(root));
    projectV43ToV42(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(value).toEqual(JSON.parse(snapshot.controls[path]!));
  });

  it("requires stage-specific source/tree/review/audit receipts, including a follow-up source parent", () => {
    expect(evaluateV43Action("COMMIT", local("PRE_COMMIT")).allowed).toBe(true);
    expect(
      evaluateV43Action("COMMIT", {
        ...local("PRE_COMMIT"),
        head: "d".repeat(40),
        candidateParent: "d".repeat(40),
      }).allowed,
    ).toBe(true);
    expect(evaluateV43Action("PUSH_BRANCH", local("POST_COMMIT")).allowed).toBe(
      true,
    );
    for (const [action, evidence] of [
      ["COMMIT", local("POST_COMMIT")],
      ["PUSH_BRANCH", local("PRE_COMMIT")],
      ["COMMIT", { ...local("PRE_COMMIT"), candidateParent: "e".repeat(40) }],
      [
        "PUSH_BRANCH",
        { ...local("POST_COMMIT"), candidateParent: "a".repeat(40) },
      ],
    ] as const)
      expect(evaluateV43Action(action, evidence).allowed).toBe(false);
    for (const key of [
      "repository",
      "headBranch",
      "baseBranch",
      "baseHead",
      "tree",
      "qualifiedTree",
      "reviewedDiffSha256",
      "snapshotSha256",
      "priorV42SourceSealSha256",
      "validation",
      "independentReview",
      "workingTreeMatchesIndex",
      "workingTreeClean",
      "audit",
      "auditTree",
      "workspaceSha256",
      "lockfileSha256",
    ]) {
      const e = { ...local("POST_COMMIT"), [key]: "drift" };
      expect(evaluateV43Action("PUSH_BRANCH", e).allowed, key).toBe(false);
    }
    for (const action of [
      "COMMIT",
      "PUSH_BRANCH",
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE_MP06_POLICY",
      "MERGE_MP06_PR18",
      "DEPLOY_TEST",
      "QUERY_STORAGE",
      "QUERY_PRODUCTION",
      "CLOSE_ISSUE",
    ]) {
      expect(
        evaluateV43Action(action, { passed: true, approved: true }).allowed,
        action,
      ).toBe(false);
    }
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json");
    expect(
      evaluateProjectAction(r, w, "MERGE_MP06_POLICY", undefined, creation())
        .allowed,
    ).toBe(false);
  });

  it("requires fresh unused single creation evidence and rejects stale/future/replayed checks", () => {
    expect(evaluateV43Action("CREATE_DRAFT_PR", creation()).allowed).toBe(true);
    const stale = new Date(Date.now() - 120001).toISOString(),
      future = new Date(Date.now() + 60000).toISOString();
    for (const e of [
      { ...creation(), creationState: "CONSUMED" },
      { ...creation(), existingPullRequests: [123] },
      { ...creation(), observedAt: stale, checkedAt: stale },
      { ...creation(), observedAt: future, checkedAt: future },
      { ...creation(), checkedAt: new Date(Date.now() - 2000).toISOString() },
      { ...creation(), local: local("PRE_COMMIT") },
      { ...creation(), extra: true },
    ])
      expect(evaluateV43Action("CREATE_DRAFT_PR", e).allowed).toBe(false);
  });

  it.each([undefined, null, "d".repeat(40)])(
    "accepts optional asynchronous merge metadata %s only with the exact runner tuple",
    (metadata) => {
      const { event, observed } = eventFor();
      event.pull_request.merge_commit_sha = metadata;
      expect(validateV43PullRequestReceipt(event, observed)?.head).toBe(
        event.pull_request.head.sha,
      );
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
    "draft",
    "closed",
    "merged",
    "old-pr",
    "runner-sha",
    "runner-ref",
    "parents",
    "tree",
    "metadata",
  ])("rejects %s identity drift", (variant) => {
    const { event, observed } = eventFor(),
      pr = event.pull_request;
    if (variant === "repository") event.repository.full_name = "other/repo";
    else if (variant === "head-repository")
      pr.head.repo.full_name = "other/repo";
    else if (variant === "base-repository")
      pr.base.repo.full_name = "other/repo";
    else if (variant === "head-branch") pr.head.ref = "wrong";
    else if (variant === "base-branch") pr.base.ref = "wrong";
    else if (variant === "base-sha") pr.base.sha = "e".repeat(40);
    else if (variant === "head-sha") pr.head.sha = "e".repeat(40);
    else if (variant === "draft") pr.draft = false;
    else if (variant === "closed") pr.state = "closed";
    else if (variant === "merged") pr.merged = true;
    else if (variant === "old-pr") {
      event.number = 19;
      pr.number = 19;
      observed.ref = "refs/pull/19/merge";
    } else if (variant === "runner-sha") observed.sha = "e".repeat(40);
    else if (variant === "runner-ref")
      observed.ref = "refs/heads/" + c.headBranch;
    else if (variant === "parents") observed.parents.reverse();
    else if (variant === "tree") observed.sourceTree = "e".repeat(40);
    else pr.merge_commit_sha = "malformed";
    expect(validateV43PullRequestReceipt(event, observed)).toBeNull();
  });

  it("inspects precommit, committed source and an exact Draft synthetic merge with both CLI entrypoints", async () => {
    await withFixture(async (cwd) => {
      expect(
        inspectV43Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("LOCAL_SOURCE");
      const source = commit(cwd),
        tree = git(cwd, ["rev-parse", "HEAD^{tree}"]);
      expect(
        inspectV43Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("SOURCE_COMMIT");
      const merge = git(cwd, [
        "commit-tree",
        tree,
        "-p",
        c.baseline,
        "-p",
        source,
        "-m",
        "Synthetic Draft merge",
      ]);
      git(cwd, ["checkout", "--quiet", "--detach", merge]);
      const { event, observed } = eventFor(source, merge, tree),
        receipt = validateV43PullRequestReceipt(event, observed);
      expect(receipt).not.toBeNull();
      if (!receipt) throw new Error("invalid synthetic receipt");
      expect(
        inspectV43Repository(cwd, projectControlGitExecutable(), receipt).mode,
      ).toBe("DRAFT_PR_SYNTHETIC_MERGE");
      expect(() =>
        inspectV43Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V43_MERGE_NOT_PUBLICATION_AUTHORITY");
      const directory = await mkdtemp(join(tmpdir(), "mp06-v43-event-")),
        eventPath = join(directory, "event.json");
      try {
        await writeFile(eventPath, JSON.stringify(event));
        process.env.GITHUB_EVENT_NAME = "pull_request";
        process.env.GITHUB_EVENT_PATH = eventPath;
        process.env.GITHUB_REPOSITORY = c.repository;
        process.env.GITHUB_SHA = merge;
        process.env.GITHUB_REF = observed.ref;
        const url = pathToFileURL(cwd + "/");
        await expect(runProjectControlValidation(url)).resolves.toBeUndefined();
        await expect(
          runPullRequestControlValidation(url, eventPath),
        ).resolves.toBeUndefined();
        await expect(
          runPullRequestControlValidation(url, eventPath + ".other"),
        ).rejects.toThrow();
        event.pull_request.draft = false;
        await writeFile(eventPath, JSON.stringify(event));
        await expect(runProjectControlValidation(url)).rejects.toThrow(
          "V43_PR_MERGE_IDENTITY_MISMATCH",
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
    "frozen-harness",
    "dependency",
    "history",
    "schema",
    "hidden-index",
  ])("rejects %s scope drift", async (variant) => {
    await withFixture(async (cwd) => {
      if (variant === "untracked")
        await writeFile(join(cwd, "tests/unapproved.ts"), "// unexpected\n");
      else if (variant === "history")
        await writeFile(
          join(cwd, "docs/project/OWNER_DECISION_LOG.md"),
          "rewritten\n",
        );
      else if (variant === "schema") {
        const path = join(cwd, "config/project/current-work.schema.json");
        const s = JSON.parse(readFileSync(path, "utf8")) as {
          properties: Record<string, unknown>;
        };
        s.properties.unapproved = { type: "boolean" };
        await writeFile(path, JSON.stringify(s));
      } else {
        const path =
          variant === "frozen-harness"
            ? "tests/project-control.test.ts"
            : variant === "dependency"
              ? "pnpm-workspace.yaml"
              : "worker/index.ts";
        const file = join(cwd, path),
          bytes = readFileSync(file);
        if (variant === "hidden-index")
          git(cwd, ["update-index", "--assume-unchanged", "--", path]);
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
        inspectV43Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });

  it("rejects committed protected edit-and-restore even when final bytes match", async () => {
    await withFixture(async (cwd) => {
      commit(cwd);
      const path = join(cwd, "worker/index.ts"),
        bytes = readFileSync(path);
      await writeFile(
        path,
        Buffer.concat([
          bytes,
          Buffer.from("\n// forbidden intermediate edit\n"),
        ]),
      );
      commit(cwd);
      await writeFile(path, bytes);
      commit(cwd);
      expect(() =>
        inspectV43Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V43_PATH_OUTSIDE_SCOPE");
    });
  });
});
