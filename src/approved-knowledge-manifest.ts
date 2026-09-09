import { FAQ_INTENTS, type ApprovedFaqRecord, type FaqIntent } from "./faq.js";

export interface ApprovedKnowledgeManifest {
  readonly schemaVersion: 1;
  readonly environment: "TEST";
  readonly accountName: "มะลิปัง TEST";
  readonly sourceOfTruth: "VERSIONED_REPOSITORY_MANIFEST";
  readonly defaultBehavior: "FAIL_CLOSED";
  readonly categories: Readonly<Record<FaqIntent, KnowledgeManifestRecord>>;
}

export type KnowledgeManifestRecord =
  | {
      readonly status: "APPROVED";
      readonly source: {
        readonly classification: "OWNER_APPROVED_REPOSITORY_RECORD";
        readonly reference: string;
      };
      readonly owner: string;
      readonly approvedAt: string;
      readonly effectiveFrom: string;
      readonly effectiveTo: string;
      readonly freshness: {
        readonly reviewAt: string;
        readonly maximumAgeDays: number;
      };
      readonly version: string;
      readonly checksum: string;
      readonly keywords: readonly string[];
      readonly customerFacingAnswer: string;
    }
  | {
      readonly status: "BLOCKED";
      readonly source: {
        readonly classification:
          | "NO_AUTHORITATIVE_SOURCE"
          | "TEST_EVIDENCE_ONLY"
          | "CONFLICTING_EVIDENCE";
        readonly reference: string;
      };
      readonly owner: string;
      readonly approvedAt: null;
      readonly effectiveFrom: null;
      readonly effectiveTo: null;
      readonly freshness: {
        readonly reviewAt: null;
        readonly maximumAgeDays: null;
      };
      readonly version: null;
      readonly checksum: null;
      readonly blockerCode: string;
      readonly fallback: "SAFE_FALLBACK" | "HUMAN_REVIEW";
    };

export function validateApprovedKnowledgeManifest(
  input: unknown,
): readonly string[] {
  if (!isRecord(input)) return ["MANIFEST_NOT_OBJECT"];
  const errors: string[] = [];
  if (input.schemaVersion !== 1) errors.push("INVALID_SCHEMA_VERSION");
  if (input.environment !== "TEST") errors.push("INVALID_ENVIRONMENT");
  if (input.accountName !== "มะลิปัง TEST") errors.push("INVALID_ACCOUNT_NAME");
  if (input.sourceOfTruth !== "VERSIONED_REPOSITORY_MANIFEST") {
    errors.push("INVALID_SOURCE_OF_TRUTH");
  }
  if (input.defaultBehavior !== "FAIL_CLOSED") {
    errors.push("INVALID_DEFAULT_BEHAVIOR");
  }
  if (!isRecord(input.categories)) {
    errors.push("CATEGORIES_NOT_OBJECT");
    return errors;
  }

  for (const intent of FAQ_INTENTS) {
    const record = input.categories[intent];
    if (!isRecord(record)) {
      errors.push(`${intent}_MISSING`);
      continue;
    }
    validateCommonFields(intent, record, errors);
    if (record.status === "APPROVED") {
      validateApproved(intent, record, errors);
    } else if (record.status === "BLOCKED") {
      validateBlocked(intent, record, errors);
    } else {
      errors.push(`${intent}_INVALID_STATUS`);
    }
  }
  return errors;
}

export function parseApprovedKnowledgeManifest(
  input: unknown,
): ApprovedKnowledgeManifest {
  const errors = validateApprovedKnowledgeManifest(input);
  if (errors.length > 0) {
    throw new Error(`INVALID_APPROVED_KNOWLEDGE_MANIFEST:${errors.join(",")}`);
  }
  return input as ApprovedKnowledgeManifest;
}

export function approvedFaqRecordsFromManifest(
  manifest: ApprovedKnowledgeManifest,
): readonly ApprovedFaqRecord[] {
  return FAQ_INTENTS.flatMap((intent) => {
    const record = manifest.categories[intent];
    if (record.status !== "APPROVED") return [];
    return [
      {
        id: `${intent}:${record.version}`,
        intent,
        keywords: record.keywords,
        answer: record.customerFacingAnswer,
        status: record.status,
        source: record.source,
        owner: record.owner,
        approvedAt: record.approvedAt,
        effectiveFrom: record.effectiveFrom,
        effectiveTo: record.effectiveTo,
        freshness: record.freshness,
        version: record.version,
        checksum: record.checksum,
      },
    ];
  });
}

function validateCommonFields(
  intent: FaqIntent,
  record: Record<string, unknown>,
  errors: string[],
): void {
  if (!isRecord(record.source)) {
    errors.push(`${intent}_SOURCE_MISSING`);
  } else if (
    typeof record.source.reference !== "string" ||
    !record.source.reference.trim()
  ) {
    errors.push(`${intent}_SOURCE_REFERENCE_MISSING`);
  }
  if (typeof record.owner !== "string" || !record.owner.trim()) {
    errors.push(`${intent}_OWNER_MISSING`);
  }
  if (!isRecord(record.freshness)) {
    errors.push(`${intent}_FRESHNESS_MISSING`);
  }
}

