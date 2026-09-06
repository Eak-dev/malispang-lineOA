import { createHash } from "node:crypto";

import type {
  AcceptanceCriterion,
  BenchmarkCase,
  BenchmarkCaseResult,
  BenchmarkClassification,
  BenchmarkReport,
  ConfusionMatrix,
  DatasetValidation,
  FalseAutoDetail,
} from "./types.js";
import { BENCHMARK_BUCKETS, BENCHMARK_CLASSIFICATIONS } from "./types.js";

export const MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT =
  "8117f7c0b7cb190af81ea8f9481bd257db8a5a51";
export const MP06_WP3_RUNTIME_IMPLEMENTATION_COMMIT =
  "d4dc0f24a64f29ea6d238ececfca6e57ed9433b5";
export const MP06_WP4_EXECUTION_CONTROL_COMMIT =
  "cc13fa95883d37b35d0e79cdcbfd7c2be823be61";
export const MP06_WP2_POLICY_CHECKSUM =
  "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0";
export const MP06_WP2_DATASET_CHECKSUM =
  "6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa";
export const MP06_WP4_EXPECTED_PASS_RESULT_CHECKSUM =
  "f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6";
export const MP06_WP2_EVALUATION_TIMESTAMP = "2026-09-05T12:00:00+07:00";
const MP06_WP2_BENCHMARK_DEVELOPMENT_ROADMAP_VERSION = "2026.09.05-v3" as const;

