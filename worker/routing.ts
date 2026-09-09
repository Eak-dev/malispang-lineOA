import { buildFlexMenu, FLEX_MENU_ALT_TEXT } from "../src/flex-menu.js";
import {
  detectConversationIntent,
  MENU_TEXT_LEXICON,
} from "../src/conversation-intents.js";

export { MENU_TEXT_LEXICON };

export const SAFE_FALLBACK =
  "ขออภัยค่ะ ตอนนี้น้องมะลิยังไม่มีข้อมูลที่ยืนยันสำหรับคำถามนี้ เพื่อไม่ให้ข้อมูลผิด กรุณากด “คุยกับพนักงาน” หรือพิมพ์ “คุยกับพนักงาน” ได้เลยนะคะ 😊";

export const HANDOFF_ACKNOWLEDGEMENT =
  "รับเรื่องแล้วค่ะ พนักงานมะลิปังจะเข้ามาตอบโดยเร็วที่สุดนะคะ ระหว่างนี้สามารถพิมพ์รายละเอียดเพิ่มเติมไว้ได้เลยค่ะ 😊";

export const SLIP_ACKNOWLEDGEMENT =
  "ได้รับรูปแล้วค่ะ รายการชำระเงินต้องให้พนักงานตรวจสอบก่อนนะคะ ทางร้านจะกลับมายืนยันอีกครั้งค่ะ";

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
  | "ALLERGEN"
  | "WHOLESALE"
  | "ADVANCE_ORDER"
  | "DELIVERY"
  | "PROMOTION"
  | "LOYALTY"
  | "STOCK";

export interface RouteDecision {
  readonly replyKind: ReplyKind;
  readonly reasonCode: string;
  readonly handoff: boolean;
  readonly allowDuringHandoff: boolean;
}

const STATIC_APPROVED_POSTBACK_ROUTES: Readonly<Record<string, ReplyKind>> = {
  "test:main_menu": "FLEX_MENU",
  "test:show_menu": "MENU",
  "test:show_price": "PRICE",
  "test:show_location": "LOCATION",
  "test:show_hours": "HOURS",
  "test:show_rewards": "LOYALTY",
  "test:show_delivery": "DELIVERY",
};

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
  switch (detectConversationIntent(text)) {
    case "SENSITIVE_PERSONAL_DATA":
      return handoff("SENSITIVE_PERSONAL_DATA");
    case "HIGH_RISK":
      return handoff("HIGH_RISK_OR_DYNAMIC_TOPIC");
    case "ALLERGEN":
      return replyAndHandoff("ALLERGEN", "ALLERGEN_REQUIRES_STAFF_REVIEW");
    case "STOCK":
      return replyAndHandoff("STOCK", "CURRENT_STOCK_REQUIRES_STAFF_REVIEW");
    case "PROMOTION":
      return replyAndHandoff(
        "PROMOTION",
        "DAILY_PROMOTION_REQUIRES_STAFF_REVIEW",
      );
    case "WHOLESALE":
      return replyAndHandoff("WHOLESALE", "WHOLESALE_REQUIRES_STAFF_REVIEW");
    case "ADVANCE_ORDER":
      return replyAndHandoff(
        "ADVANCE_ORDER",
        "ADVANCE_ORDER_REQUIRES_STAFF_REVIEW",
      );
    case "LOYALTY_REDEMPTION":
      return replyAndHandoff("LOYALTY", "REWARD_REDEMPTION_REQUIRES_STAFF");
    case "STAFF":
      return handoff("CUSTOMER_REQUESTED_STAFF");
    case "FLEX_MENU":
      return reply("FLEX_MENU", "EXPLICIT_MAIN_MENU");
    case "MENU":
      return reply("MENU", "KB_MENU_NOT_AUTHORITATIVE");
    case "CONTACT":
      return reply("CONTACT", "KB_CONTACT_NOT_AUTHORITATIVE");
    case "PICKUP":
      return reply("PICKUP", "KB_PICKUP_NOT_AUTHORITATIVE");
    case "PRICE":
      return reply("PRICE", "KB_PRICE_NOT_AUTHORITATIVE");
    case "LOCATION":
      return reply("LOCATION", "KB_LOCATION_NOT_AUTHORITATIVE");
    case "HOURS":
      return reply("HOURS", "KB_OPENING_HOURS_NOT_AUTHORITATIVE");
    case "STORAGE":
      return reply("STORAGE", "KB_STORAGE_NOT_AUTHORITATIVE");
    case "LOYALTY":
      return reply("LOYALTY", "KB_LOYALTY_NOT_AUTHORITATIVE");
    case "DELIVERY":
      return reply("DELIVERY", "KB_DELIVERY_NOT_AUTHORITATIVE");
    case "AMBIGUOUS":
      return replyAndHandoff("SAFE_FALLBACK", "AMBIGUOUS_CUSTOMER_TEXT");
    case "UNKNOWN":
      return replyAndHandoff("SAFE_FALLBACK", "NO_AUTHORITATIVE_ANSWER");
  }
}

