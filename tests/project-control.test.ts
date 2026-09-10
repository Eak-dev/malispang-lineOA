import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CANONICAL_GITHUB_ISSUES,
  evaluateProjectAction,
  evaluateWp8fPaths,
  validateWp8fOwnerDecisionRecord,
  validateProjectControl,
  validateSchemaDocuments,
  validateSuccessorOperationJournal,
} from "../src/project-control.js";

const root = new URL("../", import.meta.url);

// Synthetic independent operator evidence, not populated from current-work.
// Passing this pure assessment is deliberately NOT a deployment capability.
const v19Target = {
  worker: "malispang-lineoa-test",
  sourceCommit: "c59eb5e12bb96a34da38759a5585be67d8c2ab6e",
  artifactSha256:
    "2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308",
};
const v19Now = Date.parse("2026-09-09T03:00:00.000Z");
function v19Evidence() {
  return {
    provenance: "INDEPENDENT_OPERATOR_VERIFICATION",
    candidate: {
      sourceCommit: v19Target.sourceCommit,
      originalControlCommit: "64d598183ea55c3b79e3f27aa9f9992bc318ac27",
      evidenceBaseline: "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f",
      previousEvidenceBaseline: "42026b22069e4299dfc8ff5f73b5077e3b0856fb",
      readmeOnlyAdvanceVerified: true,
      ownerIntegrationVerified: true,
      integrationMergeCommit: "aad8c5e0ef41c5e47df3d93ae462b9122368c15d",
      integrationIncludesCandidateHistory: true,
      integrationIsReleaseAcceptance: false,
      originalControlIsCandidateAncestor: true,
      candidateIsV19ControlAncestor: true,
      v19ControlCommit: "a".repeat(40),
      v19ControlParent: "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f",
      v19OwnerDecision: "MP-OD-2026-09-09-V19",
      committedPushedAndClean: true,
      v19ControlGatesPassed: true,
      exactDiffReviewed: true,
      postCandidatePaths: [
        "src/project-control.ts",
        "config/project/current-work.json",
        "README.md",
      ],
      noDeployAffectingChangesAfterCandidate: true,
      originalChangedPaths: [
        "PROJECT_CONTROL.md",
        "config/project/current-work.json",
        "config/project/current-work.schema.json",
        "config/project/roadmap.json",
        "docs/project/EXECUTION_GATES.md",
        "docs/project/OWNER_DECISION_LOG.md",
        "docs/project/ROADMAP_CHANGELOG.md",
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "src/project-control-cli.ts",
        "src/project-control.ts",
        "tests/mp-06-wp1.test.ts",
        "tests/project-control.test.ts",
        "worker-tests/durable-state.test.ts",
        "worker-tests/mp-06-pilot-control.test.ts",
        "worker/durable-objects.ts",
        "worker/index.ts",
        "worker/mp-06-wp1.ts",
        "docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md",
      ],
      cleanFrozenCheckout: true,
      nodeVersion: "24.19.0",
      pnpmVersion: "11.19.0",
      reproducedArtifactSha256: v19Target.artifactSha256,
      testsPassed: 733,
      testsFailed: 0,
      testsSkipped: 0,
      testsCancelled: 0,
      auditAllLevelsZero: true,
      protectedChecksumsUnchanged: true,
    },
    test: {
      worker: v19Target.worker,
      environment: "TEST_ONLY",
      accountIdentity: "c395…407d",
      accountIdentityVerified: true,
      version: "8486019d-9b62-4de9-ae15-6299909a23d9",
      sourceCommit: "8a5b6547b4713ff50ad6b08ee58682e129641b6a",
      artifactSha256:
        "15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64",
      sourceArtifactAssociationVerified: true,
      trafficPercent: 100,
      bindingsSecretsAndConfigurationVerified: true,
      pilot: "STOPPED",
      aiAdmission: false,
      events: 6,
      attempts: 6,
      consumedMicroUsd: 34082,
      reservedMicroUsd: 0,
      inFlight: 0,
      pendingAttempts: 0,
      conservativeMicroUsd: 25864,
      reportedUsageMicroUsd: 8218,
      usageUnknownAttempts: 2,
      settledAttempts: 4,
      independentlyVerifiedBilling: "UNKNOWN",
      ownerIdentityVerified: true,
      ownerMode: "HUMAN_HANDOFF",
      clarificationUsed: false,
      pendingTemplate: null,
      pendingReplies: 0,
      draftState: "EXPIRED_PURGED",
      draftPurgeInvariantsVerified: true,
      draftPendingReplies: 0,
      pendingDeliveryClaims: 0,
      deliveryInventoryVerified: true,
      schemaObservationVerified: true,
      schemaSnapshotSha256: "b".repeat(64),
      observedAt: v19Now,
    },
    operation: {
      status: "APPROVED_UNUSED",
      used: 0,
      maximum: 1,
      remoteOutcome: "NOT_STARTED",
      verifiedAt: v19Now,
    },
    containment: {
      independentOfOldRuntime: true,
      ownerNoLine: true,
      noProviderPath: true,
      additiveIdempotentSchemaVerified: true,
      preservesLedgerHistoryConversation: true,
      unexpectedEventProcedureVerified: true,
      failClosedFixForward: true,
      automaticRollback: false,
      newAuthorityBoundariesRecorded: true,
      failureCases: [
        "BEFORE_REMOTE_MUTATION",
        "REMOTE_MUTATION_REJECTED",
        "REMOTE_OUTCOME_UNKNOWN",
        "VERSION_CREATED_TRAFFIC_UNCHANGED",
        "TRAFFIC_CHANGED_VERIFICATION_FAILED",
        "SCHEMA_MIGRATION_FAILED",
        "UNEXPECTED_EVENT_DURING_DEPLOYMENT",
      ],
    },
  };
}
function assessV19(evidence: unknown = v19Evidence(), target = v19Target) {
  return evaluateProjectAction(
    roadmap,
    currentWork,
    "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS",
    target,
    evidence,
  );
}

