export const EXPECTED_TEST_ALERT_SIGNALS = [
  "ENVIRONMENT_OR_DESTINATION_GUARD_FAILURE",
  "PII_OR_RAW_TEXT_LOG_SIGNAL",
  "UNSUPPORTED_CLAIM_OR_PARTIAL_AUTO",
  "AUTHORITY_FAIL_CLOSED_BREACH",
  "DUPLICATE_RESPONSE",
  "WEBHOOK_ERROR",
  "RATE_BUDGET_EXCEEDED",
] as const;

const EXPECTED_TEST_ALERTS: Readonly<
  Record<
    (typeof EXPECTED_TEST_ALERT_SIGNALS)[number],
    { windowMinutes: number; threshold: number; action: string }
  >
> = {
  ENVIRONMENT_OR_DESTINATION_GUARD_FAILURE: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT",
  },
  PII_OR_RAW_TEXT_LOG_SIGNAL: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT",
  },
  UNSUPPORTED_CLAIM_OR_PARTIAL_AUTO: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT",
  },
  AUTHORITY_FAIL_CLOSED_BREACH: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT",
  },
  DUPLICATE_RESPONSE: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT",
  },
  WEBHOOK_ERROR: {
    windowMinutes: 5,
    threshold: 3,
    action: "STOP_TEST_PILOT",
  },
  RATE_BUDGET_EXCEEDED: {
    windowMinutes: 1,
    threshold: 1,
    action: "STOP_TEST_PILOT_AND_DISABLE_TEST_WEBHOOK",
  },
};

export const REQUIRED_SYNTHETIC_COVERAGE = [
  "HAPPY_PATH",
  "AUTO",
  "CLARIFY",
  "STAFF_ONLY",
  "RISKY_REQUEST",
  "RISKY_AUTHORITY",
  "FAIL_CLOSED",
  "INVALID_SIGNATURE",
  "DUPLICATE_EVENT",
  "IDEMPOTENCY",
  "COMPOSITE_RETRY",
  "KILL_SWITCH",
] as const;

const EXPECTED_TEST_WORKER = "malispang-lineoa-test";
const EXPECTED_TEST_DOMAIN = "malispang-lineoa-test.eakkachai-dev.workers.dev";
const EXPECTED_ROLLBACK_VERSION_ID = "3e02e79b-29c9-46cf-9218-ed2d0b7d7655";
const EXPECTED_SYNTHETIC_OUTCOMES: Readonly<
  Record<string, { expectedOutcome: string; expectedSafety: string }>
> = {
  "WP6-SYN-AUTO-001": {
    expectedOutcome: "AUTO",
    expectedSafety: "APPROVED_RESPONSE_UNIT_ONLY",
  },
  "WP6-SYN-CLARIFY-001": {
    expectedOutcome: "CLARIFY_T_C01",
    expectedSafety: "ONE_SHARED_CLARIFICATION_BUDGET",
  },
  "WP6-SYN-STAFF-001": {
    expectedOutcome: "STAFF_ONLY",
    expectedSafety: "NO_PARTIAL_AUTO",
  },
  "WP6-SYN-AUTHORITY-001": {
    expectedOutcome: "STAFF_ONLY",
    expectedSafety: "ATOMIC_FAIL_CLOSED",
  },
  "WP6-SYN-SIGNATURE-001": {
    expectedOutcome: "HTTP_401",
    expectedSafety: "NO_EVENT_PROCESSING",
  },
  "WP6-SYN-DUPLICATE-001": {
    expectedOutcome: "ONE_RESPONSE_ONLY",
    expectedSafety: "NO_DUPLICATE_REPLY",
  },
  "WP6-SYN-IDEMPOTENCY-001": {
    expectedOutcome: "STABLE_RESPONSE_UNIT_PLAN",
    expectedSafety: "NO_RAW_INPUT_IN_FINGERPRINT",
  },
  "WP6-SYN-KILL-001": {
    expectedOutcome: "NO_NEW_TEST_EVENTS",
    expectedSafety: "NO_PRODUCTION_IMPACT",
  },
};

