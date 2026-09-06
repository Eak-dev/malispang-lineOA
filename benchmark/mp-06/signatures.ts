import { createHash } from "node:crypto";

import type {
  AuthorityState,
  BenchmarkBucket,
  BenchmarkCase,
  BenchmarkContext,
  BenchmarkDimensions,
  BenchmarkExpected,
} from "./types.js";

export function semanticSignatureFor(input: {
  readonly primaryBucket: BenchmarkBucket;
  readonly scenarioFamily: string;
  readonly dimensions: BenchmarkDimensions;
  readonly expected: BenchmarkExpected;
}): string {
  return hashCanonical(input);
}

export function normalizedSignatureFor(input: {
  readonly syntheticInput: string;
  readonly context: BenchmarkContext;
  readonly authorityState: AuthorityState;
  readonly expected: BenchmarkExpected;
}): string {
  return hashCanonical({
    normalizedInput: normalizeSynthetic(input.syntheticInput),
    context: input.context,
    authorityState: input.authorityState,
    expected: input.expected,
  });
}

export function antiPaddingSignatureFor(input: {
  readonly primaryBucket: BenchmarkBucket;
  readonly scenarioFamily: string;
  readonly dimensions: BenchmarkDimensions;
}): string {
  return hashCanonical({
    primaryBucket: input.primaryBucket,
    family: input.scenarioFamily,
    intentComposition: input.dimensions.intentComposition,
    requiredFieldState: input.dimensions.requiredFieldState,
    ambiguityState: input.dimensions.ambiguityState,
    riskOverlay: input.dimensions.riskOverlay,
    conversationState: input.dimensions.conversationState,
    authorityState: input.dimensions.authorityState,
    inputOrder: input.dimensions.inputOrder,
    retryState: input.dimensions.retryState,
    linguisticConstruction: input.dimensions.linguisticConstruction,
    expectedSafetyOutcome: input.dimensions.expectedSafetyOutcome,
  });
}

export function verifyCaseSignatures(item: BenchmarkCase): string[] {
  const errors: string[] = [];
  if (
    item.semanticDistinctnessSignature !==
    semanticSignatureFor({
      primaryBucket: item.primaryBucket,
      scenarioFamily: item.scenarioFamily,
      dimensions: item.dimensions,
      expected: item.expected,
    })
  ) {
    errors.push("SEMANTIC_SIGNATURE_INTEGRITY_FAILED");
  }
  if (
    item.normalizedCaseSignature !==
    normalizedSignatureFor({
      syntheticInput: item.syntheticInput,
      context: item.context,
      authorityState: item.authorityState,
      expected: item.expected,
    })
  ) {
    errors.push("NORMALIZED_SIGNATURE_INTEGRITY_FAILED");
  }
  if (
    item.antiPaddingSignature !==
    antiPaddingSignatureFor({
      primaryBucket: item.primaryBucket,
      scenarioFamily: item.scenarioFamily,
      dimensions: item.dimensions,
    })
  ) {
    errors.push("ANTI_PADDING_SIGNATURE_INTEGRITY_FAILED");
  }
  return errors;
}

function normalizeSynthetic(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[\p{P}\p{S}\s]+/gu, " ")
    .trim();
}

function hashCanonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
