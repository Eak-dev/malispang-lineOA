// @ts-check
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  captureSource,
  devOperationsGitExecutable,
} from "../../scripts/dev-operations/checkpoint.mjs";

const root = resolve(import.meta.dirname, "../..");
const binary = devOperationsGitExecutable();
const baseline = "90aa98305105377d006c67f40259297273db3849";
const success =
  "Project control validation passed: 2026.09.24-v36, MP-06 (#12); local efficiency only; warnings recorded: synthetic warning";
/** @param {string} repo @param {...string} args */
const git = (repo, ...args) =>
  execFileSync(binary, ["-C", repo, ...args], { encoding: "utf8" }).trim();
/** @param {string} name @param {string[]} args */
const run = (name, args) =>
  spawnSync(
    process.execPath,
    [resolve(root, "scripts/dev-operations", name), ...args],
    { encoding: "utf8" },
  );
/** @type {(text: string) => unknown} */
const parseJson = JSON.parse;
/** @param {string | Buffer} bytes */
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** @param {string} repo */
function writeV36Control(repo) {
  const overlay = {
    version: "2026.09.24-v36",
    ownerDecision: "MP-OD-2026-09-24-V36",
    supersedes: "2026.09.23-v35",
    baseline,
    authority: "LOCAL_DEV_OPERATIONS_EFFICIENCY_ONLY",
    inheritedState: "V35_V34_V33_V32_GRANTS_JOURNALS_HOLDS_UNCHANGED",
    forbidden:
      "NO_COMMIT_PUSH_NEW_PR_READY_MERGE_DEPLOY_RUNTIME_TEST_PRODUCTION_ISSUE_CLOSE",
  };
  const work = {
    roadmapVersion: overlay.version,
    devOperationsOptimizationV36: overlay,
    devOperationsRemediationV35: {
      ownerDecision: "MP-OD-2026-09-23-V35",
      pullRequest: 18,
      creationGrant: "CONSUMED",
    },
    devOperationsReviewV34: { ownerDecision: "MP-OD-2026-09-23-V34" },
    devOperationsV33: {
      ownerDecision: "MP-OD-2026-09-23-V33",
      targetEnvironment: "LOCAL_ONLY",
    },
  };
  mkdirSync(resolve(repo, "config/project"), { recursive: true });
  writeFileSync(
    resolve(repo, "config/project/roadmap.json"),
    JSON.stringify({
      version: overlay.version,
      ownerDecision: { decisionId: overlay.ownerDecision },
    }),
  );
  writeFileSync(
    resolve(repo, "config/project/current-work.json"),
    JSON.stringify(work),
  );
  return work;
}

/** @param {string | undefined} validator */
function fixture(validator = undefined) {
  const area = realpathSync(mkdtempSync(resolve(tmpdir(), "mp-devops-opt-")));
  const repo = resolve(area, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Synthetic Test");
  writeFileSync(resolve(repo, "tracked.txt"), "baseline\n");
  for (const path of ["deleted.txt", "tab\tname.txt", "newline\nname.txt"])
    writeFileSync(resolve(repo, path), "content\n");
  if (validator !== undefined) {
    writeV36Control(repo);
    mkdirSync(resolve(repo, "scripts"));
    writeFileSync(
      resolve(repo, "scripts/validate-project-control.mjs"),
      validator,
    );
    writeFileSync(resolve(repo, ".gitignore"), "node_modules\n");
    symlinkSync(
      resolve(root, "node_modules"),
      resolve(repo, "node_modules"),
      "dir",
    );
  }
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "synthetic baseline");
  return {
    area,
    repo,
    head: git(repo, "rev-parse", "HEAD"),
    branch: git(repo, "branch", "--show-current"),
  };
}

/** @param {ReturnType<typeof fixture>} f @param {string} out */
const runArgs = (f, out) => [
  "--phase",
  "run",
  "--repo",
  f.repo,
  "--out",
  out,
  "--command-label",
  "CONTROL_VALIDATION",
  "--expected-branch",
  f.branch,
  "--expected-head",
  f.head,
];

