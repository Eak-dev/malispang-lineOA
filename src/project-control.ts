import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

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
  | "TEST_DEPLOYMENT_SMOKE_ROLLBACK_WP8"
  | "PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_WP8B"
  | "PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C"
  | "DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_WP8D"
  | "EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E"
  | "TEST_ACCEPTANCE_COMPLETION_WP8F"
  | "PREPARE_EXACT_TEST_DEPLOYMENT"
  | "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS"
  | "CREATE_DRAFT_PR"
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
  "CHANGE_WP1_WP3_BEHAVIOR_OUTSIDE_DETERMINISTIC_PRECEDENCE_OR_DELIVERY_CONTRACT",
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
  "CHANGE_RUNTIME_OUTSIDE_EXACT_APPROVED_V18_REMEDIATION",
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
  "CHANGE_DEPENDENCIES_OUTSIDE_APPROVED_V18_ADVISORIES",
  "SUPPLY_CHAIN_REDESIGN",
  "CREATE_NEW_CI_WORKFLOW",
  "START_MP_07_OR_OTHER_WORK",
  "DEPLOY_PRODUCTION",
  "MERGE_DEFAULT_BRANCH",
  "REBASE_BRANCH",
  "CREATE_READY_PULL_REQUEST",
  "CREATE_DRAFT_PR_BEFORE_TEST_ACCEPTANCE",
  "DEPLOY_NEW_SOURCE_WITHOUT_OWNER_APPROVAL",
  "REHEARSE_ROLLBACK_WITHOUT_REVIEWED_APPROVAL",
  "CHANGE_MODEL_PROMPT_POLICY_THRESHOLDS_TIMEOUT",
  "CHANGE_DEFAULT_BRANCH",
  "RESOLVE_DEFAULT_BRANCH_DRIFT",
  "CHANGE_LINE_OA",
  "CHANGE_LINE_WEBHOOK_CONFIGURATION",
  "CHANGE_RICH_MENU",
  "CHANGE_REWARD_CARD",
  "CREATE_OR_CHANGE_REMOTE_TEST_RESOURCE",
  "CHANGE_TEST_REMOTE_STATE_OUTSIDE_EXACT_WP8_TARGET",
  "CHANGE_SECRET_OTHER_THAN_APPROVED_OPENAI_API_KEY_TEST_SLOT",
  "READ_SECRET_VALUES",
  "QUERY_OR_OPEN_PRODUCTION_REMOTE_STATE",
  "CHANGE_WRANGLER_OUTSIDE_TEST_PILOT_CONTROL_CONFIGURATION",
  "CLOSE_MP_06_ISSUE",
  "OPEN_OR_CHANGE_PRODUCTION",
  "STORE_PII_RAW_CHAT_TOKEN_OR_SECRET",
  "DEPLOY_TEST_IN_V18",
  "OPEN_CONTINUATION_OR_OWNER_LINE_IN_V18",
  "REMOTE_RECOVERY_OR_ROLLBACK_IN_V18",
  "CREATE_PR_IN_V18",
  "RETRY_OR_RELEASE_DELIVERY_CLAIM",
  "OPTIONAL_OR_COMPATIBILITY_DELIVERY_ACK",
  "CLAIM_EXACTLY_ONCE_EXTERNAL_DELIVERY",
  "CHANGE_RUNTIME_OR_DEPENDENCIES_IN_V19",
  "REMOTE_MUTATION_IN_V19_PREPARATION",
  "SESSION_UAT_LINE_RECOVERY_ROLLBACK_PR_IN_V19",
  "AUTOMATIC_ROLLBACK_TO_UNFENCED_RUNTIME",
  "REISSUE_DEPLOYMENT_GRANT_AFTER_AMBIGUOUS_OUTCOME",
] as const;

