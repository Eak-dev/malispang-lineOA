import { readFile } from "node:fs/promises";

import {
  evaluateProductionReadiness,
  REQUIRED_BUSINESS_CATEGORIES,
  validateProductionBusinessManifest,
} from "../src/production-readiness/index.js";

const root = new URL("../", import.meta.url);
const businessManifest = await readJson(
  "config/production-readiness/production-business-manifest.json",
);
const configManifest = await readJson(
  "config/production-readiness/production-configuration-manifest.json",
);
const secretInventory = await readJson(
  "config/production-readiness/secret-inventory.json",
);
const roleMatrix = await readJson(
  "config/production-readiness/role-matrix.json",
);
const monitoring = await readJson(
  "config/production-readiness/monitoring-thresholds.json",
);
const stableVersion = await readJson(
  "config/production-readiness/stable-version-record.json",
);

const manifestErrors = validateProductionBusinessManifest(businessManifest);
if (manifestErrors.length > 0) {
  throw new Error(
    `Invalid Production business manifest: ${manifestErrors.join(", ")}`,
  );
}
for (const [name, value] of [
  ["configuration", configManifest],
  ["secret inventory", secretInventory],
  ["role matrix", roleMatrix],
  ["monitoring", monitoring],
  ["stable version", stableVersion],
] as const) {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error(`Invalid ${name} manifest`);
  }
}

if (
  !isRecord(secretInventory) ||
  secretInventory.valuesStoredInRepository !== false ||
  !Array.isArray(secretInventory.requiredEncryptedBindings) ||
  secretInventory.requiredEncryptedBindings.some(
    (item) =>
      !isRecord(item) ||
      item.status !== "NOT_CREATED_NOT_READ" ||
      "value" in item,
  )
) {
  throw new Error("Secret inventory must contain names only");
}
if (!isRecord(roleMatrix) || roleMatrix.sharedAccountsAllowed !== false) {
  throw new Error("Shared Production staff accounts must be prohibited");
}
if (
  !isRecord(monitoring) ||
  monitoring.maximumDecisionToDisableAutomationMinutes !== 5 ||
  !Array.isArray(monitoring.signals)
) {
  throw new Error("Monitoring rollback thresholds are incomplete");
}
if (
  !isRecord(stableVersion) ||
  stableVersion.status !== "PENDING_READ_ONLY_PRODUCTION_CAPTURE" ||
  stableVersion.externalReadAuthorized !== false
) {
  throw new Error("Stable version record must remain fail closed");
}
if (
  !isRecord(configManifest) ||
  !isRecord(configManifest.lineCapabilityEvidence)
) {
  throw new Error("LINE capability evidence is missing");
}

const categories = Object.fromEntries(
  REQUIRED_BUSINESS_CATEGORIES.map((category) => [category, "BLOCKED"]),
);
const result = evaluateProductionReadiness({
  rewardLandedCostBaht: null,
  rewardLandedCostEvidenceStatus: "MISSING",
  lineCapabilities: {
    rollingCardExpiryFromReceipt: "NOT_VERIFIED",
    oneTimeQr: "SUPPORTED",
    tenMinuteQrExpiry: "NOT_VERIFIED",
    multiPointOneTimeQr: "NOT_VERIFIED",
    sixtyDayVoucherExpiry: "NOT_VERIFIED",
  },
  authoritativeCategories: categories,
  productionResourcesCaptured: false,
  sevenDayWorkerLogRetentionReady: false,
  rollbackRehearsed: false,
  finalOwnerGo: false,
});
if (result.decision !== "NO_GO" || !result.blockers.includes("COGS_BLOCKER")) {
  throw new Error("Current package must remain NO_GO with COGS blocker");
}
console.log(
  `Production readiness validation passed: expected NO_GO, ${result.blockers.length} blockers recorded`,
);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