export function validateTestReadinessControls(input: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["TEST_CONTROLS_INVALID"];

  expect(errors, input.schemaVersion, 2, "TEST_CONTROLS_SCHEMA_INVALID");
  expect(errors, input.environment, "TEST", "TEST_ENVIRONMENT_INVALID");
  expect(
    errors,
    input.accountName,
    "มะลิปัง TEST",
    "TEST_ACCOUNT_NAME_INVALID",
  );
  expect(
    errors,
    input.workerName,
    EXPECTED_TEST_WORKER,
    "TEST_WORKER_NAME_INVALID",
  );
  expect(
    errors,
    input.workerDomain,
    EXPECTED_TEST_DOMAIN,
    "TEST_WORKER_DOMAIN_INVALID",
  );
  expect(
    errors,
    input.productionFallbackAllowed,
    false,
    "PRODUCTION_FALLBACK_MUST_BE_FALSE",
  );
  expect(
    errors,
    input.secretValuesStoredInRepository,
    false,
    "SECRET_VALUES_MUST_NOT_BE_STORED",
  );
  expect(
    errors,
    input.controlEnforcement,
    "RUNTIME_DURABLE_OBJECT_ATOMIC_AND_OPERATOR_RUNBOOK",
    "TEST_CONTROL_ENFORCEMENT_INVALID",
  );
  expect(
    errors,
    input.deploymentAuthorization,
    false,
    "TEST_DEPLOYMENT_MUST_REMAIN_FALSE",
  );
  expect(
    errors,
    input.productionStatus,
    "NO_GO",
    "PRODUCTION_STATUS_MUST_REMAIN_NO_GO",
  );

  validatePilotBudget(errors, input.pilotBudget);
  validateRuntimeContract(errors, input.runtimeContract);
  validateAlerts(errors, input.alerts);
  validateStopControl(errors, input.stopControl);
  validateRollback(errors, input.rollback);
  return unique(errors);
}

export function validateSyntheticReadinessFixtures(input: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["SYNTHETIC_FIXTURES_INVALID"];

  expect(errors, input.schemaVersion, 1, "SYNTHETIC_FIXTURE_SCHEMA_INVALID");
  expect(errors, input.syntheticOnly, true, "SYNTHETIC_ONLY_REQUIRED");
  expect(
    errors,
    input.target,
    "LOCAL_AND_FUTURE_TEST_ONLY",
    "SYNTHETIC_FIXTURE_TARGET_INVALID",
  );
  expect(
    errors,
    input.productionRequestsAllowed,
    false,
    "PRODUCTION_REQUESTS_MUST_BE_FALSE",
  );
  expect(
    errors,
    input.ownerUatStatus,
    "NOT_PERFORMED",
    "OWNER_UAT_MUST_NOT_BE_OVERSTATED",
  );
  expect(
    errors,
    input.rollbackRehearsalStatus,
    "NOT_PERFORMED",
    "ROLLBACK_REHEARSAL_MUST_NOT_BE_OVERSTATED",
  );

  const fixtures = Array.isArray(input.fixtures) ? input.fixtures : [];
  if (fixtures.length < 8) errors.push("SYNTHETIC_FIXTURE_COUNT_TOO_SMALL");
  const ids = new Set<string>();
  const coverage = new Set<string>();
  for (const fixture of fixtures) {
    if (!isRecord(fixture)) {
      errors.push("SYNTHETIC_FIXTURE_ENTRY_INVALID");
      continue;
    }
    if (!isNonEmptyString(fixture.fixtureId)) {
      errors.push("SYNTHETIC_FIXTURE_ID_INVALID");
    } else if (ids.has(fixture.fixtureId)) {
      errors.push("SYNTHETIC_FIXTURE_ID_DUPLICATE");
    } else {
      ids.add(fixture.fixtureId);
      const expected = EXPECTED_SYNTHETIC_OUTCOMES[fixture.fixtureId];
      if (
        expected === undefined ||
        fixture.expectedOutcome !== expected.expectedOutcome ||
        fixture.expectedSafety !== expected.expectedSafety
      ) {
        errors.push("SYNTHETIC_FIXTURE_EXPECTED_OUTCOME_DRIFT");
      }
    }
    if (!Array.isArray(fixture.coverage) || fixture.coverage.length === 0) {
      errors.push("SYNTHETIC_FIXTURE_COVERAGE_MISSING");
    } else {
      for (const tag of fixture.coverage) {
        if (typeof tag === "string") coverage.add(tag);
      }
    }
    for (const field of [
      "syntheticInput",
      "precondition",
      "expectedOutcome",
      "expectedSafety",
    ] as const) {
      if (!isNonEmptyString(fixture[field])) {
        errors.push(`SYNTHETIC_FIXTURE_${field.toUpperCase()}_INVALID`);
      }
    }
    if (
      typeof fixture.syntheticInput === "string" &&
      containsForbiddenFixtureData(fixture.syntheticInput)
    ) {
      errors.push("SYNTHETIC_FIXTURE_FORBIDDEN_DATA");
    }
  }
  for (const required of REQUIRED_SYNTHETIC_COVERAGE) {
    if (!coverage.has(required)) {
      errors.push(`SYNTHETIC_FIXTURE_COVERAGE_MISSING_${required}`);
    }
  }
  if (ids.size !== Object.keys(EXPECTED_SYNTHETIC_OUTCOMES).length) {
    errors.push("SYNTHETIC_FIXTURE_SET_INVALID");
  }
  return unique(errors);
}