void test("optimized captures equal the historical implementation for unusual names, dirty files, detached HEAD and conflict stages", async () => {
  const code = git(
    root,
    "show",
    `${baseline}:scripts/dev-operations/checkpoint.mjs`,
  );
  /** @type {unknown} */
  const historical = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  assert.ok(
    historical &&
      typeof historical === "object" &&
      "captureSource" in historical,
  );
  assert.equal(typeof historical.captureSource, "function");
  const historicalCapture = /** @type {(repo: string) => unknown} */ (
    historical.captureSource
  );
  const f = fixture();
  const check = () =>
    assert.deepEqual(captureSource(f.repo), historicalCapture(f.repo));
  check();
  writeFileSync(resolve(f.repo, "tracked.txt"), "staged\n");
  git(f.repo, "add", "tracked.txt");
  writeFileSync(resolve(f.repo, "tracked.txt"), "unstaged\n");
  writeFileSync(resolve(f.repo, "new\tline\n.txt"), "untracked\n");
  unlinkSync(resolve(f.repo, "deleted.txt"));
  check();
  git(f.repo, "switch", "--detach", "-q", f.head);
  check();
  assert.equal(captureSource(f.repo).branch, "");
  const blob = git(f.repo, "rev-parse", `${f.head}:tracked.txt`);
  execFileSync(binary, ["-C", f.repo, "update-index", "-z", "--index-info"], {
    input:
      `0 ${"0".repeat(40)}\ttracked.txt\0` +
      [1, 2, 3]
        .map((stage) => `100644 ${blob} ${stage}\ttracked.txt\0`)
        .join(""),
  });
  check();
});

void test(
  "Git selector rejects untrusted CLT paths and executable modes",
  { skip: process.platform !== "darwin" },
  () => {
    const program = `import assert from 'node:assert/strict'; import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
const {devOperationsGitExecutable}=await import(${JSON.stringify(resolve(root, "scripts/dev-operations/checkpoint.mjs"))});
const original=fs.lstatSync; const binary='/Library/Developer/CommandLineTools/usr/bin/git';
for (const scenario of ['missing','non-root','writable-parent','symlink','non-executable']) {
fs.lstatSync=function(file,...rest) { if(file===(scenario==='writable-parent'?'/Library/Developer':binary)) { if(scenario==='missing') throw Error('missing'); const stat=Object.create(original(file,...rest)); if(scenario==='non-root')stat.uid=501; if(scenario==='writable-parent')stat.mode|=0o020; if(scenario==='symlink'){stat.isFile=()=>false;stat.isDirectory=()=>false;} if(scenario==='non-executable')stat.mode&=~0o111; return stat;} return original(file,...rest);}; syncBuiltinESMExports(); assert.equal(devOperationsGitExecutable(),'/usr/bin/git',scenario);
} fs.lstatSync=original;syncBuiltinESMExports();`;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", program],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
  },
);

void test("fixed run records actual output, warnings, exact command and source identity", () => {
  const f = fixture(
    `console.log('V23 sealed Git inventory verified: synthetic'); console.log(${JSON.stringify(success)}); console.error('synthetic diagnostic');`,
  );
  const out = resolve(f.area, "run.json");
  const result = run("receipt.mjs", runArgs(f, out));
  assert.equal(result.status, 0, result.stderr);
  const receipt =
    /** @type {{status:string,stdout:string,stderr:string,exitCode:number,sourceBefore:unknown,sourceAfter:unknown,command:{executable:string,arguments:string[]},executor:{modelCalls:number},billing:string}} */ (
      parseJson(readFileSync(out, "utf8"))
    );
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.exitCode, 0);
  assert.equal(
    receipt.stdout,
    "V23 sealed Git inventory verified: synthetic\n" + success + "\n",
  );
  assert.equal(receipt.stderr, "synthetic diagnostic\n");
  assert.deepEqual(receipt.sourceBefore, receipt.sourceAfter);
  assert.deepEqual(receipt.command.arguments, [
    "--import",
    "tsx",
    "scripts/validate-project-control.mjs",
  ]);
  assert.equal(receipt.command.executable, process.execPath);
  assert.equal(receipt.executor.modelCalls, 0);
  assert.equal(receipt.billing, "UNKNOWN");
  assert.ok(result.stdout.length < 500);
  assert.equal(
    run("receipt.mjs", runArgs(f, out)).status,
    1,
    "must not overwrite evidence",
  );
});

