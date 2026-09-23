// @ts-check
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
/** @type {(text: string) => unknown} */
const parseJson = JSON.parse;
/** @param {string} name */
const script = (name) => resolve(root, "scripts/dev-operations", name);
/** @param {string | Buffer} bytes */
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** @param {string} repo @param {...string} args */
const git = (repo, ...args) =>
  execFileSync("/usr/bin/git", ["-C", repo, ...args], {
    encoding: "utf8",
  }).trim();
/** @param {string} name @param {string[]} args */
const run = (name, args) =>
  spawnSync(process.execPath, [script(name), ...args], { encoding: "utf8" });

function fixture() {
  const area = mkdtempSync(resolve(tmpdir(), "mp-devops-test-"));
  const repo = resolve(area, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Synthetic Test");
  writeFileSync(resolve(repo, "tracked.txt"), "baseline\n");
  git(repo, "add", "tracked.txt");
  git(repo, "commit", "-qm", "synthetic baseline");
  return {
    area,
    repo,
    head: git(repo, "rev-parse", "HEAD"),
    branch: git(repo, "branch", "--show-current"),
  };
}

void test("preflight blocks mismatched HEAD before reading control", () => {
  const { repo, branch } = fixture();
  const result = run("preflight.mjs", [
    "--repo",
    repo,
    "--expected-branch",
    branch,
    "--expected-head",
    "0".repeat(40),
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /branch or HEAD mismatch/);
});

void test("checkpoint preserves staged, unstaged and untracked evidence without changing repo", () => {
  const { area, repo, head, branch } = fixture();
  writeFileSync(resolve(repo, "tracked.txt"), "staged\n");
  git(repo, "add", "tracked.txt");
  writeFileSync(resolve(repo, "tracked.txt"), "unstaged\n");
  mkdirSync(resolve(repo, "notes"));
  writeFileSync(resolve(repo, "notes/new.txt"), "synthetic\n");
  const before = git(repo, "status", "--porcelain=v1", "-uall");
  const out = resolve(area, "checkpoint");
  const args = [
    "--repo",
    repo,
    "--out",
    out,
    "--expected-branch",
    branch,
    "--expected-head",
    head,
    "--allow",
    "tracked.txt",
    "--allow",
    "notes/new.txt",
  ];
  const result = run("checkpoint.mjs", args);
  assert.equal(result.status, 0, result.stderr);
  const manifest =
    /** @type {{changedPaths: string[], untracked: {sha256: string}[]}} */ (
      parseJson(readFileSync(resolve(out, "manifest.json"), "utf8"))
    );
  assert.deepEqual(manifest.changedPaths, ["notes/new.txt", "tracked.txt"]);
  assert.equal(manifest.untracked[0]?.sha256, sha("synthetic\n"));
  assert.equal(
    readFileSync(resolve(out, "untracked/notes/new.txt"), "utf8"),
    "synthetic\n",
  );
  assert.match(readFileSync(resolve(out, "staged.patch"), "utf8"), /staged/);
  assert.match(
    readFileSync(resolve(out, "unstaged.patch"), "utf8"),
    /unstaged/,
  );
  assert.equal(git(repo, "status", "--porcelain=v1", "-uall"), before);
  assert.equal(
    run("checkpoint.mjs", args).status,
    1,
    "must not overwrite checkpoint",
  );
});

void test("checkpoint rejects non-exact allowlist and sensitive path", () => {
  const { area, repo, head, branch } = fixture();
  writeFileSync(resolve(repo, ".env"), "SYNTHETIC=1\n");
  for (const allow of ["tracked.txt", ".env"]) {
    const result = run("checkpoint.mjs", [
      "--repo",
      repo,
      "--out",
      resolve(area, `checkpoint-${allow.replace(".", "dot")}`),
      "--expected-branch",
      branch,
      "--expected-head",
      head,
      "--allow",
      allow,
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /allowlist/);
  }
});

void test("receipt records exact Git identity and unknown usage without overwrite", () => {
  const { area, repo, head, branch } = fixture();
  const out = resolve(area, "receipt.json");
  const args = [
    "--repo",
    repo,
    "--out",
    out,
    "--command-label",
    "SYNTHETIC_TEST",
    "--exit-code",
    "0",
    "--tests-passed",
    "3",
    "--tests-failed",
    "0",
    "--model",
    "gpt-6-sol",
    "--effort",
    "high",
  ];
  const result = run("receipt.mjs", args);
  assert.equal(result.status, 0, result.stderr);
  const receipt =
    /** @type {{head: string, branch: string, usage: string, billing: string, testsPassed: number}} */ (
      parseJson(readFileSync(out, "utf8"))
    );
  assert.equal(receipt.head, head);
  assert.equal(receipt.branch, branch);
  assert.equal(receipt.usage, "UNKNOWN");
  assert.equal(receipt.billing, "UNKNOWN");
  assert.equal(receipt.testsPassed, 3);
  assert.equal(run("receipt.mjs", args).status, 1);
});
