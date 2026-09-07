export const MP06_PILOT_CONTROL_OBJECT_NAME = "mp06-pilot-control-v1";
export const MP06_PILOT_MAX_TESTERS = 5;
export const MP06_PILOT_EVENTS_PER_MINUTE = 20;
export const MP06_PILOT_EVENTS_PER_HOUR = 200;
export const MP06_PILOT_EVENTS_PER_SESSION = 200;
export const MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION = 200;
export const MP06_PILOT_SESSION_DURATION_MS = 60 * 60 * 1_000;
export const MP06_PILOT_BUDGET_MICRO_USD = 5_000_000;
export const MP06_PILOT_MAX_CONCURRENCY = 1;
export const MP06_PILOT_ATTEMPT_LEASE_MS = 15_000;

export interface Mp06PilotControlEnvironment {
  readonly ENVIRONMENT?: string;
  readonly LINE_OA_ACCOUNT_NAME?: string;
  readonly MP06_PILOT_CONTROL_ENABLED?: string;
  readonly MP06_PILOT_MAX_TESTERS?: string;
  readonly MP06_PILOT_EVENTS_PER_MINUTE?: string;
  readonly MP06_PILOT_EVENTS_PER_HOUR?: string;
  readonly MP06_PILOT_EVENTS_PER_SESSION?: string;
  readonly MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION?: string;
  readonly MP06_PILOT_SESSION_MINUTES?: string;
  readonly MP06_PILOT_BUDGET_MICRO_USD?: string;
  readonly MP06_PILOT_MAX_CONCURRENCY?: string;
}

export interface Mp06PilotLimits {
  readonly maximumTesters: typeof MP06_PILOT_MAX_TESTERS;
  readonly eventsPerMinute: typeof MP06_PILOT_EVENTS_PER_MINUTE;
  readonly eventsPerHour: typeof MP06_PILOT_EVENTS_PER_HOUR;
  readonly eventsPerSession: typeof MP06_PILOT_EVENTS_PER_SESSION;
  readonly providerAttemptsPerSession: typeof MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION;
  readonly sessionDurationMs: typeof MP06_PILOT_SESSION_DURATION_MS;
  readonly budgetMicroUsd: typeof MP06_PILOT_BUDGET_MICRO_USD;
  readonly maximumConcurrency: typeof MP06_PILOT_MAX_CONCURRENCY;
  readonly attemptLeaseMs: typeof MP06_PILOT_ATTEMPT_LEASE_MS;
}

export interface ActivateMp06PilotInput {
  readonly sessionRef: string;
  readonly testerRefs: readonly string[];
  readonly now: number;
  readonly limits: Mp06PilotLimits;
}

export interface AdmitMp06PilotEventInput {
  readonly sessionRef: string;
  readonly eventRef: string;
  readonly testerRef: string;
  readonly now: number;
}

export interface ReserveMp06PilotAttemptInput {
  readonly sessionRef: string;
  readonly eventRef: string;
  readonly attemptRef: string;
  readonly upperBoundCostMicroUsd: number;
  readonly now: number;
}

export interface Mp06PilotAttemptInput {
  readonly sessionRef: string;
  readonly eventRef: string;
  readonly attemptRef: string;
  readonly now: number;
}

export interface SettleMp06PilotAttemptInput extends Mp06PilotAttemptInput {
  readonly outcome: "KNOWN" | "USAGE_UNKNOWN";
  readonly actualCostMicroUsd?: number;
}

export type Mp06PilotAdmissionCode =
  | "ADMITTED"
  | "DUPLICATE"
  | "PILOT_INACTIVE"
  | "SESSION_EXPIRED"
  | "TESTER_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "SESSION_LIMIT_REACHED"
  | "CONTROL_UNAVAILABLE";

export interface Mp06PilotAdmissionResult {
  readonly admitted: boolean;
  readonly code: Mp06PilotAdmissionCode;
}

export interface Mp06PilotActivationResult {
  readonly activated: boolean;
  readonly code:
    | "ACTIVATED"
    | "INVALID_ACTIVATION"
    | "PILOT_ALREADY_ACTIVE"
    | "UNRESOLVED_IN_FLIGHT";
  readonly status: Mp06PilotStatus;
}

export interface Mp06PilotStopResult {
  readonly stopped: boolean;
  readonly code: "STOPPED" | "ALREADY_STOPPED" | "PILOT_INACTIVE";
  readonly status: Mp06PilotStatus;
}

export type Mp06PilotAttemptCode =
  | "RESERVED"
  | "DISPATCH_AUTHORIZED"
  | "CANCELLED_BEFORE_DISPATCH"
  | "SETTLED"
  | "SETTLED_IDEMPOTENT"
  | "PILOT_INACTIVE"
  | "SESSION_EXPIRED"
  | "EVENT_NOT_ADMITTED"
  | "ATTEMPT_LIMIT_REACHED"
  | "BUDGET_LIMIT_REACHED"
  | "CONCURRENCY_BUSY"
  | "ATTEMPT_INVALID_STATE"
  | "CONTROL_UNAVAILABLE";

