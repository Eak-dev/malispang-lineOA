import {
  createExecutionContext,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index.js";
import { newDraft } from "../src/draft-order.js";
import { MP06_PILOT_CONTROL_OBJECT_NAME } from "../worker/mp-06-pilot-control.js";

const ref = (n: number) => n.toString(16).padStart(64, "0");
const owner = ref(900);
const session = ref(3);
const event = ref(13);
const coordinator = () =>
  env.CONVERSATION_STATE.getByName(MP06_PILOT_CONTROL_OBJECT_NAME);
const conversation = () => env.CONVERSATION_STATE.getByName(owner);
const draft = () => env.DRAFT_ORDER.getByName(owner);
const endpoint =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev/admin/mp06-pilot/owner-uat-readiness";
const request = (suffix = "", authorized = true, method = "GET") =>
  new Request(endpoint + suffix, {
    method,
    headers: authorized ? { authorization: "Bearer unit-test-admin-key" } : {},
  });

async function activate() {
  const response = await exports.default.fetch(
    new Request(endpoint.replace("owner-uat-readiness", "resume-acceptance"), {
      method: "POST",
      headers: {
        authorization: "Bearer unit-test-admin-key",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expectedSessionRef: session,
        operationRef: ref(941),
      }),
    }),
  );
  expect(response.status).toBe(201);
  const observation = await coordinator().ownerUatPilotObservation();
  expect(observation).not.toBeNull();
  return observation!.sessionRef;
}

async function seedPurged() {
  const now = Date.now();
  await runInDurableObject(draft(), async (_i, s) => {
    s.storage.sql.exec(
      "INSERT INTO draft_current VALUES (1, ?, ?, ?)",
      JSON.stringify({
        ...newDraft(now - 2),
        state: "COLLECTING",
        expiresAt: now - 1,
      }),
      now - 2,
      now - 1,
    );
    await s.storage.setAlarm(now + 60_000);
  });
  expect(await runDurableObjectAlarm(draft())).toBe(true);
}

async function snapshot() {
  const pilot = await runInDurableObject(coordinator(), (_i, s) =>
    [
      "mp06_pilot_session",
      "mp06_pilot_attempts",
      "mp06_pilot_events",
      "mp06_pilot_testers",
    ].map((t) =>
      s.storage.sql.exec(`SELECT * FROM ${t} ORDER BY rowid`).toArray(),
    ),
  );
  const context = await runInDurableObject(conversation(), (_i, s) =>
    [
      "conversation_state",
      "mp06_conversation_state",
      "mp06_response_plans",
      "processed_events",
      "audit_events",
    ].map((t) =>
      s.storage.sql.exec(`SELECT * FROM ${t} ORDER BY rowid`).toArray(),
    ),
  );
  const order = await runInDurableObject(draft(), async (_i, s) => ({
    rows: [
      "draft_current",
      "draft_revisions",
      "draft_processed_events",
      "draft_audit",
    ].map((t) =>
      s.storage.sql.exec(`SELECT * FROM ${t} ORDER BY rowid`).toArray(),
    ),
    alarm: await s.storage.getAlarm(),
  }));
  const lineage = await runInDurableObject(coordinator(), (_i, s) => {
    const schema = s.storage.sql
      .exec("SELECT sql FROM sqlite_master WHERE name = 'mp06_wp8f_activation'")
      .toArray();
    return {
      schema,
      rows: schema.length
        ? s.storage.sql
            .exec("SELECT * FROM mp06_wp8f_activation ORDER BY id")
            .toArray()
        : [],
    };
  });
  return { pilot, context, order, lineage };
}

