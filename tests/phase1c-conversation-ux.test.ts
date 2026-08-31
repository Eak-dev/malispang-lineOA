import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildFlexMenu,
  detectConversationIntent,
  normalizeConversationText,
  type ConversationIntent,
} from "../src/index.js";
import {
  HANDOFF_ACKNOWLEDGEMENT,
  SAFE_FALLBACK,
  STAFF_QUICK_REPLY,
  classifyText,
  replyMessage,
  type ReplyKind,
} from "../worker/routing.js";

interface TranscriptCase {
  readonly id: string;
  readonly text: string;
  readonly intent: ConversationIntent;
  readonly replyKind: ReplyKind;
  readonly handoff: boolean;
}

interface TranscriptFixture {
  readonly version: string;
  readonly environment: "TEST";
  readonly containsRealCustomerData: false;
  readonly cases: readonly TranscriptCase[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/issue6-conversation-ux.json", import.meta.url),
    "utf8",
  ),
) as TranscriptFixture;

describe("Issue #6 Phase 1C conversation UX", () => {
  it("uses a versioned TEST-only transcript fixture without PII", () => {
    expect(fixture.version).toMatch(/^2026-08-31-issue6-v\d+$/);
    expect(fixture.environment).toBe("TEST");
    expect(fixture.containsRealCustomerData).toBe(false);
    const serialized = JSON.stringify(fixture);
    expect(serialized).not.toMatch(/(?:^|\D)0\d{8,9}(?:\D|$)/);
    expect(serialized).not.toMatch(
      /บ้านเลขที่|ที่อยู่จัดส่ง|เลขบัตร|replyToken/,
    );
  });

  it.each(fixture.cases)(
    "routes transcript $id to $intent / $replyKind safely",
    ({ text, intent, replyKind, handoff }) => {
      expect(detectConversationIntent(text)).toBe(intent);
      expect(classifyText(text)).toMatchObject({ replyKind, handoff });
    },
  );

  it.each([
    ["  ขอเมนูหน่อยค่ะ!!!  ", "MENU"],
    ["ร้าน\u200Bอยู่ไหนคะ", "LOCATION"],
    ["เปิดกี่โมงคะ？？", "HOURS"],
  ] as const)("normalizes polite text and punctuation: %s", (text, intent) => {
    expect(detectConversationIntent(text)).toBe(intent);
    expect(normalizeConversationText(text)).not.toMatch(/\s{2,}/);
  });

  it.each(["เท่าไหร่คะ", "มีไหม", "ได้ไหม", "เอาอันนี้", "ขอรายละเอียดค่ะ"])(
    "fails closed for ambiguous wording without creating an order: %s",
    (text) => {
      const decision = classifyText(text);
      expect(decision).toMatchObject({
        replyKind: "SAFE_FALLBACK",
        handoff: true,
        reasonCode: "AMBIGUOUS_CUSTOMER_TEXT",
      });
      expect(JSON.stringify(decision)).not.toMatch(
        /ORDER_CREATED|ORDER_CONFIRMED/,
      );
    },
  );

  it.each(["โปรตีนมีเท่าไหร่", "ส่งข้อความได้ไหม", "สนใจสินค้าค่ะ"])(
    "does not overmatch an unrelated phrase: %s",
    (text) => {
      expect(classifyText(text)).toMatchObject({
        replyKind: "SAFE_FALLBACK",
        handoff: true,
      });
    },
  );

  it("keeps the approved fallback and one staff entry point", () => {
    expect(replyMessage("SAFE_FALLBACK")).toEqual({
      type: "text",
      text: SAFE_FALLBACK,
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(replyMessage("HANDOFF_ACK")).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(STAFF_QUICK_REPLY.items).toHaveLength(1);
    expect(STAFF_QUICK_REPLY.items[0]?.action.data).toBe("test:human_handoff");
  });

  it("preserves the six branded TEST-only Flex actions", () => {
    const flex = buildFlexMenu();
    const actions = flex.footer.contents.flatMap((component) =>
      component.type === "button" ? [component.action] : [],
    );
    expect(actions).toHaveLength(6);
    expect(actions.every(({ data }) => data.startsWith("test:"))).toBe(true);
    expect(JSON.stringify(flex)).toContain("TEST — ไม่รับออเดอร์/ชำระเงินจริง");
    expect(JSON.stringify(flex)).not.toMatch(
      /prod:|Production|รับชำระเงินจริง/,
    );
  });
});