describe("v19 exact preparation-only authorization", () => {
  it("records the Owner PR merge without self-authorizing acceptance or hiding full-history integration", () => {
    const work = currentWork as {
      wp8fExactDeploymentPreparation: {
        integrationEvent: Record<string, unknown>;
      };
      conflicts: { code: string }[];
    };
    const event = work.wp8fExactDeploymentPreparation.integrationEvent;
    expect(event.pullRequest).toBe(14);
    expect(event.includesFullBranchHistory).toBe(true);
    expect(event.status).toBe("INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW");
    for (const key of Object.keys(event)) {
      const changed = clone(currentWork) as typeof work;
      changed.wp8fExactDeploymentPreparation.integrationEvent[key] =
        "UNVERIFIED";
      expect(validateProjectControl(roadmap, changed).errors, key).toContain(
        "V19_INTEGRATIONEVENT_INVALID",
      );
      expect(
        evaluateProjectAction(
          roadmap,
          changed,
          "DEPLOY_TEST",
          v19Target,
          v19Evidence(),
        ).allowed,
      ).toBe(false);
    }
    for (const changes of [
      { testAcceptancePassed: true },
      { finalSecurityReleaseReviewPassed: true },
      { productionAcceptancePassed: true },
      { deploymentOccurredByIntegration: true },
      { additionalPrOrMergeAuthorized: true },
      { includesFullBranchHistory: false },
    ]) {
      const changed = clone(currentWork) as typeof work;
      Object.assign(
        changed.wp8fExactDeploymentPreparation.integrationEvent,
        changes,
      );
      expect(validateProjectControl(roadmap, changed).errors).toContain(
        "V19_INTEGRATIONEVENT_INVALID",
      );
    }
    const stale = clone(currentWork) as typeof work;
    stale.conflicts[0]!.code = "DEFAULT_BRANCH_DRIFT";
    expect(validateProjectControl(roadmap, stale).errors).toEqual(
      expect.arrayContaining([
        "STALE_PRE_INTEGRATION_CONFLICT",
        "OWNER_INTEGRATION_EVENT_NOT_RECORDED",
      ]),
    );
  });
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(v19Now);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires independent complete evidence and never turns readiness into remote execution", () => {
    expect(assessV19()).toEqual({
      allowed: true,
      reason: "READY_FOR_EXACT_TEST_DEPLOYMENT",
    });
    for (const action of [
      "DEPLOY_TEST",
      "UPLOAD_TEST_VERSION",
      "CREATE_TEST_VERSION",
      "CHANGE_TEST_TRAFFIC",
      "OPEN_CONTINUATION",
      "TEST_ACCEPTANCE_COMPLETION_WP8F",
      "RECOVER_CONVERSATION",
      "ROLLBACK_TEST",
      "CREATE_DRAFT_PR",
      "MERGE_DEFAULT_BRANCH",
      "CLOSE_ISSUE",
      "QUERY_PRODUCTION",
      "CHANGE_PRODUCTION",
    ])
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          action,
          v19Target,
          v19Evidence(),
        ).allowed,
        action,
      ).toBe(false);
  });
  it("requires every candidate, observation, operation and containment field rather than manifest self-attestation", () => {
    for (const group of [
      "candidate",
      "test",
      "operation",
      "containment",
    ] as const) {
      for (const field of Object.keys(v19Evidence()[group])) {
        const evidence = v19Evidence();
        Reflect.deleteProperty(evidence[group], field);
        expect(assessV19(evidence).allowed, `${group}.${field}`).toBe(false);
      }
      const missing = v19Evidence();
      Reflect.deleteProperty(missing, group);
      expect(assessV19(missing).allowed, group).toBe(false);
    }
    for (const input of [
      undefined,
      null,
      {},
      currentWork,
      { provenance: "CURRENT_WORK_MANIFEST", ...validCandidateEvidence() },
      { ...v19Evidence(), provenance: "CURRENT_WORK_MANIFEST" },
      { ...v19Evidence(), test: currentWork },
    ])
      expect(assessV19(input === undefined ? null : input).allowed).toBe(false);
  });
  it("pins exact source and artifact, never evidence HEAD or current/latest aliases", () => {
    for (const field of ["sourceCommit", "artifactSha256", "worker"] as const)
      for (const value of [
        "latest",
        "active",
        "UNKNOWN",
        "*",
        "42026b22069e4299dfc8ff5f73b5077e3b0856fb",
        "0".repeat(64),
      ])
        expect(
          assessV19(v19Evidence(), { ...v19Target, [field]: value }).allowed,
        ).toBe(false);
  });
  it("pins the original control-to-candidate-to-v19 lineage without pretending v19 precedes the frozen runtime", () => {
    for (const changes of [
      { originalControlCommit: "a".repeat(40) },
      { v19ControlCommit: v19Target.sourceCommit },
      { v19ControlCommit: "42026b22069e4299dfc8ff5f73b5077e3b0856fb" },
      { v19ControlCommit: "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f" },
      { v19ControlParent: "42026b22069e4299dfc8ff5f73b5077e3b0856fb" },
      { v19ControlParent: "3db7738da3edc3da265ebb623190de03a629c0ff" },
      { candidateIsV19ControlAncestor: false },
      { originalControlIsCandidateAncestor: false },
      { v19OwnerDecision: "SELF_APPROVED" },
      { evidenceBaseline: v19Target.sourceCommit },
      { noDeployAffectingChangesAfterCandidate: false },
      { postCandidatePaths: ["worker/index.ts"] },
      { postCandidatePaths: ["package.json"] },
      { postCandidatePaths: ["wrangler.jsonc"] },
      { postCandidatePaths: ["./src/project-control.ts"] },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.candidate, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("requires all twenty original changed paths with no duplicates or unknown path", () => {
    for (const paths of [
      [],
      ["*"],
      v19Evidence().candidate.originalChangedPaths.slice(1),
      [
        ...v19Evidence().candidate.originalChangedPaths.slice(1),
        "worker/index.ts",
      ],
      [
        ...v19Evidence().candidate.originalChangedPaths.slice(1),
        "worker/routing.ts",
      ],
    ]) {
      const evidence = v19Evidence();
      evidence.candidate.originalChangedPaths = paths;
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("rejects stale, future and nonnumeric observations at the controlled clock boundary", () => {
    for (const value of [
      v19Now - 120001,
      v19Now + 1,
      NaN,
      Infinity,
      "UNKNOWN",
      null,
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.test, { observedAt: value });
      Object.assign(evidence.operation, { verifiedAt: value });
      expect(assessV19(evidence).allowed).toBe(false);
    }
    const boundary = v19Evidence();
    boundary.test.observedAt = v19Now - 120000;
    boundary.operation.verifiedAt = boundary.test.observedAt;
    expect(assessV19(boundary).allowed).toBe(true);
  });
  it("rejects swapped/unknown triplets, artifact drift, rollback-pair misuse and wrong account/environment", () => {
    for (const changes of [
      { version: "latest" },
      { version: "83fab7f1-646a-4ed8-be4d-a5f38df3a072" },
      { sourceCommit: "f986a478bc980f9e53748ed49cedd543f54cd64a" },
      { artifactSha256: v19Target.artifactSha256 },
      { sourceCommit: v19Target.sourceCommit },
      { accountIdentity: "OTHER_ACCOUNT" },
      { environment: "PRODUCTION" },
      { worker: "malispang-lineoa" },
      { trafficPercent: 99 },
      { sourceArtifactAssociationVerified: false },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.test, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("denies ledger drift, active work, pending claims and unknown schema instead of treating unknown as zero", () => {
    for (const changes of [
      { events: 5 },
      { events: 7 },
      { attempts: 7 },
      { consumedMicroUsd: 34081 },
      { reservedMicroUsd: 1 },
      { inFlight: 1 },
      { pendingAttempts: 1 },
      { pendingDeliveryClaims: 1 },
      { pendingDeliveryClaims: "UNKNOWN" },
      { deliveryInventoryVerified: false },
      { schemaObservationVerified: false },
      { schemaSnapshotSha256: "UNKNOWN" },
      { pilot: "ACTIVE" },
      { aiAdmission: true },
      { ownerIdentityVerified: false },
      { ownerMode: "BOT_ACTIVE" },
      { pendingTemplate: "T-C01" },
      { clarificationUsed: true },
      { draftPendingReplies: 1 },
      { draftState: "ACTIVE" },
      { pendingReplies: 1 },
      { conservativeMicroUsd: 0 },
      { reportedUsageMicroUsd: 34082 },
      { usageUnknownAttempts: 0 },
      { settledAttempts: 6 },
      { independentlyVerifiedBilling: "VERIFIED" },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.test, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("keeps outcome uncertainty consumed and blocked even when a mutable counter is reset to zero", () => {
    for (const remoteOutcome of [
      "UNKNOWN",
      "REJECTED",
      "VERSION_CREATED",
      "TRAFFIC_CHANGED",
      "SUCCEEDED",
    ])
      for (const used of [0, 1]) {
        const evidence = v19Evidence();
        Object.assign(evidence.operation, { remoteOutcome, used });
        expect(assessV19(evidence).allowed).toBe(false);
      }
    for (const changes of [
      { used: 1 },
      { used: -1 },
      { maximum: 2 },
      { status: "APPROVED_USED" },
      { verifiedAt: v19Now - 1 },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.operation, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("requires independent containment, all seven failure branches and new-approval boundaries", () => {
    for (const changes of [
      { independentOfOldRuntime: false },
      { automaticRollback: true },
      { unexpectedEventProcedureVerified: false },
      { additiveIdempotentSchemaVerified: false },
      { preservesLedgerHistoryConversation: false },
      { noProviderPath: false },
      { ownerNoLine: false },
      { failClosedFixForward: false },
      { newAuthorityBoundariesRecorded: false },
      { failureCases: v19Evidence().containment.failureCases.slice(1) },
      { failureCases: Array(7).fill("BEFORE_REMOTE_MUTATION") },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.containment, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("keeps exact tests, audit, toolchain and artifact evidence tied to the candidate", () => {
    for (const changes of [
      { testsPassed: 732 },
      { testsFailed: 1 },
      { testsSkipped: 1 },
      { testsCancelled: 1 },
      { auditAllLevelsZero: false },
      { protectedChecksumsUnchanged: false },
      { cleanFrozenCheckout: false },
      { nodeVersion: "24.18.0" },
      { pnpmVersion: "11.18.0" },
      { reproducedArtifactSha256: "0".repeat(64) },
      { committedPushedAndClean: false },
      { v19ControlGatesPassed: false },
      { exactDiffReviewed: false },
      { readmeOnlyAdvanceVerified: false },
      { ownerIntegrationVerified: false },
      { integrationMergeCommit: "a".repeat(40) },
      { integrationIncludesCandidateHistory: false },
      { integrationIsReleaseAcceptance: true },
    ]) {
      const evidence = v19Evidence();
      Object.assign(evidence.candidate, changes);
      expect(assessV19(evidence).allowed).toBe(false);
    }
  });
  it("closes the new preparation record and schema, preserving historical v18 invariants", () => {
    const current = currentWork as {
      wp8fExactDeploymentPreparation: Record<string, unknown>;
    };
    const schema = currentWorkSchema as {
      required: string[];
      properties: Record<string, { const: unknown }>;
    };
    expect(schema.required).toContain("wp8fExactDeploymentPreparation");
    expect(schema.properties.wp8fExactDeploymentPreparation?.const).toEqual(
      current.wp8fExactDeploymentPreparation,
    );
    expect(current.wp8fExactDeploymentPreparation.status).toBe(
      "APPROVED_UNUSED",
    );
    expect(current.wp8fExactDeploymentPreparation.operationsUsed).toBe(0);
    expect(
      current.wp8fExactDeploymentPreparation.remoteMutationPermittedThisRound,
    ).toBe(false);
    for (const key of [
      ...Object.keys(current.wp8fExactDeploymentPreparation),
      "allowAll",
      "currentWorkIsRemoteEvidence",
    ]) {
      const changed = clone(currentWork) as typeof current;
      changed.wp8fExactDeploymentPreparation[key] = "UNREVIEWED";
      expect(
        validateProjectControl(roadmap, changed).errors.length,
        key,
      ).toBeGreaterThan(0);
      expect(
        evaluateProjectAction(
          roadmap,
          changed,
          "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS",
          v19Target,
          v19Evidence(),
        ).allowed,
      ).toBe(false);
    }
    const missing = clone(currentWork) as Record<string, unknown>;
    delete missing.wp8fExactDeploymentPreparation;
    expect(validateProjectControl(roadmap, missing).errors).toContain(
      "V19_PREPARATION_MISSING",
    );
    const changedSchema = clone(currentWorkSchema) as typeof schema;
    delete changedSchema.properties.wp8fExactDeploymentPreparation;
    expect(validateSchemaDocuments(roadmapSchema, changedSchema)).toContain(
      "V19_PREPARATION_SCHEMA_NOT_CLOSED",
    );
  });
  it("permits only the ten control paths and two control-evidence documents, never old runtime scopes", () => {
    const work = currentWork as {
      wp8fExecutionEnvelope: {
        controlFiles: string[];
        remediationFiles: string[];
        dependencyFiles: string[];
      };
    };
    expect(work.wp8fExecutionEnvelope.controlFiles).toHaveLength(10);
    expect(
      evaluateWp8fPaths(
        roadmap,
        currentWork,
        "CONTROL_TRANSITION",
        work.wp8fExecutionEnvelope.controlFiles,
      ).allowed,
    ).toBe(true);
    for (const path of [
      ...work.wp8fExecutionEnvelope.remediationFiles,
      ...work.wp8fExecutionEnvelope.dependencyFiles,
      "wrangler.jsonc",
      "unknown.md",
      "*",
      "./PROJECT_CONTROL.md",
      "../PROJECT_CONTROL.md",
    ])
      for (const phase of [
        "CONTROL_TRANSITION",
        "EVIDENCE",
        "SECURITY_REMEDIATION",
        "DEPENDENCY_REMEDIATION",
      ])
        expect(
          evaluateWp8fPaths(roadmap, currentWork, phase, [path]).allowed,
          `${phase}/${path}`,
        ).toBe(false);
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "EVIDENCE", [
        "docs/project/EXECUTION_GATES.md",
        "docs/project/ROADMAP_CHANGELOG.md",
      ]).allowed,
    ).toBe(true);
  });
  it("requires the distinct append-only v19 Owner decision, not a copied old approval or self-approval", async () => {
    const text = await readFile(
      new URL("docs/project/OWNER_DECISION_LOG.md", root),
      "utf8",
    );
    for (const marker of [
      "MP-OD-2026-09-09-V19",
      "supersedes 2026.09.09-v18",
      v19Target.sourceCommit,
      v19Target.artifactSha256,
      "APPROVED_UNUSED, operations used0/maximum1",
      "STOP_BEFORE_FIRST_REMOTE_MUTATION",
      "ambiguous remote outcome consumes the single operation",
      "aad8c5e0ef41c5e47df3d93ae462b9122368c15d",
      "INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW",
    ])
      expect(
        validateWp8fOwnerDecisionRecord(text.replaceAll(marker, "UNAPPROVED")),
        marker,
      ).toBe(false);
    const r = clone(roadmap) as {
      version: string;
      ownerDecision: { decisionId: string };
    };
    r.version = "2026.09.09-v18";
    r.ownerDecision.decisionId = "MP-OD-2026-09-09-V18";
    expect(
      evaluateProjectAction(r, currentWork, "PREPARE_EXACT_TEST_DEPLOYMENT")
        .allowed,
    ).toBe(false);
  });
});
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
  it("accepts the 2026.09.09-v19 preparation snapshot and records premature Owner integration", () => {
    expect(validateProjectControl(roadmap, currentWork)).toEqual({
      errors: [],
      warnings: ["INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW"],
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
      "AUTHORIZED_EXACT_TEST_DEPLOYMENT_PREPARATION_WP8F_ONLY",
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

  it("authorizes preparation only while operational acceptance, deployment and draft PR remain blocked", () => {
    const record = currentWork as { allowedScope: string[] };
    expect(record.allowedScope).toContain(
      "MP_06_WP8F_EXACT_TEST_DEPLOYMENT_PREPARATION",
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
    ).toEqual({
      allowed: false,
      reason: "TEST_ACCEPTANCE_COMPLETION_WP8F_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "PREPARE_EXACT_TEST_DEPLOYMENT",
      ),
    ).toEqual({ allowed: true, reason: "AUTHORIZED_BY_CURRENT_WORK" });
    expect(evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST")).toEqual({
      allowed: false,
      reason: "EXACT_DEPLOYMENT_TARGET_REQUIRED",
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
        (scope) => scope !== "MP_06_WP8F_EXACT_TEST_DEPLOYMENT_PREPARATION",
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
      (scope) =>
        scope !== "CHANGE_RUNTIME_OUTSIDE_EXACT_APPROVED_V18_REMEDIATION",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "FORBIDDEN_SCOPE_MISSING_CHANGE_RUNTIME_OUTSIDE_EXACT_APPROVED_V18_REMEDIATION",
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

function readJson(path: string): unknown {
  // Keep all 85 historical contract tests against their exact approved v19 fixture.
  // Current v21 files have independent positive/negative tests below; no old assertions change.
  return JSON.parse(
    execFileSync(
      "git",
      ["show", "958b00eea5587d27858d3bdee1047ee52c0a736f:" + path],
      { cwd: fileURLToPath(root), encoding: "utf8", maxBuffer: 1024 * 1024 },
    ),
  ) as unknown;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe("WP8F scoped acceptance safety gates", () => {
  it("retains exact candidate checks but denies TEST deployment even with valid evidence in v18", () => {
    const target = {
      worker: "malispang-lineoa-test",
      sourceCommit: "1".repeat(40),
      artifactSha256:
        "f93807109b7d700f79a7b7b90979659ac285be8420e74fb809cc6900d78adec2",
    };
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "DEPLOY_TEST",
        target,
        validCandidateEvidence(target),
      ).allowed,
    ).toBe(false);
    for (const field of ["worker", "sourceCommit", "artifactSha256"] as const) {
      expect(
        evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST", {
          ...target,
          [field]: "wrong-target",
        }),
      ).toEqual({ allowed: false, reason: "EXACT_DEPLOYMENT_TARGET_REQUIRED" });
    }
  });
  it("rejects altered deployment approval and unapproved rollback or PR access", () => {
    for (const [field, value] of [
      ["sourceCommit", "0".repeat(40)],
      ["maximumCandidateDeployments", 2],
      ["rollbackRehearsalAuthorized", true],
      ["anyPullRequestAuthorized", true],
      ["preserveAccounting", false],
      ["candidateDeploymentOccurredAtAuthorization", true],
    ] as const) {
      const changed = structuredClone(currentWork) as {
        wp8fApprovedDeployment: Record<string, unknown>;
      };
      changed.wp8fApprovedDeployment[field] = value;
      expect(validateProjectControl(roadmap, changed).errors).toContain(
        `WP8F_DEPLOY_${field.toUpperCase()}_INVALID`,
      );
    }
  });
  it("requires the closed deployment plan in both manifest and schema", () => {
    const changed = structuredClone(currentWork) as {
      wp8fApprovedDeployment?: Record<string, unknown>;
    };
    delete changed.wp8fApprovedDeployment;
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "WP8F_APPROVED_DEPLOYMENT_MISSING",
    );
    const schema = currentWorkSchema as {
      required: string[];
      properties: { wp8fApprovedDeployment: { const: unknown } };
    };
    expect(schema.required).toContain("wp8fApprovedDeployment");
    expect(schema.properties.wp8fApprovedDeployment.const).toEqual(
      (currentWork as { wp8fApprovedDeployment: unknown })
        .wp8fApprovedDeployment,
    );
  });
  it("requires the explicit PR gate before acceptance and final review", () => {
    const changed = structuredClone(currentWork) as {
      forbiddenScope: string[];
    };
    changed.forbiddenScope = changed.forbiddenScope.filter(
      (scope) => scope !== "CREATE_PR_BEFORE_TEST_ACCEPTANCE_AND_FINAL_REVIEW",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "WP8F_ALL_PR_MUST_REMAIN_BLOCKED",
    );
  });
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
      reason: "ALL_PR_BLOCKED_PENDING_FINAL_REVIEW",
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

function validCandidateEvidence(
  target = {
    worker: "malispang-lineoa-test",
    sourceCommit: "1".repeat(40),
    artifactSha256: "2".repeat(64),
  },
) {
  return {
    candidate: {
      ownerDecision: "MP-OD-2026-09-09-V18",
      baseline: "3db7738da3edc3da265ebb623190de03a629c0ff",
      precedenceTestsPassed: true,
      continuationStorageTestsPassed: true,
      rollbackAdditiveCompatibilityPassed: true,
      sourceCommit: target.sourceCommit,
      validatedSourceCommit: target.sourceCommit,
      pushedSourceCommit: target.sourceCommit,
      artifactSha256: target.artifactSha256,
      reproducedArtifactSha256: target.artifactSha256,
      committed: true,
      baselineAncestryVerified: true,
      controlCommit: "3".repeat(40),
      controlParentCommit: "3db7738da3edc3da265ebb623190de03a629c0ff",
      controlOwnerDecision: "MP-OD-2026-09-09-V18",
      controlAncestryVerified: true,
      cleanCheckoutPassed: true,
      validationPassed: true,
      exactDiffReviewed: true,
      executablePaths: [
        "worker/index.ts",
        "worker/durable-objects.ts",
        "worker/mp-06-wp1.ts",
        "worker-tests/mp-06-pilot-control.test.ts",
      ],
    },
    test: {
      worker: target.worker,
      version: "8486019d-9b62-4de9-ae15-6299909a23d9",
      sourceCommit: "8a5b6547b4713ff50ad6b08ee58682e129641b6a",
      artifactSha256:
        "15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64",
      accountIdentity: "c395…407d",
      environment: "TEST_ONLY",
      observedAt: Date.now(),
      accountIdentityVerified: true,
      sourceArtifactVerified: true,
      secretsPresenceVerified: true,
      rollbackTargetVerified: true,
      accountingPreserved: true,
      events: 6,
      attempts: 6,
      consumedMicroUsd: 34082,
      pendingAttempts: 0,
      stopReason: "OPERATOR_STOP",
      pilot: "STOPPED",
      aiAdmission: false,
      reservedMicroUsd: 0,
      inFlight: 0,
    },
  };
}

describe("v16 explicit Owner execution envelope", () => {
  it("v19 freezes all three historically approved v18 dependency paths instead of renewing write authority", () => {
    for (const path of [
      "package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
    ]) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "DEPENDENCY_REMEDIATION", [
          path,
        ]).allowed,
      ).toBe(false);
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [path])
          .allowed,
      ).toBe(false);
    }
    for (const path of [
      ".npmrc",
      "pnpmfile.cjs",
      "worker/routing.ts",
      "worker/new.ts",
      "package-lock.json",
      "**",
      "../package.json",
      "./package.json",
    ]) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "DEPENDENCY_REMEDIATION", [
          path,
        ]).allowed,
      ).toBe(false);
    }
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "DEPENDENCY_REMEDIATION", [
        "package.json",
        "worker/index.ts",
      ]).allowed,
    ).toBe(false);
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "UNKNOWN_DEPENDENCY_PHASE", [
        "package.json",
      ]).allowed,
    ).toBe(false);
  });
  it("v18 cannot broaden any dependency condition, replace an advisory, or self-approve residual risk", () => {
    const original = (
      currentWork as {
        wp8fExecutionEnvelope: {
          dependencyRemediation: Record<string, unknown>;
        };
      }
    ).wp8fExecutionEnvelope.dependencyRemediation;
    expect(original.baselineHigh).toBe(2);
    expect(original.baselineModerate).toBe(2);
    expect(original.sharpOverride).toEqual({
      "miniflare@5.20260811.0-alpha>sharp": "0.35.4",
    });
    expect(original.jsYamlOverride).toEqual({
      "@eslint/eslintrc@3.3.6>js-yaml": "4.3.2",
    });
    for (const key of [
      ...Object.keys(original),
      "allowAll",
      "ignoreAdvisories",
      "newRegistry",
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: {
          dependencyRemediation: Record<string, unknown>;
        };
      };
      changed.wp8fExecutionEnvelope.dependencyRemediation[key] = "UNREVIEWED";
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
    for (const files of [
      ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", ".npmrc"],
      ["*"],
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: { dependencyFiles: string[] };
      };
      changed.wp8fExecutionEnvelope.dependencyFiles = files;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("v18 cannot turn mixed-intent repair into a broad handoff or a draft-mutation permission", () => {
    const changed = clone(currentWork) as {
      wp8fExecutionEnvelope: { precedenceContract: Record<string, unknown> };
    };
    expect(
      changed.wp8fExecutionEnvelope.precedenceContract.mixedStaffRedemption,
    ).toBe(
      "EXISTING_EXPLICIT_STAFF_REDEMPTION_PREEMPTS_PREORDER_NO_NEW_KEYWORD_OR_DRAFT_MUTATION",
    );
    for (const value of [
      "ALL_UNKNOWN_IS_STAFF",
      "ANY_STAFF_OR_REWARD_WORD",
      "DRAFT_FIRST",
      "CHANGE_ROUTING",
    ]) {
      changed.wp8fExecutionEnvelope.precedenceContract.mixedStaffRedemption =
        value;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("retains the v18 durable-state allowlist as history but does not permit its mutation in v19", () => {
    const envelope = (
      currentWork as { wp8fExecutionEnvelope: { remediationFiles: string[] } }
    ).wp8fExecutionEnvelope;
    expect(envelope.remediationFiles).toHaveLength(9);
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [
        "worker-tests/durable-state.test.ts",
      ]).allowed,
    ).toBe(false);
    for (const path of [
      "worker-tests/draft-order-state.test.ts",
      "worker/draft-order-objects.ts",
      "worker/line-api.ts",
      "worker/*",
      "../worker/index.ts",
    ]) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [path])
          .allowed,
      ).toBe(false);
    }
  });
  it("v18 cannot self-authorize deployment by changing both manifest flags", () => {
    const r = clone(roadmap) as {
      authorization: { testDeploymentAuthorization: boolean };
    };
    const w = clone(currentWork) as {
      authorization: { testDeploymentAuthorization: boolean };
    };
    r.authorization.testDeploymentAuthorization = true;
    w.authorization.testDeploymentAuthorization = true;
    expect(validateProjectControl(r, w).errors).toContain(
      "NEW_TEST_DEPLOYMENT_REQUIRES_OWNER_APPROVAL",
    );
    expect(validateProjectControl(r, w).errors).toContain(
      "CURRENT_NEW_TEST_DEPLOYMENT_REQUIRES_OWNER_APPROVAL",
    );
    expect(
      evaluateProjectAction(
        r,
        w,
        "DEPLOY_TEST",
        {
          worker: "malispang-lineoa-test",
          sourceCommit: "1".repeat(40),
          artifactSha256: "2".repeat(64),
        },
        validCandidateEvidence(),
      ).allowed,
    ).toBe(false);
  });
  it("retains historical v18 zero operational grants and removes its local implementation permission in v19", () => {
    const envelope = (
      currentWork as { wp8fExecutionEnvelope: Record<string, unknown> }
    ).wp8fExecutionEnvelope;
    for (const key of [
      "maximumNewSessions",
      "maximumHandoffCloses",
      "maximumRollbackRehearsals",
      "maximumRecoveryRedeployments",
    ]) {
      expect(envelope[key]).toBe(0);
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: Record<string, unknown>;
      };
      changed.wp8fExecutionEnvelope[key] = 1;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "TEST_ACCEPTANCE_COMPLETION_WP8F",
      ).allowed,
    ).toBe(false);
  });
  it("v18 cannot weaken any delivery invariant or add compatibility fields", () => {
    const original = (
      currentWork as {
        wp8fExecutionEnvelope: { deliveryContract: Record<string, unknown> };
      }
    ).wp8fExecutionEnvelope.deliveryContract;
    for (const key of [
      ...Object.keys(original),
      "allowAll",
      "optionalToken",
      "retryAfterLease",
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: { deliveryContract: Record<string, unknown> };
      };
      changed.wp8fExecutionEnvelope.deliveryContract[key] = "UNREVIEWED";
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("v17 closes precedence exceptions without expanding the inherited v16 grant", () => {
    const original = (
      currentWork as {
        wp8fExecutionEnvelope: { precedenceContract: Record<string, unknown> };
      }
    ).wp8fExecutionEnvelope.precedenceContract;
    expect(original.unresolvedLegacyReasons).toEqual([
      "NO_AUTHORITATIVE_ANSWER",
      "AMBIGUOUS_CUSTOMER_TEXT",
    ]);
    for (const [key, value] of [
      ["mandatoryBeforeDraftAndAi", false],
      [
        "unresolvedLegacyReasons",
        ["NO_AUTHORITATIVE_ANSWER", "AMBIGUOUS_CUSTOMER_TEXT", "HIGH_RISK"],
      ],
      ["unknownHandoffReasons", "ALLOW"],
      ["advanceOrder", "IMMEDIATE_HANDOFF"],
      ["activeDraftRisk", "CONSUME_AS_DRAFT_INPUT"],
      ["f1F2", "ALWAYS_HANDOFF"],
      ["handoffBooleanAloneIsSecurityPredicate", true],
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: { precedenceContract: Record<string, unknown> };
      };
      changed.wp8fExecutionEnvelope.precedenceContract[key as string] = value;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
      expect(
        evaluateProjectAction(
          roadmap,
          changed,
          "DEPLOY_TEST",
          {
            worker: "malispang-lineoa-test",
            sourceCommit: "1".repeat(40),
            artifactSha256: "2".repeat(64),
          },
          validCandidateEvidence(),
        ).allowed,
      ).toBe(false);
    }
  });
  it("freezes the single v16 continuation, three scoped recoveries and immutable history", () => {
    for (const [key, value] of [
      ["maximumNewSessions", 2],
      ["maximumHandoffCloses", 4],
      ["originalActivationMarkerImmutable", false],
      ["baselineEvents", 3],
      ["baselineConsumedMicroUsd", 27824],
      ["continuation", "GENERIC_REOPEN"],
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: Record<string, unknown>;
      };
      Object.assign(changed.wp8fExecutionEnvelope, { [key as string]: value });
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("requires exact 6/6 accounting and all security/storage compatibility evidence", () => {
    const target = {
      worker: "malispang-lineoa-test",
      sourceCommit: "1".repeat(40),
      artifactSha256: "2".repeat(64),
    };
    for (const change of [
      { events: 3 },
      { attempts: 7 },
      { consumedMicroUsd: 34081 },
      { pendingAttempts: 1 },
      { stopReason: "SESSION_EXPIRED" },
    ]) {
      const evidence = validCandidateEvidence();
      Object.assign(evidence.test, change);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
    for (const key of [
      "precedenceTestsPassed",
      "continuationStorageTestsPassed",
      "rollbackAdditiveCompatibilityPassed",
    ]) {
      const evidence = validCandidateEvidence();
      Object.assign(evidence.candidate, { [key]: false });
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
  });
  it("does not reuse historical v16/v18 runtime or evidence paths as v19 write authority", () => {
    const envelope = (
      currentWork as {
        wp8fExecutionEnvelope: {
          remediationFiles: string[];
          evidenceFiles: string[];
        };
      }
    ).wp8fExecutionEnvelope;
    for (const path of envelope.remediationFiles) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [path])
          .allowed,
      ).toBe(false);
    }
    for (const path of [
      "worker/routing.ts",
      "worker/mp-06-ai-nlu.ts",
      "worker/draft-order-objects.ts",
      "worker-tests/mp-06-owner-readiness.test.ts",
    ]) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [path])
          .allowed,
      ).toBe(false);
    }
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "DIAGNOSTICS", [
        "worker/index.ts",
      ]).allowed,
    ).toBe(false);
    expect(
      evaluateWp8fPaths(
        roadmap,
        currentWork,
        "EVIDENCE",
        envelope.evidenceFiles,
      ).allowed,
    ).toBe(false);
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "EVIDENCE", ["worker/index.ts"])
        .allowed,
    ).toBe(false);
  });
  it("accepts only the independently observed fixed follow-up triplet, never the rollback pair", () => {
    const target = {
      worker: "malispang-lineoa-test",
      sourceCommit: "1".repeat(40),
      artifactSha256: "2".repeat(64),
    };
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "DEPLOY_TEST",
        target,
        validCandidateEvidence(target),
      ).allowed,
    ).toBe(false);
    for (const change of [
      { version: "83fab7f1-646a-4ed8-be4d-a5f38df3a072" },
      { sourceCommit: "f986a478bc980f9e53748ed49cedd543f54cd64a" },
      {
        version: "83fab7f1-646a-4ed8-be4d-a5f38df3a072",
        sourceCommit: "f986a478bc980f9e53748ed49cedd543f54cd64a",
        artifactSha256:
          "f93807109b7d700f79a7b7b90979659ac285be8420e74fb809cc6900d78adec2",
      },
      { version: "00000000-0000-4000-8000-000000000001" },
      { version: "active" },
      { version: "latest" },
      { artifactSha256: "9".repeat(64) },
      {
        sourceCommit: target.sourceCommit,
        artifactSha256: target.artifactSha256,
      },
      { observedAt: Date.now() - 120_001 },
    ]) {
      const evidence = validCandidateEvidence(target);
      Object.assign(evidence.test, change);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
  });
  it("does not accept candidate self-authorization or unverified v16 control lineage", () => {
    const target = {
      worker: "malispang-lineoa-test",
      sourceCommit: "1".repeat(40),
      artifactSha256: "2".repeat(64),
    };
    for (const change of [
      { controlCommit: target.sourceCommit },
      { controlCommit: "3db7738da3edc3da265ebb623190de03a629c0ff" },
      { controlCommit: "latest" },
      { controlAncestryVerified: false },
      { controlParentCommit: "4".repeat(40) },
      { controlOwnerDecision: "MP-OD-2026-09-08-V14" },
    ]) {
      const evidence = validCandidateEvidence(target);
      Object.assign(evidence.candidate, change);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
    expect(
      evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST", target, {
        candidate: validCandidateEvidence().candidate,
        test: currentWork,
      }).allowed,
    ).toBe(false);
  });
  it("requires the independent repository Owner record, not current-work assertions", async () => {
    const record = await readFile(
      new URL("docs/project/OWNER_DECISION_LOG.md", root),
      "utf8",
    );
    expect(validateWp8fOwnerDecisionRecord(record)).toBe(true);
    for (const missing of [
      undefined,
      "",
      JSON.stringify(currentWork),
      record.replaceAll("MP-OD-2026-09-09-V18", "SELF_APPROVED"),
      record.replaceAll("superseding v17", "superseding v13"),
    ]) {
      expect(validateWp8fOwnerDecisionRecord(missing)).toBe(false);
    }
  });
  const target = {
    worker: "malispang-lineoa-test",
    sourceCommit: "1".repeat(40),
    artifactSha256: "2".repeat(64),
  };
  it("rejects all runtime paths, including former remediation files, aliases and unknown phases in v19", () => {
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", [
        "worker/index.ts",
      ]).allowed,
    ).toBe(false);
    for (const paths of [
      ["worker/mp-06-pilot-control.ts"],
      ["src/mp-06/evaluator.ts"],
      ["worker/*"],
      ["./worker/index.ts"],
      ["worker/../worker/index.ts"],
      ["/worker/index.ts"],
      ["worker/index.ts", "worker/index.ts"],
      [],
      ["worker/index.ts", "unknown.ts"],
    ]) {
      expect(
        evaluateWp8fPaths(roadmap, currentWork, "SECURITY_REMEDIATION", paths)
          .allowed,
      ).toBe(false);
    }
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "allowAll", ["worker/index.ts"])
        .allowed,
    ).toBe(false);
    expect(
      evaluateWp8fPaths(roadmap, currentWork, "CONTROL_TRANSITION", [
        "worker/index.ts",
      ]).allowed,
    ).toBe(false);
  });
  it("requires every candidate validation, commit, push, artifact and review gate before deploy", () => {
    expect(
      evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST", target)
        .allowed,
    ).toBe(false);
    for (const field of Object.keys(validCandidateEvidence().candidate)) {
      const evidence = validCandidateEvidence();
      Reflect.deleteProperty(evidence.candidate, field);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
    const evidence = validCandidateEvidence();
    evidence.candidate.executablePaths.push("worker/mp-06-pilot-control.ts");
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "DEPLOY_TEST",
        target,
        evidence,
      ).allowed,
    ).toBe(false);
  });
  it("rejects unsafe, missing, stale or mismatched pre-deployment TEST observations", () => {
    for (const field of Object.keys(validCandidateEvidence().test)) {
      const evidence = validCandidateEvidence();
      Reflect.deleteProperty(evidence.test, field);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
    for (const change of [
      { pilot: "ACTIVE" },
      { aiAdmission: true },
      { inFlight: 1 },
      { reservedMicroUsd: 12932 },
      { observedAt: 0 },
      { observedAt: Date.now() + 60_000 },
      { worker: "production" },
      { environment: "PRODUCTION" },
    ]) {
      const evidence = validCandidateEvidence();
      Object.assign(evidence.test, change);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "DEPLOY_TEST",
          target,
          evidence,
        ).allowed,
      ).toBe(false);
    }
  });
  it("always denies Production query/mutation, merge and Issue closure", () => {
    for (const action of [
      "CHANGE_PRODUCTION",
      "QUERY_PRODUCTION",
      "DEPLOY_PRODUCTION",
      "MERGE_DEFAULT_BRANCH",
      "CLOSE_ISSUE_12",
      "START_MP_07",
    ]) {
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          action,
          target,
          validCandidateEvidence(),
        ).allowed,
      ).toBe(false);
    }
  });
  it("rejects unknown action names even when current-work supplies a matching permission", () => {
    const changed = clone(currentWork) as {
      authorization: Record<string, unknown>;
    };
    changed.authorization.undefined = true;
    changed.authorization.allowAll = true;
    for (const action of [
      "allowAll",
      "undefined",
      "__proto__",
      "toString",
      "SKIP_VALIDATION",
    ]) {
      expect(evaluateProjectAction(roadmap, changed, action).allowed).toBe(
        false,
      );
    }
  });
  it("does not accept candidate or Production self-authorization from current-work", () => {
    const changed = clone(currentWork) as {
      authorization: Record<string, unknown>;
      executionEvidence?: unknown;
    };
    changed.executionEvidence = validCandidateEvidence();
    changed.authorization.candidateValidated = true;
    expect(
      evaluateProjectAction(roadmap, changed, "DEPLOY_TEST", target).allowed,
    ).toBe(false);
    changed.authorization.production = true;
    expect(
      evaluateProjectAction(
        roadmap,
        changed,
        "CHANGE_PRODUCTION",
        target,
        validCandidateEvidence(),
      ).allowed,
    ).toBe(false);
  });
  it("rejects modified envelope paths, caps, recovery, evidence shortcuts and unknown keys", () => {
    for (const [key, value] of [
      ["remediationFiles", ["worker/*"]],
      ["maximumNewSessions", 2],
      ["maximumCumulativeCostMicroUsd", 6000000],
      ["newRecoveryMechanism", true],
      ["legacyMutatingGet", true],
      ["accountingResetOrRefund", true],
      ["production", "GO"],
      ["allowAll", true],
    ]) {
      const changed = clone(currentWork) as {
        wp8fExecutionEnvelope: Record<string, unknown>;
      };
      changed.wp8fExecutionEnvelope[key as string] = value;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
      expect(
        evaluateProjectAction(
          roadmap,
          changed,
          "DEPLOY_TEST",
          target,
          validCandidateEvidence(),
        ).allowed,
      ).toBe(false);
    }
  });
  it("rejects any reduction of the existing acceptance criteria", () => {
    for (const [key, value] of [
      ["minimumTotal", 4999],
      ["minimumAutoCorrectnessPercent", 97],
      ["riskyStaffOnlyOrFailClosedPercent", 99],
      ["maximumUnsupportedClaims", 1],
      ["maximumPiiOrRawChatLeakage", 1],
    ]) {
      const changed = clone(currentWork) as {
        benchmarkAcceptanceCriteria: Record<string, unknown>;
      };
      changed.benchmarkAcceptanceCriteria[key as string] = value;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("requires MP-06 / Issue12 / TEST_ONLY and the exact Owner/supersedes chain", () => {
    for (const [key, value] of [
      ["workId", "MP-07"],
      ["githubIssue", 13],
      ["targetEnvironment", "PRODUCTION"],
      ["currentPhase", "OTHER_PHASE"],
    ]) {
      const changed = clone(currentWork) as Record<string, unknown>;
      changed[key as string] = value;
      expect(
        validateProjectControl(roadmap, changed).errors.length,
      ).toBeGreaterThan(0);
    }
    for (const [key, value] of [
      ["decisionId", "SELF_APPROVED"],
      ["supersedes", "2026.09.08-v12"],
    ] as const) {
      const changed = clone(roadmap) as {
        ownerDecision: Record<string, unknown>;
      };
      changed.ownerDecision[key] = value;
      expect(
        evaluateProjectAction(
          changed,
          currentWork,
          "DEPLOY_TEST",
          target,
          validCandidateEvidence(),
        ).allowed,
      ).toBe(false);
    }
  });
  it("requires the closed v16 plan in the manifest and schema", () => {
    const changed = clone(currentWork) as { wp8fExecutionEnvelope?: unknown };
    const schema = currentWorkSchema as {
      required: string[];
      properties: { wp8fExecutionEnvelope: { const: unknown } };
    };
    expect(schema.required).toContain("wp8fExecutionEnvelope");
    expect(schema.properties.wp8fExecutionEnvelope.const).toEqual(
      changed.wp8fExecutionEnvelope,
    );
    delete changed.wp8fExecutionEnvelope;
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "WP8F_V18_ENVELOPE_MISSING",
    );
  });
  it("denies draft PR in v18 even when every historical acceptance/review gate passes", () => {
    const review = {
      ownerDecision: "MP-OD-2026-09-09-V18",
      sourceCommit: "1".repeat(40),
      reviewedSourceCommit: "1".repeat(40),
      testAcceptedSourceCommit: "1".repeat(40),
      integrationCheckedSourceCommit: "1".repeat(40),
      issueState: "OPEN",
      targetEnvironment: "TEST_ONLY",
      diagnostics: "PASS",
      ownerUat: "PASS",
      killSwitch: "PASS",
      rollback: "PASS",
      security: "PASS",
      integrationChecks: "PASS",
      criticalFindings: 0,
      aiAdmission: false,
      pilot: "STOPPED",
    };
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "CREATE_DRAFT_PR",
        undefined,
        { review },
      ).allowed,
    ).toBe(false);
    for (const key of Object.keys(review)) {
      const missing = structuredClone(review);
      Reflect.deleteProperty(missing, key);
      expect(
        evaluateProjectAction(
          roadmap,
          currentWork,
          "CREATE_DRAFT_PR",
          undefined,
          { review: missing },
        ).allowed,
      ).toBe(false);
    }
    expect(
      evaluateProjectAction(
        roadmap,
        currentWork,
        "CREATE_DRAFT_PR",
        undefined,
        { review: { ...review, ownerUat: "GAP" } },
      ).allowed,
    ).toBe(false);
  });
});

