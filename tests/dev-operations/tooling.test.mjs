// @ts-check
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
  const sourceReceipt = resolve(area, "source.json");
  const before = run("receipt.mjs", [
    "--phase",
    "before",
    "--repo",
    repo,
    "--out",
    sourceReceipt,
    "--command-label",
    "SYNTHETIC_TEST",
    "--expected-branch",
    branch,
    "--expected-head",
    head,
  ]);
  assert.equal(before.status, 0, before.stderr);
  const out = resolve(area, "receipt.json");
  const args = [
    "--phase",
    "after",
    "--source-receipt",
    sourceReceipt,
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

for (const mutation of [
  "branch",
  "head",
  "staged",
  "unstaged",
  "untracked",
  "repository",
  "label",
]) {
  void test(`receipt rejects pre-validation ${mutation} drift`, () => {
    const { area, repo, head, branch } = fixture();
    const source = resolve(area, "source.json"),
      out = resolve(area, "after.json");
    const result = run("receipt.mjs", [
      "--phase",
      "before",
      "--repo",
      repo,
      "--out",
      source,
      "--command-label",
      "SYNTHETIC_TEST",
      "--expected-branch",
      branch,
      "--expected-head",
      head,
    ]);
    assert.equal(result.status, 0, result.stderr);
    if (mutation === "branch") git(repo, "switch", "-qc", "different");
    if (mutation === "head")
      git(repo, "commit", "--allow-empty", "-qm", "new source");
    if (mutation === "staged" || mutation === "unstaged")
      writeFileSync(resolve(repo, "tracked.txt"), "changed\n");
    if (mutation === "staged") git(repo, "add", "tracked.txt");
    if (mutation === "untracked")
      writeFileSync(resolve(repo, "new.txt"), "new\n");
    const after = run("receipt.mjs", [
      "--phase",
      "after",
      "--repo",
      mutation === "repository" ? fixture().repo : repo,
      "--out",
      out,
      "--source-receipt",
      source,
      "--command-label",
      mutation === "label" ? "OTHER_TEST" : "SYNTHETIC_TEST",
      "--exit-code",
      "0",
      "--tests-passed",
      "1",
      "--tests-failed",
      "0",
      "--model",
      "gpt-6-astra",
      "--effort",
      "high",
    ]);
    assert.equal(after.status, 1);
    assert.match(after.stderr, /pre-validation source identity mismatch/);
    assert.equal(existsSync(out), false);
  });
}

void test("receipt denies missing pre-validation contract and wrong expected HEAD", () => {
  const { area, repo, branch } = fixture();
  assert.equal(
    run("receipt.mjs", ["--repo", repo, "--out", resolve(area, "missing.json")])
      .status,
    1,
  );
  const result = run("receipt.mjs", [
    "--phase",
    "before",
    "--repo",
    repo,
    "--out",
    resolve(area, "wrong.json"),
    "--command-label",
    "SYNTHETIC_TEST",
    "--expected-branch",
    branch,
    "--expected-head",
    "0".repeat(40),
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /branch or HEAD mismatch/);
});

void test("source identity hashes a large unchanged tracked dataset without relaxing checkpoint payload caps", () => {
  const { area, repo, branch } = fixture();
  writeFileSync(
    resolve(repo, "dataset.txt"),
    Buffer.alloc(6 * 1024 * 1024, 65),
  );
  git(repo, "add", "dataset.txt");
  git(repo, "commit", "-qm", "synthetic large dataset");
  const head = git(repo, "rev-parse", "HEAD");
  writeFileSync(resolve(repo, "tracked.txt"), "dirty\n");
  const result = run("checkpoint.mjs", [
    "--repo",
    repo,
    "--out",
    resolve(area, "checkpoint"),
    "--expected-branch",
    branch,
    "--expected-head",
    head,
    "--allow",
    "tracked.txt",
  ]);
  assert.equal(result.status, 0, result.stderr);
  writeFileSync(resolve(repo, "large.txt"), Buffer.alloc(6 * 1024 * 1024, 66));
  const rejected = run("checkpoint.mjs", [
    "--repo",
    repo,
    "--out",
    resolve(area, "too-large"),
    "--expected-branch",
    branch,
    "--expected-head",
    head,
    "--allow",
    "tracked.txt",
    "--allow",
    "large.txt",
  ]);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /size cap/);
});

// Deterministic concurrent-writer schedule: alter synthetic source immediately
// after a real Git observation, without adding a production hook or retry.
for (const mutation of ["head", "index", "tracked", "untracked"]) {
  void test(`checkpoint rejects ${mutation} mutation during capture`, () => {
    const { area, repo, head, branch } = fixture();
    writeFileSync(resolve(repo, "tracked.txt"), "dirty\n");
    writeFileSync(resolve(repo, "new.txt"), "original\n");
    const preload = resolve(area, "writer.cjs");
    writeFileSync(
      preload,
      `const cp = require('node:child_process'); const fs = require('node:fs'); const original = cp.execFileSync; let fired = false;
cp.execFileSync = function(bin, args, options) { const result = original(bin, args, options); if (!fired && args.includes('diff') && args.includes('--binary')) { fired = true;
${mutation === "head" ? `original('/usr/bin/git', ['-C', ${JSON.stringify(repo)}, 'commit', '--allow-empty', '-qm', 'concurrent']);` : mutation === "index" ? `original('/usr/bin/git', ['-C', ${JSON.stringify(repo)}, 'add', 'tracked.txt']);` : `fs.writeFileSync(${JSON.stringify(resolve(repo, mutation === "tracked" ? "tracked.txt" : "new.txt"))}, 'concurrent\\n');`}
} return result; }; require('node:module').syncBuiltinESMExports();`,
    );
    const out = resolve(area, "checkpoint");
    const result = spawnSync(
      process.execPath,
      [
        "--require",
        preload,
        script("checkpoint.mjs"),
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
        "new.txt",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1, result.stdout);
    assert.match(
      result.stderr,
      /changed during capture|differs from source snapshot/,
    );
    assert.equal(existsSync(resolve(out, "manifest.json")), false);
    assert.doesNotMatch(result.stdout, /PASS/);
  });
}
