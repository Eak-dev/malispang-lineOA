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

describe("MP-06 WP8F TEST acceptance completion", () => {
  it("accepts the 2026.09.08-v12 control snapshot and records default-branch drift", () => {
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
            runtimePilotControlRemediationWp8a: { const: boolean };
            runtimePilotControlsCompleteWp8a: { const: boolean };
            testDeploymentSmokeRollbackWp8: { const: boolean };
            providerAttemptSettlementRemediationWp8b: { const: boolean };
            providerReconciliationControlledRetestWp8c: { const: boolean };
            durableLifecycleDiagnosticsRemediationWp8d: { const: boolean };
            exactStateReconciliationControlledRetestWp8e: {
              const: boolean;
            };
          };
        };
      };
    };
    expect(schema.properties.currentPhase.const).toBe(
      "WP8F_TEST_ACCEPTANCE_COMPLETION",
    );
    expect(schema.properties.status.const).toBe(
      "AUTHORIZED_TEST_ACCEPTANCE_COMPLETION_WP8F_ONLY",
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
    expect(
      schema.properties.authorization.properties
        .runtimePilotControlRemediationWp8a.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .runtimePilotControlsCompleteWp8a.const,
    ).toBe(true);
    expect(
      schema.properties.authorization.properties.testDeploymentSmokeRollbackWp8
        .const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .providerAttemptSettlementRemediationWp8b.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .providerReconciliationControlledRetestWp8c.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .durableLifecycleDiagnosticsRemediationWp8d.const,
    ).toBe(false);
    expect(
      schema.properties.authorization.properties
        .exactStateReconciliationControlledRetestWp8e.const,
    ).toBe(false);
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

  it("freezes the unresolved attempt facts without treating unknown provider lifecycle as failure evidence", () => {
    const record = currentWork as {
      wp8bProviderAttemptSettlementPlan: {
        observedState: {
          pilot: string;
          aiEnabled: boolean;
          budgetReservedMicroUsd: number;
          inFlight: number;
        };
        verifiedFacts: string[];
        unverifiedFacts: string[];
        existingRemoteAttemptMutation: string;
        implementationCommit: string;
        remediationVerdict: string;
        candidateDeploymentOccurred: boolean;
        existingRemoteAttemptReconciled: boolean;
      };
    };
    expect(record.wp8bProviderAttemptSettlementPlan.observedState).toEqual(
      expect.objectContaining({
        pilot: "STOPPED",
        aiEnabled: false,
        budgetReservedMicroUsd: 12_932,
        inFlight: 1,
      }),
    );
    expect(record.wp8bProviderAttemptSettlementPlan.verifiedFacts).toContain(
      "DISPATCH_AUTHORIZED",
    );
    expect(record.wp8bProviderAttemptSettlementPlan.unverifiedFacts).toContain(
      "PROVIDER_RESPONSE_OR_ERROR",
    );
    expect(
      record.wp8bProviderAttemptSettlementPlan.existingRemoteAttemptMutation,
    ).toBe("FORBIDDEN_PENDING_VERIFIED_CANDIDATE_AND_SEPARATE_ACTION");
    expect(record.wp8bProviderAttemptSettlementPlan).toMatchObject({
      implementationCommit: "25b0bc9f726b05d80aeb586fd09290c43bc3ba35",
      remediationVerdict: "PASS",
      candidateDeploymentOccurred: false,
      existingRemoteAttemptReconciled: false,
    });
  });

  it("freezes exact reconciliation preconditions and cumulative single-retest limits", () => {
    const record = currentWork as {
      wp8cProviderReconciliationControlledRetestPlan: {
        exactTestWorker: string;
        activeBaselineVersion: string;
        existingAttempt: Record<string, unknown>;
        reconciliationPreconditions: Record<string, unknown>;
        newSessionContract: Record<string, unknown>;
        historicalObservability: string;
      };
    };
    expect(record.wp8cProviderReconciliationControlledRetestPlan).toMatchObject(
      {
        exactTestWorker: "malispang-lineoa-test",
        activeBaselineVersion: "509c3587-7ae9-41a8-8ba2-1082d03e138d",
        existingAttempt: {
          sessionState: "STOPPED",
          stopReason: "IN_FLIGHT_USAGE_UNKNOWN",
          admittedEvents: 1,
          providerAttempts: 1,
          budgetConsumedMicroUsd: 0,
          budgetReservedMicroUsd: 12_932,
          inFlight: 1,
          actualUsage: "UNKNOWN",
          reconciliationDisposition: "CONSUME_FULL_RESERVATION_NO_REFUND",
        },
        reconciliationPreconditions: {
          authenticatedTestAdminOnly: true,
          exactSingleStaleDispatchedAttempt: true,
          originalSessionMustRemainStopped: true,
          idempotent: true,
          deleteEvidence: false,
        },
        newSessionContract: {
          maximumNewSessions: 1,
          maximumNewLineEvents: 1,
          maximumTotalEvents: 200,
          maximumTotalProviderAttempts: 200,
          maximumTotalCostMicroUsd: 5_000_000,
          maximumSessionMinutes: 60,
          carryForwardPriorAccounting: true,
          timeoutRetryForbidden: true,
        },
        historicalObservability: "UNAVAILABLE_HTTP_403_NO_SCOPE_ESCALATION",
      },
    );
  });

  it("separates dispatch authorization from provider receipt and freezes conservative WP8D accounting", () => {
    const record = currentWork as {
      wp8dDurableLifecycleDiagnosticsPlan: {
        observedState: Record<string, unknown>;
        evidenceBoundary: Record<string, unknown>;
        requiredCheckpoints: string[];
        webhookLifecycle: Record<string, unknown>;
        isolatedDiagnostic: Record<string, unknown>;
        secondAttemptReconciliationProposal: Record<string, unknown>;
      };
    };
    expect(record.wp8dDurableLifecycleDiagnosticsPlan).toMatchObject({
      observedState: {
        sessionState: "STOPPED",
        aiEnabled: false,
        admittedEvents: 2,
        providerAttempts: 2,
        budgetConsumedMicroUsd: 12_932,
        budgetReservedMicroUsd: 12_932,
        inFlight: 1,
        actualUsage: "UNKNOWN",
        latestLifecyclePresent: false,
      },
      evidenceBoundary: {
        dispatchAuthorizationProvesFetchStarted: false,
        fetchStartedProvesProviderReceived: false,
        preFetchCheckpointProvesProviderReceived: false,
        remoteRootCauseConfirmed: false,
      },
      webhookLifecycle: {
        executionContextWaitUntilRequired: true,
        waitUntilMaximumSeconds: 30,
        waitUntilDurabilityGuarantee: false,
        allPromisesTracked: true,
      },
      isolatedDiagnostic: {
        authenticatedTestAdminOnly: true,
        separateDurableObject: true,
        providerCalls: 0,
        lineReplies: 0,
        remoteInvocationAuthorized: false,
      },
      secondAttemptReconciliationProposal: {
        requiredSessionState: "STOPPED",
        requiredProviderAttempts: 2,
        requiredBudgetConsumedMicroUsd: 12_932,
        requiredBudgetReservedMicroUsd: 12_932,
        requiredInFlight: 1,
        disposition: "CONSUME_FULL_RESERVATION_NO_REFUND",
        finalBudgetConsumedMicroUsd: 25_864,
        finalBudgetReservedMicroUsd: 0,
        finalInFlight: 0,
        actualUsage: "UNKNOWN",
        sessionRemainsStopped: true,
        idempotent: true,
        deleteEvidence: false,
        remoteExecutionAuthorized: false,
      },
    });
    expect(
      record.wp8dDurableLifecycleDiagnosticsPlan.requiredCheckpoints,
    ).toEqual([
      "DISPATCH_AUTHORIZED",
      "OUTBOUND_FETCH_STARTING",
      "FETCH_PROMISE_CREATED",
      "RESPONSE_HEADERS_RECEIVED",
      "RESPONSE_BODY_READ",
      "RESPONSE_PARSED",
      "SETTLEMENT_STARTED",
      "SETTLEMENT_SUCCEEDED",
    ]);
  });

  it("freezes exact identity, conservative reconciliation, isolated self-test, and one-event retest", () => {
    const record = currentWork as {
      wp8eExactStateReconciliationControlledRetestPlan: {
        authorizationStatus: string;
        controlBaseCommit: string;
        exactTestWorker: string;
        exactTestDomain: string;
        exactPilotObject: string;
        preMutationState: Record<string, unknown>;
        exactIdentityContract: Record<string, unknown>;
        expectedTransition: Record<string, unknown>;
        isolatedLifecycleSelfTest: Record<string, unknown>;
        oldAttemptIsolation: Record<string, unknown>;
        conditionalLiveRetest: Record<string, unknown>;
        candidateDeploymentOccurred: boolean;
        testDeploymentAuthorization: boolean;
        remoteReconciliationAuthorization: boolean;
        noNetworkLifecycleSelfTestAuthorization: boolean;
        conditionalLiveProviderAuthorization: boolean;
        productionStatus: string;
        issueMustRemainOpen: boolean;
      };
    };
    expect(
      record.wp8eExactStateReconciliationControlledRetestPlan,
    ).toMatchObject({
      authorizationStatus:
        "AUTHORIZED_EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST",
      controlBaseCommit: "d15b3f0fd794a5a08c0251a88a0a663a23d1141b",
      exactTestWorker: "malispang-lineoa-test",
      exactTestDomain: "malispang-lineoa-test.eakkachai-dev.workers.dev",
      exactPilotObject: "mp06-pilot-control-v1",
      preMutationState: {
        sessionState: "STOPPED",
        stopReason: "IN_FLIGHT_USAGE_UNKNOWN",
        admittedEvents: 2,
        providerAttempts: 2,
        budgetConsumedMicroUsd: 12_932,
        budgetReservedMicroUsd: 12_932,
        inFlight: 1,
        existingTerminalUsageUnknownAttempts: 1,
        staleDispatchedAttempts: 1,
        actualUsage: "UNKNOWN",
      },
      exactIdentityContract: {
        sessionReferenceRequired: true,
        attemptTargetReferenceRequired: true,
        countersAloneForbidden: true,
        attemptReferenceDisclosureForbidden: true,
        atomicTransactionRequired: true,
        idempotent: true,
        lateSettlementMustBeNoOp: true,
      },
      expectedTransition: {
        finalSessionState: "STOPPED",
        finalStopReason: "PROVIDER_USAGE_UNKNOWN_RECONCILED",
        finalAdmittedEvents: 2,
        finalProviderAttempts: 2,
        finalBudgetConsumedMicroUsd: 25_864,
        finalBudgetReservedMicroUsd: 0,
        finalInFlight: 0,
        attemptTerminalState: "USAGE_UNKNOWN",
        actualUsage: "UNKNOWN",
        refund: false,
        deleteEvidence: false,
      },
      isolatedLifecycleSelfTest: {
        authenticatedTestAdminOnly: true,
        separateDurableObject: true,
        providerCalls: 0,
        lineReplies: 0,
        mustCompleteBeforeReconciliation: true,
        mustNotMutatePilotAccounting: true,
      },
      oldAttemptIsolation: {
        terminalBeforeNewSession: true,
        retryForbidden: true,
        resultAuthorizationForbidden: true,
        lateSettlementIdempotentNoOp: true,
        externalProviderCompletionRemainsUnknown: true,
      },
      conditionalLiveRetest: {
        maximumNewSessions: 1,
        maximumOwnerLineEvents: 1,
        maximumSessionMinutes: 60,
        maximumCumulativeEvents: 200,
        maximumCumulativeProviderAttempts: 200,
        maximumCumulativeCostMicroUsd: 5_000_000,
        carryForwardPriorAccounting: true,
        separateLiveProbeForbidden: true,
        retryForbidden: true,
        ownerMessageRequired: true,
      },
      candidateDeploymentOccurred: false,
      testDeploymentAuthorization: true,
      remoteReconciliationAuthorization: true,
      noNetworkLifecycleSelfTestAuthorization: true,
      conditionalLiveProviderAuthorization: true,
      productionStatus: "NO_GO",
      issueMustRemainOpen: true,
    });
  });

  it("authorizes scoped acceptance work while deployment and incomplete draft PR remain blocked", () => {
    const record = currentWork as { allowedScope: string[] };
    expect(record.allowedScope).toContain(
      "MP_06_WP8F_TEST_ACCEPTANCE_COMPLETION",
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
      evaluateProjectAction(
        roadmap,
        currentWork,
        "RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A",
      ),
    ).toEqual({
      allowed: false,
      reason: "RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_WP8B",
      ),
    ).toEqual({
      allowed: false,
      reason: "PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_WP8B_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C",
      ),
    ).toEqual({
      allowed: false,
      reason: "PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_WP8D",
      ),
    ).toEqual({
      allowed: false,
      reason: "DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_WP8D_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "TEST_ACCEPTANCE_COMPLETION_WP8F",
      ),
    ).toEqual({ allowed: true, reason: "AUTHORIZED_BY_CURRENT_WORK" });
    expect(evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST")).toEqual({
      allowed: false,
      reason: "DEPLOY_TEST_NOT_AUTHORIZED",
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

  it("records completed WP8A enforcement while preserving no-remote-mutation posture", () => {
    const record = currentWork as {
      wp8aRuntimePilotControlPlan: Record<string, unknown> & {
        coordinator: Record<string, unknown>;
        limits: Record<string, unknown>;
      };
    };
    expect(record.wp8aRuntimePilotControlPlan).toMatchObject({
      implementationStatus: "COMPLETED_AT_RUNTIME_COMMIT",
      controlAuthorizationCommit: "4da15774c7d19027f48a443488f3db8a0c248f23",
      runtimeImplementationCommit: "d48c5066a4b92d4035bcf41076734199cc0fea4a",
      remediationVerdict: "PASS",
      blocker: "WP8_GATE_B_RUNTIME_ENFORCEMENT_MISSING",
      readinessCorrection:
        "WP6_OPERATOR_CONDITIONS_CLOSED_RUNTIME_ENFORCEMENT_NOT_VERIFIED",
      coordinator: {
        existingNamespace: "CONVERSATION_STATE",
        reservedObjectName: "mp06-pilot-control-v1",
        storageBackend: "SQLITE",
        sharedAcrossAllTesters: true,
        newBindingRequired: false,
        newRemoteResourceRequired: false,
      },
      limits: {
        maximumTesters: 5,
        rollingMinuteEvents: 20,
        rollingHourEvents: 200,
        maximumSessionEvents: 200,
        maximumProviderAttempts: 200,
        maximumSessionMinutes: 60,
        maximumSessionCostMicroUsd: 5_000_000,
        maximumConcurrentProviderRequests: 1,
      },
      testDeploymentAuthorization: false,
      remoteMutationAuthorization: false,
      productionStatus: "NO_GO",
      issueMustRemainOpen: true,
    });
  });

  it("fails closed when completed WP8A evidence or historical no-deploy posture drifts", () => {
    const changed = clone(currentWork) as {
      authorization: { runtimePilotControlRemediationWp8a: boolean };
      wp8aRuntimePilotControlPlan: {
        coordinator: { sharedAcrossAllTesters: boolean };
        limits: { rollingMinuteEvents: number };
        testDeploymentAuthorization: boolean;
      };
    };
    changed.authorization.runtimePilotControlRemediationWp8a = true;
    changed.wp8aRuntimePilotControlPlan.coordinator.sharedAcrossAllTesters = false;
    changed.wp8aRuntimePilotControlPlan.limits.rollingMinuteEvents = 21;
    changed.wp8aRuntimePilotControlPlan.testDeploymentAuthorization = true;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION_MUST_BE_COMPLETE",
        "WP8A_COORDINATOR_SCOPE_INVALID",
        "WP8A_MINUTE_EVENTS_INVALID",
        "WP8A_TEST_DEPLOYMENT_MUST_BE_FALSE",
      ]),
    );
  });

  it("records the deployed TEST candidate, rollback rehearsal and LINE smoke blocker", () => {
    const record = currentWork as {
      wp8TestPilotPlan: Record<string, unknown>;
    };
    expect(record.wp8TestPilotPlan).toMatchObject({
      authorizationStatus: "DEPLOYED_PARTIAL_AWAITING_LINE_TEST",
      executionControlBaseCommit: "ae4ec0c312a40c577e5e4e27ac07273f5f3849f4",
      candidateRuntimeCommit: "d48c5066a4b92d4035bcf41076734199cc0fea4a",
      candidateArtifactSha256:
        "810c6d51f4898076ce2d6c4f93666128370387e79263d695021c50cf250ed36b",
      workerName: "malispang-lineoa-test",
      rollbackTargetVersionId: "3e02e79b-29c9-46cf-9218-ed2d0b7d7655",
      credentialSlot: "OPENAI_API_KEY",
      deploymentOccurred: true,
      currentDeployedRevision: "509c3587-7ae9-41a8-8ba2-1082d03e138d",
      pilotAiEnabled: false,
      pilotClosed: true,
      ownerUatStatus: "PENDING",
      gateA: "PASS_SAFE_OVER_HANDOFF_ONLY",
      gateB: "PASS_RUNTIME_ENFORCED",
      gateC: "PASS_RETAINED_TEST_V21_NO_AI",
      rollbackRehearsal: "PASS",
      rollbackCommandSeconds: 3,
      candidateRecoverySeconds: 7,
      lineSmokeStatus: "BLOCKED_TESTER_IDENTITY_NOT_PROVISIONED",
      finalTestState: "CANDIDATE_DEPLOYED_AI_OFF_PILOT_STOPPED",
      testEventsUsed: 0,
      providerAttemptsUsed: 0,
      costConsumedMicroUsd: 0,
      verdict: "WP8_TEST_PILOT_PARTIAL_AWAITING_LINE_TEST",
      maximumTestEvents: 200,
      maximumProviderAttempts: 200,
      maximumSessionMinutes: 60,
      maximumCostMicroUsd: 5_000_000,
      productionStatus: "NO_GO",
      issueMustRemainOpen: true,
    });
  });

  it("fails closed when WP8 target, gates, budgets or occurred state drift", () => {
    const changed = clone(currentWork) as {
      wp8TestPilotPlan: {
        workerName: string;
        gateB: string;
        maximumProviderAttempts: number;
        deploymentOccurred: boolean;
      };
    };
    changed.wp8TestPilotPlan.workerName = "production-worker";
    changed.wp8TestPilotPlan.gateB = "UNKNOWN";
    changed.wp8TestPilotPlan.maximumProviderAttempts = 201;
    changed.wp8TestPilotPlan.deploymentOccurred = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP8_WORKER_INVALID",
        "WP8_GATE_B_INVALID",
        "WP8_ATTEMPT_BUDGET_INVALID",
        "WP8_DEPLOYMENT_EVIDENCE_MISSING",
      ]),
    );
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

  it("separates TEST deployment authorization from deployment occurrence", () => {
    const changedRoadmap = clone(roadmap) as {
      authorization: {
        testDeploymentAuthorization: boolean;
        testDeploymentOccurred: boolean;
        testDeployment: boolean;
        productionStatus: string;
        productionAuthorizationReference: string | null;
      };
    };
    const changedWork = clone(currentWork) as {
      authorization: {
        testDeploymentAuthorization: boolean;
        testDeploymentOccurred: boolean;
        testDeployment: boolean;
        production: boolean;
      };
    };
    changedRoadmap.authorization.testDeploymentAuthorization = true;
    changedRoadmap.authorization.testDeploymentOccurred = false;
    changedRoadmap.authorization.testDeployment = true;
    changedRoadmap.authorization.productionStatus = "GO";
    changedRoadmap.authorization.productionAuthorizationReference =
      "unapproved";
    changedWork.authorization.testDeploymentAuthorization = true;
    changedWork.authorization.testDeploymentOccurred = false;
    changedWork.authorization.testDeployment = true;
    changedWork.authorization.production = true;
    expect(validateProjectControl(changedRoadmap, changedWork).errors).toEqual(
      expect.arrayContaining([
        "TEST_DEPLOYMENT_OCCURRENCE_EVIDENCE_MISSING",
        "TEST_DEPLOYMENT_MUST_BE_FALSE_BEFORE_WP8C_DEPLOY",
        "PRODUCTION_MUST_REMAIN_NO_GO",
        "PRODUCTION_AUTHORIZATION_MUST_BE_ABSENT",
        "CURRENT_WORK_TEST_DEPLOYMENT_OCCURRENCE_EVIDENCE_MISSING",
        "CURRENT_WORK_TEST_DEPLOYMENT_MUST_BE_FALSE_BEFORE_WP8C_DEPLOY",
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

  it("rejects policy checksum drift or WP8E scope removal/expansion", () => {
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
      "WP8F_SCOPE_INVALID",
    );

    const missingAssessmentScope = clone(currentWork) as {
      allowedScope: string[];
    };
    missingAssessmentScope.allowedScope =
      missingAssessmentScope.allowedScope.filter(
        (scope) => scope !== "MP_06_WP8F_TEST_ACCEPTANCE_COMPLETION",
      );
    expect(
      validateProjectControl(roadmap, missingAssessmentScope).errors,
    ).toContain("WP8F_SCOPE_INVALID");
  });

  it("fails closed when WP8E exact identity, accounting, isolation, or live caps drift", () => {
    const changed = clone(currentWork) as {
      wp8eExactStateReconciliationControlledRetestPlan: {
        preMutationState: { providerAttempts: number };
        exactIdentityContract: { countersAloneForbidden: boolean };
        expectedTransition: {
          finalBudgetConsumedMicroUsd: number;
          refund: boolean;
        };
        isolatedLifecycleSelfTest: { providerCalls: number };
        oldAttemptIsolation: { lateSettlementIdempotentNoOp: boolean };
        conditionalLiveRetest: {
          maximumOwnerLineEvents: number;
          retryForbidden: boolean;
        };
      };
    };
    const plan = changed.wp8eExactStateReconciliationControlledRetestPlan;
    plan.preMutationState.providerAttempts = 1;
    plan.exactIdentityContract.countersAloneForbidden = false;
    plan.expectedTransition.finalBudgetConsumedMicroUsd = 12_932;
    plan.expectedTransition.refund = true;
    plan.isolatedLifecycleSelfTest.providerCalls = 1;
    plan.oldAttemptIsolation.lateSettlementIdempotentNoOp = false;
    plan.conditionalLiveRetest.maximumOwnerLineEvents = 2;
    plan.conditionalLiveRetest.retryForbidden = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "WP8E_ATTEMPT_COUNT_INVALID",
        "WP8E_IDENTITY_CONTRACT_COUNTERSALONEFORBIDDEN_INVALID",
        "WP8E_FINAL_CONSUMED_INVALID",
        "WP8E_REFUND_FORBIDDEN",
        "WP8E_SELF_TEST_PROVIDER_CALL_FORBIDDEN",
        "WP8E_OLD_ATTEMPT_LATESETTLEMENTIDEMPOTENTNOOP_INVALID",
        "WP8E_MAX_LINE_EVENTS_INVALID",
        "WP8E_RETRY_FORBIDDEN",
      ]),
    );
    expect(
      evaluateProjectAction(
        roadmap,
        changed,
        "EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E",
      ),
    ).toEqual({ allowed: false, reason: "ROADMAP_UNVERIFIED" });
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
      (scope) => scope !== "CHANGE_MP_06_RUNTIME_OUTSIDE_WP8A_PILOT_CONTROLS",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "FORBIDDEN_SCOPE_MISSING_CHANGE_MP_06_RUNTIME_OUTSIDE_WP8A_PILOT_CONTROLS",
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

describe("WP8F scoped acceptance safety gates", () => {
  it("denies old reconciliation and draft PR before verified TEST acceptance", () => {
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E",
      ).allowed,
    ).toBe(false);
    expect(
      evaluateProjectAction(roadmap, currentWork, "CREATE_DRAFT_PR"),
    ).toEqual({
      allowed: false,
      reason: "TEST_ACCEPTANCE_REQUIRED_BEFORE_DRAFT_PR",
    });
  });
  it("fails closed when cumulative accounting, session cap or deploy approval requirement changes", () => {
    for (const [key, value] of [
      ["baselineConsumedMicroUsd", 0],
      ["maximumNewSessions", 2],
      ["carryForwardAccounting", false],
      ["newSourceDeploymentRequiresOwnerApproval", false],
      ["issueClosureAuthorized", true],
    ] as const) {
      const changed = structuredClone(currentWork) as {
        wp8fTestAcceptancePlan: Record<string, unknown>;
      };
      changed.wp8fTestAcceptancePlan[key] = value;
      expect(validateProjectControl(roadmap, changed).errors).toContain(
        `WP8F_${key.toUpperCase()}_INVALID`,
      );
      expect(
        evaluateProjectAction(
          roadmap,
          changed,
          "TEST_ACCEPTANCE_COMPLETION_WP8F",
        ).allowed,
      ).toBe(false);
    }
  });
});