export function validateActiveBenchmarkTimeoutContract(
  currentWork: unknown,
  benchmarkSource: string,
): string[] {
  const errors: string[] = [];
  if (!isRecord(currentWork)) return ["CURRENT_WORK_INVALID"];
  const localPlan = currentWork.localClosureRemediationPlan;
  const closurePlan = currentWork.testReadinessConditionClosurePlan;
  if (
    !isRecord(localPlan) ||
    !isRecord(localPlan.benchmarkTestTimeoutContract)
  ) {
    errors.push("ACTIVE_TIMEOUT_METADATA_MISSING");
  } else {
    const timeout = localPlan.benchmarkTestTimeoutContract;
    expect(
      errors,
      timeout.currentTimeoutMs,
      300_000,
      "ACTIVE_HOOK_TIMEOUT_DRIFT",
    );
    expect(
      errors,
      timeout.testSpecificTimeoutMs,
      15_000,
      "ACTIVE_TEST_TIMEOUT_DRIFT",
    );
    expect(
      errors,
      timeout.testSpecificTimeoutCount,
      2,
      "ACTIVE_TEST_TIMEOUT_COUNT_DRIFT",
    );
    expect(
      errors,
      timeout.productPerformanceGuarantee,
      false,
      "ACTIVE_TIMEOUT_MUST_NOT_BE_PERFORMANCE_GUARANTEE",
    );
  }
  if (!isRecord(closurePlan) || !isRecord(closurePlan.timeoutContract)) {
    errors.push("CONDITION_CLOSURE_TIMEOUT_METADATA_MISSING");
  } else {
    expect(
      errors,
      closurePlan.timeoutContract.hookWatchdogMs,
      300_000,
      "CLOSURE_HOOK_TIMEOUT_DRIFT",
    );
    expect(
      errors,
      closurePlan.timeoutContract.testSpecificWatchdogMs,
      15_000,
      "CLOSURE_TEST_TIMEOUT_DRIFT",
    );
  }

  if (!/beforeAll\([\s\S]*?300_000\s*,?\s*\);/u.test(benchmarkSource)) {
    errors.push("BENCHMARK_HOOK_WATCHDOG_SOURCE_DRIFT");
  }
  const testSpecificOccurrences =
    benchmarkSource.match(/15_000/gu)?.length ?? 0;
  if (testSpecificOccurrences !== 2) {
    errors.push("BENCHMARK_TEST_WATCHDOG_SOURCE_DRIFT");
  }
  if (
    !benchmarkSource.includes("execution watchdog") ||
    !benchmarkSource.includes("not a product performance guarantee")
  ) {
    errors.push("BENCHMARK_WATCHDOG_EXPLANATION_MISSING");
  }
  return unique(errors);
}

export function validateValidationChainScripts(
  scriptsInput: unknown,
): string[] {
  const errors: string[] = [];
  if (!isRecord(scriptsInput)) return ["PACKAGE_SCRIPTS_INVALID"];
  const scripts = scriptsInput;
  const check = scripts.check;
  if (typeof check !== "string") return ["CHECK_SCRIPT_MISSING"];

  for (const required of [
    "pnpm validate:toolchain",
    "pnpm preview:rich-menu",
    "pnpm format:check",
    "pnpm validate:mp-06-test-readiness",
    "pnpm test",
    "pnpm worker:dry-run",
  ]) {
    if (!check.includes(required)) errors.push("CHECK_SCRIPT_GATE_MISSING");
  }
  if (
    check.indexOf("pnpm preview:rich-menu") > check.indexOf("pnpm format:check")
  ) {
    errors.push("RICH_MENU_PREVIEW_MUST_PRECEDE_FORMAT_CHECK");
  }
  if ((check.match(/pnpm preview:rich-menu/gu) ?? []).length !== 1) {
    errors.push("RICH_MENU_PREVIEW_GATE_COUNT_INVALID");
  }
  if (check.includes("deploy:test") || check.includes("wrangler deploy")) {
    errors.push("DEPLOYMENT_COMMAND_FORBIDDEN_IN_CHECK");
  }
  expect(
    errors,
    scripts["validate:mp-06-test-readiness"],
    "node --import tsx scripts/validate-mp-06-test-readiness.ts",
    "TEST_READINESS_VALIDATOR_SCRIPT_INVALID",
  );
  return unique(errors);
}

