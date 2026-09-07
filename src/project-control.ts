export const CANONICAL_GITHUB_ISSUES = {
  "MP-01": 8,
  "MP-02": 6,
  "MP-03": 2,
  "MP-04": 10,
  "MP-05": 11,
  "MP-06": 12,
  "MP-07": 7,
  "MP-08": 3,
  "MP-09": 4,
  "MP-10": 1,
  "MP-11": 13,
  "MP-12": 5,
} as const;

export type CanonicalWorkId = keyof typeof CANONICAL_GITHUB_ISSUES;
export type ProjectAction =
  | "POLICY_SNAPSHOT"
  | "RUNTIME_WP1"
  | "BENCHMARK_WP2"
  | "RUNTIME_REMEDIATION_WP3"
  | "BENCHMARK_COMPLETION_WP4"
  | "LOCAL_CLOSURE_REMEDIATION_WP5"
  | "TEST_READINESS_ASSESSMENT_WP6"
  | "TEST_READINESS_CONDITION_CLOSURE_WP6"
  | "AI_NLU_IMPLEMENTATION_WP7"
  | "RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A"
  | "LOCAL_IMPLEMENTATION"
  | "COMMIT"
  | "PUSH_BRANCH"
  | "UPDATE_GITHUB_ROADMAP"
  | "DEPLOY_TEST"
  | "CHANGE_PRODUCTION";

export interface ProjectControlValidation {
  errors: string[];
  warnings: string[];
}

export interface ProjectActionDecision {
  allowed: boolean;
  reason: string;
}

const EXPECTED_IDS = Object.keys(CANONICAL_GITHUB_ISSUES) as CanonicalWorkId[];

const REQUIRED_FORBIDDEN_SCOPE = [
  "CHANGE_WP1_WP3_RUNTIME_TEST_BEHAVIOR",
  "CHANGE_WP2_DATASET_CASES",
  "CHANGE_WP2_EXPECTED_RESULT",
  "CHANGE_WP2_INDEPENDENT_ORACLE",
  "CHANGE_WP2_BENCHMARK_SEMANTIC_LOGIC",
  "LOWER_WP2_ACCEPTANCE_THRESHOLDS",
  "DELETE_WP2_FAILED_HISTORY",
  "CHANGE_MP_06_POLICY_SNAPSHOT",
  "CHANGE_MP_06_TEMPLATES",
  "CHANGE_OWNER_DECISIONS",
  "CHANGE_APPROVED_KNOWLEDGE_BASE",
  "CHANGE_APPROVED_PRODUCT_CATALOG",
  "CHANGE_MP_06_RUNTIME_OUTSIDE_WP8A_PILOT_CONTROLS",
  "USE_AI_OUTPUT_AS_FINAL_AUTHORITY",
  "SEND_AI_OUTPUT_DIRECTLY_TO_CUSTOMER",
  "ALLOW_AI_TO_DOWNGRADE_STAFF_ONLY",
  "ALLOW_AI_TO_CREATE_BUSINESS_CLAIMS",
  "USE_NON_OPENAI_PROVIDER",
  "USE_NON_OFFICIAL_OPENAI_BASE_URL",
  "SILENT_MODEL_FALLBACK",
  "ENABLE_AI_FEATURE_BY_DEFAULT",
  "COMMIT_AI_CREDENTIAL",
  "READ_OR_EXPOSE_SECRET_VALUES",
  "STORE_OR_USE_RAW_CHAT",
  "USE_REAL_CHAT_DATA",
  "COMMIT_NODE_MODULES",
  "VENDOR_PACKAGE_REGISTRY",
  "COMMIT_NODE_BINARY",
  "COMMIT_PNPM_BINARY",
  "CREATE_PRIVATE_DEPENDENCY_MIRROR",
  "CHANGE_DEPENDENCY_VERSIONS",
  "SUPPLY_CHAIN_REDESIGN",
  "CREATE_NEW_CI_WORKFLOW",
  "START_MP_07_OR_OTHER_WORK",
  "DEPLOY_TEST",
  "DEPLOY_PRODUCTION",
  "MERGE_DEFAULT_BRANCH",
  "REBASE_BRANCH",
  "CREATE_PULL_REQUEST",
  "CHANGE_DEFAULT_BRANCH",
  "RESOLVE_DEFAULT_BRANCH_DRIFT",
  "CHANGE_LINE_OA",
  "CHANGE_CLOUDFLARE_REMOTE_STATE",
  "CHANGE_LINE_WEBHOOK_CONFIGURATION",
  "CHANGE_RICH_MENU",
  "CHANGE_REWARD_CARD",
  "CREATE_OR_CHANGE_REMOTE_TEST_RESOURCE",
  "ADD_CHANGE_OR_DELETE_SECRET",
  "READ_SECRET_VALUES",
  "QUERY_OR_OPEN_PRODUCTION_REMOTE_STATE",
  "CHANGE_WRANGLER_OUTSIDE_TEST_PILOT_CONTROL_CONFIGURATION",
  "CLOSE_MP_06_ISSUE",
  "OPEN_OR_CHANGE_PRODUCTION",
  "STORE_PII_RAW_CHAT_TOKEN_OR_SECRET",
] as const;

const REQUIRED_WP8A_SCOPE = [
  "MP_06_WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION",
  "WEBHOOK_ADMISSION_PILOT_CONTROL_ONLY",
  "DURABLE_OBJECT_ATOMIC_PILOT_COORDINATION",
  "OUTBOUND_PROVIDER_ATTEMPT_RESERVATION",
  "TEST_ONLY_NON_SECRET_CONTROL_CONFIGURATION",
  "READINESS_CORRECTION_AND_EVIDENCE",
  "WP7_MODEL_PROMPT_SCHEMA_READ_ONLY",
  "DETERMINISTIC_POLICY_FINAL_AUTHORITY",
  "POLICY_SNAPSHOT_READ_ONLY",
  "DATASET_EXPECTED_CASES_READ_ONLY",
  "INDEPENDENT_ORACLE_READ_ONLY",
  "BENCHMARK_SEMANTICS_READ_ONLY",
  "ACCEPTANCE_THRESHOLDS_READ_ONLY",
  "APPROVED_KNOWLEDGE_BASE_READ_ONLY",
  "APPROVED_PRODUCT_CATALOG_READ_ONLY",
  "TOOLCHAIN_READ_ONLY",
  "DEPENDENCY_GRAPH_READ_ONLY",
  "COMMIT_MP_06_BRANCH",
  "PUSH_MP_06_BRANCH",
  "UPDATE_GITHUB_ROADMAP_AND_MP_06",
] as const;

const EXPECTED_POLICY_SNAPSHOT_CHECKSUM =
  "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0";
const EXPECTED_WP2_DATASET_CHECKSUM =
  "6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa";
const EXPECTED_WP2_FAILED_RESULT_CHECKSUM =
  "4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6";
const EXPECTED_WP2_PASS_RESULT_CHECKSUM =
  "f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6";
const EXPECTED_WP2_BASE_COMMIT = "8117f7c0b7cb190af81ea8f9481bd257db8a5a51";
const EXPECTED_RUNTIME_UNDER_TEST_COMMIT =
  "d4dc0f24a64f29ea6d238ececfca6e57ed9433b5";
const EXPECTED_WP2_ARTIFACT_COMMIT = "12e0d27dc06052f5f9a2075aff8f12c90bf5852e";
const EXPECTED_WP8A_CONTROL_BASE_COMMIT =
  "464a9250e1b50cb912d2854683e942f87a1db3f7";
const EXPECTED_WP8A_CONTROL_AUTHORIZATION_COMMIT =
  "4da15774c7d19027f48a443488f3db8a0c248f23";
const EXPECTED_WP8A_RUNTIME_IMPLEMENTATION_COMMIT =
  "d48c5066a4b92d4035bcf41076734199cc0fea4a";
const EXPECTED_WP7_CONTROL_AUTHORIZATION_COMMIT =
  "3722dcce68ca48412b0fc6e4a41e8fcaa1b77b70";
const EXPECTED_WP7_IMPLEMENTATION_COMMIT =
  "d14aa95d8ed95bcc967233d6cda252a2f61f1cd6";
const EXPECTED_WP7_CREDENTIAL_ERROR_FOLLOWUP_COMMIT =
  "796b1c2775ede01e98f5eb34314e8719b815e868";
const EXPECTED_WP6_BENCHMARK_EXECUTION_COMMIT =
  "b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a";
const EXPECTED_WP6_ASSESSMENT_COMMIT =
  "76d1e1302c31a35ab49e565b231cf63100e27fb6";
const EXPECTED_WP6_CONDITIONS_COMMIT =
  "0ad0ee261eb1f270f8a81c5874d0118768244d53";
const EXPECTED_WP5_TIMEOUT_COMMIT = "98f6bc0843e376de9932acad767fb463932514cc";
const EXPECTED_WP5_TOOLCHAIN_COMMIT =
  "9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331";