function validateApproved(
  intent: FaqIntent,
  record: Record<string, unknown>,
  errors: string[],
): void {
  if (
    !isRecord(record.source) ||
    record.source.classification !== "OWNER_APPROVED_REPOSITORY_RECORD"
  ) {
    errors.push(`${intent}_SOURCE_NOT_AUTHORITATIVE`);
  } else if (
    typeof record.source.reference !== "string" ||
    !/^[A-Za-z0-9._/-]{1,120}$/.test(record.source.reference)
  ) {
    errors.push(`${intent}_INVALID_SOURCE_REFERENCE`);
  }
  for (const field of [
    "approvedAt",
    "effectiveFrom",
    "effectiveTo",
    "version",
    "checksum",
    "customerFacingAnswer",
  ] as const) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      errors.push(`${intent}_${field.toUpperCase()}_MISSING`);
    }
  }
  if (
    typeof record.checksum === "string" &&
    !/^[a-f0-9]{64}$/.test(record.checksum)
  ) {
    errors.push(`${intent}_INVALID_CHECKSUM`);
  }
  if (
    !Array.isArray(record.keywords) ||
    record.keywords.some(
      (keyword) => typeof keyword !== "string" || !keyword.trim(),
    )
  )
    errors.push(`${intent}_KEYWORDS_MISSING`);
  if (
    typeof record.customerFacingAnswer === "string" &&
    /TEST_SEED|TEST ONLY|ทดสอบระบบ/i.test(record.customerFacingAnswer)
  ) {
    errors.push(`${intent}_TEST_DATA_PROHIBITED`);
  }
  if (isRecord(record.freshness)) {
    if (
      typeof record.freshness.reviewAt !== "string" ||
      !record.freshness.reviewAt.trim()
    ) {
      errors.push(`${intent}_REVIEW_AT_MISSING`);
    }
    if (
      typeof record.freshness.maximumAgeDays !== "number" ||
      !Number.isSafeInteger(record.freshness.maximumAgeDays) ||
      record.freshness.maximumAgeDays <= 0
    ) {
      errors.push(`${intent}_INVALID_MAXIMUM_AGE`);
    }
  }
  validateApprovedDates(intent, record, errors);
}

function validateApprovedDates(
  intent: FaqIntent,
  record: Record<string, unknown>,
  errors: string[],
): void {
  const approvedAt = parseDate(record.approvedAt);
  const effectiveFrom = parseDate(record.effectiveFrom);
  const effectiveTo = parseDate(record.effectiveTo);
  const reviewAt = isRecord(record.freshness)
    ? parseDate(record.freshness.reviewAt)
    : Number.NaN;
  if ([approvedAt, effectiveFrom, effectiveTo, reviewAt].some(Number.isNaN)) {
    errors.push(`${intent}_INVALID_DATE`);
    return;
  }
  if (effectiveFrom >= effectiveTo || reviewAt > effectiveTo) {
    errors.push(`${intent}_INVALID_DATE_ORDER`);
  }
}

function validateBlocked(
  intent: FaqIntent,
  record: Record<string, unknown>,
  errors: string[],
): void {
  if (
    !isRecord(record.source) ||
    ![
      "NO_AUTHORITATIVE_SOURCE",
      "TEST_EVIDENCE_ONLY",
      "CONFLICTING_EVIDENCE",
    ].includes(String(record.source.classification))
  ) {
    errors.push(`${intent}_INVALID_BLOCKED_SOURCE`);
  }
  if (typeof record.blockerCode !== "string" || !record.blockerCode.trim()) {
    errors.push(`${intent}_BLOCKER_MISSING`);
  }
  if (
    record.fallback !== "SAFE_FALLBACK" &&
    record.fallback !== "HUMAN_REVIEW"
  ) {
    errors.push(`${intent}_INVALID_FALLBACK`);
  }
  if ("customerFacingAnswer" in record || "keywords" in record) {
    errors.push(`${intent}_BLOCKED_ANSWER_PROHIBITED`);
  }
  for (const field of [
    "approvedAt",
    "effectiveFrom",
    "effectiveTo",
    "version",
    "checksum",
  ] as const) {
    if (record[field] !== null)
      errors.push(`${intent}_${field.toUpperCase()}_MUST_BE_NULL`);
  }
  if (
    isRecord(record.freshness) &&
    (record.freshness.reviewAt !== null ||
      record.freshness.maximumAgeDays !== null)
  ) {
    errors.push(`${intent}_BLOCKED_FRESHNESS_MUST_BE_NULL`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDate(value: unknown): number {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}