void test("first capture preserves stale raw-index bytes and equals the second capture after an identical rewrite", () => {
  const f = fixture();
  const index = resolve(
    f.repo,
    git(f.repo, "rev-parse", "--git-path", "index"),
  );
  const bytes = readFileSync(index);
  const file = resolve(f.repo, "tracked.txt");
  const content = readFileSync(file);
  writeFileSync(file, content);
  utimesSync(file, new Date(0), new Date(0));
  assert.deepEqual(readFileSync(index), bytes);
  const first = captureSource(f.repo);
  assert.deepEqual(readFileSync(index), bytes);
  assert.equal(first.indexSha256, sha(bytes));
  assert.deepEqual(first.unstagedNames, []);
  assert.equal(first.unstagedSha256, sha(""));
  assert.deepEqual(captureSource(f.repo), first);
  assert.deepEqual(readFileSync(index), bytes);
  assert.deepEqual(readFileSync(file), content);
  assert.equal(existsSync(index + ".lock"), false);
});

void test("fixed run preserves raw index and source after a pre-existing identical tracked rewrite", () => {
  const f = fixture(`console.log(${JSON.stringify(success)});`);
  const index = resolve(
    f.repo,
    git(f.repo, "rev-parse", "--git-path", "index"),
  );
  const bytes = readFileSync(index);
  const file = resolve(f.repo, "tracked.txt");
  const content = readFileSync(file);
  writeFileSync(file, content);
  utimesSync(file, new Date(0), new Date(0));
  const out = resolve(f.area, "same-bytes.json");
  const result = run("receipt.mjs", runArgs(f, out));
  assert.equal(result.status, 0, result.stderr);
  const receipt =
    /** @type {{status:string,sourceBefore:{indexSha256:string},sourceAfter:unknown}} */ (
      parseJson(readFileSync(out, "utf8"))
    );
  assert.equal(receipt.status, "PASS");
  assert.deepEqual(receipt.sourceBefore, receipt.sourceAfter);
  assert.equal(receipt.sourceBefore.indexSha256, sha(bytes));
  assert.deepEqual(readFileSync(index), bytes);
  assert.deepEqual(readFileSync(file), content);
});

void test("checkpoint excludes identical stale-stat paths while preserving dirty payload and raw index", () => {
  const f = fixture();
  const file = resolve(f.repo, "deleted.txt");
  writeFileSync(file, readFileSync(file));
  utimesSync(file, new Date(0), new Date(0));
  writeFileSync(resolve(f.repo, "tracked.txt"), "real change\n");
  const index = resolve(
    f.repo,
    git(f.repo, "rev-parse", "--git-path", "index"),
  );
  const bytes = readFileSync(index);
  const out = resolve(f.area, "checkpoint");
  const result = run("checkpoint.mjs", [
    "--repo",
    f.repo,
    "--out",
    out,
    "--expected-branch",
    f.branch,
    "--expected-head",
    f.head,
    "--allow",
    "tracked.txt",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const manifest =
    /** @type {{changedPaths:string[],unstagedNames:string[]}} */ (
      parseJson(readFileSync(resolve(out, "manifest.json"), "utf8"))
    );
  assert.deepEqual(manifest.changedPaths, ["tracked.txt"]);
  assert.deepEqual(manifest.unstagedNames, ["tracked.txt"]);
  assert.match(
    readFileSync(resolve(out, "unstaged.patch"), "utf8"),
    /real change/,
  );
  assert.deepEqual(readFileSync(index), bytes);
});

void test("source capture fails closed on malformed NUL status output", () => {
  const f = fixture();
  const program = `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';const original=cp.execFileSync;cp.execFileSync=(file,args,options)=>args.includes('status')?Buffer.from(' M tracked.txt'):original(file,args,options);syncBuiltinESMExports();const {captureSource}=await import(${JSON.stringify(resolve(root, "scripts/dev-operations/checkpoint.mjs"))});captureSource(${JSON.stringify(f.repo)});`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", program],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid source status/);
});

for (const scenario of ["exit", "empty", "malformed", "source-drift"]) {
  void test(`fixed run fails closed with retained evidence for ${scenario}`, () => {
    const program =
      scenario === "exit"
        ? "console.error('synthetic failure'); process.exitCode=7;"
        : scenario === "empty"
          ? ""
          : scenario === "malformed"
            ? "console.log('PASS');"
            : `import {writeFileSync} from 'node:fs';writeFileSync('tracked.txt','changed during validation');console.log(${JSON.stringify(success)});`;
    const f = fixture(program);
    const out = resolve(f.area, "failed.json");
    const result = run("receipt.mjs", runArgs(f, out));
    assert.equal(result.status, scenario === "exit" ? 7 : 1);
    const receipt =
      /** @type {{status:string,exitCode:number,failures:string[],stderr:string}} */ (
        parseJson(readFileSync(out, "utf8"))
      );
    assert.equal(receipt.status, "FAIL");
    assert.equal(receipt.exitCode, scenario === "exit" ? 7 : 0);
    assert.ok(receipt.failures.length > 0);
    assert.doesNotMatch(result.stdout, /PASS/);
    if (scenario === "exit")
      assert.equal(receipt.stderr, "synthetic failure\n");
    if (scenario === "source-drift")
      assert.match(receipt.failures.join("\n"), /source changed/);
  });
}

void test("fixed run rejects arbitrary commands, caller outcomes, wrong identity and inside-repo outputs", () => {
  const f = fixture(`console.log(${JSON.stringify(success)});`);
  const out = resolve(f.area, "must-not-exist.json");
  const args = runArgs(f, out);
  for (const invalid of [
    args.map((value) =>
      value === "CONTROL_VALIDATION" ? "OTHER_COMMAND" : value,
    ),
    [...args, "--exit-code", "0"],
    [...args, "--model", "gpt-6-sol"],
    args.map((value) => (value === f.head ? "0".repeat(40) : value)),
    runArgs(f, resolve(f.repo, "receipt.json")),
  ]) {
    const result = run("receipt.mjs", invalid);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /PASS/);
    assert.equal(existsSync(out), false);
    assert.equal(existsSync(resolve(f.repo, "receipt.json")), false);
  }
});

void test("fixed run rejects malformed control before repository code executes", () => {
  const f = fixture(
    "import {writeFileSync} from 'node:fs'; writeFileSync('executed.txt','must not execute');",
  );
  writeFileSync(resolve(f.repo, "config/project/current-work.json"), "{}");
  const out = resolve(f.area, "rejected.json");
  const result = run("receipt.mjs", runArgs(f, out));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /closed Dev Operations control mismatch/);
  assert.equal(existsSync(resolve(f.repo, "executed.txt")), false);
  assert.equal(existsSync(out), false);
});

