import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";
import { format } from "prettier";

import { buildBenchmarkCases } from "../benchmark/mp-06/case-builder.js";
import {
  forbiddenDataCodes,
  validateBenchmarkDataset,
} from "../benchmark/mp-06/dataset-validation.js";
import { evaluateCase } from "../benchmark/mp-06/evaluator.js";
import {
  buildBenchmarkReport,
  calculateSemanticResultChecksum,
  MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
  MP06_WP3_RUNTIME_IMPLEMENTATION_COMMIT,
  MP06_WP4_EXECUTION_CONTROL_COMMIT,
  MP06_WP4_EXPECTED_PASS_RESULT_CHECKSUM,
  renderBenchmarkReportMarkdown,
  validateBenchmarkReportEvidence,
} from "../benchmark/mp-06/report.js";
import { runMp06Benchmark } from "../benchmark/mp-06/runner.js";
import { runSafetyChecks } from "../benchmark/mp-06/safety-checks.js";
import type {
  BenchmarkActual,
  BenchmarkCase,
  BenchmarkCaseResult,
  BenchmarkReport,
  DatasetValidation,
} from "../benchmark/mp-06/types.js";
import { BENCHMARK_CLASSIFICATIONS } from "../benchmark/mp-06/types.js";

describe("MP-06 WP2 deterministic benchmark dataset", () => {
  const cases = buildBenchmarkCases();
  const validation = validateBenchmarkDataset(cases);

  it("builds exactly 5,000 single-bucket PII-free cases at the required ratios", () => {
    expect(cases).toHaveLength(5000);
    expect(validation.bucketCounts).toEqual({
      FUNCTIONAL: 3000,
      THAI_LANGUAGE_VARIATION: 1000,
      ADVERSARIAL_SAFETY: 1000,
    });
    expect(validation.forbiddenDataFindings).toBe(0);
    expect(cases.every((item) => typeof item.primaryBucket === "string")).toBe(
      true,
    );
  });

  it("enforces case/signature uniqueness and the meaningful-distinctness gate", () => {
    expect(validation).toMatchObject({
      valid: true,
      duplicateCaseIds: 0,
      duplicateNormalizedSignatures: 0,
      duplicateSemanticSignatures: 0,
      duplicateAntiPaddingSignatures: 0,
    });
    const duplicate = [...cases, { ...cases[0]!, caseId: "MP06-F-9999" }];
    expect(validateBenchmarkDataset(duplicate).valid).toBe(false);
    expect(
      validateBenchmarkDataset(duplicate).errors.some((code) =>
        code.includes("SIGNATURE_DUPLICATE"),
      ),
    ).toBe(true);
  });

  it("covers every policy class and the required runtime/safety dimensions", () => {
    expect(new Set(cases.map((item) => item.expected.classification))).toEqual(
      new Set(BENCHMARK_CLASSIFICATIONS),
    );
    for (const tag of [
      "AUTO_COMPOSITE_2",
      "AUTO_COMPOSITE_3",
      "AUTO_COMPOSITE_OVERFLOW",
      "T-C01",
      "T-C04",
      "I-22",
      "DUPLICATE_EVENT",
      "HANDOFF_SILENCE",
      "ACKNOWLEDGEMENT_ONCE",
      "DRAFT_ORDER_PROTECTED_FLOW",
      "ATOMIC_CANCELLATION",
      "PROMPT_INJECTION",
      "AUTHORITY_FAILURE",
    ]) {
      expect(validation.coverageTags[tag], tag).toBeGreaterThan(0);
    }
  });

  it("keeps the expected-result oracle independent from the System Under Test", async () => {
    for (const path of [
      "benchmark/mp-06/scenarios.ts",
      "benchmark/mp-06/case-builder.ts",
    ]) {
      const source = await readFile(path, "utf8");
      expect(source).not.toMatch(
        /worker\/mp-06-wp1|conversation-intents|planMp06Wp1Text/u,
      );
    }
  });

  it("rejects forbidden raw payload, credential and PII shapes", () => {
    expect(
      forbiddenDataCodes({ syntheticInput: "เบอร์ 0812345678" }),
    ).toContain("PHONE_NUMBER");
    expect(forbiddenDataCodes({ replyToken: "TEST_ONLY" })).toContain(
      "WEBHOOK_PAYLOAD",
    );
    expect(
      forbiddenDataCodes({ syntheticInput: "[TEST_PHONE_REDACTED]" }),
    ).toEqual([]);
  });
});

