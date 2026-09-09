import policySnapshot from "../../config/mp-06/policy-snapshot.json" with { type: "json" };
import { format } from "prettier";
import { validateMp06PolicySnapshot } from "../../src/mp-06-policy-snapshot.js";
import { buildBenchmarkCases } from "./case-builder.js";
import { validateBenchmarkDataset } from "./dataset-validation.js";
import { evaluateBenchmark } from "./evaluator.js";
import {
  buildBenchmarkReport,
  renderBenchmarkReportMarkdown,
  validateBenchmarkReportEvidence,
} from "./report.js";
import { serializeDeterministic } from "./io.js";
import type { BenchmarkCase, BenchmarkReport } from "./types.js";
import type { BenchmarkCaseResult } from "./types.js";

export interface BenchmarkRun {
  readonly cases: readonly BenchmarkCase[];
  readonly results: readonly BenchmarkCaseResult[];
  readonly report: BenchmarkReport;
  readonly datasetJson: string;
  readonly reportJson: string;
  readonly reportMarkdown: string;
}

export async function runMp06Benchmark(): Promise<BenchmarkRun> {
  const policyValidation = validateMp06PolicySnapshot(policySnapshot);
  if (policyValidation.errors.length > 0) {
    throw new Error("MP06_WP2_POLICY_CHECKSUM_OR_CONTENT_INVALID");
  }
  const cases = buildBenchmarkCases();
  const datasetValidation = validateBenchmarkDataset(cases);
  const results = await evaluateBenchmark(cases);
  const report = buildBenchmarkReport(cases, results, datasetValidation);
  const evidenceErrors = validateBenchmarkReportEvidence(report);
  if (evidenceErrors.length > 0) {
    throw new Error(`MP06_WP4_EVIDENCE_INVALID:${evidenceErrors.join(",")}`);
  }
  const datasetJson = await format(
    serializeDeterministic({
      schemaVersion: 1,
      datasetId: "MP-06-WP2-5000-PII-FREE",
      policyVersion: "2026.09.05-policy-v1",
      policyChecksum:
        "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0",
      cases,
    }),
    { parser: "json" },
  );
  const reportJson = await format(serializeDeterministic(report), {
    parser: "json",
  });
  const reportMarkdown = await format(renderBenchmarkReportMarkdown(report), {
    parser: "markdown",
    proseWrap: "preserve",
  });
  return {
    cases,
    results,
    report,
    datasetJson,
    reportJson,
    reportMarkdown,
  };
}
