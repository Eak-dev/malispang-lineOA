export const BENCHMARK_BUCKETS = [
  "FUNCTIONAL",
  "THAI_LANGUAGE_VARIATION",
  "ADVERSARIAL_SAFETY",
] as const;

export const BENCHMARK_CLASSIFICATIONS = [
  "AUTO",
  "AUTO_COMPOSITE",
  "CLARIFY",
  "STAFF_ONLY",
] as const;

export const BENCHMARK_INTENT_ORDER = [
  "MENU",
  "PRICE",
  "LOCATION",
  "OPENING_HOURS",
  "PICKUP",
  "STORAGE",
  "DELIVERY",
  "LOYALTY",
  "CONTACT",
] as const;

export type BenchmarkBucket = (typeof BENCHMARK_BUCKETS)[number];
export type BenchmarkClassification =
  (typeof BENCHMARK_CLASSIFICATIONS)[number];
export type BenchmarkIntent = (typeof BENCHMARK_INTENT_ORDER)[number];

export type AuthorityState =
  | "VALID"
  | "KB_MISSING"
  | "KB_STALE"
  | "KB_CONFLICT"
  | "KB_CHECKSUM_MISMATCH"
  | "CATALOG_MISSING"
  | "CATALOG_STALE"
  | "CATALOG_CONFLICT"
  | "CATALOG_CHECKSUM_MISMATCH"
  | "CATALOG_FRACTIONAL_PRICE"
  | "CATALOG_INVALID_SIZE"
  | "CATALOG_INCOMPLETE_BINDING"
  | "POLICY_CHECKSUM_MISMATCH";

export interface BenchmarkContext {
  readonly clarificationUsed: boolean;
  readonly pendingClarificationTemplateId?: "T-C01" | "T-C04";
  readonly handoffActive: boolean;
  readonly duplicateAttempt: boolean;
}

export interface ExpectedPriceBinding {
  readonly sku: string;
  readonly displayName: string;
  readonly displaySize: " ขนาดปกติ" | " ขนาดเล็ก";
  readonly unitPriceSatang: number;
  readonly catalogPrice: number;
}

export interface BenchmarkExpected {
  readonly classification: BenchmarkClassification;
  readonly intents: readonly BenchmarkIntent[];
  readonly templateIds: readonly string[];
  readonly responseUnitCount: number;
  readonly clarificationTemplateId?: "T-C01" | "T-C04";
  readonly failClosed: boolean;
  readonly priceBinding?: ExpectedPriceBinding;
  readonly handoffAcknowledgementCount: 0 | 1;
  readonly silent: boolean;
}

export interface BenchmarkDimensions {
  readonly intentComposition: string;
  readonly requiredFieldState: string;
  readonly ambiguityState: string;
  readonly riskOverlay: string;
  readonly conversationState: string;
  readonly authorityState: AuthorityState;
  readonly inputOrder: string;
  readonly retryState: string;
  readonly linguisticConstruction: string;
  readonly expectedSafetyOutcome: string;
}

export interface BenchmarkCase {
  readonly caseId: string;
  readonly primaryBucket: BenchmarkBucket;
  readonly scenarioFamily: string;
  readonly tags: readonly string[];
  readonly syntheticInput: string;
  readonly context: BenchmarkContext;
  readonly authorityState: AuthorityState;
  readonly expected: BenchmarkExpected;
  readonly rationale: string;
  readonly dimensions: BenchmarkDimensions;
  readonly semanticDistinctnessSignature: string;
  readonly normalizedCaseSignature: string;
  readonly antiPaddingSignature: string;
}

export interface ActualPriceBinding {
  readonly sku?: string;
  readonly displayName?: string;
  readonly displaySize?: string;
  readonly catalogPrice?: number;
}

export interface BenchmarkActual {
  readonly classification: BenchmarkClassification;
  readonly intents: readonly BenchmarkIntent[];
  readonly templateIds: readonly string[];
  readonly responseUnitCount: number;
  readonly clarificationTemplateId?: "T-C01" | "T-C04";
  readonly failClosed: boolean;
  readonly handoffAcknowledgementCount: 0 | 1;
  readonly silent: boolean;
  readonly responseFingerprint?: string;
  readonly unitFingerprints: readonly string[];
  readonly messageHashes: readonly string[];
  readonly priceBinding?: ActualPriceBinding;
}

export type SafetyFindingCode =
  | "CLASSIFICATION_MISMATCH"
  | "INTENT_SET_OR_ORDER_MISMATCH"
  | "TEMPLATE_MISMATCH"
  | "RESPONSE_UNIT_COUNT_MISMATCH"
  | "CLARIFICATION_MISMATCH"
  | "FAIL_CLOSED_MISMATCH"
  | "PRICE_BINDING_MISMATCH"
  | "WRONG_STATIC_RESPONSE"
  | "WRONG_PRICE_RESPONSE"
  | "PARTIAL_AUTO"
  | "UNSUPPORTED_CLAIM"
  | "PII_OR_RAW_INPUT_LEAKAGE"
  | "FINGERPRINT_INVALID"
  | "DUPLICATE_RETRY_MISMATCH"
  | "ACKNOWLEDGEMENT_MISMATCH"
  | "SILENCE_MISMATCH"
  | "FORBIDDEN_T_C03";

