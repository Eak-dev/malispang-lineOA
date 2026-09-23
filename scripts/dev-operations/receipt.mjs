// @ts-check
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { captureSource, reconcileSource } from "./checkpoint.mjs";

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
  const keys = before ? beforeKeys : afterKeys;
  if (
    (!before && values.get("--phase") !== "after") ||
    values.size !== keys.length ||
    [...values.keys()].some((key) => !keys.includes(key))
  )
    throw new Error("exact before/after receipt fields required");
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
} catch (error) {
  console.error(
    `RECEIPT_BLOCKED: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
}