export function validateMp06PilotRuntimeSources(
  wranglerSource: string,
  pilotSource: string,
  durableSource: string,
  workerSource: string,
): string[] {
  const errors: string[] = [];
  const requiredWranglerValues = [
    '"MP06_AI_NLU_MODEL": "gpt-5.6-terra"',
    '"MP06_PILOT_CONTROL_ENABLED": "true"',
    '"MP06_PILOT_MAX_TESTERS": "5"',
    '"MP06_PILOT_EVENTS_PER_MINUTE": "20"',
    '"MP06_PILOT_EVENTS_PER_HOUR": "200"',
    '"MP06_PILOT_EVENTS_PER_SESSION": "200"',
    '"MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION": "200"',
    '"MP06_PILOT_SESSION_MINUTES": "60"',
    '"MP06_PILOT_BUDGET_MICRO_USD": "5000000"',
    '"MP06_PILOT_MAX_CONCURRENCY": "1"',
  ];
  if (requiredWranglerValues.some((value) => !wranglerSource.includes(value))) {
    errors.push("WP8A_WRANGLER_PILOT_CONTRACT_DRIFT");
  }
  if (wranglerSource.includes('"MP06_AI_NLU_ENABLED": "true"')) {
    errors.push("WP8A_STATIC_AI_ENABLE_FORBIDDEN");
  }
  for (const [source, markers, code] of [
    [
      pilotSource,
      [
        'MP06_PILOT_CONTROL_OBJECT_NAME = "mp06-pilot-control-v1"',
        "MP06_PILOT_BUDGET_MICRO_USD = 5_000_000",
        "MP06_PILOT_MAX_CONCURRENCY = 1",
        "estimateMp06AttemptUpperBoundMicroUsd",
      ],
      "WP8A_PILOT_MODULE_CONTRACT_DRIFT",
    ],
    [
      durableSource,
      [
        "transactionSync",
        "mp06_pilot_session",
        "reserveMp06PilotAttempt",
        "authorizeMp06PilotDispatch",
        "settleMp06PilotAttempt",
        "authorizeMp06PilotResult",
      ],
      "WP8A_DURABLE_COORDINATOR_CONTRACT_DRIFT",
    ],
    [
      workerSource,
      [
        "/admin/mp06-pilot/activate",
        "/admin/mp06-pilot/stop",
        "admitMp06PilotAiEvent",
        "dispatchWasAuthorized",
      ],
      "WP8A_WEBHOOK_ADMISSION_CONTRACT_DRIFT",
    ],
  ] as const) {
    if (markers.some((marker) => !source.includes(marker))) errors.push(code);
  }
  return unique(errors);
}

function validatePilotBudget(errors: string[], value: unknown): void {
  if (!isRecord(value)) {
    errors.push("TEST_PILOT_BUDGET_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "audience",
      "OWNER_APPROVED_INTERNAL_TESTERS_ONLY",
      "TEST_AUDIENCE_INVALID",
    ],
    ["maximumTesters", 5, "TEST_MAXIMUM_TESTERS_INVALID"],
    ["maximumAcceptedWebhookEventsPerMinute", 20, "TEST_MINUTE_RATE_INVALID"],
    ["maximumAcceptedWebhookEventsPerHour", 200, "TEST_HOURLY_RATE_INVALID"],
    [
      "maximumAcceptedWebhookEventsPerSession",
      200,
      "TEST_SESSION_EVENT_LIMIT_INVALID",
    ],
    [
      "maximumProviderAttemptsPerSession",
      200,
      "TEST_PROVIDER_ATTEMPT_LIMIT_INVALID",
    ],
    ["maximumPilotSessionMinutes", 60, "TEST_SESSION_LIMIT_INVALID"],
    ["maximumBudgetMicroUsd", 5_000_000, "TEST_BUDGET_LIMIT_INVALID"],
    ["maximumConcurrentProviderRequests", 1, "TEST_CONCURRENCY_LIMIT_INVALID"],
    [
      "runtimeRateLimiterPresent",
      true,
      "TEST_RUNTIME_LIMITER_EVIDENCE_INVALID",
    ],
    [
      "exceededAction",
      "STOP_TEST_PILOT_AND_DISABLE_TEST_WEBHOOK",
      "TEST_RATE_EXCEEDED_ACTION_INVALID",
    ],
  ] as const) {
    expect(errors, value[field], expected, code);
  }
  if (!isNonEmptyString(value.rationale))
    errors.push("TEST_RATE_RATIONALE_MISSING");
}

