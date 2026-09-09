import { verifyCaseSignatures } from "./signatures.js";
import {
  BENCHMARK_BUCKETS,
  BENCHMARK_CLASSIFICATIONS,
  type BenchmarkBucket,
  type BenchmarkCase,
  type DatasetValidation,
} from "./types.js";

const REQUIRED_TAGS = [
  "AUTO_SINGLE",
  "AUTO_COMPOSITE_2",
  "AUTO_COMPOSITE_3",
  "AUTO_COMPOSITE_OVERFLOW",
  "DETERMINISTIC_ORDER",
  "PRICE",
  "NORMAL_SIZE",
  "SMALL_SIZE",
  "WHOLE_BAHT",
  "T-C01",
  "T-C04",
  "I-22",
  "CLARIFICATION_BUDGET",
  "STATIC_FINGERPRINT",
  "DYNAMIC_FINGERPRINT",
  "UNIT_DEDUPLICATION",
  "DUPLICATE_EVENT",
  "IDEMPOTENCY",
  "HANDOFF_SILENCE",
  "ACKNOWLEDGEMENT_ONCE",
  "DRAFT_ORDER_PROTECTED_FLOW",
  "ATOMIC_CANCELLATION",
  "NO_PARTIAL_AUTO",
  "THAI_VARIATION",
  "TYPO",
  "IRREGULAR_SPACING",
  "JOINED_WORDS",
  "THAI_ENGLISH",
  "THAI_DIGITS",
  "ARABIC_DIGITS",
  "NEGATION",
  "RISK",
  "PROMPT_INJECTION",
  "AUTHORITY_FAILURE",
  "STOCK_TODAY",
  "SPECIAL_FILLING",
  "PROMOTION_TODAY",
  "ALLERGEN",
  "WHOLESALE",
  "CATERING",
  "PICKUP_CONFIRM",
  "DELIVERY_FEE",
  "PAYMENT",
  "SLIP",
  "REFUND",
  "LOYALTY_BALANCE",
  "LOYALTY_REDEEM",
  "COMPLAINT",
  "ORDER_CHANGE",
  "STAFF",
  "PERSONAL_DATA",
  "DATA_DISCLOSURE",
  "GUESS_PRICE",
  "GUESS_STOCK",
] as const;

const MINIMUMS: Readonly<Record<BenchmarkBucket, number>> = {
  FUNCTIONAL: 3000,
  THAI_LANGUAGE_VARIATION: 1000,
  ADVERSARIAL_SAFETY: 1000,
};

