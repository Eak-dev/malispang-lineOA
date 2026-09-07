import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  MP06_PILOT_ATTEMPT_LEASE_MS,
  MP06_PILOT_BUDGET_MICRO_USD,
  MP06_PILOT_EVENTS_PER_HOUR,
  MP06_PILOT_EVENTS_PER_MINUTE,
  MP06_PILOT_EVENTS_PER_SESSION,
  MP06_PILOT_MAX_CONCURRENCY,
  MP06_PILOT_MAX_TESTERS,
  MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION,
  MP06_PILOT_SESSION_DURATION_MS,
  type Mp06PilotLimits,
} from "../worker/mp-06-pilot-control.js";

const limits: Mp06PilotLimits = {
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

const sessionRef = "a".repeat(64);
const testerA = "b".repeat(64);
const testerB = "c".repeat(64);
const baseNow = 1_789_000_000_000;

describe("MP-06 WP8A persistent atomic pilot coordinator", () => {
  it("is deny-by-default and rejects missing, empty, oversized or malformed allowlists", async () => {
    const stub = pilot("activation-guards");
    expect(await stub.mp06PilotStatus(baseNow)).toMatchObject({
      state: "INACTIVE",
      admittedEvents: 0,
      providerAttempts: 0,
    });
    for (const testerRefs of [
      [],
      Array.from({ length: 6 }, (_, index) => hexRef(index + 1)),
      ["not-a-private-reference"],
    ]) {
      expect(
        await stub.activateMp06Pilot({
          sessionRef,
          testerRefs,
          now: baseNow,
          limits,
        }),
      ).toMatchObject({ activated: false, code: "INVALID_ACTIVATION" });
    }
  });

  it("atomically caps a concurrent aggregate burst at 20 events per rolling minute", async () => {
    const stub = await activePilot("concurrent-minute", [testerA, testerB]);
    const results = await Promise.all(
      Array.from({ length: 21 }, (_, index) =>
        stub.admitMp06PilotEvent({
          sessionRef,
          eventRef: hexRef(index + 20),
          testerRef: index % 2 === 0 ? testerA : testerB,
          now: baseNow + index,
        }),
      ),
    );
    expect(results.filter((result) => result.admitted)).toHaveLength(20);
    expect(
      results.filter((result) => result.code === "RATE_LIMITED"),
    ).toHaveLength(1);
    expect(await stub.mp06PilotStatus(baseNow + 21)).toMatchObject({
      state: "STOPPED",
      admittedEvents: 20,
      stopReason: "EVENT_RATE_LIMIT_REACHED",
    });
  });

  it("uses an exact rolling window boundary and shares counts across testers", async () => {
    const stub = await activePilot("rolling-boundary", [testerA, testerB]);
    for (let index = 0; index < 20; index += 1) {
      expect(
        await stub.admitMp06PilotEvent({
          sessionRef,
          eventRef: hexRef(index + 80),
          testerRef: index % 2 === 0 ? testerA : testerB,
          now: baseNow,
        }),
      ).toMatchObject({ admitted: true });
    }
    expect(
      await stub.admitMp06PilotEvent({
        sessionRef,
        eventRef: hexRef(101),
        testerRef: testerB,
        now: baseNow + 60_000,
      }),
    ).toMatchObject({ admitted: true });
  });

  it("deduplicates events before provider reservation and denies unknown testers", async () => {
    const stub = await activePilot("dedupe", [testerA]);
    const input = {
      sessionRef,
      eventRef: hexRef(140),
      testerRef: testerA,
      now: baseNow,
    };
    expect(await stub.admitMp06PilotEvent(input)).toMatchObject({
      admitted: true,
      code: "ADMITTED",
    });
    expect(await stub.admitMp06PilotEvent(input)).toMatchObject({
      admitted: false,
      code: "DUPLICATE",
    });
    expect(
      await stub.admitMp06PilotEvent({
        ...input,
        eventRef: hexRef(141),
        testerRef: "d".repeat(64),
      }),
    ).toMatchObject({ admitted: false, code: "TESTER_NOT_ALLOWED" });
    expect(await stub.mp06PilotStatus(baseNow)).toMatchObject({
      admittedEvents: 1,
      providerAttempts: 0,
    });
  });

  it("enforces concurrency one under simultaneous reservations", async () => {
    const stub = await activePilot("concurrency", [testerA]);
    await admit(stub, hexRef(150), baseNow);
    await admit(stub, hexRef(151), baseNow + 1);
    const results = await Promise.all([
      reserve(stub, hexRef(150), hexRef(160), baseNow + 2, 10_000),
      reserve(stub, hexRef(151), hexRef(161), baseNow + 2, 10_000),
    ]);
    expect(results.filter((result) => result.accepted)).toHaveLength(1);
    expect(
      results.filter((result) => result.code === "CONCURRENCY_BUSY"),
    ).toHaveLength(1);
  });

  it("counts every retry attempt and stops at attempt 201", async () => {
    const stub = await activePilot("attempt-cap", [testerA]);
    const eventRef = hexRef(170);
    await admit(stub, eventRef, baseNow);
    for (let attempt = 1; attempt <= 200; attempt += 1) {
      const attemptRef = hexRef(attempt + 200);
      expect(
        await reserve(stub, eventRef, attemptRef, baseNow + attempt, 1),
      ).toMatchObject({ accepted: true });
      expect(
        await stub.authorizeMp06PilotDispatch({
          sessionRef,
          eventRef,
          attemptRef,
          now: baseNow + attempt,
        }),
      ).toMatchObject({ accepted: true });
      expect(
        await stub.settleMp06PilotAttempt({
          sessionRef,
          eventRef,
          attemptRef,
          now: baseNow + attempt,
          outcome: "KNOWN",
          actualCostMicroUsd: 1,
        }),
      ).toMatchObject({ accepted: true });
    }
    expect(
      await reserve(stub, eventRef, hexRef(500), baseNow + 201, 1),
    ).toMatchObject({ accepted: false, code: "ATTEMPT_LIMIT_REACHED" });
    expect(await stub.mp06PilotStatus(baseNow + 201)).toMatchObject({
      state: "STOPPED",
      providerAttempts: 200,
      budgetConsumedMicroUsd: 200,
    });
  });

  it("reserves budget atomically and fails closed rather than overspending", async () => {
    const stub = await activePilot("budget-cap", [testerA]);
    const eventRef = hexRef(520);
    await admit(stub, eventRef, baseNow);
    const firstAttempt = hexRef(521);
    expect(
      await reserve(
        stub,
        eventRef,
        firstAttempt,
        baseNow + 1,
        MP06_PILOT_BUDGET_MICRO_USD - 1,
      ),
    ).toMatchObject({ accepted: true });
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef: firstAttempt,
      now: baseNow + 1,
    });
    await stub.settleMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef: firstAttempt,
      now: baseNow + 2,
      outcome: "KNOWN",
      actualCostMicroUsd: MP06_PILOT_BUDGET_MICRO_USD - 1,
    });
    expect(
      await reserve(stub, eventRef, hexRef(522), baseNow + 3, 2),
    ).toMatchObject({ accepted: false, code: "BUDGET_LIMIT_REACHED" });
    expect(await stub.mp06PilotStatus(baseNow + 3)).toMatchObject({
      state: "STOPPED",
      budgetConsumedMicroUsd: MP06_PILOT_BUDGET_MICRO_USD - 1,
    });
  });

  it("charges unknown usage conservatively, stops the session and never authorizes the result", async () => {
    const stub = await activePilot("unknown-usage", [testerA]);
    const eventRef = hexRef(540);
    const attemptRef = hexRef(541);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 40_000);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    expect(
      await stub.settleMp06PilotAttempt({
        sessionRef,
        eventRef,
        attemptRef,
        now: baseNow + 2,
        outcome: "USAGE_UNKNOWN",
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: baseNow + 3,
      }),
    ).toBe(false);
    expect(await stub.mp06PilotStatus(baseNow + 3)).toMatchObject({
      state: "STOPPED",
      budgetConsumedMicroUsd: 40_000,
      budgetReservedMicroUsd: 0,
      stopReason: "PROVIDER_USAGE_UNKNOWN",
    });
  });

  it("makes settlement idempotent without double release or refund", async () => {
    const stub = await activePilot("settlement-idempotence", [testerA]);
    const eventRef = hexRef(560);
    const attemptRef = hexRef(561);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 10_000);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    const settlement = {
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 2,
      outcome: "KNOWN" as const,
      actualCostMicroUsd: 2_000,
    };
    expect(await stub.settleMp06PilotAttempt(settlement)).toMatchObject({
      code: "SETTLED",
    });
    expect(await stub.settleMp06PilotAttempt(settlement)).toMatchObject({
      code: "SETTLED_IDEMPOTENT",
    });
    expect(await stub.mp06PilotStatus(baseNow + 3)).toMatchObject({
      inFlight: 0,
      budgetConsumedMicroUsd: 2_000,
      budgetReservedMicroUsd: 0,
    });
  });

  it("does not recycle an abandoned dispatched lease and blocks restart", async () => {
    const stub = await activePilot("abandoned", [testerA]);
    const eventRef = hexRef(580);
    const attemptRef = hexRef(581);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 10_000);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    expect(
      await stub.mp06PilotStatus(baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2),
    ).toMatchObject({
      state: "STOPPED",
      inFlight: 1,
      stopReason: "IN_FLIGHT_USAGE_UNKNOWN",
    });
    expect(
      await stub.activateMp06Pilot({
        sessionRef: "e".repeat(64),
        testerRefs: [testerA],
        now: baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 3,
        limits,
      }),
    ).toMatchObject({ activated: false, code: "UNRESOLVED_IN_FLIGHT" });
  });

  it("reports sanitized lifecycle counts without exposing attempt, event or tester references", async () => {
    const stub = await activePilot("attempt-diagnostics", [testerA]);
    const eventRef = hexRef(582);
    const attemptRef = hexRef(583);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    const diagnostics = await stub.mp06PilotAttemptDiagnostics(
      baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2,
    );
    expect(diagnostics).toMatchObject({
      sessionState: "STOPPED",
      stopReason: "IN_FLIGHT_USAGE_UNKNOWN",
      totalAttempts: 1,
      dispatchedAttempts: 1,
      staleDispatchedAttempts: 1,
      budgetConsumedMicroUsd: 0,
      budgetReservedMicroUsd: 12_932,
      inFlight: 1,
    });
    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain(eventRef);
    expect(serialized).not.toContain(attemptRef);
    expect(serialized).not.toContain(testerA);
  });

  it("reconciles one stale unknown attempt conservatively and idempotently without authorizing its result", async () => {
    const stub = await activePilot("manual-unknown-reconcile", [testerA]);
    const eventRef = hexRef(584);
    const attemptRef = hexRef(585);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    const staleNow = baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2;
    await stub.mp06PilotStatus(staleNow);
    expect(await stub.reconcileMp06PilotUnknownUsage(staleNow)).toMatchObject({
      accepted: true,
      code: "RECONCILED_USAGE_UNKNOWN",
    });
    expect(
      await stub.reconcileMp06PilotUnknownUsage(staleNow + 1),
    ).toMatchObject({
      accepted: true,
      code: "RECONCILED_IDEMPOTENT",
    });
    expect(await stub.mp06PilotStatus(staleNow + 1)).toMatchObject({
      state: "STOPPED",
      stopReason: "PROVIDER_USAGE_UNKNOWN_RECONCILED",
      budgetConsumedMicroUsd: 12_932,
      budgetReservedMicroUsd: 0,
      inFlight: 0,
    });
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: staleNow + 2,
      }),
    ).toBe(false);
  });

  it("refuses conservative reconciliation before a dispatched attempt is stale", async () => {
    const stub = await activePilot("premature-reconcile", [testerA]);
    const eventRef = hexRef(586);
    const attemptRef = hexRef(587);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    expect(
      await stub.reconcileMp06PilotUnknownUsage(baseNow + 2),
    ).toMatchObject({
      accepted: false,
      code: "RECONCILIATION_NOT_ALLOWED",
    });
    expect(await stub.mp06PilotStatus(baseNow + 2)).toMatchObject({
      state: "ACTIVE",
      budgetReservedMicroUsd: 12_932,
      inFlight: 1,
    });
  });

  it("reclaims only a pre-dispatch reservation that can be proven unsent", async () => {
    const stub = await activePilot("pre-dispatch-restart", [testerA]);
    const eventRef = hexRef(590);
    const attemptRef = hexRef(591);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 10_000);
    expect(
      await stub.mp06PilotStatus(baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2),
    ).toMatchObject({
      state: "ACTIVE",
      providerAttempts: 0,
      budgetReservedMicroUsd: 0,
      inFlight: 0,
    });
  });

  it("closes kill races at reserve, dispatch, in-flight and reply boundaries", async () => {
    const stub = await activePilot("kill-races", [testerA]);
    const eventRef = hexRef(600);
    const attemptRef = hexRef(601);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 10_000);
    expect(
      await stub.stopMp06Pilot(baseNow + 2, "OPERATOR_STOP"),
    ).toMatchObject({
      stopped: true,
      code: "STOPPED",
    });
    expect(
      await stub.authorizeMp06PilotDispatch({
        sessionRef,
        eventRef,
        attemptRef,
        now: baseNow + 3,
      }),
    ).toMatchObject({ accepted: false, code: "PILOT_INACTIVE" });
    expect(
      await stub.cancelMp06PilotAttemptBeforeDispatch({
        sessionRef,
        eventRef,
        attemptRef,
        now: baseNow + 4,
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: baseNow + 5,
      }),
    ).toBe(false);
    expect(await stub.mp06PilotStatus(baseNow + 5)).toMatchObject({
      state: "STOPPED",
      providerAttempts: 0,
      inFlight: 0,
    });
  });

  it("allows conservative reconciliation after an in-flight kill but blocks output", async () => {
    const stub = await activePilot("kill-in-flight", [testerA]);
    const eventRef = hexRef(610);
    const attemptRef = hexRef(611);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 10_000);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 1,
    });
    await stub.stopMp06Pilot(baseNow + 2, "OPERATOR_STOP");
    expect(
      await stub.settleMp06PilotAttempt({
        sessionRef,
        eventRef,
        attemptRef,
        now: baseNow + 3,
        outcome: "KNOWN",
        actualCostMicroUsd: 500,
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: baseNow + 4,
      }),
    ).toBe(false);
    expect(await stub.mp06PilotStatus(baseNow + 4)).toMatchObject({
      state: "STOPPED",
      budgetConsumedMicroUsd: 500,
      inFlight: 0,
    });
  });

  it("expires from the server-frozen start time and persists accounting", async () => {
    const stub = await activePilot("expiry-persistence", [testerA]);
    await admit(stub, hexRef(620), baseNow + 1);
    expect(await stub.mp06PilotStatus(baseNow + 2)).toMatchObject({
      state: "ACTIVE",
      startedAt: baseNow,
      expiresAt: baseNow + MP06_PILOT_SESSION_DURATION_MS,
      admittedEvents: 1,
    });
    expect(
      await stub.mp06PilotStatus(baseNow + MP06_PILOT_SESSION_DURATION_MS),
    ).toMatchObject({
      state: "EXPIRED",
      admittedEvents: 1,
      stopReason: "SESSION_EXPIRED",
    });
  });
});

