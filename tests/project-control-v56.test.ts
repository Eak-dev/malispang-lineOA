import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import { withHistoricalEnvironment } from "./helpers/historical-environment.js";
import { describe, expect, it } from "vitest";
import {
  REVIEWED_V55_PUBLICATION_V56 as c,
  V56_ALLOWED_PATHS,
  evaluateV56Action,
  inspectV56Repository,
  reconstructReviewedV55,
  projectV56ToV55,
  validateV56PullRequestReceipt,
} from "../src/project-control-v56.js";
import {
  projectControlGitExecutable,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
  summarizeProjectAuthority,
} from "../src/project-control.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (cwd: string, ...args: string[]) =>
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
      "user.name=Synthetic",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
const read = (path: string) =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;
const state = () => ({
  head: git(root, "rev-parse", "HEAD"),
  index: readFileSync(
    join(git(root, "rev-parse", "--absolute-git-dir"), "index"),
  ),
  status: git(root, "status", "--porcelain=v1", "--untracked-files=all"),
});
async function fixture(run: (cwd: string) => Promise<void> | void) {
  const before = state(),
    cwd = await mkdtemp(join(tmpdir(), "mp06-v56-"));
  try {
    git(
      root,
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      root,
      cwd,
    );
    git(cwd, "checkout", "--quiet", "-B", c.headBranch, c.baseline);
    git(
      cwd,
      "remote",
      "set-url",
      "origin",
      "https://github.com/" + c.repository + ".git",
    );
    for (const p of V56_ALLOWED_PATHS) {
      await mkdir(dirname(join(cwd, p)), { recursive: true });
      await copyFile(join(root, p), join(cwd, p));
    }
    await run(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
    expect(state()).toEqual(before);
  }
}
describe("v56 frozen v55 publication only", () => {
  it("freezes the complete reviewed tree and 18-file snapshot without a fabricated commit", () => {
    expect(V56_ALLOWED_PATHS).toHaveLength(21);
    const snapshot = reconstructReviewedV55(
      root,
      projectControlGitExecutable(),
    );
    expect(snapshot.tree).toBe(c.reviewedV55.tree);
    expect(snapshot.files.size).toBe(18);
    expect(c.retiredLineage.v22).toBe("RETIRED_UNUSED_NO_REISSUE");
  });
  it.each([
    "fixture-digest",
    "fixture-tree",
    "v55-module",
    "types",
    "worker-tests",
    "wrangler",
    "v55-prefix",
    "second-child",
    "incomplete-stage",
  ])("rejects %s relative to the exact reviewed local v55", async (kind) => {
    await fixture(async (cwd) => {
      if (kind === "second-child") {
        git(cwd, "add", "--all");
        git(cwd, "commit", "--quiet", "-m", "Synthetic first");
        git(
          cwd,
          "commit",
          "--quiet",
          "--allow-empty",
          "-m",
          "Synthetic second",
        );
      } else if (kind === "incomplete-stage") {
        git(cwd, "add", "--", "PROJECT_CONTROL.md");
      } else if (kind.startsWith("fixture-")) {
        const p = join(cwd, c.fixturePath),
          v = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
        v[kind === "fixture-digest" ? "diffSha256" : "tree"] = "a".repeat(
          kind === "fixture-digest" ? 64 : 40,
        );
        await writeFile(p, JSON.stringify(v));
      } else {
        const p =
          kind === "v55-module"
            ? "src/project-control-v55.ts"
            : kind === "types"
              ? "worker-configuration.d.ts"
              : kind === "worker-tests"
                ? "worker-tests/mp-06-v55-fresh-baseline.test.ts"
                : kind === "wrangler"
                  ? "wrangler.jsonc"
                  : "docs/project/OWNER_DECISION_LOG.md";
        const original = readFileSync(join(cwd, p), "utf8");
        await writeFile(
          join(cwd, p),
          kind === "v55-prefix"
            ? original.replace(
                "Owner v55 local scope amendment",
                "Rewritten v55 amendment",
              )
            : original + "\n// synthetic drift\n",
        );
      }
      expect(() =>
        inspectV56Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
  it("requires same-source qualification and fresh exact PR20 evidence for publication", () => {
    const pre = {
      kind: "V56_EXACT_SOURCE_QUALIFICATION",
      controlVersion: c.version,
      baseline: c.baseline,
      implementationSeals: c.implementationSeals,
      head: c.baseline,
      parent: c.baseline,
      tree: "a".repeat(40),
      qualifiedTree: "a".repeat(40),
      reviewedTree: "a".repeat(40),
      diffSha256: "b".repeat(64),
      reviewedDiffSha256: "b".repeat(64),
      baselineAncestor: true,
      sourceStable: true,
      indexStable: true,
      workingTreeMatchesIndex: true,
      audit: "ZERO_AT_EVERY_SEVERITY",
      auditTree: "a".repeat(40),
      review: "NO_ACTIONABLE_FINDINGS",
      stage: "PRE_COMMIT",
      validation: "FULL_PASS",
      claudeReview: {
        channel: "PR20_COMMENTS",
        verdict: "PASS",
        stage: "PRE_COMMIT",
        parent: c.baseline,
        tree: "a".repeat(40),
        diffSha256: "b".repeat(64),
        completePatch: true,
        fullGates: "PASS",
        audit: "ZERO_AT_EVERY_SEVERITY",
        responseComment:
          "https://github.com/Eak-dev/malispang-lineOA/pull/20#issuecomment-123",
      },
    };
    expect(evaluateV56Action("COMMIT", pre).allowed).toBe(true);
    const post = {
      ...pre,
      head: "c".repeat(40),
      stage: "POST_COMMIT",
      validation: "FULL_PASS",
      clean: true,
      claudeReview: {
        channel: "PR20_COMMENTS",
        verdict: "PASS",
        commit: "c".repeat(40),
        parent: c.baseline,
        tree: pre.tree,
        diffSha256: pre.diffSha256,
        completePatch: true,
        exactCommitReconstructed: true,
        fullGates: "PASS",
        audit: "ZERO_AT_EVERY_SEVERITY",
        responseComment:
          "https://github.com/Eak-dev/malispang-lineOA/pull/20#issuecomment-123",
      },
      pr: {
        repository: c.repository,
        number: 20,
        headBranch: c.headBranch,
        baseBranch: c.baseBranch,
        base: c.baseHead,
        head: c.publishedBaseline,
        fastForward: true,
        state: "open",
        draft: true,
        merged: false,
        observedAt: new Date().toISOString(),
      },
    };
    expect(evaluateV56Action("PUSH_BRANCH", post).allowed).toBe(true);
    expect(
      evaluateV56Action("PUSH_BRANCH", {
        ...post,
        pr: { ...post.pr, head: c.baselineParent },
      }).allowed,
    ).toBe(false);
    for (const key of Object.keys(pre))
      expect(
        evaluateV56Action("COMMIT", { ...pre, [key]: null }).allowed,
        key,
      ).toBe(false);
    for (const key of Object.keys(post.claudeReview))
      expect(
        evaluateV56Action("PUSH_BRANCH", {
          ...post,
          claudeReview: { ...post.claudeReview, [key]: null },
        }).allowed,
        key,
      ).toBe(false);
    expect(
      evaluateV56Action("PUSH_BRANCH", { ...post, claudeReview: undefined })
        .allowed,
    ).toBe(false);
    expect(
      evaluateV56Action("PUSH_BRANCH", {
        ...post,
        claudeReview: { ...post.claudeReview, commit: "d".repeat(40) },
      }).allowed,
    ).toBe(false);
    for (const key of Object.keys(post.pr))
      expect(
        evaluateV56Action("PUSH_BRANCH", {
          ...post,
          pr: { ...post.pr, [key]: null },
        }).allowed,
        key,
      ).toBe(false);
    expect(
      evaluateV56Action("PUSH_BRANCH", {
        ...post,
        pr: {
          ...post.pr,
          observedAt: new Date(Date.now() - 120001).toISOString(),
        },
      }).allowed,
    ).toBe(false);
    expect(
      evaluateV56Action("PUSH_BRANCH", {
        ...post,
        pr: {
          ...post.pr,
          observedAt: new Date(Date.now() + 60000).toISOString(),
        },
      }).allowed,
    ).toBe(false);
    expect(
      evaluateV56Action(
        "COMMIT",
        Object.defineProperty({}, "kind", {
          get() {
            throw Error("getter must not run");
          },
        }),
      ).allowed,
    ).toBe(false);
  });
  it("validates the exact staged and committed source without changing the operator", async () => {
    await fixture((cwd) => {
      git(cwd, "add", "--all");
      expect(
        inspectV56Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("LOCAL_PREPARATION");
      git(cwd, "commit", "--quiet", "-m", "Synthetic v56 source");
      expect(
        inspectV56Repository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "SOURCE_COMMIT",
        clean: true,
        publicationAuthorized: false,
      });
    });
  });
  it.each(["direct", "PR-entry"])(
    "verifies exact synthetic PR identity through %s without granting merge",
    async (entry) => {
      await fixture(async (cwd) => {
        git(cwd, "add", "--all");
        git(cwd, "commit", "--quiet", "-m", "Synthetic v56 PR source");
        const source = git(cwd, "rev-parse", "HEAD"),
          tree = git(cwd, "rev-parse", "HEAD^{tree}");
        const merge = execFileSync(
          projectControlGitExecutable(),
          [
            "-c",
            "user.name=Synthetic",
            "-c",
            "user.email=test@example.invalid",
            "commit-tree",
            tree,
            "-p",
            c.baseHead,
            "-p",
            source,
            "-m",
            "Synthetic v56 merge",
          ],
          { cwd, encoding: "utf8" },
        ).trim();
        git(cwd, "checkout", "--quiet", "--detach", merge);
        const event = {
          number: 20,
          repository: { full_name: c.repository },
          pull_request: {
            number: 20,
            state: "open",
            draft: true,
            merged: false,
            head: {
              ref: c.headBranch,
              sha: source,
              repo: { full_name: c.repository },
            },
            base: {
              ref: c.baseBranch,
              sha: c.baseHead,
              repo: { full_name: c.repository },
            },
          },
        };
        const directory = await mkdtemp(join(tmpdir(), "mp06-v56-event-"));
        try {
          const path = join(directory, "event.json");
          await writeFile(path, JSON.stringify(event));
          await withHistoricalEnvironment(async () => {
            process.env.GITHUB_EVENT_NAME = "pull_request";
            process.env.GITHUB_EVENT_PATH = path;
            process.env.GITHUB_REPOSITORY = c.repository;
            process.env.GITHUB_SHA = merge;
            process.env.GITHUB_REF = "refs/pull/20/merge";
            const url = pathToFileURL(cwd + "/");
            await expect(
              entry === "direct"
                ? runProjectControlValidation(url)
                : runPullRequestControlValidation(url, path),
            ).resolves.toBeUndefined();
          });
        } finally {
          await rm(directory, { recursive: true, force: true });
          expect(existsSync(directory)).toBe(false);
        }
      });
    },
  );
  it("projects exactly to reviewed uncommitted v55 and retains every old grant as history", () => {
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
    expect(
      validateWp8fOwnerDecisionRecord(
        readFileSync(join(root, "docs/project/OWNER_DECISION_LOG.md"), "utf8"),
        c.version,
      ),
    ).toBe(true);
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      mergeAuthorized: false,
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
    });
    projectV56ToV55(r, w, s);
    for (const [i, p] of [
      "config/project/roadmap.json",
      "config/project/current-work.json",
      "config/project/current-work.schema.json",
    ].entries())
      expect([r, w, s][i]).toEqual(
        JSON.parse(
          reconstructReviewedV55(root, projectControlGitExecutable())
            .files.get(p)!
            .toString(),
        ),
      );
  });
  it.each([
    "COMMIT",
    "PUSH_BRANCH",
    "MERGE",
    "DEPLOY_TEST",
    "QUERY_PRODUCTION",
    "CREATE_DRAFT_PR",
    "ACTIVATE_SUCCESSOR_V22",
    "CLOSE_ISSUE",
    "READ_TEST_STORAGE",
    "DATA_STUDIO_QUERY",
    "DEPLOY_UAT2",
    "CHANGE_LINE_WEBHOOK",
  ])("denies missing or historical receipt for %s", (action) => {
    expect(evaluateV56Action(action).allowed).toBe(false);
    expect(
      evaluateV56Action(action, { kind: "V47_LOCAL_QUALIFICATION" }).allowed,
    ).toBe(false);
  });
  it.each([
    "owner",
    "journal",
    "runtime",
    "workflow",
    "historical-control",
    "raw-index-flags",
    "staged-runtime",
    "node-workers",
    "node-timeout",
    "node-retry",
    "handoff",
  ])("rejects %s drift and preserves operator checkout", async (kind) => {
    await fixture(async (cwd) => {
      expect(
        inspectV56Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("LOCAL_PREPARATION");
      if (kind === "raw-index-flags")
        git(cwd, "update-index", "--assume-unchanged", "--", "README.md");
      else if (kind.startsWith("node-")) {
        const p = join(cwd, "vitest.config.ts");
        const original = readFileSync(p, "utf8");
        await writeFile(
          p,
          kind === "node-workers"
            ? original.replace("maxWorkers: 2", "maxWorkers: 3")
            : kind === "node-timeout"
              ? original.replace("testTimeout: 7000", "testTimeout: 10000")
              : original.replace(
                  "maxWorkers: 2,",
                  "maxWorkers: 2,\n" +
                    (kind === "node-timeout"
                      ? "testTimeout: 10000,"
                      : "retry: 1,"),
                ),
        );
      } else {
        const p =
          kind === "runtime" || kind === "staged-runtime"
            ? "src/faq.ts"
            : kind === "workflow"
              ? ".github/workflows/ci.yml"
              : kind === "historical-control"
                ? "PROJECT_CONTROL.md"
                : kind === "owner"
                  ? "docs/project/OWNER_DECISION_LOG.md"
                  : kind === "handoff"
                    ? "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md"
                    : "config/project/current-work.json";
        const original = readFileSync(join(cwd, p));
        if (kind === "journal") {
          const value = JSON.parse(original.toString()) as Record<
            string,
            unknown
          >;
          value.wp8fV22OperationJournal = [{ synthetic: "unauthorized-entry" }];
          await writeFile(join(cwd, p), JSON.stringify(value));
        } else await writeFile(join(cwd, p), "synthetic drift\n");
        if (kind === "staged-runtime") {
          git(cwd, "add", "--", p);
          await writeFile(join(cwd, p), original);
        }
      }
      expect(() =>
        inspectV56Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
  it("rejects absent or malformed PR identity", () => {
    expect(
      validateV56PullRequestReceipt(
        {},
        {
          sha: undefined,
          ref: undefined,
          merge: "a".repeat(40),
          parents: [],
          tree: "b".repeat(40),
          sourceTree: "b".repeat(40),
        },
      ),
    ).toBeNull();
  });
});