beforeEach(async () => {
  // Only local synthetic SQLite fixtures; no real identifiers or remote storage.
  await runInDurableObject(coordinator(), (_i, s) => {
    if (
      s.storage.sql
        .exec(
          "SELECT name FROM sqlite_master WHERE name = 'mp06_wp8f_activation'",
        )
        .toArray().length
    )
      s.storage.sql.exec("DELETE FROM mp06_wp8f_activation");
    for (const table of [
      "mp06_pilot_session",
      "mp06_pilot_attempts",
      "mp06_pilot_events",
      "mp06_pilot_testers",
    ])
      s.storage.sql.exec(`DELETE FROM ${table}`);
    s.storage.sql.exec(
      "INSERT INTO mp06_pilot_session VALUES (1, ?, 'STOPPED', 100, 3600100, 3, 3, 27824, 0, 0, 'OPERATOR_STOP')",
      session,
    );
    s.storage.sql.exec(
      "INSERT INTO mp06_pilot_testers VALUES (?, ?)",
      session,
      owner,
    );
    s.storage.sql.exec(
      "INSERT INTO mp06_pilot_events VALUES (?, ?, ?, 100, 1)",
      session,
      event,
      owner,
    );
    for (const index of [1, 2])
      s.storage.sql.exec(
        "INSERT INTO mp06_pilot_events VALUES (?, ?, ?, 100, 0)",
        ref(index),
        ref(10 + index),
        owner,
      );
    for (let i = 1; i <= 3; i++)
      s.storage.sql.exec(
        "INSERT INTO mp06_pilot_attempts VALUES (?, ?, ?, ?, 12932, ?, 100, 200, 150)",
        ref(i),
        ref(10 + i),
        ref(20 + i),
        i < 3 ? "USAGE_UNKNOWN" : "SETTLED",
        i === 1 ? 12932 : i === 2 ? null : 1960,
      );
  });
  await runInDurableObject(conversation(), (_i, s) => {
    s.storage.sql.exec("UPDATE conversation_state SET mode = 'BOT_ACTIVE'");
    s.storage.sql.exec(
      "UPDATE mp06_conversation_state SET clarification_used = 0, pending_template_id = NULL",
    );
    s.storage.sql.exec("DELETE FROM mp06_response_plans");
    s.storage.sql.exec(
      "INSERT INTO mp06_response_plans VALUES (?, 'synthetic-fingerprint', 1, 100, 10000000000000)",
      event,
    );
  });
  await runInDurableObject(draft(), (_i, s) => {
    for (const table of [
      "draft_current",
      "draft_processed_events",
      "draft_revisions",
      "draft_audit",
    ])
      s.storage.sql.exec(`DELETE FROM ${table}`);
  });
});