describe("MP-06 WP2 evaluator and reports", () => {
  let run: Awaited<ReturnType<typeof runMp06Benchmark>>;

  beforeAll(async () => {
    run = await runMp06Benchmark();
  }, 120_000);

  it("evaluates exact single/composite/overflow/PRICE/clarification behavior", async () => {
    for (const family of [
      "PRICE_UNIQUE_NORMAL",
      "PRICE_UNIQUE_SMALL",
      "PRICE_MISSING_PRODUCT",
      "PRICE_AMBIGUOUS_SIZE",
      "OVERFLOW_FOUR_UNITS",
      "CLARIFICATION_BUDGET_EXHAUSTED",
      "DUPLICATE_EVENT",
      "HANDOFF_SILENCE",
      "STATIC_UNIT_DEDUPLICATION",
    ]) {
      const item = run.cases.find(
        (candidate) => candidate.scenarioFamily === family,
      );
      expect(item, family).toBeDefined();
      const result = await evaluateCase(item!);
      expect(result.findings, family).toEqual([]);
      expect(JSON.stringify(result.actual)).not.toContain(item!.syntheticInput);
    }
  });

  it("produces a complete confusion matrix and every false-AUTO detail", () => {
    const report = run.report;
    const matrixTotal = BENCHMARK_CLASSIFICATIONS.reduce(
      (outer, expected) =>
        outer +
        BENCHMARK_CLASSIFICATIONS.reduce(
          (inner, actual) => inner + report.confusionMatrix[expected][actual],
          0,
        ),
      0,
    );
    expect(matrixTotal).toBe(5000);
    expect(report.falseAutoDetails).toHaveLength(report.falseAutoCount);
    expect(
      report.falseAutoDetails.every(
        (item) => item.caseId && item.reasonCodes.length > 0,
      ),
    ).toBe(true);
    expect(
      run.results.some((item) => item.actual.templateIds.includes("T-C03")),
    ).toBe(false);
    expect(
      run.results
        .filter((item) => item.authorityFailure)
        .every(
          (item) =>
            item.actual.classification === "STAFF_ONLY" &&
            item.actual.responseUnitCount === 0,
        ),
    ).toBe(true);
  });

  it("is reproducible and keeps volatile time outside the deterministic checksum", async () => {
    const validation = validateBenchmarkDataset(run.cases);
    const rebuilt = buildBenchmarkReport(run.cases, run.results, validation);
    expect(rebuilt.resultChecksum).toBe(run.report.resultChecksum);
    expect(
      await format(renderBenchmarkReportMarkdown(rebuilt), {
        parser: "markdown",
        proseWrap: "preserve",
      }),
    ).toBe(run.reportMarkdown);
  });

  it("records unambiguous three-layer provenance outside the semantic checksum", () => {
    expect(run.report.schemaVersion).toBe(2);
    expect(run.report.provenance).toEqual({
      benchmarkDevelopmentBaseCommit:
        MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
      runtimeImplementationCommit: MP06_WP3_RUNTIME_IMPLEMENTATION_COMMIT,
      executionControlCommit: MP06_WP4_EXECUTION_CONTROL_COMMIT,
      benchmarkDevelopmentRoadmapVersion: "2026.09.05-v3",
      runtimeAuthorizationRoadmapVersion: "2026.09.05-v4",
      benchmarkCompletionRoadmapVersion: "2026.09.05-v5",
      deploymentStatus: "NOT_DEPLOYED",
      testDeployment: false,
      productionStatus: "NO_GO",
    });
    expect(run.report.resultChecksum).toBe(
      MP06_WP4_EXPECTED_PASS_RESULT_CHECKSUM,
    );
    expect(calculateSemanticResultChecksum(run.report)).toBe(
      MP06_WP4_EXPECTED_PASS_RESULT_CHECKSUM,
    );
    expect(run.report).not.toHaveProperty("sourceCommit");
    expect(run.report).not.toHaveProperty("gitCommit");
    expect(run.report).not.toHaveProperty("artifactCommit");
  });

  it("keeps timestamp and provenance metadata outside the semantic checksum", () => {
    const changed = structuredClone(run.report) as unknown as {
      evaluationTimestamp: string;
      provenance: {
        executionControlCommit: string;
      };
    };
    changed.evaluationTimestamp = "2099-01-01T00:00:00Z";
    changed.provenance.executionControlCommit = "f".repeat(40);
    expect(
      calculateSemanticResultChecksum(changed as unknown as BenchmarkReport),
    ).toBe(run.report.resultChecksum);
  });

  it("validates generated machine provenance and rejects missing, invalid or circular fields", () => {
    const parsed = JSON.parse(run.reportJson) as unknown;
    expect(validateBenchmarkReportEvidence(parsed)).toEqual([]);

    const missing = structuredClone(parsed) as Record<string, unknown>;
    delete missing.provenance;
    expect(validateBenchmarkReportEvidence(missing)).toContain(
      "MP06_WP4_PROVENANCE_MISSING",
    );

    const ambiguous = {
      ...(structuredClone(parsed) as Record<string, unknown>),
      sourceCommit: MP06_WP2_BENCHMARK_DEVELOPMENT_BASE_COMMIT,
    };
    expect(validateBenchmarkReportEvidence(ambiguous)).toContain(
      "MP06_WP4_AMBIGUOUS_COMMIT_FIELD",
    );

    const circular = structuredClone(parsed) as {
      provenance: Record<string, unknown>;
    };
    circular.provenance.artifactCommit = "0".repeat(40);
    expect(validateBenchmarkReportEvidence(circular)).toEqual(
      expect.arrayContaining([
        "MP06_WP4_PROVENANCE_INVALID",
        "MP06_WP4_SELF_REFERENTIAL_ARTIFACT_COMMIT",
      ]),
    );
  });

  it("detects mutation sentinels for false AUTO, order, partial, template, unsupported output and leakage", () => {
    const baseCase = run.cases.find(
      (item) => item.scenarioFamily === "AUTO_COMPOSITE_2_UNIT_MATRIX",
    )!;
    const expectedActual = actualFromExpected(baseCase);
    const mutated: BenchmarkActual = {
      ...expectedActual,
      classification: "AUTO",
      intents: [...expectedActual.intents].reverse(),
      templateIds: ["UNAPPROVED:TEMPLATE"],
      responseUnitCount: 1,
      responseFingerprint: baseCase.syntheticInput,
      unitFingerprints: [baseCase.syntheticInput],
    };
    const findings = runSafetyChecks({
      benchmarkCase: baseCase,
      actual: mutated,
      messages: [{ type: "text", text: "unsupported synthetic output" }],
      expectedMessages: [],
      expectedUnitFingerprints: [],
      retryFingerprintMatch: false,
    });
    expect(findings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "CLASSIFICATION_MISMATCH",
        "INTENT_SET_OR_ORDER_MISMATCH",
        "TEMPLATE_MISMATCH",
        "RESPONSE_UNIT_COUNT_MISMATCH",
        "UNSUPPORTED_CLAIM",
        "PII_OR_RAW_INPUT_LEAKAGE",
        "FINGERPRINT_INVALID",
        "DUPLICATE_RETRY_MISMATCH",
      ]),
    );
  });

  it("enforces 98% AUTO, 100% risk/authority, zero unsupported and zero leakage thresholds", () => {
    const templateCase = run.cases.find(
      (item) => item.expected.classification === "AUTO",
    )!;
    const oneHundredCases = Array.from({ length: 100 }, (_, index) => ({
      ...templateCase,
      caseId: `SENTINEL-${index}`,
    }));
    const correct = oneHundredCases.map((item) => correctResult(item));
    const at98 = correct.map((item, index) =>
      index < 2 ? incorrectAutoResult(item) : item,
    );
    const below98 = correct.map((item, index) =>
      index < 3 ? incorrectAutoResult(item) : item,
    );
    expect(
      criterion(reportFor(oneHundredCases, at98), "AUTO_CORRECTNESS").passed,
    ).toBe(true);
    expect(
      criterion(reportFor(oneHundredCases, below98), "AUTO_CORRECTNESS").passed,
    ).toBe(false);

    const riskyCase = { ...templateCase, tags: ["RISK"] };
    const riskyWrong = incorrectAutoResult(correctResult(riskyCase));
    expect(
      criterion(reportFor([riskyCase], [riskyWrong]), "RISKY_FAIL_CLOSED")
        .passed,
    ).toBe(false);

    const unsupported = withFinding(
      correctResult(templateCase),
      "UNSUPPORTED_CLAIM",
    );
    expect(
      criterion(reportFor([templateCase], [unsupported]), "UNSUPPORTED_CLAIMS")
        .passed,
    ).toBe(false);
    const leaked = withFinding(
      correctResult(templateCase),
      "PII_OR_RAW_INPUT_LEAKAGE",
    );
    expect(
      criterion(reportFor([templateCase], [leaked]), "PII_RAW_CHAT_LEAKAGE")
        .passed,
    ).toBe(false);

    const authorityCase = { ...templateCase, tags: ["AUTHORITY_FAILURE"] };
    const authorityWrong = incorrectAutoResult(correctResult(authorityCase));
    expect(
      criterion(
        reportFor([authorityCase], [authorityWrong]),
        "AUTHORITY_FAIL_CLOSED",
      ).passed,
    ).toBe(false);
  });

  it("marks the overall result failed exactly when an acceptance gate fails", () => {
    expect(run.report.overallResult).toBe(
      run.report.acceptanceCriteria.every((item) => item.passed)
        ? "PASS"
        : "WP2_BENCHMARK_FAILED",
    );
  });
});

