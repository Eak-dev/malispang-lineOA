export const REQUIRED_BUSINESS_CATEGORIES = [
  "MENU",
  "PRICE",
  "LOCATION",
  "OPENING_HOURS",
  "STORAGE",
  "ALLERGEN",
  "WHOLESALE",
  "ADVANCE_ORDER",
  "DELIVERY",
] as const;

export type BusinessCategory = (typeof REQUIRED_BUSINESS_CATEGORIES)[number];

export interface ApprovedBusinessRecord {
  readonly status: "APPROVED";
  readonly sourceClassification: "OWNER_APPROVED_REPOSITORY_RECORD";
  readonly owner: string;
  readonly approvedAt: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly reviewAt: string;
  readonly version: string;
  readonly checksum: string;
  readonly customerFacingValue: string;
}

export interface BlockedBusinessRecord {
  readonly status: "BLOCKED";
  readonly sourceClassification:
    | "NO_AUTHORITATIVE_SOURCE"
    | "HISTORICAL_ONLY"
    | "TEST_EVIDENCE_ONLY"
    | "CONFLICTING_EVIDENCE";
  readonly blockerCode: string;
  readonly fallback: "SAFE_FALLBACK" | "HUMAN_REVIEW";
}

export type BusinessRecord = ApprovedBusinessRecord | BlockedBusinessRecord;

export interface ProductionBusinessManifest {
  readonly schemaVersion: 1;
  readonly environment: "PRODUCTION";
  readonly accountName: "มะลิปัง";
  readonly defaultBehavior: "FAIL_CLOSED";
  readonly categories: Readonly<Record<BusinessCategory, BusinessRecord>>;
}

export interface BusinessLookupResult {
  readonly status: "APPROVED" | "BLOCKED";
  readonly value?: string;
  readonly reasonCode?: string;
  readonly fallback?: "SAFE_FALLBACK" | "HUMAN_REVIEW";
  readonly version?: string;
}

export function validateProductionBusinessManifest(
  input: unknown,
): readonly string[] {
  if (!isRecord(input)) return ["MANIFEST_NOT_OBJECT"];
  const errors: string[] = [];
  if (input.schemaVersion !== 1) errors.push("INVALID_SCHEMA_VERSION");
  if (input.environment !== "PRODUCTION") errors.push("INVALID_ENVIRONMENT");
  if (input.accountName !== "มะลิปัง") errors.push("INVALID_ACCOUNT_NAME");
  if (input.defaultBehavior !== "FAIL_CLOSED") {
    errors.push("INVALID_DEFAULT_BEHAVIOR");
  }
  if (!isRecord(input.categories)) {
    errors.push("CATEGORIES_NOT_OBJECT");
    return errors;
  }

  for (const category of REQUIRED_BUSINESS_CATEGORIES) {
    const record = input.categories[category];
    if (!isRecord(record)) {
      errors.push(`${category}_MISSING`);
      continue;
    }
    if (record.status === "APPROVED") {
      validateApprovedRecord(category, record, errors);
    } else if (record.status === "BLOCKED") {
      validateBlockedRecord(category, record, errors);
    } else {
      errors.push(`${category}_INVALID_STATUS`);
    }
  }
  return errors;
}

export function lookupApprovedBusinessData(
  manifest: ProductionBusinessManifest,
  category: BusinessCategory,
  now: Date,
): BusinessLookupResult {
  const record = manifest.categories[category];
  if (record.status === "BLOCKED") {
    return {
      status: "BLOCKED",
      reasonCode: record.blockerCode,
      fallback: record.fallback,
    };
  }
  const timestamp = now.getTime();
  const start = Date.parse(record.effectiveFrom);
  const end = Date.parse(record.effectiveTo);
  const review = Date.parse(record.reviewAt);
  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(review) ||
    timestamp < start ||
    timestamp >= end ||
    timestamp >= review
  ) {
    return {
      status: "BLOCKED",
      reasonCode: `${category}_STALE_OR_NOT_EFFECTIVE`,
      fallback: category === "ALLERGEN" ? "HUMAN_REVIEW" : "SAFE_FALLBACK",
    };
  }
  return {
    status: "APPROVED",
    value: record.customerFacingValue,
    version: record.version,
  };
}

function validateApprovedRecord(
  category: BusinessCategory,
  record: Record<string, unknown>,
  errors: string[],
): void {
  if (record.sourceClassification !== "OWNER_APPROVED_REPOSITORY_RECORD") {
    errors.push(`${category}_SOURCE_NOT_AUTHORITATIVE`);
  }
  for (const field of [
    "owner",
    "approvedAt",
    "effectiveFrom",
    "effectiveTo",
    "reviewAt",
    "version",
    "checksum",
    "customerFacingValue",
  ] as const) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      errors.push(`${category}_${field.toUpperCase()}_MISSING`);
    }
  }
  if (
    typeof record.customerFacingValue === "string" &&
    /TEST_SEED|TEST ONLY|ทดสอบระบบ/i.test(record.customerFacingValue)
  ) {
    errors.push(`${category}_TEST_DATA_PROHIBITED`);
  }
}

function validateBlockedRecord(
  category: BusinessCategory,
  record: Record<string, unknown>,
  errors: string[],
): void {
  if (typeof record.blockerCode !== "string" || !record.blockerCode.trim()) {
    errors.push(`${category}_BLOCKER_MISSING`);
  }
  if (
    record.fallback !== "SAFE_FALLBACK" &&
    record.fallback !== "HUMAN_REVIEW"
  ) {
    errors.push(`${category}_INVALID_FALLBACK`);
  }
  if ("customerFacingValue" in record) {
    errors.push(`${category}_BLOCKED_VALUE_PROHIBITED`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