export interface SafetyFinding {
  readonly code: SafetyFindingCode;
  readonly detailCode: string;
}

export interface BenchmarkCaseResult {
  readonly caseId: string;
  readonly primaryBucket: BenchmarkBucket;
  readonly scenarioFamily: string;
  readonly tags: readonly string[];
  readonly sanitizedInput: string;
  readonly expected: BenchmarkExpected;
  readonly actual: BenchmarkActual;
  readonly findings: readonly SafetyFinding[];
  readonly correct: boolean;
  readonly falseAuto: boolean;
  readonly risky: boolean;
  readonly authorityFailure: boolean;
}

export interface DatasetValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly bucketCounts: Readonly<Record<BenchmarkBucket, number>>;
  readonly duplicateCaseIds: number;
  readonly duplicateNormalizedSignatures: number;
  readonly duplicateSemanticSignatures: number;
  readonly duplicateAntiPaddingSignatures: number;
  readonly forbiddenDataFindings: number;
  readonly coverageTags: Readonly<Record<string, number>>;
}

export type ConfusionMatrix = Readonly<
  Record<
    BenchmarkClassification,
    Readonly<Record<BenchmarkClassification, number>>
  >
>;

export interface AcceptanceCriterion {
  readonly id: string;
  readonly passed: boolean;
  readonly actual: number | string;
  readonly required: number | string;
}

export interface FalseAutoDetail {
  readonly caseId: string;
  readonly primaryBucket: BenchmarkBucket;
  readonly scenarioFamily: string;
  readonly tags: readonly string[];
  readonly sanitizedInput: string;
  readonly expected: BenchmarkExpected;
  readonly actual: BenchmarkActual;
  readonly reasonCodes: readonly string[];
}

export interface BenchmarkProvenance {
  readonly benchmarkDevelopmentBaseCommit: string;
  readonly runtimeImplementationCommit: string;
  readonly executionControlCommit: string;
  readonly benchmarkDevelopmentRoadmapVersion: "2026.09.05-v3";
  readonly runtimeAuthorizationRoadmapVersion: "2026.09.05-v4";
  readonly benchmarkCompletionRoadmapVersion: "2026.09.05-v5";
  readonly deploymentStatus: "NOT_DEPLOYED";
  readonly testDeployment: false;
  readonly productionStatus: "NO_GO";
}

export interface BenchmarkReport {
  readonly schemaVersion: 2;
  readonly runId: string;
  readonly evaluationTimestamp: string;
  readonly provenance: BenchmarkProvenance;
  readonly policyVersion: "2026.09.05-policy-v1";
  readonly policyChecksum: string;
  readonly datasetChecksum: string;
  readonly totalCases: number;
  readonly bucketCounts: Readonly<Record<BenchmarkBucket, number>>;
  readonly expectedClassCounts: Readonly<
    Record<BenchmarkClassification, number>
  >;
  readonly actualClassCounts: Readonly<Record<BenchmarkClassification, number>>;
  readonly confusionMatrix: ConfusionMatrix;
  readonly confusionMatrixRowRates: Readonly<
    Record<
      BenchmarkClassification,
      Readonly<Record<BenchmarkClassification, number>>
    >
  >;
  readonly coverage: {
    readonly scenarioFamilies: Readonly<Record<string, number>>;
    readonly intents: Readonly<Record<string, number>>;
    readonly tags: Readonly<Record<string, number>>;
    readonly authorityStates: Readonly<Record<string, number>>;
  };
  readonly autoCorrectness: {
    readonly valid: boolean;
    readonly correct: number;
    readonly denominator: number;
    readonly rate: number | null;
  };
  readonly falseAutoCount: number;
  readonly falseAutoDetails: readonly FalseAutoDetail[];
  readonly riskFailureDetails: readonly FalseAutoDetail[];
  readonly riskyFailClosed: {
    readonly passed: number;
    readonly denominator: number;
    readonly rate: number;
  };
  readonly unsupportedClaims: number;
  readonly piiOrRawChatLeakage: number;
  readonly authorityFailClosed: {
    readonly passed: number;
    readonly denominator: number;
    readonly rate: number;
  };
  readonly distinctness: DatasetValidation;
  readonly acceptanceCriteria: readonly AcceptanceCriterion[];
  readonly overallResult: "PASS" | "WP2_BENCHMARK_FAILED";
  readonly resultChecksum: string;
  readonly knownLimitations: readonly string[];
}
