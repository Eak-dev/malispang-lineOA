import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import type { ProcessEventInput } from "../worker/durable-objects.js";

const baseInput: ProcessEventInput = {
  eventRef: "a".repeat(64),
  decision: {
    replyKind: "HANDOFF_ACK",
    reasonCode: "CUSTOMER_REQUESTED_STAFF",
    handoff: true,
  },
  now: 1_786_680_000_000,
  processedRetentionSeconds: 86_400,
  auditRetentionSeconds: 604_800,
};

describe("Durable Object persistence and webhook security", () => {
  it("persists handoff, acknowledges once, and deduplicates a delivered event", async () => {
    const stub = env.CONVERSATION_STATE.getByName("conversation-a");
    const first = await stub.processEvent(baseInput);
    expect(first).toEqual({
      status: "RESPOND",
      replyKind: "HANDOFF_ACK",
      enteredHandoff: true,
    });
    await stub.markDelivered(baseInput.eventRef);
    expect(await stub.processEvent(baseInput)).toMatchObject({
      status: "DUPLICATE",
    });
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("stays silent for every later customer event during handoff", async () => {
    const stub = env.CONVERSATION_STATE.getByName("conversation-b");
    await stub.processEvent(baseInput);
    const later = await stub.processEvent({
      ...baseInput,
      eventRef: "b".repeat(64),
      decision: {
        replyKind: "MENU",
        reasonCode: "FAQ_MENU_TEST_SEED",
        handoff: false,
      },
    });
    expect(later).toEqual({
      status: "SILENT",
      replyKind: "NONE",
      enteredHandoff: false,
    });
  });

  it("allows an authenticated and authorized Test staff close", async () => {
    const conversationRef = "c".repeat(64);
    const stub = env.CONVERSATION_STATE.getByName(conversationRef);
    await stub.processEvent(baseInput);
    await env.HANDOFF_REGISTRY.getByName("test-active-handoffs").activate(
      conversationRef,
      baseInput.now,
    );
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/handoff/close", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ conversationRef, staffId: "OWNER_TEST" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await stub.state()).toBe("BOT_ACTIVE");
  });

  it("rejects unauthorized staff-close and keeps handoff active", async () => {
    const conversationRef = "d".repeat(64);
    const stub = env.CONVERSATION_STATE.getByName(conversationRef);
    await stub.processEvent(baseInput);
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/handoff/close", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ conversationRef, staffId: "UNKNOWN_STAFF" }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("rejects an invalid LINE signature before parsing or persistence", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/webhook", {
        method: "POST",
        headers: { "x-line-signature": "invalid" },
        body: JSON.stringify({
          destination: "U_TEST_ONLY_DESTINATION",
          events: [],
        }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests larger than the configured webhook limit", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/webhook", {
        method: "POST",
        headers: { "content-length": String(1024 * 1024 + 1) },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
  });

  it("exposes only a Test-safe health response", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/health"),
    );
    expect(await response.json()).toEqual({
      status: "ok",
      environment: "TEST",
      account: "มะลิปัง TEST",
      persistence: "durable-object-sqlite",
    });
  });

  it("fails closed when a required Test secret is missing", async () => {
    const original = env.LINE_CHANNEL_SECRET;
    env.LINE_CHANNEL_SECRET = "";
    try {
      const response = await exports.default.fetch(
        new Request("https://test.invalid/admin/handoffs", {
          headers: { authorization: "Bearer unit-test-admin-key" },
        }),
      );
      expect(response.status).toBe(503);
    } finally {
      env.LINE_CHANNEL_SECRET = original;
    }
  });
});
