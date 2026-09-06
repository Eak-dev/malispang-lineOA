import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import {
  CANONICAL_GITHUB_ISSUES,
  evaluateProjectAction,
  validateProjectControl,
  validateSchemaDocuments,
} from "../src/project-control.js";

const root = new URL("../", import.meta.url);
let roadmap: unknown;
let currentWork: unknown;
let roadmapSchema: unknown;
let currentWorkSchema: unknown;

beforeAll(async () => {
  [roadmap, currentWork, roadmapSchema, currentWorkSchema] = await Promise.all([
    readJson("config/project/roadmap.json"),
    readJson("config/project/current-work.json"),
    readJson("config/project/roadmap.schema.json"),
    readJson("config/project/current-work.schema.json"),
  ]);
});

describe("MP-06 WP6-only TEST-readiness assessment control", () => {
  it("accepts the 2026.09.06-v3 control snapshot and records default-branch drift", () => {
    expect(validateProjectControl(roadmap, currentWork)).toEqual({
      errors: [],
      warnings: ["DEFAULT_BRANCH_DRIFT"],
    });
    expect(validateSchemaDocuments(roadmapSchema, currentWorkSchema)).toEqual(
      [],
    );
    const schema = currentWorkSchema as {
      properties: {
        currentPhase: { const: string };
        status: { const: string };
        authorization: {
          properties: {
            benchmarkWp2: { const: boolean };
            runtimeRemediationWp3: { const: boolean };
            benchmarkCompletionWp4: { const: boolean };
            localClosureRemediationWp5: { const: boolean };
            testReadinessAssessmentWp6: { const: boolean };
          };
        };
      };
    };
    expect(schema.properties.currentPhase.const).toBe(
      "WP6_TEST_READINESS_ASSESSMENT",
    );
    expect(schema.properties.status.const).toBe(
      "AUTHORIZED_TEST_READINESS_ASSESSMENT_WP6_ONLY",
    );
    expect(schema.properties.authorization.properties.benchmarkWp2.const).toBe(
      false,
    );
    expect(
      schema.properties.authorization.properties.runtimeRemediationWp3.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties.benchmarkCompletionWp4.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties.localClosureRemediationWp5
        .const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties.testReadinessAssessmentWp6
        .const,
    ).toBe(true);
  });

  it("keeps canonical work IDs mapped to immutable GitHub issues", () => {
    const record = roadmap as {
      items: Array<{ id: string; githubIssue: number }>;
    };
    expect(
      Object.fromEntries(
        record.items.map((item) => [item.id, item.githubIssue]),
      ),
    ).toEqual(CANONICAL_GITHUB_ISSUES);
  });

  it("authorizes only scoped WP6 TEST-readiness assessment work", () => {
    const record = currentWork as { allowedScope: string[] };
    expect(record.allowedScope).toContain(
      "MP_06_WP6_TEST_SECRET_NAMES_AND_PRESENCE_ONLY",
    );
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "TEST_READINESS_ASSESSMENT_WP6",
      ),
    ).toEqual({
      allowed: true,
      reason: "AUTHORIZED_BY_CURRENT_WORK",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "RUNTIME_WP1")).toEqual({
      allowed: false,
      reason: "RUNTIME_WP1_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "BENCHMARK_WP2"),
    ).toEqual({
      allowed: false,
      reason: "BENCHMARK_WP2_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "RUNTIME_REMEDIATION_WP3"),
    ).toEqual({
      allowed: false,
      reason: "RUNTIME_REMEDIATION_WP3_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "BENCHMARK_COMPLETION_WP4"),
    ).toEqual({
      allowed: false,
      reason: "BENCHMARK_COMPLETION_WP4_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "LOCAL_CLOSURE_REMEDIATION_WP5",
      ),
    ).toEqual({
      allowed: false,
      reason: "LOCAL_CLOSURE_REMEDIATION_WP5_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "POLICY_SNAPSHOT"),
    ).toEqual({
      allowed: false,
      reason: "POLICY_SNAPSHOT_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "LOCAL_IMPLEMENTATION"),
    ).toEqual({
      allowed: false,
      reason: "USE_SCOPED_TEST_READINESS_ASSESSMENT_WP6_ACTION",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "COMMIT").allowed).toBe(
      true,
    );
    expect(
      evaluateProjectAction(roadmap, currentWork, "PUSH_BRANCH").allowed,
    ).toBe(true);
    expect(
      evaluateProjectAction(roadmap, currentWork, "UPDATE_GITHUB_ROADMAP"),
    ).toEqual({
      allowed: true,
      reason: "AUTHORIZED_BY_CURRENT_WORK",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST")).toEqual({
      allowed: false,
      reason: "DEPLOY_TEST_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "CHANGE_PRODUCTION"),
    ).toEqual({
      allowed: false,
      reason: "CHANGE_PRODUCTION_NOT_AUTHORIZED",
    });
  });

  it("fails closed when Roadmap and current-work versions conflict", () => {
    const changed = clone(currentWork) as { roadmapVersion: string };
    changed.roadmapVersion = "2026.09.06-v2";
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "CURRENT_WORK_ROADMAP_VERSION_MISMATCH",
    );
    expect(
      evaluateProjectAction(roadmap, changed, "LOCAL_IMPLEMENTATION"),
    ).toEqual({
      allowed: false,
      reason: "ROADMAP_UNVERIFIED",
    });
  });

  it("requires the verified runtime baseline to contain MP-06", () => {
    const changed = clone(roadmap) as {
      verifiedLatestBaseline: { contains: string[] };
    };
    changed.verifiedLatestBaseline.contains =
      changed.verifiedLatestBaseline.contains.filter((id) => id !== "MP-06");
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "VERIFIED_BASELINE_MUST_CONTAIN_MP_06",
    );
  });

  it("fails closed when current work is missing or more than one item is current", () => {
    expect(validateProjectControl(roadmap, null).errors).toEqual([
      "CURRENT_WORK_MISSING_OR_INVALID",
    ]);
    const changed = clone(roadmap) as {
      items: Array<{ id: string; state: string }>;
    };
    const next = changed.items.find((item) => item.id === "MP-07");
    if (!next) throw new Error("fixture MP-07 missing");
    next.state = "CURRENT";
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "EXACTLY_ONE_CURRENT_ITEM_REQUIRED",
    );
  });

  it("rejects a changed immutable GitHub issue reference", () => {
    const changed = clone(roadmap) as {
      items: Array<{ id: string; githubIssue: number }>;
    };
    const item = changed.items.find((candidate) => candidate.id === "MP-05");
    if (!item) throw new Error("fixture MP-05 missing");
    item.githubIssue = 99;
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "IMMUTABLE_GITHUB_REFERENCE_INVALID_MP-05",
    );
  });

  it("enforces the 5,000-case PII-free benchmark while MP-06 is current", () => {
    const changed = clone(roadmap) as {
      items: Array<{
        id: string;
        state: string;
        benchmark?: { piiFree: boolean; minimumTotal: number };
      }>;
    };
    const item = changed.items.find((candidate) => candidate.id === "MP-06");
    if (!item?.benchmark) throw new Error("fixture MP-06 benchmark missing");
    item.benchmark.minimumTotal = 4_999;
    item.benchmark.piiFree = false;
    item.state = "NEXT_BLOCKED";
    expect(validateProjectControl(changed, currentWork).errors).toEqual(
      expect.arrayContaining([
        "MP_06_BENCHMARK_MUST_BE_PII_FREE",
        "MP_06_BENCHMARK_TOTAL_TOO_SMALL",
        "MP_06_MUST_BE_CURRENT",
      ]),
    );
  });

  it("preserves completed WP2 quality thresholds and required reports", () => {
    const changed = clone(currentWork) as {
      benchmarkAcceptanceCriteria: {
        meaningfullyDistinct: boolean;
        minimumAutoCorrectnessPercent: number;
        riskyStaffOnlyOrFailClosedPercent: number;
        maximumUnsupportedClaims: number;
        maximumPiiOrRawChatLeakage: number;
        authorityFailureFailClosedPercent: number;
        confusionMatrixRequired: boolean;
        falseAutoReportRequired: boolean;
      };
    };
    const criteria = changed.benchmarkAcceptanceCriteria;
    criteria.meaningfullyDistinct = false;
    criteria.minimumAutoCorrectnessPercent = 97;
    criteria.riskyStaffOnlyOrFailClosedPercent = 99;
    criteria.maximumUnsupportedClaims = 1;
    criteria.maximumPiiOrRawChatLeakage = 1;
    criteria.authorityFailureFailClosedPercent = 99;
    criteria.confusionMatrixRequired = false;
    criteria.falseAutoReportRequired = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "CURRENT_WORK_BENCHMARK_CASES_MUST_BE_MEANINGFULLY_DISTINCT",
        "CURRENT_WORK_AUTO_CORRECTNESS_BELOW_98_PERCENT",
        "CURRENT_WORK_RISKY_FAIL_CLOSED_MUST_BE_100_PERCENT",
        "CURRENT_WORK_UNSUPPORTED_CLAIMS_MUST_BE_ZERO",
        "CURRENT_WORK_PII_RAW_CHAT_LEAKAGE_MUST_BE_ZERO",
        "CURRENT_WORK_AUTHORITY_FAILURE_FAIL_CLOSED_MUST_BE_100_PERCENT",
        "CURRENT_WORK_CONFUSION_MATRIX_REQUIRED",
        "CURRENT_WORK_FALSE_AUTO_REPORT_REQUIRED",
        "BENCHMARK_ACCEPTANCE_CRITERIA_MISMATCH",
      ]),
    );
  });

  it("rejects TEST deploy or Production authorization drift", () => {
    const changedRoadmap = clone(roadmap) as {
      authorization: {
        testDeployment: boolean;
        productionStatus: string;
        productionAuthorizationReference: string | null;
      };
    };
    const changedWork = clone(currentWork) as {
      authorization: { testDeployment: boolean; production: boolean };
    };
    changedRoadmap.authorization.testDeployment = true;
    changedRoadmap.authorization.productionStatus = "GO";
    changedRoadmap.authorization.productionAuthorizationReference =
      "unapproved";
    changedWork.authorization.testDeployment = true;
    changedWork.authorization.production = true;
    expect(validateProjectControl(changedRoadmap, changedWork).errors).toEqual(
      expect.arrayContaining([
        "TEST_DEPLOYMENT_MUST_DEFAULT_FALSE",
        "PRODUCTION_MUST_REMAIN_NO_GO",
        "PRODUCTION_AUTHORIZATION_MUST_BE_ABSENT",
        "CURRENT_WORK_TEST_DEPLOYMENT_MUST_BE_FALSE",
        "CURRENT_WORK_PRODUCTION_MUST_BE_FALSE",
      ]),
    );
  });

  it("rejects removal of WP6 authorization or restoration of prior write access", () => {
    const changed = clone(currentWork) as {
      authorization: {
        benchmarkWp2: boolean;
        runtimeRemediationWp3: boolean;
        benchmarkCompletionWp4: boolean;
        localClosureRemediationWp5: boolean;
        testReadinessAssessmentWp6: boolean;
      };
    };
    changed.authorization.benchmarkWp2 = true;
    changed.authorization.runtimeRemediationWp3 = true;
    changed.authorization.benchmarkCompletionWp4 = true;
    changed.authorization.localClosureRemediationWp5 = true;
    changed.authorization.testReadinessAssessmentWp6 = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP2_BENCHMARK_MUST_BE_READ_ONLY",
        "WP3_RUNTIME_REMEDIATION_MUST_BE_READ_ONLY",
        "WP4_BENCHMARK_COMPLETION_MUST_BE_READ_ONLY",
        "WP5_LOCAL_CLOSURE_REMEDIATION_MUST_BE_READ_ONLY",
        "WP6_TEST_READINESS_ASSESSMENT_NOT_AUTHORIZED",
      ]),
    );
    expect(
      evaluateProjectAction(roadmap, changed, "TEST_READINESS_ASSESSMENT_WP6"),
    ).toEqual({ allowed: false, reason: "ROADMAP_UNVERIFIED" });
  });

  it("rejects policy checksum drift or WP6 scope removal/expansion", () => {
    const checksumDrift = clone(currentWork) as {
      policySnapshotReference: { checksum: string };
    };
    checksumDrift.policySnapshotReference.checksum = "0".repeat(64);
    expect(validateProjectControl(roadmap, checksumDrift).errors).toContain(
      "POLICY_SNAPSHOT_CHECKSUM_INVALID",
    );

    const expandedScope = clone(currentWork) as { allowedScope: string[] };
    expandedScope.allowedScope.push("CHANGE_APPROVED_KNOWLEDGE_BASE");
    expect(validateProjectControl(roadmap, expandedScope).errors).toContain(
      "WP6_SCOPE_INVALID",
    );

    const missingAssessmentScope = clone(currentWork) as {
      allowedScope: string[];
    };
    missingAssessmentScope.allowedScope =
      missingAssessmentScope.allowedScope.filter(
        (scope) => scope !== "MP_06_WP6_TEST_METADATA_READ_ONLY",
      );
    expect(
      validateProjectControl(roadmap, missingAssessmentScope).errors,
    ).toContain("WP6_SCOPE_INVALID");
  });

  it("requires the policy snapshot to remain read-only", () => {
    const changed = clone(currentWork) as {
      authorization: {
        policySnapshot: boolean;
        policySnapshotReadOnly: boolean;
      };
    };
    changed.authorization.policySnapshot = true;
    changed.authorization.policySnapshotReadOnly = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "POLICY_SNAPSHOT_MUTATION_MUST_BE_FALSE",
        "POLICY_SNAPSHOT_READ_ONLY_NOT_AUTHORIZED",
      ]),
    );
    expect(evaluateProjectAction(roadmap, changed, "POLICY_SNAPSHOT")).toEqual({
      allowed: false,
      reason: "ROADMAP_UNVERIFIED",
    });
  });

  it("fails closed if the runtime read-only prohibition is removed", () => {
    const changed = clone(currentWork) as { forbiddenScope: string[] };
    changed.forbiddenScope = changed.forbiddenScope.filter(
      (scope) => scope !== "CHANGE_MP_06_RUNTIME",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "FORBIDDEN_SCOPE_MISSING_CHANGE_MP_06_RUNTIME",
    );
  });

  it("pins the WP2 artifact, failed/PASS evidence, and immutable dataset", () => {
    const checksumDrift = clone(currentWork) as {
      wp2BenchmarkReference: {
        artifactCommit: string;
        datasetChecksum: string;
        failedResultChecksum: string;
        remediatedPassResultChecksum: string;
      };
    };
    checksumDrift.wp2BenchmarkReference.artifactCommit = "a".repeat(40);
    checksumDrift.wp2BenchmarkReference.datasetChecksum = "0".repeat(64);
    checksumDrift.wp2BenchmarkReference.failedResultChecksum = "f".repeat(64);
    checksumDrift.wp2BenchmarkReference.remediatedPassResultChecksum =
      "1".repeat(64);
    expect(validateProjectControl(roadmap, checksumDrift).errors).toEqual(
      expect.arrayContaining([
        "WP2_ARTIFACT_COMMIT_INVALID",
        "WP2_DATASET_CHECKSUM_INVALID",
        "WP2_FAILED_RESULT_CHECKSUM_INVALID",
        "WP2_PASS_RESULT_CHECKSUM_INVALID",
      ]),
    );
  });

  it("pins unambiguous benchmark/runtime provenance without a circular artifact commit", () => {
    const changed = clone(currentWork) as {
      benchmarkCompletionPlan: {
        benchmarkArtifactAllowlist: string[];
        provenanceRequirements: {
          benchmarkBaseCommit: string;
          runtimeUnderTestCommit: string;
          ambiguousSingleCommitFieldForbidden: boolean;
          selfReferentialArtifactCommitForbidden: boolean;
          provenanceMustNotAffectSemanticResultChecksum: boolean;
        };
      };
    };
    changed.benchmarkCompletionPlan.benchmarkArtifactAllowlist.pop();
    const provenance = changed.benchmarkCompletionPlan.provenanceRequirements;
    provenance.benchmarkBaseCommit = "0".repeat(40);
    provenance.runtimeUnderTestCommit = "f".repeat(40);
    provenance.ambiguousSingleCommitFieldForbidden = false;
    provenance.selfReferentialArtifactCommitForbidden = false;
    provenance.provenanceMustNotAffectSemanticResultChecksum = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP4_BENCHMARK_ARTIFACT_ALLOWLIST_INVALID",
        "WP4_PROVENANCE_BENCHMARK_BASE_INVALID",
        "WP4_PROVENANCE_RUNTIME_COMMIT_INVALID",
        "WP4_AMBIGUOUS_COMMIT_FIELD_MUST_BE_FORBIDDEN",
        "WP4_SELF_REFERENTIAL_COMMIT_MUST_BE_FORBIDDEN",
        "WP4_PROVENANCE_MUST_NOT_CHANGE_RESULT_CHECKSUM",
      ]),
    );
  });

  it("records completed WP5 evidence and the selected TEST-readiness path", () => {
    const record = currentWork as {
      localClosureRemediationPlan: {
        blocker: string;
        implementationStatus: string;
        timeoutCommit: string;
        toolchainCommit: string;
        localVerdict: string;
        authoritativeToolchainSource: string;
        implementationFileAllowlist: string[];
        timeoutRemediationFileAllowlist: string[];
        benchmarkTestTimeoutContract: {
          rootCause: string;
          implementationStatus: string;
          implementationCommit: string;
          targetFile: string;
          targetHook: string;
          previousTimeoutMs: number;
          currentTimeoutMs: number;
          authorizedTimeoutMs: number;
          maximumTimeoutMs: number;
          hardCeilingNotPerformanceThreshold: boolean;
          assertionChangesForbidden: boolean;
          datasetChangesForbidden: boolean;
          oracleChangesForbidden: boolean;
          benchmarkSemanticChangesForbidden: boolean;
          acceptanceThresholdChangesForbidden: boolean;
          skipOrTodoForbidden: boolean;
          sequentialRunsRequired: number;
          allRunsMustCompleteBelowMs: number;
          skippedOrCancelledAllowed: number;
          checksumsAndMetricsMustMatchAcrossRuns: boolean;
          trackedBenchmarkReportsMustRemainUnchanged: boolean;
        };
        requiredVersions: {
          node: string;
          pnpm: string;
          versionMatch: string;
        };
        requiredContract: {
          machineReadableConsistencyValidator: boolean;
          nodeMismatchFailsFast: boolean;
          pnpmMismatchFailsFast: boolean;
          existingCiDetectedAtTransition: boolean;
          newCiWorkflowAuthorized: boolean;
        };
        postWp5Decision: {
          ownerDecisionRequired: boolean;
          authorizedPath: string | null;
          options: string[];
        };
      };
    };
    const plan = record.localClosureRemediationPlan;
    expect(plan.blocker).toBe("RESOLVED");
    expect(plan.implementationStatus).toBe("COMPLETED_AT_TOOLCHAIN_COMMIT");
    expect(plan.timeoutCommit).toBe("98f6bc0843e376de9932acad767fb463932514cc");
    expect(plan.toolchainCommit).toBe(
      "9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331",
    );
    expect(plan.localVerdict).toBe("PASS_WITH_LIMITATIONS");
    expect(plan.authoritativeToolchainSource).toBe("PACKAGE_JSON");
    expect(plan.requiredVersions).toEqual({
      node: "24.19.0",
      pnpm: "11.19.0",
      versionMatch: "EXACT",
    });
    expect(plan.implementationFileAllowlist).toEqual([
      "package.json",
      ".node-version",
      "scripts/validate-toolchain.mjs",
      "tests/toolchain-contract.test.ts",
      "README.md",
      "docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md",
    ]);
    expect(plan.timeoutRemediationFileAllowlist).toEqual([
      "tests/mp-06-wp2-benchmark.test.ts",
    ]);
    expect(plan.benchmarkTestTimeoutContract).toMatchObject({
      rootCause: "BENCHMARK_BEFORE_ALL_TIMEOUT_HEADROOM",
      implementationStatus: "COMPLETED_AT_TIMEOUT_COMMIT",
      implementationCommit: "98f6bc0843e376de9932acad767fb463932514cc",
      targetFile: "tests/mp-06-wp2-benchmark.test.ts",
      targetHook: "runMp06Benchmark beforeAll",
      previousTimeoutMs: 60_000,
      currentTimeoutMs: 120_000,
      authorizedTimeoutMs: 120_000,
      maximumTimeoutMs: 120_000,
      hardCeilingNotPerformanceThreshold: true,
      assertionChangesForbidden: true,
      datasetChangesForbidden: true,
      oracleChangesForbidden: true,
      benchmarkSemanticChangesForbidden: true,
      acceptanceThresholdChangesForbidden: true,
      skipOrTodoForbidden: true,
      sequentialRunsRequired: 5,
      allRunsMustCompleteBelowMs: 120_000,
      skippedOrCancelledAllowed: 0,
      checksumsAndMetricsMustMatchAcrossRuns: true,
      trackedBenchmarkReportsMustRemainUnchanged: true,
    });
    expect(plan.requiredContract).toMatchObject({
      machineReadableConsistencyValidator: true,
      nodeMismatchFailsFast: true,
      pnpmMismatchFailsFast: true,
      existingCiDetectedAtTransition: false,
      newCiWorkflowAuthorized: false,
    });
    expect(plan.postWp5Decision).toEqual({
      ownerDecisionRequired: false,
      authorizedPath: "TEST_READINESS_ASSESSMENT",
      options: ["AI_NLU_WORK_PACKAGE", "TEST_READINESS_ASSESSMENT"],
    });
  });

  it("fails closed on toolchain drift, invalid preparation status, or registry scope expansion", () => {
    const changed = clone(currentWork) as {
      localClosureRemediationPlan: {
        implementationStatus: string;
        implementationFileAllowlist: string[];
        requiredVersions: { node: string; pnpm: string };
        requiredContract: { nodeMismatchFailsFast: boolean };
        registryPolicy: {
          dependencyVersionChangesAllowed: boolean;
          vendoringAllowed: boolean;
        };
        postWp5Decision: {
          ownerDecisionRequired: boolean;
          authorizedPath: string | null;
          options: string[];
        };
      };
    };
    const plan = changed.localClosureRemediationPlan;
    plan.implementationStatus = "IN_PROGRESS";
    plan.implementationFileAllowlist.pop();
    plan.requiredVersions.node = "24.18.0";
    plan.requiredVersions.pnpm = "11.18.0";
    plan.requiredContract.nodeMismatchFailsFast = false;
    plan.registryPolicy.dependencyVersionChangesAllowed = true;
    plan.registryPolicy.vendoringAllowed = true;
    plan.postWp5Decision.ownerDecisionRequired = true;
    plan.postWp5Decision.authorizedPath = "AI_NLU_WORK_PACKAGE";
    plan.postWp5Decision.options.reverse();
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP5_IMPLEMENTATION_STATUS_INVALID",
        "WP5_IMPLEMENTATION_FILE_ALLOWLIST_INVALID",
        "WP5_NODE_VERSION_INVALID",
        "WP5_PNPM_VERSION_INVALID",
        "WP5_CONTRACT_NODEMISMATCHFAILSFAST_INVALID",
        "WP5_REGISTRY_POLICY_DEPENDENCYVERSIONCHANGESALLOWED_INVALID",
        "WP5_REGISTRY_POLICY_VENDORINGALLOWED_INVALID",
        "WP5_POST_DECISION_MUST_BE_RECORDED",
        "WP5_POST_DECISION_PATH_INVALID",
        "WP5_POST_DECISION_OPTIONS_INVALID",
      ]),
    );
  });

  it("fails closed on timeout target, ceiling, semantic, or run-contract drift", () => {
    const changed = clone(currentWork) as {
      localClosureRemediationPlan: {
        timeoutRemediationFileAllowlist: string[];
        benchmarkTestTimeoutContract: {
          implementationStatus: string;
          targetFile: string;
          authorizedTimeoutMs: number;
          maximumTimeoutMs: number;
          assertionChangesForbidden: boolean;
          benchmarkSemanticChangesForbidden: boolean;
          sequentialRunsRequired: number;
          skippedOrCancelledAllowed: number;
        };
      };
    };
    const plan = changed.localClosureRemediationPlan;
    plan.timeoutRemediationFileAllowlist = ["benchmark/mp-06/runner.ts"];
    plan.benchmarkTestTimeoutContract.implementationStatus = "COMPLETED";
    plan.benchmarkTestTimeoutContract.targetFile = "benchmark/mp-06/runner.ts";
    plan.benchmarkTestTimeoutContract.authorizedTimeoutMs = 0;
    plan.benchmarkTestTimeoutContract.maximumTimeoutMs = 180_000;
    plan.benchmarkTestTimeoutContract.assertionChangesForbidden = false;
    plan.benchmarkTestTimeoutContract.benchmarkSemanticChangesForbidden = false;
    plan.benchmarkTestTimeoutContract.sequentialRunsRequired = 1;
    plan.benchmarkTestTimeoutContract.skippedOrCancelledAllowed = 9;

    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP5_TIMEOUT_FILE_ALLOWLIST_INVALID",
        "WP5_TIMEOUT_IMPLEMENTATION_STATUS_INVALID",
        "WP5_TIMEOUT_TARGET_FILE_INVALID",
        "WP5_AUTHORIZED_TIMEOUT_INVALID",
        "WP5_MAXIMUM_TIMEOUT_INVALID",
        "WP5_TIMEOUT_CONTRACT_ASSERTIONCHANGESFORBIDDEN_INVALID",
        "WP5_TIMEOUT_CONTRACT_BENCHMARKSEMANTICCHANGESFORBIDDEN_INVALID",
        "WP5_TIMEOUT_RUN_COUNT_INVALID",
        "WP5_TIMEOUT_SKIP_BUDGET_INVALID",
      ]),
    );
  });

  it("records local deterministic acceptance with unresolved environment limitations", () => {
    const record = currentWork as {
      localDeterministicAcceptance: {
        verdict: string;
        cleanCheckoutReproducible: boolean;
        benchmarkCases: number;
        aiNluImplemented: boolean;
        testEnvironmentAssessed: boolean;
        testDeployment: boolean;
        ownerTestUatComplete: boolean;
        productionStatus: string;
        limitations: string[];
      };
    };
    expect(record.localDeterministicAcceptance).toMatchObject({
      verdict: "PASS_WITH_LIMITATIONS",
      cleanCheckoutReproducible: true,
      benchmarkCases: 5000,
      aiNluImplemented: false,
      testEnvironmentAssessed: false,
      testDeployment: false,
      ownerTestUatComplete: false,
      productionStatus: "NO_GO",
    });
    expect(record.localDeterministicAcceptance.limitations).toEqual([
      "AI_NLU_NOT_IMPLEMENTED",
      "TEST_READINESS_NOT_ASSESSED",
      "TEST_NOT_DEPLOYED",
      "OWNER_TEST_UAT_NOT_COMPLETED",
      "PRODUCTION_NO_GO",
    ]);
  });

  it("fails closed when local acceptance evidence is overstated", () => {
    const changed = clone(currentWork) as {
      localDeterministicAcceptance: {
        verdict: string;
        aiNluImplemented: boolean;
        testEnvironmentAssessed: boolean;
        testDeployment: boolean;
        productionStatus: string;
      };
    };
    const acceptance = changed.localDeterministicAcceptance;
    acceptance.verdict = "PASS";
    acceptance.aiNluImplemented = true;
    acceptance.testEnvironmentAssessed = true;
    acceptance.testDeployment = true;
    acceptance.productionStatus = "GO";
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "LOCAL_ACCEPTANCE_VERDICT_INVALID",
        "LOCAL_ACCEPTANCE_AINLUIMPLEMENTED_INVALID",
        "LOCAL_ACCEPTANCE_TESTENVIRONMENTASSESSED_INVALID",
        "LOCAL_ACCEPTANCE_TESTDEPLOYMENT_INVALID",
        "LOCAL_ACCEPTANCE_PRODUCTION_INVALID",
      ]),
    );
  });

  it("authorizes a not-started, read-only WP6 assessment without deployment", () => {
    const record = currentWork as {
      testReadinessAssessmentPlan: {
        implementationStatus: string;
        remoteInspectionMode: string;
        secretInspectionMode: string;
        productionRemoteInspection: string;
        deploymentAuthorization: boolean;
        aiNluImplementation: boolean;
        verdictOptions: string[];
        unknownMustNotBeAssumedPass: boolean;
        notApplicableRequiresReason: boolean;
        issueMustRemainOpen: boolean;
      };
    };
    expect(record.testReadinessAssessmentPlan).toMatchObject({
      implementationStatus: "NOT_STARTED",
      remoteInspectionMode: "TEST_METADATA_READ_ONLY",
      secretInspectionMode: "NAMES_AND_PRESENCE_ONLY",
      productionRemoteInspection: "FORBIDDEN",
      deploymentAuthorization: false,
      aiNluImplementation: false,
      unknownMustNotBeAssumedPass: true,
      notApplicableRequiresReason: true,
      issueMustRemainOpen: true,
    });
    expect(record.testReadinessAssessmentPlan.verdictOptions).toEqual([
      "TEST_READINESS_ASSESSMENT_PASS",
      "TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS",
      "TEST_READINESS_BLOCKED",
    ]);
  });

  it("rejects starting WP6 early, reading Production, or granting deployment", () => {
    const changed = clone(currentWork) as {
      testReadinessAssessmentPlan: {
        implementationStatus: string;
        secretInspectionMode: string;
        productionRemoteInspection: string;
        deploymentAuthorization: boolean;
        unknownMustNotBeAssumedPass: boolean;
        issueMustRemainOpen: boolean;
      };
    };
    const plan = changed.testReadinessAssessmentPlan;
    plan.implementationStatus = "IN_PROGRESS";
    plan.secretInspectionMode = "VALUES_ALLOWED";
    plan.productionRemoteInspection = "READ_ONLY";
    plan.deploymentAuthorization = true;
    plan.unknownMustNotBeAssumedPass = false;
    plan.issueMustRemainOpen = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP6_ASSESSMENT_ALREADY_STARTED",
        "WP6_SECRET_INSPECTION_MODE_INVALID",
        "WP6_PRODUCTION_REMOTE_INSPECTION_MUST_BE_FORBIDDEN",
        "WP6_ASSESSMENT_DEPLOYMENTAUTHORIZATION_INVALID",
        "WP6_ASSESSMENT_UNKNOWNMUSTNOTBEASSUMEDPASS_INVALID",
        "WP6_ASSESSMENT_ISSUEMUSTREMAINOPEN_INVALID",
      ]),
    );
  });

  it("preserves the frozen dataset, oracle, expected results, thresholds and failed history", () => {
    const changed = clone(currentWork) as {
      benchmarkCompletionPlan: {
        datasetChecksumMustRemainUnchanged: boolean;
        independentOracleMustRemainUnchanged: boolean;
        expectedResultsMustRemainUnchanged: boolean;
        acceptanceThresholdsMustRemainUnchanged: boolean;
        failedHistoryMustBeRetained: boolean;
      };
    };
    const plan = changed.benchmarkCompletionPlan;
    plan.datasetChecksumMustRemainUnchanged = false;
    plan.independentOracleMustRemainUnchanged = false;
    plan.expectedResultsMustRemainUnchanged = false;
    plan.acceptanceThresholdsMustRemainUnchanged = false;
    plan.failedHistoryMustBeRetained = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP4_DATASET_CHECKSUM_IMMUTABILITY_REQUIRED",
        "WP4_ORACLE_IMMUTABILITY_REQUIRED",
        "WP4_EXPECTED_RESULTS_IMMUTABILITY_REQUIRED",
        "WP4_ACCEPTANCE_THRESHOLDS_IMMUTABILITY_REQUIRED",
        "WP4_FAILED_HISTORY_RETENTION_REQUIRED",
      ]),
    );
  });

  it("turns an unresolved blocking conflict into ROADMAP_UNVERIFIED", () => {
    const changed = clone(currentWork) as {
      conflicts: Array<{
        code: string;
        blocking: boolean;
        detail: string;
        resolution: string;
      }>;
    };
    changed.conflicts.push({
      code: "GITHUB_ROADMAP_MISMATCH",
      blocking: true,
      detail: "fixture",
      resolution: "Owner review required",
    });
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "BLOCKING_CONFLICT_GITHUB_ROADMAP_MISMATCH",
    );
    expect(evaluateProjectAction(roadmap, changed, "COMMIT").reason).toBe(
      "ROADMAP_UNVERIFIED",
    );
  });
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