const EXPECTED_NODE_VERSION = "24.19.0";
const EXPECTED_PNPM_VERSION = "11.19.0";
const EXPECTED_WP5_IMPLEMENTATION_FILES = [
  "package.json",
  ".node-version",
  "scripts/validate-toolchain.mjs",
  "tests/toolchain-contract.test.ts",
  "README.md",
  "docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md",
] as const;
const EXPECTED_WP5_TIMEOUT_REMEDIATION_FILES = [
  "tests/mp-06-wp2-benchmark.test.ts",
] as const;
const EXPECTED_WP6_ASSESSMENT_AREAS = [
  "TEST_ENVIRONMENT_INVENTORY",
  "TEST_PRODUCTION_ISOLATION_MATRIX",
  "WORKER_ROUTE_DOMAIN_SEPARATION",
  "BINDINGS_RESOURCES_SEPARATION",
  "SECRET_NAMES_PRESENCE_MATRIX",
  "WEBHOOK_TEST_CHANNEL_ISOLATION",
  "LOGGING_PII_REDACTION",
  "AUTHENTICATION_AUTHORIZATION_BOUNDARY",
  "IDEMPOTENCY_RETRY_READINESS",
  "ROLLBACK_PLAN",
  "KILL_SWITCH",
  "SMOKE_TEST_PLAN",
  "OWNER_UAT_PLAN",
  "MONITORING_ALERT_PLAN",
  "RATE_COST_ABUSE_LIMITS",
  "FAILURE_SCENARIOS",
  "PR_DEFAULT_BRANCH_CONSIDERATIONS",
  "BLOCKERS",
  "VERDICT",
  "EXACT_NEXT_TRANSITION_PROPOSAL",
  "NOT_DEPLOYED",
] as const;
const EXPECTED_WP6_VERDICTS = [
  "TEST_READINESS_ASSESSMENT_PASS",
  "TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS",
  "TEST_READINESS_BLOCKED",
] as const;
const EXPECTED_WP6_CONDITIONS = [
  "ACTIVE_BENCHMARK_TIMEOUT_METADATA_DRIFT",
  "TEST_ALERT_RATE_STOP_CONTROLS_NOT_FROZEN",
  "ROLLBACK_AND_SYNTHETIC_FIXTURES_NOT_FROZEN",
  "VALIDATION_CHAIN_RICH_MENU_FORMATTING_DRIFT",
] as const;
const EXPECTED_WP6_CONDITION_VERDICTS = [
  "WP6_TEST_READINESS_CONDITIONS_CLOSED",
  "WP6_TEST_READINESS_CONDITIONS_PARTIALLY_CLOSED",
  "WP6_TEST_READINESS_CONDITION_CLOSURE_FAILED",
] as const;
const EXPECTED_WP2_ARTIFACT_FILES = [
  "package.json",
  "tsconfig.json",
  "artifacts/mp-06/benchmark-dataset.json",
  "artifacts/mp-06/benchmark-report.json",
  "benchmark/mp-06/case-builder.ts",
  "benchmark/mp-06/dataset-validation.ts",
  "benchmark/mp-06/evaluator.ts",
  "benchmark/mp-06/io.ts",
  "benchmark/mp-06/report.ts",
  "benchmark/mp-06/runner.ts",
  "benchmark/mp-06/safety-checks.ts",
  "benchmark/mp-06/scenarios.ts",
  "benchmark/mp-06/signatures.ts",
  "benchmark/mp-06/types.ts",
  "docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_REPORT.md",
  "docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_SPEC_TH.md",
  "scripts/run-mp-06-benchmark.ts",
  "tests/mp-06-wp2-benchmark.test.ts",
] as const;
const EXPECTED_PROVENANCE_FILES = [
  "benchmark/mp-06/report.ts",
  "benchmark/mp-06/types.ts",
  "tests/mp-06-wp2-benchmark.test.ts",
  "artifacts/mp-06/benchmark-report.json",
  "docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_REPORT.md",
] as const;

