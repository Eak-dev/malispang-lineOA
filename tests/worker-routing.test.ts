import { describe, expect, it } from "vitest";

import {
  HANDOFF_ACKNOWLEDGEMENT,
  SAFE_FALLBACK,
  SLIP_ACKNOWLEDGEMENT,
  STAFF_QUICK_REPLY,
  classifyPostback,
  classifyText,
  replyMessage,
  replyMessages,
  validatedTestAssetBaseUrl,
} from "../worker/routing.js";

describe("local TEST routing for Issue #8", () => {
  it.each([
    ["สอบถามค่ะ", "SAFE_FALLBACK", true],
    ["มีเมนูอะไรบ้าง", "MENU", false],
    ["เมนู", "MENU", false],
    ["ขนมปังราคาเท่าไหร่", "PRICE", false],
    ["ร้านอยู่ที่ไหน", "LOCATION", false],
    ["เปิดกี่โมง", "HOURS", false],
    ["ติดต่อร้านอย่างไร", "CONTACT", false],
    ["รับสินค้าที่ไหน", "PICKUP", false],
    ["เก็บได้กี่วัน", "STORAGE", false],
    ["เมนูหลัก", "FLEX_MENU", false],
    ["สะสมแต้มและโปรโมชั่น", "LOYALTY", false],
    ["กติกาแต้มเป็นอย่างไร", "LOYALTY", false],
    ["Delivery", "DELIVERY", false],
  ])("routes %s safely", (text, replyKind, handoff) => {
    expect(classifyText(text)).toMatchObject({ replyKind, handoff });
  });

  it.each([
    ["มีของไหม", "STOCK"],
    ["มีไส้พิเศษวันนี้ไหม", "STOCK"],
    ["แพ้อาหารค่ะ", "ALLERGEN"],
    ["มีโปรวันนี้ไหม", "PROMOTION"],
    ["งานจัดเลี้ยง 200 ชิ้น", "WHOLESALE"],
    ["ราคาส่งเท่าไหร่", "WHOLESALE"],
    ["รับสินค้าวันไหนดี", "ADVANCE_ORDER"],
    ["สั่งล่วงหน้าอย่างไร", "ADVANCE_ORDER"],
    ["ขอแลกรางวัล", "LOYALTY"],
  ])("routes approved guidance into handoff: %s", (text, replyKind) => {
    expect(classifyText(text)).toMatchObject({ replyKind, handoff: true });
  });

  it.each([
    "คุยกับพนักงาน",
    "ขอร้องเรียนสินค้า",
    "แจ้งโอนเงิน",
    "ขอคืนเงิน",
    "ส่งที่บ้านเลขที่ 123",
    "โทร 0812345678",
  ])("routes a direct high-risk topic to handoff: %s", (text) => {
    expect(classifyText(text)).toMatchObject({
      replyKind: "HANDOFF_ACK",
      handoff: true,
    });
  });

  it.each([
    ["test:show_menu", "MENU", false],
    ["test:show_price", "PRICE", false],
    ["test:show_location", "LOCATION", false],
    ["test:show_hours", "HOURS", false],
    ["test:show_wholesale", "WHOLESALE", true],
    ["test:show_rewards", "LOYALTY", false],
    ["test:show_delivery", "DELIVERY", false],
    ["test:show_facebook", "SAFE_FALLBACK", true],
    ["test:human_handoff", "HANDOFF_ACK", true],
  ])("supports Test-only postback %s", (data, replyKind, handoff) => {
    expect(classifyPostback(data)).toMatchObject({ replyKind, handoff });
  });

  it("fails closed and enters handoff for a Production-like or unknown postback", () => {
    expect(classifyPostback("action=show_menu")).toMatchObject({
      replyKind: "SAFE_FALLBACK",
      handoff: true,
    });
  });

  it("uses the exact safe fallback and acknowledgement messages", () => {
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

  it.each([
    "MENU",
    "PRICE",
    "LOCATION",
    "HOURS",
    "CONTACT",
    "PICKUP",
    "STORAGE",
    "ALLERGEN",
    "WHOLESALE",
    "ADVANCE_ORDER",
    "DELIVERY",
    "PROMOTION",
    "LOYALTY",
    "STOCK",
  ] as const)("fails closed if %s has no approved answer", (kind) => {
    expect(replyMessage(kind)).toEqual({
      type: "text",
      text: SAFE_FALLBACK,
      quickReply: STAFF_QUICK_REPLY,
    });
  });

  it("returns both approved menu images in order before the exact notice", () => {
    expect(
      replyMessages("MENU", TEST_ASSET_BASE_URL, APPROVED_MENU_ANSWER),
    ).toEqual([
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
        text: APPROVED_MENU_ANSWER,
        quickReply: STAFF_QUICK_REPLY,
      },
    ]);
  });

  it("does not return menu images without an approved answer", () => {
    const messages = replyMessages("MENU", TEST_ASSET_BASE_URL);
    expect(messages).toEqual([
      { type: "text", text: SAFE_FALLBACK, quickReply: STAFF_QUICK_REPLY },
    ]);
    expect(JSON.stringify(messages)).not.toContain("image");
  });

  it("returns approved loyalty rules without using a Reward Card URL", () => {
    const message = replyMessage("LOYALTY", APPROVED_LOYALTY_ANSWER);
    expect(message).toEqual({
      type: "text",
      text: APPROVED_LOYALTY_ANSWER,
      quickReply: STAFF_QUICK_REPLY,
    });
    expect(JSON.stringify(message)).not.toMatch(/https?:\/\//);
  });

  it("sends approved guidance and one acknowledgement before handoff silence", () => {
    expect(
      replyMessages("STOCK", TEST_ASSET_BASE_URL, APPROVED_MENU_ANSWER, true),
    ).toEqual([
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
        text: APPROVED_MENU_ANSWER,
        quickReply: STAFF_QUICK_REPLY,
      },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
  });

  it("sends fallback and one acknowledgement when knowledge is unavailable", () => {
    expect(
      replyMessages("SAFE_FALLBACK", TEST_ASSET_BASE_URL, undefined, true),
    ).toEqual([
      { type: "text", text: SAFE_FALLBACK, quickReply: STAFF_QUICK_REPLY },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
  });

  it("allows only the fixed TEST asset origin", () => {
    expect(validatedTestAssetBaseUrl(TEST_ASSET_BASE_URL)).toBe(
      TEST_ASSET_BASE_URL,
    );
    expect(() => validatedTestAssetBaseUrl("https://example.com")).toThrow(
      "INVALID_TEST_ASSET_BASE_URL",
    );
  });
});

const TEST_ASSET_BASE_URL =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
const APPROVED_MENU_ANSWER =
  "เมนูตามรูปเป็นรายการอ้างอิง สินค้าหน้าร้านมีการขายออกตลอดวัน จึงอาจมีสินค้าไม่ครบหรือหมดได้ค่ะ หากต้องการเช็กสต๊อกสินค้าวันนี้ สอบถามโปรโมชั่นพิเศษประจำวัน หรือไส้พิเศษประจำวัน กรุณากด “คุยกับพนักงาน” ได้เลยค่ะ 😊";
const APPROVED_LOYALTY_ANSWER =
  "กติกาสะสมแต้มมะลิปัง\nทุกยอดซื้อที่ชำระเงินแล้ว รับ 1 แต้มต่อทุก 50 บาท โดยปัดเศษลงค่ะ";
