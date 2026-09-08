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
  return { pilot, context, order };
}

beforeEach(async () => {
  // Only local synthetic SQLite fixtures; no real identifiers or remote storage.
  await runInDurableObject(coordinator(), (_i, s) => {
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
    for (const table of ["draft_current", "draft_processed_events"])
      s.storage.sql.exec(`DELETE FROM ${table}`);
  });
});

describe("local proposed read-only Owner readiness route", () => {
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

  it("reproduces the readiness gap for a genuinely alarm-purged, non-intercepting draft without resetting it", async () => {
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
      audit: { code: "CONVERSATION_RECOVERY_REVIEW_REQUIRED" },
      observation: {
        readyAtObservation: false,
        draft: { state: "EXPIRED_PURGED", pendingReplies: 0 },
      },
    });
    expect(await snapshot()).toEqual(before);
  });

  it("reproduces loss of read observation after the existing one-shot activation, including after stop", async () => {
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
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
    await coordinator().stopMp06Pilot(Date.now(), "OPERATOR_STOP");
    before = await snapshot();
    expect((await exports.default.fetch(request())).status).toBe(409);
    expect(await snapshot()).toEqual(before);
  });
});