void test("preflight accepts exact v36 overlay and preserves inherited v35 Owner", () => {
  const f = fixture();
  const overlay = {
    version: "2026.09.24-v36",
    ownerDecision: "MP-OD-2026-09-24-V36",
    supersedes: "2026.09.23-v35",
    baseline,
    authority: "LOCAL_DEV_OPERATIONS_EFFICIENCY_ONLY",
    inheritedState: "V35_V34_V33_V32_GRANTS_JOURNALS_HOLDS_UNCHANGED",
    forbidden:
      "NO_COMMIT_PUSH_NEW_PR_READY_MERGE_DEPLOY_RUNTIME_TEST_PRODUCTION_ISSUE_CLOSE",
  };
  const work = {
    roadmapVersion: overlay.version,
    devOperationsOptimizationV36: overlay,
    devOperationsRemediationV35: {
      ownerDecision: "MP-OD-2026-09-23-V35",
      pullRequest: 18,
      creationGrant: "CONSUMED",
    },
    devOperationsReviewV34: { ownerDecision: "MP-OD-2026-09-23-V34" },
    devOperationsV33: {
      ownerDecision: "MP-OD-2026-09-23-V33",
      targetEnvironment: "LOCAL_ONLY",
    },
  };
  mkdirSync(resolve(f.repo, "config/project"), { recursive: true });
  writeFileSync(
    resolve(f.repo, "config/project/roadmap.json"),
    JSON.stringify({
      version: overlay.version,
      ownerDecision: { decisionId: overlay.ownerDecision },
    }),
  );
  const save = (value = work) =>
    writeFileSync(
      resolve(f.repo, "config/project/current-work.json"),
      JSON.stringify(value),
    );
  save();
  const args = [
    "--repo",
    f.repo,
    "--expected-branch",
    f.branch,
    "--expected-head",
    f.head,
  ];
  assert.equal(run("preflight.mjs", args).status, 0);
  for (const invalid of [
    {
      ...work,
      devOperationsOptimizationV36: { ...overlay, authority: "EXPANDED" },
    },
    { ...work, devOperationsOptimizationV36: { ...overlay, extra: true } },
    {
      ...work,
      devOperationsRemediationV35: {
        ...work.devOperationsRemediationV35,
        ownerDecision: overlay.ownerDecision,
      },
    },
  ]) {
    save(invalid);
    const result = run("preflight.mjs", args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /closed Dev Operations control mismatch/);
  }
});
