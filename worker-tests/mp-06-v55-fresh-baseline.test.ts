import {
  createExecutionContext,
  runInDurableObject,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, * as entry from "../worker/index.js";
import { sha256Reference } from "../worker/security.js";
import {
  mp06PilotLimitsFromEnvironment,
  MP06_PILOT_CONTROL_OBJECT_NAME,
} from "../worker/mp-06-pilot-control.js";
import {
  MP06_AI_NLU_MODEL,
  MP06_AI_NLU_SCHEMA_VERSION,
} from "../worker/mp-06-ai-nlu.js";
import { MP06_EXACT_TEMPLATES } from "../src/mp-06-policy-snapshot.js";

const origin = "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
const now = Date.parse("2026-10-03T07:00:00Z");
const ref = (n: number) => n.toString(16).padStart(64, "0");
const limits = mp06PilotLimitsFromEnvironment(env);
const stub = (label: string) =>
  env.CONVERSATION_STATE.getByName("v55-local:" + label);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function snapshot(target: ReturnType<typeof stub>) {
  return runInDurableObject(target, async (_object, state) => {
    const schema = state.storage.sql
      .exec<{ name: string; sql: string | null }>(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .toArray();
    return {
      schema,
      rows: schema
        .filter(({ name }) => !name.startsWith("_cf"))
        .map(({ name }) => ({
          name,
          rows: state.storage.sql
            .exec(
              'SELECT * FROM "' +
                name.replaceAll('"', '""') +
                '" ORDER BY rowid',
            )
            .toArray(),
        })),
      alarm: await state.storage.getAlarm(),
    };
  });
}
async function admin(
  query: string,
  overrides: Partial<Env> = {},
  method = "GET",
  token = env.TEST_ADMIN_KEY,
  host = origin,
) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(host + "/admin/mp06/conversation-observation" + query, {
      method,
      headers: { authorization: "Bearer " + token },
    }),
    { ...env, ...overrides },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

describe("v55 local-only fresh TEST namespace preparation", () => {
  it.each(["reply-text", "timestamp"])(
    "rejects corrupt per-event fields without leaking them: %s",
    async (kind) => {
      const target = stub("bad-event-" + kind);
      await runInDurableObject(target, (_i, state) => {
        state.storage.sql.exec(
          "INSERT INTO processed_events VALUES (?, ?, 1, 0, ?, 1)",
          ref(71),
          kind === "reply-text" ? "synthetic-private-text" : "NONE",
          kind === "timestamp" ? "synthetic-private-time" : now,
        );
      });
      const before = await snapshot(target);
      expect(await target.conversationObservation(ref(71))).toBeNull();
      expect(await snapshot(target)).toEqual(before);
    },
  );
  it("v62 step 1 keeps the original class names exported beside V2", () => {
    for (const name of [
      "ConversationStateDO",
      "DraftOrderDO",
      "HandoffRegistryDO",
      "PromotionControlDO",
    ]) {
      expect(Object.keys(entry)).toContain(name);
      expect(Object.keys(entry)).toContain(name + "V2");
    }
  });

  it.each(["fresh", "active", "stopped", "bad-reference"])(
    "denied resume leaves all tables and rows unchanged: %s",
    async (kind) => {
      const target = stub("resume-" + kind);
      if (kind === "active" || kind === "stopped") {
        expect(
          await target.activateMp06Pilot({
            sessionRef: ref(1),
            testerRefs: [ref(2)],
            now,
            limits,
          }),
        ).toMatchObject({ activated: true });
        if (kind === "stopped")
          await target.stopMp06Pilot(now + 1, "OPERATOR_STOP");
      }
      const before = await snapshot(target);
      expect(
        await target.resumeMp06Acceptance({
          expectedSessionRef: ref(1),
          operationRef: kind === "bad-reference" ? "bad" : ref(3),
          sessionRef: ref(4),
          now: now + 2,
          limits,
        }),
      ).toMatchObject({ activated: false, code: "INVALID_ACTIVATION" });
      expect(await snapshot(target)).toEqual(before);
      expect(
        before.schema.some(({ name }) => name === "mp06_wp8f_activation"),
      ).toBe(false);
      if (kind === "fresh" || kind === "bad-reference") {
        expect(
          await target.activateMp06Pilot({
            sessionRef: ref(5),
            testerRefs: [ref(2)],
            now: now + 3,
            limits,
          }),
        ).toMatchObject({
          activated: true,
          status: {
            admittedEvents: 0,
            providerAttempts: 0,
            budgetConsumedMicroUsd: 0,
            inFlight: 0,
          },
        });
      }
    },
  );

  it("does not erase or bypass an existing empty historical lineage marker", async () => {
    const target = stub("retained-empty-marker");
    await runInDurableObject(target, (_i, s) => {
      s.storage.sql.exec(
        "CREATE TABLE mp06_wp8f_activation (id INTEGER PRIMARY KEY, previous_session_ref TEXT, operation_ref TEXT, session_ref TEXT, activated_at INTEGER)",
      );
    });
    const before = await snapshot(target);
    expect(
      await target.resumeMp06Acceptance({
        expectedSessionRef: ref(1),
        operationRef: ref(3),
        sessionRef: ref(4),
        now,
        limits,
      }),
    ).toMatchObject({ activated: false });
    expect(await snapshot(target)).toEqual(before);
    expect(
      await target.activateMp06Pilot({
        sessionRef: ref(5),
        testerRefs: [ref(2)],
        now,
        limits,
      }),
    ).toMatchObject({ activated: false, code: "INVALID_ACTIVATION" });
  });

  it("observes a fresh conversation without creating events, purging, or changing alarms", async () => {
    const target = stub("readonly");
    const before = await snapshot(target);
    expect(await target.conversationObservation()).toEqual({
      mode: "BOT_ACTIVE",
      clarificationUsed: false,
      pendingTemplate: null,
      pendingProcessedEvents: 0,
      pendingResponsePlans: 0,
      deliveryClaims: {
        CLAIMED: 0,
        DELIVERED: 0,
        LEGACY_UNKNOWN: 0,
        DELIVERY_UNKNOWN: 0,
      },
      event: null,
    });
    expect(await target.conversationObservation(ref(9))).toMatchObject({
      event: { processed: null, plan: null, claim: null },
    });
    expect(await target.conversationObservation("bad")).toBeNull();
    expect(await snapshot(target)).toEqual(before);
  });

  it.each(["CLAIMED", "DELIVERED", "LEGACY_UNKNOWN", "DELIVERY_UNKNOWN"])(
    "reports per-event %s and preserves expired records without exposing private fields",
    async (claimState) => {
      const target = stub("claims-" + claimState);
      await runInDurableObject(target, (_i, s) => {
        s.storage.sql.exec(
          "INSERT INTO processed_events VALUES (?, 'PRICE', 0, 0, ?, 1)",
          ref(10),
          now,
        );
        s.storage.sql.exec(
          "INSERT INTO mp06_response_plans VALUES (?, 'synthetic-private-fingerprint', 0, ?, 1)",
          ref(10),
          now,
        );
        s.storage.sql.exec(
          "INSERT INTO delivery_claims (event_ref, owner_token, contract_version, state, claimed_at, acknowledged_at) VALUES (?, 'synthetic-private-owner-token', 1, ?, ?, NULL)",
          ref(10),
          claimState,
          now,
        );
      });
      const before = await snapshot(target);
      const result = await target.conversationObservation(ref(10));
      expect(result).toMatchObject({
        pendingProcessedEvents: 1,
        pendingResponsePlans: 1,
        event: {
          processed: { replyKind: "PRICE", delivered: false },
          plan: { delivered: false },
          claim: { state: claimState, acknowledgedAt: null },
        },
      });
      for (const forbidden of [
        ref(10),
        "synthetic-private",
        "owner_token",
        "fingerprint",
      ])
        expect(JSON.stringify(result)).not.toContain(forbidden);
      expect(await snapshot(target)).toEqual(before);
    },
  );

  it("fails closed on corrupt context rather than silently reporting a fresh baseline", async () => {
    const target = stub("corrupt");
    await runInDurableObject(target, (_i, s) => {
      s.storage.sql.exec(
        "UPDATE mp06_conversation_state SET pending_template_id = 'INVALID' WHERE id = 1",
      );
    });
    const before = await snapshot(target);
    expect(await target.conversationObservation()).toBeNull();
    expect(await snapshot(target)).toEqual(before);
  });

  it("authenticates and rejects malformed target requests before any DO lookup", async () => {
    const getByName = vi.fn(() => {
      throw new Error("MUST_NOT_TOUCH_OBJECT");
    });
    const local = {
      CONVERSATION_STATE: { getByName } as unknown as Env["CONVERSATION_STATE"],
    };
    expect(
      (await admin("?conversationRef=" + ref(1), local, "GET", "wrong")).status,
    ).toBe(401);
    expect(
      (await admin("?conversationRef=" + ref(1), local, "POST")).status,
    ).toBe(405);
    for (const query of [
      "",
      "?conversationRef=bad",
      "?conversationRef=" + ref(1) + "&eventRef=bad",
      "?conversationRef=" + ref(1) + "&conversationRef=" + ref(2),
      "?conversationRef=" + ref(1) + "&extra=1",
      "?conversationRef=" +
        ref(1) +
        "&eventRef=" +
        ref(2) +
        "&eventRef=" +
        ref(2),
    ])
      expect((await admin(query, local)).status).toBe(400);
    expect(
      (
        await admin(
          "?conversationRef=" + ref(1),
          local,
          "GET",
          env.TEST_ADMIN_KEY,
          "https://wrong.invalid",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await admin("?conversationRef=" + ref(1), {
          ...local,
          MP06_PILOT_CONTROL_ENABLED: "false",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin("?conversationRef=" + ref(1), {
          ...local,
          LINE_OA_ACCOUNT_NAME: "มะลิปัง",
        })
      ).status,
    ).toBe(503);
    expect(getByName).not.toHaveBeenCalled();
  });

  it("returns a no-store sanitized snapshot, with unavailable distinct from absent", async () => {
    const conversationRef = await sha256Reference("U_SYNTHETIC_V55_ADMIN");
    const target = env.CONVERSATION_STATE.getByName(conversationRef);
    const before = await snapshot(target);
    const response = await admin(
      "?conversationRef=" + conversationRef + "&eventRef=" + ref(11),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      observation: {
        mode: "BOT_ACTIVE",
        event: { processed: null, plan: null, claim: null },
      },
    });
    expect(JSON.stringify(body)).not.toContain(conversationRef);
    expect(await snapshot(target)).toEqual(before);
    await runInDurableObject(target, (_i, s) => {
      s.storage.sql.exec(
        "UPDATE mp06_conversation_state SET clarification_used = 2",
      );
    });
    expect((await admin("?conversationRef=" + conversationRef)).status).toBe(
      409,
    );
  });

  it("runs N1 clarification → N2 catalog → N3 handoff → STOP → N4 silent text on fresh local V2 state", async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    const actor = "U_SYNTHETIC_V55_N1_N4";
    const coordinatorName = "v55-local:fresh-coordinator";
    const coordinator = env.CONVERSATION_STATE.getByName(coordinatorName);
    const conversation = env.CONVERSATION_STATE.getByName(
      await sha256Reference(actor),
    );
    const namespace = new Proxy(env.CONVERSATION_STATE, {
      get(target, key) {
        if (key === "getByName")
          return (name: string) =>
            target.getByName(
              name === MP06_PILOT_CONTROL_OBJECT_NAME ? coordinatorName : name,
            );
        const value: unknown = Reflect.get(target, key);
        return typeof value === "function"
          ? (...args: unknown[]): unknown =>
              Reflect.apply(value, target, args) as unknown
          : value;
      },
    });
    const localEnv = {
      ...env,
      CONVERSATION_STATE: namespace,
      MP06_AI_NLU_ENABLED: "true",
    };
    expect(
      await coordinator.activateMp06Pilot({
        sessionRef: ref(21),
        testerRefs: [await sha256Reference(actor)],
        now,
        limits,
      }),
    ).toMatchObject({ activated: true });
    expect(await conversation.conversationObservation()).toMatchObject({
      mode: "BOT_ACTIVE",
      clarificationUsed: false,
      pendingTemplate: null,
    });
    let calls = 0;
    const provider = vi.fn(() =>
      providerResponse(++calls === 1 ? null : "แฮมชีส"),
    );
    const replies: string[] = [];
    const line = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body !== "string")
        throw new Error("EXPECTED_SERIALIZED_REPLY");
      replies.push(init.body);
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "https://api.openai.com/v1/responses")
        return Promise.resolve(provider());
      if (url === "https://api.line.me/v2/bot/message/reply")
        return line(input, init);
      throw new Error("UNEXPECTED_NETWORK_DESTINATION");
    });
    await send(actor, "ราคาเท่าไหร่", "v55-N1", localEnv);
    expect(
      await conversation.conversationObservation(
        await sha256Reference("v55-N1"),
      ),
    ).toMatchObject({
      mode: "BOT_ACTIVE",
      clarificationUsed: true,
      pendingTemplate: "T-C01",
      event: { plan: { delivered: true }, claim: { state: "DELIVERED" } },
    });
    expect(
      (JSON.parse(replies[0]!) as { messages: { text: string }[] }).messages[0]!
        .text,
    ).toBe(MP06_EXACT_TEMPLATES["T-C01"]);
    await send(actor, "แฮมชีส ปกติ", "v55-N2", localEnv);
    expect(
      await conversation.conversationObservation(
        await sha256Reference("v55-N2"),
      ),
    ).toMatchObject({
      mode: "BOT_ACTIVE",
      pendingTemplate: null,
      event: { plan: { delivered: true }, claim: { state: "DELIVERED" } },
    });
    expect(
      (JSON.parse(replies[1]!) as { messages: { text: string }[] }).messages[0]!
        .text,
    ).toBe(
      MP06_EXACT_TEMPLATES["T-A02"]
        .replace("{catalogDisplayName}", "แฮมชีส")
        .replace("{catalogDisplaySize}", " ขนาดปกติ")
        .replace("{catalogPrice}", "39"),
    );
    expect(provider).toHaveBeenCalledTimes(2);
    const beforeHandoff = await coordinator.mp06PilotStatus(now);
    await send(actor, "ขอคืนเงินทั้งหมด", "v55-N3", localEnv);
    expect(
      await conversation.conversationObservation(
        await sha256Reference("v55-N3"),
      ),
    ).toMatchObject({
      mode: "HUMAN_HANDOFF",
      event: {
        processed: { enteredHandoff: true, delivered: true },
        claim: { state: "DELIVERED" },
      },
    });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(line).toHaveBeenCalledTimes(3);
    expect(await coordinator.mp06PilotStatus(now)).toEqual(beforeHandoff);
    await coordinator.stopMp06Pilot(now, "OPERATOR_STOP");
    const stopped = await coordinator.mp06PilotStatus(now);
    await send(actor, "ร้านเปิดกี่โมง", "v55-N4", localEnv);
    expect(
      await conversation.conversationObservation(
        await sha256Reference("v55-N4"),
      ),
    ).toMatchObject({
      mode: "HUMAN_HANDOFF",
      event: { processed: { replyKind: "NONE" }, plan: null, claim: null },
    });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(line).toHaveBeenCalledTimes(3);
    expect(await coordinator.mp06PilotStatus(now)).toEqual(stopped);
    expect(stopped).toMatchObject({
      state: "STOPPED",
      inFlight: 0,
      budgetReservedMicroUsd: 0,
    });
  });
});

async function send(actor: string, text: string, event: string, localEnv: Env) {
  const payload = JSON.stringify({
    destination: env.LINE_BOT_USER_ID,
    events: [
      {
        type: "message",
        webhookEventId: event,
        replyToken: "synthetic-" + event,
        deliveryContext: { isRedelivery: false },
        source: { type: "user", userId: actor },
        message: { type: "text", text },
      },
    ],
  });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(payload),
        ),
      ),
    ),
  );
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(origin + "/webhook", {
      method: "POST",
      headers: { "x-line-signature": signature },
      body: payload,
    }),
    localEnv,
    ctx,
  );
  expect(response.status).toBe(200);
  await waitOnExecutionContext(ctx);
}
function providerResponse(product: string | null) {
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
              candidateIntents: ["PRICE"],
              extractedFields: {
                productName: product,
                size: product ? "NORMAL" : "UNKNOWN",
              },
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
