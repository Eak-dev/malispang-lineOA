import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import type {
  ProcessEventInput,
  ProcessEventResult,
} from "../worker/durable-objects.js";
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
      deliveryClaim: actualClaim(first),
      status: "RESPOND",
      replyKind: "HANDOFF_ACK",
      enteredHandoff: true,
    });
    const claim = actualClaim(first);
    expect(await stub.markDelivered(baseInput.eventRef, claim)).toBe(
      "ACKNOWLEDGED",
    );
    expect(await stub.markDelivered(baseInput.eventRef, claim)).toBe(
      "ALREADY_ACKNOWLEDGED",
    );
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
        deliveryClaim: actualClaim(result),
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
      deliveryClaim: actualClaim(result),
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
      deliveryClaim: actualClaim(first),
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
      deliveryClaim: actualClaim(first),
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

  it("requires retained Owner lineage even for an authenticated authorized Test staff close", async () => {
    const conversationRef = "c".repeat(64);
    const stub = env.CONVERSATION_STATE.getByName(conversationRef);
    await stub.processEvent(baseInput);
    const handoff = await stub.handoffObservation();
    if (!handoff) throw new Error("EXPECTED_HANDOFF_GENERATION");
    await env.HANDOFF_REGISTRY.getByName("test-active-handoffs").activate(
      conversationRef,
      baseInput.now,
      handoff.generation,
    );
    const response = await exports.default.fetch(
      new Request(
        "https://malispang-lineoa-test.eakkachai-dev.workers.dev/admin/handoff/close",
        {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            operationRef: "1".repeat(64),
            expectedGeneration: 1,
            staffId: "OWNER_TEST",
          }),
        },
      ),
    );
    expect(response.status).toBe(409);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("rejects unauthorized staff-close and keeps handoff active", async () => {
    const conversationRef = "d".repeat(64);
    const stub = env.CONVERSATION_STATE.getByName(conversationRef);
    await stub.processEvent(baseInput);
    const response = await exports.default.fetch(
      new Request(
        "https://malispang-lineoa-test.eakkachai-dev.workers.dev/admin/handoff/close",
        {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            operationRef: "2".repeat(64),
            expectedGeneration: 1,
            staffId: "UNKNOWN_STAFF",
          }),
        },
      ),
    );
    expect(response.status).toBe(403);
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("persists a composite fingerprint and deduplicates the delivered retry", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-composite-retry");
    const input: ProcessEventInput = {
      ...baseInput,
      eventRef: "8".repeat(64),
      decision: {
        replyKind: "MENU",
        reasonCode: "MP06_AUTO_COMPOSITE",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "9".repeat(64),
    };
    const first = await stub.processEvent(input);
    expect(first).toMatchObject({
      status: "RESPOND",
      enteredHandoff: false,
    });
    expect(await stub.markDelivered(input.eventRef, actualClaim(first))).toBe(
      "ACKNOWLEDGED",
    );
    expect(await stub.processEvent(input)).toMatchObject({
      status: "DUPLICATE",
      replyKind: "NONE",
    });
    expect(await stub.state()).toBe("BOT_ACTIVE");
  });

  it("fails a changed undelivered retry plan closed without sending partial AUTO", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-plan-drift");
    const input: ProcessEventInput = {
      ...baseInput,
      eventRef: "a1".repeat(32),
      decision: {
        replyKind: "LOCATION",
        reasonCode: "MP06_AUTO_COMPOSITE",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "b1".repeat(32),
    };
    const first = await stub.processEvent(input);
    const originalClaim = actualClaim(first);
    const changed = await stub.processEvent({
      ...input,
      responseFingerprint: "c1".repeat(32),
    });
    expect(changed).toEqual({
      status: "DUPLICATE",
      replyKind: "NONE",
      enteredHandoff: true,
    });
    expect(await stub.deliveryObservation(input.eventRef)).toEqual({
      state: "DELIVERY_UNKNOWN",
      revision: originalClaim.revision,
    });
    expect("deliveryClaim" in changed).toBe(false);
    expect(await stub.markDelivered(input.eventRef, originalClaim)).toBe(
      "REJECTED",
    );
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("fails closed when an undelivered AUTO retry loses its authoritative plan", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-plan-lost");
    const first = await stub.processEvent({
      ...baseInput,
      eventRef: "b3".repeat(32),
      decision: {
        replyKind: "LOCATION",
        reasonCode: "MP06_AUTO",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "c3".repeat(32),
    });
    const retry = await stub.processEvent({
      ...baseInput,
      eventRef: "b3".repeat(32),
      decision: {
        replyKind: "HANDOFF_ACK",
        reasonCode: "MP06_LOCATION_AUTHORITY_INVALID",
        handoff: true,
        allowDuringHandoff: false,
      },
    });
    expect(retry).toEqual({
      status: "DUPLICATE",
      replyKind: "NONE",
      enteredHandoff: true,
    });
    expect(await stub.deliveryObservation("b3".repeat(32))).toEqual({
      state: "DELIVERY_UNKNOWN",
      revision: actualClaim(first).revision,
    });
    expect("deliveryClaim" in retry).toBe(false);
    expect(await stub.markDelivered("b3".repeat(32), actualClaim(first))).toBe(
      "REJECTED",
    );
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("shares one clarification budget between T-C01 and T-C04", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-clarification-budget");
    const first = await stub.processEvent({
      ...baseInput,
      eventRef: "d1".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C01",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "e1".repeat(32),
      clarificationTemplateId: "T-C01",
    });
    expect(first).toEqual({
      deliveryClaim: actualClaim(first),
      status: "RESPOND",
      replyKind: "NONE",
      enteredHandoff: false,
    });
    expect(await stub.markDelivered("d1".repeat(32), actualClaim(first))).toBe(
      "ACKNOWLEDGED",
    );

    const second = await stub.processEvent({
      ...baseInput,
      eventRef: "f1".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C04",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "a2".repeat(32),
      clarificationTemplateId: "T-C04",
    });
    expect(second).toEqual({
      deliveryClaim: actualClaim(second),
      status: "RESPOND",
      replyKind: "HANDOFF_ACK",
      enteredHandoff: true,
    });
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
  });

  it("persists pending T-C01 context and clears it after an authoritative response", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-pending-price");
    await stub.processEvent({
      ...baseInput,
      eventRef: "d3".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C01",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "e3".repeat(32),
      clarificationTemplateId: "T-C01",
    });
    expect(await stub.mp06Context()).toEqual({
      pendingClarificationTemplateId: "T-C01",
    });
    await stub.processEvent({
      ...baseInput,
      eventRef: "f3".repeat(32),
      decision: {
        replyKind: "PRICE",
        reasonCode: "MP06_AUTO",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "a4".repeat(32),
    });
    expect(await stub.mp06Context()).toEqual({});
    expect(await stub.state()).toBe("BOT_ACTIVE");
  });

  it("resets the clarification budget only after an authorized handoff close", async () => {
    const stub = env.CONVERSATION_STATE.getByName("mp06-budget-reset");
    await stub.processEvent({
      ...baseInput,
      eventRef: "b2".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C01",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "c2".repeat(32),
      clarificationTemplateId: "T-C01",
    });
    await stub.processEvent({
      ...baseInput,
      eventRef: "d2".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C04",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "e2".repeat(32),
      clarificationTemplateId: "T-C04",
    });
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
    expect(
      await stub.closeHandoff({
        operationRef: "3".repeat(64),
        actorRef: "4".repeat(64),
        expectedGeneration: 1,
        now: baseInput.now + 1,
        auditRetentionSeconds: 604_800,
      }),
    ).toMatchObject({ accepted: true });
    const afterClose = await stub.processEvent({
      ...baseInput,
      eventRef: "f2".repeat(32),
      decision: {
        replyKind: "NONE",
        reasonCode: "MP06_CLARIFY_T-C01",
        handoff: false,
        allowDuringHandoff: false,
      },
      responseFingerprint: "a3".repeat(32),
      clarificationTemplateId: "T-C01",
    });
    expect(afterClose).toEqual({
      deliveryClaim: actualClaim(afterClose),
      status: "RESPOND",
      replyKind: "NONE",
      enteredHandoff: false,
    });
    expect(await stub.state()).toBe("BOT_ACTIVE");
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

/** Validate a real production grant while preserving exact response assertions. */
function actualClaim(result: ProcessEventResult) {
  expect(result.status).toBe("RESPOND");
  if (result.status !== "RESPOND")
    throw new Error("EXPECTED_REAL_DELIVERY_GRANT");
  expect(Object.keys(result.deliveryClaim).sort()).toEqual([
    "eventRef",
    "ownerToken",
    "revision",
  ]);
  expect(result.deliveryClaim.eventRef).toMatch(/^[a-f0-9]{64}$/u);
  expect(result.deliveryClaim.ownerToken).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u,
  );
  expect(typeof result.deliveryClaim.revision).toBe("number");
  expect(Number.isSafeInteger(result.deliveryClaim.revision)).toBe(true);
  expect(result.deliveryClaim.revision).toBeGreaterThan(0);
  return result.deliveryClaim;
}

describe("v18 persistent delivery ownership and fenced acknowledgement", () => {
  const responseInput: ProcessEventInput = {
    ...baseInput,
    decision: {
      replyKind: "LOCATION",
      reasonCode: "KB_LOCATION",
      handoff: false,
      allowDuringHandoff: false,
    },
  };

  it("atomically grants only one owner to concurrent same-event invocations", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-atomic-claim");
    const results = await Promise.all(
      Array.from({ length: 20 }, () => stub.processEvent(responseInput)),
    );
    const winners = results.filter((r) => r.status === "RESPOND");
    expect(winners).toHaveLength(1);
    expect(results.filter((r) => r.status === "DUPLICATE")).toHaveLength(19);
    for (const r of results.filter((r) => r.status === "DUPLICATE"))
      expect("deliveryClaim" in r).toBe(false);
    const winner = winners[0];
    if (!winner) throw new Error("EXPECTED_ONE_WINNER");
    const claim = actualClaim(winner);
    expect(await stub.deliveryObservation(responseInput.eventRef)).toEqual({
      state: "CLAIMED",
      revision: claim.revision,
    });
    await runInDurableObject(stub, (_instance, state) => {
      expect(
        state.storage.sql
          .exec<{ n: number }>("SELECT COUNT(*) AS n FROM delivery_claims")
          .one().n,
      ).toBe(1);
      expect(
        state.storage.sql
          .exec<{ n: number }>(
            "SELECT COUNT(*) AS n FROM audit_events WHERE outcome = 'DELIVERY_CLAIMED'",
          )
          .one().n,
      ).toBe(1);
    });
    expect(await stub.state()).toBe("BOT_ACTIVE");
  });

  it("rejects missing, forged, cross-event and reordered acknowledgements using real owners", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-ack-fences");
    const first = actualClaim(await stub.processEvent(responseInput));
    const secondEvent = "b".repeat(64);
    const second = actualClaim(
      await stub.processEvent({ ...responseInput, eventRef: secondEvent }),
    );
    expect(second.revision).toBeGreaterThan(first.revision);
    expect(second.ownerToken).not.toBe(first.ownerToken);
    // Invalid shapes deliberately use the JS invocation boundary, not a runtime
    // overload or optional token. Valid tokens only originate from processEvent.
    expect(
      await Reflect.apply(stub.markDelivered, stub, [first.eventRef]),
    ).toBe("REJECTED");
    expect(await stub.markDelivered(first.eventRef, second)).toBe("REJECTED");
    expect(
      await stub.markDelivered(first.eventRef, {
        ...first,
        ownerToken: second.ownerToken,
      }),
    ).toBe("REJECTED");
    expect(
      await stub.markDelivered(second.eventRef, {
        ...second,
        revision: first.revision,
      }),
    ).toBe("REJECTED");
    expect(await stub.markDelivered(second.eventRef, second)).toBe(
      "ACKNOWLEDGED",
    );
    expect(
      await stub.markDelivered(second.eventRef, {
        ...first,
        eventRef: second.eventRef,
      }),
    ).toBe("REJECTED");
    expect(await stub.deliveryObservation(first.eventRef)).toEqual({
      state: "CLAIMED",
      revision: first.revision,
    });
    expect(await stub.markDelivered(first.eventRef, first)).toBe(
      "ACKNOWLEDGED",
    );
    const before = await deliverySnapshot(stub);
    expect(await stub.markDelivered(first.eventRef, first)).toBe(
      "ALREADY_ACKNOWLEDGED",
    );
    expect(await deliverySnapshot(stub)).toEqual(before);
    const replay = await stub.processEvent(responseInput);
    expect(replay.status).toBe("DUPLICATE");
    expect("deliveryClaim" in replay).toBe(false);
  });

  it("retains unknown ownership after restart and long beyond retention without lease takeover", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-restart");
    const claim = actualClaim(await stub.processEvent(responseInput));
    await evictDurableObject(stub);
    expect(await stub.deliveryObservation(claim.eventRef)).toEqual({
      state: "CLAIMED",
      revision: claim.revision,
    });
    const late = await stub.processEvent({
      ...responseInput,
      now: baseInput.now + 365 * 86_400_000,
    });
    expect(late.status).toBe("DUPLICATE");
    expect("deliveryClaim" in late).toBe(false);
    expect(await stub.deliveryObservation(claim.eventRef)).toEqual({
      state: "CLAIMED",
      revision: claim.revision,
    });
    await evictDurableObject(stub);
    expect(await stub.markDelivered(claim.eventRef, claim)).toBe(
      "ACKNOWLEDGED",
    );
    await evictDurableObject(stub);
    expect(await stub.processEvent(responseInput)).toMatchObject({
      status: "DUPLICATE",
    });
    expect(await stub.markDelivered(claim.eventRef, claim)).toBe(
      "ALREADY_ACKNOWLEDGED",
    );
  });

  it("keeps SELECT-only delivery observations free of state writes and capability leakage", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-read-only");
    const claim = actualClaim(await stub.processEvent(responseInput));
    const before = await deliverySnapshot(stub);
    const one = await stub.deliveryObservation(claim.eventRef);
    const two = await stub.deliveryObservation(claim.eventRef);
    expect(await stub.checkDeliveryClaim(claim)).toBe(true);
    expect(
      await stub.checkDeliveryClaim({ ...claim, revision: claim.revision + 1 }),
    ).toBe(false);
    expect(await Reflect.apply(stub.checkDeliveryClaim, stub, [])).toBe(false);
    expect(two).toEqual(one);
    expect(Object.keys(one).sort()).toEqual(["revision", "state"]);
    expect(JSON.stringify(one)).not.toContain(claim.ownerToken);
    expect(await deliverySnapshot(stub)).toEqual(before);
  });

  it("validates current ownership read-only and denies other owners or terminal claims", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-pre-dispatch-check");
    const a = actualClaim(await stub.processEvent(responseInput));
    const b = actualClaim(
      await stub.processEvent({ ...responseInput, eventRef: "c".repeat(64) }),
    );
    const before = await deliverySnapshot(stub);
    expect(await stub.checkDeliveryClaim(a)).toBe(true);
    expect(
      await stub.checkDeliveryClaim({ ...a, ownerToken: b.ownerToken }),
    ).toBe(false);
    expect(await stub.checkDeliveryClaim({ ...a, eventRef: b.eventRef })).toBe(
      false,
    );
    expect(await deliverySnapshot(stub)).toEqual(before);
    expect(await stub.markDelivered(a.eventRef, a)).toBe("ACKNOWLEDGED");
    expect(await stub.checkDeliveryClaim(a)).toBe(false);
    expect(await stub.checkDeliveryClaim(b)).toBe(true);
    await runInDurableObject(stub, (_i, s) => {
      s.storage.sql.exec(
        "UPDATE delivery_claims SET state = 'DELIVERY_UNKNOWN' WHERE event_ref = ?",
        b.eventRef,
      );
    });
    expect(await stub.checkDeliveryClaim(b)).toBe(false);
    expect(await stub.markDelivered(b.eventRef, b)).toBe("REJECTED");
  });

  it("does not create outbound ownership for a no-message event", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-no-message");
    const result = await stub.processEvent({
      ...responseInput,
      decision: { ...responseInput.decision, replyKind: "NONE" },
    });
    expect(result).toEqual({
      status: "SILENT",
      replyKind: "NONE",
      enteredHandoff: false,
    });
    await runInDurableObject(stub, (_instance, state) => {
      expect(
        state.storage.sql
          .exec<{ n: number }>("SELECT COUNT(*) AS n FROM delivery_claims")
          .one().n,
      ).toBe(0);
    });
    expect(await stub.processEvent(responseInput)).toMatchObject({
      status: "DUPLICATE",
    });
  });

  it("does not allow a real claim from another conversation to acknowledge this conversation", async () => {
    const a = env.CONVERSATION_STATE.getByName("v18-isolated-a"),
      b = env.CONVERSATION_STATE.getByName("v18-isolated-b");
    const ownerA = actualClaim(await a.processEvent(responseInput));
    const ownerB = actualClaim(await b.processEvent(responseInput));
    expect(await b.markDelivered(ownerA.eventRef, ownerA)).toBe("REJECTED");
    expect(await a.markDelivered(ownerB.eventRef, ownerB)).toBe("REJECTED");
    expect(await a.markDelivered(ownerA.eventRef, ownerA)).toBe("ACKNOWLEDGED");
    expect(await b.deliveryObservation(ownerB.eventRef)).toEqual({
      state: "CLAIMED",
      revision: ownerB.revision,
    });
  });

  it("conservatively fences existing unfenced rows without rewriting old schema or history", async () => {
    const stub = env.CONVERSATION_STATE.getByName("v18-legacy");
    await runInDurableObject(stub, (_instance, state) => {
      // An old runtime row has no claim; this is not a synthetic ownership token.
      state.storage.sql.exec(
        "INSERT INTO processed_events VALUES (?, 'HANDOFF_ACK', 0, 1, ?, ?)",
        responseInput.eventRef,
        baseInput.now,
        baseInput.now + 1,
      );
    });
    await evictDurableObject(stub);
    expect(
      await stub.deliveryObservation(responseInput.eventRef),
    ).toMatchObject({ state: "LEGACY_UNKNOWN" });
    expect(await stub.processEvent(responseInput)).toMatchObject({
      status: "DUPLICATE",
    });
    await runInDurableObject(stub, (_instance, state) => {
      const row = state.storage.sql
        .exec(
          "SELECT * FROM processed_events WHERE event_ref = ?",
          responseInput.eventRef,
        )
        .one();
      expect(row).toEqual({
        event_ref: responseInput.eventRef,
        reply_kind: "HANDOFF_ACK",
        delivered: 0,
        entered_handoff: 1,
        created_at: baseInput.now,
        expires_at: baseInput.now + 1,
      });
    });
    const before = await deliverySnapshot(stub);
    await evictDurableObject(stub);
    expect(await deliverySnapshot(stub)).toEqual(before);
  });
});