export function classifyPostback(data: string): RouteDecision {
  if (data === "test:human_handoff") return handoff("CUSTOMER_REQUESTED_STAFF");
  if (data === "test:show_wholesale") {
    return replyAndHandoff(
      "WHOLESALE",
      "WHOLESALE_REQUIRES_STAFF_REVIEW",
      true,
    );
  }
  if (data === "test:show_facebook") {
    return replyAndHandoff("SAFE_FALLBACK", "POSTBACK_SAFE_FALLBACK");
  }
  const replyKind = STATIC_APPROVED_POSTBACK_ROUTES[data];
  return replyKind
    ? reply(replyKind, `POSTBACK_${replyKind}`, true)
    : replyAndHandoff("SAFE_FALLBACK", "POSTBACK_NOT_ALLOWED");
}

export function replyMessage(
  kind: ReplyKind,
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
    kind === "ALLERGEN" ||
    kind === "WHOLESALE" ||
    kind === "ADVANCE_ORDER" ||
    kind === "DELIVERY" ||
    kind === "PROMOTION" ||
    kind === "LOYALTY" ||
    kind === "STOCK"
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
  return withStaffQuickReply({
    type: "text",
    text: "บัญชี TEST นี้ช่วยตอบข้อมูลและร่างคำถามเท่านั้น ยังไม่สร้างออเดอร์จริง ไม่จองสต๊อก และไม่รับชำระเงินจริง กรุณากด “คุยกับพนักงาน” เพื่อดำเนินการต่อค่ะ",
  });
}

export function replyMessages(
  kind: ReplyKind,
  publicAssetBaseUrl: string,
  approvedAnswer?: string,
  enteredHandoff = false,
): readonly LineReplyMessage[] {
  const messages =
    (kind === "MENU" || kind === "PRICE" || kind === "STOCK") &&
    approvedAnswer?.trim()
      ? menuMessages(publicAssetBaseUrl, approvedAnswer)
      : [replyMessage(kind, approvedAnswer)].filter(
          (message): message is LineReplyMessage => message !== undefined,
        );
  if (
    enteredHandoff &&
    kind !== "HANDOFF_ACK" &&
    kind !== "SLIP_ACK" &&
    kind !== "NONE"
  ) {
    return [...messages, { type: "text", text: HANDOFF_ACKNOWLEDGEMENT }];
  }
  return messages;
}

function menuMessages(
  publicAssetBaseUrl: string,
  approvedAnswer: string,
): readonly LineReplyMessage[] {
  const baseUrl = validatedTestAssetBaseUrl(publicAssetBaseUrl);
  return [
    imageMessage(`${baseUrl}/menu/bread-menu.jpeg`),
    imageMessage(`${baseUrl}/menu/chiffon-cookie-menu.jpeg`),
    withStaffQuickReply({ type: "text", text: approvedAnswer }),
  ];
}

function imageMessage(url: string): LineReplyMessage {
  return { type: "image", originalContentUrl: url, previewImageUrl: url };
}

export function validatedTestAssetBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("INVALID_TEST_ASSET_BASE_URL");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "malispang-lineoa-test.eakkachai-dev.workers.dev" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("INVALID_TEST_ASSET_BASE_URL");
  }
  return url.origin;
}

function withStaffQuickReply(message: LineReplyMessage): LineReplyMessage {
  return { ...message, quickReply: STAFF_QUICK_REPLY };
}

function handoff(reasonCode: string): RouteDecision {
  return {
    replyKind: "HANDOFF_ACK",
    reasonCode,
    handoff: true,
    allowDuringHandoff: false,
  };
}

function replyAndHandoff(
  replyKind: ReplyKind,
  reasonCode: string,
  allowDuringHandoff = false,
): RouteDecision {
  return { replyKind, reasonCode, handoff: true, allowDuringHandoff };
}

function reply(
  replyKind: ReplyKind,
  reasonCode: string,
  allowDuringHandoff = false,
): RouteDecision {
  return { replyKind, reasonCode, handoff: false, allowDuringHandoff };
}
