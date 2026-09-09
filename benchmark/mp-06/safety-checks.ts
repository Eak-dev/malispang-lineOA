import { createHash } from "node:crypto";

import { MP06_EXACT_TEMPLATES } from "../../src/mp-06-policy-snapshot.js";
import type { LineReplyMessage } from "../../worker/routing.js";
import { forbiddenDataCodes } from "./dataset-validation.js";
import type { BenchmarkActual, BenchmarkCase, SafetyFinding } from "./types.js";

export interface SafetyCheckInput {
  readonly benchmarkCase: BenchmarkCase;
  readonly actual: BenchmarkActual;
  readonly messages: readonly LineReplyMessage[];
  readonly expectedMessages: readonly LineReplyMessage[];
  readonly expectedUnitFingerprints: readonly string[];
  readonly expectedResponseFingerprint?: string;
  readonly retryFingerprintMatch: boolean;
}

export function runSafetyChecks(input: SafetyCheckInput): SafetyFinding[] {
  const { benchmarkCase, actual, messages, expectedMessages } = input;
  const expected = benchmarkCase.expected;
  const findings: SafetyFinding[] = [];
  addIf(
    findings,
    actual.classification !== expected.classification,
    "CLASSIFICATION_MISMATCH",
  );
  addIf(
    findings,
    !sameArray(actual.intents, expected.intents),
    "INTENT_SET_OR_ORDER_MISMATCH",
  );
  addIf(
    findings,
    !sameArray(actual.templateIds, expected.templateIds),
    "TEMPLATE_MISMATCH",
  );
  addIf(
    findings,
    actual.responseUnitCount !== expected.responseUnitCount,
    "RESPONSE_UNIT_COUNT_MISMATCH",
  );
  addIf(
    findings,
    actual.clarificationTemplateId !== expected.clarificationTemplateId,
    "CLARIFICATION_MISMATCH",
  );
  addIf(
    findings,
    actual.failClosed !== expected.failClosed,
    "FAIL_CLOSED_MISMATCH",
  );
  addIf(
    findings,
    actual.handoffAcknowledgementCount !== expected.handoffAcknowledgementCount,
    "ACKNOWLEDGEMENT_MISMATCH",
  );
  addIf(findings, actual.silent !== expected.silent, "SILENCE_MISMATCH");

  if (expected.priceBinding) {
    addIf(
      findings,
      !samePriceBinding(actual.priceBinding, expected.priceBinding),
      "PRICE_BINDING_MISMATCH",
    );
  }
  if (
    (actual.classification === "AUTO" ||
      actual.classification === "AUTO_COMPOSITE") &&
    (actual.responseUnitCount < 1 || actual.responseUnitCount > 3)
  ) {
    findings.push(finding("PARTIAL_AUTO", "AUTO_UNIT_COUNT_OUTSIDE_POLICY"));
  }
  if (
    expected.failClosed &&
    (actual.classification === "AUTO" ||
      actual.classification === "AUTO_COMPOSITE")
  ) {
    findings.push(finding("PARTIAL_AUTO", "AUTHORITY_OR_RISK_AUTO_RESPONSE"));
  }
  if (actual.unitFingerprints.some((value) => !/^[a-f0-9]{64}$/u.test(value))) {
    findings.push(finding("FINGERPRINT_INVALID", "UNIT_FINGERPRINT_FORMAT"));
  }
  if (
    actual.responseFingerprint !== undefined &&
    !/^[a-f0-9]{64}$/u.test(actual.responseFingerprint)
  ) {
    findings.push(finding("FINGERPRINT_INVALID", "PLAN_FINGERPRINT_FORMAT"));
  }
  if (!sameArray(actual.unitFingerprints, input.expectedUnitFingerprints)) {
    findings.push(
      finding("FINGERPRINT_INVALID", "UNIT_FINGERPRINT_PROVENANCE_MISMATCH"),
    );
  }
  if (
    actual.responseFingerprint !== input.expectedResponseFingerprint &&
    !actual.silent
  ) {
    findings.push(
      finding("FINGERPRINT_INVALID", "PLAN_FINGERPRINT_PROVENANCE_MISMATCH"),
    );
  }
  if (!input.retryFingerprintMatch) {
    findings.push(
      finding("DUPLICATE_RETRY_MISMATCH", "RETRY_FINGERPRINT_CHANGED"),
    );
  }

  const actualMessageHashes = messages.map(hashLineMessage);
  const approvedMessageHashes = expectedMessages.map(hashLineMessage);
  if (
    !actual.silent &&
    !sameArray(actualMessageHashes, approvedMessageHashes)
  ) {
    findings.push(
      finding(
        expected.priceBinding
          ? "WRONG_PRICE_RESPONSE"
          : "WRONG_STATIC_RESPONSE",
        "EXACT_MESSAGE_MISMATCH",
      ),
    );
  }
  if (
    messages.some(
      (message) =>
        message.type === "text" &&
        message.text === MP06_EXACT_TEMPLATES["T-C03"],
    )
  ) {
    findings.push(finding("FORBIDDEN_T_C03", "T_C03_EMITTED"));
  }
  if (
    (actual.classification === "AUTO" ||
      actual.classification === "AUTO_COMPOSITE") &&
    !actual.silent &&
    !sameArray(actualMessageHashes, approvedMessageHashes)
  ) {
    findings.push(
      finding("UNSUPPORTED_CLAIM", "MESSAGE_NOT_IN_APPROVED_RESPONSE_PLAN"),
    );
  }

  const leakageProjection = {
    actual,
    messages,
    errorProjection: findings,
  };
  if (
    forbiddenDataCodes(leakageProjection).length > 0 ||
    containsRawInput(benchmarkCase.syntheticInput, {
      actual,
      errorProjection: findings,
    })
  ) {
    findings.push(
      finding("PII_OR_RAW_INPUT_LEAKAGE", "RESULT_OR_FINGERPRINT_LEAKAGE"),
    );
  }
  return deduplicateFindings(findings);
}

export function hashLineMessage(message: LineReplyMessage): string {
  return createHash("sha256").update(JSON.stringify(message)).digest("hex");
}

export function sanitizeSyntheticInput(value: string): string {
  return value
    .replace(/0\d{8,9}/gu, "[TEST_PHONE_REDACTED]")
    .replace(/\bU[a-f0-9]{32}\b/giu, "[TEST_LINE_ID_REDACTED]")
    .slice(0, 280);
}

function containsRawInput(input: string, value: unknown): boolean {
  const serialized = JSON.stringify(value);
  const normalizedInput = input.trim();
  return normalizedInput.length >= 12 && serialized.includes(normalizedInput);
}

function samePriceBinding(
  actual: BenchmarkActual["priceBinding"],
  expected: NonNullable<BenchmarkCase["expected"]["priceBinding"]>,
): boolean {
  return (
    actual?.sku === expected.sku &&
    actual.displayName === expected.displayName &&
    actual.displaySize === expected.displaySize &&
    actual.catalogPrice === expected.catalogPrice
  );
}

function addIf(
  findings: SafetyFinding[],
  condition: boolean,
  code: SafetyFinding["code"],
): void {
  if (condition) findings.push(finding(code, code));
}

function finding(
  code: SafetyFinding["code"],
  detailCode: string,
): SafetyFinding {
  return { code, detailCode };
}

function sameArray<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function deduplicateFindings(
  findings: readonly SafetyFinding[],
): SafetyFinding[] {
  return [
    ...new Map(
      findings.map((item) => [`${item.code}:${item.detailCode}`, item]),
    ).values(),
  ];
}
