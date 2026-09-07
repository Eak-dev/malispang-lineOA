import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import {
  renderRichMenuPreview,
  type PreviewMap,
} from "../scripts/generate-rich-menu-preview.js";
import {
  validateActiveBenchmarkTimeoutContract,
  validateMp06PilotRuntimeSources,
  validateSyntheticReadinessFixtures,
  validateTestReadinessControls,
  validateValidationChainScripts,
} from "../src/mp-06-test-readiness.js";

const root = new URL("../", import.meta.url);
let controls: unknown;
let fixtures: unknown;
let currentWork: unknown;
let benchmarkSource: string;
let packageManifest: { scripts: Record<string, string> };
let previewMap: PreviewMap;
let committedPreview: string;
let wranglerSource: string;
let pilotSource: string;
let durableSource: string;
let workerSource: string;

beforeAll(async () => {
  [
    controls,
    fixtures,
    currentWork,
    benchmarkSource,
    packageManifest,
    previewMap,
    committedPreview,
    wranglerSource,
    pilotSource,
    durableSource,
    workerSource,
  ] = await Promise.all([
    readJson("config/mp-06/test-readiness-controls.json"),
    readJson("config/mp-06/test-readiness-fixtures.json"),
    readJson("config/project/current-work.json"),
    readFile(new URL("tests/mp-06-wp2-benchmark.test.ts", root), "utf8"),
    readJson("package.json") as Promise<{ scripts: Record<string, string> }>,
    readJson(
      "docs/line-oa/production-mirror/test-rich-menu-action-map.json",
    ) as Promise<PreviewMap>,
    readFile(new URL("artifacts/rich-menu-preview.html", root), "utf8"),
    readFile(new URL("wrangler.jsonc", root), "utf8"),
    readFile(new URL("worker/mp-06-pilot-control.ts", root), "utf8"),
    readFile(new URL("worker/durable-objects.ts", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
  ]);
});

describe("MP-06 WP6 TEST-readiness controls", () => {
  it("accepts the frozen TEST-only rate, alert, stop and rollback contract", () => {
    expect(validateTestReadinessControls(controls)).toEqual([]);
  });

  it("fails closed on missing or malformed TEST limits", () => {
    const missing = clone(controls) as { pilotBudget?: unknown };
    delete missing.pilotBudget;
    expect(validateTestReadinessControls(missing)).toContain(
      "TEST_PILOT_BUDGET_MISSING",
    );

    const malformed = clone(controls) as {
      pilotBudget: { maximumAcceptedWebhookEventsPerMinute: number };
    };
    malformed.pilotBudget.maximumAcceptedWebhookEventsPerMinute = 0;
    expect(validateTestReadinessControls(malformed)).toContain(
      "TEST_MINUTE_RATE_INVALID",
    );
  });

  it("rejects Production fallback, namespace collision and unsafe stop impact", () => {
    const changed = clone(controls) as {
      workerName: string;
      productionFallbackAllowed: boolean;
      stopControl: { productionImpact: string; testNamespaceOnly: boolean };
    };
    changed.workerName = "malispang-lineoa";
    changed.productionFallbackAllowed = true;
    changed.stopControl.productionImpact = "UNKNOWN";
    changed.stopControl.testNamespaceOnly = false;
    expect(validateTestReadinessControls(changed)).toEqual(
      expect.arrayContaining([
        "TEST_WORKER_NAME_INVALID",
        "PRODUCTION_FALLBACK_MUST_BE_FALSE",
        "TEST_STOP_PRODUCTION_IMPACT_INVALID",
        "TEST_STOP_NAMESPACE_INVALID",
      ]),
    );
  });

  it("keeps validation errors code-only without echoing sensitive input", () => {
    const marker = "SENSITIVE_TEST_MARKER_DO_NOT_ECHO";
    const changed = clone(controls) as { accountName: string };
    changed.accountName = marker;
    const output = validateTestReadinessControls(changed).join(",");
    expect(output).toContain("TEST_ACCOUNT_NAME_INVALID");
    expect(output).not.toContain(marker);
  });

  it("freezes rollback owner, executor, target and unrehearsed state", () => {
    const record = controls as {
      rollback: Record<string, unknown>;
      stopControl: Record<string, unknown>;
    };
    expect(record.rollback).toMatchObject({
      workerName: "malispang-lineoa-test",
      rollbackTargetVersionNumber: 21,
      rollbackTargetVersionId: "3e02e79b-29c9-46cf-9218-ed2d0b7d7655",
      decisionOwnerRole: "OWNER_PO",
      executorRole: "TEST_DEPLOYMENT_OPERATOR",
      maximumDecisionMinutes: 5,
      maximumRecoveryMinutes: 15,
      rehearsalStatus: "NOT_PERFORMED",
      productionImpact: "NONE",
    });
    expect(record.stopControl).toMatchObject({
      killSwitchProcedure:
        "AUTHENTICATED_TEST_ADMIN_STOP_THEN_DISABLE_TEST_WEBHOOK_IF_REQUIRED",
      testNamespaceOnly: true,
      productionImpact: "NONE",
    });
  });

  it("requires persistent atomic runtime enforcement rather than metadata alone", () => {
    const record = controls as {
      pilotBudget: Record<string, unknown>;
      runtimeContract: Record<string, unknown>;
    };
    expect(record.pilotBudget).toMatchObject({
      maximumAcceptedWebhookEventsPerSession: 200,
      maximumProviderAttemptsPerSession: 200,
      maximumBudgetMicroUsd: 5_000_000,
      maximumConcurrentProviderRequests: 1,
      runtimeRateLimiterPresent: true,
    });
    expect(record.runtimeContract).toMatchObject({
      coordinatorBinding: "CONVERSATION_STATE",
      storage: "SQLITE_DURABLE_OBJECT",
      atomicBoundary: "TRANSACTION_SYNC",
      featureDefault: "OFF_WITHOUT_ACTIVE_AUTHENTICATED_SESSION",
      testerReferencesCommitted: false,
    });
  });

  it("detects runtime/config drift and forbids static AI enablement", () => {
    expect(
      validateMp06PilotRuntimeSources(
        wranglerSource,
        pilotSource,
        durableSource,
        workerSource,
      ),
    ).toEqual([]);
    expect(
      validateMp06PilotRuntimeSources(
        `${wranglerSource}\n"MP06_AI_NLU_ENABLED": "true"`,
        pilotSource,
        durableSource,
        workerSource,
      ),
    ).toContain("WP8A_STATIC_AI_ENABLE_FORBIDDEN");
  });
});

describe("MP-06 WP6 synthetic smoke/UAT fixtures", () => {
  it("covers every required safety path with synthetic-only fixtures", () => {
    expect(validateSyntheticReadinessFixtures(fixtures)).toEqual([]);
  });

  it("rejects Production targeting, Owner-UAT overstatement and obvious PII", () => {
    const changed = clone(fixtures) as {
      productionRequestsAllowed: boolean;
      ownerUatStatus: string;
      fixtures: Array<{ syntheticInput: string }>;
    };
    changed.productionRequestsAllowed = true;
    changed.ownerUatStatus = "PASSED";
    changed.fixtures[0]!.syntheticInput = "ติดต่อ 0812345678";
    expect(validateSyntheticReadinessFixtures(changed)).toEqual(
      expect.arrayContaining([
        "PRODUCTION_REQUESTS_MUST_BE_FALSE",
        "OWNER_UAT_MUST_NOT_BE_OVERSTATED",
        "SYNTHETIC_FIXTURE_FORBIDDEN_DATA",
      ]),
    );
  });

  it("rejects duplicate fixtures and missing required behavior coverage", () => {
    const changed = clone(fixtures) as {
      fixtures: Array<{ fixtureId: string; coverage: string[] }>;
    };
    changed.fixtures[1]!.fixtureId = changed.fixtures[0]!.fixtureId;
    for (const fixture of changed.fixtures) {
      fixture.coverage = fixture.coverage.filter(
        (tag) => tag !== "KILL_SWITCH",
      );
    }
    expect(validateSyntheticReadinessFixtures(changed)).toEqual(
      expect.arrayContaining([
        "SYNTHETIC_FIXTURE_ID_DUPLICATE",
        "SYNTHETIC_FIXTURE_COVERAGE_MISSING_KILL_SWITCH",
      ]),
    );
  });
});

describe("MP-06 WP6 timeout metadata and validation-chain idempotence", () => {
  it("matches active 300-second and two 15-second watchdogs", () => {
    expect(
      validateActiveBenchmarkTimeoutContract(currentWork, benchmarkSource),
    ).toEqual([]);
  });

  it("detects metadata or source watchdog drift", () => {
    const changed = clone(currentWork) as {
      localClosureRemediationPlan: {
        benchmarkTestTimeoutContract: { currentTimeoutMs: number };
      };
    };
    changed.localClosureRemediationPlan.benchmarkTestTimeoutContract.currentTimeoutMs = 120_000;
    expect(
      validateActiveBenchmarkTimeoutContract(
        changed,
        benchmarkSource.replace("300_000", "120_000"),
      ),
    ).toEqual(
      expect.arrayContaining([
        "ACTIVE_HOOK_TIMEOUT_DRIFT",
        "BENCHMARK_HOOK_WATCHDOG_SOURCE_DRIFT",
      ]),
    );
  });

  it("keeps preview generation before formatting and all mandatory gates", () => {
    expect(validateValidationChainScripts(packageManifest.scripts)).toEqual([]);
    const check = packageManifest.scripts.check;
    expect(check).toBeDefined();
    expect(check!.indexOf("pnpm preview:rich-menu")).toBeLessThan(
      check!.indexOf("pnpm format:check"),
    );
  });

  it("renders the Rich Menu preview canonically and byte-identically", async () => {
    const first = await renderRichMenuPreview(previewMap);
    const second = await renderRichMenuPreview(previewMap);
    expect(first).toBe(second);
    expect(first).toBe(committedPreview);
  });
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