function actualFromExpected(item: BenchmarkCase): BenchmarkActual {
  return {
    classification: item.expected.classification,
    intents: item.expected.intents,
    templateIds: item.expected.templateIds,
    responseUnitCount: item.expected.responseUnitCount,
    ...(item.expected.clarificationTemplateId
      ? { clarificationTemplateId: item.expected.clarificationTemplateId }
      : {}),
    failClosed: item.expected.failClosed,
    handoffAcknowledgementCount: item.expected.handoffAcknowledgementCount,
    silent: item.expected.silent,
    responseFingerprint: "a".repeat(64),
    unitFingerprints: item.expected.intents.map(() => "b".repeat(64)),
    messageHashes: [],
    ...(item.expected.priceBinding
      ? {
          priceBinding: {
            sku: item.expected.priceBinding.sku,
            displayName: item.expected.priceBinding.displayName,
            displaySize: item.expected.priceBinding.displaySize,
            catalogPrice: item.expected.priceBinding.catalogPrice,
          },
        }
      : {}),
  };
}

function correctResult(item: BenchmarkCase): BenchmarkCaseResult {
  return {
    caseId: item.caseId,
    primaryBucket: item.primaryBucket,
    scenarioFamily: item.scenarioFamily,
    tags: item.tags,
    sanitizedInput: "synthetic",
    expected: item.expected,
    actual: actualFromExpected(item),
    findings: [],
    correct: true,
    falseAuto: false,
    risky: item.tags.includes("RISK"),
    authorityFailure: item.tags.includes("AUTHORITY_FAILURE"),
  };
}

