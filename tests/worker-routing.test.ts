import { describe, expect, it } from "vitest";

import {
  DELIVERY_UNAVAILABLE_MESSAGE,
  HANDOFF_ACKNOWLEDGEMENT,
  MENU_AVAILABILITY_NOTICE,
  REWARD_CARD_PENDING_MESSAGE,
  SAFE_FALLBACK,
  SLIP_ACKNOWLEDGEMENT,
  STAFF_QUICK_REPLY,
  classifyPostback,
  classifyText,
  replyMessage,
  replyMessages,
} from "../worker/routing.js";

describe("deployed Test routing", () => {
  it.each([
    ["สอบถามค่ะ", "SAFE_FALLBACK"],
    ["มีเมนูอะไรบ้าง", "MENU"],
    ["เมนู", "MENU"],
    ["ขนมปังราคาเท่าไหร่", "PRICE"],
    ["ร้านอยู่ที่ไหน", "LOCATION"],
    ["เปิดกี่โมง", "HOURS"],
    ["เก็บได้กี่วัน", "STORAGE"],
    ["ราคาส่งเท่าไหร่", "WHOLESALE"],
    ["สั่งล่วงหน้าอย่างไร", "ADVANCE_ORDER"],
    ["เมนูหลัก", "FLEX_MENU"],
    ["สะสมแต้มและโปรโมชั่น", "REWARDS"],
    ["Delivery", "DELIVERY"],
  ])("routes %s safely", (text, expected) => {
    expect(classifyText(text).replyKind).toBe(expected);
  });

  it.each([
    "มีของไหม",
    "มีโปรอะไร",
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

  it("uses the exact fail-closed reward and unavailable Delivery messages", () => {
    expect(replyMessage("REWARDS")).toEqual({
      type: "text",
      text: REWARD_CARD_PENDING_MESSAGE,
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(REWARD_CARD_PENDING_MESSAGE).toContain("ซื้อครบ 50 บาท รับ 1 แต้ม");
    expect(REWARD_CARD_PENDING_MESSAGE).not.toContain("Production");
    expect(replyMessage("DELIVERY")).toEqual({
      type: "text",
      text: DELIVERY_UNAVAILABLE_MESSAGE,
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(DELIVERY_UNAVAILABLE_MESSAGE).toContain("ยังไม่มีบริการ Delivery");
  });

  it("adds one temporary staff quick reply to bot answers but not handoff replies", () => {
    expect(replyMessages("MENU", TEST_ASSET_BASE_URL)[2]?.quickReply).toEqual(
      STAFF_QUICK_REPLY,
    );
    expect(STAFF_QUICK_REPLY.items).toHaveLength(1);
    expect(STAFF_QUICK_REPLY.items[0]?.action).toMatchObject({
      type: "postback",
      label: "คุยกับพนักงาน",
      data: "test:human_handoff",
    });
    expect(replyMessage("HANDOFF_ACK")?.quickReply).toBeUndefined();
    expect(replyMessage("SLIP_ACK")?.quickReply).toBeUndefined();
  });

  it("returns the two approved menu images and a staff handoff option", () => {
    const messages = replyMessages("MENU", TEST_ASSET_BASE_URL);
    expect(messages).toEqual([
      {
        type: "image",
        originalContentUrl: `${TEST_ASSET_BASE_URL}/menu/bread-menu.jpeg`,
        previewImageUrl: `${TEST_ASSET_BASE_URL}/menu/bread-menu.jpeg`,
      },
      {
        type: "image",
        originalContentUrl: `${TEST_ASSET_BASE_URL}/menu/chiffon-cookie-menu.jpeg`,
        previewImageUrl: `${TEST_ASSET_BASE_URL}/menu/chiffon-cookie-menu.jpeg`,
      },
      {
        type: "text",
        text: MENU_AVAILABILITY_NOTICE,
        quickReply: STAFF_QUICK_REPLY,
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain("TEST_SEED");
    expect(JSON.stringify(messages)).not.toContain("มีพร้อมขาย");
  });

  it("rejects any asset host other than the dedicated Test Worker", () => {
    expect(() => replyMessages("MENU", "https://example.com")).toThrow(
      "INVALID_TEST_ASSET_BASE_URL",
    );
  });
});

const TEST_ASSET_BASE_URL =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