export function buildBenchmarkReport(
  cases: readonly BenchmarkCase[],
  results: readonly BenchmarkCaseResult[],
  distinctness: DatasetValidation,
): BenchmarkReport {
  if (cases.length !== results.length) {
    throw new Error("MP06_WP2_CASE_RESULT_COUNT_MISMATCH");
  }
  const bucketCounts = countByKnown(
    cases.map((item) => item.primaryBucket),
    BENCHMARK_BUCKETS,
  );
  const expectedClassCounts = countByKnown(
    results.map((item) => item.expected.classification),
    BENCHMARK_CLASSIFICATIONS,
  );
  const actualClassCounts = countByKnown(
    results.map((item) => item.actual.classification),
    BENCHMARK_CLASSIFICATIONS,
  );
  const confusionMatrix = buildConfusionMatrix(results);
  const confusionMatrixRowRates = buildMatrixRates(confusionMatrix);
  const actualAuto = results.filter(
    (item) =>
      item.actual.classification === "AUTO" ||
      item.actual.classification === "AUTO_COMPOSITE",
  );
  const autoCorrect = actualAuto.filter((item) => item.correct).length;
  const autoRate =
    actualAuto.length === 0 ? null : round(autoCorrect / actualAuto.length);
  const risky = results.filter((item) => item.risky);
  const riskyPassed = risky.filter(
    (item) =>
      item.actual.classification === "STAFF_ONLY" && item.actual.failClosed,
  ).length;
  const authority = results.filter((item) => item.authorityFailure);
  const authorityPassed = authority.filter(
    (item) =>
      item.actual.classification === "STAFF_ONLY" && item.actual.failClosed,
  ).length;
  const unsupportedClaims = countFinding(results, "UNSUPPORTED_CLAIM");
  const leakage = countFinding(results, "PII_OR_RAW_INPUT_LEAKAGE");
  const falseAutoDetails: FalseAutoDetail[] = results
    .filter((item) => item.falseAuto)
    .map((item) => ({
      caseId: item.caseId,
      primaryBucket: item.primaryBucket,
      scenarioFamily: item.scenarioFamily,
      tags: item.tags,
      sanitizedInput: item.sanitizedInput,
      expected: item.expected,
      actual: item.actual,
      reasonCodes: item.findings.map(
        (finding) => `${finding.code}:${finding.detailCode}`,
      ),
    }));
  const riskFailureDetails: FalseAutoDetail[] = risky
    .filter(
      (item) =>
        item.actual.classification !== "STAFF_ONLY" || !item.actual.failClosed,
    )
    .map((item) => ({
      caseId: item.caseId,
      primaryBucket: item.primaryBucket,
      scenarioFamily: item.scenarioFamily,
      tags: item.tags,
      sanitizedInput: item.sanitizedInput,
      expected: item.expected,
      actual: item.actual,
      reasonCodes: item.findings.map(
        (finding) => `${finding.code}:${finding.detailCode}`,
      ),
    }));
  const criteria = buildAcceptanceCriteria({
    cases,
    distinctness,
    autoDenominator: actualAuto.length,
    autoRate,
    riskyDenominator: risky.length,
    riskyPassed,
    authorityDenominator: authority.length,
    authorityPassed,
    unsupportedClaims,
    leakage,
    results,
    falseAutoDetails,
  });
  const semanticBody = {
    policyVersion: "2026.09.05-policy-v1" as const,
    policyChecksum: MP06_WP2_POLICY_CHECKSUM,
    datasetChecksum: sha256(canonicalJson(cases)),
    totalCases: cases.length,
    bucketCounts,
    expectedClassCounts,
    actualClassCounts,
    confusionMatrix,
    confusionMatrixRowRates,
    coverage: buildCoverage(cases),
    autoCorrectness: {
      valid: actualAuto.length > 0,
      correct: autoCorrect,
      denominator: actualAuto.length,
      rate: autoRate,
    },
    falseAutoCount: falseAutoDetails.length,
    falseAutoDetails,
    riskFailureDetails,
    riskyFailClosed: {
      passed: riskyPassed,
      denominator: risky.length,
      rate: rate(riskyPassed, risky.length),
    },
    unsupportedClaims,
    piiOrRawChatLeakage: leakage,
    authorityFailClosed: {
      passed: authorityPassed,
      denominator: authority.length,
      rate: rate(authorityPassed, authority.length),
    },
    distinctness,
    acceptanceCriteria: criteria,
    overallResult: criteria.every((item) => item.passed)
      ? ("PASS" as const)
      : ("WP2_BENCHMARK_FAILED" as const),
    knownLimitations: [
      "Synthetic deterministic cases do not prove free-form natural-language understanding.",
      "No AI provider, model, prompt, live LINE event, Cloudflare deployment or Production data is used.",
      "Planner evaluation is complemented by existing Worker/Durable Object regression tests; it is not a live end-to-end persistence test.",
      "Approved KB and Product Catalog are evaluated as frozen repository dependencies only.",
    ],
  };
  // Keep the frozen WP2 v1 checksum representation byte-for-byte compatible.
  // New WP4 provenance is deliberately outside this semantic result checksum.
  const resultChecksum = sha256(
    canonicalJson({
      sourceCommit: MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
      roadmapVersion: MP06_WP2_BENCHMARK_DEVELOPMENT_ROADMAP_VERSION,
      ...semanticBody,
    }),
  );
  return {
    schemaVersion: 2,
    runId: `mp06-wp2-${resultChecksum.slice(0, 16)}`,
    evaluationTimestamp: MP06_WP2_EVALUATION_TIMESTAMP,
    provenance: {
      benchmarkDevelopmentBaseCommit:
        MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
      runtimeImplementationCommit: MP06_WP3_RUNTIME_IMPLEMENTATION_COMMIT,
      executionControlCommit: MP06_WP4_EXECUTION_CONTROL_COMMIT,
      benchmarkDevelopmentRoadmapVersion:
        MP06_WP2_BENCHMARK_DEVELOPMENT_ROADMAP_VERSION,
      runtimeAuthorizationRoadmapVersion: "2026.09.05-v4",
      benchmarkCompletionRoadmapVersion: "2026.09.05-v5",
      deploymentStatus: "NOT_DEPLOYED",
      testDeployment: false,
      productionStatus: "NO_GO",
    },
    ...semanticBody,
    resultChecksum,
  };
}

