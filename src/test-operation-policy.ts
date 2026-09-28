/**
 * Local project-policy advice only. This module neither executes an operation nor
 * authenticates caller facts, history, recovery evidence, or tool permission.
 * The caller must bind the complete ordered history and exact-action restrictions
 * to the same real operation across tool/chat/session names. There is deliberately
 * no incident-ID reset, recovery override, grant issuer, or persistent ledger here.
 * A new independently established action uses its own facts; relabeling an old
 * action does not establish independence. External gates remain unevaluated.
 */
const operations = [
  "LOCAL_ISOLATED_WORK",
  "BROWSER_PREPARATION",
  "BROWSER_NAVIGATION",
  "REMOTE_SQL",
  "REMOTE_LINE",
  "REMOTE_PROVIDER",
  "REMOTE_CONFIG",
  "REMOTE_OTHER",
] as const;
const outcomes = [
  "NOT_STARTED",
  "SUCCEEDED",
  "FAILED_WITH_KNOWN_EFFECTS",
  "UNKNOWN",
  "IN_FLIGHT",
  "SAFETY_DENIED",
] as const;

export type TestOperationKind = (typeof operations)[number];
export type TestOperationOutcome = (typeof outcomes)[number];

export interface TestOperationAttempt {
  /** One-based ordinal, including a technical attempt that never executed. */
  readonly number: number;
  readonly operation: TestOperationKind;
  readonly outcome: TestOperationOutcome;
  /** Relevant business/external effects; harmless isolated fixture/log writes are excluded. */
  readonly effects: "PROVEN_NONE" | "KNOWN_PRESENT" | "UNKNOWN";
}

export interface TestOperationPolicyInput {
  readonly operation: TestOperationKind;
  readonly environment: "LOCAL" | "TEST" | "PRODUCTION" | "UNKNOWN";
  readonly scope: "IN_SCOPE" | "OUT_OF_SCOPE" | "UNKNOWN";
  readonly target: "MATCHED" | "MISMATCH" | "UNKNOWN";
  /**
   * Relevant business/external effects across the full path, including reload
   * requests/DO constructors. Isolated local test fixtures/logs are not external
   * effects; PROVEN_NONE is not a claim that no local bytes can be written.
   */
  readonly sideEffects: "PROVEN_NONE" | "POSSIBLE" | "UNKNOWN";
  readonly restriction:
    | "NONE_RECORDED"
    | "SAFETY_DENIED"
    | "EXACT_ACTION_HELD"
    | "HISTORICAL_ONE_SHOT";
  /** All attempts for this logical operation; count is derived, never reset here. */
  readonly attempts: readonly TestOperationAttempt[];
}

export interface TestOperationPolicyDecision {
  readonly projectDisposition:
    | "CONTINUE_LOCAL_WORK"
    | "PROCEED_HARMLESS_STEP"
    | "RETRY_HARMLESS_PREPARATION"
    | "ADVANCE_WITHOUT_REPLAY"
    | "DIAGNOSE"
    | "RECONCILE"
    | "WAIT"
    | "DENY"
    | "EXTERNAL_GATES_REQUIRED";
  readonly reason:
    | "MALFORMED_INPUT"
    | "SCOPE_NOT_VERIFIED"
    | "TARGET_NOT_VERIFIED"
    | "ENVIRONMENT_NOT_AUTHORIZED"
    | "EXACT_ACTION_HOLD_UNCHANGED"
    | "SAFETY_DENIAL_UNCHANGED"
    | "LOGICAL_OPERATION_RELABELED"
    | "IN_FLIGHT_NO_DUPLICATE"
    | "UNKNOWN_OUTCOME_NO_BLIND_RETRY"
    | "REPLAY_AFTER_SUCCESS"
    | "COMPLETED_ACTION_ADVANCE"
    | "HISTORICAL_GRANT_UNCHANGED"
    | "KNOWN_EFFECTS_REQUIRE_RECONCILIATION"
    | "REMOTE_FAILURE_REQUIRES_RECONCILIATION"
    | "REMOTE_EXECUTION_NOT_AUTHORIZED"
    | "SIDE_EFFECTS_NOT_EXCLUDED"
    | "LOCAL_WORK_HAS_NO_BROWSER_QUOTA"
    | "BROWSER_CAP_REQUIRES_INDEPENDENT_RECOVERY_REVIEW"
    | "NEW_HARMLESS_STEP"
    | "HARMLESS_RETRY_WITHIN_INCIDENT_CAP";
  readonly remoteExecutionAuthorized: false;
  readonly externalGates: "NOT_EVALUATED";
}

function closedRecord(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === fields.length &&
    fields.every((field) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      return descriptor !== undefined && "value" in descriptor;
    })
  );
}

function member(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && allowed.includes(value);
}