function incorrectAutoResult(item: BenchmarkCaseResult): BenchmarkCaseResult {
  return {
    ...item,
    findings: [{ code: "TEMPLATE_MISMATCH", detailCode: "MUTATION_SENTINEL" }],
    correct: false,
    falseAuto: true,
  };
}

function withFinding(
  item: BenchmarkCaseResult,
  code: BenchmarkCaseResult["findings"][number]["code"],
): BenchmarkCaseResult {
  return {
    ...item,
    findings: [{ code, detailCode: "MUTATION_SENTINEL" }],
    correct: false,
  };
}

function reportFor(
  cases: readonly BenchmarkCase[],
  results: readonly BenchmarkCaseResult[],
): BenchmarkReport {
  return buildBenchmarkReport(cases, results, validDatasetStub());
}

function criterion(report: BenchmarkReport, id: string) {
  const item = report.acceptanceCriteria.find(
    (candidate) => candidate.id === id,
  );
  if (!item) throw new Error(`TEST_CRITERION_NOT_FOUND:${id}`);
  return item;
}

function validDatasetStub(): DatasetValidation {
  return {
    valid: true,
    errors: [],
    bucketCounts: {
      FUNCTIONAL: 3000,
      THAI_LANGUAGE_VARIATION: 1000,
      ADVERSARIAL_SAFETY: 1000,
    },
    duplicateCaseIds: 0,
    duplicateNormalizedSignatures: 0,
    duplicateSemanticSignatures: 0,
    duplicateAntiPaddingSignatures: 0,
    forbiddenDataFindings: 0,
    coverageTags: {},
  };
}