function validateRuntimeContract(errors: string[], value: unknown): void {
  if (!isRecord(value)) {
    errors.push("TEST_RUNTIME_CONTRACT_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    [
      "coordinatorBinding",
      "CONVERSATION_STATE",
      "TEST_COORDINATOR_BINDING_INVALID",
    ],
    [
      "coordinatorObjectName",
      "mp06-pilot-control-v1",
      "TEST_COORDINATOR_NAME_INVALID",
    ],
    ["storage", "SQLITE_DURABLE_OBJECT", "TEST_COORDINATOR_STORAGE_INVALID"],
    [
      "atomicBoundary",
      "TRANSACTION_SYNC",
      "TEST_COORDINATOR_ATOMICITY_INVALID",
    ],
    [
      "featureDefault",
      "OFF_WITHOUT_ACTIVE_AUTHENTICATED_SESSION",
      "TEST_FEATURE_DEFAULT_INVALID",
    ],
    [
      "identitySource",
      "VERIFIED_LINE_USER_SOURCE",
      "TEST_IDENTITY_SOURCE_INVALID",
    ],
    [
      "testerReferencesCommitted",
      false,
      "TESTER_REFERENCES_MUST_NOT_BE_COMMITTED",
    ],
    [
      "providerDispatchRequiresReservation",
      true,
      "TEST_DISPATCH_RESERVATION_INVALID",
    ],
    ["resultRequiresActiveSessionRecheck", true, "TEST_RESULT_RECHECK_INVALID"],
    [
      "unknownUsageAction",
      "CONSUME_RESERVATION_AND_STOP_SESSION",
      "TEST_UNKNOWN_USAGE_ACTION_INVALID",
    ],
  ] as const) {
    expect(errors, value[field], expected, code);
  }
  if (
    !Array.isArray(value.allowedConversationTypes) ||
    value.allowedConversationTypes.length !== 1 ||
    value.allowedConversationTypes[0] !== "USER"
  ) {
    errors.push("TEST_ALLOWED_CONVERSATION_TYPES_INVALID");
  }
}

function validateAlerts(errors: string[], input: unknown): void {
  const alerts = Array.isArray(input) ? input : [];
  if (alerts.length !== EXPECTED_TEST_ALERT_SIGNALS.length) {
    errors.push("TEST_ALERT_SET_INVALID");
    return;
  }
  const seen = new Set<string>();
  for (const alert of alerts) {
    if (!isRecord(alert) || typeof alert.signal !== "string") {
      errors.push("TEST_ALERT_INVALID");
      continue;
    }
    seen.add(alert.signal);
    const expected =
      EXPECTED_TEST_ALERTS[
        alert.signal as (typeof EXPECTED_TEST_ALERT_SIGNALS)[number]
      ];
    if (
      expected === undefined ||
      alert.windowMinutes !== expected.windowMinutes ||
      alert.threshold !== expected.threshold
    ) {
      errors.push("TEST_ALERT_THRESHOLD_INVALID");
    }
    if (
      expected === undefined ||
      alert.action !== expected.action ||
      alert.ownerRole !== "TEST_MONITOR"
    ) {
      errors.push("TEST_ALERT_ACTION_OR_OWNER_INVALID");
    }
  }
  for (const signal of EXPECTED_TEST_ALERT_SIGNALS) {
    if (!seen.has(signal)) errors.push("TEST_ALERT_SET_INVALID");
  }
}

