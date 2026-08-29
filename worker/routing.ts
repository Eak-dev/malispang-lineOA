import { buildFlexMenu, FLEX_MENU_ALT_TEXT } from "../src/flex-menu.js";

export const SAFE_FALLBACK =
  "ขออภัยค่ะ ตอนนี้น้องมะลิยังไม่มีข้อมูลที่ยืนยันสำหรับคำถามนี้ เพื่อไม่ให้ข้อมูลผิด สามารถกด “คุยกับพนักงาน” หรือพิมพ์ “คุยกับพนักงาน” ได้เลยนะคะ 😊";

export const HANDOFF_ACKNOWLEDGEMENT =
  "รับเรื่องแล้วค่ะ พนักงานมะลิปังจะเข้ามาตอบโดยเร็วที่สุดนะคะ ระหว่างนี้สามารถพิมพ์รายละเอียดเพิ่มเติมไว้ได้เลยค่ะ 😊";

export const SLIP_ACKNOWLEDGEMENT =
  "ได้รับรูปแล้วค่ะ รายการชำระเงินต้องให้พนักงานตรวจสอบก่อนนะคะ ทางร้านจะกลับมายืนยันอีกครั้งค่ะ";

export const REWARD_CARD_ACTIVE_MESSAGE =
  "บัตรแต้ม TEST เปิดให้ทดสอบแล้วค่ะ\nซื้อครบ 50 บาท รับ 1 แต้ม\nใช้เฉพาะบัญชีมะลิปัง TEST และรางวัลไม่มีมูลค่าจริงนะคะ";

export type ReplyKind =
  | "NONE"
  | "SAFE_FALLBACK"
  | "HANDOFF_ACK"
  | "SLIP_ACK"
  | "FLEX_MENU"
  | "MENU"
  | "PRICE"
  | "LOCATION"
  | "HOURS"
  | "CONTACT"
  | "PICKUP"
  | "STORAGE"
  | "WHOLESALE"
  | "ADVANCE_ORDER"
  | "DELIVERY"
  | "PROMOTION"
  | "LOYALTY"
  | "REWARDS";

export interface RouteDecision {
  readonly replyKind: ReplyKind;
  readonly reasonCode: string;
  readonly handoff: boolean;
}

export interface LineQuickReply {
  readonly items: readonly {
    readonly type: "action";
    readonly action: {
      readonly type: "postback";
      readonly label: string;
      readonly data: string;
      readonly displayText: string;
    };
  }[];
}

export type LineReplyMessage =
  | {
      readonly type: "text";
      readonly text: string;
      readonly quickReply?: LineQuickReply;
    }
  | {
      readonly type: "flex";
      readonly altText: string;
      readonly contents: ReturnType<typeof buildFlexMenu>;
      readonly quickReply?: LineQuickReply;
    }
  | {
      readonly type: "image";
      readonly originalContentUrl: string;
      readonly previewImageUrl: string;
      readonly quickReply?: LineQuickReply;
    }
  | {
      readonly type: "template";
      readonly altText: string;
      readonly template: {
        readonly type: "buttons";
        readonly text: string;
        readonly actions: readonly {
          readonly type: "uri";
          readonly label: string;
          readonly uri: string;
        }[];
      };
      readonly quickReply?: LineQuickReply;
    };

export const STAFF_QUICK_REPLY: LineQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "postback",
        label: "คุยกับพนักงาน",
        data: "test:human_handoff",
        displayText: "คุยกับพนักงาน",
      },
    },
  ],
};