describe("local proposed read-only Owner readiness route", () => {
  it.each([
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.fields.name', 'SYNTHETIC_PRIVATE')",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.fields.items', json('[{}]'))",
    "UPDATE draft_current SET aggregate_json = json_remove(aggregate_json, '$.fields.items')",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.fields', json('[]'))",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.expiresAt', 1)",
    "UPDATE draft_current SET expires_at = 1",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.revision', -1)",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.catalogChecksum', 'UNKNOWN')",
    "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.extra', 'SYNTHETIC_PRIVATE')",
    "DELETE FROM draft_audit",
    "UPDATE draft_audit SET outcome = 'UNKNOWN'",
    "UPDATE draft_audit SET revision = revision + 1",
    'INSERT INTO draft_revisions VALUES (999, \'{"state":"COLLECTING","private":"SYNTHETIC_PRIVATE"}\', 1, 2)',
    "INSERT INTO draft_processed_events VALUES ('synthetic-pending', '{}', 0, 1, 9999999999999)",
  ])(
    "fails closed without repair for an incomplete purge invariant (%#)",
    async (mutation) => {
      await seedPurged();
      await runInDurableObject(
        draft(),
        (_i, s) => s.storage.sql.exec(mutation).rowsWritten,
      );
      const before = await snapshot();
      const response = await exports.default.fetch(request());
      const text = await response.text();
      expect(response.status).toBe(200);
      expect(JSON.parse(text)).toMatchObject({
        observation: {
          readyAtObservation: false,
          draft: { nonBlocking: false },
        },
      });
      expect(text).not.toContain("SYNTHETIC_PRIVATE");
      expect(await snapshot()).toEqual(before);
    },
  );

  it.each([
    "COLLECTING",
    "CANCELLED",
    "FAILED_REVIEW",
    "AWAITING_STAFF_REVIEW",
    "NO_DRAFT",
  ])("does not blanket-allow other stored states: %s", async (state) => {
    await seedPurged();
    await runInDurableObject(
      draft(),
      (_i, s) =>
        s.storage.sql.exec(
          "UPDATE draft_current SET aggregate_json = json_set(aggregate_json, '$.state', ?)",
          state,
        ).rowsWritten,
    );
    const before = await snapshot();
    const response = await exports.default.fetch(request());
    expect(await response.json()).toMatchObject({
      observation: {
        activationEligibility: { eligibleAtObservation: false },
        draft: { nonBlocking: false },
      },
    });
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    "DELETE FROM mp06_wp8f_activation",
    "UPDATE mp06_wp8f_activation SET previous_session_ref = session_ref",
    "UPDATE mp06_wp8f_activation SET previous_session_ref = 'unknown'",
    "UPDATE mp06_wp8f_activation SET session_ref = previous_session_ref",
    "UPDATE mp06_wp8f_activation SET operation_ref = 'unknown'",
    "UPDATE mp06_wp8f_activation SET operation_ref = printf('%064x', 942)",
    "UPDATE mp06_wp8f_activation SET activated_at = activated_at + 1",
    "DELETE FROM mp06_pilot_testers",
    "UPDATE mp06_pilot_testers SET tester_ref = printf('%064x', 999)",
    "INSERT INTO mp06_pilot_testers SELECT session_ref, printf('%064x', 999) FROM mp06_pilot_testers",
    "UPDATE mp06_pilot_session SET budget_consumed_micro_usd = 27825",
    "UPDATE mp06_pilot_session SET expires_at = expires_at + 1",
  ])(
    "denies missing, changed or ambiguous lineage/accounting after stop (%#)",
    async (mutation) => {
      await activate();
      await coordinator().stopMp06Pilot(Date.now(), "OPERATOR_STOP");
      await runInDurableObject(
        coordinator(),
        (_i, s) => s.storage.sql.exec(mutation).rowsWritten,
      );
      const before = await snapshot();
      const response = await exports.default.fetch(request());
      expect(response.status).toBe(409);
      const text = await response.text();
      expect(text).not.toContain(owner);
      expect(text).not.toContain(session);
      expect(await snapshot()).toEqual(before);
    },
  );

  it("observes a real pending attempt and conservative settlement across stop without mutating or authorizing a reply", async () => {
    const sessionRef = await activate();
    const input = {
      sessionRef,
      eventRef: ref(970),
      attemptRef: ref(971),
      now: Date.now(),
    };
    expect(
      await coordinator().admitMp06PilotEvent({ ...input, testerRef: owner }),
    ).toMatchObject({ admitted: true });
    expect(
      await coordinator().reserveMp06PilotAttempt({
        ...input,
        upperBoundCostMicroUsd: 12932,
      }),
    ).toMatchObject({ accepted: true });
    expect(
      await coordinator().authorizeMp06PilotDispatch({
        ...input,
        clientRequestId: "synthetic-v15",
      }),
    ).toMatchObject({ accepted: true });
    await coordinator().stopMp06Pilot(Date.now(), "OPERATOR_STOP");
    const before = await snapshot();
    const pending = await exports.default.fetch(request());
    expect(pending.status).toBe(200);
    expect(await pending.json()).toMatchObject({
      observation: {
        activationEligibility: { eligibleAtObservation: false },
        stateObservation: {
          pilot: "STOPPED",
          aiAdmission: false,
          replyAuthorizedByResponse: false,
          dispatchAuthorizedByResponse: false,
        },
        accounting: {
          events: 4,
          attempts: 4,
          consumedMicroUsd: 27824,
          reservedMicroUsd: 12932,
          inFlight: 1,
          pendingAttempts: 1,
          usageUnknownAttempts: 2,
          settledAttempts: 1,
        },
      },
    });
    expect(await snapshot()).toEqual(before);
    expect(
      await coordinator().settleMp06PilotAttempt({
        ...input,
        outcome: "USAGE_UNKNOWN",
      }),
    ).toMatchObject({ accepted: true });
    const terminal = await snapshot();
    const settled = await exports.default.fetch(request());
    expect(settled.status).toBe(200);
    expect(await settled.json()).toMatchObject({
      observation: {
        accounting: {
          consumedMicroUsd: 40756,
          conservativeMicroUsd: 38796,
          reportedUsageMicroUsd: 1960,
          reservedMicroUsd: 0,
          inFlight: 0,
          pendingAttempts: 0,
          usageUnknownAttempts: 3,
          settledAttempts: 1,
          independentlyVerifiedBilling: "UNKNOWN",
        },
      },
    });
    expect(await snapshot()).toEqual(terminal);
    expect(
      await coordinator().settleMp06PilotAttempt({
        ...input,
        outcome: "KNOWN",
        actualCostMicroUsd: 0,
      }),
    ).toMatchObject({ code: "SETTLED_IDEMPOTENT" });
    expect(await snapshot()).toEqual(terminal);
  });

  it("observes expiry without executing expiry or cleanup", async () => {
    await activate();
    const before = await snapshot();
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3_600_001);
    try {
      const ctx = createExecutionContext();
      const response = await worker.fetch(request(), env, ctx);
      expect(response.status).toBe(200);
      // Clock control is local to this handler, not a remote request or activation extension.
      expect(await response.json()).toMatchObject({
        observation: {
          activationEligibility: { eligibleAtObservation: false },
          stateObservation: { expiredAtObservation: true, aiAdmission: false },
        },
      });
      await waitOnExecutionContext(ctx);
    } finally {
      clock.mockRestore();
    }
    expect(await snapshot()).toEqual(before);
  });

  it("rejects two-read ledger drift using real SQLite observations, not a mock counter", async () => {
    let reads = 0;
    const namespace = new Proxy(env.CONVERSATION_STATE, {
      get(target, property) {
        if (property !== "getByName")
          return Reflect.get(target, property) as unknown;
        return (name: string) => {
          const stub = target.getByName(name);
          if (name !== MP06_PILOT_CONTROL_OBJECT_NAME) return stub;
          return new Proxy(stub, {
            get(object, method) {
              if (method !== "ownerUatPilotObservation")
                return Reflect.get(object, method) as unknown;
              return async () => {
                if (++reads === 2)
                  await runInDurableObject(
                    coordinator(),
                    (_i, s) =>
                      s.storage.sql.exec(
                        "UPDATE mp06_pilot_events SET admitted_at = admitted_at + 1",
                      ).rowsWritten,
                  );
                return object.ownerUatPilotObservation();
              };
            },
          });
        };
      },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(
      request(),
      { ...env, CONVERSATION_STATE: namespace },
      ctx,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      audit: { code: "READINESS_CHANGED_DURING_READ" },
    });
    await waitOnExecutionContext(ctx);
    const after = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(200);
    expect(await snapshot()).toEqual(after);
  });
  it("reconciles the typed historical subtotal without treating the legacy actual_cost column as billing", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("NETWORK_FORBIDDEN"));
    const logs = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const before = await snapshot();
      expect(await coordinator().ownerUatPilotObservation()).toMatchObject({
        ownerRef: owner,
      });
      expect(
        await conversation().ownerUatConversationObservation(event),
      ).toMatchObject({ mode: "BOT_ACTIVE" });
      expect(await draft().ownerUatDraftObservation()).toMatchObject({
        state: "NO_DRAFT",
      });
      const r = await exports.default.fetch(request());
      expect(r.status).toBe(200);
      expect(r.headers.get("cache-control")).toBe("no-store");
      const text = await r.text();
      expect(JSON.parse(text)).toMatchObject({
        observation: {
          readyAtObservation: true,
          activationAuthorizedByResponse: false,
          accounting: {
            consumedMicroUsd: 27824,
            conservativeMicroUsd: 25864,
            reportedUsageMicroUsd: 1960,
            independentlyVerifiedBilling: "UNKNOWN",
          },
        },
      });
      for (const forbidden of [
        owner,
        session,
        event,
        "unit-test-admin-key",
        "aggregate_json",
      ])
        expect(text).not.toContain(forbidden);
      expect(await snapshot()).toEqual(before);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      logs.mockRestore();
    }
  });

  it("rejects unauthorized, alternate target, query selector and mutation methods", async () => {
    const before = await snapshot();
    expect((await exports.default.fetch(request("", false))).status).toBe(401);
    for (const r of [
      request("?conversationRef=" + ref(999)),
      request("", true, "POST"),
      new Request(
        "https://other.invalid/admin/mp06-pilot/owner-uat-readiness",
        { headers: { authorization: "Bearer unit-test-admin-key" } },
      ),
    ])
      expect((await exports.default.fetch(r)).status).toBe(403);
    expect(await snapshot()).toEqual(before);
  });

  it("rejects non-TEST identity and disabled pilot controls", async () => {
    const before = await snapshot();
    for (const override of [
      { ENVIRONMENT: "PRODUCTION" },
      { LINE_OA_ACCOUNT_NAME: "other" },
      { MP06_PILOT_CONTROL_ENABLED: "false" },
    ]) {
      const ctx = createExecutionContext();
      const r = await worker.fetch(request(), { ...env, ...override }, ctx);
      expect(r.status).toBeGreaterThanOrEqual(400);
      await waitOnExecutionContext(ctx);
    }
    expect(await snapshot()).toEqual(before);
  });

  it("rejects missing/ambiguous private Owner linkage and unknown delivered-event provenance", async () => {
    await runInDurableObject(
      coordinator(),
      (_i, s) =>
        s.storage.sql.exec(
          "INSERT INTO mp06_pilot_testers VALUES (?, ?)",
          session,
          ref(999),
        ).rowsWritten,
    );
    let before = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
    await runInDurableObject(
      coordinator(),
      (_i, s) =>
        s.storage.sql.exec(
          "DELETE FROM mp06_pilot_testers WHERE tester_ref = ?",
          ref(999),
        ).rowsWritten,
    );
    await runInDurableObject(
      conversation(),
      (_i, s) =>
        s.storage.sql.exec("DELETE FROM mp06_response_plans").rowsWritten,
    );
    before = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });

  it("reports stale clarification, handoff and blocking draft without repairing or leaking content", async () => {
    await runInDurableObject(conversation(), (_i, s) => {
      s.storage.sql.exec(
        "UPDATE mp06_conversation_state SET clarification_used = 1, pending_template_id = 'T-C01'",
      );
      s.storage.sql.exec(
        "UPDATE conversation_state SET mode = 'HUMAN_HANDOFF'",
      );
    });
    await runInDurableObject(
      draft(),
      (_i, s) =>
        s.storage.sql.exec(
          "INSERT INTO draft_current VALUES (1, ?, 100, 200)",
          JSON.stringify({
            state: "COLLECTING",
            privateFixture: "DO_NOT_OUTPUT_SYNTHETIC_CONTENT",
          }),
        ).rowsWritten,
    );
    const before = await snapshot();
    const r = await exports.default.fetch(request());
    const text = await r.text();
    expect(JSON.parse(text)).toMatchObject({
      audit: { code: "CONVERSATION_RECOVERY_REVIEW_REQUIRED" },
      observation: {
        readyAtObservation: false,
        conversation: {
          mode: "HUMAN_HANDOFF",
          clarificationUsed: true,
          pendingTemplate: "T-C01",
        },
        draft: { state: "COLLECTING" },
      },
    });
    expect(text).not.toContain("DO_NOT_OUTPUT");
    expect(await snapshot()).toEqual(before);
  });

  it("denies changed accounting and malformed state without hidden cleanup", async () => {
    await runInDurableObject(
      coordinator(),
      (_i, s) =>
        s.storage.sql.exec(
          "UPDATE mp06_pilot_session SET state = 'ACTIVE', expires_at = 1, in_flight = 1, budget_reserved_micro_usd = 12932",
        ).rowsWritten,
    );
    const before = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
    // Reproduces the legacy GET's hidden state transition in local storage only.
    await coordinator().mp06PilotStatus(Date.now());
    expect(await snapshot()).not.toEqual(before);
  });

  it("survives restart and read replay without mutating accounting, state or audit tables", async () => {
    const before = await snapshot();
    await evictDurableObject(coordinator());
    await evictDurableObject(conversation());
    await evictDurableObject(draft());
    for (let i = 0; i < 2; i++)
      expect((await exports.default.fetch(request())).status).toBe(200);
    expect(await snapshot()).toEqual(before);
  });

  it("fails closed on storage/parser errors with sanitized output", async () => {
    await runInDurableObject(
      draft(),
      (_i, s) =>
        s.storage.sql.exec(
          "INSERT INTO draft_current VALUES (1, 'malformed synthetic private payload', 100, NULL)",
        ).rowsWritten,
    );
    const before = await snapshot();
    const r = await exports.default.fetch(request());
    expect(r.status).toBe(409);
    const text = await r.text();
    expect(text).not.toContain("private payload");
    expect(text).not.toContain(owner);
    expect(await snapshot()).toEqual(before);
  });

  it("does not treat a stored draft with a missing state as NO_DRAFT", async () => {
    await runInDurableObject(
      draft(),
      (_i, s) =>
        s.storage.sql.exec(
          "INSERT INTO draft_current VALUES (1, '{}', 100, NULL)",
        ).rowsWritten,
    );
    const before = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });

  it("recognizes a genuinely alarm-purged non-intercepting draft only after every purge invariant passes", async () => {
    const now = Date.now();
    await runInDurableObject(draft(), async (_i, s) => {
      s.storage.sql.exec(
        "INSERT INTO draft_current VALUES (1, ?, ?, ?)",
        JSON.stringify({
          ...newDraft(now - 2),
          state: "COLLECTING",
          expiresAt: now - 1,
        }),
        now - 2,
        now - 1,
      );
      await s.storage.setAlarm(now + 60_000);
    });
    expect(await runDurableObjectAlarm(draft())).toBe(true);
    const before = await snapshot();
    expect(
      await draft().processText({
        eventRef: ref(940),
        text: "ราคาเท่าไหร่",
        now: Date.now(),
        startRequested: false,
        promotion: { enabled: false, revision: 0, startAt: 0, endAt: 0 },
        auditRetentionSeconds: 604800,
      }),
    ).toMatchObject({
      handled: false,
      state: "EXPIRED_PURGED",
      messages: [],
      enterHandoff: false,
    });
    const response = await exports.default.fetch(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      audit: { code: "READINESS_OBSERVED" },
      observation: {
        readyAtObservation: true,
        activationEligibility: {
          eligibleAtObservation: true,
          authorizedByResponse: false,
        },
        draft: {
          state: "EXPIRED_PURGED",
          pendingReplies: 0,
          nonBlocking: true,
          purgeInvariants: {
            validStructure: true,
            noRetainedCustomerFields: true,
            noRetainedItems: true,
            noActiveExpiry: true,
            purgedHistory: true,
            validPurgeAudit: true,
            noPendingDelivery: true,
          },
        },
      },
    });
    expect(await snapshot()).toEqual(before);
  });

  it("preserves read-only provenance through HTTP activation, active session, stop and restart without granting activation", async () => {
    const response = await exports.default.fetch(
      new Request(
        endpoint.replace("owner-uat-readiness", "resume-acceptance"),
        {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            expectedSessionRef: session,
            operationRef: ref(941),
          }),
        },
      ),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ outcome: "ACTIVATED" });
    let before = await snapshot();
    const active = await exports.default.fetch(request());
    expect(active.status).toBe(200);
    expect(await active.json()).toMatchObject({
      observation: {
        activationEligibility: {
          eligibleAtObservation: false,
          authorizedByResponse: false,
        },
        stateObservation: {
          available: true,
          pilot: "ACTIVE",
          lineage: "IMMUTABLE_PREVIOUS_CURRENT_SESSION",
          aiAdmission: true,
        },
        accounting: {
          events: 3,
          attempts: 3,
          consumedMicroUsd: 27824,
          reservedMicroUsd: 0,
          inFlight: 0,
        },
      },
    });
    expect(await snapshot()).toEqual(before);
    await coordinator().stopMp06Pilot(Date.now(), "OPERATOR_STOP");
    before = await snapshot();
    await evictDurableObject(coordinator());
    const stopped = await exports.default.fetch(request());
    expect(stopped.status).toBe(200);
    expect(await stopped.json()).toMatchObject({
      observation: {
        activationEligibility: { eligibleAtObservation: false },
        stateObservation: {
          available: true,
          pilot: "STOPPED",
          aiAdmission: false,
        },
        accounting: {
          events: 3,
          attempts: 3,
          consumedMicroUsd: 27824,
          reservedMicroUsd: 0,
          inFlight: 0,
        },
      },
    });
    expect(await snapshot()).toEqual(before);
  });
});
