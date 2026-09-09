import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import worker from "../worker/index.js";
import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import {
  mp06PilotLimitsFromEnvironment,
  MP06_PILOT_CONTROL_OBJECT_NAME,
} from "../worker/mp-06-pilot-control.js";

const ref = (n: number): string => n.toString(16).padStart(64, "0");
const tester = ref(100);
const oldSession = ref(3);
const nextSession = ref(4);
const operationRef = ref(90);
const endpoint = "https://test.invalid/admin/mp06-pilot/resume-acceptance";
const limits = mp06PilotLimitsFromEnvironment(env)!;
const now = 1_789_000_000_000;
const input = {
  expectedSessionRef: oldSession,
  sessionRef: nextSession,
  operationRef,
  now: now + 100,
  limits,
};
const baseline = {
  state: "STOPPED",
  admittedEvents: 3,
  providerAttempts: 3,
  budgetConsumedMicroUsd: 27_824,
  budgetReservedMicroUsd: 0,
  inFlight: 0,
};
const pilot = (name: string) => env.CONVERSATION_STATE.getByName(name);

// All state is synthetic. Seed through the same SQLite-backed RPCs used by the runtime.
async function seed(stub: ReturnType<typeof pilot>, start = now) {
  for (let index = 1; index <= 3; index++) {
    const attempt = {
      sessionRef: ref(index),
      eventRef: ref(10 + index),
      attemptRef: ref(20 + index),
      now: start + index,
    };
    expect(
      await stub.activateMp06Pilot({
        sessionRef: attempt.sessionRef,
        testerRefs: [tester],
        now: attempt.now,
        limits,
      }),
    ).toMatchObject({ activated: true });
    expect(
      await stub.admitMp06PilotEvent({ ...attempt, testerRef: tester }),
    ).toMatchObject({ admitted: true });
    expect(
      await stub.reserveMp06PilotAttempt({
        ...attempt,
        upperBoundCostMicroUsd: 12_932,
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await stub.authorizeMp06PilotDispatch({
        ...attempt,
        clientRequestId: `synthetic-${index}`,
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await stub.settleMp06PilotAttempt({
        ...attempt,
        outcome: index < 3 ? "USAGE_UNKNOWN" : "KNOWN",
        actualCostMicroUsd: index < 3 ? undefined : 1960,
      }),
    ).toMatchObject({ accepted: true });
  }
  await stub.stopMp06Pilot(start + 4, "OPERATOR_STOP");
  expect(await stub.mp06PilotStatus(start + 5)).toMatchObject(baseline);
}

describe("WP8F one-shot acceptance resume using real durable storage", () => {
  it("reproduces the deployed 2/2-only route blocker, then preserves 3/3 accounting and private allowlist", async () => {
    const stub = pilot("wp8f-baseline");
    await seed(stub);
    expect(await stub.reactivateReconciledMp06Pilot(input)).toMatchObject({
      activated: false,
    });
    const before = await stub.mp06PilotAttemptDiagnostics(input.now);
    const result = await stub.resumeMp06Acceptance(input);
    expect(result).toMatchObject({
      activated: true,
      code: "ACTIVATED",
      status: {
        ...baseline,
        state: "ACTIVE",
        sessionRef: nextSession,
        startedAt: input.now,
        expiresAt: input.now + 3_600_000,
      },
    });
    expect(JSON.stringify(result)).not.toContain(tester);
    expect(await stub.mp06PilotAttemptDiagnostics(input.now)).toMatchObject({
      totalAttempts: before.totalAttempts,
      usageUnknownAttempts: 2,
      settledAttempts: 1,
    });
    expect(
      await stub.admitMp06PilotEvent({
        sessionRef: nextSession,
        eventRef: ref(50),
        testerRef: tester,
        now: input.now,
      }),
    ).toMatchObject({ admitted: true });
  });

  it("serializes concurrent duplicate activation, preserves expiry across restart and never reopens after stop", async () => {
    const stub = pilot("wp8f-idempotent");
    await seed(stub);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => stub.resumeMp06Acceptance(input)),
    );
    expect(results.filter((r) => r.code === "ACTIVATED")).toHaveLength(1);
    expect(
      results.filter((r) => r.code === "ACTIVATED_IDEMPOTENT"),
    ).toHaveLength(7);
    await evictDurableObject(stub);
    expect(
      await stub.resumeMp06Acceptance({ ...input, now: input.now + 1000 }),
    ).toMatchObject({
      code: "ACTIVATED_IDEMPOTENT",
      status: { startedAt: input.now, expiresAt: input.now + 3_600_000 },
    });
    await stub.stopMp06Pilot(input.now + 1001, "OPERATOR_STOP");
    expect(
      await stub.resumeMp06Acceptance({ ...input, now: input.now + 1002 }),
    ).toMatchObject({ code: "ACTIVATED_IDEMPOTENT", status: baseline });
    expect(
      await stub.resumeMp06Acceptance({
        ...input,
        expectedSessionRef: nextSession,
        sessionRef: ref(5),
        operationRef: ref(91),
        now: input.now + 1003,
      }),
    ).toMatchObject({ activated: false });
  });

  it("does not allow a different operation to steal an activation or reopen after expiry", async () => {
    const stub = pilot("wp8f-operation-conflict");
    await seed(stub);
    const results = await Promise.all([
      stub.resumeMp06Acceptance(input),
      stub.resumeMp06Acceptance({
        ...input,
        operationRef: ref(91),
        sessionRef: ref(5),
      }),
    ]);
    expect(results.filter((r) => r.activated)).toHaveLength(1);
    const winner = results[0].activated
      ? input
      : { ...input, operationRef: ref(91), sessionRef: ref(5) };
    expect(
      await stub.resumeMp06Acceptance({
        ...winner,
        now: input.now + 3_600_000,
      }),
    ).toMatchObject({
      code: "ACTIVATED_IDEMPOTENT",
      status: { state: "EXPIRED", expiresAt: input.now + 3_600_000 },
    });
  });

  it("rejects wrong session and malformed input without mutation", async () => {
    const stub = pilot("wp8f-wrong-target");
    await seed(stub);
    for (const changed of [
      { expectedSessionRef: ref(99) },
      { operationRef: "bad" },
      { sessionRef: oldSession },
      { now: -1 },
    ])
      expect(
        await stub.resumeMp06Acceptance({ ...input, ...changed }),
      ).toMatchObject({ activated: false });
    expect(await stub.mp06PilotStatus(input.now)).toMatchObject(baseline);
  });

  it("rolls back the marker and allowlist transfer if the atomic session update fails", async () => {
    const stub = pilot("wp8f-transaction-abort");
    await seed(stub);
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.sql.exec(
        "CREATE TRIGGER abort_resume BEFORE UPDATE OF session_ref ON mp06_pilot_session BEGIN SELECT RAISE(ABORT, 'synthetic storage failure'); END",
      );
    });
    expect(await stub.resumeMp06Acceptance(input)).toMatchObject({
      activated: false,
      code: "ACTIVATION_STORAGE_UNAVAILABLE",
    });
    expect(await stub.mp06PilotStatus(input.now)).toMatchObject(baseline);
    await runInDurableObject(stub, (_instance, state) => {
      expect(
        state.storage.sql
          .exec<{ session_ref: string }>(
            "SELECT session_ref FROM mp06_pilot_testers",
          )
          .one().session_ref,
      ).toBe(oldSession);
      state.storage.sql.exec("DROP TRIGGER abort_resume");
    });
    expect(await stub.resumeMp06Acceptance(input)).toMatchObject({
      activated: true,
      code: "ACTIVATED",
    });
  });

  it("fails closed on counter drift, missing allowlist, or a nonterminal attempt even if aggregate counters claim zero in-flight", async () => {
    for (const [index, sql] of [
      "UPDATE mp06_pilot_session SET admitted_events = 4",
      "UPDATE mp06_pilot_session SET budget_reserved_micro_usd = 12932, in_flight = 1",
      "DELETE FROM mp06_pilot_testers",
      "UPDATE mp06_pilot_attempts SET state = 'DISPATCHED' WHERE state = 'SETTLED'",
    ].entries()) {
      const stub = pilot(`wp8f-corrupt-${index}`);
      await seed(stub);
      // Deliberate local storage corruption only, never a remote repair mechanism.
      await runInDurableObject(stub, (_instance, state) => {
        state.storage.sql.exec(sql);
      });
      expect(await stub.resumeMp06Acceptance(input)).toMatchObject({
        activated: false,
      });
    }
  });

  it("fences old dispatch, retry and result authorization; late settlement cannot refund or mutate the new session", async () => {
    const stub = pilot("wp8f-old-session");
    await seed(stub);
    await stub.resumeMp06Acceptance(input);
    const before = await stub.mp06PilotStatus(input.now);
    const old = {
      sessionRef: ref(1),
      eventRef: ref(11),
      attemptRef: ref(21),
      now: input.now + 1,
    };
    expect(
      await stub.authorizeMp06PilotDispatch({
        ...old,
        clientRequestId: "late-synthetic",
      }),
    ).toMatchObject({ accepted: false });
    expect(
      await stub.reserveMp06PilotAttempt({
        ...old,
        attemptRef: ref(99),
        upperBoundCostMicroUsd: 12_932,
      }),
    ).toMatchObject({ accepted: false });
    expect(await stub.authorizeMp06PilotResult(old)).toBe(false);
    expect(
      await stub.settleMp06PilotAttempt({
        ...old,
        outcome: "KNOWN",
        actualCostMicroUsd: 0,
      }),
    ).toMatchObject({ code: "SETTLED_IDEMPOTENT" });
    expect(await stub.mp06PilotStatus(input.now + 1)).toEqual(before);
  });

  it("authenticates the HTTP entry point, accepts exact safe input, and makes no outbound network call", async () => {
    const stub = pilot(MP06_PILOT_CONTROL_OBJECT_NAME);
    await seed(stub, Date.now() - 1000);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("NETWORK_FORBIDDEN"));
    try {
      const request = (body: string, authorized = true) =>
        new Request(endpoint, {
          method: "POST",
          headers: authorized
            ? { authorization: "Bearer unit-test-admin-key" }
            : {},
          body,
        });
      expect((await exports.default.fetch(request("{}", false))).status).toBe(
        401,
      );
      for (const body of [
        "{",
        "{}",
        JSON.stringify({
          expectedSessionRef: oldSession,
          operationRef,
          testerRefs: [tester],
        }),
        JSON.stringify({ expectedSessionRef: oldSession, operationRef: "bad" }),
      ]) {
        const response = await exports.default.fetch(request(body));
        expect(response.status).toBe(400);
        expect(await response.text()).not.toContain(tester);
      }
      const body = JSON.stringify({
        expectedSessionRef: oldSession,
        operationRef,
      });
      const response = await exports.default.fetch(request(body));
      expect(response.status).toBe(201);
      expect(JSON.stringify(await response.json())).not.toContain(tester);
      expect((await exports.default.fetch(request(body))).status).toBe(200);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rejects non-TEST and disabled/missing provider configuration at the handler without activating", async () => {
    const before = await pilot(MP06_PILOT_CONTROL_OBJECT_NAME).mp06PilotStatus(
      Date.now(),
    );
    for (const override of [
      { ENVIRONMENT: "PRODUCTION" },
      { MP06_PILOT_CONTROL_ENABLED: "false" },
      { OPENAI_API_KEY: "" },
      { MP06_AI_NLU_MODEL: "" },
    ]) {
      const ctx = createExecutionContext();
      const response = await worker.fetch(
        new Request(endpoint, {
          method: "POST",
          headers: { authorization: "Bearer unit-test-admin-key" },
          body: JSON.stringify({
            expectedSessionRef: oldSession,
            operationRef,
          }),
        }),
        { ...env, ...override },
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await response.text()).not.toContain(tester);
    }
    expect(
      await pilot(MP06_PILOT_CONTROL_OBJECT_NAME).mp06PilotStatus(Date.now()),
    ).toEqual(before);
  });
});
