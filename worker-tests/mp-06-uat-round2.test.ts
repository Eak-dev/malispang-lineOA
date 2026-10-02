import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MP06_UAT_ROUND2_CASES as cases,
  evaluateMp06UatRound2Gate,
  type Mp06UatRound2Observation,
  type Mp06UatRound2Step,
} from "../src/mp-06-uat-round2-gate.js";
import { MP06_EXACT_TEMPLATES } from "../src/mp-06-policy-snapshot.js";
import worker from "../worker/index.js";
import { HANDOFF_ACKNOWLEDGEMENT } from "../worker/routing.js";
import {
  MP06_AI_NLU_MODEL,
  MP06_AI_NLU_SCHEMA_VERSION,
} from "../worker/mp-06-ai-nlu.js";
import { MP06_PILOT_CONTROL_OBJECT_NAME } from "../worker/mp-06-pilot-control.js";

const host = "https://malispang-lineoa-test-uat2.eakkachai-dev.workers.dev";

async function hashReference(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`malispang-test:${value}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
async function lineSignature(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.LINE_CHANNEL_SECRET),
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
// Each scenario gets its own pilot coordinator, as a freshly deployed Worker
// would; the Worker under test still resolves the production object name.
let pilotObject = MP06_PILOT_CONTROL_OBJECT_NAME;
const namespace = new Proxy(env.CONVERSATION_STATE, {
  get(target, key) {
    if (key === "getByName")
      return (name: string) =>
        target.getByName(
          name === MP06_PILOT_CONTROL_OBJECT_NAME ? pilotObject : name,
        );
    const value: unknown = Reflect.get(target, key);
    return typeof value === "function"
      ? (...args: unknown[]): unknown =>
          Reflect.apply(value, target, args) as unknown
      : value;
  },
});
async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(host + path, init),
    {
      ...env,
      CONVERSATION_STATE: namespace,
      MP06_AI_NLU_ENABLED: "false",
    } as Env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}
const admin = (path: string, method = "GET", body?: unknown) =>
  call(path, {
    method,
    headers: { authorization: `Bearer ${env.TEST_ADMIN_KEY}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function send(user: string, id: string, text: string) {
  const payload = JSON.stringify({
    destination: env.LINE_BOT_USER_ID,
    events: [
      {
        type: "message",
        webhookEventId: id,
        replyToken: "synthetic-" + id,
        deliveryContext: { isRedelivery: false },
        source: { type: "user", userId: user },
        message: { type: "text", text },
      },
    ],
  });
  const response = await call("/webhook", {
    method: "POST",
    headers: { "x-line-signature": await lineSignature(payload) },
    body: payload,
  });
  expect(response.status).toBe(200);
}
function provider(product: string | null): Response {
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
async function observe(
  conversationRef: string,
): Promise<Mp06UatRound2Observation> {
  const status = await (
    await admin("/admin/mp06-pilot/status")
  ).json<{ pilot: Mp06UatRound2Observation["pilot"] }>();
  const audit = await (
    await admin("/admin/audit?conversationRef=" + conversationRef)
  ).json<{ events: { outcome: string; reasonCode: string }[] }>();
  return {
    observedAt: Date.now(),
    pilot: status.pilot,
    audit: audit.events.map((e) => [e.outcome, e.reasonCode] as const),
  };
}

interface Round2 {
  readonly user: string;
  readonly ref: string;
  readonly replies: string[];
  readonly providerCalls: () => number;
  readonly accepted: Partial<
    Record<Mp06UatRound2Step, Mp06UatRound2Observation>
  >;
}
async function round2(label: string): Promise<Round2> {
  const user = "U_SYNTHETIC_ROUND2_" + label;
  const ref = await hashReference(user);
  const replies: string[] = [];
  let calls = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://api.openai.com/v1/responses")
      return Promise.resolve(provider(++calls === 1 ? null : "แฮมชีส"));
    if (url === "https://api.line.me/v2/bot/message/reply") {
      replies.push(
        (JSON.parse(init?.body as string) as { messages: { text: string }[] })
          .messages[0]!.text,
      );
      return Promise.resolve(new Response(null, { status: 200 }));
    }
    throw new Error("UNEXPECTED_NETWORK_DESTINATION");
  });
  pilotObject = "mp06-uat-round2-pilot:" + label;
  const activated = await admin("/admin/mp06-pilot/activate", "POST", {
    testerRefs: [ref],
  });
  expect(activated.status).toBe(201);
  return { user, ref, replies, providerCalls: () => calls, accepted: {} };
}
const order: readonly Mp06UatRound2Step[] = ["R1", "R2", "R3", "R4", "FINAL"];
async function gate(r: Round2, step: Mp06UatRound2Step) {
  const observation = await observe(r.ref);
  const previousStep = order[order.indexOf(step) - 1];
  const result = evaluateMp06UatRound2Gate({
    step,
    observation,
    ...(previousStep ? { previous: r.accepted[previousStep] } : {}),
    now: Date.now(),
  });
  if (result.allowed) r.accepted[step] = observation;
  return result;
}
async function sendCase(r: Round2, step: Mp06UatRound2Step) {
  const c = cases.find((x) => x.id === step)!;
  await send(r.user, "round2-" + r.user + "-" + step, c.text);
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

afterEach(() => vi.unstubAllGlobals());

describe("MP-06 v51 UAT round 2 local preparation", () => {
  it("runs R1, R2, R3, STOP, R4 from fresh storage with a passing gate before every case", async () => {
    const r = await round2("FULL");
    for (const step of ["R1", "R2", "R3"] as const) {
      expect(await gate(r, step)).toEqual({
        allowed: true,
        reason: "ROUND2_SEND_" + step,
      });
      await tick();
      await sendCase(r, step);
      await tick();
    }
    expect((await admin("/admin/mp06-pilot/stop", "POST")).status).toBe(200);
    expect(await gate(r, "R4")).toEqual({
      allowed: true,
      reason: "ROUND2_SEND_R4",
    });
    await tick();
    await sendCase(r, "R4");
    await tick();
    expect(await gate(r, "FINAL")).toEqual({
      allowed: true,
      reason: "ROUND2_COMPLETE_VERIFIED",
    });
    expect(r.replies).toEqual([
      MP06_EXACT_TEMPLATES["T-C01"],
      expect.stringContaining("แฮมชีส ขนาดปกติ ราคา 39 บาท"),
      HANDOFF_ACKNOWLEDGEMENT,
    ]);
    expect(r.replies[1]).toBe(
      MP06_EXACT_TEMPLATES["T-A02"]
        .replace("{catalogDisplayName}", "แฮมชีส")
        .replace("{catalogDisplaySize}", " ขนาดปกติ")
        .replace("{catalogPrice}", "39"),
    );
    // R3 is deterministic and R4 is silent: only R1 and R2 reach the provider.
    expect(r.providerCalls()).toBe(2);
    expect(r.accepted.FINAL?.pilot).toMatchObject({
      state: "STOPPED",
      admittedEvents: 2,
      budgetReservedMicroUsd: 0,
      inFlight: 0,
    });
  });

  it("stops the round when an unplanned message lands between cases", async () => {
    const r = await round2("INJECTED");
    expect((await gate(r, "R1")).allowed).toBe(true);
    await tick();
    await sendCase(r, "R1");
    await send(r.user, "round2-injected-extra", "ร้านอยู่ที่ไหน");
    await tick();
    expect(await gate(r, "R2")).toEqual({
      allowed: false,
      reason: "ROUND2_CONVERSATION_DRIFT_STOP",
    });
  });

  it("detects the round-1 failure mode: a catalog follow-up while STOPPED clears T-C01 without AI accounting", async () => {
    const r = await round2("STOPPED_FOLLOW_UP");
    expect((await gate(r, "R1")).allowed).toBe(true);
    await tick();
    await sendCase(r, "R1");
    await tick();
    const afterR1 = await observe(r.ref);
    expect((await admin("/admin/mp06-pilot/stop", "POST")).status).toBe(200);
    await sendCase(r, "R2");
    const after = await observe(r.ref);
    // Accounting is unchanged, so only the conversation audit reveals the event.
    expect(after.pilot).toMatchObject({
      admittedEvents: afterR1.pilot.admittedEvents,
      providerAttempts: afterR1.pilot.providerAttempts,
      budgetConsumedMicroUsd: afterR1.pilot.budgetConsumedMicroUsd,
    });
    expect(after.audit.length).toBe(afterR1.audit.length + 2);
    expect(r.providerCalls()).toBe(1);
    expect((await gate(r, "R2")).allowed).toBe(false);
  });

  it("denies R4 unless the operator STOP happened first", async () => {
    const r = await round2("NO_STOP");
    for (const step of ["R1", "R2", "R3"] as const) {
      expect((await gate(r, step)).allowed).toBe(true);
      await tick();
      await sendCase(r, step);
      await tick();
    }
    expect(await gate(r, "R4")).toEqual({
      allowed: false,
      reason: "ROUND2_STOP_REQUIRED",
    });
  });
  it.each([
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_BOT_USER_ID",
    "TEST_ADMIN_KEY",
    "TEST_REWARD_CARD_URL",
  ])(
    "fails every non-health route closed before step C while %s is unset",
    async (secret) => {
      // v52 deploys uat2 before any secret exists; only /health may answer.
      const bare = { ...env } as Record<string, unknown>;
      delete bare[secret];
      const request = async (path: string, init: RequestInit = {}) => {
        const ctx = createExecutionContext();
        const response = await worker.fetch(
          new Request(host + path, init),
          bare as unknown as Env,
          ctx,
        );
        await waitOnExecutionContext(ctx);
        return response;
      };
      expect((await request("/health")).status).toBe(200);
      for (const [path, init] of [
        ["/admin/mp06-pilot/status", {}],
        ["/admin/mp06-pilot/status", { headers: { authorization: "Bearer " } }],
        ["/admin/mp06-pilot/activate", { method: "POST", body: "{}" }],
        ["/admin/audit?conversationRef=" + "a".repeat(64), {}],
        ["/webhook", { method: "POST", body: "{}" }],
      ] as const) {
        const response = await request(path, init);
        expect(response.status, path).toBe(503);
        expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
      }
    },
  );
});
