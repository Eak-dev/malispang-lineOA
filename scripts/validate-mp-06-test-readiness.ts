import { readFile } from "node:fs/promises";

import {
  validateActiveBenchmarkTimeoutContract,
  validateSyntheticReadinessFixtures,
  validateTestReadinessControls,
  validateValidationChainScripts,
} from "../src/mp-06-test-readiness.js";

const root = new URL("../", import.meta.url);
const [controls, fixtures, currentWork, benchmarkSource, packageManifest] =
  await Promise.all([
    readJson("config/mp-06/test-readiness-controls.json"),
    readJson("config/mp-06/test-readiness-fixtures.json"),
    readJson("config/project/current-work.json"),
    readFile(new URL("tests/mp-06-wp2-benchmark.test.ts", root), "utf8"),
    readJson("package.json"),
  ]);

const packageScripts =
  isRecord(packageManifest) && isRecord(packageManifest.scripts)
    ? packageManifest.scripts
    : null;
const errors = [
  ...validateTestReadinessControls(controls),
  ...validateSyntheticReadinessFixtures(fixtures),
  ...validateActiveBenchmarkTimeoutContract(currentWork, benchmarkSource),
  ...validateValidationChainScripts(packageScripts),
];

if (errors.length > 0) {
  throw new Error(
    `WP6_TEST_READINESS_CONDITION_CLOSURE_FAILED: ${[...new Set(errors)].sort().join(", ")}`,
  );
}

console.log(
  "MP-06 WP6 TEST-readiness controls passed: TEST-only limits/alerts/stop/rollback and 8 synthetic fixtures are frozen; deployment remains false and Production remains NO_GO",
);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
