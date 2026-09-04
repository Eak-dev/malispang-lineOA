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
  "IMPLEMENT_MP_06",
  "START_MP_07_OR_OTHER_WORK",
  "DEPLOY_TEST",
  "DEPLOY_PRODUCTION",
  "MERGE_DEFAULT_BRANCH",
  "OPEN_OR_CHANGE_PRODUCTION",
  "STORE_PII_RAW_CHAT_TOKEN_OR_SECRET",
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
    "2026.09.04-v1",
    "ROADMAP_VERSION_UNVERIFIED",
  );
  expectEqual(errors, roadmap.status, "ACTIVE", "ROADMAP_NOT_ACTIVE");

  if (!isRecord(roadmap.ownerDecision)) {
    errors.push("OWNER_DECISION_MISSING");
  } else {
    expectEqual(
      errors,
      roadmap.ownerDecision.supersedes,
      "2026.09.02-v4",
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
      "d036063a562a4fa780f162c69f7824ebcb9a250b",
      "VERIFIED_BASELINE_COMMIT_MISMATCH",
    );
    expectEqual(
      errors,
      roadmap.verifiedLatestBaseline.branch,
      "codex/mp-05-roadmap-control",
      "VERIFIED_BASELINE_BRANCH_MISMATCH",
    );
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
    currentWork.status,
    "CURRENT_AWAITING_IMPLEMENTATION_AUTHORIZATION",
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
      "LOCAL_IMPLEMENTATION_MUST_REMAIN_FALSE",
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
      "GITHUB_ROADMAP_UPDATE_NOT_AUTHORIZED",
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
  const keyByAction: Record<ProjectAction, string> = {
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

function validateBenchmark(errors: string[], benchmark: unknown): void {
  if (!isRecord(benchmark)) {
    errors.push("MP_06_BENCHMARK_MISSING");
    return;
  }
  expectEqual(
    errors,
    benchmark.piiFree,
    true,
    "MP_06_BENCHMARK_MUST_BE_PII_FREE",
  );
  minimum(
    errors,
    benchmark.minimumTotal,
    5000,
    "MP_06_BENCHMARK_TOTAL_TOO_SMALL",
  );
  minimum(
    errors,
    benchmark.minimumFunctional,
    3000,
    "MP_06_FUNCTIONAL_TOO_SMALL",
  );
  minimum(
    errors,
    benchmark.minimumThaiLanguageVariation,
    1000,
    "MP_06_THAI_VARIATION_TOO_SMALL",
  );
  minimum(
    errors,
    benchmark.minimumAdversarialSafety,
    1000,
    "MP_06_ADVERSARIAL_TOO_SMALL",
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
    errors.push("MP_06_BENCHMARK_COMPOSITION_BELOW_TOTAL");
  }
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
