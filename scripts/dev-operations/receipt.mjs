// @ts-check
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { captureSource, reconcileSource } from "./checkpoint.mjs";
import { readDevOperationsControl } from "./preflight.mjs";

const common = ["--phase", "--repo", "--out", "--command-label"];
const beforeKeys = [...common, "--expected-branch", "--expected-head"];
const afterKeys = [
  ...common,
  "--source-receipt",
  "--exit-code",
  "--tests-passed",
  "--tests-failed",
  "--model",
  "--effort",
];

/** Execute the one allowed deterministic command and bind its actual result
 * to complete source observations. A failed command or drift still produces
 * local diagnostic evidence, but never a PASS receipt.
 * @param {string} repo @param {string} out
 * @param {string} expectedBranch @param {string} expectedHead */
function runControlValidation(repo, out, expectedBranch, expectedHead) {
  if (process.version !== "v24.19.0") throw new Error("Node 24.19.0 required");
  const script = resolve(repo, "scripts/validate-project-control.mjs");
  if (realpathSync(script) !== script || !lstatSync(script).isFile())
    throw new Error("validator must be a regular file inside repo");
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const sourceBefore = captureSource(repo);
  if (
    !/^[a-f0-9]{40}$/u.test(expectedHead) ||
    sourceBefore.head !== expectedHead ||
    sourceBefore.branch !== expectedBranch
  )
    throw new Error("branch or HEAD mismatch");
  if (readDevOperationsControl(repo) !== "2026.09.24-v36")
    throw new Error("run phase requires v36 local efficiency control");
  const command = ["--import", "tsx", "scripts/validate-project-control.mjs"];
  const child = spawnSync(process.execPath, command, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  /** @type {ReturnType<typeof captureSource> | null} */
  let sourceAfter = null;
  /** @type {string[]} */
  const failures = [];
  if (child.error)
    failures.push(`validator process failed: ${child.error.message}`);
  if (child.status !== 0)
    failures.push(
      `validator exit ${child.status ?? "unknown"}${child.signal ? ` (${child.signal})` : ""}`,
    );
  const stdout = child.stdout ?? "";
  const stderr = child.stderr ?? "";
  const lines = stdout.trimEnd().split(/\r?\n/u);
  const successLine =
    /^Project control validation passed: 2026\.09\.24-v36, MP-06 \(#12\); [^\r\n]+$/u;
  if (
    lines.filter((line) => successLine.test(line)).length !== 1 ||
    !successLine.test(lines.at(-1) ?? "")
  )
    failures.push("malformed v36 control validation result");
  try {
    sourceAfter = captureSource(repo);
    reconcileSource(sourceBefore, sourceAfter);
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : "source validation failed",
    );
  }
  const receipt = {
    schemaVersion: 3,
    phase: "run",
    status: failures.length === 0 ? "PASS" : "FAIL",
    commandLabel: "CONTROL_VALIDATION",
    startedAt,
    recordedAt: new Date().toISOString(),
    elapsedMs: performance.now() - started,
    sourceBefore,
    sourceAfter,
    command: { executable: process.execPath, arguments: command, cwd: repo },
    exitCode: child.status,
    signal: child.signal,
    processError: child.error?.message ?? null,
    stdout,
    stderr,
    failures,
    resultsAuthority:
      "LOCAL_DIRECT_CHILD_PROCESS_AND_SOURCE_RECONCILIATION_NOT_INDEPENDENT_REVIEW",
    executor: { modelCalls: 0, inputTokens: 0, outputTokens: 0 },
    billing: "UNKNOWN",
  };
  writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      status: receipt.status,
      receipt: out,
      phase: "run",
      head: sourceBefore.head,
      exitCode: child.status,
      elapsedMs: receipt.elapsedMs,
    }),
  );
  if (failures.length !== 0)
    process.exitCode = child.status && child.status > 0 ? child.status : 1;
}

