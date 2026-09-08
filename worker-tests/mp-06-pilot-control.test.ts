import {
  createExecutionContext,
  evictDurableObject,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import worker from "../worker/index.js";
import { classifyText } from "../worker/routing.js";
import {
  MP06_AI_NLU_MODEL,
  MP06_AI_NLU_SCHEMA_VERSION,
} from "../worker/mp-06-ai-nlu.js";
import {
  MP06_PILOT_ATTEMPT_LEASE_MS,
  MP06_PILOT_BUDGET_MICRO_USD,
  MP06_PILOT_EVENTS_PER_HOUR,
  MP06_PILOT_EVENTS_PER_MINUTE,
  MP06_PILOT_EVENTS_PER_SESSION,
  MP06_PILOT_MAX_CONCURRENCY,
  MP06_PILOT_MAX_TESTERS,
  MP06_PILOT_CONTROL_OBJECT_NAME,
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

describe("v16 deterministic precedence compatibility gate", () => {
  it("preserves the signed-webhook catalog follow-up while exposing the legacy UNKNOWN handoff conflict", async () => {
    // Synthetic public catalog input only. This protects the existing safe F2
    // behavior; it is NOT proof that the HIGH_RISK vulnerability is repaired.
    const senderId = "U_SYNTHETIC_V16_CATALOG_FOLLOW_UP";
    const conversation = env.CONVERSATION_STATE.getByName(
      await hashReference(senderId),
    );
    const replies: string[] = [];
    const network = vi.fn<typeof fetch>((input, init) => {
      if (requestUrl(input) !== "https://api.line.me/v2/bot/message/reply")
        throw new Error("UNEXPECTED_NETWORK_DESTINATION");
      if (typeof init?.body !== "string")
        throw new Error("EXPECTED_SERIALIZED_LINE_REPLY");
      replies.push(init.body);
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", network);
    try {
      const localEnv = {
        ...env,
        MP06_PILOT_CONTROL_ENABLED: "false",
        MP06_AI_NLU_ENABLED: "false",
      };
      const send = async (text: string, suffix: string) => {
        const payload = JSON.stringify({
          destination: env.LINE_BOT_USER_ID,
          events: [
            {
              type: "message",
              webhookEventId: `evt-v16-catalog-${suffix}`,
              replyToken: `synthetic-v16-catalog-${suffix}`,
              source: { type: "user", userId: senderId },
              message: { type: "text", text },
            },
          ],
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(
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
          localEnv,
          ctx,
        );
        expect(response.status).toBe(200);
        await waitOnExecutionContext(ctx);
      };
      await send("ราคาเท่าไหร่", "clarify");
      expect(await conversation.mp06Context()).toEqual({
        pendingClarificationTemplateId: "T-C01",
      });
      expect(replies).toHaveLength(1);
      expect(replies[0]).toContain("สินค้าอะไร");
      const followUp = "แฮมชีส ปกติ";
      expect(classifyText(followUp)).toMatchObject({
        handoff: true,
        replyKind: "SAFE_FALLBACK",
        reasonCode: "NO_AUTHORITATIVE_ANSWER",
      });
      await send(followUp, "resolved");
      expect(await conversation.state()).toBe("BOT_ACTIVE");
      expect(await conversation.mp06Context()).toEqual({});
      expect(replies).toHaveLength(2);
      expect(replies[1]).toContain("39 บาท");
      expect(network).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

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
          clientRequestId: `client-loop-${attempt}`,
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
      clientRequestId: "client-first-attempt",
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
      clientRequestId: "client-known-settlement",
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
      clientRequestId: "client-idempotent-settlement",
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
      clientRequestId: "client-stale-attempt",
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
      clientRequestId: "client-attempt-diagnostics",
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

  it("persists only content-free provider lifecycle diagnostics with settlement", async () => {
    const stub = await activePilot("provider-lifecycle-diagnostics", [testerA]);
    const eventRef = hexRef(580);
    const attemptRef = hexRef(581);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      clientRequestId: "client-safe-1",
      now: baseNow + 1,
    });
    expect(
      await stub.settleMp06PilotAttempt({
        sessionRef,
        eventRef,
        attemptRef,
        now: baseNow + 2,
        outcome: "KNOWN",
        actualCostMicroUsd: 800,
        diagnostics: {
          clientRequestId: "client-safe-1",
          providerRequestId: "req_safe_1",
          httpStatus: 200,
          rateLimitRemainingRequests: 17,
          dispatchMs: 1,
          headersWaitMs: 2,
          bodyReadMs: 3,
          parsingMs: 1,
          outcomeCode: "PROVIDER_RESPONSE",
        },
      }),
    ).toMatchObject({ accepted: true, code: "SETTLED" });
    const diagnostics = await stub.mp06PilotAttemptDiagnostics(baseNow + 3);
    expect(diagnostics.latestLifecycle).toEqual({
      clientRequestId: "client-safe-1",
      providerRequestId: "req_safe_1",
      httpStatus: 200,
      rateLimitRemainingRequests: 17,
      dispatchMs: 1,
      headersWaitMs: 2,
      bodyReadMs: 3,
      parsingMs: 1,
      outcomeCode: "PROVIDER_RESPONSE",
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
      clientRequestId: "client-manual-reconcile",
      now: baseNow + 1,
    });
    const staleNow = baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2;
    await stub.mp06PilotStatus(staleNow);
    expect(
      await stub.reconcileMp06PilotUnknownUsage(reconciliationInput(staleNow)),
    ).toMatchObject({
      accepted: true,
      code: "RECONCILED_USAGE_UNKNOWN",
    });
    expect(
      await stub.reconcileMp06PilotUnknownUsage(
        reconciliationInput(staleNow + 1),
      ),
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

    const nextSessionRef = hexRef(588);
    expect(
      await stub.activateMp06Pilot({
        sessionRef: nextSessionRef,
        testerRefs: [testerA],
        now: staleNow + 3,
        limits,
      }),
    ).toMatchObject({
      activated: true,
      code: "ACTIVATED",
      status: {
        admittedEvents: 1,
        providerAttempts: 1,
        budgetConsumedMicroUsd: 12_932,
        budgetReservedMicroUsd: 0,
        inFlight: 0,
      },
    });
    expect(
      await stub.authorizeMp06PilotDispatch({
        sessionRef,
        eventRef,
        attemptRef,
        clientRequestId: "client-inactive-dispatch",
        now: staleNow + 4,
      }),
    ).toMatchObject({ accepted: false, code: "PILOT_INACTIVE" });
    expect(
      await stub.settleMp06PilotAttempt({
        sessionRef,
        eventRef,
        attemptRef,
        now: staleNow + 4,
        outcome: "KNOWN",
        actualCostMicroUsd: 0,
      }),
    ).toMatchObject({ accepted: true, code: "SETTLED_IDEMPOTENT" });
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: staleNow + 5,
      }),
    ).toBe(false);
    expect(await stub.mp06PilotStatus(staleNow + 5)).toMatchObject({
      state: "ACTIVE",
      sessionRef: nextSessionRef,
      admittedEvents: 1,
      providerAttempts: 1,
      budgetConsumedMicroUsd: 12_932,
      inFlight: 0,
    });
  });

  it("rejects conservative reconciliation when any exact old-attempt precondition drifts", async () => {
    const stub = await activePilot("reconcile-precondition-drift", [testerA]);
    const eventRef = hexRef(589);
    const attemptRef = hexRef(590);
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      clientRequestId: "client-reconciled-restart",
      now: baseNow + 1,
    });
    const staleNow = baseNow + MP06_PILOT_ATTEMPT_LEASE_MS + 2;
    await stub.mp06PilotStatus(staleNow);
    expect(
      await stub.reconcileMp06PilotUnknownUsage({
        ...reconciliationInput(staleNow),
        expectedBudgetReservedMicroUsd: 12_931 as 12932,
      }),
    ).toMatchObject({ accepted: false, code: "CONTROL_UNAVAILABLE" });
    expect(await stub.mp06PilotStatus(staleNow)).toMatchObject({
      state: "STOPPED",
      budgetConsumedMicroUsd: 0,
      budgetReservedMicroUsd: 12_932,
      inFlight: 1,
    });
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
      clientRequestId: "client-reconcile-guard",
      now: baseNow + 1,
    });
    expect(
      await stub.reconcileMp06PilotUnknownUsage(
        reconciliationInput(baseNow + 2),
      ),
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
        clientRequestId: "client-stopped-dispatch",
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
      clientRequestId: "client-stop-during-flight",
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

  it("requires safe session/attempt identity and reconciles the second attempt once", async () => {
    const endpoint =
      "https://test.invalid/admin/mp06-pilot/reconcile-exact-unknown-usage";
    expect(
      await exports.default.fetch(
        new Request(endpoint, { method: "POST", body: "{}" }),
      ),
    ).toMatchObject({ status: 401 });

    const stub = env.CONVERSATION_STATE.getByName("mp06-pilot-control-v1");
    const firstNow = Date.now() - MP06_PILOT_ATTEMPT_LEASE_MS * 2;
    const oldSessionRef = hexRef(701);
    const firstEventRef = hexRef(702);
    const firstAttemptRef = hexRef(703);
    await stub.activateMp06Pilot({
      sessionRef: oldSessionRef,
      testerRefs: [testerA],
      now: firstNow,
      limits,
    });
    await stub.admitMp06PilotEvent({
      sessionRef: oldSessionRef,
      eventRef: firstEventRef,
      testerRef: testerA,
      now: firstNow,
    });
    await stub.reserveMp06PilotAttempt({
      sessionRef: oldSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      upperBoundCostMicroUsd: 12_932,
      now: firstNow,
    });
    await stub.authorizeMp06PilotDispatch({
      sessionRef: oldSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      clientRequestId: "client-first-unknown",
      now: firstNow,
    });
    await stub.settleMp06PilotAttempt({
      sessionRef: oldSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      now: firstNow + 1,
      outcome: "USAGE_UNKNOWN",
    });

    const sessionRef = hexRef(704);
    await stub.activateMp06Pilot({
      sessionRef,
      testerRefs: [testerA],
      now: firstNow + 2,
      limits,
    });
    const eventRef = hexRef(705);
    const attemptRef = hexRef(706);
    await stub.admitMp06PilotEvent({
      sessionRef,
      eventRef,
      testerRef: testerA,
      now: firstNow + 3,
    });
    await stub.reserveMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef,
      upperBoundCostMicroUsd: 12_932,
      now: firstNow + 3,
    });
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      clientRequestId: "client-second-unknown",
      now: firstNow + 3,
    });
    await stub.mp06PilotStatus(Date.now());

    const targetResponse = await exports.default.fetch(
      new Request(
        "https://test.invalid/admin/mp06-pilot/exact-reconciliation-target",
        { headers: { authorization: "Bearer unit-test-admin-key" } },
      ),
    );
    expect(targetResponse.status).toBe(200);
    const targetBody = await targetResponse.json<{
      target: {
        eligible: boolean;
        code: string;
        sessionRef: string;
        attemptTargetRef: string;
      };
    }>();
    expect(targetBody.target).toMatchObject({
      eligible: true,
      code: "EXACT_TARGET_READY",
      sessionRef,
    });
    expect(targetBody.target.attemptTargetRef).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(targetBody)).not.toContain(attemptRef);
    expect(JSON.stringify(targetBody)).not.toContain(testerA);

    const wrongTarget = await exports.default.fetch(
      new Request(endpoint, {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: exactReconciliationRequestBody({
          ...targetBody.target,
          attemptTargetRef: hexRef(999),
        }),
      }),
    );
    expect(wrongTarget.status).toBe(409);
    const wrongSession = await exports.default.fetch(
      new Request(endpoint, {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: exactReconciliationRequestBody({
          ...targetBody.target,
          sessionRef: hexRef(998),
        }),
      }),
    );
    expect(wrongSession.status).toBe(409);

    const requestBody = exactReconciliationRequestBody(targetBody.target);
    const authorized = () =>
      exports.default.fetch(
        new Request(endpoint, {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: requestBody,
        }),
      );
    const concurrent = await Promise.all([authorized(), authorized()]);
    expect(concurrent.map((response) => response.status)).toEqual([200, 200]);
    const concurrentBodies = await Promise.all(
      concurrent.map((response) =>
        response.json<{ outcome: string; pilot: Record<string, unknown> }>(),
      ),
    );
    expect(concurrentBodies.map((body) => body.outcome).sort()).toEqual([
      "RECONCILED_EXACT_IDEMPOTENT",
      "RECONCILED_EXACT_USAGE_UNKNOWN",
    ]);
    expect(concurrentBodies[0]).toMatchObject({
      pilot: {
        state: "STOPPED",
        stopReason: "PROVIDER_USAGE_UNKNOWN_RECONCILED",
        admittedEvents: 2,
        providerAttempts: 2,
        budgetConsumedMicroUsd: 25_864,
        budgetReservedMicroUsd: 0,
        inFlight: 0,
      },
    });
    const repeated = await authorized();
    expect(repeated.status).toBe(200);
    const repeatedBody = await repeated.json();
    expect(repeatedBody).toMatchObject({
      outcome: "RECONCILED_EXACT_IDEMPOTENT",
      pilot: {
        state: "STOPPED",
        budgetConsumedMicroUsd: 25_864,
        budgetReservedMicroUsd: 0,
        inFlight: 0,
      },
    });
    expect(JSON.stringify(repeatedBody)).not.toMatch(
      new RegExp(`${eventRef}|${attemptRef}|${testerA}`, "u"),
    );

    const checkpointsBeforeLate =
      await stub.mp06PilotLifecycleCheckpointSnapshot();
    expect(
      await stub.settleMp06PilotAttempt({
        sessionRef,
        eventRef,
        attemptRef,
        now: Date.now(),
        outcome: "KNOWN",
        actualCostMicroUsd: 0,
        diagnostics: {
          clientRequestId: "client-second-unknown",
          httpStatus: 200,
          dispatchMs: 1,
          outcomeCode: "LATE_PROVIDER_COMPLETION",
        },
      }),
    ).toMatchObject({ accepted: true, code: "SETTLED_IDEMPOTENT" });
    expect(await stub.mp06PilotLifecycleCheckpointSnapshot()).toEqual(
      checkpointsBeforeLate,
    );
    expect(
      await stub.authorizeMp06PilotResult({
        sessionRef,
        eventRef,
        now: Date.now(),
      }),
    ).toBe(false);

    const reactivated = await exports.default.fetch(
      new Request(
        "https://test.invalid/admin/mp06-pilot/reactivate-reconciled-allowlist",
        {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: JSON.stringify({ reuseReconciledTesterAllowlist: true }),
        },
      ),
    );
    expect(reactivated.status).toBe(201);
    expect(await reactivated.json()).toMatchObject({
      outcome: "ACTIVATED",
      pilot: {
        state: "ACTIVE",
        admittedEvents: 2,
        providerAttempts: 2,
        budgetConsumedMicroUsd: 25_864,
        budgetReservedMicroUsd: 0,
        inFlight: 0,
      },
    });
    const stopped = await exports.default.fetch(
      new Request("https://test.invalid/admin/mp06-pilot/stop", {
        method: "POST",
        headers: { authorization: "Bearer unit-test-admin-key" },
      }),
    );
    expect(stopped.status).toBe(200);
    expect(await stopped.json()).toMatchObject({
      pilot: { state: "STOPPED", inFlight: 0 },
    });
  });

  it("rejects an exact reconciliation target after the underlying attempt state changes", async () => {
    const stub = env.CONVERSATION_STATE.getByName("exact-state-drift");
    const firstNow = baseNow;
    const firstSessionRef = hexRef(710);
    const firstEventRef = hexRef(711);
    const firstAttemptRef = hexRef(712);
    await stub.activateMp06Pilot({
      sessionRef: firstSessionRef,
      testerRefs: [testerA],
      now: firstNow,
      limits,
    });
    await stub.admitMp06PilotEvent({
      sessionRef: firstSessionRef,
      eventRef: firstEventRef,
      testerRef: testerA,
      now: firstNow,
    });
    await stub.reserveMp06PilotAttempt({
      sessionRef: firstSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      upperBoundCostMicroUsd: 12_932,
      now: firstNow,
    });
    await stub.authorizeMp06PilotDispatch({
      sessionRef: firstSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      clientRequestId: "state-drift-first",
      now: firstNow,
    });
    await stub.settleMp06PilotAttempt({
      sessionRef: firstSessionRef,
      eventRef: firstEventRef,
      attemptRef: firstAttemptRef,
      now: firstNow + 1,
      outcome: "USAGE_UNKNOWN",
    });

    const sessionRef = hexRef(713);
    const eventRef = hexRef(714);
    const attemptRef = hexRef(715);
    await stub.activateMp06Pilot({
      sessionRef,
      testerRefs: [testerA],
      now: firstNow + 2,
      limits,
    });
    await stub.admitMp06PilotEvent({
      sessionRef,
      eventRef,
      testerRef: testerA,
      now: firstNow + 3,
    });
    await stub.reserveMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef,
      upperBoundCostMicroUsd: 12_932,
      now: firstNow + 3,
    });
    await stub.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      clientRequestId: "state-drift-second",
      now: firstNow + 3,
    });
    const staleNow = firstNow + MP06_PILOT_ATTEMPT_LEASE_MS + 4;
    await stub.mp06PilotStatus(staleNow);
    const target = await stub.mp06PilotExactReconciliationTarget(staleNow);
    expect(target).toMatchObject({
      eligible: true,
      code: "EXACT_TARGET_READY",
    });

    await stub.settleMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef,
      now: staleNow + 1,
      outcome: "KNOWN",
      actualCostMicroUsd: 0,
    });
    expect(
      await stub.reconcileExactMp06PilotUnknownUsage({
        now: staleNow + 2,
        expectedSessionRef: target.sessionRef!,
        expectedAttemptTargetRef: target.attemptTargetRef!,
        expectedState: "STOPPED",
        expectedStopReason: "IN_FLIGHT_USAGE_UNKNOWN",
        expectedAdmittedEvents: 2,
        expectedProviderAttempts: 2,
        expectedBudgetConsumedMicroUsd: 12_932,
        expectedBudgetReservedMicroUsd: 12_932,
        expectedInFlight: 1,
        disposition: "CONSUME_FULL_RESERVATION_NO_REFUND",
      }),
    ).toMatchObject({ accepted: false, code: "RECONCILIATION_NOT_ALLOWED" });
    expect(await stub.mp06PilotStatus(staleNow + 2)).toMatchObject({
      state: "STOPPED",
      admittedEvents: 2,
      providerAttempts: 2,
      budgetConsumedMicroUsd: 12_932,
      budgetReservedMicroUsd: 0,
      inFlight: 0,
    });
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

  it("persists acknowledged lifecycle checkpoints across eviction and settles idempotently", async () => {
    const stub = await activePilot("lifecycle-persistence", [testerA]);
    const eventRef = hexRef(880);
    const attemptRef = hexRef(881);
    const clientRequestId = "client-lifecycle-persistence";
    await admit(stub, eventRef, baseNow);
    await reserve(stub, eventRef, attemptRef, baseNow + 1, 12_932);
    expect(
      await stub.authorizeMp06PilotDispatch({
        sessionRef,
        eventRef,
        attemptRef,
        clientRequestId,
        now: baseNow + 2,
      }),
    ).toMatchObject({ accepted: true, code: "DISPATCH_AUTHORIZED" });
    for (const [index, phase] of (
      ["OUTBOUND_FETCH_STARTING", "FETCH_PROMISE_CREATED"] as const
    ).entries()) {
      expect(
        await stub.recordMp06PilotLifecycleCheckpoint({
          sessionRef,
          eventRef,
          attemptRef,
          clientRequestId,
          phase,
          now: baseNow + index + 3,
          elapsedMs: 1,
        }),
      ).toMatchObject({ accepted: true, code: "CHECKPOINT_RECORDED" });
    }
    expect(
      (await stub.mp06PilotLifecycleCheckpointSnapshot()).checkpoints.map(
        (checkpoint) => checkpoint.phase,
      ),
    ).toEqual([
      "DISPATCH_AUTHORIZED",
      "OUTBOUND_FETCH_STARTING",
      "FETCH_PROMISE_CREATED",
    ]);

    await evictDurableObject(stub);
    const revived = pilot("lifecycle-persistence");
    for (const [index, phase] of (
      [
        "RESPONSE_HEADERS_RECEIVED",
        "RESPONSE_BODY_READ",
        "RESPONSE_PARSED",
      ] as const
    ).entries()) {
      expect(
        await revived.recordMp06PilotLifecycleCheckpoint({
          sessionRef,
          eventRef,
          attemptRef,
          clientRequestId,
          phase,
          now: baseNow + index + 5,
          ...(phase === "RESPONSE_HEADERS_RECEIVED"
            ? { httpStatus: 200, providerRequestId: "req_safe_restart" }
            : {}),
          elapsedMs: 1,
        }),
      ).toMatchObject({ accepted: true, code: "CHECKPOINT_RECORDED" });
    }
    const settlement = {
      sessionRef,
      eventRef,
      attemptRef,
      now: baseNow + 9,
      outcome: "KNOWN" as const,
      actualCostMicroUsd: 800,
      diagnostics: {
        clientRequestId,
        providerRequestId: "req_safe_restart",
        httpStatus: 200,
        dispatchMs: 1,
        headersWaitMs: 1,
        bodyReadMs: 1,
        parsingMs: 1,
        settlementMs: 1,
        outcomeCode: "PROVIDER_RESPONSE",
      },
    };
    expect(await revived.settleMp06PilotAttempt(settlement)).toMatchObject({
      accepted: true,
      code: "SETTLED",
    });
    expect(await revived.settleMp06PilotAttempt(settlement)).toMatchObject({
      accepted: true,
      code: "SETTLED_IDEMPOTENT",
    });
    expect(
      await revived.recordMp06PilotLifecycleCheckpoint({
        sessionRef,
        eventRef,
        attemptRef,
        clientRequestId,
        phase: "OUTBOUND_FETCH_STARTING",
        now: baseNow + 10,
      }),
    ).toMatchObject({ accepted: true, code: "CHECKPOINT_IDEMPOTENT" });
    const snapshot = await revived.mp06PilotLifecycleCheckpointSnapshot();
    expect(snapshot.checkpointCount).toBe(8);
    expect(snapshot.checkpoints.map((checkpoint) => checkpoint.phase)).toEqual([
      "DISPATCH_AUTHORIZED",
      "OUTBOUND_FETCH_STARTING",
      "FETCH_PROMISE_CREATED",
      "RESPONSE_HEADERS_RECEIVED",
      "RESPONSE_BODY_READ",
      "RESPONSE_PARSED",
      "SETTLEMENT_STARTED",
      "SETTLEMENT_SUCCEEDED",
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(
      new RegExp(`${eventRef}|${attemptRef}|${testerA}`, "u"),
    );
  });

  it("runs the authenticated isolated lifecycle self-test without provider or LINE I/O", async () => {
    const network = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error("network must not be called")),
    );
    vi.stubGlobal("fetch", network);
    try {
      const runRef = hexRef(882);
      const call = () =>
        exports.default.fetch(
          new Request(
            "https://test.invalid/admin/mp06-pilot/lifecycle-self-test",
            {
              method: "POST",
              headers: {
                authorization: "Bearer unit-test-admin-key",
                "content-type": "application/json",
              },
              body: JSON.stringify({ runRef }),
            },
          ),
        );
      const response = await call();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        mode: "NO_PROVIDER_NO_LINE_SIMULATION",
        outcome: "SELF_TEST_PASSED",
        checkpointCount: 8,
        phases: [
          "DISPATCH_AUTHORIZED",
          "OUTBOUND_FETCH_STARTING",
          "FETCH_PROMISE_CREATED",
          "RESPONSE_HEADERS_RECEIVED",
          "RESPONSE_BODY_READ",
          "RESPONSE_PARSED",
          "SETTLEMENT_STARTED",
          "SETTLEMENT_SUCCEEDED",
        ],
        coverage: {
          isolatedDurableObject: true,
          durableCheckpointRpc: true,
          durableSettlementRpc: true,
          simulatedTransportOnly: true,
          nativeProviderFetch: false,
          lineReply: false,
          webhookExecutionContextCoveredByThisRoute: false,
        },
      });
      expect(JSON.stringify(body)).not.toContain(runRef);
      const repeated = await call();
      expect(await repeated.json()).toMatchObject({
        outcome: "SELF_TEST_IDEMPOTENT",
        checkpointCount: 8,
      });
      expect(network).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns webhook acknowledgement before provider completion and suppresses a late reply after stop", async () => {
    const senderId = "U_SYNTHETIC_WP8D_TESTER";
    const testerRef = await hashReference(senderId);
    const coordinator = env.CONVERSATION_STATE.getByName(
      MP06_PILOT_CONTROL_OBJECT_NAME,
    );
    const initialCheckpointKeys = new Set(
      (
        await coordinator.mp06PilotLifecycleCheckpointSnapshot()
      ).checkpoints.map(
        (checkpoint) => `${checkpoint.clientRequestId}:${checkpoint.phase}`,
      ),
    );
    expect(
      await coordinator.activateMp06Pilot({
        sessionRef: hexRef(883),
        testerRefs: [testerRef],
        now: Date.now(),
        limits,
      }),
    ).toMatchObject({ activated: true });

    let resolveProvider: ((response: Response) => void) | undefined;
    const provider = new Promise<Response>((resolve) => {
      resolveProvider = resolve;
    });
    const lineReplies: RequestInfo[] = [];
    const network = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      if (url.startsWith("https://api.openai.com/")) return provider;
      if (url.startsWith("https://api.line.me/")) {
        lineReplies.push(input);
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.reject(new Error("unexpected test destination"));
    });
    vi.stubGlobal("fetch", network);
    try {
      const payload = JSON.stringify({
        destination: env.LINE_BOT_USER_ID,
        events: [
          {
            type: "message",
            webhookEventId: "evt-wp8d-late-provider",
            replyToken: "reply-wp8d-late-provider",
            source: { type: "user", userId: senderId },
            message: { type: "text", text: "เมนู" },
          },
        ],
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(
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
        env,
        ctx,
      );
      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
      const beforeStop =
        await coordinator.mp06PilotLifecycleCheckpointSnapshot();
      expect(
        beforeStop.checkpoints
          .filter(
            (checkpoint) =>
              !initialCheckpointKeys.has(
                `${checkpoint.clientRequestId}:${checkpoint.phase}`,
              ),
          )
          .map((checkpoint) => checkpoint.phase),
      ).toEqual([
        "DISPATCH_AUTHORIZED",
        "OUTBOUND_FETCH_STARTING",
        "FETCH_PROMISE_CREATED",
      ]);
      await coordinator.stopMp06Pilot(Date.now(), "OPERATOR_STOP");
      resolveProvider?.(validProviderResponse());
      await waitOnExecutionContext(ctx);

      expect(lineReplies).toHaveLength(0);
      expect(await coordinator.mp06PilotStatus(Date.now())).toMatchObject({
        state: "STOPPED",
        inFlight: 0,
      });
      expect(
        (await coordinator.mp06PilotLifecycleCheckpointSnapshot()).checkpoints
          .filter(
            (checkpoint) =>
              !initialCheckpointKeys.has(
                `${checkpoint.clientRequestId}:${checkpoint.phase}`,
              ),
          )
          .map((checkpoint) => checkpoint.phase),
      ).toEqual([
        "DISPATCH_AUTHORIZED",
        "OUTBOUND_FETCH_STARTING",
        "FETCH_PROMISE_CREATED",
        "RESPONSE_HEADERS_RECEIVED",
        "RESPONSE_BODY_READ",
        "RESPONSE_PARSED",
        "SETTLEMENT_STARTED",
        "SETTLEMENT_SUCCEEDED",
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reproduces a provider hang through the webhook and leaves durable fail-closed checkpoints", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-08T00:00:00.000Z"));
    const senderId = "U_SYNTHETIC_WP8D_TIMEOUT_TESTER";
    const coordinator = env.CONVERSATION_STATE.getByName(
      MP06_PILOT_CONTROL_OBJECT_NAME,
    );
    const initialCheckpointKeys = new Set(
      (
        await coordinator.mp06PilotLifecycleCheckpointSnapshot()
      ).checkpoints.map(
        (checkpoint) => `${checkpoint.clientRequestId}:${checkpoint.phase}`,
      ),
    );
    expect(
      await coordinator.activateMp06Pilot({
        sessionRef: hexRef(884),
        testerRefs: [await hashReference(senderId)],
        now: Date.now(),
        limits,
      }),
    ).toMatchObject({ activated: true });
    const network = vi.fn<typeof fetch>((input) => {
      if (requestUrl(input).startsWith("https://api.openai.com/")) {
        return new Promise<Response>(() => undefined);
      }
      return Promise.reject(new Error("LINE must not be called after timeout"));
    });
    vi.stubGlobal("fetch", network);
    try {
      const payload = JSON.stringify({
        destination: env.LINE_BOT_USER_ID,
        events: [
          {
            type: "message",
            webhookEventId: "evt-wp8d-provider-hang",
            replyToken: "reply-wp8d-provider-hang",
            source: { type: "user", userId: senderId },
            message: { type: "text", text: "เมนู" },
          },
        ],
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(
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
        env,
        ctx,
      );
      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(8_000);
      await waitOnExecutionContext(ctx);

      expect(network).toHaveBeenCalledTimes(1);
      expect(await coordinator.mp06PilotStatus(Date.now())).toMatchObject({
        state: "STOPPED",
        stopReason: "PROVIDER_USAGE_UNKNOWN",
        budgetReservedMicroUsd: 0,
        inFlight: 0,
      });
      const snapshot = await coordinator.mp06PilotLifecycleCheckpointSnapshot();
      expect(
        snapshot.checkpoints
          .filter(
            (checkpoint) =>
              !initialCheckpointKeys.has(
                `${checkpoint.clientRequestId}:${checkpoint.phase}`,
              ),
          )
          .map((checkpoint) => checkpoint.phase),
      ).toEqual([
        "DISPATCH_AUTHORIZED",
        "OUTBOUND_FETCH_STARTING",
        "FETCH_PROMISE_CREATED",
        "SETTLEMENT_STARTED",
        "SETTLEMENT_SUCCEEDED",
      ]);
      expect(
        await coordinator.mp06PilotAttemptDiagnostics(Date.now()),
      ).toMatchObject({
        sessionState: "STOPPED",
        latestLifecycle: { outcomeCode: "PROVIDER_DEADLINE" },
      });
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
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

function reconciliationInput(now: number) {
  return {
    now,
    expectedState: "STOPPED" as const,
    expectedStopReason: "IN_FLIGHT_USAGE_UNKNOWN" as const,
    expectedAdmittedEvents: 1 as const,
    expectedProviderAttempts: 1 as const,
    expectedBudgetConsumedMicroUsd: 0 as const,
    expectedBudgetReservedMicroUsd: 12_932 as const,
    expectedInFlight: 1 as const,
    disposition: "CONSUME_FULL_RESERVATION_NO_REFUND" as const,
  };
}

function exactReconciliationRequestBody(target: {
  readonly sessionRef: string;
  readonly attemptTargetRef: string;
}): string {
  return JSON.stringify({
    expectedSessionRef: target.sessionRef,
    expectedAttemptTargetRef: target.attemptTargetRef,
    expectedState: "STOPPED",
    expectedStopReason: "IN_FLIGHT_USAGE_UNKNOWN",
    expectedAdmittedEvents: 2,
    expectedProviderAttempts: 2,
    expectedBudgetConsumedMicroUsd: 12_932,
    expectedBudgetReservedMicroUsd: 12_932,
    expectedInFlight: 1,
    disposition: "CONSUME_FULL_RESERVATION_NO_REFUND",
  });
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

async function hashReference(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`malispang-test:${value}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validProviderResponse(): Response {
  return Response.json({
    model: MP06_AI_NLU_MODEL,
    usage: { input_tokens: 100, output_tokens: 50 },
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              schemaVersion: MP06_AI_NLU_SCHEMA_VERSION,
              candidateIntents: ["MENU"],
              extractedFields: { productName: null, size: "UNKNOWN" },
              missingRequiredFields: [],
              ambiguity: false,
              riskSignals: [],
              confidenceBand: "HIGH",
              reasonCodes: ["DIRECT_MATCH"],
            }),
          },
        ],
      },
    ],
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input;
}
