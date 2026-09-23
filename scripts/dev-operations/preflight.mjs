// @ts-check
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const VERSION = "2026.09.23-v33";
const OWNER = "MP-OD-2026-09-23-V33";
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

try {
  const args = argsOf(process.argv.slice(2));
  const repo = realpathSync(resolve(args.get("--repo") ?? ""));
  /** @param {...string} items */
  const git = (...items) =>
    execFileSync(
      "/usr/bin/git",
      ["-C", repo, "--no-optional-locks", ...items],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
  if (realpathSync(git("rev-parse", "--show-toplevel").trim()) !== repo)
    throw new Error("repo must be a Git worktree root");
  const branch = git("branch", "--show-current").trim();
  const head = git("rev-parse", "HEAD").trim();
  if (!/^[a-f0-9]{40}$/u.test(args.get("--expected-head") ?? ""))
    throw new Error("expected HEAD must be a full SHA");
  if (
    branch !== args.get("--expected-branch") ||
    head !== args.get("--expected-head")
  )
    throw new Error("branch or HEAD mismatch");
  const roadmap =
    /** @type {{version?: string, ownerDecision?: {decisionId?: string}}} */ (
      parseJson(
        readFileSync(resolve(repo, "config/project/roadmap.json"), "utf8"),
      )
    );
  const work =
    /** @type {{roadmapVersion?: string, devOperationsRemediationV35?: {ownerDecision?: string, pullRequest?: number, creationGrant?: string}, devOperationsReviewV34?: {ownerDecision?: string}, devOperationsV33?: {ownerDecision?: string, targetEnvironment?: string}}} */ (
      parseJson(
        readFileSync(resolve(repo, "config/project/current-work.json"), "utf8"),
      )
    );
  const remediation = roadmap.version === "2026.09.23-v35";
  const reviewVersion = roadmap.version === "2026.09.23-v34" || remediation;
  const expectedVersion = remediation
    ? "2026.09.23-v35"
    : reviewVersion
      ? "2026.09.23-v34"
      : VERSION;
  const expectedOwner = remediation
    ? "MP-OD-2026-09-23-V35"
    : reviewVersion
      ? "MP-OD-2026-09-23-V34"
      : OWNER;
  if (
    roadmap.version !== expectedVersion ||
    work.roadmapVersion !== expectedVersion ||
    roadmap.ownerDecision?.decisionId !== expectedOwner ||
    (reviewVersion &&
      work.devOperationsReviewV34?.ownerDecision !== "MP-OD-2026-09-23-V34") ||
    (remediation &&
      (work.devOperationsRemediationV35?.ownerDecision !== expectedOwner ||
        work.devOperationsRemediationV35.pullRequest !== 18 ||
        work.devOperationsRemediationV35.creationGrant !== "CONSUMED")) ||
    work.devOperationsV33?.ownerDecision !== OWNER ||
    work.devOperationsV33?.targetEnvironment !== "LOCAL_ONLY"
  )
    throw new Error("closed Dev Operations control mismatch");
  if (process.version !== "v24.19.0") throw new Error("Node 24.19.0 required");
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
