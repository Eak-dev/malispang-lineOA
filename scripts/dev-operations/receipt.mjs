// @ts-check
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, sep } from "node:path";

/** @param {string | Buffer} value */
const hash = (value) => createHash("sha256").update(value).digest("hex");
const keys = [
  "--repo",
  "--out",
  "--command-label",
  "--exit-code",
  "--tests-passed",
  "--tests-failed",
  "--model",
  "--effort",
];

try {
  /** @type {Map<string, string>} */
  const values = new Map();
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !value || !keys.includes(key) || values.has(key))
      throw new Error("unknown, missing or duplicate argument");
    values.set(key, value);
  }
  if (values.size !== keys.length)
    throw new Error("all receipt fields required");
  /** @param {string} key */
  const required = (key) => {
    const value = values.get(key);
    if (value === undefined) throw new Error(`missing ${key}`);
    return value;
  };
  const repo = realpathSync(resolve(required("--repo")));
  const out = resolve(required("--out"));
  const parent = realpathSync(dirname(out));
  if (
    out === repo ||
    out.startsWith(repo + sep) ||
    parent === repo ||
    parent.startsWith(repo + sep) ||
    existsSync(out)
  )
    throw new Error("new receipt target outside repo required");
  if (
    !/^[A-Z0-9_:-]{3,80}$/u.test(required("--command-label")) ||
    !/^gpt-[a-z0-9-]+$/u.test(required("--model")) ||
    !["low", "medium", "high", "xhigh"].includes(required("--effort"))
  )
    throw new Error("invalid label, model or effort");
  /** @param {string} key */
  const number = (key) => {
    const text = required(key);
    if (!/^(0|[1-9][0-9]*)$/u.test(text)) throw new Error(`invalid ${key}`);
    return Number(text);
  };
  const exitCode = number("--exit-code"),
    testsPassed = number("--tests-passed"),
    testsFailed = number("--tests-failed");
  if (![exitCode, testsPassed, testsFailed].every(Number.isSafeInteger))
    throw new Error("count exceeds safe integer");
  /** @param {...string} items */
  const git = (...items) =>
    execFileSync(
      "/usr/bin/git",
      ["-C", repo, "--no-optional-locks", ...items],
      { maxBuffer: 6 * 1024 * 1024 },
    );
  if (
    realpathSync(git("rev-parse", "--show-toplevel").toString().trim()) !== repo
  )
    throw new Error("repo must be a Git worktree root");
  const branch = git("branch", "--show-current").toString().trim();
  const head = git("rev-parse", "HEAD").toString().trim();
  const stagedSha256 = hash(
    git("diff", "--cached", "--binary", "--no-ext-diff"),
  );
  const unstagedSha256 = hash(git("diff", "--binary", "--no-ext-diff"));
  const untracked = git("ls-files", "--others", "--exclude-standard", "-z")
    .toString()
    .split("\0")
    .filter(Boolean)
    .sort();
  const untrackedDigest = createHash("sha256");
  for (const path of untracked) {
    if (
      !/^[A-Za-z0-9._/-]+$/u.test(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..") ||
      !lstatSync(resolve(repo, path)).isFile()
    )
      throw new Error("unsafe untracked path");
    const bytes = readFileSync(resolve(repo, path));
    if (bytes.length > 5 * 1024 * 1024)
      throw new Error("untracked file exceeds size cap");
    untrackedDigest.update(path).update("\0").update(hash(bytes)).update("\0");
  }
  const receipt = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    branch,
    head,
    stagedSha256,
    unstagedSha256,
    untrackedCount: untracked.length,
    untrackedDigestSha256: untrackedDigest.digest("hex"),
    commandLabel: required("--command-label"),
    exitCode,
    testsPassed,
    testsFailed,
    model: required("--model"),
    effort: required("--effort"),
    usage: "UNKNOWN",
    billing: "UNKNOWN",
  };
  writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      status: "PASS",
      receipt: out,
      head,
      testsPassed,
      testsFailed,
      exitCode,
    }),
  );
} catch (error) {
  console.error(
    `RECEIPT_BLOCKED: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
}
