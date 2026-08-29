import { describe, expect, it } from "vitest";

import {
  HANDOFF_ACKNOWLEDGEMENT,
  REWARD_CARD_ACTIVE_MESSAGE,
  SAFE_FALLBACK,
  SLIP_ACKNOWLEDGEMENT,
  STAFF_QUICK_REPLY,
  classifyPostback,
  classifyText,
  replyMessage,
  replyMessages,
  validatedTestRewardCardUrl,
} from "../worker/routing.js";

describe("deployed Test routing", () => {
  it.each([
    ["สอบถามค่ะ", "SAFE_FALLBACK"],
    ["มีเมนูอะไรบ้าง", "MENU"],
    ["เมนู", "MENU"],
    ["ขนมปังราคาเท่าไหร่", "PRICE"],
    ["ร้านอยู่ที่ไหน", "LOCATION"],
    ["เปิดกี่โมง", "HOURS"],
    ["ติดต่อร้านอย่างไร", "CONTACT"],
    ["รับสินค้าที่ไหน", "PICKUP"],
    ["เก็บได้กี่วัน", "STORAGE"],
    ["ราคาส่งเท่าไหร่", "WHOLESALE"],
    ["สั่งล่วงหน้าอย่างไร", "ADVANCE_ORDER"],
    ["เมนูหลัก", "FLEX_MENU"],
    ["สะสมแต้มและโปรโมชั่น", "REWARDS"],
    ["มีโปรโมชั่นอะไร", "PROMOTION"],
    ["กติกาแต้มเป็นอย่างไร", "LOYALTY"],
    ["Delivery", "DELIVERY"],
  ])("routes %s safely", (text, expected) => {
    expect(classifyText(text).replyKind).toBe(expected);
  });

  it.each([
    "มีของไหม",
    "คุยกับพนักงาน",
    "ขอร้องเรียนสินค้า",
    "แพ้อาหารค่ะ",
    "แจ้งโอนเงิน",
    "ขอคืนเงิน",
    "งานจัดเลี้ยง 200 ชิ้น",
    "รับสินค้าวันไหนดี",
    "ส่งที่บ้านเลขที่ 123",
    "โทร 0812345678",
  ])("routes high-risk text to handoff: %s", (text) => {
    expect(classifyText(text)).toMatchObject({
      replyKind: "HANDOFF_ACK",
      handoff: true,
    });
  });

  it.each([
    ["test:show_menu", "MENU"],
    ["test:show_price", "PRICE"],
    ["test:show_location", "LOCATION"],
    ["test:show_hours", "HOURS"],
    ["test:show_wholesale", "WHOLESALE"],
    ["test:show_rewards", "REWARDS"],
    ["test:show_delivery", "DELIVERY"],
    ["test:show_facebook", "SAFE_FALLBACK"],
    ["test:human_handoff", "HANDOFF_ACK"],
  ])("supports Test-only postback %s", (data, expected) => {
    expect(classifyPostback(data).replyKind).toBe(expected);
  });

  it("fails closed for a Production-like or unknown postback", () => {
    expect(classifyPostback("action=show_menu")).toMatchObject({
      replyKind: "SAFE_FALLBACK",
      handoff: false,
    });
  });

  it("uses the exact safe fallback and handoff messages", () => {
    expect(replyMessage("SAFE_FALLBACK")).toEqual({
      type: "text",
      text: SAFE_FALLBACK,
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(replyMessage("HANDOFF_ACK")).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(replyMessage("SLIP_ACK")).toEqual({
      type: "text",
      text: SLIP_ACKNOWLEDGEMENT,
    });
  });

  it("uses only the encrypted Test reward-card URL in an explicit button", () => {
    expect(replyMessage("REWARDS", TEST_REWARD_CARD_URL)).toEqual({
      type: "template",
      altText: "เปิดบัตรสะสมแต้ม มะลิปัง TEST",
      template: {
        type: "buttons",
        text: REWARD_CARD_ACTIVE_MESSAGE,
        actions: [
          {
            type: "uri",
            label: "เปิดบัตรสะสมแต้ม",
            uri: TEST_REWARD_CARD_URL,
          },
        ],
      },
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(REWARD_CARD_ACTIVE_MESSAGE).toContain("ซื้อครบ 50 บาท รับ 1 แต้ม");
    expect(REWARD_CARD_ACTIVE_MESSAGE).toContain("มะลิปัง TEST");
    expect(REWARD_CARD_ACTIVE_MESSAGE).not.toContain("Production");
  });

  it("fails closed for a missing, malformed, or non-LINE reward-card URL", () => {
    expect(() => replyMessage("REWARDS")).toThrow(
      "INVALID_TEST_REWARD_CARD_URL",
    );
    expect(() => validatedTestRewardCardUrl("not-a-url")).toThrow(
      "INVALID_TEST_REWARD_CARD_URL",
    );
    expect(() =>
      validatedTestRewardCardUrl("https://example.com/reward"),
    ).toThrow("INVALID_TEST_REWARD_CARD_URL");
    expect(() =>
      validatedTestRewardCardUrl(
        "https://u.lin.ee/test-reward-card?source=production",
      ),
    ).toThrow("INVALID_TEST_REWARD_CARD_URL");
  });

  it.each([
    "MENU",
    "PRICE",
    "LOCATION",
    "HOURS",
    "STORAGE",
    "WHOLESALE",
    "ADVANCE_ORDER",
    "DELIVERY",
    "CONTACT",
    "PICKUP",
    "PROMOTION",
    "LOYALTY",
  ] as const)("fails closed for unapproved %s business data", (kind) => {
    expect(replyMessage(kind)).toEqual({
      type: "text",
      text: SAFE_FALLBACK,
      quickReply: STAFF_QUICK_REPLY,
    });
  });

  it("adds one temporary staff quick reply to bot answers but not handoff replies", () => {
    expect(
      replyMessages("MENU", TEST_ASSET_BASE_URL, TEST_REWARD_CARD_URL)[0]
        ?.quickReply,
    ).toEqual(STAFF_QUICK_REPLY);
    expect(STAFF_QUICK_REPLY.items).toHaveLength(1);
    expect(STAFF_QUICK_REPLY.items[0]?.action).toMatchObject({
      type: "postback",
      label: "คุยกับพนักงาน",
      data: "test:human_handoff",
    });
    expect(replyMessage("HANDOFF_ACK")?.quickReply).toBeUndefined();
    expect(replyMessage("SLIP_ACK")?.quickReply).toBeUndefined();
  });

  it("does not return menu images until the menu manifest is approved", () => {
    const messages = replyMessages(
      "MENU",
      TEST_ASSET_BASE_URL,
      TEST_REWARD_CARD_URL,
    );
    expect(messages).toEqual([
      { type: "text", text: SAFE_FALLBACK, quickReply: STAFF_QUICK_REPLY },
    ]);
    expect(JSON.stringify(messages)).not.toContain("TEST_SEED");
    expect(JSON.stringify(messages)).not.toContain("image");
  });
});

const TEST_ASSET_BASE_URL =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
const TEST_REWARD_CARD_URL = "https://u.lin.ee/test-reward-card";
