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

describe("MP-06 WP7 guarded AI/NLU local acceptance control", () => {
  it("accepts the 2026.09.06-v5 control snapshot and records default-branch drift", () => {
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
            testReadinessConditionClosureWp6: { const: boolean };
            testReadinessConditionsClosedWp6: { const: boolean };
            aiNluImplementationWp7: { const: boolean };
            aiNluLocalAcceptanceCompleteWp7: { const: boolean };
          };
        };
      };
    };
    expect(schema.properties.currentPhase.const).toBe(
      "WP7_AI_NLU_LOCAL_ACCEPTANCE_COMPLETE",
    );
    expect(schema.properties.status.const).toBe(
      "AWAITING_TEST_DEPLOYMENT_AUTHORIZATION",
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
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .testReadinessConditionClosureWp6.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .testReadinessConditionsClosedWp6.const,
    ).toBe(true);
    expect(
      schema.properties.authorization.properties.aiNluImplementationWp7.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties.aiNluLocalAcceptanceCompleteWp7
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

  it("freezes WP7 evidence and waits for a separate TEST deployment authorization", () => {
    const record = currentWork as { allowedScope: string[] };
    expect(record.allowedScope).toContain(
      "MP_06_WP7_LOCAL_ACCEPTANCE_EVIDENCE_READ_ONLY",
    );
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "TEST_READINESS_CONDITION_CLOSURE_WP6",
      ),
    ).toEqual({
      allowed: false,
      reason: "TEST_READINESS_CONDITION_CLOSURE_WP6_NOT_AUTHORIZED",
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
      evaluateProjectAction(
        roadmap,
        currentWork,
        "TEST_READINESS_ASSESSMENT_WP6",
      ),
    ).toEqual({
      allowed: false,
      reason: "TEST_READINESS_ASSESSMENT_WP6_NOT_AUTHORIZED",
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
      reason: "OWNER_NEXT_WORK_PACKAGE_AUTHORIZATION_REQUIRED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "AI_NLU_IMPLEMENTATION_WP7"),
    ).toEqual({
      allowed: false,
      reason: "AI_NLU_IMPLEMENTATION_WP7_NOT_AUTHORIZED",
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

  it("locks WP7 to advisory OpenAI Responses API use and local synthetic evaluation", () => {
    const record = currentWork as {
      wp7AiNluPlan: {
        implementationStatus: string;
        implementationCommit: string;
        authorityMode: string;
        provider: string;
        api: string;
        model: string;
        baseUrl: string;
        credentialInspectionMode: string;
        featureFlagDefaultEnabled: boolean;
        structuredOutputsStrict: boolean;
        storeResponses: boolean;
        streaming: boolean;
        toolCalling: boolean;
        maximumRetries: number;
        syntheticEvaluation: {
          maximumRequests: number;
          maximumCostUsd: number;
          criticalSafetyRepeatCount: number;
          customerDataForbidden: boolean;
        };
        acceptanceCriteria: {
          structuredSchemaSuccessPercent: number;
          riskyAuthorityFailClosedPercent: number;
          maximumStaffOnlyDowngrades: number;
          maximumFalseFinalAuto: number;
          minimumFinalRoutingAccuracyPercent: number;
          minimumRequiredFieldExtractionAccuracyPercent: number;
        };
        localAcceptanceEvidence: {
          promptChecksum: string;
          schemaChecksum: string;
          datasetChecksum: string;
          semanticResultChecksum: string;
          uniqueCases: number;
          apiRequests: number;
          finalRoutingAccuracyPercent: number;
          requiredFieldExtractionAccuracyPercent: number;
          riskyAuthorityFailClosedPercent: number;
          staffOnlyDowngrades: number;
          falseFinalAuto: number;
          cleanCheckoutReproducible: boolean;
          normalSuitesRequireCredential: boolean;
        };
        deploymentAuthorization: boolean;
        productionStatus: string;
        issueMustRemainOpen: boolean;
      };
    };
    expect(record.wp7AiNluPlan).toMatchObject({
      implementationStatus: "LOCAL_ACCEPTANCE_PASS_WITH_LIMITATIONS",
      implementationCommit: "d14aa95d8ed95bcc967233d6cda252a2f61f1cd6",
      authorityMode: "ADVISORY_ONLY_DETERMINISTIC_POLICY_FINAL",
      provider: "OPENAI",
      api: "RESPONSES_API",
      model: "gpt-5.6-terra",
      baseUrl: "https://api.openai.com/v1/responses",
      credentialInspectionMode: "PRESENCE_ONLY",
      featureFlagDefaultEnabled: false,
      structuredOutputsStrict: true,
      storeResponses: false,
      streaming: false,
      toolCalling: false,
      maximumRetries: 1,
      syntheticEvaluation: {
        maximumRequests: 500,
        maximumCostUsd: 5,
        criticalSafetyRepeatCount: 3,
        customerDataForbidden: true,
      },
      acceptanceCriteria: {
        structuredSchemaSuccessPercent: 100,
        riskyAuthorityFailClosedPercent: 100,
        maximumStaffOnlyDowngrades: 0,
        maximumFalseFinalAuto: 0,
        minimumFinalRoutingAccuracyPercent: 95,
        minimumRequiredFieldExtractionAccuracyPercent: 95,
      },
      localAcceptanceEvidence: {
        promptChecksum:
          "bb32a123d6671ac2167887ea8ba476bdebe28bc4b1cca23d53b9b6879cc8eeb6",
        schemaChecksum:
          "811436149e813ce6ece4baade44640c56b48edf5198433822e688c9994319793",
        datasetChecksum:
          "cbfb9d6030ded2ab3cb8237233313940f2df206efdd7ac91cc05c948fdcae11b",
        semanticResultChecksum:
          "7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55",
        uniqueCases: 60,
        apiRequests: 100,
        finalRoutingAccuracyPercent: 98,
        requiredFieldExtractionAccuracyPercent: 100,
        riskyAuthorityFailClosedPercent: 100,
        staffOnlyDowngrades: 0,
        falseFinalAuto: 0,
        cleanCheckoutReproducible: true,
        normalSuitesRequireCredential: false,
      },
      deploymentAuthorization: false,
      productionStatus: "NO_GO",
      issueMustRemainOpen: true,
    });
  });

  it("fails closed when WP7 authority, model, safety thresholds, or deployment drifts", () => {
    const changed = clone(currentWork) as {
      authorization: { aiNluImplementationWp7: boolean };
      wp7AiNluPlan: {
        authorityMode: string;
        model: string;
        featureFlagDefaultEnabled: boolean;
        syntheticEvaluation: {
          maximumRequests: number;
          maximumCostUsd: number;
        };
        acceptanceCriteria: {
          maximumFalseFinalAuto: number;
          minimumFinalRoutingAccuracyPercent: number;
        };
        deploymentAuthorization: boolean;
      };
    };
    changed.authorization.aiNluImplementationWp7 = true;
    changed.wp7AiNluPlan.authorityMode = "MODEL_FINAL";
    changed.wp7AiNluPlan.model = "fallback-model";
    changed.wp7AiNluPlan.featureFlagDefaultEnabled = true;
    changed.wp7AiNluPlan.syntheticEvaluation.maximumRequests = 501;
    changed.wp7AiNluPlan.syntheticEvaluation.maximumCostUsd = 6;
    changed.wp7AiNluPlan.acceptanceCriteria.maximumFalseFinalAuto = 1;
    changed.wp7AiNluPlan.acceptanceCriteria.minimumFinalRoutingAccuracyPercent = 94;
    changed.wp7AiNluPlan.deploymentAuthorization = true;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP7_AI_NLU_IMPLEMENTATION_MUST_BE_BLOCKED_AFTER_LOCAL_ACCEPTANCE",
        "WP7_AUTHORITY_MODE_INVALID",
        "WP7_MODEL_INVALID",
        "WP7_AI_NLU_FEATUREFLAGDEFAULTENABLED_INVALID",
        "WP7_MAX_REQUESTS_INVALID",
        "WP7_MAX_COST_INVALID",
        "WP7_FALSE_FINAL_AUTO_INVALID",
        "WP7_ROUTING_ACCURACY_INVALID",
        "WP7_AI_NLU_DEPLOYMENTAUTHORIZATION_INVALID",
      ]),
    );
    expect(
      evaluateProjectAction(roadmap, changed, "AI_NLU_IMPLEMENTATION_WP7"),
    ).toEqual({ allowed: false, reason: "ROADMAP_UNVERIFIED" });
  });

  it("fails closed when WP7 local acceptance evidence drifts", () => {
    const changed = clone(currentWork) as {
      wp7AiNluPlan: {
        implementationCommit: string;
        localAcceptanceEvidence: {
          promptChecksum: string;
          finalRoutingAccuracyPercent: number;
          falseFinalAuto: number;
          cleanCheckoutReproducible: boolean;
        };
      };
    };
    changed.wp7AiNluPlan.implementationCommit = "0".repeat(40);
    changed.wp7AiNluPlan.localAcceptanceEvidence.promptChecksum = "0".repeat(
      64,
    );
    changed.wp7AiNluPlan.localAcceptanceEvidence.finalRoutingAccuracyPercent = 94;
    changed.wp7AiNluPlan.localAcceptanceEvidence.falseFinalAuto = 1;
    changed.wp7AiNluPlan.localAcceptanceEvidence.cleanCheckoutReproducible = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP7_IMPLEMENTATION_COMMIT_INVALID",
        "WP7_PROMPT_CHECKSUM_INVALID",
        "WP7_ROUTING_ACCURACY_INVALID",
        "WP7_FALSE_FINAL_AUTO_INVALID",
        "WP7_LOCAL_ACCEPTANCE_CLEANCHECKOUTREPRODUCIBLE_INVALID",
      ]),
    );
  });

  it("fails closed when Roadmap and current-work versions conflict", () => {
    const changed = clone(currentWork) as { roadmapVersion: string };
    changed.roadmapVersion = "2026.09.06-v3";
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
        testReadinessConditionClosureWp6: boolean;
        testReadinessConditionsClosedWp6: boolean;
      };
    };
    changed.authorization.benchmarkWp2 = true;
    changed.authorization.runtimeRemediationWp3 = true;
    changed.authorization.benchmarkCompletionWp4 = true;
    changed.authorization.localClosureRemediationWp5 = true;
    changed.authorization.testReadinessAssessmentWp6 = true;
    changed.authorization.testReadinessConditionClosureWp6 = true;
    changed.authorization.testReadinessConditionsClosedWp6 = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP2_BENCHMARK_MUST_BE_READ_ONLY",
        "WP3_RUNTIME_REMEDIATION_MUST_BE_READ_ONLY",
        "WP4_BENCHMARK_COMPLETION_MUST_BE_READ_ONLY",
        "WP5_LOCAL_CLOSURE_REMEDIATION_MUST_BE_READ_ONLY",
        "WP6_TEST_READINESS_ASSESSMENT_MUST_BE_READ_ONLY",
        "WP6_TEST_READINESS_CONDITION_CLOSURE_MUST_BE_BLOCKED",
        "WP6_TEST_READINESS_CONDITIONS_CLOSED_EVIDENCE_MISSING",
      ]),
    );
    expect(
      evaluateProjectAction(
        roadmap,
        changed,
        "TEST_READINESS_CONDITION_CLOSURE_WP6",
      ),
    ).toEqual({ allowed: false, reason: "ROADMAP_UNVERIFIED" });
  });

  it("rejects policy checksum drift or WP7 scope removal/expansion", () => {
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
      "WP7_SCOPE_INVALID",
    );

    const missingAssessmentScope = clone(currentWork) as {
      allowedScope: string[];
    };
    missingAssessmentScope.allowedScope =
      missingAssessmentScope.allowedScope.filter(
        (scope) => scope !== "MP_06_WP7_LOCAL_ACCEPTANCE_EVIDENCE_READ_ONLY",
      );
    expect(
      validateProjectControl(roadmap, missingAssessmentScope).errors,
    ).toContain("WP7_SCOPE_INVALID");
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

  it("fails closed if the narrow runtime boundary is removed", () => {
    const changed = clone(currentWork) as { forbiddenScope: string[] };
    changed.forbiddenScope = changed.forbiddenScope.filter(
      (scope) =>
        scope !== "CHANGE_MP_06_RUNTIME_OUTSIDE_WP7_ADVISORY_INTEGRATION",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "FORBIDDEN_SCOPE_MISSING_CHANGE_MP_06_RUNTIME_OUTSIDE_WP7_ADVISORY_INTEGRATION",
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
          supersedesCommit: string;
          targetFile: string;
          targetHook: string;
          previousTimeoutMs: number;
          currentTimeoutMs: number;
          authorizedTimeoutMs: number;
          maximumTimeoutMs: number;
          testSpecificTimeoutMs: number;
          testSpecificTimeoutCount: number;
          dedicatedProcess: boolean;
          observedMaximumMs: number;
          acceptanceCeilingMs: number;
          remainingMarginMs: number;
          hardCeilingNotPerformanceThreshold: boolean;
          productPerformanceGuarantee: boolean;
          globalTimeoutChanged: boolean;
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
      rootCause: "CPU_BOUND_BENCHMARK_REQUIRES_DEDICATED_LANE",
      implementationStatus: "SUPERSEDED_BY_DEDICATED_BENCHMARK_EXECUTION",
      implementationCommit: "b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a",
      supersedesCommit: "98f6bc0843e376de9932acad767fb463932514cc",
      targetFile: "tests/mp-06-wp2-benchmark.test.ts",
      targetHook: "runMp06Benchmark beforeAll",
      previousTimeoutMs: 120_000,
      currentTimeoutMs: 300_000,
      authorizedTimeoutMs: 300_000,
      maximumTimeoutMs: 300_000,
      testSpecificTimeoutMs: 15_000,
      testSpecificTimeoutCount: 2,
      dedicatedProcess: true,
      observedMaximumMs: 260_200,
      acceptanceCeilingMs: 270_000,
      remainingMarginMs: 9_800,
      hardCeilingNotPerformanceThreshold: true,
      productPerformanceGuarantee: false,
      globalTimeoutChanged: false,
      assertionChangesForbidden: true,
      datasetChangesForbidden: true,
      oracleChangesForbidden: true,
      benchmarkSemanticChangesForbidden: true,
      acceptanceThresholdChangesForbidden: true,
      skipOrTodoForbidden: true,
      sequentialRunsRequired: 5,
      allRunsMustCompleteBelowMs: 270_000,
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
      aiNluImplemented: true,
      testEnvironmentAssessed: true,
      testDeployment: false,
      ownerTestUatComplete: false,
      productionStatus: "NO_GO",
    });
    expect(record.localDeterministicAcceptance.limitations).toEqual([
      "AI_NLU_SYNTHETIC_ONLY",
      "TEST_NOT_DEPLOYED",
      "TEST_SMOKE_NOT_COMPLETED",
      "OWNER_TEST_UAT_NOT_COMPLETED",
      "ROLLBACK_REHEARSAL_NOT_COMPLETED",
      "PR_DEFAULT_BRANCH_NOT_INTEGRATED",
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
    acceptance.aiNluImplemented = false;
    acceptance.testEnvironmentAssessed = false;
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

  it("records the completed WP6 assessment without deployment", () => {
    const record = currentWork as {
      testReadinessAssessmentPlan: {
        implementationStatus: string;
        assessmentCommit: string;
        conditionsCommit: string;
        verdict: string;
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
      implementationStatus: "COMPLETED_WITH_CONDITIONS",
      assessmentCommit: "76d1e1302c31a35ab49e565b231cf63100e27fb6",
      conditionsCommit: "0ad0ee261eb1f270f8a81c5874d0118768244d53",
      verdict: "TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS",
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

  it("rejects assessment evidence drift, Production reads, or deployment", () => {
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
    plan.implementationStatus = "NOT_STARTED";
    plan.secretInspectionMode = "VALUES_ALLOWED";
    plan.productionRemoteInspection = "READ_ONLY";
    plan.deploymentAuthorization = true;
    plan.unknownMustNotBeAssumedPass = false;
    plan.issueMustRemainOpen = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP6_ASSESSMENT_STATUS_INVALID",
        "WP6_SECRET_INSPECTION_MODE_INVALID",
        "WP6_PRODUCTION_REMOTE_INSPECTION_MUST_BE_FORBIDDEN",
        "WP6_ASSESSMENT_DEPLOYMENTAUTHORIZATION_INVALID",
        "WP6_ASSESSMENT_UNKNOWNMUSTNOTBEASSUMEDPASS_INVALID",
        "WP6_ASSESSMENT_ISSUEMUSTREMAINOPEN_INVALID",
      ]),
    );
  });

  it("records all four WP6 readiness conditions as closed without deployment", () => {
    const record = currentWork as {
      testReadinessConditionClosurePlan: {
        implementationStatus: string;
        implementationCommit: string;
        verdict: string;
        authorizedConditions: string[];
        timeoutContract: {
          hookWatchdogMs: number;
          testSpecificWatchdogMs: number;
          testSpecificWatchdogCount: number;
          observedMaximumMs: number;
          acceptanceCeilingMs: number;
          performanceGuarantee: boolean;
        };
        runtimeMode: string;
        policyMode: string;
        datasetOracleBenchmarkSemanticsMode: string;
        knowledgeBaseCatalogMode: string;
        testReadiness: string;
        pnpmCheckSequentialRuns: number;
        previewByteStable: boolean;
        rollbackRehearsalStatus: string;
        ownerUatStatus: string;
        deploymentAuthorization: boolean;
        aiNluImplementation: boolean;
        issueMustRemainOpen: boolean;
        verdictOptions: string[];
      };
    };
    const plan = record.testReadinessConditionClosurePlan;
    expect(plan).toMatchObject({
      implementationStatus: "COMPLETED_AT_IMPLEMENTATION_COMMIT",
      implementationCommit: "688c1fbd75358429b7161f41de3ef706696595e4",
      verdict: "WP6_TEST_READINESS_CONDITIONS_CLOSED",
      runtimeMode: "READ_ONLY",
      policyMode: "READ_ONLY",
      datasetOracleBenchmarkSemanticsMode: "READ_ONLY",
      knowledgeBaseCatalogMode: "READ_ONLY",
      testReadiness: "READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION",
      pnpmCheckSequentialRuns: 2,
      previewByteStable: true,
      rollbackRehearsalStatus: "NOT_PERFORMED",
      ownerUatStatus: "NOT_PERFORMED",
      deploymentAuthorization: false,
      aiNluImplementation: false,
      issueMustRemainOpen: true,
    });
    expect(plan.authorizedConditions).toEqual([
      "ACTIVE_BENCHMARK_TIMEOUT_METADATA_DRIFT",
      "TEST_ALERT_RATE_STOP_CONTROLS_NOT_FROZEN",
      "ROLLBACK_AND_SYNTHETIC_FIXTURES_NOT_FROZEN",
      "VALIDATION_CHAIN_RICH_MENU_FORMATTING_DRIFT",
    ]);
    expect(plan.timeoutContract).toEqual({
      hookWatchdogMs: 300_000,
      testSpecificWatchdogMs: 15_000,
      testSpecificWatchdogCount: 2,
      observedMaximumMs: 260_200,
      acceptanceCeilingMs: 270_000,
      performanceGuarantee: false,
    });
    expect(plan.verdictOptions).toEqual([
      "WP6_TEST_READINESS_CONDITIONS_CLOSED",
      "WP6_TEST_READINESS_CONDITIONS_PARTIALLY_CLOSED",
      "WP6_TEST_READINESS_CONDITION_CLOSURE_FAILED",
    ]);
  });

  it("fails closed when WP6 condition scope, watchdog, or deployment contract drifts", () => {
    const changed = clone(currentWork) as {
      testReadinessConditionClosurePlan: {
        implementationStatus: string;
        implementationCommit: string;
        verdict: string;
        authorizedConditions: string[];
        timeoutContract: {
          hookWatchdogMs: number;
          performanceGuarantee: boolean;
        };
        testReadiness: string;
        pnpmCheckSequentialRuns: number;
        previewByteStable: boolean;
        deploymentAuthorization: boolean;
      };
    };
    const plan = changed.testReadinessConditionClosurePlan;
    plan.implementationStatus = "IN_PROGRESS";
    plan.implementationCommit = "0".repeat(40);
    plan.verdict = "WP6_TEST_READINESS_CONDITIONS_PARTIALLY_CLOSED";
    plan.authorizedConditions.pop();
    plan.timeoutContract.hookWatchdogMs = 600_000;
    plan.timeoutContract.performanceGuarantee = true;
    plan.testReadiness = "PASS_WITH_CONDITIONS";
    plan.pnpmCheckSequentialRuns = 1;
    plan.previewByteStable = false;
    plan.deploymentAuthorization = true;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP6_CONDITION_CLOSURE_STATUS_INVALID",
        "WP6_CONDITION_CLOSURE_COMMIT_INVALID",
        "WP6_CONDITION_CLOSURE_VERDICT_INVALID",
        "WP6_AUTHORIZED_CONDITIONS_INVALID",
        "WP6_HOOK_WATCHDOG_INVALID",
        "WP6_PERFORMANCE_GUARANTEE_INVALID",
        "WP6_TEST_READINESS_STATE_INVALID",
        "WP6_PNPM_CHECK_RUN_COUNT_INVALID",
        "WP6_CONDITION_CLOSURE_PREVIEWBYTESTABLE_INVALID",
        "WP6_CONDITION_CLOSURE_DEPLOYMENTAUTHORIZATION_INVALID",
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
