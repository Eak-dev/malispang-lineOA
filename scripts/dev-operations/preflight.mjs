// @ts-check
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { devOperationsGitExecutable, readGitIdentity } from "./checkpoint.mjs";

const VERSION = "2026.09.23-v33";
const OWNER = "MP-OD-2026-09-23-V33";
// Owner explicitly approved the v36 local efficiency transition. Inherited
// review/remediation records keep their original Owner decisions.
const OPTIMIZATION = {
  version: "2026.09.24-v36",
  ownerDecision: "MP-OD-2026-09-24-V36",
  supersedes: "2026.09.23-v35",
  baseline: "90aa98305105377d006c67f40259297273db3849",
  authority: "LOCAL_DEV_OPERATIONS_EFFICIENCY_ONLY",
  inheritedState: "V35_V34_V33_V32_GRANTS_JOURNALS_HOLDS_UNCHANGED",
  forbidden:
    "NO_COMMIT_PUSH_NEW_PR_READY_MERGE_DEPLOY_RUNTIME_TEST_PRODUCTION_ISSUE_CLOSE",
};
const INTEGRATION = {
  version: "2026.09.24-v37",
  ownerDecision: "MP-OD-2026-09-24-V37",
  supersedes: "2026.09.24-v36",
  repository: "Eak-dev/malispang-lineOA",
  pullRequest: 18,
  downstreamDraftPullRequest: 16,
  headBranch: "codex/dev-operations-v33",
  baseBranch: "codex/mp-06-guardrailed-ai",
  baseHead: "1508782a9cbf9412b3a6967264e9f4e8d6c19376",
  sourceBaseline: "90aa98305105377d006c67f40259297273db3849",
  creationGrant: "CONSUMED",
  authority: "EXISTING_PR18_REVIEW_READY_AND_ONE_MERGE_COMMIT_TO_MP06_ONLY",
  inheritedState: "V36_V35_V34_V33_V32_GRANTS_JOURNALS_HOLDS_UNCHANGED",
  futureWork: "EXPLICIT_MP06_WORK_PACKAGE_TRANSITION_REQUIRED",
  forbidden:
    "NO_NEW_PR_DEFAULT_MERGE_DEPLOY_RUNTIME_TEST_PRODUCTION_ISSUE_CLOSE",
};
/** @type {(text: string) => unknown} */
const parseJson = JSON.parse;

/** @param {string} message */
function fail(message) {
  console.error(`PREFLIGHT_BLOCKED: ${message}`);
  process.exitCode = 1;
}

/** @param {string[]} argv */
function argsOf(argv) {
  /** @type {Map<string, string>} */
  const values = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (
      !key ||
      !value ||
      !["--repo", "--expected-branch", "--expected-head"].includes(key) ||
      values.has(key)
    )
      throw new Error(
        "expected exactly --repo, --expected-branch and --expected-head",
      );
    values.set(key, value);
  }
  if (values.size !== 3)
    throw new Error(
      "expected exactly --repo, --expected-branch and --expected-head",
    );
  return values;
}

/** Inspect the closed local control header before executing repository tools.
 * The full validator remains responsible for the complete inherited record.
 * @param {string} repo */
export function readDevOperationsControl(repo) {
  const roadmap =
    /** @type {{version?: string, ownerDecision?: {decisionId?: string}}} */ (
      parseJson(
        readFileSync(resolve(repo, "config/project/roadmap.json"), "utf8"),
      )
    );
  const work =
    /** @type {{roadmapVersion?: string, devOperationsIntegrationV37?: unknown, devOperationsOptimizationV36?: unknown, devOperationsRemediationV35?: {ownerDecision?: string, pullRequest?: number, creationGrant?: string}, devOperationsReviewV34?: {ownerDecision?: string}, devOperationsV33?: {ownerDecision?: string, targetEnvironment?: string}}} */ (
      parseJson(
        readFileSync(resolve(repo, "config/project/current-work.json"), "utf8"),
      )
    );
  const integration = roadmap.version === INTEGRATION.version;
  const optimization = roadmap.version === OPTIMIZATION.version || integration;
  const remediation = roadmap.version === "2026.09.23-v35" || optimization;
  const reviewVersion = roadmap.version === "2026.09.23-v34" || remediation;
  const expectedVersion = integration
    ? INTEGRATION.version
    : optimization
      ? OPTIMIZATION.version
      : remediation
        ? "2026.09.23-v35"
        : reviewVersion
          ? "2026.09.23-v34"
          : VERSION;
  const expectedOwner = integration
    ? INTEGRATION.ownerDecision
    : optimization
      ? OPTIMIZATION.ownerDecision
      : remediation
        ? "MP-OD-2026-09-23-V35"
        : reviewVersion
          ? "MP-OD-2026-09-23-V34"
          : OWNER;
  if (
    roadmap.version !== expectedVersion ||
    work.roadmapVersion !== expectedVersion ||
    roadmap.ownerDecision?.decisionId !== expectedOwner ||
    (integration &&
      !isDeepStrictEqual(work.devOperationsIntegrationV37, INTEGRATION)) ||
    (optimization &&
      !isDeepStrictEqual(work.devOperationsOptimizationV36, OPTIMIZATION)) ||
    (reviewVersion &&
      work.devOperationsReviewV34?.ownerDecision !== "MP-OD-2026-09-23-V34") ||
    (remediation &&
      (work.devOperationsRemediationV35?.ownerDecision !==
        "MP-OD-2026-09-23-V35" ||
        work.devOperationsRemediationV35.pullRequest !== 18 ||
        work.devOperationsRemediationV35.creationGrant !== "CONSUMED")) ||
    work.devOperationsV33?.ownerDecision !== OWNER ||
    work.devOperationsV33?.targetEnvironment !== "LOCAL_ONLY"
  )
    throw new Error("closed Dev Operations control mismatch");
  return expectedVersion;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const args = argsOf(process.argv.slice(2));
    const repo = realpathSync(resolve(args.get("--repo") ?? ""));
    const binary = devOperationsGitExecutable();
    /** @param {...string} items */
    const git = (...items) =>
      execFileSync(
        binary,
        ["--no-replace-objects", "-C", repo, "--no-optional-locks", ...items],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
    if (realpathSync(git("rev-parse", "--show-toplevel").trim()) !== repo)
      throw new Error("repo must be a Git worktree root");
    const { branch, head } = readGitIdentity(repo, binary);
    if (!/^[a-f0-9]{40}$/u.test(args.get("--expected-head") ?? ""))
      throw new Error("expected HEAD must be a full SHA");
    if (
      branch !== args.get("--expected-branch") ||
      head !== args.get("--expected-head")
    )
      throw new Error("branch or HEAD mismatch");
    const expectedVersion = readDevOperationsControl(repo);
    if (process.version !== "v24.19.0")
      throw new Error("Node 24.19.0 required");
    const status = git(
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ).trimEnd();
    const records = status ? status.split("\n") : [];
    const staged = records.filter(
      (line) => line[0] !== " " && line[0] !== "?",
    ).length;
    const unstaged = records.filter(
      (line) => line[1] !== " " && line[1] !== "?",
    ).length;
    const untracked = records.filter((line) => line.startsWith("??")).length;
    console.log(
      JSON.stringify({
        status: "PASS",
        branch,
        head,
        controlVersion: expectedVersion,
        node: process.version,
        staged,
        unstaged,
        untracked,
      }),
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : "unknown error");
  }
}