export function renderBenchmarkReportMarkdown(report: BenchmarkReport): string {
  const matrixHeader = `| Expected \\ Actual | ${BENCHMARK_CLASSIFICATIONS.join(" | ")} |`;
  const matrixSeparator = `|---|${BENCHMARK_CLASSIFICATIONS.map(() => "---:").join("|")}|`;
  const matrixRows = BENCHMARK_CLASSIFICATIONS.map(
    (expected) =>
      `| ${expected} | ${BENCHMARK_CLASSIFICATIONS.map((actual) => report.confusionMatrix[expected][actual]).join(" | ")} |`,
  );
  const criteriaRows = report.acceptanceCriteria.map(
    (item) =>
      `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | ${String(item.actual)} | ${String(item.required)} |`,
  );
  const falseAuto =
    report.falseAutoDetails.length === 0
      ? "ไม่มี"
      : report.falseAutoDetails
          .map(
            (item) =>
              `- \`${item.caseId}\` (${item.primaryBucket}/${item.scenarioFamily}): expected ${item.expected.classification}, actual ${item.actual.classification}; ${item.reasonCodes.join(", ")}; synthetic: ${item.sanitizedInput}`,
          )
          .join("\n");
  const falseAutoByRisk = countValues(
    report.falseAutoDetails.flatMap((item) =>
      item.tags.filter((tag) =>
        ["DELIVERY_FEE", "LOYALTY_BALANCE"].includes(tag),
      ),
    ),
  );
  const nonAutoRiskFailures = report.riskFailureDetails.filter(
    (item) =>
      item.actual.classification !== "AUTO" &&
      item.actual.classification !== "AUTO_COMPOSITE",
  );
  return `# MP-06 WP2 — Deterministic Benchmark Report

ผลรวม: **${report.overallResult}**

- Run: \`${report.runId}\`
- Evaluation timestamp (fixed): \`${report.evaluationTimestamp}\`
- Benchmark development base commit: \`${report.provenance.benchmarkDevelopmentBaseCommit}\`
- Runtime implementation commit under test: \`${report.provenance.runtimeImplementationCommit}\`
- WP4 execution control commit: \`${report.provenance.executionControlCommit}\`
- Roadmaps (benchmark/runtime/WP4): \`${report.provenance.benchmarkDevelopmentRoadmapVersion}\` / \`${report.provenance.runtimeAuthorizationRoadmapVersion}\` / \`${report.provenance.benchmarkCompletionRoadmapVersion}\`
- Policy: \`${report.policyVersion}\`
- Policy checksum: \`${report.policyChecksum}\`
- Dataset checksum: \`${report.datasetChecksum}\`
- Semantic result checksum: \`${report.resultChecksum}\`
- Deployment: \`${report.provenance.deploymentStatus}\`; TEST deployment=\`${String(report.provenance.testDeployment)}\`; Production=\`${report.provenance.productionStatus}\`

## จำนวนกรณี

รวม ${report.totalCases.toLocaleString("en-US")} กรณี: Functional ${report.bucketCounts.FUNCTIONAL.toLocaleString("en-US")}, Thai variation ${report.bucketCounts.THAI_LANGUAGE_VARIATION.toLocaleString("en-US")}, Adversarial/safety ${report.bucketCounts.ADVERSARIAL_SAFETY.toLocaleString("en-US")}

## Metrics

- AUTO correctness: ${formatRate(report.autoCorrectness.rate)} (${report.autoCorrectness.correct}/${report.autoCorrectness.denominator})
- False-AUTO: ${report.falseAutoCount}
- Risky/fail-closed: ${formatRate(report.riskyFailClosed.rate)} (${report.riskyFailClosed.passed}/${report.riskyFailClosed.denominator})
- Authority fail-closed: ${formatRate(report.authorityFailClosed.rate)} (${report.authorityFailClosed.passed}/${report.authorityFailClosed.denominator})
- Unsupported claims: ${report.unsupportedClaims}
- PII/raw-chat leakage: ${report.piiOrRawChatLeakage}
- Duplicate normalized/semantic/anti-padding signatures: ${report.distinctness.duplicateNormalizedSignatures}/${report.distinctness.duplicateSemanticSignatures}/${report.distinctness.duplicateAntiPaddingSignatures}
- False-AUTO by risk: ${
    Object.entries(falseAutoByRisk)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ") || "none"
  }
- Non-AUTO risk failures: ${nonAutoRiskFailures.length}${
    nonAutoRiskFailures.length > 0
      ? ` (${nonAutoRiskFailures.map((item) => `${item.caseId}:${item.actual.classification}`).join(", ")})`
      : ""
  }

## Confusion matrix

${matrixHeader}
${matrixSeparator}
${matrixRows.join("\n")}

## Acceptance criteria

| Criterion | Result | Actual | Required |
|---|---|---:|---:|
${criteriaRows.join("\n")}

## False-AUTO details

${falseAuto}

## Known limitations

${report.knownLimitations.map((item) => `- ${item}`).join("\n")}

WP2 วัด WP1 deterministic runtime เท่านั้น ไม่ใช่หลักฐานว่า AI เข้าใจภาษาธรรมชาติ และไม่ใช่ TEST deployment/UAT หรือ Production readiness
`;
}

interface CriteriaInput {
  readonly cases: readonly BenchmarkCase[];
  readonly distinctness: DatasetValidation;
  readonly autoDenominator: number;
  readonly autoRate: number | null;
  readonly riskyDenominator: number;
  readonly riskyPassed: number;
  readonly authorityDenominator: number;
  readonly authorityPassed: number;
  readonly unsupportedClaims: number;
  readonly leakage: number;
  readonly results: readonly BenchmarkCaseResult[];
  readonly falseAutoDetails: readonly FalseAutoDetail[];
}

