import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import {
  UAT2_DEPLOY_V52 as c,
  V52_ALLOWED_PATHS,
  evaluateV52Action,
  inspectV52Repository,
  projectV52ToV51,
} from "../src/project-control-v52.js";
import {
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import { withHistoricalEnvironment } from "./helpers/historical-environment.js";

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
    cwd = await mkdtemp(join(tmpdir(), "mp06-v52-"));
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
    for (const p of V52_ALLOWED_PATHS) {
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
// wrangler.jsonc uses only full-line comments and trailing commas.
const parse = (source: string): unknown =>
  JSON.parse(
    source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n")
      .replace(/,(\s*[}\]])/gu, "$1"),
  );
type Wrangler = Record<string, unknown> & {
  vars: Record<string, string>;
  env: { uat2: Record<string, unknown> & { vars: Record<string, string> } };
};

describe("v52 single Owner Mac uat2 deploy", () => {
  it("only drops secrets.required from env.uat2 and keeps the held TEST Worker config unchanged", () => {
    const current = parse(
      readFileSync(join(root, "wrangler.jsonc"), "utf8"),
    ) as Wrangler;
    const previous = parse(
      git(root, "show", c.baseline + ":wrangler.jsonc"),
    ) as Wrangler;
    const { env, ...topLevel } = current;
    const { env: previousEnv, ...previousTop } = previous;
    expect(topLevel).toEqual(previousTop);
    expect(topLevel.name).toBe(c.heldWorker);
    const { secrets, ...previousUat2 } = previousEnv.uat2;
    expect(secrets).toEqual(current.secrets);
    expect(env).toEqual({ uat2: previousUat2 });
    expect(env.uat2.name).toBe(c.deployment.worker);
    expect("secrets" in env.uat2).toBe(false);
  });
  it("leaves runtime, policy, knowledge, catalog, dependencies and workflow byte-identical", () => {
    expect(
      git(
        root,
        "diff",
        "--name-only",
        c.baseline,
        "--",
        "worker",
        "config/mp-06",
        "config/approved-knowledge-base",
        "config/product-catalog",
        "src/mp-06-uat-round2-gate.ts",
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        ".github",
        "benchmark",
      ),
    ).toBe("");
  });
  it("projects exactly to published v51 and validates the closed Owner record", () => {
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
      controlVersion: c.version,
      pullRequestAuthorized: false,
      mergeAuthorized: false,
      deployAuthorized: "ONE_OWNER_MAC_DEPLOY_UAT2_ONLY",
      secretsAuthorized: false,
      lineWebhookAuthorized: false,
      pilotActivationAuthorized: false,
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
    });
    projectV52ToV51(r, w, s);
    for (const [i, p] of [
      "config/project/roadmap.json",
      "config/project/current-work.json",
      "config/project/current-work.schema.json",
    ].entries())
      expect([r, w, s][i]).toEqual(
        JSON.parse(git(root, "show", c.baseline + ":" + p)),
      );
  });
  it("rejects a tampered v52 manifest", () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json");
    w.uat2DeployV52 = { ...c, secrets: true };
    expect(validateProjectControl(r, w).errors).toContain(
      "V52_EXACT_DEPLOY_CONTROL_INVALID",
    );
  });
  it("requires exact-source qualification for commit and a fast-forward of the existing branch without PR", () => {
    const pre = {
      kind: "V52_EXACT_SOURCE_QUALIFICATION",
      controlVersion: c.version,
      baseline: c.baseline,
      implementationSeals: c.implementationSeals,
      head: c.baseline,
      parent: c.baseline,
      tree: "a".repeat(40),
      qualifiedTree: "a".repeat(40),
      diffSha256: "b".repeat(64),
      sourceStable: true,
      indexStable: true,
      workingTreeMatchesIndex: true,
      audit: "ZERO_AT_EVERY_SEVERITY",
      auditTree: "a".repeat(40),
      stage: "PRE_COMMIT",
      validation: "FOCUSED_PASS",
    };
    expect(evaluateV52Action("COMMIT", pre).allowed).toBe(true);
    for (const key of Object.keys(pre))
      expect(
        evaluateV52Action("COMMIT", { ...pre, [key]: null }).allowed,
        key,
      ).toBe(false);
    const post = {
      ...pre,
      head: "c".repeat(40),
      stage: "POST_COMMIT",
      validation: "FULL_PASS",
      clean: true,
      repository: c.repository,
      remoteBranch: c.headBranch,
      remoteHead: c.baseline,
      fastForward: true,
      pullRequest: null,
    };
    expect(evaluateV52Action("PUSH_BRANCH", post).allowed).toBe(true);
    for (const [key, value] of [
      ["remoteBranch", "codex/mp06-harness-v43"],
      ["remoteBranch", "codex/mp-06-guardrailed-ai"],
      ["remoteHead", c.baselineParent],
      ["fastForward", false],
      ["pullRequest", 20],
      ["clean", false],
      ["validation", "FOCUSED_PASS"],
    ] as const)
      expect(
        evaluateV52Action("PUSH_BRANCH", { ...post, [key]: value }).allowed,
        key,
      ).toBe(false);
    expect(
      evaluateV52Action(
        "COMMIT",
        Object.defineProperty({}, "kind", {
          get() {
            throw Error("getter must not run");
          },
        }),
      ).allowed,
    ).toBe(false);
  });
  it("allows exactly one Owner Mac uat2 deploy with the exact pre-check receipt", () => {
    const d = c.deployment;
    const receipt = {
      kind: "V52_OWNER_MAC_DEPLOY_PRECHECK",
      executor: "OWNER",
      sourceCommit: "f".repeat(40),
      sourceParent: c.baseline,
      branch: c.headBranch,
      clean: true,
      frozenInstall: true,
      controlVersion: c.version,
      account: d.account,
      worker: d.worker,
      wranglerEnv: d.wranglerEnv,
      command: d.command,
      workerAbsent: true,
      dryRun: "PASS",
      deploymentsUsed: 0,
      secretsFile: false,
    };
    expect(evaluateV52Action("DEPLOY_UAT2", receipt).allowed).toBe(true);
    for (const key of Object.keys(receipt))
      expect(
        evaluateV52Action("DEPLOY_UAT2", { ...receipt, [key]: null }).allowed,
        key,
      ).toBe(false);
    for (const [key, value] of [
      ["worker", c.heldWorker],
      ["wranglerEnv", ""],
      ["command", "pnpm exec wrangler deploy --minify"],
      ["command", "pnpm deploy:test"],
      ["deploymentsUsed", 1],
      ["workerAbsent", false],
      ["secretsFile", true],
      ["executor", "CLAUDE"],
      ["sourceParent", c.baselineParent],
    ] as const)
      expect(
        evaluateV52Action("DEPLOY_UAT2", { ...receipt, [key]: value }).allowed,
        key,
      ).toBe(false);
    expect(d.maximumDeployments).toBe(1);
    expect(d.command).toContain("--env uat2");
  });
  it.each([
    "DEPLOY_TEST",
    "SET_SECRET",
    "SET_SECRET_UAT2",
    "CHANGE_LINE_WEBHOOK",
    "ACTIVATE_PILOT",
    "OWNER_UAT_NEXT_CASE",
    "READ_HELD_STORAGE",
    "CREATE_DRAFT_PR",
    "MERGE",
    "QUERY_PRODUCTION",
    "CLOSE_ISSUE",
  ])("denies %s even with a historical or v51 receipt", (action) => {
    expect(evaluateV52Action(action).allowed).toBe(false);
    expect(
      evaluateV52Action(action, { kind: "V51_EXACT_SOURCE_QUALIFICATION" })
        .allowed,
    ).toBe(false);
  });
  it("validates the exact staged and committed source without changing the operator", async () => {
    await fixture((cwd) => {
      git(cwd, "add", "--all");
      expect(
        inspectV52Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("LOCAL_PREPARATION");
      git(cwd, "commit", "--quiet", "-m", "Synthetic v52 source");
      expect(
        inspectV52Repository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        mode: "SOURCE_COMMIT",
        clean: true,
        publicationAuthorized: false,
        deployAuthorized: false,
      });
    });
  });
  it.each(["direct", "PR-entry"])(
    "refuses a pull_request event through %s",
    async (entry) => {
      await fixture(async (cwd) => {
        const directory = await mkdtemp(join(tmpdir(), "mp06-v52-event-"));
        try {
          const path = join(directory, "event.json");
          await writeFile(path, "{}");
          await withHistoricalEnvironment(async () => {
            process.env.GITHUB_EVENT_NAME = "pull_request";
            process.env.GITHUB_EVENT_PATH = path;
            const url = pathToFileURL(cwd + "/");
            // The PR entry may refuse at its own event precondition first;
            // either way a v52 tree never validates under a PR event.
            if (entry === "direct")
              await expect(runProjectControlValidation(url)).rejects.toThrow(
                "V52_NO_PULL_REQUEST_AUTHORIZED",
              );
            else
              await expect(
                runPullRequestControlValidation(url, path),
              ).rejects.toThrow();
          });
        } finally {
          await rm(directory, { recursive: true, force: true });
          expect(existsSync(directory)).toBe(false);
        }
      });
    },
  );
  it.each([
    "owner",
    "journal",
    "runtime",
    "staged-runtime",
    "workflow",
    "historical-control",
    "raw-index-flags",
    "wrangler",
    "gate",
    "runbook",
    "historical-v51-test",
  ])("rejects %s drift and preserves operator checkout", async (kind) => {
    await fixture(async (cwd) => {
      expect(
        inspectV52Repository(cwd, projectControlGitExecutable()).mode,
      ).toBe("LOCAL_PREPARATION");
      if (kind === "raw-index-flags")
        git(cwd, "update-index", "--assume-unchanged", "--", "README.md");
      else {
        const p = {
          owner: "docs/project/OWNER_DECISION_LOG.md",
          journal: "config/project/current-work.json",
          runtime: "worker/index.ts",
          "staged-runtime": "worker/index.ts",
          workflow: ".github/workflows/ci.yml",
          "historical-control": "PROJECT_CONTROL.md",
          wrangler: "wrangler.jsonc",
          gate: "src/mp-06-uat-round2-gate.ts",
          runbook: "docs/line-oa/mp-06/MP_06_UAT_ROUND2_RUNBOOK_TH.md",
          "historical-v51-test": "tests/project-control-v51.test.ts",
        }[kind]!;
        const original = readFileSync(join(cwd, p));
        if (kind === "journal") {
          const value = JSON.parse(original.toString()) as Record<
            string,
            unknown
          >;
          value.wp8fV22OperationJournal = [{ synthetic: "unauthorized-entry" }];
          await writeFile(join(cwd, p), JSON.stringify(value));
        } else
          await writeFile(
            join(cwd, p),
            kind === "wrangler"
              ? original.toString().replace('"preview_urls": false', "")
              : "synthetic drift\n",
          );
        if (kind === "staged-runtime") {
          git(cwd, "add", "--", p);
          await writeFile(join(cwd, p), original);
        }
      }
      expect(() =>
        inspectV52Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    });
  });
});