// Synthetic sanitized gate receipts only. These never attest real remote state.
const v21Version = "2026.09.10-v21";
const v21Now = Date.parse("2026-09-10T05:00:00.000Z");
const v21Target = {
  worker: "malispang-lineoa-test",
  sourceCommit: "bfff1a553868b85e5f66144e4741a51627f4a9be",
  artifactSha256:
    "8eabcc6a1628bfa776fa5768db49e2faa586ceaaaa6915510afec74835f2d2b5",
};
const v21Ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
let v21Roadmap: Record<string, unknown>,
  v21Work: Record<string, unknown>,
  actualV21Work: Record<string, unknown>,
  v21Schema: unknown;
function v21Journal(action: string, operationRef: string, attempt = 1) {
  return {
    action,
    operationRef,
    attempt,
    startedAt: new Date(v21Now).toISOString(),
    evidenceSha256: "e".repeat(64),
  };
}
function v21Evidence() {
  return {
    provenance: "INDEPENDENT_OPERATOR_VERIFICATION",
    ownerDecision: "MP-OD-2026-09-10-V21",
    candidate: {
      ...v21Target,
      ciHead: v21Target.sourceCommit,
      ciRun: 34436364217,
      ciConclusion: "success",
      testsPassed: 767,
      testsFailed: 0,
      testsSkipped: 0,
      testsCancelled: 0,
      auditAllLevelsZero: true,
      protectedChecksumsUnchanged: true,
      cleanFrozenInstall: true,
      cleanBuild: true,
      retainedAndEmptyMigrationPassed: true,
      nodeVersion: "24.19.0",
      pnpmVersion: "11.19.0",
      reproducedArtifacts: [v21Target.artifactSha256, v21Target.artifactSha256],
      executionBaseline: "47934a41aeebea9cf17a1cf3d3b98819179b4b97",
      baselineAncestryVerified: true,
      candidateIsControlAncestor: true,
      controlCommit: "a".repeat(40),
      controlOwnerDecision: "MP-OD-2026-09-10-V21",
      controlTestsAndValidatorsPassed: true,
      controlCiHead: "a".repeat(40),
      controlCiConclusion: "success",
      committedPushedAndClean: true,
      exactDiffReviewed: true,
      noDeployAffectingChangesAfterCandidate: true,
      postCandidatePaths: [
        "config/project/current-work.json",
        "src/project-control.ts",
      ],
    },
    test: {
      account: "c395a1bc15b7c95267173de5ccd6407d",
      worker: v21Target.worker,
      environment: "TEST_ONLY",
      accountIdentityVerified: true,
      sourceArtifactAssociationVerified: true,
      trafficPercent: 100,
      bindingsSecretsConfigurationVerified: true,
      health: "PASS",
      observedAt: v21Now,
      ownerIdentityVerified: true,
      ownerLineageVerified: true,
      observationReadOnly: true,
      schemaSnapshotSha256: "b".repeat(64),
      version: "8486019d-9b62-4de9-ae15-6299909a23d9",
      sourceCommit: "8a5b6547b4713ff50ad6b08ee58682e129641b6a",
      artifactSha256:
        "15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64",
      pilot: "STOPPED",
      stopReason: "OPERATOR_STOP",
      aiAdmission: false,
      events: 6,
      attempts: 6,
      consumedMicroUsd: 34082,
      reservedMicroUsd: 0,
      inFlight: 0,
      pendingAttempts: 0,
      conservativeMicroUsd: 25864,
      reportedUsageMicroUsd: 8218,
      usageUnknownAttempts: 2,
      settledAttempts: 4,
      actualHistoricalBilling: "UNKNOWN",
      pendingTemplate: null,
      clarificationUsed: false,
      pendingReplies: 0,
      draftState: "EXPIRED_PURGED",
      draftPurgeInvariantsVerified: true,
      draftPendingReplies: 0,
      ownerMode: "HUMAN_HANDOFF",
      deliverySchema: "ABSENT_IN_ACTIVE_SOURCE_BY_DIRECT_STORAGE_OBSERVATION",
      pendingDeliveryClaims: null as number | null,
      legacyUndeliveredEvents: 0,
      legacyUndeliveredPlans: 0,
      legacyInventoryVerified: true,
      activeDeliveryClaims: 0,
      orphanDeliveryClaims: 0,
      handoffGeneration: 1,
      handoffCloseState: "NONE",
      handoffRegistryActive: 1,
      activationEligibility: false,
      continuationMarkers: 0,
    },
    operation: {
      action: "DEPLOY_TEST",
      operationRef: v21Ids[0]!,
      attempt: 1,
      persistedAttemptsVerified: true,
      observedJournal: [] as ReturnType<typeof v21Journal>[],
      noPriorUnrecordedInvocation: true,
      evidenceSha256: "e".repeat(64),
      expectedGeneration: 1,
    },
    containment: {
      ownerNoLine: true,
      noSessionOrProbe: true,
      noInFlightOrReserved: true,
      additiveMigrationVerified: true,
      ledgerHistoryPreserved: true,
      independentOfUnfencedRollback: true,
      globalLineEgressDisabled: false,
      testOnlyResidualRiskAcknowledged: true,
      automaticRollback: false,
      unexpectedDeltaStopsAcceptance: true,
      ambiguousOutcomeConsumesGrant: true,
      failureCases: v19Evidence().containment.failureCases,
    },
    postDeployment: {
      version: "44444444-4444-4444-8444-444444444444",
      sourceCommit: v21Target.sourceCommit,
      artifactSha256: v21Target.artifactSha256,
      migrationAdditiveIdempotent: true,
      legacyEventsPlansHistoryPreserved: true,
      accountingUnchanged: true,
      claimBackfillVerified: true,
      handoffGenerationBackfillVerified: true,
      registryFenceBackfillVerified: true,
      unexpectedEventDelta: 0,
      providerAttemptDelta: 0,
      lineOutboundDelta: 0,
      lateReplies: 0,
      beforeSnapshotSha256: "b".repeat(64),
      afterSnapshotSha256: "c".repeat(64),
    },
    handoffClose: {
      operationRef: v21Ids[1]!,
      generation: 1,
      sameOriginalResult: true,
      receiptId: "55555555-5555-4555-8555-555555555555",
      registryReceiptVerified: true,
      historyDraftsAccountingAndOtherConversationsUnchanged: true,
    },
    session: {
      ownerLineageVerified: true,
      activeSessions: 1,
      continuationMarkers: 1,
      maximumConcurrency: 1,
      startedAt: v21Now - 60000,
      expiresAt: v21Now + 3540000,
    },
    uat: {
      acceptanceCriteriaUnchanged: true,
      exactOwnerChatVerified: true,
      expectedRouteAndReplyRecorded: true,
      priorCaseBackendAndVisibleEvidenceVerified: true,
      noStopCondition: true,
      humanHandoffIsLastConversationCase: true,
      ownerSendsOneMessage: true,
    },
    finalReview: {
      acceptanceCriteriaUnchanged: true,
      testAcceptance: "PASS",
      ownerUat: "PASS",
      killSwitch: "PASS",
      fencedRecovery: "PASS",
      securityReview: "PASS",
      findingsOpen: 0,
      providerAttemptsAfterStop: 0,
      lateReplies: 0,
      accountingAndHistoryPreserved: true,
      handoffStateReported: true,
      productionTouched: false,
      releaseCommit: "c".repeat(40),
      reviewedCommit: "c".repeat(40),
      runtimeEquivalentToFrozenCandidate: true,
      ciHead: "c".repeat(40),
      ciConclusion: "success",
      acceptanceEvidenceSha256: "a".repeat(64),
      recoveryEvidenceSha256: "b".repeat(64),
      securityEvidenceSha256: "c".repeat(64),
      defaultDriftReviewed: true,
      conflicts: false,
    },
    integration: {
      repository: "Eak-dev/malispang-lineOA",
      baseBranch: "codex/phase-1a-foundation",
      baseCommit: "d".repeat(40),
      headBranch: "codex/mp-06-guardrailed-ai",
      headCommit: "c".repeat(40),
      freshRemoteHeadsVerified: true,
      requiredChecksPassed: true,
      reviewPassed: true,
      unresolvedFindings: 0,
      mergeMethod: "merge",
      pullRequest: 15,
      merged: true,
      mergeCommit: "e".repeat(40),
      postMergeChecks: "PASS",
      acceptanceMatrixUpdated: true,
      issue: 12,
      roadmapUpdated: true,
    },
  };
}
function v21Post() {
  const work = clone(v21Work),
    evidence = v21Evidence();
  const journal = [v21Journal("DEPLOY_TEST", v21Ids[0]!)];
  work.wp8fSuccessorOperationJournal = journal;
  evidence.operation.observedJournal = journal;
  Object.assign(evidence.test, {
    sourceCommit: v21Target.sourceCommit,
    artifactSha256: v21Target.artifactSha256,
    version: evidence.postDeployment.version,
    deliverySchema: "PRESENT_FENCED",
    pendingDeliveryClaims: 0,
  });
  return { work, evidence, journal };
}
function v21Closed() {
  const { work, evidence, journal } = v21Post();
  journal.push(v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!));
  Object.assign(evidence.test, {
    ownerMode: "BOT_ACTIVE",
    handoffCloseState: "COMPLETE",
    handoffRegistryActive: 0,
    activationEligibility: true,
  });
  Object.assign(evidence.operation, {
    action: "OPEN_CONTINUATION",
    operationRef: v21Ids[2]!,
  });
  return { work, evidence, journal };
}
function v21Final() {
  const fixture = v21Closed();
  fixture.journal.push(v21Journal("OPEN_CONTINUATION", v21Ids[2]!));
  return fixture;
}
function assessV21(
  action = "DEPLOY_TEST",
  evidence: unknown = v21Evidence(),
  work: unknown = v21Work,
  target = v21Target,
) {
  return evaluateProjectAction(v21Roadmap, work, action, target, evidence);
}
describe("v21 frozen successor TEST and gated integration", () => {
  beforeAll(async () => {
    const readCurrent = async (
      path: string,
    ): Promise<Record<string, unknown>> => {
      const parsed: unknown = JSON.parse(
        await readFile(new URL(path, root), "utf8"),
      );
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error("INVALID_CURRENT_CONTROL_FIXTURE");
      return parsed as Record<string, unknown>;
    };
    [v21Roadmap, actualV21Work, v21Schema] = await Promise.all([
      readCurrent("config/project/roadmap.json"),
      readCurrent("config/project/current-work.json"),
      readCurrent("config/project/current-work.schema.json"),
    ]);
    // Model the originally unused grant for the scenario matrix, not a live reset.
    // The actual committed journal is validated separately and by CLI history checks.
    v21Work = clone(actualV21Work);
    v21Work.wp8fSuccessorOperationJournal = [];
  });
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(v21Now);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("accepts the actual current v21 snapshot without changing any historical criteria", () => {
    expect(validateProjectControl(v21Roadmap, actualV21Work).errors).toEqual(
      [],
    );
    expect(validateProjectControl(v21Roadmap, v21Work).errors).toEqual([]);
    expect(
      validateSchemaDocuments(roadmapSchema, v21Schema, v21Version),
    ).toEqual([]);
    expect(v21Work.benchmarkAcceptanceCriteria).toEqual(
      (currentWork as Record<string, unknown>).benchmarkAcceptanceCriteria,
    );
    expect(v21Work.wp8fExactDeploymentPreparation).toEqual(
      (currentWork as Record<string, unknown>).wp8fExactDeploymentPreparation,
    );
    expect(v21Work.wp8fExecutionEnvelope).toEqual(
      (currentWork as Record<string, unknown>).wp8fExecutionEnvelope,
    );
    expect(assessV21().allowed).toBe(true);
  });
  it("requires a separate matching Owner record and preserves the unmaterialized v20 fact", async () => {
    const log = await readFile(
      new URL("docs/project/OWNER_DECISION_LOG.md", root),
      "utf8",
    );
    expect(validateWp8fOwnerDecisionRecord(log, v21Version)).toBe(true);
    for (const marker of [
      v21Target.sourceCommit,
      v21Target.artifactSha256,
      "5611756729",
      "supersedes 2026.09.09-v19",
      "v20 APPROVED_BUT_NOT_MATERIALIZED",
    ])
      expect(
        validateWp8fOwnerDecisionRecord(
          log.replaceAll(marker, "MISSING"),
          v21Version,
        ),
        marker,
      ).toBe(false);
    expect(
      validateWp8fOwnerDecisionRecord(JSON.stringify(v21Work), v21Version),
    ).toBe(false);
  });
  it("denies swapped versions, Owner decisions, supersedes, issue, phase, baseline and target", () => {
    for (const [field, value] of Object.entries({
      version: "2026.09.10-v22",
      ownerDecision: {
        decisionId: "SELF",
        decidedAt: "2026-09-10",
        supersedes: v21Version,
      },
      verifiedLatestBaseline: {
        commit: v19Target.sourceCommit,
        branch: "codex/mp-06-guardrailed-ai",
        contains: ["MP-06"],
      },
    })) {
      const changed = clone(v21Roadmap);
      changed[field] = value;
      expect(
        validateProjectControl(changed, v21Work).errors.length,
        field,
      ).toBeGreaterThan(0);
    }
    for (const [field, value] of Object.entries({
      workId: "MP-12",
      githubIssue: 5,
      currentPhase: "RELEASE",
      targetEnvironment: "PRODUCTION",
      roadmapVersion: "2026.09.09-v19",
    })) {
      const changed = clone(v21Work);
      changed[field] = value;
      expect(
        assessV21("DEPLOY_TEST", v21Evidence(), changed).allowed,
        field,
      ).toBe(false);
    }
  });
  it("rejects every mutation of the exact envelope and every missing candidate predicate", () => {
    const envelope = v21Work.wp8fSuccessorCompletion as Record<string, unknown>;
    for (const key of Object.keys(envelope)) {
      const changed = clone(v21Work);
      Reflect.set(
        changed.wp8fSuccessorCompletion as object,
        key,
        "SELF_APPROVED",
      );
      expect(
        assessV21("DEPLOY_TEST", v21Evidence(), changed).allowed,
        key,
      ).toBe(false);
    }
    // worker is target metadata, not an additional candidate attestation.
    for (const key of Object.keys(v21Evidence().candidate).filter(
      (key) => key !== "worker",
    )) {
      const e = v21Evidence();
      Reflect.deleteProperty(e.candidate, key);
      expect(assessV21("DEPLOY_TEST", e).allowed, key).toBe(false);
    }
  });
  it("denies failed or other-commit CI, changed tests/audit/checksums and nonreproducible artifacts", () => {
    for (const [key, value] of Object.entries({
      ciHead: v19Target.sourceCommit,
      ciConclusion: "failure",
      controlCiHead: "b".repeat(40),
      testsPassed: 733,
      testsFailed: 1,
      testsSkipped: 1,
      testsCancelled: 1,
      auditAllLevelsZero: false,
      protectedChecksumsUnchanged: false,
      reproducedArtifacts: [v21Target.artifactSha256, "f".repeat(64)],
      postCandidatePaths: ["worker/index.ts"],
    })) {
      const e = v21Evidence();
      Reflect.set(e.candidate, key, value);
      expect(assessV21("DEPLOY_TEST", e).allowed, key).toBe(false);
    }
  });
  it("requires exact fresh independent TEST identity and legacy-schema absence, not zero invented claims", () => {
    for (const [key, value] of Object.entries({
      account: "other",
      environment: "PRODUCTION",
      version: "83fab7f1-646a-4ed8-be4d-a5f38df3a072",
      sourceCommit: v21Target.sourceCommit,
      artifactSha256: v21Target.artifactSha256,
      trafficPercent: 50,
      observedAt: v21Now - 120001,
      ownerIdentityVerified: false,
      ownerLineageVerified: false,
      observationReadOnly: false,
      schemaSnapshotSha256: "bad",
      deliverySchema: "PRESENT_FENCED",
      pendingDeliveryClaims: 0,
      legacyUndeliveredEvents: 1,
      legacyUndeliveredPlans: 1,
    })) {
      const e = v21Evidence();
      Reflect.set(e.test, key, value);
      expect(assessV21("DEPLOY_TEST", e).allowed, key).toBe(false);
    }
    const future = v21Evidence();
    future.test.observedAt = v21Now + 1;
    expect(assessV21("DEPLOY_TEST", future).allowed).toBe(false);
    expect(assessV21("DEPLOY_TEST", v21Work).allowed).toBe(false);
    expect(
      assessV21("DEPLOY_TEST", v21Evidence(), v21Work, {
        ...v21Target,
        sourceCommit: v19Target.sourceCommit,
      }).allowed,
    ).toBe(false);
  });
  it("denies accounting, pending, draft, handoff and containment mismatches", () => {
    for (const [key, value] of Object.entries({
      events: 7,
      attempts: 5,
      consumedMicroUsd: 25864,
      reservedMicroUsd: 1,
      inFlight: 1,
      pendingAttempts: 1,
      conservativeMicroUsd: 0,
      reportedUsageMicroUsd: 34082,
      usageUnknownAttempts: 0,
      settledAttempts: 6,
      actualHistoricalBilling: "KNOWN",
      ownerMode: "BOT_ACTIVE",
      pendingTemplate: "T-C01",
      pendingReplies: 1,
      clarificationUsed: true,
      draftPurgeInvariantsVerified: false,
      draftPendingReplies: 1,
      pilot: "ACTIVE",
      aiAdmission: true,
    })) {
      const e = v21Evidence();
      Reflect.set(e.test, key, value);
      expect(assessV21("DEPLOY_TEST", e).allowed, key).toBe(false);
    }
    for (const key of Object.keys(v21Evidence().containment)) {
      const e = v21Evidence();
      Reflect.deleteProperty(e.containment, key);
      expect(assessV21("DEPLOY_TEST", e).allowed, key).toBe(false);
    }
  });
  it("never grants Production, arbitrary upload, rollback, model changes, or remote action from current-work alone", () => {
    for (const action of [
      "QUERY_PRODUCTION",
      "CHANGE_PRODUCTION",
      "DEPLOY_PRODUCTION",
      "ROLLBACK_TEST",
      "UPLOAD_TEST_VERSION",
      "CREATE_TEST_VERSION",
      "CHANGE_TEST_TRAFFIC",
      "LOCAL_IMPLEMENTATION",
      "AI_NLU_IMPLEMENTATION_WP7",
      "UNKNOWN",
      "OPEN_SESSION",
      "RECOVER_CONVERSATION",
      "START_MP_07",
    ]) {
      expect(assessV21(action).allowed, action).toBe(false);
    }
    for (const action of [
      "DEPLOY_TEST",
      "CLOSE_OWNER_HANDOFF",
      "OPEN_CONTINUATION",
      "OWNER_UAT_NEXT_CASE",
      "CREATE_PR",
      "CREATE_DRAFT_PR",
      "MERGE_DEFAULT_BRANCH",
      "CLOSE_ISSUE",
    ])
      expect(
        evaluateProjectAction(v21Roadmap, v21Work, action, v21Target).allowed,
        action,
      ).toBe(false);
    const changed = clone(v21Work);
    Reflect.set(changed.authorization as object, "production", true);
    expect(assessV21("CHANGE_PRODUCTION", v21Evidence(), changed).allowed).toBe(
      false,
    );
    changed.allowAll = true;
    expect(validateProjectControl(v21Roadmap, changed).errors).toContain(
      "V21_UNKNOWN_CURRENT_WORK_FIELDS",
    );
  });
  it("denies wildcard/traversal/runtime/dependency paths while allowing only exact control/evidence paths", () => {
    for (const paths of [
      ["worker/index.ts"],
      ["package.json"],
      ["**"],
      ["../PROJECT_CONTROL.md"],
      ["./PROJECT_CONTROL.md"],
      ["PROJECT_CONTROL.md", "PROJECT_CONTROL.md"],
    ])
      expect(
        evaluateWp8fPaths(v21Roadmap, v21Work, "CONTROL_TRANSITION", paths)
          .allowed,
      ).toBe(false);
    expect(
      evaluateWp8fPaths(v21Roadmap, v21Work, "CONTROL_TRANSITION", [
        "src/project-control.ts",
      ]).allowed,
    ).toBe(true);
    expect(
      evaluateWp8fPaths(v21Roadmap, v21Work, "EVIDENCE", [
        "docs/project/EXECUTION_GATES.md",
      ]).allowed,
    ).toBe(true);
    expect(
      evaluateWp8fPaths(v21Roadmap, v21Work, "UNKNOWN", ["PROJECT_CONTROL.md"])
        .allowed,
    ).toBe(false);
  });
  it("retains acceptance criteria and closed schema, with no threshold downgrade or missing successor controls", () => {
    const changed = clone(v21Work);
    Reflect.set(
      changed.benchmarkAcceptanceCriteria as object,
      "minimumAutoCorrectnessPercent",
      97,
    );
    expect(assessV21("DEPLOY_TEST", v21Evidence(), changed).allowed).toBe(
      false,
    );
    for (const field of [
      "wp8fSuccessorCompletion",
      "wp8fSuccessorOperationJournal",
    ]) {
      const schema = clone(v21Schema) as {
        properties: Record<string, unknown>;
      };
      delete schema.properties[field];
      expect(
        validateSchemaDocuments(roadmapSchema, schema, v21Version),
      ).toContain("V21_SCHEMA_NOT_CLOSED");
    }
  });
  it("consumes a deployment attempt on start, including ambiguous or rejected outcomes; no second deployment", () => {
    const { work, evidence } = v21Post();
    expect(
      validateSuccessorOperationJournal(work.wp8fSuccessorOperationJournal),
    ).toBe(true);
    expect(assessV21("DEPLOY_TEST", evidence, work).allowed).toBe(false);
    for (const result of ["UNKNOWN", "REJECTED", "TIMEOUT"]) {
      Reflect.set(evidence.operation, "result", result);
      expect(assessV21("DEPLOY_TEST", evidence, work).allowed).toBe(false);
    }
    expect(
      validateSuccessorOperationJournal([], work.wp8fSuccessorOperationJournal),
    ).toBe(false);
  });
  it("requires journal append-only identity, monotonic order, one deploy/continuation and same close operation up to three attempts", () => {
    const deploy = v21Journal("DEPLOY_TEST", v21Ids[0]!);
    const close = v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!);
    const close2 = v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!, 2),
      close3 = v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!, 3);
    const continuation = v21Journal("OPEN_CONTINUATION", v21Ids[2]!);
    expect(
      validateSuccessorOperationJournal(
        [deploy, close, close2, close3, continuation],
        [deploy, close],
      ),
    ).toBe(true);
    for (const journal of [
      [close],
      [deploy, deploy],
      [deploy, continuation],
      [deploy, close, { ...close2, operationRef: v21Ids[2] }],
      [deploy, close, close2, close3, { ...close3, attempt: 4 }],
      [deploy, close, continuation, continuation],
      [deploy, close, continuation, close2],
      [{ ...deploy, operationRef: "fabricated" }],
      [{ ...deploy, extra: "ignore" }],
      [{ ...deploy, attempt: 2 }],
      [{ ...deploy, action: "QUERY_PRODUCTION" }],
    ]) {
      expect(validateSuccessorOperationJournal(journal)).toBe(false);
    }
    expect(
      validateSuccessorOperationJournal(
        [{ ...deploy, evidenceSha256: "b".repeat(64) }],
        [deploy],
      ),
    ).toBe(false);
  });
  it("requires post-deploy source/schema/backfill/accounting/no-egress evidence before one Owner close", () => {
    const { work, evidence } = v21Post();
    Object.assign(evidence.operation, {
      action: "CLOSE_OWNER_HANDOFF",
      operationRef: v21Ids[1]!,
    });
    expect(assessV21("CLOSE_OWNER_HANDOFF", evidence, work).allowed).toBe(true);
    for (const key of Object.keys(evidence.postDeployment)) {
      const e = clone(evidence);
      Reflect.deleteProperty(e.postDeployment, key);
      expect(assessV21("CLOSE_OWNER_HANDOFF", e, work).allowed, key).toBe(
        false,
      );
    }
    for (const [key, value] of Object.entries({
      ownerMode: "BOT_ACTIVE",
      handoffGeneration: 2,
      pendingDeliveryClaims: 1,
      activeDeliveryClaims: 1,
      orphanDeliveryClaims: 1,
      deliverySchema: "ABSENT",
    })) {
      const e = clone(evidence);
      Reflect.set(e.test, key, value);
      expect(assessV21("CLOSE_OWNER_HANDOFF", e, work).allowed, key).toBe(
        false,
      );
    }
  });
  it("permits only same-result same-generation incomplete close recovery within the three-attempt ceiling", () => {
    const { work, evidence, journal } = v21Closed();
    Object.assign(evidence.test, {
      handoffCloseState: "CONVERSATION_CLOSED",
      activationEligibility: false,
    });
    Object.assign(evidence.operation, {
      action: "CLOSE_OWNER_HANDOFF",
      operationRef: v21Ids[1]!,
      attempt: 2,
    });
    expect(assessV21("CLOSE_OWNER_HANDOFF", evidence, work).allowed).toBe(true);
    for (const [field, value] of Object.entries({
      operationRef: v21Ids[2]!,
      generation: 2,
      sameOriginalResult: false,
      receiptId: "forged",
    })) {
      const e = clone(evidence);
      Reflect.set(e.handoffClose, field, value);
      expect(assessV21("CLOSE_OWNER_HANDOFF", e, work).allowed, field).toBe(
        false,
      );
    }
    const reopened = clone(evidence);
    reopened.test.ownerMode = "HUMAN_HANDOFF";
    expect(assessV21("CLOSE_OWNER_HANDOFF", reopened, work).allowed).toBe(
      false,
    );
    const complete = clone(evidence);
    complete.test.handoffCloseState = "COMPLETE";
    expect(assessV21("CLOSE_OWNER_HANDOFF", complete, work).allowed).toBe(
      false,
    );
    journal.push(
      v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!, 2),
      v21Journal("CLOSE_OWNER_HANDOFF", v21Ids[1]!, 3),
    );
    evidence.operation.attempt = 4;
    expect(assessV21("CLOSE_OWNER_HANDOFF", evidence, work).allowed).toBe(
      false,
    );
  });
  it("allows continuation only after reconciled original close and fresh empty pending state, without ledger reset", () => {
    const { work, evidence, journal } = v21Closed();
    expect(assessV21("OPEN_CONTINUATION", evidence, work).allowed).toBe(true);
    for (const [key, value] of Object.entries({
      activationEligibility: false,
      handoffCloseState: "CONVERSATION_CLOSED",
      handoffRegistryActive: 1,
      continuationMarkers: 1,
      consumedMicroUsd: 0,
    })) {
      const e = clone(evidence);
      Reflect.set(e.test, key, value);
      expect(assessV21("OPEN_CONTINUATION", e, work).allowed, key).toBe(false);
    }
    const e = clone(evidence);
    e.handoffClose.registryReceiptVerified = false;
    expect(assessV21("OPEN_CONTINUATION", e, work).allowed).toBe(false);
    journal.push(v21Journal("OPEN_CONTINUATION", v21Ids[2]!));
    expect(assessV21("OPEN_CONTINUATION", evidence, work).allowed).toBe(false);
  });
  it("allows only one-at-a-time active Owner UAT with prior evidence, unchanged caps and HUMAN_HANDOFF last", () => {
    const { work, evidence } = v21Final();
    Object.assign(evidence.test, {
      pilot: "ACTIVE",
      aiAdmission: true,
      continuationMarkers: 1,
    });
    expect(assessV21("OWNER_UAT_NEXT_CASE", evidence, work).allowed).toBe(true);
    for (const key of Object.keys(evidence.uat)) {
      const e = clone(evidence);
      Reflect.set(e.uat, key, false);
      expect(assessV21("OWNER_UAT_NEXT_CASE", e, work).allowed, key).toBe(
        false,
      );
    }
    for (const [key, value] of Object.entries({
      events: 200,
      attempts: 200,
      consumedMicroUsd: 5000000,
      reservedMicroUsd: 1,
      pendingAttempts: 1,
      ownerMode: "HUMAN_HANDOFF",
    })) {
      const e = clone(evidence);
      Reflect.set(e.test, key, value);
      expect(assessV21("OWNER_UAT_NEXT_CASE", e, work).allowed, key).toBe(
        false,
      );
    }
    const expired = clone(evidence);
    expired.session.expiresAt = v21Now;
    expect(assessV21("OWNER_UAT_NEXT_CASE", expired, work).allowed).toBe(false);
    const longer = clone(evidence);
    longer.session.expiresAt = v21Now + 3600000;
    expect(assessV21("OWNER_UAT_NEXT_CASE", longer, work).allowed).toBe(false);
  });
  it("does not wait for CI/accounting success to contain the exact TEST session", () => {
    const e = v21Evidence();
    e.candidate.ciConclusion = "failure";
    e.test.inFlight = 1;
    e.test.aiAdmission = true;
    e.test.pilot = "ACTIVE";
    e.test.health = "FAIL";
    e.test.ownerLineageVerified = false;
    e.test.schemaSnapshotSha256 = "UNKNOWN";
    expect(assessV21("STOP_TEST", e).allowed).toBe(true);
    e.test.environment = "PRODUCTION";
    expect(assessV21("STOP_TEST", e).allowed).toBe(false);
  });
  it("denies operation-key reuse across deployment, close and continuation", () => {
    const { work, evidence } = v21Post();
    Object.assign(evidence.operation, {
      action: "CLOSE_OWNER_HANDOFF",
      operationRef: v21Ids[0]!,
    });
    expect(assessV21("CLOSE_OWNER_HANDOFF", evidence, work).allowed).toBe(
      false,
    );
    const closed = v21Closed();
    closed.evidence.operation.operationRef = v21Ids[1]!;
    expect(
      assessV21("OPEN_CONTINUATION", closed.evidence, closed.work).allowed,
    ).toBe(false);
  });
  it("requires verified ordered stop receipts and a single Owner case, without reopening or hiding handoff", () => {
    const { work, evidence } = v21Final();
    evidence.test.ownerMode = "HUMAN_HANDOFF";
    const e = {
      ...evidence,
      stop: {
        aiDisabledAt: v21Now - 2000,
        pilotStoppedAt: v21Now - 1000,
        authenticatedReceiptsVerified: true,
        providerAttemptsSinceStop: 0,
        lateReplies: 0,
      },
      uat: {
        ...evidence.uat,
        killSwitchCaseNotPreviouslySent: true,
        noReplacementSession: true,
      },
    };
    expect(assessV21("OWNER_KILL_SWITCH_CASE", e, work).allowed).toBe(true);
    for (const [field, value] of Object.entries({
      aiDisabledAt: v21Now,
      pilotStoppedAt: v21Now + 1,
      authenticatedReceiptsVerified: false,
      providerAttemptsSinceStop: 1,
      lateReplies: 1,
    })) {
      const changed = clone(e);
      Reflect.set(changed.stop, field, value);
      expect(
        assessV21("OWNER_KILL_SWITCH_CASE", changed, work).allowed,
        field,
      ).toBe(false);
    }
    e.uat.killSwitchCaseNotPreviouslySent = false;
    expect(assessV21("OWNER_KILL_SWITCH_CASE", e, work).allowed).toBe(false);
  });
  it("requires every TEST/kill-switch/recovery/security/CI fact before a remediation PR", () => {
    const { work, evidence } = v21Final();
    expect(assessV21("CREATE_PR", evidence, work).allowed).toBe(true);
    expect(assessV21("CREATE_DRAFT_PR", evidence, work).allowed).toBe(true);
    for (const key of Object.keys(evidence.finalReview)) {
      const e = clone(evidence);
      Reflect.deleteProperty(e.finalReview, key);
      expect(assessV21("CREATE_PR", e, work).allowed, key).toBe(false);
    }
    for (const [key, value] of Object.entries({
      ciHead: "b".repeat(40),
      runtimeEquivalentToFrozenCandidate: false,
      ownerUat: "GAP",
      fencedRecovery: "BLOCKED",
      providerAttemptsAfterStop: 1,
      lateReplies: 1,
      findingsOpen: 1,
    })) {
      const e = clone(evidence);
      Reflect.set(e.finalReview, key, value);
      expect(assessV21("CREATE_PR", e, work).allowed, key).toBe(false);
    }
  });
  it("requires new reviewed PR, exact head/base/checks and merge method, and actual integration before Issue12 closure", () => {
    const { work, evidence } = v21Final();
    expect(assessV21("MERGE_DEFAULT_BRANCH", evidence, work).allowed).toBe(
      true,
    );
    expect(assessV21("CLOSE_ISSUE", evidence, work).allowed).toBe(true);
    for (const [key, value] of Object.entries({
      pullRequest: 14,
      headCommit: "b".repeat(40),
      requiredChecksPassed: false,
      reviewPassed: false,
      mergeMethod: "squash",
      freshRemoteHeadsVerified: false,
    })) {
      const e = clone(evidence);
      Reflect.set(e.integration, key, value);
      expect(assessV21("MERGE_DEFAULT_BRANCH", e, work).allowed, key).toBe(
        false,
      );
    }
    for (const [key, value] of Object.entries({
      merged: false,
      mergeCommit: null,
      postMergeChecks: "FAIL",
      issue: 5,
      roadmapUpdated: false,
    })) {
      const e = clone(evidence);
      Reflect.set(e.integration, key, value);
      expect(assessV21("CLOSE_ISSUE", e, work).allowed, key).toBe(false);
    }
  });
});