export function classifyText(text: string): RouteDecision {
  const normalized = normalize(text);

  if (normalized === "สะสมแต้มและโปรโมชั่น") {
    return reply("REWARDS", "RICH_MENU_REWARD_FAIL_CLOSED");
  }
  if (normalized === "delivery") {
    return reply("DELIVERY", "RICH_MENU_DELIVERY_UNAVAILABLE");
  }

  if (containsSensitivePersonalData(normalized)) {
    return handoff("SENSITIVE_PERSONAL_DATA");
  }
  if (
    includesAny(normalized, [
      "ชำระเงิน",
      "แจ้งโอน",
      "โอนเงิน",
      "คืนเงิน",
      "ร้องเรียน",
      "สินค้ามีปัญหา",
      "ไม่พอใจ",
      "แพ้อาหาร",
      "สารก่อภูมิแพ้",
      "ส่วนผสมเพื่อการแพ้",
      "มีของไหม",
      "สต๊อก",
      "สต็อก",
      "ของวันนี้",
      "ออเดอร์จำนวนมาก",
      "สั่งเยอะ",
      "จัดเลี้ยง",
      "วันรับสินค้า",
      "รับสินค้าวัน",
    ])
  ) {
    return handoff("HIGH_RISK_OR_DYNAMIC_TOPIC");
  }
  if (includesAny(normalized, ["คุยกับพนักงาน", "แอดมิน", "เจ้าหน้าที่"])) {
    return handoff("CUSTOMER_REQUESTED_STAFF");
  }
  if (
    includesAny(normalized, ["เมนูหลัก", "เมนูช่วยเหลือ", "help", "ตัวเลือก"])
  ) {
    return reply("FLEX_MENU", "EXPLICIT_MAIN_MENU");
  }
  if (
    normalized === "เมนู" ||
    includesAny(normalized, ["มีเมนูอะไร", "เมนูขนม", "รายการขนม", "ดูเมนู"])
  ) {
    return reply("MENU", "KB_MENU_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["ราคาส่ง", "ขายส่ง"])) {
    return reply("WHOLESALE", "KB_WHOLESALE_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["ติดต่อร้าน", "เบอร์ติดต่อ", "ช่องทางติดต่อ"])) {
    return reply("CONTACT", "KB_CONTACT_NOT_AUTHORITATIVE");
  }
  if (
    includesAny(normalized, ["รับสินค้าที่ไหน", "จุดรับสินค้า", "รับของที่ไหน"])
  ) {
    return reply("PICKUP", "KB_PICKUP_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["ราคา", "กี่บาท", "เท่าไหร่"])) {
    return reply("PRICE", "KB_PRICE_NOT_AUTHORITATIVE");
  }
  if (
    includesAny(normalized, [
      "ที่ตั้ง",
      "ร้านอยู่ที่ไหน",
      "ร้านอยู่ไหน",
      "พิกัด",
      "เดินทาง",
    ])
  ) {
    return reply("LOCATION", "KB_LOCATION_NOT_AUTHORITATIVE");
  }
  if (
    includesAny(normalized, [
      "เปิดกี่โมง",
      "ปิดกี่โมง",
      "เวลาทำการ",
      "ร้านเปิด",
    ])
  ) {
    return reply("HOURS", "KB_OPENING_HOURS_NOT_AUTHORITATIVE");
  }
  if (
    includesAny(normalized, [
      "เก็บได้กี่วัน",
      "เก็บรักษา",
      "แช่เย็น",
      "อายุขนม",
    ])
  ) {
    return reply("STORAGE", "KB_STORAGE_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["สั่งล่วงหน้า", "วิธีสั่ง", "สั่งยังไง"])) {
    return reply("ADVANCE_ORDER", "KB_ADVANCE_ORDER_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["มีโปร", "โปรโมชั่น", "โปรโมชัน"])) {
    return reply("PROMOTION", "KB_PROMOTION_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["กติกาแต้ม", "แลกแต้ม", "บัตรแต้ม"])) {
    return reply("LOYALTY", "KB_LOYALTY_NOT_AUTHORITATIVE");
  }
  if (includesAny(normalized, ["delivery", "เดลิเวอรี", "ส่งถึงบ้าน"])) {
    return reply("DELIVERY", "KB_DELIVERY_NOT_AUTHORITATIVE");
  }
  return reply("SAFE_FALLBACK", "NO_AUTHORITATIVE_ANSWER");
}

export function classifyPostback(data: string): RouteDecision {
  const routes: Readonly<Record<string, ReplyKind>> = {
    "test:main_menu": "FLEX_MENU",
    "test:show_menu": "MENU",
    "test:show_price": "PRICE",
    "test:show_location": "LOCATION",
    "test:show_hours": "HOURS",
    "test:show_wholesale": "WHOLESALE",
    "test:show_rewards": "REWARDS",
    "test:show_delivery": "DELIVERY",
    "test:show_facebook": "SAFE_FALLBACK",
  };
  if (data === "test:human_handoff") return handoff("CUSTOMER_REQUESTED_STAFF");
  const replyKind = routes[data];
  return reply(
    replyKind ?? "SAFE_FALLBACK",
    replyKind ? `POSTBACK_${replyKind}` : "POSTBACK_NOT_ALLOWED",
  );
}

export function replyMessage(
  kind: ReplyKind,
  testRewardCardUrl?: string,
  approvedAnswer?: string,
): LineReplyMessage | undefined {
  if (kind === "NONE") return undefined;
  if (
    kind === "SAFE_FALLBACK" ||
    kind === "MENU" ||
    kind === "PRICE" ||
    kind === "LOCATION" ||
    kind === "HOURS" ||
    kind === "CONTACT" ||
    kind === "PICKUP" ||
    kind === "STORAGE" ||
    kind === "WHOLESALE" ||
    kind === "ADVANCE_ORDER" ||
    kind === "DELIVERY" ||
    kind === "PROMOTION" ||
    kind === "LOYALTY"
  ) {
    return withStaffQuickReply({
      type: "text",
      text: approvedAnswer?.trim() || SAFE_FALLBACK,
    });
  }
  if (kind === "HANDOFF_ACK") {
    return { type: "text", text: HANDOFF_ACKNOWLEDGEMENT };
  }
  if (kind === "SLIP_ACK") {
    return { type: "text", text: SLIP_ACKNOWLEDGEMENT };
  }
  if (kind === "FLEX_MENU") {
    return withStaffQuickReply({
      type: "flex",
      altText: FLEX_MENU_ALT_TEXT,
      contents: buildFlexMenu(),
    });
  }
  if (kind === "REWARDS") {
    return rewardCardMessage(validatedTestRewardCardUrl(testRewardCardUrl));
  }
  return withStaffQuickReply({
    type: "text",
    text: "บัญชี TEST นี้ช่วยตอบข้อมูลและร่างคำถามเท่านั้น ยังไม่สร้างออเดอร์จริง ไม่จองสต๊อก และไม่รับชำระเงินจริง กรุณากด “คุยกับพนักงาน” เพื่อดำเนินการต่อค่ะ",
  });
}

export function replyMessages(
  kind: ReplyKind,
  _publicAssetBaseUrl: string,
  testRewardCardUrl: string,
  approvedAnswer?: string,
): readonly LineReplyMessage[] {
  const message = replyMessage(kind, testRewardCardUrl, approvedAnswer);
  return message ? [message] : [];
}

function rewardCardMessage(url: string): LineReplyMessage {
  return withStaffQuickReply({
    type: "template",
    altText: "เปิดบัตรสะสมแต้ม มะลิปัง TEST",
    template: {
      type: "buttons",
      text: REWARD_CARD_ACTIVE_MESSAGE,
      actions: [
        {
          type: "uri",
          label: "เปิดบัตรสะสมแต้ม",
          uri: url,
        },
      ],
    },
  });
}

export function validatedTestRewardCardUrl(value: string | undefined): string {
  if (typeof value !== "string")
    throw new Error("INVALID_TEST_REWARD_CARD_URL");
  const normalized = value.trim();
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("INVALID_TEST_REWARD_CARD_URL");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "u.lin.ee" ||
    !/^\/[A-Za-z0-9_-]+$/.test(url.pathname) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("INVALID_TEST_REWARD_CARD_URL");
  }
  return normalized;
}

function withStaffQuickReply(message: LineReplyMessage): LineReplyMessage {
  return { ...message, quickReply: STAFF_QUICK_REPLY };
}

function handoff(reasonCode: string): RouteDecision {
  return { replyKind: "HANDOFF_ACK", reasonCode, handoff: true };
}

function reply(replyKind: ReplyKind, reasonCode: string): RouteDecision {
  return { replyKind, reasonCode, handoff: false };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}

function includesAny(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function containsSensitivePersonalData(value: string): boolean {
  return (
    /(?:^|\D)0\d{8,9}(?:\D|$)/.test(value) ||
    includesAny(value, ["เลขบัตร", "ที่อยู่จัดส่ง", "บ้านเลขที่"])
  );
}
