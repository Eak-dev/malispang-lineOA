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
  "CHANGE_MP_06_RUNTIME",
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
  "USE_AI_PROVIDER",
  "INTEGRATE_AI_MODEL",
  "CHANGE_AI_PROMPT",
  "READ_OR_CHANGE_API_KEY",
  "READ_OR_CHANGE_SECRETS",
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
  "CHANGE_CLOUDFLARE",
  "CHANGE_WEBHOOK",
  "CHANGE_RICH_MENU",
  "CHANGE_REWARD_CARD",
  "OPEN_OR_CHANGE_PRODUCTION",
  "STORE_PII_RAW_CHAT_TOKEN_OR_SECRET",
] as const;

const REQUIRED_WP5_SCOPE = [
  "MP_06_WP5_PIN_NODE_JS_24_19_0",
  "MP_06_WP5_PIN_PNPM_11_19_0",
  "MP_06_WP5_TOOLCHAIN_DECLARATIONS",
  "MP_06_WP5_TOOLCHAIN_FAIL_FAST_VALIDATOR",
  "MP_06_WP5_TOOLCHAIN_REGRESSION_TESTS",
  "MP_06_WP5_DEVELOPER_DOCUMENTATION",
  "MP_06_WP5_ALIGN_EXISTING_CI_IF_PRESENT",
  "MP_06_WP5_CLEAN_CHECKOUT_REPRODUCIBILITY",
  "MP_06_WP5_READ_ONLY_BENCHMARK_VERIFICATION",
  "MP_06_WP5_GITHUB_RECONCILIATION",
  "MP_06_WP5_PREPARE_PR_REVIEW_EVIDENCE",
  "MP_06_WP5_BENCHMARK_TEST_TIMEOUT_ONLY",
  "RUNTIME_READ_ONLY",
  "POLICY_SNAPSHOT_READ_ONLY",
  "DATASET_EXPECTED_CASES_READ_ONLY",
  "INDEPENDENT_ORACLE_READ_ONLY",
  "BENCHMARK_SEMANTICS_READ_ONLY",
  "ACCEPTANCE_THRESHOLDS_READ_ONLY",
  "APPROVED_KNOWLEDGE_BASE_READ_ONLY",
  "APPROVED_PRODUCT_CATALOG_READ_ONLY",
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
const EXPECTED_WP5_CONTROL_BASE_COMMIT =
  "9b39f22a79e1e8112abb731daf441a6feb09f8d8";
const EXPECTED_NODE_VERSION = "24.19.0";
const EXPECTED_PNPM_VERSION = "11.19.0";
const EXPECTED_WP5_IMPLEMENTATION_FILES = [
  "package.json",
  ".npmrc",
  ".node-version",
  "scripts/validate-toolchain.mjs",
  "tests/toolchain-contract.test.ts",
  "README.md",
  "docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md",
] as const;
const EXPECTED_WP5_TIMEOUT_REMEDIATION_FILES = [
  "tests/mp-06-wp2-benchmark.test.ts",
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
    "2026.09.06-v2",
    "ROADMAP_VERSION_UNVERIFIED",
  );
  expectEqual(errors, roadmap.status, "ACTIVE", "ROADMAP_NOT_ACTIVE");

  if (!isRecord(roadmap.ownerDecision)) {
    errors.push("OWNER_DECISION_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.ownerDecision.decisionId,
      "MP-OD-2026-09-06-V2",
      "OWNER_DECISION_ID_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.decidedAt,
      "2026-09-06",
      "OWNER_DECISION_DATE_INVALID",
    );
    expectEqual(
      errors,
      roadmap.ownerDecision.supersedes,
      "2026.09.06-v1",
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
      EXPECTED_WP5_CONTROL_BASE_COMMIT,
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
    "WP5_LOCAL_CLOSURE_REMEDIATION",
    "CURRENT_WORK_PHASE_INVALID",
  );
  expectEqual(
    errors,
    currentWork.status,
    "AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY",
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
    "WP5",
    "AUTHORIZED_WORK_PACKAGE_MUST_BE_WP5",
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
      true,
      "WP5_LOCAL_CLOSURE_REMEDIATION_NOT_AUTHORIZED",
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
    allowedScope.length !== REQUIRED_WP5_SCOPE.length ||
    REQUIRED_WP5_SCOPE.some((scope) => !allowedScope.includes(scope))
  ) {
    errors.push("WP5_SCOPE_INVALID");
  }

  validateWp2BenchmarkReference(errors, currentWork.wp2BenchmarkReference);
  validateBenchmarkCompletionPlan(errors, currentWork.benchmarkCompletionPlan);
  validateLocalClosureRemediationPlan(
    errors,
    currentWork.localClosureRemediationPlan,
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
      reason: "USE_SCOPED_LOCAL_CLOSURE_REMEDIATION_WP5_ACTION",
    };
  }
  const keyByAction: Record<ProjectAction, string> = {
    POLICY_SNAPSHOT: "policySnapshot",
    RUNTIME_WP1: "runtimeWp1",
    BENCHMARK_WP2: "benchmarkWp2",
    RUNTIME_REMEDIATION_WP3: "runtimeRemediationWp3",
    BENCHMARK_COMPLETION_WP4: "benchmarkCompletionWp4",
    LOCAL_CLOSURE_REMEDIATION_WP5: "localClosureRemediationWp5",
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
    ["blocker", "BENCHMARK_TEST_TIMEOUT_HEADROOM", "WP5_BLOCKER_INVALID"],
    [
      "implementationStatus",
      "PREPARED_UNCOMMITTED_AWAITING_TIMEOUT_REMEDIATION",
      "WP5_IMPLEMENTATION_STATUS_INVALID",
    ],
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
      true,
      "WP5_POST_DECISION_OWNER_APPROVAL_REQUIRED",
    );
    expectEqual(
      errors,
      plan.postWp5Decision.authorizedPath,
      null,
      "WP5_POST_DECISION_PATH_MUST_REMAIN_UNSELECTED",
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
      "BENCHMARK_BEFORE_ALL_TIMEOUT_HEADROOM",
      "WP5_TIMEOUT_ROOT_CAUSE_INVALID",
    ],
    ["implementationStatus", "NOT_STARTED", "WP5_TIMEOUT_ALREADY_CHANGED"],
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
    ["currentTimeoutMs", 60_000, "WP5_CURRENT_TIMEOUT_INVALID"],
    ["authorizedTimeoutMs", 120_000, "WP5_AUTHORIZED_TIMEOUT_INVALID"],
    ["maximumTimeoutMs", 120_000, "WP5_MAXIMUM_TIMEOUT_INVALID"],
    ["sequentialRunsRequired", 5, "WP5_TIMEOUT_RUN_COUNT_INVALID"],
    ["allRunsMustCompleteBelowMs", 120_000, "WP5_TIMEOUT_RUN_CEILING_INVALID"],
    ["skippedOrCancelledAllowed", 0, "WP5_TIMEOUT_SKIP_BUDGET_INVALID"],
  ] as const) {
    expectEqual(errors, contract[field], expected, code);
  }

  requireBooleanFields(errors, contract, "WP5_TIMEOUT_CONTRACT", [
    ["hardCeilingNotPerformanceThreshold", true],
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