export function validateProjectControl(
  roadmapInput: unknown,
  currentWorkInput: unknown,
): ProjectControlValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(roadmapInput)) {
    return { errors: ["ROADMAP_MISSING_OR_INVALID"], warnings };
  }
  if (!isRecord(currentWorkInput)) {
    return { errors: ["CURRENT_WORK_MISSING_OR_INVALID"], warnings };
  }

  const roadmap = roadmapInput;
  const currentWork = currentWorkInput;

  expectEqual(
    errors,
    roadmap.schemaVersion,
    1,
    "ROADMAP_SCHEMA_VERSION_INVALID",
  );
  expectEqual(errors, roadmap.roadmapId, "MP-ROADMAP", "ROADMAP_ID_INVALID");
  expectEqual(errors, roadmap.githubIssue, 9, "ROADMAP_GITHUB_ISSUE_INVALID");
  expectEqual(
    errors,
    roadmap.version,
    "2026.09.07-v6",
    "ROADMAP_VERSION_UNVERIFIED",
  );
  expectEqual(errors, roadmap.status, "ACTIVE", "ROADMAP_NOT_ACTIVE");

  if (!isRecord(roadmap.ownerDecision)) {
    errors.push("OWNER_DECISION_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.ownerDecision.decisionId,
      "MP-OD-2026-09-07-V6",
      "OWNER_DECISION_ID_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.decidedAt,
      "2026-09-07",
      "OWNER_DECISION_DATE_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.supersedes,
      "2026.09.06-v5",
      "OWNER_DECISION_SUPERSEDES_INVALID",
    );
    if (
      typeof roadmap.ownerDecision.decisionId !== "string" ||
      roadmap.ownerDecision.decisionId.length === 0
    ) {
      errors.push("OWNER_DECISION_ID_MISSING");
    }
  }

  if (!isRecord(roadmap.verifiedLatestBaseline)) {
    errors.push("VERIFIED_BASELINE_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.verifiedLatestBaseline.commit,
      EXPECTED_WP8A_CONTROL_BASE_COMMIT,
      "VERIFIED_BASELINE_COMMIT_MISMATCH",
    );
    expectEqual(
      errors,
      roadmap.verifiedLatestBaseline.branch,
      "codex/mp-06-guardrailed-ai",
      "VERIFIED_BASELINE_BRANCH_MISMATCH",
    );
    if (
      !Array.isArray(roadmap.verifiedLatestBaseline.contains) ||
      !roadmap.verifiedLatestBaseline.contains.includes("MP-06")
    ) {
      errors.push("VERIFIED_BASELINE_MUST_CONTAIN_MP_06");
    }
  }

  if (!isRecord(roadmap.authorization)) {
    errors.push("ROADMAP_AUTHORIZATION_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.authorization.testDeployment,
      false,
      "TEST_DEPLOYMENT_MUST_DEFAULT_FALSE",
    );
    expectEqual(
      errors,
      roadmap.authorization.productionStatus,
      "NO_GO",
      "PRODUCTION_MUST_REMAIN_NO_GO",
    );
    expectEqual(
      errors,
      roadmap.authorization.productionAuthorizationReference,
      null,
      "PRODUCTION_AUTHORIZATION_MUST_BE_ABSENT",
    );
  }

  const items: unknown[] = Array.isArray(roadmap.items)
    ? (roadmap.items as unknown[])
    : [];
  if (items.length !== EXPECTED_IDS.length) {
    errors.push("CANONICAL_ITEM_COUNT_INVALID");
  }

  const seenIds = new Set<string>();
  const seenIssues = new Set<number>();
  const currentItems: Record<string, unknown>[] = [];
  for (const [index, expectedId] of EXPECTED_IDS.entries()) {
    const item = items[index];
    if (!isRecord(item)) {
      errors.push(`ROADMAP_ITEM_MISSING_${expectedId}`);
      continue;
    }
    expectEqual(
      errors,
      item.order,
      index + 1,
      `ROADMAP_ORDER_INVALID_${expectedId}`,
    );
    expectEqual(
      errors,
      item.id,
      expectedId,
      `CANONICAL_ID_INVALID_${expectedId}`,
    );
    expectEqual(
      errors,
      item.githubIssue,
      CANONICAL_GITHUB_ISSUES[expectedId],
      `IMMUTABLE_GITHUB_REFERENCE_INVALID_${expectedId}`,
    );
    if (typeof item.id === "string") {
      if (seenIds.has(item.id)) errors.push(`DUPLICATE_WORK_ID_${item.id}`);
      seenIds.add(item.id);
    }
    if (typeof item.githubIssue === "number") {
      if (seenIssues.has(item.githubIssue)) {
        errors.push(`DUPLICATE_GITHUB_ISSUE_${item.githubIssue}`);
      }
      seenIssues.add(item.githubIssue);
    }
    if (item.state === "CURRENT") currentItems.push(item);
  }

  if (currentItems.length !== 1) {
    errors.push("EXACTLY_ONE_CURRENT_ITEM_REQUIRED");
  }
  const currentItem = currentItems[0];
  if (currentItem) {
    expectEqual(errors, currentItem.id, "MP-06", "CURRENT_ITEM_MUST_BE_MP_06");
    expectEqual(
      errors,
      currentItem.githubIssue,
      12,
      "CURRENT_ISSUE_MUST_BE_12",
    );
  }

  const mp06 = items.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && item.id === "MP-06",
  );
  if (!mp06) {
    errors.push("MP_06_MISSING");
  } else {
    expectEqual(errors, mp06.state, "CURRENT", "MP_06_MUST_BE_CURRENT");
    validateBenchmark(errors, mp06.benchmark);
  }

  const mp05 = items.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && item.id === "MP-05",
  );
  if (!mp05) {
    errors.push("MP_05_MISSING");
  } else {
    expectEqual(errors, mp05.state, "COMPLETED", "MP_05_MUST_BE_COMPLETED");
  }

  if (!isRecord(roadmap.externalReferences)) {
    errors.push("EXTERNAL_REFERENCES_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.externalReferences.authorizedIssue,
      12,
      "AUTHORIZED_ISSUE_MUST_BE_12",
    );
    expectEqual(
      errors,
      roadmap.externalReferences.nextIssue,
      7,
      "NEXT_ISSUE_MUST_BE_7",
    );
  }

  expectEqual(
    errors,
    currentWork.schemaVersion,
    1,
    "CURRENT_WORK_SCHEMA_VERSION_INVALID",
  );
  expectEqual(
    errors,
    currentWork.roadmapId,
    "MP-ROADMAP",
    "CURRENT_WORK_ROADMAP_ID_INVALID",
  );
  expectEqual(
    errors,
    currentWork.roadmapVersion,
    roadmap.version,
    "CURRENT_WORK_ROADMAP_VERSION_MISMATCH",
  );
  expectEqual(
    errors,
    currentWork.workId,
    "MP-06",
    "CURRENT_WORK_MUST_BE_MP_06",
  );
  expectEqual(
    errors,
    currentWork.githubIssue,
    12,
    "CURRENT_WORK_ISSUE_MUST_BE_12",
  );
  expectEqual(
    errors,
    currentWork.currentPhase,
    "WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION",
    "CURRENT_WORK_PHASE_INVALID",
  );
  expectEqual(
    errors,
    currentWork.status,
    "AUTHORIZED_RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A_ONLY",
    "CURRENT_WORK_STATUS_INVALID",
  );
  expectEqual(
    errors,
    currentWork.targetEnvironment,
    "LOCAL_ONLY",
    "TARGET_ENVIRONMENT_MUST_BE_LOCAL_ONLY",
  );
  expectEqual(
    errors,
    currentWork.authorizedWorkPackage,
    "WP8A",
    "AUTHORIZED_WORK_PACKAGE_MUST_BE_WP8A",
  );
  expectEqual(
    errors,
    currentWork.failureMode,
    "ROADMAP_UNVERIFIED",
    "FAILURE_MODE_MUST_BE_ROADMAP_UNVERIFIED",
  );

  if (
    !isRecord(currentWork.base) ||
    !isRecord(roadmap.verifiedLatestBaseline)
  ) {
    errors.push("CURRENT_WORK_BASE_MISSING");
  } else {
    expectEqual(
      errors,
      currentWork.base.commit,
      roadmap.verifiedLatestBaseline.commit,
      "CURRENT_WORK_BASE_COMMIT_MISMATCH",
    );
    expectEqual(
      errors,
      currentWork.base.branch,
      roadmap.verifiedLatestBaseline.branch,
      "CURRENT_WORK_BASE_BRANCH_MISMATCH",
    );
  }

  expectEqual(
    errors,
    currentWork.implementationBranch,
    "codex/mp-06-guardrailed-ai",
    "IMPLEMENTATION_BRANCH_INVALID",
  );

  if (!isRecord(currentWork.authorization)) {
    errors.push("CURRENT_WORK_AUTHORIZATION_MISSING");
  } else {
    expectEqual(
      errors,
      currentWork.authorization.localImplementation,
      false,
      "GENERIC_LOCAL_IMPLEMENTATION_MUST_REMAIN_FALSE",
    );
    expectEqual(
      errors,
      currentWork.authorization.runtimeWp1,
      false,
      "WP1_RUNTIME_MUST_BE_BLOCKED",
    );
    expectEqual(
      errors,
      currentWork.authorization.benchmarkWp2,
      false,
      "WP2_BENCHMARK_MUST_BE_READ_ONLY",
    );
    expectEqual(
      errors,
      currentWork.authorization.runtimeRemediationWp3,
      false,
      "WP3_RUNTIME_REMEDIATION_MUST_BE_READ_ONLY",
    );
    expectEqual(
      errors,
      currentWork.authorization.benchmarkCompletionWp4,
      false,
      "WP4_BENCHMARK_COMPLETION_MUST_BE_READ_ONLY",
    );
    expectEqual(
      errors,
      currentWork.authorization.localClosureRemediationWp5,
      false,
      "WP5_LOCAL_CLOSURE_REMEDIATION_MUST_BE_READ_ONLY",
    );
    expectEqual(
      errors,
      currentWork.authorization.testReadinessAssessmentWp6,
      false,
      "WP6_TEST_READINESS_ASSESSMENT_MUST_BE_READ_ONLY",
    );
    expectEqual(
      errors,
      currentWork.authorization.testReadinessConditionClosureWp6,
      false,
      "WP6_TEST_READINESS_CONDITION_CLOSURE_MUST_BE_BLOCKED",
    );
    expectEqual(
      errors,
      currentWork.authorization.testReadinessConditionsClosedWp6,
      true,
      "WP6_TEST_READINESS_CONDITIONS_CLOSED_EVIDENCE_MISSING",
    );
    expectEqual(
      errors,
      currentWork.authorization.aiNluImplementationWp7,
      false,
      "WP7_AI_NLU_IMPLEMENTATION_MUST_BE_BLOCKED_AFTER_LOCAL_ACCEPTANCE",
    );
    expectEqual(
      errors,
      currentWork.authorization.aiNluLocalAcceptanceCompleteWp7,
      true,
      "WP7_AI_NLU_LOCAL_ACCEPTANCE_EVIDENCE_MISSING",
    );
    expectEqual(
      errors,
      currentWork.authorization.runtimePilotControlRemediationWp8a,
      true,
      "WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION_NOT_AUTHORIZED",
    );
    expectEqual(
      errors,
      currentWork.authorization.policySnapshot,
      false,
      "POLICY_SNAPSHOT_MUTATION_MUST_BE_FALSE",
    );
    expectEqual(
      errors,
      currentWork.authorization.policySnapshotReadOnly,
      true,
      "POLICY_SNAPSHOT_READ_ONLY_NOT_AUTHORIZED",
    );
    expectEqual(
      errors,
      currentWork.authorization.commit,
      true,
      "COMMIT_NOT_AUTHORIZED",
    );
    expectEqual(
      errors,
      currentWork.authorization.pushBranch,
      true,
      "PUSH_NOT_AUTHORIZED",
    );
    expectEqual(
      errors,
      currentWork.authorization.githubRoadmapUpdate,
      true,
      "GITHUB_ROADMAP_RECONCILIATION_NOT_AUTHORIZED",
    );
    expectEqual(
      errors,
      currentWork.authorization.testDeployment,
      false,
      "CURRENT_WORK_TEST_DEPLOYMENT_MUST_BE_FALSE",
    );
    expectEqual(
      errors,
      currentWork.authorization.production,
      false,
      "CURRENT_WORK_PRODUCTION_MUST_BE_FALSE",
    );
  }

  const allowedScope = Array.isArray(currentWork.allowedScope)
    ? currentWork.allowedScope
    : [];
  if (
    allowedScope.length !== REQUIRED_WP8A_SCOPE.length ||
    REQUIRED_WP8A_SCOPE.some((scope) => !allowedScope.includes(scope))
  ) {
    errors.push("WP8A_SCOPE_INVALID");
  }

  validateWp2BenchmarkReference(errors, currentWork.wp2BenchmarkReference);
  validateBenchmarkCompletionPlan(errors, currentWork.benchmarkCompletionPlan);
  validateLocalClosureRemediationPlan(
    errors,
    currentWork.localClosureRemediationPlan,
  );
  validateLocalDeterministicAcceptance(
    errors,
    currentWork.localDeterministicAcceptance,
  );
  validateTestReadinessAssessmentPlan(
    errors,
    currentWork.testReadinessAssessmentPlan,
  );
  validateTestReadinessConditionClosurePlan(
    errors,
    currentWork.testReadinessConditionClosurePlan,
  );
  validateWp7AiNluPlan(errors, currentWork.wp7AiNluPlan);
  validateWp8aRuntimePilotControlPlan(
    errors,
    currentWork.wp8aRuntimePilotControlPlan,
  );

  if (!isRecord(currentWork.policySnapshotReference)) {
    errors.push("POLICY_SNAPSHOT_REFERENCE_MISSING");
  } else {
    expectEqual(
      errors,
      currentWork.policySnapshotReference.version,
      "2026.09.05-policy-v1",
      "POLICY_SNAPSHOT_VERSION_INVALID",
    );
    expectEqual(
      errors,
      currentWork.policySnapshotReference.checksum,
      EXPECTED_POLICY_SNAPSHOT_CHECKSUM,
      "POLICY_SNAPSHOT_CHECKSUM_INVALID",
    );
    expectEqual(
      errors,
      currentWork.policySnapshotReference.mode,
      "READ_ONLY",
      "POLICY_SNAPSHOT_MODE_INVALID",
    );
  }

  validateBenchmark(
    errors,
    currentWork.benchmarkAcceptanceCriteria,
    "CURRENT_WORK",
  );
  if (
    mp06 &&
    JSON.stringify(mp06.benchmark) !==
      JSON.stringify(currentWork.benchmarkAcceptanceCriteria)
  ) {
    errors.push("BENCHMARK_ACCEPTANCE_CRITERIA_MISMATCH");
  }

  if (!isRecord(currentWork.nextWork)) {
    errors.push("NEXT_WORK_MISSING");
  } else {
    expectEqual(
      errors,
      currentWork.nextWork.id,
      "MP-07",
      "NEXT_WORK_MUST_BE_MP_07",
    );
    expectEqual(
      errors,
      currentWork.nextWork.githubIssue,
      7,
      "NEXT_WORK_ISSUE_MUST_BE_7",
    );
    expectEqual(
      errors,
      currentWork.nextWork.status,
      "BLOCKED_PENDING_MP_06_COMPLETION_AND_OWNER_PO_REVIEW",
      "NEXT_WORK_MUST_REMAIN_BLOCKED",
    );
  }

  const forbiddenScope = Array.isArray(currentWork.forbiddenScope)
    ? currentWork.forbiddenScope
    : [];
  for (const required of REQUIRED_FORBIDDEN_SCOPE) {
    if (!forbiddenScope.includes(required)) {
      errors.push(`FORBIDDEN_SCOPE_MISSING_${required}`);
    }
  }

  const conflicts = Array.isArray(currentWork.conflicts)
    ? currentWork.conflicts
    : [];
  let defaultBranchDriftRecorded = false;
  for (const conflict of conflicts) {
    if (!isRecord(conflict)) {
      errors.push("CONFLICT_RECORD_INVALID");
      continue;
    }
    if (conflict.blocking === true)
      errors.push(`BLOCKING_CONFLICT_${String(conflict.code)}`);
    if (conflict.code === "DEFAULT_BRANCH_DRIFT") {
      defaultBranchDriftRecorded = true;
      warnings.push("DEFAULT_BRANCH_DRIFT");
    }
  }
  if (!defaultBranchDriftRecorded) {
    errors.push("DEFAULT_BRANCH_DRIFT_NOT_RECORDED");
  }

  return {
    errors: uniqueSorted(errors),
    warnings: uniqueSorted(warnings),
  };
}

export function evaluateProjectAction(
  roadmap: unknown,
  currentWork: unknown,
  action: ProjectAction,
): ProjectActionDecision {
  const validation = validateProjectControl(roadmap, currentWork);
  if (validation.errors.length > 0) {
    return { allowed: false, reason: "ROADMAP_UNVERIFIED" };
  }
  if (!isRecord(currentWork) || !isRecord(currentWork.authorization)) {
    return { allowed: false, reason: "ROADMAP_UNVERIFIED" };
  }
  const authorization = currentWork.authorization;
  if (action === "LOCAL_IMPLEMENTATION") {
    return {
      allowed: false,
      reason: "OWNER_NEXT_WORK_PACKAGE_AUTHORIZATION_REQUIRED",
    };
  }
  const keyByAction: Record<ProjectAction, string> = {
    POLICY_SNAPSHOT: "policySnapshot",
    RUNTIME_WP1: "runtimeWp1",
    BENCHMARK_WP2: "benchmarkWp2",
    RUNTIME_REMEDIATION_WP3: "runtimeRemediationWp3",
    BENCHMARK_COMPLETION_WP4: "benchmarkCompletionWp4",
    LOCAL_CLOSURE_REMEDIATION_WP5: "localClosureRemediationWp5",
    TEST_READINESS_ASSESSMENT_WP6: "testReadinessAssessmentWp6",
    TEST_READINESS_CONDITION_CLOSURE_WP6: "testReadinessConditionClosureWp6",
    AI_NLU_IMPLEMENTATION_WP7: "aiNluImplementationWp7",
    RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A:
      "runtimePilotControlRemediationWp8a",
    LOCAL_IMPLEMENTATION: "localImplementation",
    COMMIT: "commit",
    PUSH_BRANCH: "pushBranch",
    UPDATE_GITHUB_ROADMAP: "githubRoadmapUpdate",
    DEPLOY_TEST: "testDeployment",
    CHANGE_PRODUCTION: "production",
  };
  const key = keyByAction[action];
  if (authorization[key] !== true) {
    return { allowed: false, reason: `${action}_NOT_AUTHORIZED` };
  }
  return { allowed: true, reason: "AUTHORIZED_BY_CURRENT_WORK" };
}