export function validateBenchmarkDataset(
  cases: readonly BenchmarkCase[],
): DatasetValidation {
  const errors: string[] = [];
  const bucketCounts = countBuckets(cases);
  if (cases.length < 5000) errors.push("DATASET_TOTAL_BELOW_5000");
  for (const bucket of BENCHMARK_BUCKETS) {
    if (bucketCounts[bucket] < MINIMUMS[bucket]) {
      errors.push(`DATASET_${bucket}_BELOW_MINIMUM`);
    }
  }

  const duplicateCaseIds = duplicateCount(cases.map((item) => item.caseId));
  const duplicateNormalizedSignatures = duplicateCount(
    cases.map((item) => item.normalizedCaseSignature),
  );
  const duplicateSemanticSignatures = duplicateCount(
    cases.map((item) => item.semanticDistinctnessSignature),
  );
  const duplicateAntiPaddingSignatures = duplicateCount(
    cases.map((item) => item.antiPaddingSignature),
  );
  if (duplicateCaseIds > 0) errors.push("DATASET_CASE_ID_DUPLICATE");
  if (duplicateNormalizedSignatures > 0)
    errors.push("DATASET_NORMALIZED_SIGNATURE_DUPLICATE");
  if (duplicateSemanticSignatures > 0)
    errors.push("DATASET_SEMANTIC_SIGNATURE_DUPLICATE");
  if (duplicateAntiPaddingSignatures > 0)
    errors.push("DATASET_ANTI_PADDING_SIGNATURE_DUPLICATE");

  let forbiddenDataFindings = 0;
  const coverageTags: Record<string, number> = {};
  for (const item of cases) {
    for (const tag of item.tags) {
      coverageTags[tag] = (coverageTags[tag] ?? 0) + 1;
    }
    const caseErrors = validateCase(item);
    errors.push(...caseErrors.map((code) => `${item.caseId}:${code}`));
    forbiddenDataFindings += forbiddenDataCodes({
      syntheticInput: item.syntheticInput,
      rationale: item.rationale,
      tags: item.tags,
    }).length;
  }
  if (forbiddenDataFindings > 0) errors.push("DATASET_FORBIDDEN_DATA_FOUND");
  for (const tag of REQUIRED_TAGS) {
    if (!coverageTags[tag])
      errors.push(`DATASET_REQUIRED_COVERAGE_MISSING:${tag}`);
  }
  for (const classification of BENCHMARK_CLASSIFICATIONS) {
    if (
      !cases.some((item) => item.expected.classification === classification)
    ) {
      errors.push(`DATASET_EXPECTED_CLASS_MISSING:${classification}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    bucketCounts,
    duplicateCaseIds,
    duplicateNormalizedSignatures,
    duplicateSemanticSignatures,
    duplicateAntiPaddingSignatures,
    forbiddenDataFindings,
    coverageTags: sortRecord(coverageTags),
  };
}

export function forbiddenDataCodes(value: unknown): string[] {
  const serialized = JSON.stringify(value);
  const findings: string[] = [];
  const patterns: readonly [string, RegExp][] = [
    ["PHONE_NUMBER", /(?<![A-Za-z0-9])0\d{8,9}(?![A-Za-z0-9])/u],
    ["LINE_USER_ID", /\bU[a-f0-9]{32}\b/iu],
    ["JWT", /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u],
    ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
    ["CHANNEL_SECRET", /channel[_ -]?secret\s*[:=]\s*[A-Za-z0-9/+_-]{16,}/iu],
    ["ACCESS_TOKEN", /access[_ -]?token\s*[:=]\s*[A-Za-z0-9._-]{16,}/iu],
    ["WEBHOOK_PAYLOAD", /"replyToken"\s*:/u],
    ["RAW_LINE_SOURCE", /"userId"\s*:/u],
  ];
  for (const [code, pattern] of patterns) {
    if (pattern.test(serialized)) findings.push(code);
  }
  return findings;
}

function validateCase(item: BenchmarkCase): string[] {
  const errors: string[] = [];
  if (!/^MP06-[FTA]-\d{4}$/u.test(item.caseId)) errors.push("CASE_ID_INVALID");
  if (!BENCHMARK_BUCKETS.includes(item.primaryBucket))
    errors.push("BUCKET_INVALID");
  if (!item.scenarioFamily || !item.syntheticInput || !item.rationale)
    errors.push("REQUIRED_TEXT_FIELD_MISSING");
  if (item.tags.length === 0) errors.push("TAGS_EMPTY");
  if (!BENCHMARK_CLASSIFICATIONS.includes(item.expected.classification))
    errors.push("EXPECTED_CLASS_INVALID");
  if (item.expected.responseUnitCount !== item.expected.intents.length)
    errors.push("EXPECTED_UNIT_COUNT_INVALID");
  if (
    item.expected.classification === "AUTO_COMPOSITE" &&
    (item.expected.responseUnitCount < 2 || item.expected.responseUnitCount > 3)
  ) {
    errors.push("EXPECTED_COMPOSITE_COUNT_INVALID");
  }
  if (
    item.expected.classification === "AUTO" &&
    item.expected.responseUnitCount !== 1
  ) {
    errors.push("EXPECTED_AUTO_COUNT_INVALID");
  }
  if (
    item.expected.classification === "CLARIFY" &&
    !item.expected.clarificationTemplateId
  ) {
    errors.push("EXPECTED_CLARIFICATION_MISSING");
  }
  for (const signature of [
    item.semanticDistinctnessSignature,
    item.normalizedCaseSignature,
    item.antiPaddingSignature,
  ]) {
    if (!/^[a-f0-9]{64}$/u.test(signature)) errors.push("SIGNATURE_INVALID");
  }
  errors.push(...verifyCaseSignatures(item));
  return errors;
}

function countBuckets(
  cases: readonly BenchmarkCase[],
): Record<BenchmarkBucket, number> {
  const counts: Record<BenchmarkBucket, number> = {
    FUNCTIONAL: 0,
    THAI_LANGUAGE_VARIATION: 0,
    ADVERSARIAL_SAFETY: 0,
  };
  for (const item of cases) counts[item.primaryBucket] += 1;
  return counts;
}

function duplicateCount(values: readonly string[]): number {
  return values.length - new Set(values).size;
}

function sortRecord(input: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
  );
}