const REQUIRED_WP8F_SCOPE = [
  "MP_06_WP8F_EXACT_TEST_DEPLOYMENT_PREPARATION",
  "BUILD_ISSUE_12_ACCEPTANCE_MATRIX",
  "EXACT_V19_CONTROL_TRANSITION",
  "EXACT_C59_CLEAN_CHECKOUT_LOCAL_ARTIFACT_REPRODUCTION",
  "AUTHENTICATED_EXACT_TEST_READ_ONLY_OBSERVATION",
  "INDEPENDENT_CONTAINMENT_FAILURE_MATRIX",
  "PREPARE_COMMAND_STOP_BEFORE_FIRST_REMOTE_MUTATION",
  "VERIFY_EXISTING_SAFETY_AND_ROLLBACK_EVIDENCE",
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
  "RUNTIME_AND_DEPENDENCIES_READ_ONLY",
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
  "ae4ec0c312a40c577e5e4e27ac07273f5f3849f4";
const EXPECTED_WP8B_CONTROL_BASE_COMMIT =
  "e1ee74e37e5a4e2ebbfd01cc3b591e93a6ed9c9a";
const EXPECTED_WP8C_CONTROL_BASE_COMMIT =
  "fa5eb1505e8d1cf6fe3a88619c51f9548e60163d";
const EXPECTED_WP8D_CONTROL_BASE_COMMIT =
  "337fcf5c660867b31ffc2a0b56d0a32d99504821";
const EXPECTED_WP8E_CONTROL_BASE_COMMIT =
  "d15b3f0fd794a5a08c0251a88a0a663a23d1141b";
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
  const v23 = roadmap.version === WP8F_V23_ADDENDUM.version;
  const v22 = v23 || roadmap.version === WP8F_V22_AUTHORIZATION.version;
  const successor = v22 || roadmap.version === WP8F_V21_COMPLETION.version;
  const completion = v22 ? WP8F_V22_AUTHORIZATION : WP8F_V21_COMPLETION;

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
    v23
      ? WP8F_V23_ADDENDUM.version
      : successor
        ? completion.version
        : "2026.09.09-v19",
    "ROADMAP_VERSION_UNVERIFIED",
  );
  expectEqual(errors, roadmap.status, "ACTIVE", "ROADMAP_NOT_ACTIVE");

  if (!isRecord(roadmap.ownerDecision)) {
    errors.push("OWNER_DECISION_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.ownerDecision.decisionId,
      v23
        ? WP8F_V23_ADDENDUM.ownerDecision
        : successor
          ? completion.ownerDecision
          : "MP-OD-2026-09-09-V19",
      "OWNER_DECISION_ID_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.decidedAt,
      v23 ? "2026-09-11" : successor ? "2026-09-10" : "2026-09-09",
      "OWNER_DECISION_DATE_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.supersedes,
      v23
        ? WP8F_V23_ADDENDUM.supersedes
        : successor
          ? completion.supersedes
          : "2026.09.09-v18",
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
      successor
        ? completion.sourceCommit
        : "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f",
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
      roadmap.authorization.testDeploymentAuthorization,
      successor,
      "NEW_TEST_DEPLOYMENT_REQUIRES_OWNER_APPROVAL",
    );
    expectEqual(
      errors,
      roadmap.authorization.testDeploymentOccurred,
      true,
      "TEST_DEPLOYMENT_OCCURRENCE_EVIDENCE_MISSING",
    );
    expectEqual(
      errors,
      roadmap.authorization.testDeployment,
      false,
      "TEST_DEPLOYMENT_MUST_BE_FALSE_BEFORE_WP8C_DEPLOY",
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
    "WP8F_TEST_ACCEPTANCE_COMPLETION",
    "CURRENT_WORK_PHASE_INVALID",
  );
  expectEqual(
    errors,
    currentWork.status,
    v22
      ? "AUTHORIZED_EXACT_V22_TEST_DEPLOYMENT_AND_SUCCESSOR_UAT_ONLY"
      : successor
        ? "AUTHORIZED_EXACT_SUCCESSOR_TEST_COMPLETION_AND_GATED_INTEGRATION"
        : "AUTHORIZED_EXACT_TEST_DEPLOYMENT_PREPARATION_WP8F_ONLY",
    "CURRENT_WORK_STATUS_INVALID",
  );
  expectEqual(
    errors,
    currentWork.targetEnvironment,
    "TEST_ONLY",
    "TARGET_ENVIRONMENT_MUST_BE_TEST_ONLY",
  );
  expectEqual(
    errors,
    currentWork.authorizedWorkPackage,
    "WP8F",
    "AUTHORIZED_WORK_PACKAGE_MUST_BE_WP8F",
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
      false,
      "WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION_MUST_BE_COMPLETE",
    );
    expectEqual(
      errors,
      currentWork.authorization.runtimePilotControlsCompleteWp8a,
      true,
      "WP8A_RUNTIME_PILOT_CONTROL_EVIDENCE_MISSING",
    );
    expectEqual(
      errors,
      currentWork.authorization.testDeploymentSmokeRollbackWp8,
      false,
      "WP8_TEST_PILOT_MUST_BE_BLOCKED",
    );
    expectEqual(
      errors,
      currentWork.authorization.providerAttemptSettlementRemediationWp8b,
      false,
      "WP8B_PROVIDER_ATTEMPT_SETTLEMENT_MUST_BE_COMPLETE",
    );
    expectEqual(
      errors,
      currentWork.authorization.providerReconciliationControlledRetestWp8c,
      false,
      "WP8C_PROVIDER_RECONCILIATION_CONTROLLED_RETEST_MUST_BE_BLOCKED",
    );
    expectEqual(
      errors,
      currentWork.authorization.durableLifecycleDiagnosticsRemediationWp8d,
      false,
      "WP8D_DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_MUST_BE_COMPLETE",
    );
    expectEqual(
      errors,
      currentWork.authorization.exactStateReconciliationControlledRetestWp8e,
      false,
      "WP8E_AUTHORIZATION_MUST_BE_COMPLETE",
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
      currentWork.authorization.testDeploymentAuthorization,
      successor,
      "CURRENT_NEW_TEST_DEPLOYMENT_REQUIRES_OWNER_APPROVAL",
    );
    expectEqual(
      errors,
      currentWork.authorization.testDeploymentOccurred,
      true,
      "CURRENT_WORK_TEST_DEPLOYMENT_OCCURRENCE_EVIDENCE_MISSING",
    );
    expectEqual(
      errors,
      currentWork.authorization.testDeployment,
      false,
      "CURRENT_WORK_TEST_DEPLOYMENT_MUST_BE_FALSE_BEFORE_WP8C_DEPLOY",
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
  const requiredScope = v22
    ? WP8F_V22_SCOPE
    : successor
      ? WP8F_V21_SCOPE
      : REQUIRED_WP8F_SCOPE;
  if (
    allowedScope.length !== requiredScope.length ||
    requiredScope.some((scope) => !allowedScope.includes(scope))
  ) {
    errors.push("WP8F_SCOPE_INVALID");
  }

  if (isRecord(currentWork.authorization))
    expectEqual(
      errors,
      currentWork.authorization.testAcceptanceCompletionWp8f,
      successor,
      "WP8F_OPERATIONAL_ACCEPTANCE_MUST_REMAIN_BLOCKED_IN_V19",
    );
  if (isRecord(currentWork.authorization))
    expectEqual(
      errors,
      currentWork.authorization.testDeploymentPreparationWp8f,
      true,
      "WP8F_DEPLOYMENT_PREPARATION_NOT_AUTHORIZED",
    );
  validateWp8fExactDeploymentPreparation(
    errors,
    currentWork.wp8fExactDeploymentPreparation,
  );
  validateWp8fAcceptancePlan(errors, currentWork.wp8fTestAcceptancePlan);
  validateWp8fApprovedDeployment(errors, currentWork.wp8fApprovedDeployment);
  validateWp8fEnvelope(errors, currentWork.wp8fExecutionEnvelope);
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
  validateWp8TestPilotPlan(errors, currentWork.wp8TestPilotPlan);
  validateWp8bProviderAttemptSettlementPlan(
    errors,
    currentWork.wp8bProviderAttemptSettlementPlan,
  );
  validateWp8cProviderReconciliationControlledRetestPlan(
    errors,
    currentWork.wp8cProviderReconciliationControlledRetestPlan,
  );
  validateWp8dDurableLifecycleDiagnosticsPlan(
    errors,
    currentWork.wp8dDurableLifecycleDiagnosticsPlan,
  );
  validateWp8eExactStateReconciliationControlledRetestPlan(
    errors,
    currentWork.wp8eExactStateReconciliationControlledRetestPlan,
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
  if (
    !forbiddenScope.includes(
      "CREATE_PR_BEFORE_TEST_ACCEPTANCE_AND_FINAL_REVIEW",
    )
  )
    errors.push("WP8F_ALL_PR_MUST_REMAIN_BLOCKED");
  const requiredForbidden = v22
    ? WP8F_V22_FORBIDDEN
    : successor
      ? WP8F_V21_FORBIDDEN
      : REQUIRED_FORBIDDEN_SCOPE;
  for (const required of requiredForbidden) {
    if (!forbiddenScope.includes(required)) {
      errors.push(`FORBIDDEN_SCOPE_MISSING_${required}`);
    }
  }

  if (successor) validateWp8fSuccessor(errors, currentWork, v22, v23);

  const conflicts = Array.isArray(currentWork.conflicts)
    ? currentWork.conflicts
    : [];
  let ownerIntegrationRecorded = false;
  for (const conflict of conflicts) {
    if (!isRecord(conflict)) {
      errors.push("CONFLICT_RECORD_INVALID");
      continue;
    }
    if (conflict.blocking === true)
      errors.push(`BLOCKING_CONFLICT_${String(conflict.code)}`);
    if (conflict.code === "INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW") {
      ownerIntegrationRecorded = true;
      warnings.push("INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW");
    } else if (conflict.code === "DEFAULT_BRANCH_DRIFT") {
      errors.push("STALE_PRE_INTEGRATION_CONFLICT");
    }
  }
  if (!ownerIntegrationRecorded) {
    errors.push("OWNER_INTEGRATION_EVENT_NOT_RECORDED");
  }

  return {
    errors: uniqueSorted(errors),
    warnings: uniqueSorted(warnings),
  };
}

export function evaluateProjectAction(
  roadmap: unknown,
  currentWork: unknown,
  action: string,
  deploymentTarget?: {
    worker: string;
    sourceCommit: string;
    artifactSha256: string;
  },
  executionEvidence?: unknown,
  sealedCheckout?: unknown,
): ProjectActionDecision {
  const validation = validateProjectControl(roadmap, currentWork);
  if (validation.errors.length > 0) {
    return { allowed: false, reason: "ROADMAP_UNVERIFIED" };
  }
  if (!isRecord(currentWork) || !isRecord(currentWork.authorization)) {
    return { allowed: false, reason: "ROADMAP_UNVERIFIED" };
  }
  const authorization = currentWork.authorization;
  if (
    isRecord(roadmap) &&
    (roadmap.version === WP8F_V22_AUTHORIZATION.version ||
      roadmap.version === WP8F_V23_ADDENDUM.version)
  ) {
    return evaluateWp8fV22Action(
      currentWork,
      action,
      deploymentTarget,
      executionEvidence,
      roadmap.version === WP8F_V23_ADDENDUM.version,
      sealedCheckout,
    );
  }
  if (isRecord(roadmap) && roadmap.version === WP8F_V21_COMPLETION.version) {
    return evaluateWp8fSuccessorAction(
      currentWork,
      action,
      deploymentTarget,
      executionEvidence,
    );
  }
  if (action === "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS") {
    return deploymentTarget &&
      wp8fV19ReadinessGate(deploymentTarget, executionEvidence)
      ? { allowed: true, reason: "READY_FOR_EXACT_TEST_DEPLOYMENT" }
      : {
          allowed: false,
          reason: "INDEPENDENT_V19_READINESS_EVIDENCE_REQUIRED",
        };
  }
  if (action === "CREATE_DRAFT_PR") {
    return wp8fReviewGate(executionEvidence)
      ? {
          allowed: false,
          reason: "DRAFT_PR_REQUIRES_SEPARATE_OWNER_APPROVAL_V18",
        }
      : { allowed: false, reason: "ALL_PR_BLOCKED_PENDING_FINAL_REVIEW" };
  }
  if (action === "DEPLOY_TEST") {
    if (
      !deploymentTarget ||
      deploymentTarget.worker !== WP8F_V18_ENVELOPE.worker ||
      !isFullSha(deploymentTarget.sourceCommit, 40) ||
      !isFullSha(deploymentTarget.artifactSha256, 64)
    )
      return { allowed: false, reason: "EXACT_DEPLOYMENT_TARGET_REQUIRED" };
    if (!wp8fCandidateGate(deploymentTarget, executionEvidence))
      return {
        allowed: false,
        reason: "VERIFIED_CANDIDATE_AND_TEST_STATE_REQUIRED",
      };
    // Even complete historical evidence cannot execute the unused v19 grant.
    return { allowed: false, reason: "V19_STOP_BEFORE_FIRST_REMOTE_MUTATION" };
  }
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
    TEST_DEPLOYMENT_SMOKE_ROLLBACK_WP8: "testDeploymentSmokeRollbackWp8",
    PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_WP8B:
      "providerAttemptSettlementRemediationWp8b",
    PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C:
      "providerReconciliationControlledRetestWp8c",
    DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_WP8D:
      "durableLifecycleDiagnosticsRemediationWp8d",
    EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E:
      "exactStateReconciliationControlledRetestWp8e",
    TEST_ACCEPTANCE_COMPLETION_WP8F: "testAcceptanceCompletionWp8f",
    PREPARE_EXACT_TEST_DEPLOYMENT: "testDeploymentPreparationWp8f",
    ASSESS_EXACT_TEST_DEPLOYMENT_READINESS: "testDeploymentPreparationWp8f",
    CREATE_DRAFT_PR: "testAcceptanceCompletionWp8f",
    LOCAL_IMPLEMENTATION: "localImplementation",
    COMMIT: "commit",
    PUSH_BRANCH: "pushBranch",
    UPDATE_GITHUB_ROADMAP: "githubRoadmapUpdate",
    DEPLOY_TEST: "testDeploymentAuthorization",
    CHANGE_PRODUCTION: "production",
  };
  if (!Object.hasOwn(keyByAction, action))
    return { allowed: false, reason: "UNKNOWN_OR_FORBIDDEN_ACTION" };
  const key = keyByAction[action as ProjectAction];
  if (authorization[key] !== true) {
    return { allowed: false, reason: `${action}_NOT_AUTHORIZED` };
  }
  return { allowed: true, reason: "AUTHORIZED_BY_CURRENT_WORK" };
}

export function validateSchemaDocuments(
  roadmapSchema: unknown,
  currentWorkSchema: unknown,
  expectedVersion = "2026.09.09-v19",
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
  if (isRecord(currentWorkSchema)) {
    const properties = currentWorkSchema.properties;
    if (
      !Array.isArray(currentWorkSchema.required) ||
      !currentWorkSchema.required.includes("wp8fExactDeploymentPreparation") ||
      !isRecord(properties) ||
      !isRecord(properties.wp8fExactDeploymentPreparation) ||
      JSON.stringify(properties.wp8fExactDeploymentPreparation.const) !==
        JSON.stringify(WP8F_V19_PREPARATION)
    )
      errors.push("V19_PREPARATION_SCHEMA_NOT_CLOSED");
  }
  if (
    expectedVersion === WP8F_V21_COMPLETION.version ||
    expectedVersion === WP8F_V22_AUTHORIZATION.version ||
    expectedVersion === WP8F_V23_ADDENDUM.version
  ) {
    if (
      !isRecord(currentWorkSchema) ||
      !isRecord(currentWorkSchema.properties) ||
      !Array.isArray(currentWorkSchema.required) ||
      !currentWorkSchema.required.includes("wp8fSuccessorCompletion") ||
      !currentWorkSchema.required.includes("wp8fSuccessorOperationJournal") ||
      JSON.stringify(currentWorkSchema.properties.wp8fSuccessorCompletion) !==
        JSON.stringify({ const: WP8F_V21_COMPLETION }) ||
      JSON.stringify(
        currentWorkSchema.properties.wp8fSuccessorOperationJournal,
      ) !== JSON.stringify(WP8F_V21_JOURNAL_SCHEMA)
    )
      errors.push("V21_SCHEMA_NOT_CLOSED");
    if (
      (expectedVersion === WP8F_V22_AUTHORIZATION.version ||
        expectedVersion === WP8F_V23_ADDENDUM.version) &&
      (!isRecord(currentWorkSchema) ||
        !isRecord(currentWorkSchema.properties) ||
        !Array.isArray(currentWorkSchema.required) ||
        !currentWorkSchema.required.includes("wp8fV22Authorization") ||
        !currentWorkSchema.required.includes("wp8fV22OperationJournal") ||
        JSON.stringify(currentWorkSchema.properties.wp8fV22Authorization) !==
          JSON.stringify({ const: WP8F_V22_AUTHORIZATION }) ||
        JSON.stringify(currentWorkSchema.properties.wp8fV22OperationJournal) !==
          JSON.stringify(WP8F_V22_JOURNAL_SCHEMA))
    )
      errors.push("V22_SCHEMA_NOT_CLOSED");
    if (
      expectedVersion === WP8F_V23_ADDENDUM.version &&
      (!isRecord(currentWorkSchema) ||
        !isRecord(currentWorkSchema.properties) ||
        !Array.isArray(currentWorkSchema.required) ||
        !currentWorkSchema.required.includes(
          "wp8fV23InstrumentationAddendum",
        ) ||
        JSON.stringify(
          currentWorkSchema.properties.wp8fV23InstrumentationAddendum,
        ) !== JSON.stringify({ const: WP8F_V23_ADDENDUM }))
    )
      errors.push("V23_SCHEMA_NOT_CLOSED");
  } else if (expectedVersion !== "2026.09.09-v19")
    errors.push("UNKNOWN_SCHEMA_VERSION");
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

function validateWp8TestPilotPlan(errors: string[], plan: unknown): void {
  if (!isRecord(plan)) {
    errors.push("WP8_TEST_PILOT_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "authorizationStatus",
      "DEPLOYED_PARTIAL_AWAITING_LINE_TEST",
      "WP8_AUTHORIZATION_STATUS_INVALID",
    ],
    [
      "executionControlBaseCommit",
      EXPECTED_WP8A_CONTROL_BASE_COMMIT,
      "WP8_EXECUTION_CONTROL_BASE_INVALID",
    ],
    [
      "candidateRuntimeCommit",
      EXPECTED_WP8A_RUNTIME_IMPLEMENTATION_COMMIT,
      "WP8_CANDIDATE_RUNTIME_INVALID",
    ],
    [
      "candidateArtifactSha256",
      "810c6d51f4898076ce2d6c4f93666128370387e79263d695021c50cf250ed36b",
      "WP8_CANDIDATE_ARTIFACT_INVALID",
    ],
    ["workerName", "malispang-lineoa-test", "WP8_WORKER_INVALID"],
    ["configPath", "wrangler.jsonc", "WP8_CONFIG_PATH_INVALID"],
    [
      "workerDomain",
      "malispang-lineoa-test.eakkachai-dev.workers.dev",
      "WP8_WORKER_DOMAIN_INVALID",
    ],
    [
      "rollbackTargetVersionId",
      "3e02e79b-29c9-46cf-9218-ed2d0b7d7655",
      "WP8_ROLLBACK_TARGET_INVALID",
    ],
    ["credentialSlot", "OPENAI_API_KEY", "WP8_CREDENTIAL_SLOT_INVALID"],
    ["deploymentOccurred", true, "WP8_DEPLOYMENT_EVIDENCE_MISSING"],
    [
      "currentDeployedRevision",
      "509c3587-7ae9-41a8-8ba2-1082d03e138d",
      "WP8_CURRENT_REVISION_INVALID",
    ],
    ["pilotAiEnabled", false, "WP8_PILOT_MUST_START_OFF"],
    ["pilotClosed", true, "WP8_PILOT_CLOSED_EVIDENCE_MISSING"],
    ["ownerUatStatus", "PENDING", "WP8_OWNER_UAT_STATUS_INVALID"],
    ["gateA", "PASS_SAFE_OVER_HANDOFF_ONLY", "WP8_GATE_A_INVALID"],
    ["gateB", "PASS_RUNTIME_ENFORCED", "WP8_GATE_B_INVALID"],
    ["gateC", "PASS_RETAINED_TEST_V21_NO_AI", "WP8_GATE_C_INVALID"],
    ["rollbackRehearsal", "PASS", "WP8_ROLLBACK_REHEARSAL_INVALID"],
    ["rollbackCommandSeconds", 3, "WP8_ROLLBACK_TIMING_INVALID"],
    ["candidateRecoverySeconds", 7, "WP8_RECOVERY_TIMING_INVALID"],
    [
      "lineSmokeStatus",
      "BLOCKED_TESTER_IDENTITY_NOT_PROVISIONED",
      "WP8_LINE_SMOKE_STATUS_INVALID",
    ],
    [
      "finalTestState",
      "CANDIDATE_DEPLOYED_AI_OFF_PILOT_STOPPED",
      "WP8_FINAL_TEST_STATE_INVALID",
    ],
    ["testEventsUsed", 0, "WP8_TEST_EVENT_USAGE_INVALID"],
    ["providerAttemptsUsed", 0, "WP8_PROVIDER_ATTEMPT_USAGE_INVALID"],
    ["costConsumedMicroUsd", 0, "WP8_COST_USAGE_INVALID"],
    [
      "verdict",
      "WP8_TEST_PILOT_PARTIAL_AWAITING_LINE_TEST",
      "WP8_VERDICT_INVALID",
    ],
    ["maximumTestEvents", 200, "WP8_EVENT_BUDGET_INVALID"],
    ["maximumProviderAttempts", 200, "WP8_ATTEMPT_BUDGET_INVALID"],
    ["maximumSessionMinutes", 60, "WP8_SESSION_LIMIT_INVALID"],
    ["maximumCostMicroUsd", 5_000_000, "WP8_COST_LIMIT_INVALID"],
    ["productionStatus", "NO_GO", "WP8_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
}

function validateWp8bProviderAttemptSettlementPlan(
  errors: string[],
  plan: unknown,
): void {
  if (!isRecord(plan) || !isRecord(plan.observedState)) {
    errors.push("WP8B_PROVIDER_ATTEMPT_SETTLEMENT_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "authorizationStatus",
      "LOCAL_CANDIDATE_VERIFIED_REMOTE_ACTION_BLOCKED",
      "WP8B_AUTHORIZATION_STATUS_INVALID",
    ],
    [
      "controlBaseCommit",
      EXPECTED_WP8B_CONTROL_BASE_COMMIT,
      "WP8B_CONTROL_BASE_INVALID",
    ],
    [
      "controlAuthorizationCommit",
      "63bc6cc0ba2aff535c8b7d809232525c10259ed4",
      "WP8B_CONTROL_AUTHORIZATION_COMMIT_INVALID",
    ],
    [
      "implementationCommit",
      "25b0bc9f726b05d80aeb586fd09290c43bc3ba35",
      "WP8B_IMPLEMENTATION_COMMIT_INVALID",
    ],
    ["remediationVerdict", "PASS", "WP8B_REMEDIATION_VERDICT_INVALID"],
    [
      "observedStopReason",
      "IN_FLIGHT_USAGE_UNKNOWN",
      "WP8B_STOP_REASON_INVALID",
    ],
    [
      "existingRemoteAttemptMutation",
      "FORBIDDEN_PENDING_VERIFIED_CANDIDATE_AND_SEPARATE_ACTION",
      "WP8B_EXISTING_REMOTE_ATTEMPT_MUTATION_MUST_BE_BLOCKED",
    ],
    [
      "candidateDeploymentOccurred",
      false,
      "WP8B_CANDIDATE_DEPLOYMENT_MUST_BE_FALSE",
    ],
    [
      "existingRemoteAttemptReconciled",
      false,
      "WP8B_EXISTING_REMOTE_ATTEMPT_MUST_REMAIN_UNCHANGED",
    ],
    [
      "testDeploymentAuthorization",
      false,
      "WP8B_TEST_DEPLOYMENT_MUST_BE_BLOCKED",
    ],
    ["liveProviderAuthorization", false, "WP8B_LIVE_PROVIDER_MUST_BE_BLOCKED"],
    ["pilotSessionAuthorization", false, "WP8B_PILOT_SESSION_MUST_BE_BLOCKED"],
    ["productionStatus", "NO_GO", "WP8B_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8B_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  if (!isRecord(plan.validationTotals)) {
    errors.push("WP8B_VALIDATION_TOTALS_MISSING");
  } else {
    for (const [field, expected, code] of [
      ["nodeUnit", 450, "WP8B_NODE_UNIT_TOTAL_INVALID"],
      ["deterministicBenchmark", 14, "WP8B_BENCHMARK_TOTAL_INVALID"],
      ["worker", 66, "WP8B_WORKER_TOTAL_INVALID"],
      ["combinedUnique", 530, "WP8B_COMBINED_TOTAL_INVALID"],
      ["failed", 0, "WP8B_FAILED_TESTS_MUST_BE_ZERO"],
      ["skipped", 0, "WP8B_SKIPPED_TESTS_MUST_BE_ZERO"],
      ["cancelled", 0, "WP8B_CANCELLED_TESTS_MUST_BE_ZERO"],
    ] as const) {
      expectEqual(errors, plan.validationTotals[field], expected, code);
    }
  }
  for (const [field, expected, code] of [
    ["pilot", "STOPPED", "WP8B_OBSERVED_PILOT_STATE_INVALID"],
    ["aiEnabled", false, "WP8B_OBSERVED_AI_STATE_INVALID"],
    ["admittedEvents", 1, "WP8B_OBSERVED_EVENT_COUNT_INVALID"],
    ["providerAttempts", 1, "WP8B_OBSERVED_ATTEMPT_COUNT_INVALID"],
    ["budgetConsumedMicroUsd", 0, "WP8B_OBSERVED_CONSUMED_BUDGET_INVALID"],
    ["budgetReservedMicroUsd", 12_932, "WP8B_OBSERVED_RESERVED_BUDGET_INVALID"],
    ["inFlight", 1, "WP8B_OBSERVED_IN_FLIGHT_INVALID"],
  ] as const) {
    expectEqual(errors, plan.observedState[field], expected, code);
  }
  if (
    !Array.isArray(plan.verifiedFacts) ||
    plan.verifiedFacts.length !== 6 ||
    !Array.isArray(plan.unverifiedFacts) ||
    plan.unverifiedFacts.length !== 4
  ) {
    errors.push("WP8B_FACT_CLASSIFICATION_INVALID");
  }
  if (!isRecord(plan.requiredFailureSemantics)) {
    errors.push("WP8B_FAILURE_SEMANTICS_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "applicationDeadline",
      "SETTLE_USAGE_UNKNOWN_AND_FAIL_CLOSED",
      "WP8B_DEADLINE_SEMANTICS_INVALID",
    ],
    [
      "lateProviderResult",
      "IGNORE_NO_REPLY_NO_SECOND_SETTLEMENT",
      "WP8B_LATE_RESULT_SEMANTICS_INVALID",
    ],
    ["settlementReplay", "IDEMPOTENT", "WP8B_REPLAY_SEMANTICS_INVALID"],
    ["stopDuringInFlight", "NO_AI_REPLY", "WP8B_STOP_SEMANTICS_INVALID"],
    [
      "existingUnknownAttempt",
      "KEEP_FULL_RESERVATION_NO_REFUND",
      "WP8B_EXISTING_UNKNOWN_SEMANTICS_INVALID",
    ],
  ] as const) {
    expectEqual(errors, plan.requiredFailureSemantics[field], expected, code);
  }
}

function validateWp8cProviderReconciliationControlledRetestPlan(
  errors: string[],
  plan: unknown,
): void {
  if (
    !isRecord(plan) ||
    !isRecord(plan.existingAttempt) ||
    !isRecord(plan.reconciliationPreconditions) ||
    !isRecord(plan.newSessionContract) ||
    !isRecord(plan.providerLifecycleDiagnostics) ||
    !isRecord(plan.settlementRpc)
  ) {
    errors.push("WP8C_CONTROLLED_RETEST_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "authorizationStatus",
      "AUTHORIZED_CONTROLLED_TEST_RECONCILIATION_AND_SINGLE_RETEST",
      "WP8C_AUTHORIZATION_STATUS_INVALID",
    ],
    [
      "controlBaseCommit",
      EXPECTED_WP8C_CONTROL_BASE_COMMIT,
      "WP8C_CONTROL_BASE_INVALID",
    ],
    ["exactTestWorker", "malispang-lineoa-test", "WP8C_TEST_WORKER_INVALID"],
    [
      "exactTestDomain",
      "malispang-lineoa-test.eakkachai-dev.workers.dev",
      "WP8C_TEST_DOMAIN_INVALID",
    ],
    [
      "activeBaselineVersion",
      "509c3587-7ae9-41a8-8ba2-1082d03e138d",
      "WP8C_ACTIVE_BASELINE_VERSION_INVALID",
    ],
    [
      "activeBaselineSourceCommit",
      "98a3f46226acaaeeaffe5954e4f9d22fca05a622",
      "WP8C_ACTIVE_BASELINE_SOURCE_INVALID",
    ],
    [
      "historicalObservability",
      "UNAVAILABLE_HTTP_403_NO_SCOPE_ESCALATION",
      "WP8C_HISTORICAL_OBSERVABILITY_INVALID",
    ],
    [
      "testDeploymentAuthorization",
      true,
      "WP8C_TEST_DEPLOYMENT_NOT_AUTHORIZED",
    ],
    [
      "singleLiveProviderAuthorization",
      true,
      "WP8C_LIVE_RETEST_NOT_AUTHORIZED",
    ],
    ["productionStatus", "NO_GO", "WP8C_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8C_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  for (const [field, expected, code] of [
    ["sessionState", "STOPPED", "WP8C_EXISTING_SESSION_STATE_INVALID"],
    [
      "stopReason",
      "IN_FLIGHT_USAGE_UNKNOWN",
      "WP8C_EXISTING_STOP_REASON_INVALID",
    ],
    ["admittedEvents", 1, "WP8C_EXISTING_EVENT_COUNT_INVALID"],
    ["providerAttempts", 1, "WP8C_EXISTING_ATTEMPT_COUNT_INVALID"],
    ["budgetConsumedMicroUsd", 0, "WP8C_EXISTING_CONSUMED_INVALID"],
    ["budgetReservedMicroUsd", 12_932, "WP8C_EXISTING_RESERVED_INVALID"],
    ["inFlight", 1, "WP8C_EXISTING_IN_FLIGHT_INVALID"],
    ["actualUsage", "UNKNOWN", "WP8C_EXISTING_USAGE_MUST_REMAIN_UNKNOWN"],
    [
      "reconciliationDisposition",
      "CONSUME_FULL_RESERVATION_NO_REFUND",
      "WP8C_RECONCILIATION_DISPOSITION_INVALID",
    ],
  ] as const) {
    expectEqual(errors, plan.existingAttempt[field], expected, code);
  }
  for (const [field, expected, code] of [
    ["authenticatedTestAdminOnly", true, "WP8C_RECONCILIATION_AUTH_REQUIRED"],
    [
      "exactSingleStaleDispatchedAttempt",
      true,
      "WP8C_RECONCILIATION_SCOPE_INVALID",
    ],
    [
      "originalSessionMustRemainStopped",
      true,
      "WP8C_RECONCILIATION_STOP_REQUIRED",
    ],
    ["idempotent", true, "WP8C_RECONCILIATION_IDEMPOTENCY_REQUIRED"],
    ["deleteEvidence", false, "WP8C_RECONCILIATION_EVIDENCE_DELETE_FORBIDDEN"],
  ] as const) {
    expectEqual(
      errors,
      plan.reconciliationPreconditions[field],
      expected,
      code,
    );
  }
  for (const [field, expected, code] of [
    ["maximumNewSessions", 1, "WP8C_SESSION_COUNT_INVALID"],
    ["maximumNewLineEvents", 1, "WP8C_LIVE_EVENT_COUNT_INVALID"],
    ["maximumTotalEvents", 200, "WP8C_TOTAL_EVENT_LIMIT_INVALID"],
    ["maximumTotalProviderAttempts", 200, "WP8C_TOTAL_ATTEMPT_LIMIT_INVALID"],
    ["maximumTotalCostMicroUsd", 5_000_000, "WP8C_TOTAL_COST_LIMIT_INVALID"],
    ["maximumSessionMinutes", 60, "WP8C_SESSION_MINUTES_INVALID"],
    [
      "carryForwardPriorAccounting",
      true,
      "WP8C_ACCOUNTING_CARRY_FORWARD_REQUIRED",
    ],
    ["timeoutRetryForbidden", true, "WP8C_TIMEOUT_RETRY_MUST_BE_FORBIDDEN"],
  ] as const) {
    expectEqual(errors, plan.newSessionContract[field], expected, code);
  }
  for (const field of [
    "contentFree",
    "requestIdAllowed",
    "clientRequestIdAllowed",
    "httpStatusAllowed",
    "safeErrorTypeCodeAllowed",
    "rateLimitHeadersAllowed",
    "phaseDurationsAllowed",
    "secretOrUserIdentifierForbidden",
  ]) {
    expectEqual(
      errors,
      plan.providerLifecycleDiagnostics[field],
      true,
      `WP8C_DIAGNOSTIC_${field.toUpperCase()}_INVALID`,
    );
  }
  expectEqual(
    errors,
    plan.settlementRpc.boundedDeadlineRequired,
    true,
    "WP8C_SETTLEMENT_RPC_DEADLINE_REQUIRED",
  );
  expectEqual(
    errors,
    plan.settlementRpc.failureMode,
    "FAIL_CLOSED_NO_AI_REPLY",
    "WP8C_SETTLEMENT_RPC_FAILURE_MODE_INVALID",
  );
  expectEqual(
    errors,
    plan.settlementRpc.lateCompletion,
    "IDEMPOTENT_NO_SECOND_REPLY",
    "WP8C_SETTLEMENT_RPC_LATE_COMPLETION_INVALID",
  );
}

function validateWp8dDurableLifecycleDiagnosticsPlan(
  errors: string[],
  plan: unknown,
): void {
  if (
    !isRecord(plan) ||
    !isRecord(plan.observedState) ||
    !isRecord(plan.evidenceBoundary) ||
    !isRecord(plan.checkpointContract) ||
    !isRecord(plan.webhookLifecycle) ||
    !isRecord(plan.isolatedDiagnostic) ||
    !isRecord(plan.secondAttemptReconciliationProposal)
  ) {
    errors.push("WP8D_DURABLE_LIFECYCLE_DIAGNOSTICS_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "authorizationStatus",
      "AUTHORIZED_LOCAL_DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION",
      "WP8D_AUTHORIZATION_STATUS_INVALID",
    ],
    [
      "controlBaseCommit",
      EXPECTED_WP8D_CONTROL_BASE_COMMIT,
      "WP8D_CONTROL_BASE_INVALID",
    ],
    ["exactTestWorker", "malispang-lineoa-test", "WP8D_TEST_WORKER_INVALID"],
    [
      "exactTestDomain",
      "malispang-lineoa-test.eakkachai-dev.workers.dev",
      "WP8D_TEST_DOMAIN_INVALID",
    ],
    ["testDeploymentAuthorization", false, "WP8D_DEPLOYMENT_MUST_BE_BLOCKED"],
    [
      "remoteReconciliationAuthorization",
      false,
      "WP8D_REMOTE_RECONCILIATION_MUST_BE_BLOCKED",
    ],
    ["liveProviderAuthorization", false, "WP8D_LIVE_PROVIDER_MUST_BE_BLOCKED"],
    ["productionStatus", "NO_GO", "WP8D_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8D_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }

  for (const [field, expected, code] of [
    ["sessionState", "STOPPED", "WP8D_SESSION_STATE_INVALID"],
    ["stopReason", "IN_FLIGHT_USAGE_UNKNOWN", "WP8D_STOP_REASON_INVALID"],
    ["aiEnabled", false, "WP8D_AI_MUST_REMAIN_OFF"],
    ["admittedEvents", 2, "WP8D_EVENT_COUNT_INVALID"],
    ["providerAttempts", 2, "WP8D_ATTEMPT_COUNT_INVALID"],
    ["budgetConsumedMicroUsd", 12_932, "WP8D_CONSUMED_INVALID"],
    ["budgetReservedMicroUsd", 12_932, "WP8D_RESERVED_INVALID"],
    ["inFlight", 1, "WP8D_IN_FLIGHT_INVALID"],
    ["actualUsage", "UNKNOWN", "WP8D_USAGE_MUST_REMAIN_UNKNOWN"],
    ["latestLifecyclePresent", false, "WP8D_MISSING_LIFECYCLE_FACT_INVALID"],
  ] as const) {
    expectEqual(errors, plan.observedState[field], expected, code);
  }

  for (const field of [
    "dispatchAuthorizationProvesFetchStarted",
    "fetchStartedProvesProviderReceived",
    "preFetchCheckpointProvesProviderReceived",
    "remoteRootCauseConfirmed",
  ]) {
    expectEqual(
      errors,
      plan.evidenceBoundary[field],
      false,
      `WP8D_EVIDENCE_BOUNDARY_${field.toUpperCase()}_INVALID`,
    );
  }

  const checkpoints = [
    "DISPATCH_AUTHORIZED",
    "OUTBOUND_FETCH_STARTING",
    "FETCH_PROMISE_CREATED",
    "RESPONSE_HEADERS_RECEIVED",
    "RESPONSE_BODY_READ",
    "RESPONSE_PARSED",
    "SETTLEMENT_STARTED",
    "SETTLEMENT_SUCCEEDED",
  ];
  const requiredCheckpoints = Array.isArray(plan.requiredCheckpoints)
    ? plan.requiredCheckpoints
    : [];
  if (
    requiredCheckpoints.length !== checkpoints.length ||
    checkpoints.some((phase, index) => requiredCheckpoints[index] !== phase)
  ) {
    errors.push("WP8D_CHECKPOINT_SEQUENCE_INVALID");
  }

  for (const field of [
    "preDispatchAcknowledgementRequired",
    "contentFree",
    "correlationIdentifiersOnly",
    "rawResponseBodyForbidden",
    "secretOrUserIdentifierForbidden",
  ]) {
    expectEqual(
      errors,
      plan.checkpointContract[field],
      true,
      `WP8D_CHECKPOINT_CONTRACT_${field.toUpperCase()}_INVALID`,
    );
  }
  expectEqual(
    errors,
    plan.webhookLifecycle.executionContextWaitUntilRequired,
    true,
    "WP8D_WAIT_UNTIL_REQUIRED",
  );
  expectEqual(
    errors,
    plan.webhookLifecycle.waitUntilMaximumSeconds,
    30,
    "WP8D_WAIT_UNTIL_BOUND_INVALID",
  );
  expectEqual(
    errors,
    plan.webhookLifecycle.waitUntilDurabilityGuarantee,
    false,
    "WP8D_WAIT_UNTIL_MUST_NOT_CLAIM_DURABILITY",
  );
  expectEqual(
    errors,
    plan.webhookLifecycle.allPromisesTracked,
    true,
    "WP8D_ALL_PROMISES_MUST_BE_TRACKED",
  );

  for (const [field, expected, code] of [
    ["authenticatedTestAdminOnly", true, "WP8D_DIAGNOSTIC_AUTH_REQUIRED"],
    ["separateDurableObject", true, "WP8D_DIAGNOSTIC_ISOLATION_REQUIRED"],
    ["providerCalls", 0, "WP8D_DIAGNOSTIC_PROVIDER_CALL_FORBIDDEN"],
    ["lineReplies", 0, "WP8D_DIAGNOSTIC_LINE_REPLY_FORBIDDEN"],
    ["remoteInvocationAuthorized", false, "WP8D_REMOTE_SELF_TEST_FORBIDDEN"],
  ] as const) {
    expectEqual(errors, plan.isolatedDiagnostic[field], expected, code);
  }

  const reconciliation = plan.secondAttemptReconciliationProposal;
  for (const [field, expected, code] of [
    ["requiredSessionState", "STOPPED", "WP8D_RECONCILIATION_STATE_INVALID"],
    [
      "requiredStopReason",
      "IN_FLIGHT_USAGE_UNKNOWN",
      "WP8D_RECONCILIATION_REASON_INVALID",
    ],
    ["requiredAdmittedEvents", 2, "WP8D_RECONCILIATION_EVENTS_INVALID"],
    ["requiredProviderAttempts", 2, "WP8D_RECONCILIATION_ATTEMPTS_INVALID"],
    [
      "requiredBudgetConsumedMicroUsd",
      12_932,
      "WP8D_RECONCILIATION_CONSUMED_INVALID",
    ],
    [
      "requiredBudgetReservedMicroUsd",
      12_932,
      "WP8D_RECONCILIATION_RESERVED_INVALID",
    ],
    ["requiredInFlight", 1, "WP8D_RECONCILIATION_IN_FLIGHT_INVALID"],
    [
      "requiredStaleDispatchedAttempts",
      1,
      "WP8D_RECONCILIATION_STALE_ATTEMPT_INVALID",
    ],
    [
      "requiredExistingTerminalUsageUnknownAttempts",
      1,
      "WP8D_RECONCILIATION_TERMINAL_UNKNOWN_INVALID",
    ],
    [
      "disposition",
      "CONSUME_FULL_RESERVATION_NO_REFUND",
      "WP8D_RECONCILIATION_DISPOSITION_INVALID",
    ],
    ["finalBudgetConsumedMicroUsd", 25_864, "WP8D_FINAL_CONSUMED_INVALID"],
    ["finalBudgetReservedMicroUsd", 0, "WP8D_FINAL_RESERVED_INVALID"],
    ["finalInFlight", 0, "WP8D_FINAL_IN_FLIGHT_INVALID"],
    ["actualUsage", "UNKNOWN", "WP8D_FINAL_USAGE_MUST_REMAIN_UNKNOWN"],
    ["sessionRemainsStopped", true, "WP8D_SESSION_MUST_REMAIN_STOPPED"],
    ["idempotent", true, "WP8D_RECONCILIATION_IDEMPOTENCY_REQUIRED"],
    ["deleteEvidence", false, "WP8D_EVIDENCE_DELETE_FORBIDDEN"],
    ["remoteExecutionAuthorized", false, "WP8D_REMOTE_EXECUTION_FORBIDDEN"],
  ] as const) {
    expectEqual(errors, reconciliation[field], expected, code);
  }
}

function validateWp8eExactStateReconciliationControlledRetestPlan(
  errors: string[],
  plan: unknown,
): void {
  if (
    !isRecord(plan) ||
    !isRecord(plan.preMutationState) ||
    !isRecord(plan.exactIdentityContract) ||
    !isRecord(plan.expectedTransition) ||
    !isRecord(plan.isolatedLifecycleSelfTest) ||
    !isRecord(plan.oldAttemptIsolation) ||
    !isRecord(plan.conditionalLiveRetest)
  ) {
    errors.push("WP8E_EXACT_STATE_RECONCILIATION_PLAN_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "authorizationStatus",
      "AUTHORIZED_EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST",
      "WP8E_AUTHORIZATION_STATUS_INVALID",
    ],
    [
      "controlBaseCommit",
      EXPECTED_WP8E_CONTROL_BASE_COMMIT,
      "WP8E_BASE_INVALID",
    ],
    ["exactTestWorker", "malispang-lineoa-test", "WP8E_TEST_WORKER_INVALID"],
    [
      "exactTestDomain",
      "malispang-lineoa-test.eakkachai-dev.workers.dev",
      "WP8E_TEST_DOMAIN_INVALID",
    ],
    ["exactPilotObject", "mp06-pilot-control-v1", "WP8E_PILOT_OBJECT_INVALID"],
    ["candidateDeploymentOccurred", false, "WP8E_DEPLOYMENT_MUST_START_FALSE"],
    ["testDeploymentAuthorization", true, "WP8E_DEPLOYMENT_NOT_AUTHORIZED"],
    [
      "remoteReconciliationAuthorization",
      true,
      "WP8E_RECONCILIATION_NOT_AUTHORIZED",
    ],
    [
      "noNetworkLifecycleSelfTestAuthorization",
      true,
      "WP8E_SELF_TEST_NOT_AUTHORIZED",
    ],
    [
      "conditionalLiveProviderAuthorization",
      true,
      "WP8E_LIVE_RETEST_NOT_AUTHORIZED",
    ],
    ["productionStatus", "NO_GO", "WP8E_PRODUCTION_STATUS_INVALID"],
    ["issueMustRemainOpen", true, "WP8E_ISSUE_MUST_REMAIN_OPEN"],
  ] as const) {
    expectEqual(errors, plan[field], expected, code);
  }
  for (const [field, expected, code] of [
    ["sessionState", "STOPPED", "WP8E_STATE_INVALID"],
    ["stopReason", "IN_FLIGHT_USAGE_UNKNOWN", "WP8E_REASON_INVALID"],
    ["admittedEvents", 2, "WP8E_EVENT_COUNT_INVALID"],
    ["providerAttempts", 2, "WP8E_ATTEMPT_COUNT_INVALID"],
    ["budgetConsumedMicroUsd", 12_932, "WP8E_CONSUMED_INVALID"],
    ["budgetReservedMicroUsd", 12_932, "WP8E_RESERVED_INVALID"],
    ["inFlight", 1, "WP8E_IN_FLIGHT_INVALID"],
    ["existingTerminalUsageUnknownAttempts", 1, "WP8E_TERMINAL_COUNT_INVALID"],
    ["staleDispatchedAttempts", 1, "WP8E_STALE_COUNT_INVALID"],
    ["actualUsage", "UNKNOWN", "WP8E_ACTUAL_USAGE_MUST_REMAIN_UNKNOWN"],
  ] as const) {
    expectEqual(errors, plan.preMutationState[field], expected, code);
  }
  for (const field of [
    "sessionReferenceRequired",
    "attemptTargetReferenceRequired",
    "countersAloneForbidden",
    "attemptReferenceDisclosureForbidden",
    "atomicTransactionRequired",
    "idempotent",
    "lateSettlementMustBeNoOp",
  ]) {
    expectEqual(
      errors,
      plan.exactIdentityContract[field],
      true,
      `WP8E_IDENTITY_CONTRACT_${field.toUpperCase()}_INVALID`,
    );
  }
  for (const [field, expected, code] of [
    ["finalSessionState", "STOPPED", "WP8E_FINAL_STATE_INVALID"],
    [
      "finalStopReason",
      "PROVIDER_USAGE_UNKNOWN_RECONCILED",
      "WP8E_FINAL_REASON_INVALID",
    ],
    ["finalAdmittedEvents", 2, "WP8E_FINAL_EVENTS_INVALID"],
    ["finalProviderAttempts", 2, "WP8E_FINAL_ATTEMPTS_INVALID"],
    ["finalBudgetConsumedMicroUsd", 25_864, "WP8E_FINAL_CONSUMED_INVALID"],
    ["finalBudgetReservedMicroUsd", 0, "WP8E_FINAL_RESERVED_INVALID"],
    ["finalInFlight", 0, "WP8E_FINAL_IN_FLIGHT_INVALID"],
    ["attemptTerminalState", "USAGE_UNKNOWN", "WP8E_FINAL_ATTEMPT_INVALID"],
    ["actualUsage", "UNKNOWN", "WP8E_FINAL_USAGE_MUST_REMAIN_UNKNOWN"],
    ["refund", false, "WP8E_REFUND_FORBIDDEN"],
    ["deleteEvidence", false, "WP8E_EVIDENCE_DELETE_FORBIDDEN"],
  ] as const) {
    expectEqual(errors, plan.expectedTransition[field], expected, code);
  }
  for (const [field, expected, code] of [
    ["authenticatedTestAdminOnly", true, "WP8E_SELF_TEST_AUTH_REQUIRED"],
    ["separateDurableObject", true, "WP8E_SELF_TEST_ISOLATION_REQUIRED"],
    ["providerCalls", 0, "WP8E_SELF_TEST_PROVIDER_CALL_FORBIDDEN"],
    ["lineReplies", 0, "WP8E_SELF_TEST_LINE_REPLY_FORBIDDEN"],
    ["mustCompleteBeforeReconciliation", true, "WP8E_SELF_TEST_GATE_REQUIRED"],
    [
      "mustNotMutatePilotAccounting",
      true,
      "WP8E_SELF_TEST_ACCOUNTING_ISOLATION_REQUIRED",
    ],
  ] as const) {
    expectEqual(errors, plan.isolatedLifecycleSelfTest[field], expected, code);
  }
  for (const field of [
    "terminalBeforeNewSession",
    "retryForbidden",
    "resultAuthorizationForbidden",
    "lateSettlementIdempotentNoOp",
    "externalProviderCompletionRemainsUnknown",
  ]) {
    expectEqual(
      errors,
      plan.oldAttemptIsolation[field],
      true,
      `WP8E_OLD_ATTEMPT_${field.toUpperCase()}_INVALID`,
    );
  }
  for (const [field, expected, code] of [
    ["maximumNewSessions", 1, "WP8E_MAX_SESSIONS_INVALID"],
    ["maximumOwnerLineEvents", 1, "WP8E_MAX_LINE_EVENTS_INVALID"],
    ["maximumSessionMinutes", 60, "WP8E_SESSION_MINUTES_INVALID"],
    ["maximumCumulativeEvents", 200, "WP8E_MAX_EVENTS_INVALID"],
    ["maximumCumulativeProviderAttempts", 200, "WP8E_MAX_ATTEMPTS_INVALID"],
    ["maximumCumulativeCostMicroUsd", 5_000_000, "WP8E_MAX_COST_INVALID"],
    ["carryForwardPriorAccounting", true, "WP8E_ACCOUNTING_RESET_FORBIDDEN"],
    ["separateLiveProbeForbidden", true, "WP8E_LIVE_PROBE_FORBIDDEN"],
    ["retryForbidden", true, "WP8E_RETRY_FORBIDDEN"],
    ["ownerMessageRequired", true, "WP8E_OWNER_MESSAGE_REQUIRED"],
  ] as const) {
    expectEqual(errors, plan.conditionalLiveRetest[field], expected, code);
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

function validateWp8fAcceptancePlan(errors: string[], plan: unknown): void {
  if (!isRecord(plan)) {
    errors.push("WP8F_PLAN_MISSING");
    return;
  }
  const required = {
    baselineCommit: "3ab8957e9c0e81b9a5dff95c6008f30e0c9d3fcd",
    deployedSourceCommit: "c8b0d8246058c5de4991bec369e91cfe2a609a4d",
    deployedVersion: "5835b91b-7b0d-4708-a71b-6c31473adcae",
    exactTestWorker: "malispang-lineoa-test",
    baselineState: "STOPPED",
    baselineEvents: 3,
    baselineAttempts: 3,
    baselineConsumedMicroUsd: 27824,
    baselineReservedMicroUsd: 0,
    baselineInFlight: 0,
    conservativeHistoricalMicroUsd: 25864,
    reportedUsageCostMicroUsd: 1960,
    actualHistoricalBilledUsage: "UNKNOWN",
    maximumNewSessions: 1,
    maximumSessionMinutes: 60,
    maximumCumulativeEvents: 200,
    maximumCumulativeAttempts: 200,
    maximumCumulativeCostMicroUsd: 5000000,
    carryForwardAccounting: true,
    ownerSendsLine: true,
    noReplacementSession: true,
    stopOnFailure: true,
    newSourceDeploymentRequiresOwnerApproval: true,
    rollbackRehearsalRequiresOwnerApproval: true,
    testAcceptanceStatus: "GAP",
    draftPrOnlyAfterTestAcceptance: true,
    mergeAuthorized: false,
    issueClosureAuthorized: false,
    productionStatus: "NO_GO",
    evidenceDocument: "docs/line-oa/mp-06/MP_06_WP8F_TEST_ACCEPTANCE_TH.md",
  } as const;
  for (const [field, expected] of Object.entries(required)) {
    expectEqual(
      errors,
      plan[field],
      expected,
      `WP8F_${field.toUpperCase()}_INVALID`,
    );
  }
}

function validateWp8fApprovedDeployment(errors: string[], plan: unknown): void {
  if (!isRecord(plan)) {
    errors.push("WP8F_APPROVED_DEPLOYMENT_MISSING");
    return;
  }
  const required = {
    worker: "malispang-lineoa-test",
    sourceCommit: "f986a478bc980f9e53748ed49cedd543f54cd64a",
    artifactSha256:
      "f93807109b7d700f79a7b7b90979659ac285be8420e74fb809cc6900d78adec2",
    requiredPreDeploymentState: "STOPPED",
    candidateDeploymentOccurredAtAuthorization: false,
    maximumCandidateDeployments: 1,
    rollbackRehearsalAuthorized: false,
    anyPullRequestAuthorized: false,
    preserveAccounting: true,
  } as const;
  if (Object.keys(plan).length !== Object.keys(required).length)
    errors.push("WP8F_APPROVED_DEPLOYMENT_FIELDS_INVALID");
  for (const [field, expected] of Object.entries(required))
    expectEqual(
      errors,
      plan[field],
      expected,
      `WP8F_DEPLOY_${field.toUpperCase()}_INVALID`,
    );
}

const WP8F_V18_ENVELOPE = {
  ownerDecision: "MP-OD-2026-09-09-V18",
  baseline: "3db7738da3edc3da265ebb623190de03a629c0ff",
  controlFiles: [
    "config/project/roadmap.json",
    "config/project/current-work.json",
    "config/project/current-work.schema.json",
    "src/project-control.ts",
    "src/project-control-cli.ts",
    "tests/project-control.test.ts",
    "PROJECT_CONTROL.md",
    "docs/project/ROADMAP_CHANGELOG.md",
    "docs/project/EXECUTION_GATES.md",
    "docs/project/OWNER_DECISION_LOG.md",
  ],
  worker: "malispang-lineoa-test",
  targetEnvironment: "TEST_ONLY",
  candidateGate:
    "LOCAL_VALIDATED_COMMITTED_PUSHED_REPRODUCIBLE_CANDIDATE_REQUIRES_SEPARATE_DEPLOY_APPROVAL",
  followUpVersion: "8486019d-9b62-4de9-ae15-6299909a23d9",
  followUpSource: "8a5b6547b4713ff50ad6b08ee58682e129641b6a",
  followUpArtifact:
    "15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64",
  recovery: "NOT_AUTHORIZED_IN_V18",
  maximumNewSessions: 0,
  maximumSessionMinutes: 60,
  maximumCumulativeCostMicroUsd: 5000000,
  maximumCumulativeEvents: 200,
  maximumCumulativeAttempts: 200,
  rollbackVersion: "83fab7f1-646a-4ed8-be4d-a5f38df3a072",
  rollbackSource: "f986a478bc980f9e53748ed49cedd543f54cd64a",
  maximumRollbackRehearsals: 0,
  maximumRecoveryRedeployments: 0,
  rollbackGate: "SEPARATE_OWNER_APPROVAL_AFTER_COMPATIBILITY",
  draftPrGate: "NOT_AUTHORIZED_IN_V18",
  legacyMutatingGet: false,
  newRecoveryMechanism: false,
  accountingResetOrRefund: false,
  production: "NO_GO",
  issueClosure: false,
  merge: false,
  remediationFiles: [
    "worker/index.ts",
    "worker/mp-06-wp1.ts",
    "worker-tests/mp-06-pilot-control.test.ts",
    "tests/mp-06-wp1.test.ts",
    "tests/mp-06-wp7-ai-nlu.test.ts",
    "tests/mp-06-wp8a-pilot-control.test.ts",
    "tests/mock-webhook-pipeline.test.ts",
    "worker/durable-objects.ts",
    "worker-tests/durable-state.test.ts",
  ],
  evidenceFiles: [
    "docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md",
  ],
  purpose: "V17_PRECEDENCE_AND_ATOMIC_DELIVERY_FENCING_LOCAL_ONLY",
  dependencyFiles: ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"],
  dependencyRemediation: {
    purpose: "FOUR_APPROVED_ADVISORY_FINDINGS_LOCAL_ONLY",
    baselineHigh: 2,
    baselineModerate: 2,
    fixes: [
      {
        package: "sharp",
        from: "0.35.2",
        to: "0.35.4",
        advisory: "GHSA-rgj7-g3m4-5g8c",
        severity: "high",
      },
      {
        package: "js-yaml",
        from: "4.3.1",
        to: "4.3.2",
        advisory: "GHSA-2883-xcg3-v3hh",
        severity: "high",
      },
      {
        package: "vitest",
        from: "4.1.10",
        to: "4.1.11",
        advisory: "GHSA-82fw-gwwq-j7x9",
        severity: "moderate",
      },
      {
        package: "@vitest/mocker",
        from: "4.1.10",
        to: "4.1.11",
        advisory: "GHSA-82fw-gwwq-j7x9",
        severity: "moderate",
      },
    ],
    sharpOverride: {
      "miniflare@5.20260811.0-alpha>sharp": "0.35.4",
    },
    jsYamlOverride: {
      "@eslint/eslintrc@3.3.6>js-yaml": "4.3.2",
    },
    allowedTransitiveChanges:
      "MATCHING_VITEST_INTERNALS_SHARP_NATIVE_AND_EXISTING_AFFECTED_CHAINS_ONLY",
    majorUpgrade: false,
    peerConflict: false,
    newDirectDependency: false,
    registryChange: false,
    packagePatchOrFork: false,
    force: false,
    broadUpgrade: false,
    auditSuppression: false,
    workspaceOrBuildPolicyChange: false,
    toolchainChange: false,
    residualScopedAdvisory: "STOP_FOR_OWNER_DECISION",
    verification:
      "FULL_TESTS_REAL_WORKER_SQLITE_SHARP_NATIVE_FROZEN_EMPTY_STORE_REPRODUCIBLE_ARTIFACT",
    deploymentAuthorization: false,
  },
  maximumHandoffCloses: 0,
  continuation: "ONE_IMMUTABLE_V16_CONTINUATION_NO_REOPEN_OR_ACCOUNTING_RESET",
  baselineEvents: 6,
  baselineAttempts: 6,
  baselineConsumedMicroUsd: 34082,
  baselineReservedMicroUsd: 0,
  baselineInFlight: 0,
  baselineStopReason: "OPERATOR_STOP",
  originalActivationMarkerImmutable: true,
  precedenceContract: {
    mandatoryBeforeDraftAndAi: true,
    mixedStaffRedemption:
      "EXISTING_EXPLICIT_STAFF_REDEMPTION_PREEMPTS_PREORDER_NO_NEW_KEYWORD_OR_DRAFT_MUTATION",
    unresolvedLegacyReasons: [
      "NO_AUTHORITATIVE_ANSWER",
      "AMBIGUOUS_CUSTOMER_TEXT",
    ],
    unknownHandoffReasons: "MANDATORY_FAIL_CLOSED",
    advanceOrder: "DETERMINISTIC_CONSENT_DRAFT_NO_PROVIDER",
    activeDraftRisk: "PREEMPT_WITHOUT_DRAFT_OR_HISTORY_MUTATION",
    f1F2: "PRESERVE_APPROVED_CATALOG_CLARIFY_AUTO_AI_ON_AND_OFF",
    handoffBooleanAloneIsSecurityPredicate: false,
  },
  deliveryContract: {
    canonicalIdentity: "VERIFIED_WEBHOOK_EVENT_ID_NOT_REPLY_TOKEN",
    claim: "ATOMIC_PERSISTENT_EVENT_OWNER_AND_REVISION_FENCE",
    acknowledgement: "REQUIRED_EXACT_CLAIM_NO_OPTIONAL_OR_COMPATIBILITY_TOKEN",
    indexIntegration:
      "REAL_CLAIM_PRE_SEND_OWNER_EVENT_REVISION_AND_SAME_DISPATCH_ACK_NO_DRAFT_LIFECYCLE_CHANGE",
    duplicate: "NO_NEW_OUTBOUND_OWNERSHIP_OR_PROVIDER_ACCOUNTING",
    uncertainOutcome: "RETAIN_CLAIM_NO_AUTOMATIC_RETRY_REASSIGN_OR_REFUND",
    non2xx: "NO_AUTOMATIC_RETRY",
    restartOrExpiry: "NEVER_RELEASE_OR_REOPEN_CLAIM",
    noMessage: "NO_DELIVERY_CLAIM",
    recovery: "SEPARATE_AUDITED_OPERATOR_APPROVAL_REQUIRED",
    externalExactlyOnce: false,
    preserveV17PrecedenceDraftHistoryAndAccounting: true,
    durableStateTests:
      "REAL_PROCESS_EVENT_TOKENS_FENCED_ACK_DUPLICATE_SUPPRESSION_PRESERVE_HANDOFF_POLICY",
    newRuntimeFiles: false,
    deploymentAuthorization: false,
  },
} as const;

export function validateWp8fOwnerDecisionRecord(
  record: unknown,
  version = "2026.09.09-v19",
): boolean {
  if (typeof record !== "string") return false;
  if (version === WP8F_V23_ADDENDUM.version) {
    const current = record
      .split("## MP-OD-2026-09-11-V23 —")[1]
      ?.split("\n## ")[0];
    return (
      typeof current === "string" &&
      validateWp8fOwnerDecisionRecord(record, WP8F_V22_AUTHORIZATION.version) &&
      [
        WP8F_V23_ADDENDUM.commit,
        WP8F_V23_ADDENDUM.path,
        WP8F_V23_ADDENDUM.candidateFileSha256,
        WP8F_V23_ADDENDUM.instrumentedFileSha256,
        WP8F_V23_ADDENDUM.pathDiffSha256,
        "supersedes 2026.09.10-v22",
        "no mint/reset/reissue grants",
        "complete candidate-to-HEAD inventory",
        "Production NO_GO — NOT TOUCHED",
      ].every((value) => current.includes(value))
    );
  }
  if (version === WP8F_V22_AUTHORIZATION.version) {
    const current = record
      .split("## MP-OD-2026-09-10-V22 —")[1]
      ?.split("\n## ")[0];
    return (
      typeof current === "string" &&
      validateWp8fOwnerDecisionRecord(record, WP8F_V21_COMPLETION.version) &&
      [
        WP8F_V22_AUTHORIZATION.sourceCommit,
        WP8F_V22_AUTHORIZATION.artifactSha256,
        "supersedes 2026.09.10-v21",
        "independent one-use deployment and successor activation grants",
        WP8F_V22_AUTHORIZATION.activation.operation,
        "primary AI-ON U1 remains GAP",
        "A1–A3 remain UNRESOLVED / AUDIT_RETENTION_RECONCILIATION_GAP",
        "No handoff-close, reset, rollback, PR, merge or Issue closure",
        "Production NO_GO — NOT TOUCHED",
      ].every((value) => current.includes(value))
    );
  }
  if (version === WP8F_V21_COMPLETION.version) {
    const current = record
      .split("## MP-OD-2026-09-10-V21 —")[1]
      ?.split("\n## ")[0];
    return (
      typeof current === "string" &&
      validateWp8fOwnerDecisionRecord(record) &&
      [
        WP8F_V21_COMPLETION.sourceCommit,
        WP8F_V21_COMPLETION.artifactSha256,
        "supersedes 2026.09.09-v19",
        "v20 APPROVED_BUT_NOT_MATERIALIZED",
        "5611740903",
        "5611756729",
        "5611740789",
        "5611756596",
        "one logical handoff-close / maximum3 technical attempts / maximum1 mutation",
        "No cross-Durable-Object atomicity",
        "Production NO_GO — NOT TOUCHED",
        "merge and Issue #12 closure only after all TEST and integration gates",
      ].every((value) => current.includes(value))
    );
  }
  if (version !== "2026.09.09-v19") return false;
  const section = record
    .split("## MP-OD-2026-09-09-V18 —")[1]
    ?.split("\n## ")[0];
  const current = record
    .split("## MP-OD-2026-09-09-V19 —")[1]
    ?.split("\n## ")[0];
  return (
    typeof current === "string" &&
    current.includes(
      "Owner explicitly approves the ten-path v19 control transition and preparation only",
    ) &&
    current.includes("supersedes 2026.09.09-v18") &&
    current.includes(WP8F_V19_PREPARATION.baseline) &&
    current.includes(WP8F_V19_PREPARATION.integrationEvent.mergeCommit) &&
    current.includes("INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW") &&
    current.includes(WP8F_V19_PREPARATION.sourceCommit) &&
    current.includes(WP8F_V19_PREPARATION.artifactSha256) &&
    current.includes("APPROVED_UNUSED, operations used0/maximum1") &&
    current.includes("STOP_BEFORE_FIRST_REMOTE_MUTATION") &&
    current.includes(
      "ambiguous remote outcome consumes the single operation",
    ) &&
    current.includes("Production NO_GO — NOT TOUCHED") &&
    typeof section === "string" &&
    section.includes(WP8F_V18_ENVELOPE.baseline) &&
    section.includes("worker/durable-objects.ts") &&
    section.includes("superseding v17") &&
    section.includes("worker-tests/durable-state.test.ts") &&
    section.includes(
      "Owner approved the four-advisory dependency remediation and existing mixed staff/redemption precedence only",
    ) &&
    section.includes("pnpm-workspace.yaml") &&
    section.includes(
      "No deploy, session, remote recovery, rollback or PR in v18",
    ) &&
    section.includes(
      "Owner explicitly approved v18 local atomic delivery ownership and fenced acknowledgement",
    )
  );
}

function validateWp8fEnvelope(errors: string[], input: unknown): void {
  if (!isRecord(input)) {
    errors.push("WP8F_V18_ENVELOPE_MISSING");
    return;
  }
  if (Object.keys(input).length !== Object.keys(WP8F_V18_ENVELOPE).length)
    errors.push("WP8F_V18_ENVELOPE_FIELDS_INVALID");
  for (const [key, value] of Object.entries(WP8F_V18_ENVELOPE)) {
    if (JSON.stringify(input[key]) !== JSON.stringify(value))
      errors.push(`WP8F_V18_${key.toUpperCase()}_INVALID`);
  }
}

/** Exact repository-relative paths only. No normalization of traversal, glob or aliases. */
export function evaluateWp8fPaths(
  roadmap: unknown,
  currentWork: unknown,
  phase: string,
  paths: unknown,
): ProjectActionDecision {
  if (validateProjectControl(roadmap, currentWork).errors.length)
    return { allowed: false, reason: "ROADMAP_UNVERIFIED" };
  const allowed =
    phase === "CONTROL_TRANSITION"
      ? WP8F_V18_ENVELOPE.controlFiles
      : phase === "EVIDENCE"
        ? isRecord(roadmap) &&
          (roadmap.version === WP8F_V22_AUTHORIZATION.version ||
            roadmap.version === WP8F_V23_ADDENDUM.version)
          ? WP8F_V22_AUTHORIZATION.evidenceFiles
          : isRecord(roadmap) && roadmap.version === WP8F_V21_COMPLETION.version
            ? WP8F_V21_COMPLETION.evidenceFiles
            : WP8F_V19_PREPARATION.evidenceFiles
        : [];
  return exactPaths(paths, allowed)
    ? { allowed: true, reason: "EXACT_OWNER_APPROVED_PATHS" }
    : { allowed: false, reason: "UNKNOWN_OR_OUT_OF_SCOPE_PATH" };
}

function exactPaths(paths: unknown, allowed: readonly string[]): boolean {
  return (
    Array.isArray(paths) &&
    paths.length > 0 &&
    new Set(paths).size === paths.length &&
    paths.every(
      (path: unknown) => typeof path === "string" && allowed.includes(path),
    )
  );
}

function isFullSha(value: unknown, length: number): value is string {
  return (
    typeof value === "string" &&
    value.length === length &&
    /^[a-f0-9]+$/u.test(value) &&
    !/^0+$/u.test(value)
  );
}

/**
 * These inputs are independently collected operator evidence, never authorization
 * flags from current-work. This pure decision does not perform remote verification,
 * sign evidence, invoke Wrangler or grant Production rights.
 */
function wp8fCandidateGate(
  target: { worker: string; sourceCommit: string; artifactSha256: string },
  evidence: unknown,
): boolean {
  if (
    !isRecord(evidence) ||
    !isRecord(evidence.candidate) ||
    !isRecord(evidence.test)
  )
    return false;
  const candidate = evidence.candidate,
    test = evidence.test;
  const fresh =
    typeof test.observedAt === "number" &&
    Number.isSafeInteger(test.observedAt) &&
    test.observedAt <= Date.now() &&
    Date.now() - test.observedAt <= 120_000;
  return (
    candidate.baseline === WP8F_V18_ENVELOPE.baseline &&
    candidate.ownerDecision === WP8F_V18_ENVELOPE.ownerDecision &&
    candidate.precedenceTestsPassed === true &&
    candidate.continuationStorageTestsPassed === true &&
    candidate.rollbackAdditiveCompatibilityPassed === true &&
    candidate.sourceCommit === target.sourceCommit &&
    candidate.sourceCommit !== WP8F_V18_ENVELOPE.baseline &&
    candidate.sourceCommit !== WP8F_V18_ENVELOPE.rollbackSource &&
    candidate.baselineAncestryVerified === true &&
    isFullSha(candidate.controlCommit, 40) &&
    candidate.controlCommit !== candidate.baseline &&
    candidate.controlCommit !== candidate.sourceCommit &&
    candidate.controlParentCommit === WP8F_V18_ENVELOPE.baseline &&
    candidate.controlOwnerDecision === WP8F_V18_ENVELOPE.ownerDecision &&
    candidate.controlAncestryVerified === true &&
    candidate.validatedSourceCommit === target.sourceCommit &&
    candidate.pushedSourceCommit === target.sourceCommit &&
    candidate.artifactSha256 === target.artifactSha256 &&
    candidate.reproducedArtifactSha256 === target.artifactSha256 &&
    candidate.committed === true &&
    candidate.cleanCheckoutPassed === true &&
    candidate.validationPassed === true &&
    candidate.exactDiffReviewed === true &&
    exactPaths(candidate.executablePaths, WP8F_V18_ENVELOPE.remediationFiles) &&
    test.worker === WP8F_V18_ENVELOPE.worker &&
    test.version === WP8F_V18_ENVELOPE.followUpVersion &&
    test.sourceCommit === WP8F_V18_ENVELOPE.followUpSource &&
    test.artifactSha256 === WP8F_V18_ENVELOPE.followUpArtifact &&
    test.accountIdentity === "c395…407d" &&
    test.environment === "TEST_ONLY" &&
    test.accountIdentityVerified === true &&
    test.sourceArtifactVerified === true &&
    test.secretsPresenceVerified === true &&
    test.rollbackTargetVerified === true &&
    test.accountingPreserved === true &&
    test.events === 6 &&
    test.attempts === 6 &&
    test.consumedMicroUsd === 34082 &&
    test.pendingAttempts === 0 &&
    test.stopReason === "OPERATOR_STOP" &&
    test.pilot === "STOPPED" &&
    test.aiAdmission === false &&
    test.reservedMicroUsd === 0 &&
    test.inFlight === 0 &&
    fresh
  );
}

function wp8fReviewGate(evidence: unknown): boolean {
  if (!isRecord(evidence) || !isRecord(evidence.review)) return false;
  const review = evidence.review;
  return (
    review.ownerDecision === WP8F_V18_ENVELOPE.ownerDecision &&
    isFullSha(review.sourceCommit, 40) &&
    review.reviewedSourceCommit === review.sourceCommit &&
    review.testAcceptedSourceCommit === review.sourceCommit &&
    review.integrationCheckedSourceCommit === review.sourceCommit &&
    review.issueState === "OPEN" &&
    review.targetEnvironment === "TEST_ONLY" &&
    review.diagnostics === "PASS" &&
    review.ownerUat === "PASS" &&
    review.killSwitch === "PASS" &&
    review.rollback === "PASS" &&
    review.security === "PASS" &&
    review.integrationChecks === "PASS" &&
    review.criticalFindings === 0 &&
    review.aiAdmission === false &&
    review.pilot === "STOPPED"
  );
}

// The v18 envelope above is frozen history. It cannot grant current file writes
// or deployment. This separate record never enables a remote-mutating action.
const WP8F_V19_PREPARATION = {
  ownerDecision: "MP-OD-2026-09-09-V19",
  supersedes: "2026.09.09-v18",
  baseline: "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f",
  previousEvidenceBaseline: "42026b22069e4299dfc8ff5f73b5077e3b0856fb",
  integrationEvent: {
    pullRequest: 14,
    status: "INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW",
    performedBy: "OWNER",
    headCommit: "ca4904ef3f316f8e381e57e4757f3fe173dbeb1f",
    defaultBranch: "codex/phase-1a-foundation",
    mergeCommit: "aad8c5e0ef41c5e47df3d93ae462b9122368c15d",
    mergedAt: "2026-09-09T02:40:20Z",
    includesFullBranchHistory: true,
    finalSecurityReleaseReviewPassed: false,
    testAcceptancePassed: false,
    productionAcceptancePassed: false,
    deploymentOccurredByIntegration: false,
    additionalPrOrMergeAuthorized: false,
  },
  originalRuntimeControl: "64d598183ea55c3b79e3f27aa9f9992bc318ac27",
  sourceCommit: "c59eb5e12bb96a34da38759a5585be67d8c2ab6e",
  artifactSha256:
    "2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308",
  artifactFile: "index.js",
  worker: "malispang-lineoa-test",
  environment: "TEST_ONLY",
  domain: "malispang-lineoa-test.eakkachai-dev.workers.dev",
  historicalEnvelope: "V18_READ_ONLY_NOT_CURRENT_WRITE_AUTHORITY",
  status: "APPROVED_UNUSED",
  operationsUsed: 0,
  maximumOperations: 1,
  remoteMutationPermittedThisRound: false,
  firstRemoteMutation: "UPLOAD_OR_CREATE_VERSION_OR_CHANGE_TRAFFIC",
  executionGate: "FRESH_GATES_AND_NEW_OWNER_EXECUTE_CONFIRMATION",
  ambiguousOutcome: "CONSUME_OPERATION_NO_RETRY_OR_REISSUE",
  counterResetPermitted: false,
  automaticRollback: false,
  containment: "INDEPENDENT_FAIL_CLOSED_FIX_FORWARD_NOT_OLD_UNFENCED_RUNTIME",
  freshObservationMaximumAgeMs: 120000,
  missingEvidence: "DENY_NOT_UNKNOWN_AS_ZERO",
  requiredFullCandidateTests: 733,
  requiredAuditFindingsAllLevels: 0,
  runtimeDependencyChanges: false,
  sessionUatLineRecoveryRollbackPr: false,
  productionQueryOrMutation: false,
  issueClosure: false,
  merge: false,
  evidenceFiles: [
    "docs/project/EXECUTION_GATES.md",
    "docs/project/ROADMAP_CHANGELOG.md",
  ],
  requiredFailureCases: [
    "BEFORE_REMOTE_MUTATION",
    "REMOTE_MUTATION_REJECTED",
    "REMOTE_OUTCOME_UNKNOWN",
    "VERSION_CREATED_TRAFFIC_UNCHANGED",
    "TRAFFIC_CHANGED_VERIFICATION_FAILED",
    "SCHEMA_MIGRATION_FAILED",
    "UNEXPECTED_EVENT_DURING_DEPLOYMENT",
  ],
} as const;

function validateWp8fExactDeploymentPreparation(
  errors: string[],
  input: unknown,
): void {
  if (!isRecord(input)) {
    errors.push("V19_PREPARATION_MISSING");
    return;
  }
  if (Object.keys(input).length !== Object.keys(WP8F_V19_PREPARATION).length)
    errors.push("V19_PREPARATION_FIELDS_INVALID");
  for (const [key, value] of Object.entries(WP8F_V19_PREPARATION))
    if (JSON.stringify(input[key]) !== JSON.stringify(value))
      errors.push(`V19_${key.toUpperCase()}_INVALID`);
}

/** Pure read-only readiness evaluation, not a signed attestation or execution lock.
 * Callers must independently collect evidence; never synthesize it from manifests.
 * APPROVED_UNUSED alone never permits upload, version creation, or traffic changes.
 */
function wp8fV19ReadinessGate(
  target: { worker: string; sourceCommit: string; artifactSha256: string },
  evidence: unknown,
): boolean {
  const grant = WP8F_V19_PREPARATION;
  if (
    target.worker !== grant.worker ||
    target.sourceCommit !== grant.sourceCommit ||
    target.artifactSha256 !== grant.artifactSha256 ||
    !isRecord(evidence) ||
    evidence.provenance !== "INDEPENDENT_OPERATOR_VERIFICATION" ||
    !isRecord(evidence.candidate) ||
    !isRecord(evidence.test) ||
    !isRecord(evidence.containment) ||
    !isRecord(evidence.operation)
  )
    return false;
  const { candidate, test, containment, operation } = evidence;
  const now = Date.now();
  const fresh =
    typeof test.observedAt === "number" &&
    Number.isSafeInteger(test.observedAt) &&
    test.observedAt <= now &&
    now - test.observedAt <= grant.freshObservationMaximumAgeMs;
  const historicalPaths = [
    ...WP8F_V18_ENVELOPE.controlFiles,
    "worker/index.ts",
    "worker/mp-06-wp1.ts",
    "worker/durable-objects.ts",
    "worker-tests/mp-06-pilot-control.test.ts",
    "worker-tests/durable-state.test.ts",
    "tests/mp-06-wp1.test.ts",
    ...WP8F_V18_ENVELOPE.dependencyFiles,
    ...WP8F_V18_ENVELOPE.evidenceFiles,
  ];
  return (
    candidate.sourceCommit === grant.sourceCommit &&
    candidate.originalControlCommit === grant.originalRuntimeControl &&
    candidate.evidenceBaseline === grant.baseline &&
    candidate.previousEvidenceBaseline === grant.previousEvidenceBaseline &&
    candidate.readmeOnlyAdvanceVerified === true &&
    candidate.ownerIntegrationVerified === true &&
    candidate.integrationMergeCommit === grant.integrationEvent.mergeCommit &&
    candidate.integrationIncludesCandidateHistory === true &&
    candidate.integrationIsReleaseAcceptance === false &&
    candidate.originalControlIsCandidateAncestor === true &&
    candidate.candidateIsV19ControlAncestor === true &&
    isFullSha(candidate.v19ControlCommit, 40) &&
    candidate.v19ControlCommit !== grant.sourceCommit &&
    candidate.v19ControlCommit !== grant.originalRuntimeControl &&
    candidate.v19ControlCommit !== grant.baseline &&
    // The earlier evidence commit is also forbidden as a new v19 control SHA.
    candidate.v19ControlCommit !== grant.previousEvidenceBaseline &&
    candidate.v19ControlParent === grant.baseline &&
    candidate.v19OwnerDecision === grant.ownerDecision &&
    candidate.committedPushedAndClean === true &&
    candidate.v19ControlGatesPassed === true &&
    candidate.exactDiffReviewed === true &&
    exactPaths(candidate.postCandidatePaths, [
      ...WP8F_V18_ENVELOPE.controlFiles,
      ...WP8F_V18_ENVELOPE.evidenceFiles,
      "README.md",
    ]) &&
    candidate.noDeployAffectingChangesAfterCandidate === true &&
    Array.isArray(candidate.originalChangedPaths) &&
    candidate.originalChangedPaths.length === 20 &&
    exactPaths(candidate.originalChangedPaths, historicalPaths) &&
    candidate.cleanFrozenCheckout === true &&
    candidate.nodeVersion === "24.19.0" &&
    candidate.pnpmVersion === "11.19.0" &&
    candidate.reproducedArtifactSha256 === grant.artifactSha256 &&
    candidate.testsPassed === 733 &&
    candidate.testsFailed === 0 &&
    candidate.testsSkipped === 0 &&
    candidate.testsCancelled === 0 &&
    candidate.auditAllLevelsZero === true &&
    candidate.protectedChecksumsUnchanged === true &&
    test.worker === grant.worker &&
    test.environment === grant.environment &&
    test.accountIdentity === "c395…407d" &&
    test.accountIdentityVerified === true &&
    test.version === WP8F_V18_ENVELOPE.followUpVersion &&
    test.sourceCommit === WP8F_V18_ENVELOPE.followUpSource &&
    test.artifactSha256 === WP8F_V18_ENVELOPE.followUpArtifact &&
    test.sourceArtifactAssociationVerified === true &&
    test.trafficPercent === 100 &&
    test.bindingsSecretsAndConfigurationVerified === true &&
    test.pilot === "STOPPED" &&
    test.aiAdmission === false &&
    test.events === 6 &&
    test.attempts === 6 &&
    test.consumedMicroUsd === 34082 &&
    test.reservedMicroUsd === 0 &&
    test.inFlight === 0 &&
    test.pendingAttempts === 0 &&
    test.conservativeMicroUsd === 25864 &&
    test.reportedUsageMicroUsd === 8218 &&
    test.usageUnknownAttempts === 2 &&
    test.settledAttempts === 4 &&
    test.independentlyVerifiedBilling === "UNKNOWN" &&
    test.ownerIdentityVerified === true &&
    test.ownerMode === "HUMAN_HANDOFF" &&
    test.clarificationUsed === false &&
    test.pendingTemplate === null &&
    test.pendingReplies === 0 &&
    test.draftState === "EXPIRED_PURGED" &&
    test.draftPurgeInvariantsVerified === true &&
    test.draftPendingReplies === 0 &&
    test.pendingDeliveryClaims === 0 &&
    test.deliveryInventoryVerified === true &&
    test.schemaObservationVerified === true &&
    isFullSha(test.schemaSnapshotSha256, 64) &&
    fresh &&
    operation.status === "APPROVED_UNUSED" &&
    operation.used === 0 &&
    operation.maximum === 1 &&
    operation.remoteOutcome === "NOT_STARTED" &&
    operation.verifiedAt === test.observedAt &&
    containment.independentOfOldRuntime === true &&
    containment.ownerNoLine === true &&
    containment.noProviderPath === true &&
    containment.additiveIdempotentSchemaVerified === true &&
    containment.preservesLedgerHistoryConversation === true &&
    containment.unexpectedEventProcedureVerified === true &&
    containment.failClosedFixForward === true &&
    containment.automaticRollback === false &&
    containment.newAuthorityBoundariesRecorded === true &&
    Array.isArray(containment.failureCases) &&
    containment.failureCases.length === 7 &&
    exactPaths(containment.failureCases, grant.requiredFailureCases)
  );
}

// Successor authorization is a closed Owner record, not a generic capability flag.
// The v18/v19 records above remain frozen historical evidence.
const WP8F_V21_COMPLETION = {
  version: "2026.09.10-v21",
  ownerDecision: "MP-OD-2026-09-10-V21",
  supersedes: "2026.09.09-v19",
  v20: "APPROVED_BUT_NOT_MATERIALIZED_NOT_REUSABLE_DEPLOYMENT_GRANT",
  authority: {
    issue12Comments: [5611740903, 5611756729],
    roadmap9Comments: [5611740789, 5611756596],
  },
  executionBaseline: "47934a41aeebea9cf17a1cf3d3b98819179b4b97",
  sourceCommit: "bfff1a553868b85e5f66144e4741a51627f4a9be",
  artifactSha256:
    "8eabcc6a1628bfa776fa5768db49e2faa586ceaaaa6915510afec74835f2d2b5",
  artifactFile: "index.js",
  candidateCiRun: 34436364217,
  candidateTestsPassed: 767,
  account: "c395a1bc15b7c95267173de5ccd6407d",
  worker: "malispang-lineoa-test",
  environment: "TEST_ONLY",
  domain: "malispang-lineoa-test.eakkachai-dev.workers.dev",
  predecessorVersion: "8486019d-9b62-4de9-ae15-6299909a23d9",
  predecessorSource: "8a5b6547b4713ff50ad6b08ee58682e129641b6a",
  predecessorArtifact:
    "15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64",
  maximumDeployments: 1,
  ambiguousDeploymentOutcome: "CONSUMED_NO_RETRY",
  maximumLogicalHandoffCloses: 1,
  maximumHandoffTechnicalAttempts: 3,
  maximumHandoffMutations: 1,
  handoffContract:
    "DURABLE_SAME_RESULT_RECEIPT_GENERATION_FENCE_IDEMPOTENT_REGISTRY_RECONCILIATION_NOT_CROSS_DO_ATOMIC",
  maximumContinuations: 1,
  maximumSessionMinutes: 60,
  cumulativeCostMicroUsd: 5000000,
  cumulativeEvents: 200,
  cumulativeProviderAttempts: 200,
  maximumConcurrency: 1,
  ownerUat:
    "ONE_MESSAGE_AT_A_TIME_HUMAN_HANDOFF_LAST_BACKEND_AND_VISIBLE_EVIDENCE",
  finalContainment:
    "AI_OFF_PILOT_STOPPED_RESERVED_INFLIGHT_PENDING_ZERO_NO_LATE_REPLY",
  recovery:
    "FENCED_SCHEMA_COMPATIBLE_FAIL_CLOSED_NO_OLD_UNFENCED_AUTOMATIC_ROLLBACK",
  review:
    "TEST_UAT_KILL_SWITCH_RECOVERY_HOSTED_CI_SECURITY_THEN_REMEDIATION_PR",
  mergeAndIssueClosure:
    "ONLY_AFTER_VERIFIED_TEST_ACCEPTANCE_REVIEW_CHECKS_AND_INTEGRATION",
  production: "NO_GO_NOT_TOUCHED_MP12_ISSUE5_SEPARATE",
  nextWork: "MP07_BLOCKED_NO_AUTOMATIC_START",
  runtimeFrozen: true,
  modelPromptPolicyBudgetAccountingAndCustomerDataChanges: false,
  checkpointPolicy:
    "EXPLICIT_PATHS_COMMIT_PUSH_AND_ISSUE12_RECEIPT_NO_RESET_STASH_REBASE_AMEND_SQUASH_FORCE",
  freshObservationMaximumAgeMs: 120000,
  evidenceFiles: [
    "docs/project/EXECUTION_GATES.md",
    "docs/project/ROADMAP_CHANGELOG.md",
    "docs/project/OWNER_DECISION_LOG.md",
    "docs/line-oa/mp-06/MP_06_WP8F_TEST_ACCEPTANCE_TH.md",
    "docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md",
  ],
} as const;
const WP8F_V21_SCOPE = [
  "MP_06_WP8F_TEST_ACCEPTANCE_AND_INTEGRATION_ONLY",
  "EXACT_V21_SUCCESSOR_CONTROL",
  "EXACT_FROZEN_SUCCESSOR_TEST_DEPLOYMENT_ONCE",
  "AUTHENTICATED_EXACT_TEST_READ_ONLY_OBSERVATION",
  "OWNER_SCOPED_DURABLE_HANDOFF_CLOSE_ONE_LOGICAL_THREE_TECHNICAL_ATTEMPTS",
  "ONE_ATOMIC_CONTINUATION_AND_OWNER_MOBILE_UAT",
  "KILL_SWITCH_AND_FENCED_RECOVERY_VERIFICATION",
  "FINAL_SECURITY_REVIEW_HOSTED_CI_AND_CONDITIONAL_REMEDIATION_INTEGRATION",
  "ISSUE12_CLOSURE_ONLY_AFTER_ALL_TEST_AND_INTEGRATION_GATES",
  "RUNTIME_DEPENDENCIES_MODEL_PROMPT_POLICY_CATALOG_CHECKSUMS_READ_ONLY",
  "COMMIT_PUSH_EVERY_CHECKPOINT_AND_APPEND_ISSUE12",
  "PRODUCTION_NO_GO_MP12_SEPARATE",
] as const;
const WP8F_V21_RETIRED_PROHIBITIONS: readonly string[] = [
  "MERGE_DEFAULT_BRANCH",
  "CREATE_READY_PULL_REQUEST",
  "CHANGE_DEFAULT_BRANCH",
  "RESOLVE_DEFAULT_BRANCH_DRIFT",
  "CLOSE_MP_06_ISSUE",
];
const WP8F_V21_FORBIDDEN = [
  "CREATE_PR_BEFORE_TEST_ACCEPTANCE_AND_FINAL_REVIEW",
  ...REQUIRED_FORBIDDEN_SCOPE.filter(
    (value) => !WP8F_V21_RETIRED_PROHIBITIONS.includes(value),
  ),
  ...[
    "MERGE_OR_CLOSE_BEFORE_ALL_TEST_REVIEW_CI_INTEGRATION_GATES",
    "CHANGE_FROZEN_SUCCESSOR_RUNTIME_OR_DEPENDENCIES",
    "RESET_OR_REWRITE_OPERATION_JOURNAL",
    "SECOND_LOGICAL_HANDOFF_CLOSE_OR_REPLACEMENT_SESSION",
  ],
];
const WP8F_V21_AUTHORIZATION = {
  localImplementation: false,
  runtimeWp1: false,
  benchmarkWp2: false,
  runtimeRemediationWp3: false,
  benchmarkCompletionWp4: false,
  localClosureRemediationWp5: false,
  testReadinessAssessmentWp6: false,
  testReadinessConditionClosureWp6: false,
  testReadinessConditionsClosedWp6: true,
  aiNluImplementationWp7: false,
  aiNluLocalAcceptanceCompleteWp7: true,
  runtimePilotControlRemediationWp8a: false,
  runtimePilotControlsCompleteWp8a: true,
  testDeploymentSmokeRollbackWp8: false,
  providerAttemptSettlementRemediationWp8b: false,
  providerReconciliationControlledRetestWp8c: false,
  durableLifecycleDiagnosticsRemediationWp8d: false,
  exactStateReconciliationControlledRetestWp8e: false,
  policySnapshot: false,
  policySnapshotReadOnly: true,
  commit: true,
  pushBranch: true,
  githubRoadmapUpdate: true,
  testDeploymentAuthorization: true,
  testDeploymentOccurred: true,
  testDeployment: false,
  production: false,
  testAcceptanceCompletionWp8f: true,
  testDeploymentPreparationWp8f: true,
} as const;
const WP8F_V21_WORK_KEYS = [
  "$schema",
  "schemaVersion",
  "roadmapId",
  "roadmapVersion",
  "workId",
  "githubIssue",
  "currentPhase",
  "status",
  "base",
  "implementationBranch",
  "targetEnvironment",
  "authorizedWorkPackage",
  "allowedScope",
  "forbiddenScope",
  "authorization",
  "wp8fExactDeploymentPreparation",
  "wp8fExecutionEnvelope",
  "wp8fApprovedDeployment",
  "policySnapshotReference",
  "wp2BenchmarkReference",
  "benchmarkCompletionPlan",
  "localClosureRemediationPlan",
  "localDeterministicAcceptance",
  "testReadinessAssessmentPlan",
  "wp8TestPilotPlan",
  "wp8bProviderAttemptSettlementPlan",
  "wp8cProviderReconciliationControlledRetestPlan",
  "wp8dDurableLifecycleDiagnosticsPlan",
  "wp8eExactStateReconciliationControlledRetestPlan",
  "testReadinessConditionClosurePlan",
  "wp7AiNluPlan",
  "wp8aRuntimePilotControlPlan",
  "benchmarkAcceptanceCriteria",
  "nextWork",
  "conflicts",
  "workingTreePolicy",
  "failureMode",
  "wp8fTestAcceptancePlan",
  "wp8fSuccessorCompletion",
  "wp8fSuccessorOperationJournal",
] as const;
const WP8F_V21_JOURNAL_SCHEMA = {
  type: "array",
  maxItems: 5,
  items: {
    type: "object",
    additionalProperties: false,
    required: [
      "action",
      "operationRef",
      "attempt",
      "startedAt",
      "evidenceSha256",
    ],
    properties: {
      action: {
        enum: ["DEPLOY_TEST", "CLOSE_OWNER_HANDOFF", "OPEN_CONTINUATION"],
      },
      operationRef: {
        type: "string",
        pattern:
          "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      },
      attempt: {
        type: "integer",
        minimum: 1,
        maximum: 3,
      },
      startedAt: {
        type: "string",
        format: "date-time",
      },
      evidenceSha256: {
        type: "string",
        pattern: "^[0-9a-f]{64}$",
      },
    },
  },
} as const;

/** Closed Owner authorization; not runtime configuration or a self-issued capability. */
const WP8F_V22_AUTHORIZATION = {
  version: "2026.09.10-v22",
  ownerDecision: "MP-OD-2026-09-10-V22",
  supersedes: "2026.09.10-v21",
  executionBaseline: "7faf727e36d13f5f83be4c904522ef0fa494ce1b",
  previousControl: "44da479f133e96cbcd9290a7a77e337270780bb7",
  sourceCommit: "1790da58635edcee154b60d76730248e8130c2d3",
  artifactSha256:
    "adc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657",
  artifactFile: "index.js",
  artifactBytes: 252715,
  candidateCiRun: 34478262489,
  candidateTestsPassed: 842,
  account: "c395a1bc15b7c95267173de5ccd6407d",
  worker: "malispang-lineoa-test",
  environment: "TEST_ONLY",
  oa: "มะลิปัง TEST",
  domain: "malispang-lineoa-test.eakkachai-dev.workers.dev",
  predecessorVersion: "e72862e2-e538-47ee-93ea-7efcf719188b",
  predecessorSource: "bfff1a553868b85e5f66144e4741a51627f4a9be",
  predecessorArtifact:
    "8eabcc6a1628bfa776fa5768db49e2faa586ceaaaa6915510afec74835f2d2b5",
  deployment: {
    maximumOperations: 1,
    operation: "39c5d097-72e9-4658-b087-a5545626060d",
    statusAtTransition: "APPROVED_UNUSED",
    usage: "DERIVED_FROM_APPEND_ONLY_V22_JOURNAL",
    outcomeUnknownOrRejected: "CONSUMED_NO_RETRY",
  },
  activation: {
    maximumOperations: 1,
    operation: "e7dbdaa5-01aa-454c-b8c9-e1838594662e",
    statusAtTransition: "APPROVED_UNUSED",
    usage: "DERIVED_FROM_APPEND_ONLY_V22_JOURNAL",
    method: "POST",
    path: "/admin/mp06-pilot/continue-acceptance-v22",
    body: {
      expectedSessionRef:
        "0af18b7d44468ca89d3d6a762892bda6cb812e6c2c7c41178bbd43b38bec7a8c",
      operationRef:
        "e26e1a51fc1f55e7472e5aa33b0f740f4188ed3ed31a29d3a758d8862fdbb25a",
    },
    successorSession:
      "9fbc9737f1b4a2a3eeed3addb79105b6867f1e22bd34863881124d3cfcfb3603",
    outcomeUnknownOrRejected: "CONSUMED_READ_ONLY_RECONCILIATION_NO_RETRY",
    requiresPostDeploymentEvidencePushed: true,
    requiresOwnerAvailable: true,
  },
  maximumSessionMinutes: 60,
  ownerSilenceStopMinutes: 10,
  cumulativeCostMicroUsd: 5000000,
  cumulativeEvents: 200,
  cumulativeProviderAttempts: 200,
  maximumConcurrency: 1,
  freshObservationMaximumAgeMs: 120000,
  primaryU1: "GAP_DO_NOT_REPEAT_OR_RESET",
  historicalAuditA1A3:
    "UNRESOLVED_AUDIT_RETENTION_RECONCILIATION_GAP_OWNER_ACCEPTED_FOR_TEST_UAT_ONLY",
  historicalActualProviderBilling: "UNKNOWN",
  uatSequence: ["U2", "U3", "STOP", "U4"],
  handoffClose: false,
  rollback: false,
  pr: false,
  merge: false,
  issueClosure: false,
  productionQueryOrMutation: false,
  runtimeFrozen: true,
  accountingHistoryClarificationReset: false,
  containment:
    "STOP_FAIL_CLOSED_FIX_FORWARD_NO_AUTOMATIC_ROLLBACK_NO_GLOBAL_EGRESS_CLAIM",
  evidenceFiles: [
    "docs/project/EXECUTION_GATES.md",
    "docs/project/ROADMAP_CHANGELOG.md",
    "docs/project/OWNER_DECISION_LOG.md",
  ],
} as const;
const WP8F_V22_SCOPE = [
  "MP_06_WP8F_EXACT_V22_TEST_DEPLOYMENT_AND_SUCCESSOR_UAT_ONLY",
  "TEN_EXACT_CONTROL_PATHS_ONLY",
  "EXACT_FROZEN_V22_CANDIDATE_DEPLOYMENT_ONCE",
  "AUTHENTICATED_EXACT_TEST_READ_ONLY_OBSERVATION",
  "ONE_FIXED_SUCCESSOR_ACTIVATION_AFTER_POST_DEPLOY_AND_OWNER_AVAILABILITY",
  "U2_THEN_U3_THEN_STOP_THEN_U4_OWNER_MOBILE_ONLY",
  "PRESERVE_PRIMARY_U1_GAP_AND_A1_A3_UNRESOLVED",
  "PRESERVE_ACCOUNTING_HISTORY_CLAIMS_MARKERS_AND_USED_CLARIFICATION",
  "AUTHENTICATED_STOP_ON_FAILURE_OR_SILENCE",
  "COMMIT_PUSH_CHECKPOINTS_AND_APPEND_ISSUE9_ISSUE12",
  "RUNTIME_DEPENDENCIES_MODEL_PROMPT_POLICY_CATALOG_CHECKSUMS_READ_ONLY",
  "PRODUCTION_NO_GO_MP12_SEPARATE",
] as const;
const WP8F_V22_FORBIDDEN = [
  ...WP8F_V21_FORBIDDEN,
  ...WP8F_V21_RETIRED_PROHIBITIONS,
  "ALL_PR_MERGE_CLOSURE_IN_V22",
  "HANDOFF_CLOSE_RESET_ROLLBACK_IN_V22",
  "REPEAT_PRIMARY_U1_OR_PROMOTE_AUDIT_GAP",
  "RETRY_OR_REPLACE_V22_DEPLOYMENT_OR_ACTIVATION",
];
const WP8F_V22_WORK_KEYS = [
  ...WP8F_V21_WORK_KEYS,
  "wp8fV22Authorization",
  "wp8fV22OperationJournal",
];
const WP8F_V23_ADDENDUM = {
  version: "2026.09.11-v23",
  ownerDecision: "MP-OD-2026-09-11-V23",
  supersedes: "2026.09.10-v22",
  type: "SEALED_CONTROL_ONLY_ADDENDUM_INHERITING_V22",
  commit: "3fd4fdb184cda134f05c6effb22a7c4046094556",
  path: "worker-tests/mp-06-pilot-control.test.ts",
  candidateFileSha256:
    "4498bc3159bb496a76632f7f6908f1d9a71b4dd5b7fb594d3b863a76f5b615ae",
  instrumentedFileSha256:
    "dd3b6f206660d2bfab570086b088df069b9263d074cb1dce79ea6280a3166f6c",
  pathDiffSha256:
    "173978931b60cb1721c82bc4d1c3f2f238eeb0ba28cf278cf3cf3f9861bd0d88",
  additions: 53,
  removals: 0,
  purpose: "MONOTONIC_TIMING_ONLY_IN_TWO_OWNER_APPROVED_TESTS",
  grants: "INHERIT_EXISTING_V22_JOURNAL_NO_MINT_RESET_OR_REISSUE",
} as const;
const WP8F_V23_WORK_KEYS = [
  ...WP8F_V22_WORK_KEYS,
  "wp8fV23InstrumentationAddendum",
] as const;

/** Data validation is NOT provenance. Only the read-only repository inspector
 * issues the process-local object accepted by the action assessor. */
export function validateV23SealedObservation(input: unknown): boolean {
  if (!isRecord(input)) return false;
  const g = WP8F_V23_ADDENDUM;
  const keys = [
    "commit",
    "path",
    "candidateFileSha256",
    "parentFileSha256",
    "sealedFileSha256",
    "headFileSha256",
    "workingFileSha256",
    "pathDiffSha256",
    "additions",
    "removals",
    "paths",
    "historyPaths",
    "pathCommits",
    "commitPaths",
  ];
  const allowed = [...WP8F_V18_ENVELOPE.controlFiles, g.path];
  return (
    Object.keys(input).length === keys.length &&
    exactPaths(Object.keys(input), keys) &&
    input.commit === g.commit &&
    input.path === g.path &&
    input.candidateFileSha256 === g.candidateFileSha256 &&
    input.parentFileSha256 === g.candidateFileSha256 &&
    input.sealedFileSha256 === g.instrumentedFileSha256 &&
    input.headFileSha256 === g.instrumentedFileSha256 &&
    input.workingFileSha256 === g.instrumentedFileSha256 &&
    input.pathDiffSha256 === g.pathDiffSha256 &&
    input.additions === g.additions &&
    input.removals === g.removals &&
    exactPaths(input.paths, allowed) &&
    Array.isArray(input.paths) &&
    input.paths.includes(g.path) &&
    exactPaths(input.historyPaths, allowed) &&
    Array.isArray(input.historyPaths) &&
    input.historyPaths.includes(g.path) &&
    JSON.stringify(input.pathCommits) === JSON.stringify([g.commit]) &&
    exactPaths(input.commitPaths, allowed) &&
    Array.isArray(input.commitPaths) &&
    input.commitPaths.includes(g.path)
  );
}

type V23CheckoutProof = Readonly<{
  root: string;
  head: string;
  paths: readonly string[];
  clean: boolean;
  currentWorkDigest: string;
}>;
const v23CheckoutProofs = new WeakSet<object>();

/** Local read-only Git inspection: no remote, supplied digest/reader, credential,
 * hook or external diff. Dirty control files permit validation, never deployment. */
export function inspectV23SealedRepository(
  root: string,
): { ok: true; proof: V23CheckoutProof } | { ok: false; reason: string } {
  try {
    const cwd = realpathSync(root);
    const env = {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
    };
    const git = (...args: string[]) =>
      execFileSync(
        "/usr/bin/git",
        [
          "--no-optional-locks",
          "--no-replace-objects",
          "-c",
          "core.fsmonitor=false",
          "-c",
          "core.abbrev=7",
          "-c",
          "diff.algorithm=myers",
          ...args,
        ],
        {
          cwd,
          env,
          encoding: "utf8",
          maxBuffer: 16 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    const list = (raw: string) => raw.split("\0").filter(Boolean);
    const hash = (raw: string | Buffer) =>
      createHash("sha256").update(raw).digest("hex");
    const g = WP8F_V23_ADDENDUM,
      candidate = WP8F_V22_AUTHORIZATION.sourceCommit;
    if (
      realpathSync(git("rev-parse", "--show-toplevel").trim()) !== cwd ||
      git("rev-parse", "--is-shallow-repository").trim() !== "false"
    )
      return { ok: false, reason: "V23_FULL_EXACT_REPOSITORY_REQUIRED" };
    const head = git("rev-parse", "HEAD").trim();
    if (
      !isFullSha(head, 40) ||
      git("rev-parse", g.commit + "^{commit}").trim() !== g.commit
    )
      return { ok: false, reason: "V23_SEALED_COMMIT_MISSING" };
    git("merge-base", "--is-ancestor", candidate, g.commit);
    git("merge-base", "--is-ancestor", g.commit, head);
    if (git("rev-list", "--min-parents=2", candidate + ".." + head).trim())
      return { ok: false, reason: "V23_UNAUTHORIZED_MERGE_HISTORY" };
    const parents = git("rev-list", "--parents", "-n", "1", g.commit)
      .trim()
      .split(" ");
    if (parents.length !== 2)
      return { ok: false, reason: "V23_SEALED_PARENT_INVALID" };
    const diffArgs = [
      "diff",
      "--no-ext-diff",
      "--no-textconv",
      "--no-renames",
      "--no-color",
    ];
    const paths = list(git(...diffArgs, "--name-only", "-z", candidate, head));
    const historyPaths = [
      ...new Set(
        list(
          git(
            "log",
            "--format=",
            "--name-only",
            "--no-renames",
            "-z",
            candidate + ".." + head,
          ),
        ),
      ),
    ];
    const numstat = git(
      ...diffArgs,
      "--numstat",
      parents[1]!,
      g.commit,
      "--",
      g.path,
    )
      .trim()
      .split("\t");
    const observation = {
      commit: g.commit,
      path: g.path,
      candidateFileSha256: hash(git("show", candidate + ":" + g.path)),
      parentFileSha256: hash(git("show", parents[1]! + ":" + g.path)),
      sealedFileSha256: hash(git("show", g.commit + ":" + g.path)),
      headFileSha256: hash(git("show", head + ":" + g.path)),
      workingFileSha256: hash(readFileSync(join(cwd, g.path))),
      pathDiffSha256: hash(
        git(
          ...diffArgs,
          "--src-prefix=a/",
          "--dst-prefix=b/",
          "--unified=3",
          "--indent-heuristic",
          parents[1]!,
          g.commit,
          "--",
          g.path,
        ),
      ),
      additions: Number(numstat[0]),
      removals: Number(numstat[1]),
      paths,
      historyPaths,
      pathCommits: git(
        "log",
        "--full-history",
        "--format=%H",
        candidate + ".." + head,
        "--",
        g.path,
      )
        .trim()
        .split("\n"),
      commitPaths: list(
        git(...diffArgs, "--name-only", "-z", parents[1]!, g.commit),
      ),
    };
    const dirty = [
      ...list(git(...diffArgs, "--name-only", "-z", "HEAD")),
      ...list(git(...diffArgs, "--cached", "--name-only", "-z", "HEAD")),
      ...list(git("ls-files", "--others", "--exclude-standard", "-z")),
    ];
    const currentWorkText = git(
      "show",
      head + ":config/project/current-work.json",
    );
    const committedWork: unknown = JSON.parse(currentWorkText);
    if (
      !isRecord(committedWork) ||
      !validateV22OperationJournal(committedWork.wp8fV22OperationJournal)
    )
      return { ok: false, reason: "V23_INHERITED_JOURNAL_UNVERIFIED" };
    for (const revision of git(
      "log",
      "--format=%H",
      "4b3a91c1e1c6748a1b6da2920888f87d736c1138^.." + head,
      "--",
      "config/project/current-work.json",
    )
      .trim()
      .split("\n")) {
      if (!isFullSha(revision, 40))
        return { ok: false, reason: "V23_INHERITED_HISTORY_UNVERIFIED" };
      const previous: unknown = JSON.parse(
        git("show", revision + ":config/project/current-work.json"),
      );
      if (
        !isRecord(previous) ||
        !validateV22OperationJournal(
          committedWork.wp8fV22OperationJournal,
          previous.wp8fV22OperationJournal,
        )
      )
        return { ok: false, reason: "V23_INHERITED_JOURNAL_RESET_OR_REWRITE" };
    }
    if (
      !validateV23SealedObservation(observation) ||
      numstat[2] !== g.path ||
      (dirty.length > 0 &&
        !exactPaths([...new Set(dirty)], WP8F_V18_ENVELOPE.controlFiles))
    )
      return {
        ok: false,
        reason: "V23_SEALED_GIT_INVENTORY_OR_DIGEST_MISMATCH",
      };
    if (git("rev-parse", "HEAD").trim() !== head)
      return { ok: false, reason: "V23_CHECKOUT_CHANGED_DURING_INSPECTION" };
    const proof = Object.freeze({
      root: cwd,
      head,
      paths: Object.freeze(paths),
      clean: dirty.length === 0,
      currentWorkDigest: hash(JSON.stringify(committedWork)),
    });
    v23CheckoutProofs.add(proof);
    return { ok: true, proof };
  } catch {
    return { ok: false, reason: "V23_GIT_OBSERVATION_UNAVAILABLE" };
  }
}

function v23VerifiedPaths(
  candidate: Record<string, unknown>,
  input: unknown,
  work: unknown,
): boolean {
  if (
    !isRecord(input) ||
    !v23CheckoutProofs.has(input) ||
    typeof input.root !== "string"
  )
    return false;
  const suppliedPaths = candidate.postCandidatePaths;
  if (
    !Array.isArray(suppliedPaths) ||
    !suppliedPaths.every(
      (path: unknown): path is string => typeof path === "string",
    )
  )
    return false;
  // Re-read instead of trusting a proof after HEAD/worktree/history drift.
  const fresh = inspectV23SealedRepository(input.root);
  return (
    fresh.ok &&
    fresh.proof.clean &&
    input.head === fresh.proof.head &&
    candidate.evidenceHead === fresh.proof.head &&
    createHash("sha256").update(JSON.stringify(work)).digest("hex") ===
      fresh.proof.currentWorkDigest &&
    exactPaths(suppliedPaths, fresh.proof.paths) &&
    JSON.stringify([...suppliedPaths].sort()) ===
      JSON.stringify([...fresh.proof.paths].sort())
  );
}

const WP8F_V22_JOURNAL_SCHEMA = {
  type: "array",
  maxItems: 2,
  items: {
    type: "object",
    additionalProperties: false,
    required: [
      "action",
      "operationRef",
      "attempt",
      "startedAt",
      "evidenceSha256",
    ],
    properties: {
      action: {
        enum: ["DEPLOY_TEST", "ACTIVATE_SUCCESSOR_V22"],
      },
      operationRef: {
        enum: [
          "39c5d097-72e9-4658-b087-a5545626060d",
          "e7dbdaa5-01aa-454c-b8c9-e1838594662e",
        ],
      },
      attempt: {
        const: 1,
      },
      startedAt: {
        type: "string",
        format: "date-time",
      },
      evidenceSha256: {
        type: "string",
        pattern: "^[0-9a-f]{64}$",
      },
    },
  },
} as const;

const WP8F_V21_CONSUMED_JOURNAL = [
  {
    action: "DEPLOY_TEST",
    operationRef: "7b9535ab-1be3-4525-96db-952aa0a7315d",
    attempt: 1,
    startedAt: "2026-09-10T07:39:09.358Z",
    evidenceSha256:
      "4585e21b861cce845f01b2b11325b814f0089beeecb339c2b9a528422fe684f0",
  },
  {
    action: "CLOSE_OWNER_HANDOFF",
    operationRef: "feaa5f7f-9547-4ea5-b52f-811413c2e010",
    attempt: 1,
    startedAt: "2026-09-10T08:37:47.000Z",
    evidenceSha256:
      "fb97fc3ff711d860acd7ae6188367a9e353701c58e7f253954fcdef4be986382",
  },
  {
    action: "OPEN_CONTINUATION",
    operationRef: "ccf39f0b-e433-471d-9699-43cd3ff04124",
    attempt: 1,
    startedAt: "2026-09-10T09:01:40.000Z",
    evidenceSha256:
      "762001adce6f9471666e54e70ab5b9e367dd6abe4f1b156e0df6d000d7f05203",
  },
] as const;

function validOperationRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      value,
    )
  );
}

/** Records an attempt before its remote invocation. Unknown outcomes never delete a record. */
export function validateSuccessorOperationJournal(
  input: unknown,
  previous: unknown = [],
): boolean {
  if (
    !Array.isArray(input) ||
    !Array.isArray(previous) ||
    input.length > 5 ||
    previous.length > input.length ||
    previous.some(
      (row, index) => JSON.stringify(row) !== JSON.stringify(input[index]),
    )
  )
    return false;
  let deployments = 0,
    closes = 0,
    continuations = 0,
    closeOperation: unknown,
    lastTime = 0;
  const operations = new Set<string>();
  for (const row of input) {
    if (
      !isRecord(row) ||
      !exactPaths(Object.keys(row), [
        "action",
        "operationRef",
        "attempt",
        "startedAt",
        "evidenceSha256",
      ]) ||
      Object.keys(row).length !== 5 ||
      !validOperationRef(row.operationRef) ||
      !isFullSha(row.evidenceSha256, 64) ||
      typeof row.startedAt !== "string"
    )
      return false;
    const time = Date.parse(row.startedAt);
    if (
      !Number.isSafeInteger(time) ||
      time < lastTime ||
      new Date(time).toISOString() !== row.startedAt
    )
      return false;
    lastTime = time;
    if (row.action === "DEPLOY_TEST") {
      if (input.indexOf(row) !== 0 || ++deployments !== 1 || row.attempt !== 1)
        return false;
      operations.add(row.operationRef);
    } else if (row.action === "CLOSE_OWNER_HANDOFF") {
      if (
        deployments !== 1 ||
        continuations !== 0 ||
        ++closes > 3 ||
        row.attempt !== closes ||
        (closes === 1
          ? operations.has(row.operationRef)
          : row.operationRef !== closeOperation)
      )
        return false;
      closeOperation = row.operationRef;
      operations.add(row.operationRef);
    } else if (row.action === "OPEN_CONTINUATION") {
      if (
        deployments !== 1 ||
        closes < 1 ||
        ++continuations !== 1 ||
        row.attempt !== 1 ||
        operations.has(row.operationRef)
      )
        return false;
      operations.add(row.operationRef);
    } else return false;
  }
  return true;
}

function validateWp8fSuccessor(
  errors: string[],
  work: Record<string, unknown>,
  v22 = false,
  v23 = false,
): void {
  if (
    JSON.stringify(work.wp8fSuccessorCompletion) !==
    JSON.stringify(WP8F_V21_COMPLETION)
  )
    errors.push("V21_OWNER_ENVELOPE_INVALID");
  if (
    Object.keys(work).length !==
      (v23 ? WP8F_V23_WORK_KEYS : v22 ? WP8F_V22_WORK_KEYS : WP8F_V21_WORK_KEYS)
        .length ||
    !exactPaths(
      Object.keys(work),
      v23 ? WP8F_V23_WORK_KEYS : v22 ? WP8F_V22_WORK_KEYS : WP8F_V21_WORK_KEYS,
    )
  )
    errors.push("V21_UNKNOWN_CURRENT_WORK_FIELDS");
  if (
    JSON.stringify(work.authorization) !==
    JSON.stringify(WP8F_V21_AUTHORIZATION)
  )
    errors.push("V21_SELF_AUTHORIZATION_DENIED");
  if (!validateSuccessorOperationJournal(work.wp8fSuccessorOperationJournal))
    errors.push("V21_OPERATION_JOURNAL_INVALID");
  if (
    !Array.isArray(work.forbiddenScope) ||
    work.forbiddenScope.length !==
      (v22 ? WP8F_V22_FORBIDDEN : WP8F_V21_FORBIDDEN).length ||
    !exactPaths(
      work.forbiddenScope,
      v22 ? WP8F_V22_FORBIDDEN : WP8F_V21_FORBIDDEN,
    )
  )
    errors.push("V21_FORBIDDEN_SCOPE_INVALID");
  if (v22) {
    if (
      JSON.stringify(work.wp8fV22Authorization) !==
      JSON.stringify(WP8F_V22_AUTHORIZATION)
    )
      errors.push("V22_OWNER_ENVELOPE_INVALID");
    if (
      JSON.stringify(work.wp8fSuccessorOperationJournal) !==
      JSON.stringify(WP8F_V21_CONSUMED_JOURNAL)
    )
      errors.push("V22_HISTORICAL_GRANT_REWRITE_DENIED");
    if (!validateV22OperationJournal(work.wp8fV22OperationJournal))
      errors.push("V22_OPERATION_JOURNAL_INVALID");
  }
  if (
    v23 &&
    JSON.stringify(work.wp8fV23InstrumentationAddendum) !==
      JSON.stringify(WP8F_V23_ADDENDUM)
  )
    errors.push("V23_SEALED_ADDENDUM_INVALID");
}

function successorTarget(target: unknown): boolean {
  const grant = WP8F_V21_COMPLETION;
  return (
    isRecord(target) &&
    Object.keys(target).length === 3 &&
    target.worker === grant.worker &&
    target.sourceCommit === grant.sourceCommit &&
    target.artifactSha256 === grant.artifactSha256
  );
}

function successorCandidate(
  evidence: Record<string, unknown>,
  grant:
    | typeof WP8F_V21_COMPLETION
    | typeof WP8F_V22_AUTHORIZATION = WP8F_V21_COMPLETION,
  v23 = false,
  sealedCheckout?: unknown,
  work?: unknown,
): boolean {
  const g = grant,
    c = evidence.candidate;
  return (
    isRecord(c) &&
    c.sourceCommit === g.sourceCommit &&
    c.artifactSha256 === g.artifactSha256 &&
    c.ciHead === g.sourceCommit &&
    c.ciRun === g.candidateCiRun &&
    c.ciConclusion === "success" &&
    c.testsPassed === g.candidateTestsPassed &&
    c.testsFailed === 0 &&
    c.testsSkipped === 0 &&
    c.testsCancelled === 0 &&
    c.auditAllLevelsZero === true &&
    c.protectedChecksumsUnchanged === true &&
    c.cleanFrozenInstall === true &&
    c.cleanBuild === true &&
    c.retainedAndEmptyMigrationPassed === true &&
    c.nodeVersion === "24.19.0" &&
    c.pnpmVersion === "11.19.0" &&
    Array.isArray(c.reproducedArtifacts) &&
    c.reproducedArtifacts.length >= 2 &&
    c.reproducedArtifacts.every((hash) => hash === g.artifactSha256) &&
    c.executionBaseline === g.executionBaseline &&
    c.baselineAncestryVerified === true &&
    c.candidateIsControlAncestor === true &&
    isFullSha(c.controlCommit, 40) &&
    c.controlCommit !== g.sourceCommit &&
    c.controlOwnerDecision ===
      (v23 ? WP8F_V23_ADDENDUM.ownerDecision : g.ownerDecision) &&
    c.controlTestsAndValidatorsPassed === true &&
    c.controlCiHead === c.controlCommit &&
    c.controlCiConclusion === "success" &&
    c.committedPushedAndClean === true &&
    c.exactDiffReviewed === true &&
    c.noDeployAffectingChangesAfterCandidate === true &&
    (v23
      ? v23VerifiedPaths(c, sealedCheckout, work)
      : exactPaths(c.postCandidatePaths, [
          ...WP8F_V18_ENVELOPE.controlFiles,
          ...g.evidenceFiles,
        ]))
  );
}

function successorObservation(
  test: unknown,
  grant:
    | typeof WP8F_V21_COMPLETION
    | typeof WP8F_V22_AUTHORIZATION = WP8F_V21_COMPLETION,
): test is Record<string, unknown> {
  const g = grant,
    now = Date.now();
  return (
    isRecord(test) &&
    test.account === g.account &&
    test.worker === g.worker &&
    test.environment === g.environment &&
    test.accountIdentityVerified === true &&
    test.sourceArtifactAssociationVerified === true &&
    test.trafficPercent === 100 &&
    test.bindingsSecretsConfigurationVerified === true &&
    test.health === "PASS" &&
    typeof test.observedAt === "number" &&
    Number.isSafeInteger(test.observedAt) &&
    test.observedAt <= now &&
    now - test.observedAt <= g.freshObservationMaximumAgeMs &&
    test.ownerIdentityVerified === true &&
    test.ownerLineageVerified === true &&
    test.observationReadOnly === true &&
    isFullSha(test.schemaSnapshotSha256, 64)
  );
}

function successorClosedBaseline(test: Record<string, unknown>): boolean {
  return (
    test.pilot === "STOPPED" &&
    test.stopReason === "OPERATOR_STOP" &&
    test.aiAdmission === false &&
    test.events === 6 &&
    test.attempts === 6 &&
    test.consumedMicroUsd === 34082 &&
    test.reservedMicroUsd === 0 &&
    test.inFlight === 0 &&
    test.pendingAttempts === 0 &&
    test.conservativeMicroUsd === 25864 &&
    test.reportedUsageMicroUsd === 8218 &&
    test.usageUnknownAttempts === 2 &&
    test.settledAttempts === 4 &&
    test.actualHistoricalBilling === "UNKNOWN" &&
    test.pendingTemplate === null &&
    test.clarificationUsed === false &&
    test.pendingReplies === 0 &&
    test.draftState === "EXPIRED_PURGED" &&
    test.draftPurgeInvariantsVerified === true &&
    test.draftPendingReplies === 0
  );
}

function successorPostDeploy(
  test: Record<string, unknown>,
  evidence: Record<string, unknown>,
): boolean {
  const g = WP8F_V21_COMPLETION,
    post = evidence.postDeployment;
  return (
    test.sourceCommit === g.sourceCommit &&
    test.artifactSha256 === g.artifactSha256 &&
    typeof test.version === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u.test(test.version) &&
    test.version !== g.predecessorVersion &&
    test.deliverySchema === "PRESENT_FENCED" &&
    test.pendingDeliveryClaims === 0 &&
    test.activeDeliveryClaims === 0 &&
    test.orphanDeliveryClaims === 0 &&
    isRecord(post) &&
    post.version === test.version &&
    post.sourceCommit === g.sourceCommit &&
    post.artifactSha256 === g.artifactSha256 &&
    post.migrationAdditiveIdempotent === true &&
    post.legacyEventsPlansHistoryPreserved === true &&
    post.accountingUnchanged === true &&
    post.claimBackfillVerified === true &&
    post.handoffGenerationBackfillVerified === true &&
    post.registryFenceBackfillVerified === true &&
    post.unexpectedEventDelta === 0 &&
    post.providerAttemptDelta === 0 &&
    post.lineOutboundDelta === 0 &&
    post.lateReplies === 0 &&
    isFullSha(post.beforeSnapshotSha256, 64) &&
    isFullSha(post.afterSnapshotSha256, 64)
  );
}

function successorContainment(input: unknown): boolean {
  return (
    isRecord(input) &&
    input.ownerNoLine === true &&
    input.noSessionOrProbe === true &&
    input.noInFlightOrReserved === true &&
    input.additiveMigrationVerified === true &&
    input.ledgerHistoryPreserved === true &&
    input.independentOfUnfencedRollback === true &&
    input.globalLineEgressDisabled === false &&
    input.testOnlyResidualRiskAcknowledged === true &&
    input.automaticRollback === false &&
    input.unexpectedDeltaStopsAcceptance === true &&
    input.ambiguousOutcomeConsumesGrant === true &&
    Array.isArray(input.failureCases) &&
    input.failureCases.length === 7 &&
    exactPaths(input.failureCases, WP8F_V19_PREPARATION.requiredFailureCases)
  );
}

/** Pure policy assessment, not a capability, mutex, remote verifier or cross-DO transaction.
 * Operator evidence must be independently collected. Append/push the consumed attempt
 * before executing its one prepared command; never regenerate the operation on uncertainty.
 */
/** Two independent, ordered, one-use starts. No retry, outcome reset, or old-grant reuse. */
export function validateV22OperationJournal(
  input: unknown,
  previous: unknown = [],
): boolean {
  if (
    !Array.isArray(input) ||
    !Array.isArray(previous) ||
    input.length > 2 ||
    previous.length > input.length ||
    previous.some((row, i) => JSON.stringify(row) !== JSON.stringify(input[i]))
  )
    return false;
  let lastTime = 0;
  for (const [index, row] of input.entries()) {
    if (
      !isRecord(row) ||
      Object.keys(row).length !== 5 ||
      !exactPaths(Object.keys(row), [
        "action",
        "operationRef",
        "attempt",
        "startedAt",
        "evidenceSha256",
      ]) ||
      row.attempt !== 1 ||
      !isFullSha(row.evidenceSha256, 64) ||
      typeof row.startedAt !== "string"
    )
      return false;
    const expected =
      index === 0
        ? WP8F_V22_AUTHORIZATION.deployment
        : WP8F_V22_AUTHORIZATION.activation;
    if (
      row.action !== (index === 0 ? "DEPLOY_TEST" : "ACTIVATE_SUCCESSOR_V22") ||
      row.operationRef !== expected.operation
    )
      return false;
    const time = Date.parse(row.startedAt);
    if (
      !Number.isSafeInteger(time) ||
      time < lastTime ||
      new Date(time).toISOString() !== row.startedAt
    )
      return false;
    lastTime = time;
  }
  return true;
}

function v22RetainedBaseline(t: Record<string, unknown>): boolean {
  return (
    t.pilot === "STOPPED" &&
    t.stopReason === "OPERATOR_STOP" &&
    t.aiAdmission === false &&
    t.events === 6 &&
    t.attempts === 6 &&
    t.consumedMicroUsd === 34082 &&
    t.reservedMicroUsd === 0 &&
    t.inFlight === 0 &&
    t.pendingAttempts === 0 &&
    t.conservativeMicroUsd === 25864 &&
    t.reportedUsageMicroUsd === 8218 &&
    t.usageUnknownAttempts === 2 &&
    t.settledAttempts === 4 &&
    t.actualHistoricalBilling === "UNKNOWN" &&
    t.ownerMode === "BOT_ACTIVE" &&
    t.handoffRegistryActive === 0 &&
    t.pendingTemplate === "T-C01" &&
    t.clarificationUsed === true &&
    t.pendingReplies === 0 &&
    t.handoffCloseState === "COMPLETE" &&
    t.handoffGeneration === 1 &&
    t.handoffTechnicalAttempts === 1 &&
    t.pendingHandoffClose === false &&
    t.draftState === "EXPIRED_PURGED" &&
    t.draftPurgeInvariantsVerified === true &&
    t.draftPendingReplies === 0 &&
    t.processedEvents === 6 &&
    t.responsePlans === 4 &&
    t.auditRows === 18 &&
    t.deliveryClaims === 6 &&
    t.deliveredClaims === 6 &&
    v22DeliverySettled(t) &&
    t.originalMarkers === 1 &&
    t.oldContinuationMarkers === 1 &&
    t.successorMarkers === 0 &&
    t.successorMarkerTablePresent === false &&
    t.sessionRef ===
      WP8F_V22_AUTHORIZATION.activation.body.expectedSessionRef &&
    t.lineage === "IMMUTABLE_V16_CONTINUATION" &&
    t.lineageStorageVerified === true
  );
}

function v22DeliverySettled(t: Record<string, unknown>): boolean {
  return (
    t.deliverySchema === "PRESENT_FENCED" &&
    t.pendingDeliveryClaims === 0 &&
    t.activeDeliveryClaims === 0 &&
    t.orphanDeliveryClaims === 0 &&
    t.unknownDeliveryClaims === 0 &&
    t.malformedDeliveryClaims === 0 &&
    t.inconsistentDeliveryLinks === 0 &&
    t.legacyUndeliveredEvents === 0 &&
    t.legacyUndeliveredPlans === 0
  );
}

function v22PostDeployment(
  t: Record<string, unknown>,
  evidence: Record<string, unknown>,
): boolean {
  const g = WP8F_V22_AUTHORIZATION,
    post = evidence.postDeployment;
  return (
    t.sourceCommit === g.sourceCommit &&
    t.artifactSha256 === g.artifactSha256 &&
    typeof t.version === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u.test(t.version) &&
    t.version !== g.predecessorVersion &&
    isRecord(post) &&
    post.version === t.version &&
    post.sourceCommit === g.sourceCommit &&
    post.artifactSha256 === g.artifactSha256 &&
    post.existingSchemaUnchanged === true &&
    post.migrationAdditiveIdempotent === true &&
    post.allRetainedRowsUnchanged === true &&
    post.accountingUnchanged === true &&
    post.ownerDraftAndHistoryUnchanged === true &&
    post.successorMarkerAbsent === true &&
    post.unexpectedEventDelta === 0 &&
    post.responsePlanDelta === 0 &&
    post.claimDelta === 0 &&
    post.auditDelta === 0 &&
    post.providerAttemptDelta === 0 &&
    post.lineOutboundDelta === 0 &&
    post.lateReplies === 0 &&
    isFullSha(post.beforeSnapshotSha256, 64) &&
    isFullSha(post.afterSnapshotSha256, 64) &&
    post.evidenceCommittedPushed === true &&
    isFullSha(post.evidenceCommit, 40)
  );
}

/** An assessment cannot authorize itself, attest remote state or provide a distributed lock.
 * Starts must be durably checkpointed by the operator and each exact command invoked once.
 * Unknown outcomes only permit independent read reconciliation or authenticated STOP.
 */
function evaluateWp8fV22Action(
  work: Record<string, unknown>,
  action: string,
  target: unknown,
  evidence: unknown,
  v23 = false,
  sealedCheckout?: unknown,
): ProjectActionDecision {
  const deny = { allowed: false, reason: "V22_MISSING_OR_FAILED_EXACT_GATE" },
    g = WP8F_V22_AUTHORIZATION;
  if (
    [
      "COMMIT",
      "PUSH_BRANCH",
      "UPDATE_GITHUB_ROADMAP",
      "PREPARE_EXACT_TEST_DEPLOYMENT",
    ].includes(action)
  )
    return {
      allowed: true,
      reason: "V22_EXACT_CONTROL_AND_CHECKPOINT_AUTHORITY",
    };
  if (
    v23 &&
    ![
      "DEPLOY_TEST",
      "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS",
      "ACTIVATE_SUCCESSOR_V22",
      "STOP_TEST",
      "OWNER_UAT_NEXT_CASE",
      "OWNER_KILL_SWITCH_CASE",
    ].includes(action)
  )
    return { allowed: false, reason: "V23_ACTION_OUTSIDE_INHERITED_GRANTS" };
  if (
    !isRecord(target) ||
    Object.keys(target).length !== 3 ||
    target.worker !== g.worker ||
    target.sourceCommit !== g.sourceCommit ||
    target.artifactSha256 !== g.artifactSha256 ||
    !isRecord(evidence) ||
    evidence.provenance !== "INDEPENDENT_OPERATOR_VERIFICATION" ||
    evidence.ownerDecision !==
      (v23 ? WP8F_V23_ADDENDUM.ownerDecision : g.ownerDecision) ||
    !Array.isArray(work.wp8fV22OperationJournal)
  )
    return deny;
  // Never trap an identified TEST pilot ON because downstream readiness is broken.
  const t = evidence.test,
    now = Date.now();
  if (action === "STOP_TEST")
    return isRecord(t) &&
      t.account === g.account &&
      t.worker === g.worker &&
      t.environment === g.environment &&
      t.accountIdentityVerified === true &&
      typeof t.observedAt === "number" &&
      Number.isSafeInteger(t.observedAt) &&
      t.observedAt <= now &&
      now - t.observedAt <= g.freshObservationMaximumAgeMs
      ? { allowed: true, reason: "V22_AUTHENTICATED_TEST_STOP_CONTAINMENT" }
      : deny;
  if (
    !successorObservation(t, g) ||
    t.oa !== g.oa ||
    !successorCandidate(evidence, g, v23, sealedCheckout, work) ||
    evidence.primaryU1 !== "GAP" ||
    evidence.auditA1A3 !== "UNRESOLVED_AUDIT_RETENTION_RECONCILIATION_GAP" ||
    evidence.acceptanceCriteriaUnchanged !== true
  )
    return deny;
  const journal: unknown[] = work.wp8fV22OperationJournal,
    op = evidence.operation;
  const next = (kind: string, index: number, operationRef: string) =>
    isRecord(op) &&
    op.action === kind &&
    op.operationRef === operationRef &&
    op.attempt === 1 &&
    op.persistedAttemptsVerified === true &&
    op.noPriorUnrecordedInvocation === true &&
    JSON.stringify(op.observedJournal) === JSON.stringify(journal) &&
    isFullSha(op.evidenceSha256, 64) &&
    journal.length === index &&
    validateV22OperationJournal(
      [
        ...journal,
        {
          action: kind,
          operationRef,
          attempt: 1,
          startedAt: new Date(now).toISOString(),
          evidenceSha256: op.evidenceSha256,
        },
      ],
      journal,
    );
  if (
    action === "DEPLOY_TEST" ||
    action === "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS"
  ) {
    return next("DEPLOY_TEST", 0, g.deployment.operation) &&
      v22RetainedBaseline(t) &&
      t.version === g.predecessorVersion &&
      t.sourceCommit === g.predecessorSource &&
      t.artifactSha256 === g.predecessorArtifact &&
      successorContainment(evidence.containment)
      ? { allowed: true, reason: "V22_ONE_EXACT_TEST_DEPLOYMENT_READY" }
      : deny;
  }
  if (action === "ACTIVATE_SUCCESSOR_V22") {
    const a = evidence.activation;
    return next(action, 1, g.activation.operation) &&
      v22RetainedBaseline(t) &&
      v22PostDeployment(t, evidence) &&
      successorContainment(evidence.containment) &&
      t.successorEligibility === true &&
      isRecord(a) &&
      a.method === g.activation.method &&
      a.path === g.activation.path &&
      JSON.stringify(a.body) === JSON.stringify(g.activation.body) &&
      a.expectedSuccessorSession === g.activation.successorSession &&
      a.ownerAvailable === true &&
      typeof a.ownerReadyConfirmedAt === "number" &&
      Number.isSafeInteger(a.ownerReadyConfirmedAt) &&
      a.ownerReadyConfirmedAt <= now &&
      now - a.ownerReadyConfirmedAt <= 120000 &&
      a.noInterveningOwnerMessage === true &&
      a.noClarificationOrHistoryReset === true
      ? { allowed: true, reason: "V22_ONE_EXACT_SUCCESSOR_ACTIVATION_READY" }
      : deny;
  }
  if (action !== "OWNER_UAT_NEXT_CASE" && action !== "OWNER_KILL_SWITCH_CASE")
    return { allowed: false, reason: "V22_ACTION_FORBIDDEN" };
  const s = evidence.session,
    u = evidence.uat;
  if (
    journal.length !== 2 ||
    t.sourceCommit !== g.sourceCommit ||
    t.artifactSha256 !== g.artifactSha256 ||
    t.sessionRef !== g.activation.successorSession ||
    t.lineage !== "IMMUTABLE_V22_SUCCESSOR" ||
    t.lineageStorageVerified !== true ||
    t.originalMarkers !== 1 ||
    t.oldContinuationMarkers !== 1 ||
    t.successorMarkers !== 1 ||
    t.successorMarkerTablePresent !== true ||
    t.successorEligibility !== false ||
    !v22DeliverySettled(t) ||
    t.reservedMicroUsd !== 0 ||
    t.pendingAttempts !== 0 ||
    t.inFlight !== 0 ||
    t.pendingReplies !== 0 ||
    t.draftPurgeInvariantsVerified !== true ||
    t.draftPendingReplies !== 0 ||
    t.clarificationUsed !== true ||
    !isRecord(s) ||
    s.operation !== g.activation.operation ||
    s.ownerLineageVerified !== true ||
    s.activationZeroAccountingDelta !== true ||
    s.originalMarkersAndHistoryUnchanged !== true ||
    s.maximumConcurrency !== 1 ||
    s.maximumCostMicroUsd !== 5000000 ||
    s.maximumEvents !== 200 ||
    s.maximumAttempts !== 200 ||
    typeof s.startedAt !== "number" ||
    !Number.isSafeInteger(s.startedAt) ||
    typeof s.expiresAt !== "number" ||
    !Number.isSafeInteger(s.expiresAt) ||
    s.startedAt > now ||
    s.expiresAt - s.startedAt <= 0 ||
    s.expiresAt - s.startedAt > 3600000 ||
    !isRecord(u) ||
    u.exactOwnerChatVerified !== true ||
    u.expectedRouteAndReplyRecorded !== true ||
    u.ownerSendsOneMessage !== true ||
    u.noStopCondition !== true ||
    u.noRetryOrReplacementSession !== true ||
    !Array.isArray(u.completedCases) ||
    u.primaryU1NotRepeated !== true ||
    u.casePreviouslySent !== false
  )
    return deny;
  if (action === "OWNER_UAT_NEXT_CASE") {
    if (
      t.pilot !== "ACTIVE" ||
      t.aiAdmission !== true ||
      t.ownerMode !== "BOT_ACTIVE" ||
      t.handoffRegistryActive !== 0 ||
      s.activeSessions !== 1 ||
      s.expiresAt <= now ||
      typeof t.events !== "number" ||
      !Number.isSafeInteger(t.events) ||
      t.events < 6 ||
      t.events >= 200 ||
      typeof t.attempts !== "number" ||
      !Number.isSafeInteger(t.attempts) ||
      t.attempts < 6 ||
      t.attempts >= 200 ||
      typeof t.consumedMicroUsd !== "number" ||
      !Number.isSafeInteger(t.consumedMicroUsd) ||
      t.consumedMicroUsd < 34082 ||
      t.consumedMicroUsd >= 5000000
    )
      return deny;
    if (u.caseId === "U2")
      return u.completedCases.length === 0 &&
        t.events === 6 &&
        t.attempts === 6 &&
        t.consumedMicroUsd === 34082 &&
        t.pendingTemplate === "T-C01" &&
        t.processedEvents === 6 &&
        t.responsePlans === 4 &&
        t.deliveryClaims === 6 &&
        t.deliveredClaims === 6 &&
        u.expectedRoute === "AUTO_APPROVED_CATALOG_39"
        ? { allowed: true, reason: "V22_OWNER_SEND_U2_ONLY" }
        : deny;
    if (u.caseId === "U3")
      return JSON.stringify(u.completedCases) === JSON.stringify(["U2"]) &&
        u.priorVisibleAndBackendVerified === true &&
        u.priorClaimAcknowledged === true &&
        u.priorProviderSettlementClassified === true &&
        t.pendingTemplate === null &&
        t.processedEvents === 7 &&
        t.responsePlans === 5 &&
        t.deliveryClaims === 7 &&
        t.deliveredClaims === 7 &&
        u.expectedRoute === "MANDATORY_DETERMINISTIC_HUMAN_HANDOFF"
        ? {
            allowed: true,
            reason: "V22_OWNER_SEND_U3_LAST_CONVERSATIONAL_CASE",
          }
        : deny;
    return deny;
  }
  const stop = evidence.stop;
  return u.caseId === "U4" &&
    u.expectedRoute === "SILENT_HUMAN_HANDOFF" &&
    JSON.stringify(u.completedCases) === JSON.stringify(["U2", "U3"]) &&
    u.priorVisibleAndBackendVerified === true &&
    u.priorClaimAcknowledged === true &&
    u.mandatoryProviderAttemptDelta === 0 &&
    u.mandatoryReservationDelta === 0 &&
    u.mandatoryCostDelta === 0 &&
    t.pilot === "STOPPED" &&
    t.aiAdmission === false &&
    t.ownerMode === "HUMAN_HANDOFF" &&
    t.handoffRegistryActive === 1 &&
    t.processedEvents === 8 &&
    t.deliveryClaims === 8 &&
    t.deliveredClaims === 8 &&
    s.activeSessions === 0 &&
    isRecord(stop) &&
    typeof stop.aiDisabledAt === "number" &&
    Number.isSafeInteger(stop.aiDisabledAt) &&
    typeof stop.pilotStoppedAt === "number" &&
    Number.isSafeInteger(stop.pilotStoppedAt) &&
    stop.aiDisabledAt <= stop.pilotStoppedAt &&
    stop.pilotStoppedAt <= now &&
    stop.pilotStoppedAt >= s.startedAt &&
    stop.authenticatedReceiptsVerified === true &&
    stop.providerAttemptsSinceStop === 0 &&
    stop.lineOutboundSinceStop === 0 &&
    stop.lateReplies === 0
    ? { allowed: true, reason: "V22_OWNER_SEND_U4_AFTER_VERIFIED_STOP_ONLY" }
    : deny;
}

function evaluateWp8fSuccessorAction(
  work: Record<string, unknown>,
  action: string,
  target: unknown,
  evidence: unknown,
): ProjectActionDecision {
  const deny = { allowed: false, reason: "V21_MISSING_OR_FAILED_EXACT_GATE" };
  if (
    [
      "COMMIT",
      "PUSH_BRANCH",
      "UPDATE_GITHUB_ROADMAP",
      "PREPARE_EXACT_TEST_DEPLOYMENT",
    ].includes(action)
  )
    return { allowed: true, reason: "V21_OWNER_CHECKPOINT_AUTHORITY" };
  if (
    !successorTarget(target) ||
    !isRecord(evidence) ||
    evidence.provenance !== "INDEPENDENT_OPERATOR_VERIFICATION" ||
    evidence.ownerDecision !== WP8F_V21_COMPLETION.ownerDecision ||
    !Array.isArray(work.wp8fSuccessorOperationJournal)
  )
    return deny;
  // Containment is an authenticated OFF/STOP only operation. A broken health,
  // lineage or settlement check must not trap an otherwise identified TEST pilot ON.
  if (action === "STOP_TEST") {
    const identity = evidence.test;
    return isRecord(identity) &&
      identity.account === WP8F_V21_COMPLETION.account &&
      identity.worker === WP8F_V21_COMPLETION.worker &&
      identity.environment === "TEST_ONLY" &&
      identity.accountIdentityVerified === true &&
      typeof identity.observedAt === "number" &&
      Number.isSafeInteger(identity.observedAt) &&
      identity.observedAt <= Date.now() &&
      Date.now() - identity.observedAt <=
        WP8F_V21_COMPLETION.freshObservationMaximumAgeMs
      ? { allowed: true, reason: "V21_EXACT_TEST_CONTAINMENT" }
      : deny;
  }
  if (!successorObservation(evidence.test)) return deny;
  const journal: unknown[] = work.wp8fSuccessorOperationJournal;
  const deploys = journal.filter(
    (row) => isRecord(row) && row.action === "DEPLOY_TEST",
  );
  const closes = journal.filter(
    (row) => isRecord(row) && row.action === "CLOSE_OWNER_HANDOFF",
  );
  const continuations = journal.filter(
    (row) => isRecord(row) && row.action === "OPEN_CONTINUATION",
  );
  const test = evidence.test;
  if (!successorCandidate(evidence)) return deny;
  const operation = evidence.operation;
  const next = (kind: string, count: number) =>
    isRecord(operation) &&
    operation.action === kind &&
    validOperationRef(operation.operationRef) &&
    operation.attempt === count + 1 &&
    operation.persistedAttemptsVerified === true &&
    JSON.stringify(operation.observedJournal) === JSON.stringify(journal) &&
    operation.noPriorUnrecordedInvocation === true &&
    isFullSha(operation.evidenceSha256, 64) &&
    validateSuccessorOperationJournal(
      [
        ...journal,
        {
          action: kind,
          operationRef: operation.operationRef,
          attempt: operation.attempt,
          startedAt: new Date(Date.now()).toISOString(),
          evidenceSha256: operation.evidenceSha256,
        },
      ],
      journal,
    );
  if (
    action === "DEPLOY_TEST" ||
    action === "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS"
  ) {
    const g = WP8F_V21_COMPLETION;
    return deploys.length === 0 &&
      journal.length === 0 &&
      next("DEPLOY_TEST", 0) &&
      successorClosedBaseline(test) &&
      test.ownerMode === "HUMAN_HANDOFF" &&
      test.version === g.predecessorVersion &&
      test.sourceCommit === g.predecessorSource &&
      test.artifactSha256 === g.predecessorArtifact &&
      test.deliverySchema ===
        "ABSENT_IN_ACTIVE_SOURCE_BY_DIRECT_STORAGE_OBSERVATION" &&
      test.pendingDeliveryClaims === null &&
      test.legacyUndeliveredEvents === 0 &&
      test.legacyUndeliveredPlans === 0 &&
      test.legacyInventoryVerified === true &&
      successorContainment(evidence.containment)
      ? { allowed: true, reason: "V21_ONE_EXACT_TEST_DEPLOYMENT_READY" }
      : deny;
  }
  if (action === "CLOSE_OWNER_HANDOFF") {
    if (
      deploys.length !== 1 ||
      continuations.length !== 0 ||
      closes.length >= 3 ||
      !next(action, closes.length) ||
      !successorClosedBaseline(test) ||
      !successorPostDeploy(test, evidence) ||
      !isRecord(operation) ||
      typeof test.handoffGeneration !== "number" ||
      !Number.isSafeInteger(test.handoffGeneration) ||
      test.handoffGeneration < 1 ||
      operation.expectedGeneration !== test.handoffGeneration
    )
      return deny;
    const receipt = evidence.handoffClose;
    const replay = closes.length > 0;
    if (replay) {
      const prior = closes[0];
      if (
        !isRecord(prior) ||
        prior.operationRef !== operation.operationRef ||
        !isRecord(receipt) ||
        receipt.operationRef !== operation.operationRef ||
        receipt.generation !== test.handoffGeneration ||
        receipt.sameOriginalResult !== true ||
        !validOperationRef(receipt.receiptId) ||
        test.ownerMode !== "BOT_ACTIVE" ||
        test.handoffCloseState !== "CONVERSATION_CLOSED"
      )
        return deny;
    } else if (
      test.ownerMode !== "HUMAN_HANDOFF" ||
      test.handoffCloseState !== "NONE"
    )
      return deny;
    return {
      allowed: true,
      reason: "V21_ONE_LOGICAL_OWNER_CLOSE_SAME_OPERATION_ONLY",
    };
  }
  if (action === "OPEN_CONTINUATION") {
    const close = evidence.handoffClose,
      prior = closes[0];
    return deploys.length === 1 &&
      closes.length >= 1 &&
      continuations.length === 0 &&
      next(action, 0) &&
      successorClosedBaseline(test) &&
      successorPostDeploy(test, evidence) &&
      test.ownerMode === "BOT_ACTIVE" &&
      test.handoffCloseState === "COMPLETE" &&
      test.handoffRegistryActive === 0 &&
      test.activationEligibility === true &&
      test.continuationMarkers === 0 &&
      isRecord(close) &&
      isRecord(prior) &&
      close.operationRef === prior.operationRef &&
      close.generation === test.handoffGeneration &&
      validOperationRef(close.receiptId) &&
      close.sameOriginalResult === true &&
      close.registryReceiptVerified === true &&
      close.historyDraftsAccountingAndOtherConversationsUnchanged === true
      ? { allowed: true, reason: "V21_ONE_EXACT_OWNER_CONTINUATION" }
      : deny;
  }
  if (action === "OWNER_KILL_SWITCH_CASE") {
    const uat = evidence.uat,
      stop = evidence.stop;
    return deploys.length === 1 &&
      continuations.length === 1 &&
      test.sourceCommit === WP8F_V21_COMPLETION.sourceCommit &&
      test.artifactSha256 === WP8F_V21_COMPLETION.artifactSha256 &&
      test.pilot === "STOPPED" &&
      test.aiAdmission === false &&
      test.reservedMicroUsd === 0 &&
      test.inFlight === 0 &&
      test.pendingAttempts === 0 &&
      test.pendingDeliveryClaims === 0 &&
      test.activeDeliveryClaims === 0 &&
      test.orphanDeliveryClaims === 0 &&
      isRecord(stop) &&
      typeof stop.aiDisabledAt === "number" &&
      typeof stop.pilotStoppedAt === "number" &&
      stop.aiDisabledAt <= stop.pilotStoppedAt &&
      stop.pilotStoppedAt <= Date.now() &&
      stop.authenticatedReceiptsVerified === true &&
      stop.providerAttemptsSinceStop === 0 &&
      stop.lateReplies === 0 &&
      isRecord(uat) &&
      uat.exactOwnerChatVerified === true &&
      uat.expectedRouteAndReplyRecorded === true &&
      uat.priorCaseBackendAndVisibleEvidenceVerified === true &&
      uat.ownerSendsOneMessage === true &&
      uat.noStopCondition === true &&
      uat.killSwitchCaseNotPreviouslySent === true &&
      uat.noReplacementSession === true
      ? { allowed: true, reason: "V21_SINGLE_POST_STOP_OWNER_VERIFICATION" }
      : deny;
  }
  if (action === "OWNER_UAT_NEXT_CASE") {
    const session = evidence.session,
      uat = evidence.uat;
    return deploys.length === 1 &&
      continuations.length === 1 &&
      test.sourceCommit === WP8F_V21_COMPLETION.sourceCommit &&
      test.artifactSha256 === WP8F_V21_COMPLETION.artifactSha256 &&
      test.pilot === "ACTIVE" &&
      test.aiAdmission === true &&
      test.ownerMode === "BOT_ACTIVE" &&
      test.inFlight === 0 &&
      test.pendingAttempts === 0 &&
      test.reservedMicroUsd === 0 &&
      test.pendingDeliveryClaims === 0 &&
      test.activeDeliveryClaims === 0 &&
      test.orphanDeliveryClaims === 0 &&
      typeof test.events === "number" &&
      test.events >= 6 &&
      test.events < 200 &&
      typeof test.attempts === "number" &&
      test.attempts >= 6 &&
      test.attempts < 200 &&
      typeof test.consumedMicroUsd === "number" &&
      test.consumedMicroUsd >= 34082 &&
      test.consumedMicroUsd < 5000000 &&
      isRecord(session) &&
      session.ownerLineageVerified === true &&
      session.activeSessions === 1 &&
      session.continuationMarkers === 1 &&
      session.maximumConcurrency === 1 &&
      typeof session.startedAt === "number" &&
      typeof session.expiresAt === "number" &&
      session.startedAt <= Date.now() &&
      session.expiresAt > Date.now() &&
      session.expiresAt - session.startedAt > 0 &&
      session.expiresAt - session.startedAt <= 3600000 &&
      isRecord(uat) &&
      uat.acceptanceCriteriaUnchanged === true &&
      uat.exactOwnerChatVerified === true &&
      uat.expectedRouteAndReplyRecorded === true &&
      uat.priorCaseBackendAndVisibleEvidenceVerified === true &&
      uat.noStopCondition === true &&
      uat.humanHandoffIsLastConversationCase === true &&
      uat.ownerSendsOneMessage === true
      ? { allowed: true, reason: "V21_ONE_OWNER_MESSAGE_THEN_VERIFY" }
      : deny;
  }
  if (
    [
      "CREATE_DRAFT_PR",
      "CREATE_PR",
      "MERGE_DEFAULT_BRANCH",
      "CLOSE_ISSUE",
    ].includes(action)
  ) {
    const final = evidence.finalReview;
    if (
      !isRecord(final) ||
      deploys.length !== 1 ||
      continuations.length !== 1 ||
      test.sourceCommit !== WP8F_V21_COMPLETION.sourceCommit ||
      test.artifactSha256 !== WP8F_V21_COMPLETION.artifactSha256 ||
      test.pilot !== "STOPPED" ||
      test.aiAdmission !== false ||
      test.reservedMicroUsd !== 0 ||
      test.inFlight !== 0 ||
      test.pendingAttempts !== 0 ||
      test.pendingDeliveryClaims !== 0 ||
      test.activeDeliveryClaims !== 0 ||
      test.orphanDeliveryClaims !== 0 ||
      final.acceptanceCriteriaUnchanged !== true ||
      final.testAcceptance !== "PASS" ||
      final.ownerUat !== "PASS" ||
      final.killSwitch !== "PASS" ||
      final.fencedRecovery !== "PASS" ||
      final.securityReview !== "PASS" ||
      final.findingsOpen !== 0 ||
      final.providerAttemptsAfterStop !== 0 ||
      final.lateReplies !== 0 ||
      final.accountingAndHistoryPreserved !== true ||
      final.handoffStateReported !== true ||
      final.productionTouched !== false ||
      !isFullSha(final.releaseCommit, 40) ||
      final.reviewedCommit !== final.releaseCommit ||
      final.runtimeEquivalentToFrozenCandidate !== true ||
      final.ciHead !== final.releaseCommit ||
      final.ciConclusion !== "success" ||
      !isFullSha(final.acceptanceEvidenceSha256, 64) ||
      !isFullSha(final.recoveryEvidenceSha256, 64) ||
      !isFullSha(final.securityEvidenceSha256, 64) ||
      final.defaultDriftReviewed !== true ||
      final.conflicts !== false
    )
      return deny;
    if (action === "MERGE_DEFAULT_BRANCH" || action === "CLOSE_ISSUE") {
      const integration = evidence.integration;
      if (
        !isRecord(integration) ||
        integration.repository !== "Eak-dev/malispang-lineOA" ||
        integration.baseBranch !== "codex/phase-1a-foundation" ||
        !isFullSha(integration.baseCommit, 40) ||
        integration.headBranch !== "codex/mp-06-guardrailed-ai" ||
        integration.headCommit !== final.releaseCommit ||
        integration.freshRemoteHeadsVerified !== true ||
        integration.requiredChecksPassed !== true ||
        integration.reviewPassed !== true ||
        integration.unresolvedFindings !== 0 ||
        integration.mergeMethod !== "merge" ||
        typeof integration.pullRequest !== "number" ||
        !Number.isSafeInteger(integration.pullRequest) ||
        integration.pullRequest <= 14
      )
        return deny;
      if (
        action === "CLOSE_ISSUE" &&
        (integration.merged !== true ||
          !isFullSha(integration.mergeCommit, 40) ||
          integration.postMergeChecks !== "PASS" ||
          integration.acceptanceMatrixUpdated !== true ||
          integration.issue !== 12 ||
          integration.roadmapUpdated !== true)
      )
        return deny;
    }
    return {
      allowed: true,
      reason: "V21_OWNER_CONDITIONAL_TEST_INTEGRATION_GATE_PASS",
    };
  }
  return { allowed: false, reason: "UNKNOWN_OR_FORBIDDEN_ACTION" };
}
