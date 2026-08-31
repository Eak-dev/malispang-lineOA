import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import type { ProcessEventInput } from "../worker/durable-objects.js";
import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "../worker/knowledge.js";
import {
  HANDOFF_ACKNOWLEDGEMENT,
  classifyPostback,
  classifyText,
  replyMessages,
} from "../worker/routing.js";

const baseInput: ProcessEventInput = {
  eventRef: "a".repeat(64),
  decision: {
    replyKind: "HANDOFF_ACK",
    reasonCode: "CUSTOMER_REQUESTED_STAFF",
    handoff: true,
    allowDuringHandoff: false,
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
        reasonCode: "KB_MENU_NOT_AUTHORITATIVE",
        handoff: false,
        allowDuringHandoff: false,
      },
    });
    expect(later).toEqual({
      status: "SILENT",
      replyKind: "NONE",
      enteredHandoff: false,
    });
  });

  it.each([
    ["test:main_menu", "FLEX_MENU"],
    ["test:show_menu", "MENU"],
    ["test:show_price", "PRICE"],
    ["test:show_location", "LOCATION"],
    ["test:show_hours", "HOURS"],
    ["test:show_rewards", "LOYALTY"],
    ["test:show_delivery", "DELIVERY"],
  ] as const)(
    "answers approved static postback %s during handoff without resetting state",
    async (data, replyKind) => {
      const stub = env.CONVERSATION_STATE.getByName(`static-${replyKind}`);
      await stub.processEvent(baseInput);
      const decision = enforceApprovedKnowledge(classifyPostback(data));
      const result = await stub.processEvent({
        ...baseInput,
        eventRef: `${replyKind.length.toString(16)}`.padStart(64, "0"),
        decision,
      });
      expect(result).toEqual({
        status: "RESPOND",
        replyKind,
        enteredHandoff: false,
      });
      const messages = replyMessages(
        result.replyKind,
        "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
        approvedAnswerForReplyKind(result.replyKind),
        result.enteredHandoff,
      );
      expect(messages.length).toBeGreaterThan(0);
      expect(JSON.stringify(messages)).not.toContain(HANDOFF_ACKNOWLEDGEMENT);
      expect(await stub.state()).toBe("HUMAN_HANDOFF");
    },
  );

  it("returns the two menu images and exact approved notice during handoff", async () => {
    const stub = env.CONVERSATION_STATE.getByName("static-menu-exact");
    await stub.processEvent(baseInput);
    const decision = enforceApprovedKnowledge(
      classifyPostback("test:show_menu"),
    );
    const result = await stub.processEvent({
      ...baseInput,
      eventRef: "b".repeat(64),
      decision,
    });
    const approvedNotice = approvedAnswerForReplyKind("MENU");
    const messages = replyMessages(
      result.replyKind,
      "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
      approvedNotice,
      result.enteredHandoff,
    );
    expect(messages.map((message) => message.type)).toEqual([
      "image",
      "image",
      "text",
    ]);
    expect(messages[2]).toMatchObject({ type: "text", text: approvedNotice });
    expect(JSON.stringify(messages)).not.toContain(HANDOFF_ACKNOWLEDGEMENT);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("answers wholesale guidance during handoff without another acknowledgement", async () => {
    const stub = env.CONVERSATION_STATE.getByName("static-wholesale");
    await stub.processEvent(baseInput);
    const decision = enforceApprovedKnowledge(
      classifyPostback("test:show_wholesale"),
    );
    const result = await stub.processEvent({
      ...baseInput,
      eventRef: "c".repeat(64),
      decision,
    });
    expect(result).toEqual({
      status: "RESPOND",
      replyKind: "WHOLESALE",
      enteredHandoff: false,
    });
    const messages = replyMessages(
      result.replyKind,
      "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
      approvedAnswerForReplyKind(result.replyKind),
      result.enteredHandoff,
    );
    expect(messages).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain(HANDOFF_ACKNOWLEDGEMENT);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it.each(["ร้านอยู่ไหน", "Delivery", "สะสมแต้มและโปรโมชั่น"])(
    "keeps typed text silent during handoff: %s",
    async (text) => {
      const stub = env.CONVERSATION_STATE.getByName(`typed-${text}`);
      await stub.processEvent(baseInput);
      const result = await stub.processEvent({
        ...baseInput,
        eventRef: `${text.length.toString(16)}`.padStart(64, "f"),
        decision: enforceApprovedKnowledge(classifyText(text)),
      });
      expect(result.status).toBe("SILENT");
      expect(await stub.state()).toBe("HUMAN_HANDOFF");
    },
  );

  it.each(["action=show_menu", "test:show_facebook", "prod:show_menu"])(
    "fails closed for unknown or Production-like postback during handoff: %s",
    async (data) => {
      const stub = env.CONVERSATION_STATE.getByName(`blocked-${data}`);
      await stub.processEvent(baseInput);
      const result = await stub.processEvent({
        ...baseInput,
        eventRef: `${data.length.toString(16)}`.padStart(64, "e"),
        decision: enforceApprovedKnowledge(classifyPostback(data)),
      });
      expect(result.status).toBe("SILENT");
      expect(await stub.state()).toBe("HUMAN_HANDOFF");
    },
  );

  it("sends fallback and one acknowledgement for unknown text, then silences later typed text", async () => {
    const stub = env.CONVERSATION_STATE.getByName("unknown-then-silent");
    const firstDecision = enforceApprovedKnowledge(
      classifyText("คำถามที่ไม่มีในฐานข้อมูล"),
    );
    const first = await stub.processEvent({
      ...baseInput,
      eventRef: "d".repeat(64),
      decision: firstDecision,
    });
    expect(first).toEqual({
      status: "RESPOND",
      replyKind: "SAFE_FALLBACK",
      enteredHandoff: true,
    });
    const firstMessages = replyMessages(
      first.replyKind,
      "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
      approvedAnswerForReplyKind(first.replyKind),
      first.enteredHandoff,
    );
    expect(
      firstMessages.filter(
        (message) =>
          message.type === "text" && message.text === HANDOFF_ACKNOWLEDGEMENT,
      ),
    ).toHaveLength(1);

    const later = await stub.processEvent({
      ...baseInput,
      eventRef: "e".repeat(64),
      decision: enforceApprovedKnowledge(classifyText("ร้านอยู่ไหน")),
    });
    expect(later.status).toBe("SILENT");
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("enters handoff after the approved preorder reply and then silences typed text", async () => {
    const stub = env.CONVERSATION_STATE.getByName("preorder-handoff");
    const decision = enforceApprovedKnowledge(classifyText("พรีออเดอได้ไหม"));
    const first = await stub.processEvent({
      ...baseInput,
      eventRef: "6".repeat(64),
      decision,
    });
    expect(first).toEqual({
      status: "RESPOND",
      replyKind: "ADVANCE_ORDER",
      enteredHandoff: true,
    });
    const messages = replyMessages(
      first.replyKind,
      "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
      approvedAnswerForReplyKind(first.replyKind),
      first.enteredHandoff,
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      type: "text",
      text: approvedAnswerForReplyKind("ADVANCE_ORDER"),
    });
    expect(
      messages.filter(
        (message) =>
          message.type === "text" && message.text === HANDOFF_ACKNOWLEDGEMENT,
      ),
    ).toHaveLength(1);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");

    const later = await stub.processEvent({
      ...baseInput,
      eventRef: "7".repeat(64),
      decision: enforceApprovedKnowledge(classifyText("เมนู")),
    });
    expect(later.status).toBe("SILENT");
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
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
