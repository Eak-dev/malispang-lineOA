import { checkTextFile, writeTextFile } from "../benchmark/mp-06/io.js";
import { runMp06Benchmark } from "../benchmark/mp-06/runner.js";

const DATASET_PATH = "artifacts/mp-06/benchmark-dataset.json";
const REPORT_PATH = "artifacts/mp-06/benchmark-report.json";
const MARKDOWN_PATH = "docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_REPORT.md";

const mode = process.argv[2];
if (mode !== "generate" && mode !== "check") {
  console.error("Usage: run-mp-06-benchmark.ts <generate|check>");
  process.exitCode = 2;
} else {
  await main(mode);
}

async function main(mode: "generate" | "check"): Promise<void> {
  const run = await runMp06Benchmark();
  const artifacts = [
    [DATASET_PATH, run.datasetJson],
    [REPORT_PATH, run.reportJson],
    [MARKDOWN_PATH, run.reportMarkdown],
  ] as const;
  const artifactErrors: string[] = [];
  if (mode === "generate") {
    for (const [path, content] of artifacts) await writeTextFile(path, content);
  } else {
    for (const [path, content] of artifacts) {
      const error = await checkTextFile(path, content);
      if (error) artifactErrors.push(error);
    }
  }
  const report = run.report;
  console.log(
    [
      `MP-06 WP2 ${report.overallResult}`,
      `cases=${report.totalCases}`,
      `buckets=${report.bucketCounts.FUNCTIONAL}/${report.bucketCounts.THAI_LANGUAGE_VARIATION}/${report.bucketCounts.ADVERSARIAL_SAFETY}`,
      `auto=${report.autoCorrectness.rate ?? "INVALID"}`,
      `falseAuto=${report.falseAutoCount}`,
      `risk=${report.riskyFailClosed.rate}`,
      `authority=${report.authorityFailClosed.rate}`,
      `unsupported=${report.unsupportedClaims}`,
      `leakage=${report.piiOrRawChatLeakage}`,
      `checksum=${report.resultChecksum}`,
    ].join(" "),
  );
  if (artifactErrors.length > 0) {
    console.error(artifactErrors.join("\n"));
    process.exitCode = 1;
  }
  if (report.overallResult !== "PASS") process.exitCode = 1;
}