try {
  /** @type {Map<string, string>} */
  const values = new Map();
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i],
      value = argv[i + 1];
    if (!key || !value || values.has(key))
      throw new Error("unknown, missing or duplicate argument");
    values.set(key, value);
  }
  const before = values.get("--phase") === "before";
  const run = values.get("--phase") === "run";
  const keys = before || run ? beforeKeys : afterKeys;
  if (
    (!before && !run && values.get("--phase") !== "after") ||
    values.size !== keys.length ||
    [...values.keys()].some((key) => !keys.includes(key))
  )
    throw new Error("exact before/after/run receipt fields required");
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
  const commandLabel = required("--command-label");
  if (!/^[A-Z0-9_:-]{3,80}$/u.test(commandLabel))
    throw new Error("invalid label");
  if (run) {
    if (commandLabel !== "CONTROL_VALIDATION")
      throw new Error("run phase permits only CONTROL_VALIDATION");
    runControlValidation(
      repo,
      out,
      required("--expected-branch"),
      required("--expected-head"),
    );
  } else {
    const source = captureSource(repo);
    reconcileSource(source, captureSource(repo));
    /** @type {Record<string, unknown>} */
    let receipt;
    if (before) {
      if (
        !/^[a-f0-9]{40}$/u.test(required("--expected-head")) ||
        source.head !== required("--expected-head") ||
        source.branch !== required("--expected-branch")
      )
        throw new Error("branch or HEAD mismatch");
      receipt = {
        schemaVersion: 2,
        phase: "before",
        recordedAt: new Date().toISOString(),
        commandLabel,
        source,
      };
    } else {
      const sourceFile = realpathSync(resolve(required("--source-receipt")));
      if (sourceFile.startsWith(repo + sep))
        throw new Error("pre-validation source receipt must be outside repo");
      const bytes = readFileSync(sourceFile);
      /** @type {unknown} */
      const expected = JSON.parse(bytes.toString("utf8"));
      if (
        typeof expected !== "object" ||
        expected === null ||
        !("schemaVersion" in expected) ||
        expected.schemaVersion !== 2 ||
        !("phase" in expected) ||
        expected.phase !== "before" ||
        !("commandLabel" in expected) ||
        expected.commandLabel !== commandLabel ||
        !("source" in expected) ||
        JSON.stringify(expected.source) !== JSON.stringify(source)
      )
        throw new Error("pre-validation source identity mismatch");
      if (
        !/^gpt-[a-z0-9-]+$/u.test(required("--model")) ||
        !["low", "medium", "high", "xhigh"].includes(required("--effort"))
      )
        throw new Error("invalid model or effort");
      /** @param {string} key */
      const number = (key) => {
        const value = required(key);
        if (
          !/^(0|[1-9][0-9]*)$/u.test(value) ||
          !Number.isSafeInteger(Number(value))
        )
          throw new Error(`invalid ${key}`);
        return Number(value);
      };
      receipt = {
        schemaVersion: 2,
        phase: "after",
        recordedAt: new Date().toISOString(),
        commandLabel,
        source,
        branch: source.branch,
        head: source.head,
        sourceReceiptSha256: createHash("sha256").update(bytes).digest("hex"),
        exitCode: number("--exit-code"),
        testsPassed: number("--tests-passed"),
        testsFailed: number("--tests-failed"),
        resultsAuthority: "CALLER_REPORTED_NOT_INDEPENDENTLY_ATTESTED",
        model: required("--model"),
        effort: required("--effort"),
        usage: "UNKNOWN",
        billing: "UNKNOWN",
      };
      if (!readFileSync(sourceFile).equals(bytes))
        throw new Error("pre-validation receipt changed during capture");
    }
    reconcileSource(source, captureSource(repo));
    writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        status: "PASS",
        receipt: out,
        phase: receipt.phase,
        head: source.head,
      }),
    );
  }
} catch (error) {
  console.error(
    `RECEIPT_BLOCKED: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
}