export interface Mp06PilotAttemptResult {
  readonly accepted: boolean;
  readonly code: Mp06PilotAttemptCode;
}

export interface Mp06PilotStatus {
  readonly state: "INACTIVE" | "ACTIVE" | "STOPPED" | "EXPIRED";
  readonly sessionRef?: string;
  readonly startedAt?: number;
  readonly expiresAt?: number;
  readonly admittedEvents: number;
  readonly providerAttempts: number;
  readonly budgetConsumedMicroUsd: number;
  readonly budgetReservedMicroUsd: number;
  readonly inFlight: number;
  readonly stopReason?: string;
}

export interface Mp06PilotCoordinatorAdmission {
  readonly mp06PilotStatus: (now: number) => Promise<Mp06PilotStatus>;
  readonly admitMp06PilotEvent: (
    input: AdmitMp06PilotEventInput,
  ) => Promise<Mp06PilotAdmissionResult>;
}

export async function admitMp06PilotEventThroughCoordinator(
  coordinator: Mp06PilotCoordinatorAdmission,
  input: Omit<AdmitMp06PilotEventInput, "sessionRef">,
): Promise<{
  readonly code: Mp06PilotAdmissionCode;
  readonly sessionRef?: string;
}> {
  try {
    const status = await coordinator.mp06PilotStatus(input.now);
    if (status.state !== "ACTIVE" || !status.sessionRef) {
      return {
        code: status.state === "EXPIRED" ? "SESSION_EXPIRED" : "PILOT_INACTIVE",
      };
    }
    const admission = await coordinator.admitMp06PilotEvent({
      ...input,
      sessionRef: status.sessionRef,
    });
    return admission.admitted
      ? { code: admission.code, sessionRef: status.sessionRef }
      : { code: admission.code };
  } catch {
    return { code: "CONTROL_UNAVAILABLE" };
  }
}

export function mp06PilotLimitsFromEnvironment(
  env: Mp06PilotControlEnvironment,
): Mp06PilotLimits | undefined {
  const exact: readonly [string | undefined, string][] = [
    [env.ENVIRONMENT, "TEST"],
    [env.LINE_OA_ACCOUNT_NAME, "มะลิปัง TEST"],
    [env.MP06_PILOT_CONTROL_ENABLED, "true"],
    [env.MP06_PILOT_MAX_TESTERS, String(MP06_PILOT_MAX_TESTERS)],
    [env.MP06_PILOT_EVENTS_PER_MINUTE, String(MP06_PILOT_EVENTS_PER_MINUTE)],
    [env.MP06_PILOT_EVENTS_PER_HOUR, String(MP06_PILOT_EVENTS_PER_HOUR)],
    [env.MP06_PILOT_EVENTS_PER_SESSION, String(MP06_PILOT_EVENTS_PER_SESSION)],
    [
      env.MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION,
      String(MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION),
    ],
    [
      env.MP06_PILOT_SESSION_MINUTES,
      String(MP06_PILOT_SESSION_DURATION_MS / 60_000),
    ],
    [env.MP06_PILOT_BUDGET_MICRO_USD, String(MP06_PILOT_BUDGET_MICRO_USD)],
    [env.MP06_PILOT_MAX_CONCURRENCY, String(MP06_PILOT_MAX_CONCURRENCY)],
  ];
  if (exact.some(([actual, expected]) => actual !== expected)) return undefined;
  return {
    maximumTesters: MP06_PILOT_MAX_TESTERS,
    eventsPerMinute: MP06_PILOT_EVENTS_PER_MINUTE,
    eventsPerHour: MP06_PILOT_EVENTS_PER_HOUR,
    eventsPerSession: MP06_PILOT_EVENTS_PER_SESSION,
    providerAttemptsPerSession: MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION,
    sessionDurationMs: MP06_PILOT_SESSION_DURATION_MS,
    budgetMicroUsd: MP06_PILOT_BUDGET_MICRO_USD,
    maximumConcurrency: MP06_PILOT_MAX_CONCURRENCY,
    attemptLeaseMs: MP06_PILOT_ATTEMPT_LEASE_MS,
  };
}

export function isMp06PilotReference(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

export function verifiedMp06PilotSender(source: {
  readonly sourceType: "USER" | "GROUP" | "ROOM";
  readonly senderId?: string;
}): string | undefined {
  return source.sourceType === "USER" && typeof source.senderId === "string"
    ? source.senderId
    : undefined;
}

export function isMp06PilotTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function isMp06PilotCost(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function estimateMp06AttemptUpperBoundMicroUsd(
  requestBody: string,
): number {
  // A token cannot contain fewer than one encoded byte. This deliberately
  // over-reserves and includes the full request/schema plus capped output.
  const maximumInputTokens = new TextEncoder().encode(requestBody).byteLength;
  return maximumInputTokens * 2 + 600 * 12;
}

export function mp06UsageCostMicroUsd(
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isSafeInteger(outputTokens) ||
    outputTokens < 0
  ) {
    return undefined;
  }
  const value = inputTokens * 2 + outputTokens * 12;
  return Number.isSafeInteger(value) ? value : undefined;
}