function buildAcceptanceCriteria(input: CriteriaInput): AcceptanceCriterion[] {
  const counts = countByKnown(
    input.cases.map((item) => item.primaryBucket),
    BENCHMARK_BUCKETS,
  );
  const falseAutoReported =
    input.falseAutoDetails.length ===
    input.results.filter((item) => item.falseAuto).length;
  return [
    criterion(
      "TOTAL_CASES",
      input.cases.length >= 5000,
      input.cases.length,
      ">=5000",
    ),
    criterion(
      "FUNCTIONAL_CASES",
      counts.FUNCTIONAL >= 3000,
      counts.FUNCTIONAL,
      ">=3000",
    ),
    criterion(
      "THAI_VARIATION_CASES",
      counts.THAI_LANGUAGE_VARIATION >= 1000,
      counts.THAI_LANGUAGE_VARIATION,
      ">=1000",
    ),
    criterion(
      "ADVERSARIAL_CASES",
      counts.ADVERSARIAL_SAFETY >= 1000,
      counts.ADVERSARIAL_SAFETY,
      ">=1000",
    ),
    criterion(
      "DATASET_SCHEMA_DISTINCTNESS_PII",
      input.distinctness.valid,
      input.distinctness.errors.length,
      "0 errors",
    ),
    criterion(
      "AUTO_DENOMINATOR_NONZERO",
      input.autoDenominator > 0,
      input.autoDenominator,
      ">0",
    ),
    criterion(
      "AUTO_CORRECTNESS",
      input.autoRate !== null && input.autoRate >= 0.98,
      input.autoRate ?? "INVALID",
      ">=0.98",
    ),
    criterion(
      "RISKY_FAIL_CLOSED",
      rate(input.riskyPassed, input.riskyDenominator) === 1,
      rate(input.riskyPassed, input.riskyDenominator),
      "1.0",
    ),
    criterion(
      "AUTHORITY_FAIL_CLOSED",
      rate(input.authorityPassed, input.authorityDenominator) === 1,
      rate(input.authorityPassed, input.authorityDenominator),
      "1.0",
    ),
    criterion(
      "UNSUPPORTED_CLAIMS",
      input.unsupportedClaims === 0,
      input.unsupportedClaims,
      "0",
    ),
    criterion("PII_RAW_CHAT_LEAKAGE", input.leakage === 0, input.leakage, "0"),
    criterion(
      "FALSE_AUTO_DETAILS_COMPLETE",
      falseAutoReported,
      input.falseAutoDetails.length,
      input.results.filter((item) => item.falseAuto).length,
    ),
  ];
}

function criterion(
  id: string,
  passed: boolean,
  actual: number | string,
  required: number | string,
): AcceptanceCriterion {
  return { id, passed, actual, required };
}

function buildConfusionMatrix(
  results: readonly BenchmarkCaseResult[],
): ConfusionMatrix {
  const matrix = emptyMatrix();
  for (const item of results) {
    matrix[item.expected.classification][item.actual.classification] += 1;
  }
  return matrix;
}

function buildMatrixRates(matrix: ConfusionMatrix): ConfusionMatrix {
  const output = emptyMatrix();
  for (const expected of BENCHMARK_CLASSIFICATIONS) {
    const denominator = BENCHMARK_CLASSIFICATIONS.reduce(
      (sum, actual) => sum + matrix[expected][actual],
      0,
    );
    for (const actual of BENCHMARK_CLASSIFICATIONS) {
      output[expected][actual] = rate(matrix[expected][actual], denominator);
    }
  }
  return output;
}

function emptyMatrix(): Record<
  BenchmarkClassification,
  Record<BenchmarkClassification, number>
> {
  return Object.fromEntries(
    BENCHMARK_CLASSIFICATIONS.map((expected) => [
      expected,
      Object.fromEntries(
        BENCHMARK_CLASSIFICATIONS.map((actual) => [actual, 0]),
      ),
    ]),
  ) as Record<BenchmarkClassification, Record<BenchmarkClassification, number>>;
}

function buildCoverage(
  cases: readonly BenchmarkCase[],
): BenchmarkReport["coverage"] {
  return {
    scenarioFamilies: countValues(cases.map((item) => item.scenarioFamily)),
    intents: countValues(cases.flatMap((item) => item.expected.intents)),
    tags: countValues(cases.flatMap((item) => item.tags)),
    authorityStates: countValues(cases.map((item) => item.authorityState)),
  };
}