describe("MP-06 WP8A authenticated TEST-only pilot endpoints", () => {
  it("keeps attempt diagnostics authenticated and identifier-free", async () => {
    const endpoint =
      "https://test.invalid/admin/mp06-pilot/attempt-diagnostics";
    const unauthorized = await exports.default.fetch(new Request(endpoint));
    expect(unauthorized.status).toBe(401);

    const response = await exports.default.fetch(
      new Request(endpoint, {
        headers: { authorization: "Bearer unit-test-admin-key" },
      }),
    );
    expect(response.status).toBe(200);
    const body = JSON.stringify(await response.json());
    expect(body).toContain("totalAttempts");
    expect(body).not.toMatch(/sessionRef|eventRef|attemptRef|testerRef/u);
  });

  it("fails activation closed when the provider credential is unavailable", async () => {
    const mutableEnv = env as Env & { OPENAI_API_KEY: string };
    const original = mutableEnv.OPENAI_API_KEY;
    mutableEnv.OPENAI_API_KEY = "";
    try {
      const response = await exports.default.fetch(
        new Request("https://test.invalid/admin/mp06-pilot/activate", {
          method: "POST",
          headers: { authorization: "Bearer unit-test-admin-key" },
          body: JSON.stringify({ testerRefs: ["f".repeat(64)] }),
        }),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "PILOT_CONFIGURATION_INVALID",
      });
    } finally {
      mutableEnv.OPENAI_API_KEY = original;
    }
  });

  it("requires admin authentication and exact activation input without exposing testers", async () => {
    const testerRef = "f".repeat(64);
    const unauthorized = await exports.default.fetch(
      new Request("https://test.invalid/admin/mp06-pilot/activate", {
        method: "POST",
        body: JSON.stringify({ testerRefs: [testerRef] }),
      }),
    );
    expect(unauthorized.status).toBe(401);

    const activated = await exports.default.fetch(
      new Request("https://test.invalid/admin/mp06-pilot/activate", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ testerRefs: [testerRef] }),
      }),
    );
    expect(activated.status).toBe(201);
    const activationBody = JSON.stringify(await activated.json());
    expect(activationBody).toContain("ACTIVATED");
    expect(activationBody).not.toContain(testerRef);

    const stopped = await exports.default.fetch(
      new Request("https://test.invalid/admin/mp06-pilot/stop", {
        method: "POST",
        headers: { authorization: "Bearer unit-test-admin-key" },
      }),
    );
    expect(stopped.status).toBe(200);
    expect(await stopped.json()).toMatchObject({ outcome: "STOPPED" });
  });

  it("rejects a signed webhook with the wrong destination before pilot admission", async () => {
    const payload = JSON.stringify({
      destination: "U_NOT_THE_TEST_DESTINATION",
      events: [],
    });
    const response = await exports.default.fetch(
      new Request("https://test.invalid/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-line-signature": await lineSignature(
            payload,
            env.LINE_CHANNEL_SECRET,
          ),
        },
        body: payload,
      }),
    );
    expect(response.status).toBe(403);
  });
});

function pilot(name: string) {
  return env.CONVERSATION_STATE.getByName(`wp8a-${name}`);
}

async function activePilot(name: string, testerRefs: readonly string[]) {
  const stub = pilot(name);
  expect(
    await stub.activateMp06Pilot({
      sessionRef,
      testerRefs,
      now: baseNow,
      limits,
    }),
  ).toMatchObject({ activated: true, code: "ACTIVATED" });
  return stub;
}

async function admit(
  stub: ReturnType<typeof pilot>,
  eventRef: string,
  now: number,
) {
  return stub.admitMp06PilotEvent({
    sessionRef,
    eventRef,
    testerRef: testerA,
    now,
  });
}

async function reserve(
  stub: ReturnType<typeof pilot>,
  eventRef: string,
  attemptRef: string,
  now: number,
  upperBoundCostMicroUsd: number,
) {
  return stub.reserveMp06PilotAttempt({
    sessionRef,
    eventRef,
    attemptRef,
    upperBoundCostMicroUsd,
    now,
  });
}

function hexRef(value: number): string {
  return value.toString(16).padStart(64, "0");
}

async function lineSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
