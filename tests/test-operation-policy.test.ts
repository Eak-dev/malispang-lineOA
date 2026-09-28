import { describe, expect, it } from "vitest";
import {
  evaluateTestOperationPolicy,
  type TestOperationAttempt,
  type TestOperationKind,
  type TestOperationOutcome,
  type TestOperationPolicyInput,
} from "../src/test-operation-policy.js";

function facts(
  operation: TestOperationKind = "BROWSER_PREPARATION",
  outcomes: readonly TestOperationOutcome[] = [],
): TestOperationPolicyInput {
  return {
    operation,
    environment: operation === "LOCAL_ISOLATED_WORK" ? "LOCAL" : "TEST",
    scope: "IN_SCOPE",
    target: "MATCHED",
    sideEffects: "PROVEN_NONE",
    restriction: "NONE_RECORDED",
    attempts: outcomes.map((outcome, index) => ({
      number: index + 1,
      operation,
      outcome,
      effects: "PROVEN_NONE",
    })),
  };
}

function check(input: unknown, disposition: string, reason?: string) {
  const result = evaluateTestOperationPolicy(input);
  expect(result.projectDisposition).toBe(disposition);
  if (reason) expect(result.reason).toBe(reason);
  expect(result.remoteExecutionAuthorized).toBe(false);
  expect(result.externalGates).toBe("NOT_EVALUATED");
}