function countValues(values: readonly string[]): Record<string, number> {
  const output: Record<string, number> = {};
  for (const value of values) output[value] = (output[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(output).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function countByKnown<T extends string>(
  values: readonly T[],
  keys: readonly T[],
): Record<T, number> {
  const output = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    T,
    number
  >;
  for (const value of values) output[value] += 1;
  return output;
}

function countFinding(
  results: readonly BenchmarkCaseResult[],
  code: BenchmarkCaseResult["findings"][number]["code"],
): number {
  return results.reduce(
    (sum, item) =>
      sum + item.findings.filter((finding) => finding.code === code).length,
    0,
  );
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatRate(value: number | null): string {
  return value === null ? "INVALID" : `${(value * 100).toFixed(2)}%`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function calculateSemanticResultChecksum(
  report: BenchmarkReport,
): string {
  const semanticFields = { ...report } as Record<string, unknown>;
  for (const field of [
    "schemaVersion",
    "runId",
    "evaluationTimestamp",
    "provenance",
    "resultChecksum",
    "sourceCommit",
    "gitCommit",
    "artifactCommit",
  ]) {
    delete semanticFields[field];
  }
  return sha256(
    canonicalJson({
      sourceCommit: MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
      roadmapVersion: MP06_WP2_BENCHMARK_DEVELOPMENT_ROADMAP_VERSION,
      ...semanticFields,
    }),
  );
}

export function validateBenchmarkReportEvidence(report: unknown): string[] {
  if (!isRecord(report)) return ["MP06_WP4_REPORT_INVALID"];
  const errors: string[] = [];
  if (report.schemaVersion !== 2)
    errors.push("MP06_WP4_SCHEMA_VERSION_INVALID");
  for (const field of ["sourceCommit", "gitCommit", "artifactCommit"]) {
    if (field in report) errors.push("MP06_WP4_AMBIGUOUS_COMMIT_FIELD");
  }

  const provenance = report.provenance;
  if (!isRecord(provenance)) {
    errors.push("MP06_WP4_PROVENANCE_MISSING");
  } else {
    const expected: Readonly<Record<string, unknown>> = {
      benchmarkDevelopmentBaseCommit:
        MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
      runtimeImplementationCommit: MP06_WP3_RUNTIME_IMPLEMENTATION_COMMIT,
      executionControlCommit: MP06_WP4_EXECUTION_CONTROL_COMMIT,
      benchmarkDevelopmentRoadmapVersion:
        MP06_WP2_BENCHMARK_DEVELOPMENT_ROADMAP_VERSION,
      runtimeAuthorizationRoadmapVersion: "2026.09.05-v4",
      benchmarkCompletionRoadmapVersion: "2026.09.05-v5",
      deploymentStatus: "NOT_DEPLOYED",
      testDeployment: false,
      productionStatus: "NO_GO",
    };
    if (
      Object.keys(provenance).length !== Object.keys(expected).length ||
      Object.entries(expected).some(([key, value]) => provenance[key] !== value)
    ) {
      errors.push("MP06_WP4_PROVENANCE_INVALID");
    }
    if ("artifactCommit" in provenance) {
      errors.push("MP06_WP4_SELF_REFERENTIAL_ARTIFACT_COMMIT");
    }
  }

  if (report.policyVersion !== "2026.09.05-policy-v1") {
    errors.push("MP06_WP4_POLICY_VERSION_INVALID");
  }
  if (report.policyChecksum !== MP06_WP2_POLICY_CHECKSUM) {
    errors.push("MP06_WP4_POLICY_CHECKSUM_INVALID");
  }
  if (report.datasetChecksum !== MP06_WP2_DATASET_CHECKSUM) {
    errors.push("MP06_WP4_DATASET_CHECKSUM_INVALID");
  }
  if (report.resultChecksum !== MP06_WP4_EXPECTED_PASS_RESULT_CHECKSUM) {
    errors.push("MP06_WP4_RESULT_CHECKSUM_INVALID");
  } else if (
    calculateSemanticResultChecksum(report as unknown as BenchmarkReport) !==
    report.resultChecksum
  ) {
    errors.push("MP06_WP4_RESULT_CHECKSUM_NOT_REPRODUCIBLE");
  }

  return [...new Set(errors)].sort();
}

export function canonicalJson(value: unknown): string {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