async function deliverySnapshot(
  stub: ReturnType<typeof env.CONVERSATION_STATE.getByName>,
) {
  return runInDurableObject(stub, async (_instance, state) => ({
    claims: state.storage.sql
      .exec("SELECT * FROM delivery_claims ORDER BY revision")
      .toArray(),
    processed: state.storage.sql
      .exec("SELECT * FROM processed_events ORDER BY event_ref")
      .toArray(),
    plans: state.storage.sql
      .exec("SELECT * FROM mp06_response_plans ORDER BY event_ref")
      .toArray(),
    audit: state.storage.sql
      .exec("SELECT * FROM audit_events ORDER BY id")
      .toArray(),
    sequence: state.storage.sql
      .exec("SELECT * FROM sqlite_sequence ORDER BY name")
      .toArray(),
    alarm: await state.storage.getAlarm(),
  }));
}

describe("successor durable one-logical handoff close", () => {
  const input = {
    operationRef: "ab".repeat(32),
    actorRef: "cd".repeat(32),
    expectedGeneration: 1,
    now: baseInput.now + 1,
    auditRetentionSeconds: 604800,
  };
  const fixture = async (label: string) => {
    const ref = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`synthetic-close:${label}`),
    );
    const name = Array.from(new Uint8Array(ref), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    const stub = env.CONVERSATION_STATE.getByName(name);
    const event = await stub.processEvent(baseInput);
    await stub.markDelivered(baseInput.eventRef, actualClaim(event));
    return { name, stub };
  };
  it.each([
    "UPDATE handoff_registry_fences SET generation = 'unknown'",
    "UPDATE handoff_registry_fences SET closed_generation = 2",
    "UPDATE handoff_registry_fences SET close_receipt_id = 'forged'",
    "DELETE FROM handoff_registry_fences",
  ])(
    "denies corrupt registry lineage without normalizing retained state: %s",
    async (corrupt) => {
      const { name, stub } = await fixture(corrupt);
      const registry = env.HANDOFF_REGISTRY.getByName(
        `synthetic-corrupt:${corrupt}`,
      );
      await registry.activate(name, baseInput.now, 1);
      const close = await stub.closeHandoff(input);
      if (!close.accepted) throw new Error("EXPECTED_CLOSE");
      await runInDurableObject(registry, (_i, s) => {
        s.storage.sql.exec(corrupt);
      });
      const snapshot = () =>
        runInDurableObject(registry, (_i, s) => ({
          active: s.storage.sql.exec("SELECT * FROM active_handoffs").toArray(),
          fences: s.storage.sql
            .exec("SELECT * FROM handoff_registry_fences")
            .toArray(),
        }));
      const before = await snapshot();
      expect(await registry.reconcileClose(name, close.receipt)).toBeNull();
      expect(await registry.activate(name, baseInput.now, 2)).toBe(false);
      await evictDurableObject(registry);
      expect(await registry.reconcileClose(name, close.receipt)).toBeNull();
      expect(await registry.activate(name, baseInput.now, 2)).toBe(false);
      expect(await snapshot()).toEqual(before);
      expect(await stub.handoffObservation()).toMatchObject({
        pendingClose: true,
      });
    },
  );
  it("one concurrent mutation, three counted attempts, stable receipt and durable replay ceiling", async () => {
    const { stub } = await fixture("concurrent");
    const before = await deliverySnapshot(stub);
    const results = await Promise.all(
      Array.from({ length: 3 }, () => stub.closeHandoff(input)),
    );
    for (const result of results)
      expect(result).toMatchObject({ accepted: true });
    const first = results[0]!;
    if (!first.accepted) throw new Error("EXPECTED_CLOSE_RECEIPT");
    for (const result of results) {
      if (!result.accepted) throw new Error("EXPECTED_REPLAY_RECEIPT");
      expect(result.receipt).toEqual(first.receipt);
    }
    expect(results.map((r) => (r.accepted ? r.attempt : 0)).sort()).toEqual([
      1, 2, 3,
    ]);
    expect(await stub.state()).toBe("BOT_ACTIVE");
    const after = await deliverySnapshot(stub);
    expect(after.processed).toEqual(before.processed);
    expect(after.claims).toEqual(before.claims);
    expect(after.plans).toEqual(before.plans);
    expect(after.audit.slice(0, before.audit.length)).toEqual(before.audit);
    expect(
      after.audit.filter((r) => r.outcome === "HANDOFF_CLOSED"),
    ).toHaveLength(1);
    await evictDurableObject(stub);
    expect(await stub.handoffObservation()).toMatchObject({
      generation: 1,
      technicalAttempts: 3,
      pendingClose: true,
    });
    expect(await stub.closeHandoff(input)).toEqual({
      accepted: false,
      code: "HANDOFF_CLOSE_ATTEMPTS_EXHAUSTED",
    });
    expect(
      await stub.closeHandoff({ ...input, operationRef: "ef".repeat(32) }),
    ).toMatchObject({
      accepted: false,
      code: "HANDOFF_CLOSE_OPERATION_CONFLICT",
    });
    expect(
      await runInDurableObject(stub, (_i, s) =>
        s.storage.sql
          .exec("SELECT outcome FROM handoff_close_attempts ORDER BY id")
          .toArray(),
      ),
    ).toEqual([
      { outcome: "CONVERSATION_CLOSED" },
      { outcome: "SAME_OPERATION_REPLAY" },
      { outcome: "SAME_OPERATION_REPLAY" },
      { outcome: "HANDOFF_CLOSE_ATTEMPTS_EXHAUSTED" },
      { outcome: "HANDOFF_CLOSE_OPERATION_CONFLICT" },
    ]);
  });
  it("reports missing generation as unavailable without repairing or granting a close after restart", async () => {
    const { stub } = await fixture("missing-generation");
    await runInDurableObject(stub, (_i, s) => {
      s.storage.sql.exec("DELETE FROM handoff_generation");
    });
    const before = await deliverySnapshot(stub);
    expect(await stub.handoffObservation()).toBeNull();
    await evictDurableObject(stub);
    expect(await stub.handoffObservation()).toBeNull();
    expect(await deliverySnapshot(stub)).toEqual(before);
    expect(await stub.closeHandoff(input)).toEqual({
      accepted: false,
      code: "HANDOFF_CLOSE_STATE_INVALID",
    });
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
    expect(
      await runInDurableObject(stub, (_i, s) =>
        s.storage.sql.exec("SELECT * FROM handoff_generation").toArray(),
      ),
    ).toEqual([]);
  });
  it("recovers a lost response, fences wrong ACK, persists completion and prevents generation ABA", async () => {
    const { name, stub } = await fixture("lost-response");
    const registry = env.HANDOFF_REGISTRY.getByName("successor-close-registry");
    await registry.activate(name, baseInput.now, 1);
    const first = await stub.closeHandoff(input);
    if (!first.accepted) throw new Error("EXPECTED_CLOSE");
    expect(
      await stub.acknowledgeHandoffClose(
        { ...first.receipt, receiptId: crypto.randomUUID() },
        1,
      ),
    ).toBe(false);
    // Registry performed its own transaction; its response is intentionally discarded.
    expect(await registry.reconcileClose(name, first.receipt)).toEqual(
      first.receipt,
    );
    await evictDurableObject(stub);
    await evictDurableObject(registry);
    const replay = await stub.closeHandoff(input);
    if (!replay.accepted) throw new Error("EXPECTED_REPLAY");
    expect(replay.receipt).toEqual(first.receipt);
    expect(await registry.reconcileClose(name, replay.receipt)).toEqual(
      first.receipt,
    );
    expect(
      await stub.acknowledgeHandoffClose(replay.receipt, replay.attempt),
    ).toBe(true);
    const stable = await runInDurableObject(stub, (_i, s) =>
      s.storage.sql
        .exec("SELECT * FROM handoff_close_attempts ORDER BY id")
        .toArray(),
    );
    expect(
      await stub.acknowledgeHandoffClose(replay.receipt, replay.attempt),
    ).toBe(true);
    expect(
      await runInDurableObject(stub, (_i, s) =>
        s.storage.sql
          .exec("SELECT * FROM handoff_close_attempts ORDER BY id")
          .toArray(),
      ),
    ).toEqual(stable);
    const finalReplay = await stub.closeHandoff(input);
    expect(finalReplay).toMatchObject({
      accepted: true,
      complete: true,
      receipt: first.receipt,
    });
    await stub.processEvent({
      ...baseInput,
      eventRef: "fe".repeat(32),
      now: baseInput.now + 2,
    });
    expect(await stub.handoffObservation()).toMatchObject({ generation: 2 });
    await registry.activate(name, baseInput.now + 2, 2);
    expect(await stub.closeHandoff(input)).toMatchObject({
      accepted: false,
      code: "HANDOFF_GENERATION_CHANGED",
    });
    expect(await stub.acknowledgeHandoffClose(first.receipt, 1)).toBe(false);
    expect(await registry.reconcileClose(name, first.receipt)).toBeNull();
    expect(await stub.state()).toBe("HUMAN_HANDOFF");
    expect(await registry.listActive()).toEqual([
      { conversationRef: name, createdAt: baseInput.now + 2 },
    ]);
  });
  it("fences delayed registry activation and cannot reconcile another conversation", async () => {
    const a = await fixture("isolated-a"),
      b = await fixture("isolated-b");
    const registry = env.HANDOFF_REGISTRY.getByName(
      "successor-isolated-registry",
    );
    await registry.activate(b.name, baseInput.now, 1);
    const close = await a.stub.closeHandoff(input);
    if (!close.accepted) throw new Error("EXPECTED_CLOSE");
    expect(await registry.reconcileClose(b.name, close.receipt)).toBeNull();
    expect(await b.stub.acknowledgeHandoffClose(close.receipt, 1)).toBe(false);
    expect(await registry.reconcileClose(a.name, close.receipt)).toEqual(
      close.receipt,
    );
    await registry.activate(a.name, baseInput.now, 1);
    expect(await registry.listActive()).toEqual([
      { conversationRef: b.name, createdAt: baseInput.now },
    ]);
    expect(await b.stub.state()).toBe("HUMAN_HANDOFF");
    expect(await b.stub.handoffObservation()).toMatchObject({
      closeState: "UNUSED",
      technicalAttempts: 0,
    });
  });
  it.each([
    { operationRef: "malformed" },
    { actorRef: "malformed" },
    { expectedGeneration: 2 },
    { expectedGeneration: 0 },
  ])(
    "rejects invalid or stale close inputs without state changes: %j",
    async (change) => {
      const { stub } = await fixture(JSON.stringify(change));
      const before = await deliverySnapshot(stub);
      expect(await stub.closeHandoff({ ...input, ...change })).toMatchObject({
        accepted: false,
      });
      const after = await deliverySnapshot(stub);
      expect(after.claims).toEqual(before.claims);
      expect(after.processed).toEqual(before.processed);
      expect(after.plans).toEqual(before.plans);
      expect(after.audit).toEqual(before.audit);
      expect(after.alarm).toEqual(before.alarm);
      expect(
        after.sequence.filter((r) => r.name !== "handoff_close_attempts"),
      ).toEqual(before.sequence);
      expect(
        after.sequence.filter((r) => r.name === "handoff_close_attempts"),
      ).toEqual([{ name: "handoff_close_attempts", seq: 1 }]);
      expect(await stub.state()).toBe("HUMAN_HANDOFF");
      expect(await stub.handoffObservation()).toMatchObject({
        technicalAttempts: 0,
        closeState: "UNUSED",
      });
    },
  );
  it("retained-state additive backfill is idempotent; empty state and read-only observations grant no close", async () => {
    const { stub } = await fixture("migration");
    // Model the exact pre-successor schema locally, not a remote rollback.
    await runInDurableObject(stub, (_i, s) => {
      s.storage.sql.exec(
        "DROP TABLE handoff_generation; DROP TABLE handoff_close_operation; DROP TABLE handoff_close_attempts",
      );
    });
    const before = await deliverySnapshot(stub);
    await evictDurableObject(stub);
    expect(await stub.handoffObservation()).toMatchObject({
      generation: 1,
      closeState: "UNUSED",
    });
    expect(await deliverySnapshot(stub)).toEqual(before);
    const migrated = await runInDurableObject(stub, (_i, s) =>
      s.storage.sql.exec("SELECT * FROM handoff_generation").toArray(),
    );
    await evictDurableObject(stub);
    expect(
      await runInDurableObject(stub, (_i, s) =>
        s.storage.sql.exec("SELECT * FROM handoff_generation").toArray(),
      ),
    ).toEqual(migrated);
    const empty = env.CONVERSATION_STATE.getByName("successor-empty");
    const snapshot = await deliverySnapshot(empty);
    expect(await empty.handoffObservation()).toMatchObject({
      generation: 0,
      closeState: "UNUSED",
      pendingClose: false,
    });
    expect(await deliverySnapshot(empty)).toEqual(snapshot);
    expect(await empty.closeHandoff(input)).toMatchObject({ accepted: false });
    expect(await empty.state()).toBe("BOT_ACTIVE");
  });
});