describe("local TEST operation project policy, never tool authorization", () => {
  it.each([
    [0, "PROCEED_HARMLESS_STEP"],
    [1, "RETRY_HARMLESS_PREPARATION"],
    [2, "RETRY_HARMLESS_PREPARATION"],
    [3, "DIAGNOSE"],
    [4, "DIAGNOSE"],
  ] as const)("accounts for %i total browser attempts", (count, result) => {
    check(
      facts("BROWSER_PREPARATION", Array(count).fill("NOT_STARTED")),
      result,
    );
  });

  it("does not impose a lifetime browser quota on new navigation or local validation", () => {
    check(
      facts("BROWSER_PREPARATION", Array(3).fill("NOT_STARTED")),
      "DIAGNOSE",
    );
    check(facts("BROWSER_NAVIGATION"), "PROCEED_HARMLESS_STEP");
    check(facts("LOCAL_ISOLATED_WORK"), "CONTINUE_LOCAL_WORK");
    check(
      facts("LOCAL_ISOLATED_WORK", Array(5).fill("FAILED_WITH_KNOWN_EFFECTS")),
      "CONTINUE_LOCAL_WORK",
    );
  });

  it("counts a failed repeated navigation as the same incident", () => {
    check(
      facts("BROWSER_NAVIGATION", Array(3).fill("NOT_STARTED")),
      "DIAGNOSE",
    );
  });

  it("permits harmless known-no-effect failure within the cap", () => {
    check(
      facts("BROWSER_PREPARATION", ["FAILED_WITH_KNOWN_EFFECTS"]),
      "RETRY_HARMLESS_PREPARATION",
    );
  });

  it.each([
    "BROWSER_PREPARATION",
    "LOCAL_ISOLATED_WORK",
    "REMOTE_SQL",
  ] as const)("advances completed %s without replay", (operation) =>
    check(facts(operation, ["SUCCEEDED"]), "ADVANCE_WITHOUT_REPLAY"),
  );

  it("rejects a recorded replay after success", () => {
    check(
      facts("BROWSER_PREPARATION", ["SUCCEEDED", "NOT_STARTED"]),
      "DENY",
      "REPLAY_AFTER_SUCCESS",
    );
  });

  it.each([
    "REMOTE_SQL",
    "REMOTE_LINE",
    "REMOTE_PROVIDER",
    "REMOTE_CONFIG",
    "REMOTE_OTHER",
  ] as const)(
    "%s never receives remote authority, even with proven no execution",
    (operation) => {
      check(facts(operation), "EXTERNAL_GATES_REQUIRED");
      check(facts(operation, ["NOT_STARTED"]), "EXTERNAL_GATES_REQUIRED");
      check(
        facts(operation, ["UNKNOWN"]),
        "RECONCILE",
        "UNKNOWN_OUTCOME_NO_BLIND_RETRY",
      );
      check(facts(operation, ["FAILED_WITH_KNOWN_EFFECTS"]), "RECONCILE");
    },
  );

  it("does not treat SELECT or reload as evidence of a side-effect-free route", () => {
    check(
      { ...facts("REMOTE_SQL"), sideEffects: "UNKNOWN" },
      "EXTERNAL_GATES_REQUIRED",
    );
    check(
      { ...facts("BROWSER_NAVIGATION"), sideEffects: "POSSIBLE" },
      "DIAGNOSE",
    );
    check(
      { ...facts("BROWSER_PREPARATION"), sideEffects: "UNKNOWN" },
      "DIAGNOSE",
    );
  });

  it.each([
    "BROWSER_PREPARATION",
    "REMOTE_SQL",
    "LOCAL_ISOLATED_WORK",
  ] as const)(
    "does not duplicate in-flight %s or clear unknown outcomes with a later row",
    (operation) => {
      check(facts(operation, ["IN_FLIGHT"]), "WAIT");
      check(facts(operation, ["IN_FLIGHT", "NOT_STARTED"]), "WAIT");
      check(facts(operation, ["UNKNOWN", "NOT_STARTED"]), "RECONCILE");
    },
  );

  it("does not retry unknown harmless UI outcomes; an independently established new step is separate", () => {
    check(facts("BROWSER_PREPARATION", ["UNKNOWN"]), "RECONCILE");
    check(facts("BROWSER_NAVIGATION"), "PROCEED_HARMLESS_STEP");
  });

  it("reconciles a known partial effect before another preparation attempt", () => {
    const input = facts("BROWSER_PREPARATION", ["FAILED_WITH_KNOWN_EFFECTS"]);
    check(
      {
        ...input,
        attempts: [{ ...input.attempts[0], effects: "KNOWN_PRESENT" }],
      },
      "RECONCILE",
    );
  });

  it("does not erase a failed attempt's partial effects with later success", () => {
    const input = facts("BROWSER_PREPARATION", [
      "FAILED_WITH_KNOWN_EFFECTS",
      "SUCCEEDED",
    ]);
    check(
      {
        ...input,
        attempts: [
          { ...input.attempts[0], effects: "KNOWN_PRESENT" },
          input.attempts[1],
        ],
      },
      "RECONCILE",
      "KNOWN_EFFECTS_REQUIRE_RECONCILIATION",
    );
    const succeeded = facts("REMOTE_CONFIG", ["SUCCEEDED"]);
    check(
      {
        ...succeeded,
        attempts: [{ ...succeeded.attempts[0], effects: "KNOWN_PRESENT" }],
      },
      "ADVANCE_WITHOUT_REPLAY",
    );
  });

  it("keeps explicit denial and an exact storage hold despite remaining attempts", () => {
    check(
      facts("BROWSER_PREPARATION", ["SAFETY_DENIED"]),
      "DENY",
      "SAFETY_DENIAL_UNCHANGED",
    );
    check(
      facts("BROWSER_PREPARATION", ["SAFETY_DENIED", "NOT_STARTED"]),
      "DENY",
    );
    check({ ...facts(), restriction: "SAFETY_DENIED" }, "DENY");
    check(
      { ...facts("REMOTE_SQL"), restriction: "EXACT_ACTION_HELD" },
      "DENY",
      "EXACT_ACTION_HOLD_UNCHANGED",
    );
    check(facts("LOCAL_ISOLATED_WORK"), "CONTINUE_LOCAL_WORK");
  });

  it("does not replenish an inherited one-shot grant even after non-execution", () => {
    check(
      {
        ...facts("REMOTE_SQL", ["NOT_STARTED"]),
        restriction: "HISTORICAL_ONE_SHOT",
      },
      "EXTERNAL_GATES_REQUIRED",
      "HISTORICAL_GRANT_UNCHANGED",
    );
  });

  it.each([
    { scope: "OUT_OF_SCOPE" },
    { scope: "UNKNOWN" },
    { target: "MISMATCH" },
    { target: "UNKNOWN" },
    { environment: "PRODUCTION" },
    { environment: "UNKNOWN" },
  ])("denies unverified or wrong scope/target/environment: %j", (change) => {
    check({ ...facts(), ...change }, "DENY");
  });

  it("rejects classifying a remote action as LOCAL, or local work as TEST", () => {
    check({ ...facts("REMOTE_SQL"), environment: "LOCAL" }, "DENY");
    check({ ...facts("LOCAL_ISOLATED_WORK"), environment: "TEST" }, "DENY");
  });

  it("does not reset retained attempts by relabeling an operation", () => {
    const exhausted = facts(
      "BROWSER_PREPARATION",
      Array(3).fill("NOT_STARTED"),
    );
    check(
      { ...exhausted, operation: "BROWSER_NAVIGATION" },
      "DENY",
      "LOGICAL_OPERATION_RELABELED",
    );
    check(
      { ...facts("REMOTE_SQL", ["UNKNOWN"]), operation: "BROWSER_NAVIGATION" },
      "DENY",
    );
  });

  it.each([
    "tool",
    "chat",
    "session",
    "incidentId",
    "newRound",
    "recoveryApproved",
    "ownerApproved",
    "holdReleased",
    "attemptCount",
  ])(
    "rejects the unsupported %s override instead of accepting a cosmetic reset",
    (field) => check({ ...facts(), [field]: true }, "DENY", "MALFORMED_INPUT"),
  );

  it.each([
    null,
    undefined,
    true,
    "TEST",
    [],
    {},
    { operation: "BROWSER_PREPARATION" },
  ])("fails closed on malformed root %j", (input) =>
    check(input, "DENY", "MALFORMED_INPUT"),
  );

  it.each([
    "operation",
    "environment",
    "scope",
    "target",
    "sideEffects",
    "restriction",
  ])("fails closed on missing or unknown %s", (field) => {
    check({ ...facts(), [field]: "UNRECOGNIZED" }, "DENY", "MALFORMED_INPUT");
    const input = { ...facts() } as Record<string, unknown>;
    delete input[field];
    check(input, "DENY", "MALFORMED_INPUT");
  });

  it.each([
    -1,
    0,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "1",
  ])("rejects invalid attempt ordinal %s", (number) => {
    const input = facts("BROWSER_PREPARATION", ["NOT_STARTED"]);
    check(
      { ...input, attempts: [{ ...input.attempts[0], number }] },
      "DENY",
      "MALFORMED_INPUT",
    );
  });

  it.each([-1, 1.5, NaN, Infinity, null, {}, "0"])(
    "rejects non-history attempts value %s",
    (attempts) => check({ ...facts(), attempts }, "DENY", "MALFORMED_INPUT"),
  );

  it("rejects gaps, duplicates, sparse history, extra fields, and unknown attempt states", () => {
    const input = facts("BROWSER_PREPARATION", ["NOT_STARTED", "NOT_STARTED"]);
    for (const number of [1, 3]) {
      check(
        {
          ...input,
          attempts: [input.attempts[0], { ...input.attempts[1], number }],
        },
        "DENY",
        "MALFORMED_INPUT",
      );
    }
    check({ ...facts(), attempts: Array(1) }, "DENY", "MALFORMED_INPUT");
    for (const change of [
      { outcome: "FAILED" },
      { effects: "READ_ONLY" },
      { operation: "SELECT" },
      { reset: true },
    ]) {
      check(
        { ...input, attempts: [{ ...input.attempts[0], ...change }] },
        "DENY",
        "MALFORMED_INPUT",
      );
    }
  });

  it("rejects contradictions between outcome and observed effects", () => {
    for (const [outcome, effects] of [
      ["NOT_STARTED", "KNOWN_PRESENT"],
      ["NOT_STARTED", "UNKNOWN"],
      ["FAILED_WITH_KNOWN_EFFECTS", "UNKNOWN"],
    ]) {
      check(
        {
          ...facts(),
          attempts: [
            { number: 1, operation: "BROWSER_PREPARATION", outcome, effects },
          ],
        },
        "DENY",
        "MALFORMED_INPUT",
      );
    }
  });

  it("does not read accessor values or accept hidden override fields", () => {
    const input = facts();
    Object.defineProperty(input, "scope", {
      get: () => {
        throw new Error("must not execute");
      },
    });
    check(input, "DENY", "MALFORMED_INPUT");
    check(
      { ...facts(), [Symbol("ownerApproved")]: true },
      "DENY",
      "MALFORMED_INPUT",
    );
    const history: TestOperationAttempt[] = [];
    Object.defineProperty(history, "0", {
      get: () => {
        throw new Error("must not execute");
      },
    });
    check({ ...facts(), attempts: history }, "DENY", "MALFORMED_INPUT");
  });

  it("rejects a custom array prototype that hides denied or unknown attempts", () => {
    for (const outcome of ["SAFETY_DENIED", "UNKNOWN", "IN_FLIGHT"] as const) {
      const input = facts("BROWSER_PREPARATION", [outcome]);
      Object.setPrototypeOf(input.attempts, {
        some: () => false,
        findIndex: () => -1,
      });
      check(input, "DENY", "MALFORMED_INPUT");
    }
  });

  it("is deterministic and does not mutate frozen caller history", () => {
    const input = facts("BROWSER_PREPARATION", ["NOT_STARTED"]);
    input.attempts.forEach(Object.freeze);
    Object.freeze(input.attempts);
    Object.freeze(input);
    const before = JSON.stringify(input);
    check(input, "RETRY_HARMLESS_PREPARATION");
    expect(evaluateTestOperationPolicy(input)).toEqual(
      evaluateTestOperationPolicy(input),
    );
    expect(JSON.stringify(input)).toBe(before);
  });
});