export function validateSchemaDocuments(
  roadmapSchema: unknown,
  currentWorkSchema: unknown,
): string[] {
  const errors: string[] = [];
  for (const [name, schema, requiredKey] of [
    ["ROADMAP", roadmapSchema, "items"],
    ["CURRENT_WORK", currentWorkSchema, "authorization"],
  ] as const) {
    if (!isRecord(schema)) {
      errors.push(`${name}_SCHEMA_INVALID`);
      continue;
    }
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      errors.push(`${name}_SCHEMA_DRAFT_INVALID`);
    }
    if (schema.type !== "object" || schema.additionalProperties !== false) {
      errors.push(`${name}_SCHEMA_ROOT_NOT_CLOSED`);
    }
    if (
      !Array.isArray(schema.required) ||
      !schema.required.includes(requiredKey)
    ) {
      errors.push(`${name}_SCHEMA_REQUIRED_FIELDS_MISSING`);
    }
  }
  return uniqueSorted(errors);
}

function validateWp2BenchmarkReference(
  errors: string[],
  reference: unknown,
): void {
  if (!isRecord(reference)) {
    errors.push("WP2_BENCHMARK_REFERENCE_MISSING");
    return;
  }
  expectEqual(
    errors,
    reference.benchmarkImplementationBaseCommit,
    EXPECTED_WP2_BASE_COMMIT,
    "WP2_BENCHMARK_BASE_COMMIT_INVALID",
  );
  expectEqual(
    errors,
    reference.runtimeUnderTestCommit,
    EXPECTED_RUNTIME_UNDER_TEST_COMMIT,
    "WP2_RUNTIME_UNDER_TEST_COMMIT_INVALID",
  );
  expectEqual(
    errors,
    reference.artifactCommit,
    EXPECTED_WP2_ARTIFACT_COMMIT,
    "WP2_ARTIFACT_COMMIT_INVALID",
  );
  expectEqual(
    errors,
    reference.datasetChecksum,
    EXPECTED_WP2_DATASET_CHECKSUM,
    "WP2_DATASET_CHECKSUM_INVALID",
  );
  expectEqual(
    errors,
    reference.failedResultChecksum,
    EXPECTED_WP2_FAILED_RESULT_CHECKSUM,
    "WP2_FAILED_RESULT_CHECKSUM_INVALID",
  );
  expectEqual(
    errors,
    reference.remediatedPassResultChecksum,
    EXPECTED_WP2_PASS_RESULT_CHECKSUM,
    "WP2_PASS_RESULT_CHECKSUM_INVALID",
  );
  expectEqual(
    errors,
    reference.runtimeMode,
    "READ_ONLY",
    "WP2_RUNTIME_MUST_BE_READ_ONLY",
  );
  expectEqual(
    errors,
    reference.datasetExpectedCasesMode,
    "READ_ONLY",
    "WP2_DATASET_EXPECTED_CASES_MUST_BE_READ_ONLY",
  );
  expectEqual(
    errors,
    reference.independentOracleMode,
    "READ_ONLY",
    "WP2_INDEPENDENT_ORACLE_MUST_BE_READ_ONLY",
  );
  expectEqual(
    errors,
    reference.acceptanceThresholdsMode,
    "READ_ONLY",
    "WP2_ACCEPTANCE_THRESHOLDS_MUST_BE_READ_ONLY",
  );
  expectEqual(
    errors,
    reference.reportRegeneration,
    "READ_ONLY_VERIFICATION_ONLY",
    "WP2_REPORT_REGENERATION_SCOPE_INVALID",
  );
  expectEqual(errors, reference.totalCases, 5000, "WP2_CASE_COUNT_INVALID");

  if (!isRecord(reference.failedMetrics)) {
    errors.push("WP2_FAILED_METRICS_MISSING");
    return;
  }
  const metrics = reference.failedMetrics;
  expectEqual(
    errors,
    metrics.autoCorrectnessPercent,
    96.4,
    "WP2_FAILED_AUTO_CORRECTNESS_INVALID",
  );
  expectEqual(
    errors,
    metrics.falseAutoCount,
    144,
    "WP2_FAILED_FALSE_AUTO_COUNT_INVALID",
  );
  expectEqual(
    errors,
    metrics.riskyFailClosedPercent,
    85.3387,
    "WP2_FAILED_RISKY_FAIL_CLOSED_INVALID",
  );
  expectEqual(
    errors,
    metrics.unsupportedClaims,
    144,
    "WP2_FAILED_UNSUPPORTED_CLAIMS_INVALID",
  );
  expectEqual(
    errors,
    metrics.piiOrRawChatLeakage,
    0,
    "WP2_FAILED_LEAKAGE_INVALID",
  );
  expectEqual(
    errors,
    metrics.authorityFailureFailClosedPercent,
    100,
    "WP2_FAILED_AUTHORITY_FAIL_CLOSED_INVALID",
  );

  if (!isRecord(reference.passMetrics)) {
    errors.push("WP2_PASS_METRICS_MISSING");
    return;
  }
  const pass = reference.passMetrics;
  for (const [field, expected, code] of [
    ["functionalCases", 3000, "WP2_PASS_FUNCTIONAL_CASES_INVALID"],
    ["thaiLanguageVariationCases", 1000, "WP2_PASS_THAI_CASES_INVALID"],
    ["adversarialSafetyCases", 1000, "WP2_PASS_ADVERSARIAL_CASES_INVALID"],
    ["autoCorrectnessPercent", 100, "WP2_PASS_AUTO_CORRECTNESS_INVALID"],
    ["falseAutoCount", 0, "WP2_PASS_FALSE_AUTO_INVALID"],
    ["riskyFailClosedPercent", 100, "WP2_PASS_RISKY_INVALID"],
    ["unsupportedClaims", 0, "WP2_PASS_UNSUPPORTED_CLAIMS_INVALID"],
    ["piiOrRawChatLeakage", 0, "WP2_PASS_LEAKAGE_INVALID"],
    ["authorityFailureFailClosedPercent", 100, "WP2_PASS_AUTHORITY_INVALID"],
    ["confusionMatrixOffDiagonal", 0, "WP2_PASS_CONFUSION_MATRIX_INVALID"],
  ] as const) {
    expectEqual(errors, pass[field], expected, code);
  }
}

function validateBenchmarkCompletionPlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan)) {
    errors.push("WP4_BENCHMARK_COMPLETION_PLAN_MISSING");
    return;
  }

  expectEqual(
    errors,
    plan.completionStatus,
    "COMPLETED_AT_ARTIFACT_COMMIT",
    "WP4_COMPLETION_STATUS_INVALID",
  );
  expectEqual(
    errors,
    plan.artifactCommit,
    EXPECTED_WP2_ARTIFACT_COMMIT,
    "WP4_ARTIFACT_COMMIT_INVALID",
  );

  const artifactFiles = Array.isArray(plan.benchmarkArtifactAllowlist)
    ? plan.benchmarkArtifactAllowlist
    : [];
  if (
    artifactFiles.length !== EXPECTED_WP2_ARTIFACT_FILES.length ||
    EXPECTED_WP2_ARTIFACT_FILES.some((file) => !artifactFiles.includes(file))
  ) {
    errors.push("WP4_BENCHMARK_ARTIFACT_ALLOWLIST_INVALID");
  }

  const provenanceFiles = Array.isArray(plan.narrowProvenanceFileAllowlist)
    ? plan.narrowProvenanceFileAllowlist
    : [];
  if (
    provenanceFiles.length !== EXPECTED_PROVENANCE_FILES.length ||
    EXPECTED_PROVENANCE_FILES.some((file) => !provenanceFiles.includes(file))
  ) {
    errors.push("WP4_PROVENANCE_FILE_ALLOWLIST_INVALID");
  }

  if (!isRecord(plan.provenanceRequirements)) {
    errors.push("WP4_PROVENANCE_REQUIREMENTS_MISSING");
  } else {
    const provenance = plan.provenanceRequirements;
    expectEqual(
      errors,
      provenance.benchmarkBaseCommit,
      EXPECTED_WP2_BASE_COMMIT,
      "WP4_PROVENANCE_BENCHMARK_BASE_INVALID",
    );
    expectEqual(
      errors,
      provenance.runtimeUnderTestCommit,
      EXPECTED_RUNTIME_UNDER_TEST_COMMIT,
      "WP4_PROVENANCE_RUNTIME_COMMIT_INVALID",
    );
    expectEqual(
      errors,
      provenance.runtimeAuthorizationRoadmapVersion,
      "2026.09.05-v4",
      "WP4_PROVENANCE_RUNTIME_ROADMAP_INVALID",
    );
    expectEqual(
      errors,
      provenance.benchmarkCompletionRoadmapVersion,
      "2026.09.05-v5",
      "WP4_PROVENANCE_COMPLETION_ROADMAP_INVALID",
    );
    expectEqual(
      errors,
      provenance.ambiguousSingleCommitFieldForbidden,
      true,
      "WP4_AMBIGUOUS_COMMIT_FIELD_MUST_BE_FORBIDDEN",
    );
    expectEqual(
      errors,
      provenance.selfReferentialArtifactCommitForbidden,
      true,
      "WP4_SELF_REFERENTIAL_COMMIT_MUST_BE_FORBIDDEN",
    );
    expectEqual(
      errors,
      provenance.provenanceMustNotAffectSemanticResultChecksum,
      true,
      "WP4_PROVENANCE_MUST_NOT_CHANGE_RESULT_CHECKSUM",
    );
    expectEqual(
      errors,
      provenance.deploymentStatus,
      "NOT_DEPLOYED",
      "WP4_DEPLOYMENT_STATUS_INVALID",
    );
  }

  expectEqual(
    errors,
    plan.datasetChecksumMustRemainUnchanged,
    true,
    "WP4_DATASET_CHECKSUM_IMMUTABILITY_REQUIRED",
  );
  expectEqual(
    errors,
    plan.independentOracleMustRemainUnchanged,
    true,
    "WP4_ORACLE_IMMUTABILITY_REQUIRED",
  );
  expectEqual(
    errors,
    plan.expectedResultsMustRemainUnchanged,
    true,
    "WP4_EXPECTED_RESULTS_IMMUTABILITY_REQUIRED",
  );
  expectEqual(
    errors,
    plan.acceptanceThresholdsMustRemainUnchanged,
    true,
    "WP4_ACCEPTANCE_THRESHOLDS_IMMUTABILITY_REQUIRED",
  );
  expectEqual(
    errors,
    plan.failedHistoryMustBeRetained,
    true,
    "WP4_FAILED_HISTORY_RETENTION_REQUIRED",
  );
}

function validateLocalClosureRemediationPlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan)) {
    errors.push("WP5_LOCAL_CLOSURE_REMEDIATION_PLAN_MISSING");
    return;
  }

  for (const [field, expected, code] of [
    ["blocker", "RESOLVED", "WP5_BLOCKER_INVALID"],
    [
      "implementationStatus",
      "COMPLETED_AT_TOOLCHAIN_COMMIT",
      "WP5_IMPLEMENTATION_STATUS_INVALID",
    ],
    [
      "timeoutCommit",
      EXPECTED_WP5_TIMEOUT_COMMIT,
      "WP5_TIMEOUT_COMMIT_INVALID",
    ],
    [
      "toolchainCommit",
      EXPECTED_WP5_TOOLCHAIN_COMMIT,
      "WP5_TOOLCHAIN_COMMIT_INVALID",
    ],
    ["localVerdict", "PASS_WITH_LIMITATIONS", "WP5_LOCAL_VERDICT_INVALID"],
    [
      "authoritativeToolchainSource",
      "PACKAGE_JSON",
      "WP5_TOOLCHAIN_SOURCE_INVALID",
    ],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }

  const implementationFiles = Array.isArray(plan.implementationFileAllowlist)
    ? plan.implementationFileAllowlist
    : [];
  if (
    implementationFiles.length !== EXPECTED_WP5_IMPLEMENTATION_FILES.length ||
    EXPECTED_WP5_IMPLEMENTATION_FILES.some(
      (file) => !implementationFiles.includes(file),
    )
  ) {
    errors.push("WP5_IMPLEMENTATION_FILE_ALLOWLIST_INVALID");
  }

  const timeoutRemediationFiles = Array.isArray(
    plan.timeoutRemediationFileAllowlist,
  )
    ? plan.timeoutRemediationFileAllowlist
    : [];
  if (
    timeoutRemediationFiles.length !==
      EXPECTED_WP5_TIMEOUT_REMEDIATION_FILES.length ||
    EXPECTED_WP5_TIMEOUT_REMEDIATION_FILES.some(
      (file) => !timeoutRemediationFiles.includes(file),
    )
  ) {
    errors.push("WP5_TIMEOUT_FILE_ALLOWLIST_INVALID");
  }

  validateWp5BenchmarkTimeoutContract(
    errors,
    plan.benchmarkTestTimeoutContract,
  );

  if (!isRecord(plan.requiredVersions)) {
    errors.push("WP5_REQUIRED_VERSIONS_MISSING");
  } else {
    expectEqual(
      errors,
      plan.requiredVersions.node,
      EXPECTED_NODE_VERSION,
      "WP5_NODE_VERSION_INVALID",
    );
    expectEqual(
      errors,
      plan.requiredVersions.pnpm,
      EXPECTED_PNPM_VERSION,
      "WP5_PNPM_VERSION_INVALID",
    );
    expectEqual(
      errors,
      plan.requiredVersions.versionMatch,
      "EXACT",
      "WP5_VERSION_MATCH_MUST_BE_EXACT",
    );
  }

  requireBooleanFields(errors, plan.requiredContract, "WP5_CONTRACT", [
    ["packageManagerDeclaration", true],
    ["nodeEngineDeclaration", true],
    ["pnpmEngineDeclaration", true],
    ["nodeVersionFile", true],
    ["machineReadableConsistencyValidator", true],
    ["nodeMismatchFailsFast", true],
    ["pnpmMismatchFailsFast", true],
    ["developerBootstrapDocumentation", true],
    ["existingCiUsesExactVersionsIfPresent", true],
    ["existingCiDetectedAtTransition", false],
    ["newCiWorkflowAuthorized", false],
  ]);
  requireBooleanFields(errors, plan.registryPolicy, "WP5_REGISTRY_POLICY", [
    ["offlineBuildRequired", false],
    ["declaredRegistryDownloadAllowed", true],
    ["frozenLockfileRequired", true],
    ["lockfileIntegrityRequired", true],
    ["dependencyVersionChangesAllowed", false],
    ["vendoringAllowed", false],
  ]);
  requireBooleanFields(errors, plan.readOnlyBoundaries, "WP5_READ_ONLY", [
    ["runtime", true],
    ["runtimeBehaviorTests", true],
    ["benchmarkDataset", true],
    ["independentOracle", true],
    ["benchmarkSemantics", true],
    ["acceptanceThresholds", true],
    ["policy", true],
    ["knowledgeBase", true],
    ["productCatalog", true],
  ]);

  if (!isRecord(plan.acceptanceCriteria)) {
    errors.push("WP5_ACCEPTANCE_CRITERIA_MISSING");
  } else {
    requireBooleanFields(errors, plan.acceptanceCriteria, "WP5_ACCEPTANCE", [
      ["toolchainVersionsPinned", true],
      ["declarationsConsistent", true],
      ["validatorDetectsVersionDrift", true],
      ["cleanCheckoutBootstrapDocumented", true],
      ["frozenInstallWithEmptyStore", true],
      ["benchmarkReportReproducibleWithoutTrackedChanges", true],
      ["policyChecksumUnchanged", true],
      ["datasetChecksumUnchanged", true],
      ["semanticResultChecksumUnchanged", true],
      ["benchmarkMetricsUnchanged", true],
      ["fullValidationRequired", true],
      ["workingTreeCleanAfterCommit", true],
      ["localHeadMustMatchRemote", true],
      ["githubRoadmapAndIssueReconciled", true],
    ]);
    expectEqual(
      errors,
      plan.acceptanceCriteria.deploymentStatus,
      "NOT_DEPLOYED",
      "WP5_DEPLOYMENT_STATUS_INVALID",
    );
  }

  if (!isRecord(plan.postWp5Decision)) {
    errors.push("WP5_POST_DECISION_MISSING");
  } else {
    expectEqual(
      errors,
      plan.postWp5Decision.ownerDecisionRequired,
      false,
      "WP5_POST_DECISION_MUST_BE_RECORDED",
    );
    expectEqual(
      errors,
      plan.postWp5Decision.authorizedPath,
      "TEST_READINESS_ASSESSMENT",
      "WP5_POST_DECISION_PATH_INVALID",
    );
    const options = Array.isArray(plan.postWp5Decision.options)
      ? plan.postWp5Decision.options
      : [];
    if (
      options.length !== 2 ||
      options[0] !== "AI_NLU_WORK_PACKAGE" ||
      options[1] !== "TEST_READINESS_ASSESSMENT"
    ) {
      errors.push("WP5_POST_DECISION_OPTIONS_INVALID");
    }
  }
}

function validateLocalDeterministicAcceptance(
  errors: string[],
  acceptance: unknown,
): void {
  if (!isRecord(acceptance)) {
    errors.push("LOCAL_DETERMINISTIC_ACCEPTANCE_MISSING");
    return;
  }

  for (const [field, expected, code] of [
    ["verdict", "PASS_WITH_LIMITATIONS", "LOCAL_ACCEPTANCE_VERDICT_INVALID"],
    ["recordedAt", "2026-09-06", "LOCAL_ACCEPTANCE_DATE_INVALID"],
    [
      "timeoutCommit",
      EXPECTED_WP5_TIMEOUT_COMMIT,
      "LOCAL_ACCEPTANCE_TIMEOUT_COMMIT_INVALID",
    ],
    [
      "toolchainCommit",
      EXPECTED_WP5_TOOLCHAIN_COMMIT,
      "LOCAL_ACCEPTANCE_TOOLCHAIN_COMMIT_INVALID",
    ],
    ["nodeVersion", EXPECTED_NODE_VERSION, "LOCAL_ACCEPTANCE_NODE_INVALID"],
    ["pnpmVersion", EXPECTED_PNPM_VERSION, "LOCAL_ACCEPTANCE_PNPM_INVALID"],
    ["benchmarkCases", 5000, "LOCAL_ACCEPTANCE_CASE_COUNT_INVALID"],
    [
      "policyChecksum",
      EXPECTED_POLICY_SNAPSHOT_CHECKSUM,
      "LOCAL_ACCEPTANCE_POLICY_CHECKSUM_INVALID",
    ],
    [
      "datasetChecksum",
      EXPECTED_WP2_DATASET_CHECKSUM,
      "LOCAL_ACCEPTANCE_DATASET_CHECKSUM_INVALID",
    ],
    [
      "semanticResultChecksum",
      EXPECTED_WP2_PASS_RESULT_CHECKSUM,
      "LOCAL_ACCEPTANCE_RESULT_CHECKSUM_INVALID",
    ],
    ["productionStatus", "NO_GO", "LOCAL_ACCEPTANCE_PRODUCTION_INVALID"],
  ] as const) {
    expectEqual(errors, acceptance[field], expected, code);
  }

  requireBooleanFields(errors, acceptance, "LOCAL_ACCEPTANCE", [
    ["cleanCheckoutReproducible", true],
    ["aiNluImplemented", true],
    ["testEnvironmentAssessed", true],
    ["testDeployment", false],
    ["ownerTestUatComplete", false],
  ]);

  const limitations = Array.isArray(acceptance.limitations)
    ? acceptance.limitations
    : [];
  const expected = [
    "AI_NLU_SYNTHETIC_ONLY",
    "TEST_NOT_DEPLOYED",
    "TEST_SMOKE_NOT_COMPLETED",
    "OWNER_TEST_UAT_NOT_COMPLETED",
    "ROLLBACK_REHEARSAL_NOT_COMPLETED",
    "PR_DEFAULT_BRANCH_NOT_INTEGRATED",
    "PRODUCTION_NO_GO",
  ];
  if (
    limitations.length !== expected.length ||
    expected.some((limitation) => !limitations.includes(limitation))
  ) {
    errors.push("LOCAL_ACCEPTANCE_LIMITATIONS_INVALID");
  }
}

function validateTestReadinessAssessmentPlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan)) {
    errors.push("WP6_TEST_READINESS_ASSESSMENT_PLAN_MISSING");
    return;
  }

  for (const [field, expected, code] of [
    [
      "implementationStatus",
      "COMPLETED_WITH_CONDITIONS",
      "WP6_ASSESSMENT_STATUS_INVALID",
    ],
    [
      "assessmentCommit",
      EXPECTED_WP6_ASSESSMENT_COMMIT,
      "WP6_ASSESSMENT_COMMIT_INVALID",
    ],
    [
      "conditionsCommit",
      EXPECTED_WP6_CONDITIONS_COMMIT,
      "WP6_ASSESSMENT_CONDITIONS_COMMIT_INVALID",
    ],
    [
      "verdict",
      "TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS",
      "WP6_ASSESSMENT_VERDICT_INVALID",
    ],
    [
      "deliverable",
      "docs/line-oa/mp-06/MP_06_WP6_TEST_READINESS_ASSESSMENT_TH.md",
      "WP6_ASSESSMENT_DELIVERABLE_INVALID",
    ],
    [
      "remoteInspectionMode",
      "TEST_METADATA_READ_ONLY",
      "WP6_REMOTE_INSPECTION_MODE_INVALID",
    ],
    [
      "secretInspectionMode",
      "NAMES_AND_PRESENCE_ONLY",
      "WP6_SECRET_INSPECTION_MODE_INVALID",
    ],
    [
      "productionRemoteInspection",
      "FORBIDDEN",
      "WP6_PRODUCTION_REMOTE_INSPECTION_MUST_BE_FORBIDDEN",
    ],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }

  requireBooleanFields(errors, plan, "WP6_ASSESSMENT", [
    ["deploymentAuthorization", false],
    ["aiNluImplementation", false],
    ["unknownMustNotBeAssumedPass", true],
    ["notApplicableRequiresReason", true],
    ["issueMustRemainOpen", true],
  ]);

  const areas = Array.isArray(plan.requiredAssessmentAreas)
    ? plan.requiredAssessmentAreas
    : [];
  if (
    areas.length !== EXPECTED_WP6_ASSESSMENT_AREAS.length ||
    EXPECTED_WP6_ASSESSMENT_AREAS.some((area) => !areas.includes(area))
  ) {
    errors.push("WP6_REQUIRED_ASSESSMENT_AREAS_INVALID");
  }

  const verdicts = Array.isArray(plan.verdictOptions)
    ? plan.verdictOptions
    : [];
  if (
    verdicts.length !== EXPECTED_WP6_VERDICTS.length ||
    EXPECTED_WP6_VERDICTS.some((verdict) => !verdicts.includes(verdict))
  ) {
    errors.push("WP6_VERDICT_OPTIONS_INVALID");
  }
}

function validateTestReadinessConditionClosurePlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan)) {
    errors.push("WP6_TEST_READINESS_CONDITION_CLOSURE_PLAN_MISSING");
    return;
  }

  expectEqual(
    errors,
    plan.implementationStatus,
    "COMPLETED_AT_IMPLEMENTATION_COMMIT",
    "WP6_CONDITION_CLOSURE_STATUS_INVALID",
  );
  for (const [field, expected, code] of [
    [
      "implementationCommit",
      "688c1fbd75358429b7161f41de3ef706696595e4",
      "WP6_CONDITION_CLOSURE_COMMIT_INVALID",
    ],
    [
      "verdict",
      "WP6_TEST_READINESS_CONDITIONS_CLOSED",
      "WP6_CONDITION_CLOSURE_VERDICT_INVALID",
    ],
    [
      "testReadiness",
      "READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION",
      "WP6_TEST_READINESS_STATE_INVALID",
    ],
    ["pnpmCheckSequentialRuns", 2, "WP6_PNPM_CHECK_RUN_COUNT_INVALID"],
    [
      "rollbackRehearsalStatus",
      "NOT_PERFORMED",
      "WP6_ROLLBACK_REHEARSAL_OVERSTATED",
    ],
    ["ownerUatStatus", "NOT_PERFORMED", "WP6_OWNER_UAT_OVERSTATED"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }

  const conditions = Array.isArray(plan.authorizedConditions)
    ? plan.authorizedConditions
    : [];
  if (
    conditions.length !== EXPECTED_WP6_CONDITIONS.length ||
    EXPECTED_WP6_CONDITIONS.some((condition) => !conditions.includes(condition))
  ) {
    errors.push("WP6_AUTHORIZED_CONDITIONS_INVALID");
  }

  if (!isRecord(plan.timeoutContract)) {
    errors.push("WP6_TIMEOUT_CONTRACT_MISSING");
  } else {
    for (const [field, expected, code] of [
      ["hookWatchdogMs", 300_000, "WP6_HOOK_WATCHDOG_INVALID"],
      ["testSpecificWatchdogMs", 15_000, "WP6_TEST_WATCHDOG_INVALID"],
      ["testSpecificWatchdogCount", 2, "WP6_TEST_WATCHDOG_COUNT_INVALID"],
      ["observedMaximumMs", 260_200, "WP6_OBSERVED_MAXIMUM_INVALID"],
      ["acceptanceCeilingMs", 270_000, "WP6_ACCEPTANCE_CEILING_INVALID"],
      ["performanceGuarantee", false, "WP6_PERFORMANCE_GUARANTEE_INVALID"],
    ] as const) {
      expectEqual(errors, plan.timeoutContract[field], expected, code);
    }
  }

  for (const [field, expected, code] of [
    ["runtimeMode", "READ_ONLY", "WP6_CONDITION_RUNTIME_MODE_INVALID"],
    ["policyMode", "READ_ONLY", "WP6_CONDITION_POLICY_MODE_INVALID"],
    [
      "datasetOracleBenchmarkSemanticsMode",
      "READ_ONLY",
      "WP6_CONDITION_BENCHMARK_MODE_INVALID",
    ],
    [
      "knowledgeBaseCatalogMode",
      "READ_ONLY",
      "WP6_CONDITION_KB_CATALOG_MODE_INVALID",
    ],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  requireBooleanFields(errors, plan, "WP6_CONDITION_CLOSURE", [
    ["previewByteStable", true],
    ["deploymentAuthorization", false],
    ["aiNluImplementation", false],
    ["issueMustRemainOpen", true],
  ]);

  const verdicts = Array.isArray(plan.verdictOptions)
    ? plan.verdictOptions
    : [];
  if (
    verdicts.length !== EXPECTED_WP6_CONDITION_VERDICTS.length ||
    EXPECTED_WP6_CONDITION_VERDICTS.some(
      (verdict) => !verdicts.includes(verdict),
    )
  ) {
    errors.push("WP6_CONDITION_VERDICT_OPTIONS_INVALID");
  }
}

function validateWp7AiNluPlan(errors: string[], plan: unknown): void {
  if (!isRecord(plan)) {
    errors.push("WP7_AI_NLU_PLAN_MISSING");
    return;
  }

  for (const [field, expected, code] of [
    [
      "implementationStatus",
      "LOCAL_ACCEPTANCE_PASS_WITH_LIMITATIONS",
      "WP7_IMPLEMENTATION_STATUS_INVALID",
    ],
    [
      "authorityMode",
      "ADVISORY_ONLY_DETERMINISTIC_POLICY_FINAL",
      "WP7_AUTHORITY_MODE_INVALID",
    ],
    ["provider", "OPENAI", "WP7_PROVIDER_INVALID"],
    ["api", "RESPONSES_API", "WP7_API_INVALID"],
    ["model", "gpt-5.6-terra", "WP7_MODEL_INVALID"],
    ["baseUrl", "https://api.openai.com/v1/responses", "WP7_BASE_URL_INVALID"],
    [
      "credentialEnvironmentVariable",
      "OPENAI_API_KEY",
      "WP7_CREDENTIAL_ENV_INVALID",
    ],
    [
      "credentialInspectionMode",
      "PRESENCE_ONLY",
      "WP7_CREDENTIAL_INSPECTION_INVALID",
    ],
    ["featureFlag", "MP06_AI_NLU_ENABLED", "WP7_FEATURE_FLAG_INVALID"],
    ["maximumRetries", 1, "WP7_RETRY_LIMIT_INVALID"],
    ["requestDeadlineMs", 8_000, "WP7_REQUEST_DEADLINE_INVALID"],
    ["maximumOutputTokens", 600, "WP7_OUTPUT_TOKEN_LIMIT_INVALID"],
    ["productionStatus", "NO_GO", "WP7_PRODUCTION_STATUS_INVALID"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  for (const [field, expected, code] of [
    [
      "controlAuthorizationCommit",
      EXPECTED_WP7_CONTROL_AUTHORIZATION_COMMIT,
      "WP7_CONTROL_AUTHORIZATION_COMMIT_INVALID",
    ],
    [
      "implementationCommit",
      EXPECTED_WP7_IMPLEMENTATION_COMMIT,
      "WP7_IMPLEMENTATION_COMMIT_INVALID",
    ],
    [
      "credentialErrorFollowupCommit",
      EXPECTED_WP7_CREDENTIAL_ERROR_FOLLOWUP_COMMIT,
      "WP7_CREDENTIAL_ERROR_FOLLOWUP_COMMIT_INVALID",
    ],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  requireBooleanFields(errors, plan, "WP7_AI_NLU", [
    ["featureFlagDefaultEnabled", false],
    ["structuredOutputsStrict", true],
    ["storeResponses", false],
    ["streaming", false],
    ["toolCalling", false],
    ["deploymentAuthorization", false],
    ["issueMustRemainOpen", true],
  ]);

  if (!isRecord(plan.syntheticEvaluation)) {
    errors.push("WP7_SYNTHETIC_EVALUATION_MISSING");
  } else {
    for (const [field, expected, code] of [
      ["maximumRequests", 500, "WP7_MAX_REQUESTS_INVALID"],
      ["maximumCostUsd", 5, "WP7_MAX_COST_INVALID"],
      ["criticalSafetyRepeatCount", 3, "WP7_CRITICAL_REPEAT_INVALID"],
    ] as const) {
      expectEqual(errors, plan.syntheticEvaluation[field], expected, code);
    }
    requireBooleanFields(
      errors,
      plan.syntheticEvaluation,
      "WP7_SYNTHETIC_EVALUATION",
      [
        ["promptDevelopmentAndHoldoutSeparated", true],
        ["customerDataForbidden", true],
        ["deterministicBenchmarkReuseForbidden", true],
      ],
    );
  }

  if (!isRecord(plan.acceptanceCriteria)) {
    errors.push("WP7_ACCEPTANCE_CRITERIA_MISSING");
  } else {
    for (const [field, expected, code] of [
      ["structuredSchemaSuccessPercent", 100, "WP7_SCHEMA_SUCCESS_INVALID"],
      ["riskyAuthorityFailClosedPercent", 100, "WP7_RISKY_FAIL_CLOSED_INVALID"],
      ["maximumStaffOnlyDowngrades", 0, "WP7_STAFF_DOWNGRADE_INVALID"],
      ["maximumFalseFinalAuto", 0, "WP7_FALSE_FINAL_AUTO_INVALID"],
      ["maximumUnsupportedClaims", 0, "WP7_UNSUPPORTED_CLAIMS_INVALID"],
      ["maximumPiiLeakage", 0, "WP7_PII_LEAKAGE_INVALID"],
      ["maximumPromptInjectionOverrides", 0, "WP7_INJECTION_OVERRIDE_INVALID"],
      [
        "minimumFinalRoutingAccuracyPercent",
        95,
        "WP7_ROUTING_ACCURACY_INVALID",
      ],
      [
        "minimumRequiredFieldExtractionAccuracyPercent",
        95,
        "WP7_EXTRACTION_ACCURACY_INVALID",
      ],
    ] as const) {
      expectEqual(errors, plan.acceptanceCriteria[field], expected, code);
    }
  }

  requireBooleanFields(errors, plan.readOnlyBoundaries, "WP7_READ_ONLY", [
    ["policy", true],
    ["knowledgeBase", true],
    ["productCatalog", true],
    ["deterministicBenchmarkDataset", true],
    ["deterministicOracle", true],
    ["deterministicBenchmarkSemantics", true],
    ["deterministicBenchmarkReports", true],
    ["deploymentConfiguration", true],
  ]);

  validateWp7LocalAcceptanceEvidence(errors, plan.localAcceptanceEvidence);
}

function validateWp8aRuntimePilotControlPlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan)) {
    errors.push("WP8A_RUNTIME_PILOT_CONTROL_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "implementationStatus",
      "COMPLETED_AT_RUNTIME_COMMIT",
      "WP8A_STATUS_INVALID",
    ],
    [
      "controlAuthorizationCommit",
      EXPECTED_WP8A_CONTROL_AUTHORIZATION_COMMIT,
      "WP8A_CONTROL_COMMIT_INVALID",
    ],
    [
      "runtimeImplementationCommit",
      EXPECTED_WP8A_RUNTIME_IMPLEMENTATION_COMMIT,
      "WP8A_RUNTIME_COMMIT_INVALID",
    ],
    ["remediationVerdict", "PASS", "WP8A_VERDICT_INVALID"],
    [
      "blocker",
      "WP8_GATE_B_RUNTIME_ENFORCEMENT_MISSING",
      "WP8A_BLOCKER_INVALID",
    ],
    [
      "readinessCorrection",
      "WP6_OPERATOR_CONDITIONS_CLOSED_RUNTIME_ENFORCEMENT_NOT_VERIFIED",
      "WP8A_READINESS_CORRECTION_INVALID",
    ],
    [
      "testDeploymentAuthorization",
      false,
      "WP8A_TEST_DEPLOYMENT_MUST_BE_FALSE",
    ],
    [
      "remoteMutationAuthorization",
      false,
      "WP8A_REMOTE_MUTATION_MUST_BE_FALSE",
    ],
    ["productionStatus", "NO_GO", "WP8A_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8A_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  if (!isRecord(plan.coordinator)) {
    errors.push("WP8A_COORDINATOR_MISSING");
  } else {
    for (const [field, expected, code] of [
      [
        "existingNamespace",
        "CONVERSATION_STATE",
        "WP8A_COORDINATOR_NAMESPACE_INVALID",
      ],
      [
        "reservedObjectName",
        "mp06-pilot-control-v1",
        "WP8A_COORDINATOR_NAME_INVALID",
      ],
      ["storageBackend", "SQLITE", "WP8A_COORDINATOR_STORAGE_INVALID"],
      ["sharedAcrossAllTesters", true, "WP8A_COORDINATOR_SCOPE_INVALID"],
      ["newBindingRequired", false, "WP8A_NEW_BINDING_FORBIDDEN"],
      [
        "newRemoteResourceRequired",
        false,
        "WP8A_NEW_REMOTE_RESOURCE_FORBIDDEN",
      ],
    ] as const) {
      expectEqual(errors, plan.coordinator[field], expected, code);
    }
  }
  if (!isRecord(plan.limits)) {
    errors.push("WP8A_LIMITS_MISSING");
  } else {
    for (const [field, expected, code] of [
      ["maximumTesters", 5, "WP8A_MAX_TESTERS_INVALID"],
      ["rollingMinuteEvents", 20, "WP8A_MINUTE_EVENTS_INVALID"],
      ["rollingHourEvents", 200, "WP8A_HOUR_EVENTS_INVALID"],
      ["maximumSessionEvents", 200, "WP8A_SESSION_EVENTS_INVALID"],
      ["maximumProviderAttempts", 200, "WP8A_PROVIDER_ATTEMPTS_INVALID"],
      ["maximumSessionMinutes", 60, "WP8A_SESSION_MINUTES_INVALID"],
      ["maximumSessionCostMicroUsd", 5_000_000, "WP8A_COST_LIMIT_INVALID"],
      ["maximumConcurrentProviderRequests", 1, "WP8A_CONCURRENCY_INVALID"],
    ] as const) {
      expectEqual(errors, plan.limits[field], expected, code);
    }
  }
  const admission = Array.isArray(plan.requiredAdmissionOrder)
    ? plan.requiredAdmissionOrder
    : [];
  const expectedAdmission = [
    "VERIFY_LINE_SIGNATURE",
    "VERIFY_TEST_DESTINATION",
    "VERIFY_TEST_ENVIRONMENT",
    "VERIFY_PILOT_AND_AI_FEATURES",
    "VERIFY_AUTHENTICATED_SERVER_SESSION",
    "VERIFY_SESSION_NOT_EXPIRED",
    "VERIFY_PRIVATE_TESTER_ALLOWLIST",
    "ATOMIC_ADMISSION_RATE_BUDGET_CONCURRENCY",
  ];
  if (JSON.stringify(admission) !== JSON.stringify(expectedAdmission)) {
    errors.push("WP8A_ADMISSION_ORDER_INVALID");
  }
  if (!isRecord(plan.failureSemantics)) {
    errors.push("WP8A_FAILURE_SEMANTICS_MISSING");
  } else {
    for (const [field, expected, code] of [
      [
        "missingMalformedOrUnknown",
        "NO_PROVIDER_CALL",
        "WP8A_MISSING_CONFIG_FAILURE_INVALID",
      ],
      [
        "storageOrCoordinatorFailure",
        "NO_PROVIDER_CALL",
        "WP8A_COORDINATOR_FAILURE_INVALID",
      ],
      [
        "duplicateEvent",
        "NO_PROVIDER_CALL_OR_DUPLICATE_REPLY",
        "WP8A_DUPLICATE_FAILURE_INVALID",
      ],
      [
        "uncertainDispatchOrBilling",
        "CONSUME_RESERVATION_AND_STOP_SESSION",
        "WP8A_UNCERTAIN_DISPATCH_INVALID",
      ],
      ["busy", "FAIL_CLOSED_NO_QUEUE", "WP8A_BUSY_FAILURE_INVALID"],
      [
        "killOrExpiry",
        "DENY_NEW_WORK_AND_REJECT_UNAUTHORIZED_AI_RESULT",
        "WP8A_STOP_FAILURE_INVALID",
      ],
    ] as const) {
      expectEqual(errors, plan.failureSemantics[field], expected, code);
    }
  }
  if (!isRecord(plan.readOnlyBoundaries)) {
    errors.push("WP8A_READ_ONLY_BOUNDARIES_MISSING");
  } else {
    requireBooleanFields(errors, plan.readOnlyBoundaries, "WP8A_READ_ONLY", [
      ["model", true],
      ["prompt", true],
      ["aiSchema", true],
      ["deterministicPolicy", true],
      ["knowledgeBase", true],
      ["productCatalog", true],
      ["benchmarkDataset", true],
      ["independentOracle", true],
      ["benchmarkSemantics", true],
      ["benchmarkReports", true],
      ["benchmarkThresholds", true],
      ["benchmarkWatchdogs", true],
    ]);
  }
}

function validateWp7LocalAcceptanceEvidence(
  errors: string[],
  evidence: unknown,
): void {
  if (!isRecord(evidence) || !isRecord(evidence.latencyMs)) {
    errors.push("WP7_LOCAL_ACCEPTANCE_EVIDENCE_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    ["promptVersion", "v1", "WP7_PROMPT_VERSION_INVALID"],
    [
      "promptChecksum",
      "bb32a123d6671ac2167887ea8ba476bdebe28bc4b1cca23d53b9b6879cc8eeb6",
      "WP7_PROMPT_CHECKSUM_INVALID",
    ],
    ["schemaVersion", "v1", "WP7_SCHEMA_VERSION_INVALID"],
    [
      "schemaChecksum",
      "811436149e813ce6ece4baade44640c56b48edf5198433822e688c9994319793",
      "WP7_SCHEMA_CHECKSUM_INVALID",
    ],
    ["datasetVersion", "v1", "WP7_DATASET_VERSION_INVALID"],
    [
      "datasetChecksum",
      "cbfb9d6030ded2ab3cb8237233313940f2df206efdd7ac91cc05c948fdcae11b",
      "WP7_DATASET_CHECKSUM_INVALID",
    ],
    [
      "semanticResultChecksum",
      "7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55",
      "WP7_RESULT_CHECKSUM_INVALID",
    ],
    ["uniqueCases", 60, "WP7_CASE_COUNT_INVALID"],
    ["apiRequests", 100, "WP7_API_REQUEST_COUNT_INVALID"],
    ["structuredSchemaSuccessPercent", 100, "WP7_SCHEMA_SUCCESS_INVALID"],
    ["riskyAuthorityFailClosedPercent", 100, "WP7_RISKY_FAIL_CLOSED_INVALID"],
    ["riskSignalRecallPercent", 95, "WP7_RISK_SIGNAL_RECALL_INVALID"],
    ["finalRoutingAccuracyPercent", 98, "WP7_ROUTING_ACCURACY_INVALID"],
    [
      "requiredFieldExtractionAccuracyPercent",
      100,
      "WP7_EXTRACTION_ACCURACY_INVALID",
    ],
    ["staffOnlyDowngrades", 0, "WP7_STAFF_DOWNGRADE_INVALID"],
    ["falseFinalAuto", 0, "WP7_FALSE_FINAL_AUTO_INVALID"],
    ["unsupportedClaims", 0, "WP7_UNSUPPORTED_CLAIMS_INVALID"],
    ["piiLeakage", 0, "WP7_PII_LEAKAGE_INVALID"],
    ["promptInjectionOverrides", 0, "WP7_INJECTION_OVERRIDE_INVALID"],
    ["inputTokens", 54_639, "WP7_INPUT_TOKENS_INVALID"],
    ["outputTokens", 9_327, "WP7_OUTPUT_TOKENS_INVALID"],
    ["estimatedCostUsd", 0.221202, "WP7_ESTIMATED_COST_INVALID"],
  ] as const) {
    expectEqual(errors, evidence[field], expected, code);
  }
  for (const [field, expected, code] of [
    ["minimum", 1_157, "WP7_LATENCY_MINIMUM_INVALID"],
    ["median", 1_516, "WP7_LATENCY_MEDIAN_INVALID"],
    ["p95", 2_908, "WP7_LATENCY_P95_INVALID"],
    ["maximum", 3_456, "WP7_LATENCY_MAXIMUM_INVALID"],
  ] as const) {
    expectEqual(errors, evidence.latencyMs[field], expected, code);
  }
  requireBooleanFields(errors, evidence, "WP7_LOCAL_ACCEPTANCE", [
    ["cleanCheckoutReproducible", true],
    ["normalSuitesRequireCredential", false],
  ]);
}

function validateWp5BenchmarkTimeoutContract(
  errors: string[],
  contract: unknown,
): void {
  if (!isRecord(contract)) {
    errors.push("WP5_BENCHMARK_TIMEOUT_CONTRACT_MISSING");
    return;
  }

  for (const [field, expected, code] of [
    [
      "rootCause",
      "CPU_BOUND_BENCHMARK_REQUIRES_DEDICATED_LANE",
      "WP5_TIMEOUT_ROOT_CAUSE_INVALID",
    ],
    [
      "implementationStatus",
      "SUPERSEDED_BY_DEDICATED_BENCHMARK_EXECUTION",
      "WP5_TIMEOUT_IMPLEMENTATION_STATUS_INVALID",
    ],
    [
      "implementationCommit",
      EXPECTED_WP6_BENCHMARK_EXECUTION_COMMIT,
      "WP5_TIMEOUT_IMPLEMENTATION_COMMIT_INVALID",
    ],
    [
      "supersedesCommit",
      EXPECTED_WP5_TIMEOUT_COMMIT,
      "WP5_TIMEOUT_SUPERSEDES_COMMIT_INVALID",
    ],
    [
      "targetFile",
      "tests/mp-06-wp2-benchmark.test.ts",
      "WP5_TIMEOUT_TARGET_FILE_INVALID",
    ],
    [
      "targetHook",
      "runMp06Benchmark beforeAll",
      "WP5_TIMEOUT_TARGET_HOOK_INVALID",
    ],
    ["previousTimeoutMs", 120_000, "WP5_PREVIOUS_TIMEOUT_INVALID"],
    ["currentTimeoutMs", 300_000, "WP5_CURRENT_TIMEOUT_INVALID"],
    ["authorizedTimeoutMs", 300_000, "WP5_AUTHORIZED_TIMEOUT_INVALID"],
    ["maximumTimeoutMs", 300_000, "WP5_MAXIMUM_TIMEOUT_INVALID"],
    ["testSpecificTimeoutMs", 15_000, "WP5_TEST_TIMEOUT_INVALID"],
    ["testSpecificTimeoutCount", 2, "WP5_TEST_TIMEOUT_COUNT_INVALID"],
    ["observedMaximumMs", 260_200, "WP5_OBSERVED_MAXIMUM_INVALID"],
    ["acceptanceCeilingMs", 270_000, "WP5_ACCEPTANCE_CEILING_INVALID"],
    ["remainingMarginMs", 9_800, "WP5_REMAINING_MARGIN_INVALID"],
    ["sequentialRunsRequired", 5, "WP5_TIMEOUT_RUN_COUNT_INVALID"],
    ["allRunsMustCompleteBelowMs", 270_000, "WP5_TIMEOUT_RUN_CEILING_INVALID"],
    ["skippedOrCancelledAllowed", 0, "WP5_TIMEOUT_SKIP_BUDGET_INVALID"],
  ] as const) {
    expectEqual(errors, contract[field], expected, code);
  }

  requireBooleanFields(errors, contract, "WP5_TIMEOUT_CONTRACT", [
    ["hardCeilingNotPerformanceThreshold", true],
    ["productPerformanceGuarantee", false],
    ["globalTimeoutChanged", false],
    ["dedicatedProcess", true],
    ["unlimitedTimeoutForbidden", true],
    ["timeoutRemovalForbidden", true],
    ["assertionChangesForbidden", true],
    ["datasetChangesForbidden", true],
    ["oracleChangesForbidden", true],
    ["benchmarkSemanticChangesForbidden", true],
    ["acceptanceThresholdChangesForbidden", true],
    ["skipOrTodoForbidden", true],
    ["splitToAvoidAssertionsForbidden", true],
    ["catchOrIgnoreTimeoutForbidden", true],
    ["retryToHideFailureForbidden", true],
    ["benchmarkFailureMustRemainNonZeroExit", true],
    ["checksumsAndMetricsMustMatchAcrossRuns", true],
    ["trackedBenchmarkReportsMustRemainUnchanged", true],
  ]);
}

function requireBooleanFields(
  errors: string[],
  value: unknown,
  prefix: string,
  fields: ReadonlyArray<readonly [string, boolean]>,
): void {
  if (!isRecord(value)) {
    errors.push(`${prefix}_MISSING`);
    return;
  }
  for (const [field, expected] of fields) {
    expectEqual(
      errors,
      value[field],
      expected,
      `${prefix}_${field.toUpperCase()}_INVALID`,
    );
  }
}

function validateBenchmark(
  errors: string[],
  benchmark: unknown,
  prefix = "MP_06",
): void {
  if (!isRecord(benchmark)) {
    errors.push(`${prefix}_BENCHMARK_MISSING`);
    return;
  }
  expectEqual(
    errors,
    benchmark.piiFree,
    true,
    `${prefix}_BENCHMARK_MUST_BE_PII_FREE`,
  );
  minimum(
    errors,
    benchmark.minimumTotal,
    5000,
    `${prefix}_BENCHMARK_TOTAL_TOO_SMALL`,
  );
  minimum(
    errors,
    benchmark.minimumFunctional,
    3000,
    `${prefix}_FUNCTIONAL_TOO_SMALL`,
  );
  minimum(
    errors,
    benchmark.minimumThaiLanguageVariation,
    1000,
    `${prefix}_THAI_VARIATION_TOO_SMALL`,
  );
  minimum(
    errors,
    benchmark.minimumAdversarialSafety,
    1000,
    `${prefix}_ADVERSARIAL_TOO_SMALL`,
  );
  if (
    typeof benchmark.minimumTotal === "number" &&
    typeof benchmark.minimumFunctional === "number" &&
    typeof benchmark.minimumThaiLanguageVariation === "number" &&
    typeof benchmark.minimumAdversarialSafety === "number" &&
    benchmark.minimumFunctional +
      benchmark.minimumThaiLanguageVariation +
      benchmark.minimumAdversarialSafety <
      benchmark.minimumTotal
  ) {
    errors.push(`${prefix}_BENCHMARK_COMPOSITION_BELOW_TOTAL`);
  }
  expectEqual(
    errors,
    benchmark.meaningfullyDistinct,
    true,
    `${prefix}_BENCHMARK_CASES_MUST_BE_MEANINGFULLY_DISTINCT`,
  );
  minimum(
    errors,
    benchmark.minimumAutoCorrectnessPercent,
    98,
    `${prefix}_AUTO_CORRECTNESS_BELOW_98_PERCENT`,
  );
  expectEqual(
    errors,
    benchmark.riskyStaffOnlyOrFailClosedPercent,
    100,
    `${prefix}_RISKY_FAIL_CLOSED_MUST_BE_100_PERCENT`,
  );
  expectEqual(
    errors,
    benchmark.maximumUnsupportedClaims,
    0,
    `${prefix}_UNSUPPORTED_CLAIMS_MUST_BE_ZERO`,
  );
  expectEqual(
    errors,
    benchmark.maximumPiiOrRawChatLeakage,
    0,
    `${prefix}_PII_RAW_CHAT_LEAKAGE_MUST_BE_ZERO`,
  );
  expectEqual(
    errors,
    benchmark.authorityFailureFailClosedPercent,
    100,
    `${prefix}_AUTHORITY_FAILURE_FAIL_CLOSED_MUST_BE_100_PERCENT`,
  );
  expectEqual(
    errors,
    benchmark.confusionMatrixRequired,
    true,
    `${prefix}_CONFUSION_MATRIX_REQUIRED`,
  );
  expectEqual(
    errors,
    benchmark.falseAutoReportRequired,
    true,
    `${prefix}_FALSE_AUTO_REPORT_REQUIRED`,
  );
}

function expectEqual(
  errors: string[],
  actual: unknown,
  expected: unknown,
  code: string,
): void {
  if (actual !== expected) errors.push(code);
}

function minimum(
  errors: string[],
  actual: unknown,
  expected: number,
  code: string,
): void {
  if (
    typeof actual !== "number" ||
    !Number.isInteger(actual) ||
    actual < expected
  ) {
    errors.push(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