function validateStopControl(errors: string[], value: unknown): void {
  if (!isRecord(value)) {
    errors.push("TEST_STOP_CONTROL_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    ["decisionOwnerRole", "OWNER_PO", "TEST_STOP_OWNER_INVALID"],
    ["executorRole", "TEST_DEPLOYMENT_OPERATOR", "TEST_STOP_EXECUTOR_INVALID"],
    ["monitorRole", "TEST_MONITOR", "TEST_STOP_MONITOR_INVALID"],
    ["maximumDecisionMinutes", 5, "TEST_STOP_DECISION_TARGET_INVALID"],
    [
      "killSwitchProcedure",
      "AUTHENTICATED_TEST_ADMIN_STOP_THEN_DISABLE_TEST_WEBHOOK_IF_REQUIRED",
      "TEST_KILL_SWITCH_INVALID",
    ],
    ["testNamespaceOnly", true, "TEST_STOP_NAMESPACE_INVALID"],
    ["productionImpact", "NONE", "TEST_STOP_PRODUCTION_IMPACT_INVALID"],
    [
      "missingOrMalformedControl",
      "BLOCK_SEPARATE_TEST_DEPLOYMENT_AUTHORIZATION",
      "TEST_STOP_FAIL_CLOSED_INVALID",
    ],
  ] as const) {
    expect(errors, value[field], expected, code);
  }
  if (!hasNonEmptyStringArray(value.automaticFailClosedSignals)) {
    errors.push("TEST_AUTOMATIC_STOP_SIGNALS_MISSING");
  }
  if (!hasNonEmptyStringArray(value.manualStopTriggers)) {
    errors.push("TEST_MANUAL_STOP_TRIGGERS_MISSING");
  }
}

function validateRollback(errors: string[], value: unknown): void {
  if (!isRecord(value)) {
    errors.push("TEST_ROLLBACK_MISSING");
    return;
  }
  for (const [field, expected, code] of [
    ["workerName", EXPECTED_TEST_WORKER, "TEST_ROLLBACK_WORKER_INVALID"],
    ["rollbackTargetVersionNumber", 21, "TEST_ROLLBACK_VERSION_INVALID"],
    [
      "rollbackTargetVersionId",
      EXPECTED_ROLLBACK_VERSION_ID,
      "TEST_ROLLBACK_TARGET_INVALID",
    ],
    ["decisionOwnerRole", "OWNER_PO", "TEST_ROLLBACK_OWNER_INVALID"],
    [
      "executorRole",
      "TEST_DEPLOYMENT_OPERATOR",
      "TEST_ROLLBACK_EXECUTOR_INVALID",
    ],
    ["maximumDecisionMinutes", 5, "TEST_ROLLBACK_DECISION_TARGET_INVALID"],
    ["maximumRecoveryMinutes", 15, "TEST_ROLLBACK_RECOVERY_TARGET_INVALID"],
    [
      "fallbackIfTargetUnavailable",
      "DISABLE_TEST_WEBHOOK_AND_ABORT",
      "TEST_ROLLBACK_FALLBACK_INVALID",
    ],
    ["rehearsalStatus", "NOT_PERFORMED", "TEST_ROLLBACK_REHEARSAL_OVERSTATED"],
    ["productionImpact", "NONE", "TEST_ROLLBACK_PRODUCTION_IMPACT_INVALID"],
  ] as const) {
    expect(errors, value[field], expected, code);
  }
  for (const [field, code] of [
    ["triggers", "TEST_ROLLBACK_TRIGGERS_MISSING"],
    ["verificationSteps", "TEST_ROLLBACK_VERIFICATION_MISSING"],
    ["abortConditions", "TEST_ROLLBACK_ABORT_CONDITIONS_MISSING"],
  ] as const) {
    if (!hasNonEmptyStringArray(value[field])) errors.push(code);
  }
}

function containsForbiddenFixtureData(value: string): boolean {
  return (
    /https?:\/\//iu.test(value) ||
    /\bU[0-9a-f]{32}\b/iu.test(value) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(value) ||
    /(?:^|\D)0\d{8,9}(?:\D|$)/u.test(value)
  );
}

function hasNonEmptyStringArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isNonEmptyString(item))
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expect(
  errors: string[],
  actual: unknown,
  expected: unknown,
  code: string,
): void {
  if (actual !== expected) errors.push(code);
}

function unique(errors: string[]): string[] {
  return [...new Set(errors)].sort();
}
