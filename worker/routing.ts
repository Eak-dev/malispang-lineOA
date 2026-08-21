import { buildFlexMenu, FLEX_MENU_ALT_TEXT } from "../src/flex-menu.js";

export const SAFE_FALLBACK =
  "ขออภัยค่ะ ตอนนี้น้องมะลิยังไม่มีข้อมูลที่ยืนยันสำหรับคำถามนี้ เพื่อไม่ให้ข้อมูลผิด สามารถกด “คุยกับพนักงาน” หรือพิมพ์ “คุยกับพนักงาน” ได้เลยนะคะ 😊";

export const HANDOFF_ACKNOWLEDGEMENT =
  "รับเรื่องแล้วค่ะ พนักงานมะลิปังจะเข้ามาตอบโดยเร็วที่สุดนะคะ ระหว่างนี้สามารถพิมพ์รายละเอียดเพิ่มเติมไว้ได้เลยค่ะ 😊";

export const SLIP_ACKNOWLEDGEMENT =
  "ได้รับรูปแล้วค่ะ รายการชำระเงินต้องให้พนักงานตรวจสอบก่อนนะคะ ทางร้านจะกลับมายืนยันอีกครั้งค่ะ";

const TEST_SEED_NOTICE =
  "ข้อมูล TEST_SEED — ต้องให้ Owner ยืนยันก่อนใช้ Production";

export const MENU_AVAILABILITY_NOTICE =
  "เมนูตามรูปอาจมีสินค้าไม่ครบทุกวัน สามารถกด “คุยกับพนักงาน” เพื่อตรวจสอบสินค้าวันนี้ได้เลยค่ะ 😊";

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
  | "STORAGE"
  | "WHOLESALE"
  | "ADVANCE_ORDER";

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
      "มีโปร",
      "โปรโมชั่น",
      "โปรโมชัน",
      "ออเดอร์จำนวนมาก",
      "สั่งเยอะ",
      "จัดเลี้ยง",
      "วันรับสินค้า",
      "รับสินค้า",
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
    return reply("MENU", "FAQ_MENU_TEST_SEED");
  }
  if (includesAny(normalized, ["ราคาส่ง", "ขายส่ง"])) {
    return reply("WHOLESALE", "FAQ_WHOLESALE_NOT_CONFIRMED");
  }
  if (includesAny(normalized, ["ราคา", "กี่บาท", "เท่าไหร่"])) {
    return reply("PRICE", "FAQ_PRICE_TEST_SEED");
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
    return reply("LOCATION", "FAQ_LOCATION_TEST_SEED");
  }
  if (
    includesAny(normalized, [
      "เปิดกี่โมง",
      "ปิดกี่โมง",
      "เวลาทำการ",
      "ร้านเปิด",
    ])
  ) {
    return reply("HOURS", "FAQ_HOURS_TEST_SEED");
  }
  if (
    includesAny(normalized, [
      "เก็บได้กี่วัน",
      "เก็บรักษา",
      "แช่เย็น",
      "อายุขนม",
    ])
  ) {
    return reply("STORAGE", "FAQ_STORAGE_TEST_SEED");
  }
  if (includesAny(normalized, ["สั่งล่วงหน้า", "วิธีสั่ง", "สั่งยังไง"])) {
    return reply("ADVANCE_ORDER", "FAQ_ADVANCE_ORDER_TEST_ONLY");
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
    "test:show_rewards": "WHOLESALE",
    "test:show_delivery": "ADVANCE_ORDER",
    "test:show_facebook": "SAFE_FALLBACK",
  };
  if (data === "test:human_handoff") return handoff("CUSTOMER_REQUESTED_STAFF");
  const replyKind = routes[data];
  return reply(
    replyKind ?? "SAFE_FALLBACK",
    replyKind ? `POSTBACK_${replyKind}` : "POSTBACK_NOT_ALLOWED",
  );
}

export function replyMessage(kind: ReplyKind): LineReplyMessage | undefined {
  if (kind === "NONE") return undefined;
  if (kind === "SAFE_FALLBACK" || kind === "WHOLESALE") {
    return withStaffQuickReply({ type: "text", text: SAFE_FALLBACK });
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
  if (kind === "MENU") {
    return withStaffQuickReply({
      type: "text",
      text: MENU_AVAILABILITY_NOTICE,
    });
  }
  if (kind === "PRICE") {
    return withStaffQuickReply({
      type: "text",
      text: `${TEST_SEED_NOTICE}\nขนมปังราคา 39 บาทต่อชิ้น โดยยังไม่ยืนยันสต๊อกหรือโปรโมชันปัจจุบันค่ะ`,
    });
  }
  if (kind === "LOCATION") {
    return withStaffQuickReply({
      type: "text",
      text: `${TEST_SEED_NOTICE}\nสาขาทดสอบ: ตลาดยิ่งเจริญ สะพานใหม่ ชั้น 1 โซน Take Home`,
    });
  }
  if (kind === "HOURS") {
    return withStaffQuickReply({
      type: "text",
      text: `${TEST_SEED_NOTICE}\nเวลาร้านโดยประมาณ 08:00–19:00 น. กรุณาให้พนักงานยืนยันหากต้องเดินทางมารับสินค้าค่ะ`,
    });
  }
  if (kind === "STORAGE") {
    return withStaffQuickReply({
      type: "text",
      text: `${TEST_SEED_NOTICE}\nขนมปังควรรับประทานภายในประมาณ 2 วันเมื่อเก็บนอกตู้เย็น หากมีข้อกังวลเรื่องการแพ้อาหาร กรุณาคุยกับพนักงานค่ะ`,
    });
  }
  return withStaffQuickReply({
    type: "text",
    text: "บัญชี TEST นี้ช่วยตอบข้อมูลและร่างคำถามเท่านั้น ยังไม่สร้างออเดอร์จริง ไม่จองสต๊อก และไม่รับชำระเงินจริง กรุณากด “คุยกับพนักงาน” เพื่อดำเนินการต่อค่ะ",
  });
}

export function replyMessages(
  kind: ReplyKind,
  publicAssetBaseUrl: string,
): readonly LineReplyMessage[] {
  if (kind !== "MENU") {
    const message = replyMessage(kind);
    return message ? [message] : [];
  }

  const baseUrl = validatedTestAssetBaseUrl(publicAssetBaseUrl);
  return [
    imageMessage(`${baseUrl}/menu/bread-menu.jpeg`),
    imageMessage(`${baseUrl}/menu/chiffon-cookie-menu.jpeg`),
    withStaffQuickReply({ type: "text", text: MENU_AVAILABILITY_NOTICE }),
  ];
}

function imageMessage(url: string): LineReplyMessage {
  return { type: "image", originalContentUrl: url, previewImageUrl: url };
}

function validatedTestAssetBaseUrl(value: string): string {
  const normalized = value.replace(/\/+$/, "");
  const url = new URL(normalized);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "malispang-lineoa-test.eakkachai-dev.workers.dev" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("INVALID_TEST_ASSET_BASE_URL");
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