function validInput(value: unknown): value is TestOperationPolicyInput {
  if (
    !closedRecord(value, [
      "operation",
      "environment",
      "scope",
      "target",
      "sideEffects",
      "restriction",
      "attempts",
    ]) ||
    !member(value.operation, operations) ||
    !member(value.environment, ["LOCAL", "TEST", "PRODUCTION", "UNKNOWN"]) ||
    !member(value.scope, ["IN_SCOPE", "OUT_OF_SCOPE", "UNKNOWN"]) ||
    !member(value.target, ["MATCHED", "MISMATCH", "UNKNOWN"]) ||
    !member(value.sideEffects, ["PROVEN_NONE", "POSSIBLE", "UNKNOWN"]) ||
    !member(value.restriction, [
      "NONE_RECORDED",
      "SAFETY_DENIED",
      "EXACT_ACTION_HELD",
      "HISTORICAL_ONE_SHOT",
    ]) ||
    !Array.isArray(value.attempts) ||
    Object.getPrototypeOf(value.attempts) !== Array.prototype
  )
    return false;
  // Reject sparse/accessor arrays, custom metadata, and non-contiguous counters.
  if (Reflect.ownKeys(value.attempts).length !== value.attempts.length + 1)
    return false;
  for (let index = 0; index < value.attempts.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value.attempts, index);
    if (!descriptor || !("value" in descriptor)) return false;
    const attempt: unknown = descriptor.value;
    if (
      !closedRecord(attempt, ["number", "operation", "outcome", "effects"]) ||
      !Number.isSafeInteger(attempt.number) ||
      attempt.number !== index + 1 ||
      !member(attempt.operation, operations) ||
      !member(attempt.outcome, outcomes) ||
      !member(attempt.effects, ["PROVEN_NONE", "KNOWN_PRESENT", "UNKNOWN"]) ||
      (attempt.outcome === "NOT_STARTED" &&
        attempt.effects !== "PROVEN_NONE") ||
      (attempt.outcome === "FAILED_WITH_KNOWN_EFFECTS" &&
        attempt.effects === "UNKNOWN")
    )
      return false;
  }
  return true;
}

function decision(
  projectDisposition: TestOperationPolicyDecision["projectDisposition"],
  reason: TestOperationPolicyDecision["reason"],
): TestOperationPolicyDecision {
  return {
    projectDisposition,
    reason,
    remoteExecutionAuthorized: false,
    externalGates: "NOT_EVALUATED",
  };
}

export function evaluateTestOperationPolicy(
  input: unknown,
): TestOperationPolicyDecision {
  // Invalid JSON-like inputs fail closed; accessors are rejected, not executed.
  try {
    if (!validInput(input)) return decision("DENY", "MALFORMED_INPUT");
  } catch {
    return decision("DENY", "MALFORMED_INPUT");
  }
  if (input.scope !== "IN_SCOPE") return decision("DENY", "SCOPE_NOT_VERIFIED");
  if (input.target !== "MATCHED")
    return decision("DENY", "TARGET_NOT_VERIFIED");
  if (
    !["LOCAL", "TEST"].includes(input.environment) ||
    (input.operation === "LOCAL_ISOLATED_WORK" &&
      input.environment !== "LOCAL") ||
    (input.operation.startsWith("REMOTE_") && input.environment !== "TEST")
  )
    return decision("DENY", "ENVIRONMENT_NOT_AUTHORIZED");
  if (input.restriction === "EXACT_ACTION_HELD")
    return decision("DENY", "EXACT_ACTION_HOLD_UNCHANGED");
  if (
    input.restriction === "SAFETY_DENIED" ||
    input.attempts.some((attempt) => attempt.outcome === "SAFETY_DENIED")
  )
    return decision("DENY", "SAFETY_DENIAL_UNCHANGED");
  if (input.attempts.some((attempt) => attempt.operation !== input.operation))
    return decision("DENY", "LOGICAL_OPERATION_RELABELED");
  if (input.attempts.some((attempt) => attempt.outcome === "IN_FLIGHT"))
    return decision("WAIT", "IN_FLIGHT_NO_DUPLICATE");
  if (input.attempts.some((attempt) => attempt.outcome === "UNKNOWN"))
    return decision("RECONCILE", "UNKNOWN_OUTCOME_NO_BLIND_RETRY");
  if (
    input.attempts.some(
      (attempt) =>
        attempt.outcome === "FAILED_WITH_KNOWN_EFFECTS" &&
        attempt.effects === "KNOWN_PRESENT",
    )
  )
    return decision("RECONCILE", "KNOWN_EFFECTS_REQUIRE_RECONCILIATION");
  const succeeded = input.attempts.findIndex(
    (attempt) => attempt.outcome === "SUCCEEDED",
  );
  if (succeeded !== -1)
    return succeeded === input.attempts.length - 1
      ? decision("ADVANCE_WITHOUT_REPLAY", "COMPLETED_ACTION_ADVANCE")
      : decision("DENY", "REPLAY_AFTER_SUCCESS");
  if (input.restriction === "HISTORICAL_ONE_SHOT")
    return decision("EXTERNAL_GATES_REQUIRED", "HISTORICAL_GRANT_UNCHANGED");
  if (input.operation.startsWith("REMOTE_"))
    return input.attempts.some(
      (attempt) => attempt.outcome === "FAILED_WITH_KNOWN_EFFECTS",
    )
      ? decision("RECONCILE", "REMOTE_FAILURE_REQUIRES_RECONCILIATION")
      : decision("EXTERNAL_GATES_REQUIRED", "REMOTE_EXECUTION_NOT_AUTHORIZED");
  // SQL SELECT and browser reload labels never establish absence of effects.
  if (input.sideEffects !== "PROVEN_NONE")
    return decision("DIAGNOSE", "SIDE_EFFECTS_NOT_EXCLUDED");
  if (input.operation === "LOCAL_ISOLATED_WORK")
    return decision("CONTINUE_LOCAL_WORK", "LOCAL_WORK_HAS_NO_BROWSER_QUOTA");
  if (input.attempts.length >= 3)
    return decision(
      "DIAGNOSE",
      "BROWSER_CAP_REQUIRES_INDEPENDENT_RECOVERY_REVIEW",
    );
  return input.attempts.length === 0
    ? decision("PROCEED_HARMLESS_STEP", "NEW_HARMLESS_STEP")
    : decision(
        "RETRY_HARMLESS_PREPARATION",
        "HARMLESS_RETRY_WITHIN_INCIDENT_CAP",
      );
}
