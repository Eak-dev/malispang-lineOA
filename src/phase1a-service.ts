import type { RedactedAuditLog } from "./audit-log.js";
import type { FaqIntent } from "./faq.js";
import { ApprovedFaqKnowledgeBase } from "./faq.js";
import { buildFlexMenu, FLEX_MENU_ALT_TEXT } from "./flex-menu.js";
import type { MemoryStore } from "./memory-store.js";
import { assertTestSafetyBoundary } from "./safety-boundary.js";
import type {
  CustomerAction,
  MockEvent,
  ReplyEnvelope,
  ReplyMessage,
} from "./types.js";

export const HANDOFF_ACKNOWLEDGEMENT =
  "รับเรื่องแล้วค่ะ พนักงานมะลิปังจะเข้ามาตอบโดยเร็วที่สุดนะคะ ระหว่างนี้สามารถพิมพ์รายละเอียดเพิ่มเติมไว้ได้เลยค่ะ 😊";

export const SAFE_FALLBACK =
  "ขออภัยค่ะ ข้อมูลนี้ยังไม่มีแหล่งข้อมูลที่เจ้าของร้านอนุมัติ จึงยังยืนยันแทนร้านไม่ได้ หากต้องการ สามารถเลือก “คุยกับพนักงาน” เพื่อให้พนักงานช่วยตรวจสอบค่ะ";

export const MOCK_DRAFT_ORDER_NOTICE =
  "โหมด TEST: เป็นเพียงแบบร่างจำลอง ไม่มีการสร้างออเดอร์จริงและไม่รับชำระเงินจริงค่ะ";

export const MOCK_REWARDS_NOTICE =
  "โหมด TEST: ข้อมูลโปรโมชั่นและสะสมแต้มเป็นข้อมูลทดสอบเท่านั้น ไม่เชื่อมบัตร Production และไม่ให้แต้มจริงค่ะ";

export interface Phase1AOptions {
  readonly environment: "test";
  readonly accountName: "มะลิปัง TEST";
  readonly authorizedStaffIds: ReadonlySet<string>;
  readonly faq?: ApprovedFaqKnowledgeBase;
  readonly auditLog?: RedactedAuditLog;
  readonly environmentVariables?: Readonly<Record<string, string | undefined>>;
}

export class Phase1AService {
  private readonly faq: ApprovedFaqKnowledgeBase;

  constructor(
    readonly store: MemoryStore,
    private readonly options: Phase1AOptions,
  ) {
    assertTestSafetyBoundary(options);
    this.faq = options.faq ?? new ApprovedFaqKnowledgeBase();
  }

  process(event: MockEvent): readonly ReplyEnvelope[] {
    this.store.assertAvailable();
    if (this.store.processedEventIds.has(event.eventId)) {
      this.audit(event, "DUPLICATE_IGNORED", "EVENT_ID_ALREADY_PROCESSED");
      return [];
    }
    this.store.processedEventIds.add(event.eventId);

    const conversation = this.store.conversation(event.conversationId);

    if (event.kind === "staff_close") {
      if (!this.options.authorizedStaffIds.has(event.staffId)) {
        this.audit(event, "HANDOFF_CLOSE_DENIED", "STAFF_NOT_AUTHORIZED");
        return [];
      }
      if (conversation.mode === "HUMAN_HANDOFF") {
        conversation.mode = "BOT_ACTIVE";
        conversation.handoffAcknowledged = false;
        conversation.closedBy = event.staffId;
        this.audit(event, "HANDOFF_CLOSED", "AUTHORIZED_STAFF_CLOSE");
      }
      return [];
    }

    if (conversation.mode === "HUMAN_HANDOFF") {
      this.audit(event, "HANDOFF_SILENCE", "CONVERSATION_OWNED_BY_STAFF");
      return [];
    }

    if (event.content.kind === "payment_slip") {
      return this.enterHandoff(event, "PAYMENT_REQUIRES_HUMAN_REVIEW");
    }

    if (event.content.kind === "action") {
      return this.routeAction(event, event.content.action);
    }

    if (requiresHumanReview(event.content.text)) {
      return this.enterHandoff(event, "SENSITIVE_OR_DYNAMIC_TOPIC");
    }

    if (isHumanRequest(event.content.text)) {
      return this.enterHandoff(event, "CUSTOMER_REQUESTED_STAFF");
    }

    if (isFlexMenuRequest(event.content.text)) {
      return this.flexMenu(event);
    }

    return this.answerFaqOrFallback(
      event,
      this.faq.lookupText(event.content.text),
    );
  }

  private routeAction(
    event: Extract<MockEvent, { kind: "customer" }>,
    action: CustomerAction,
  ): readonly ReplyEnvelope[] {
    if (action === "OPEN_FLEX_MENU") return this.flexMenu(event);
    if (action === "HUMAN_HANDOFF") {
      return this.enterHandoff(event, "CUSTOMER_REQUESTED_STAFF");
    }
    if (action === "CHECK_TODAY") {
      return this.enterHandoff(event, "CURRENT_STOCK_REQUIRES_STAFF");
    }
    if (action === "ADVANCE_ORDER") {
      return this.textReply(
        event,
        MOCK_DRAFT_ORDER_NOTICE,
        "MOCK_NOTICE_SENT",
        "MOCK_DRAFT_ONLY",
      );
    }
    if (action === "REWARDS_INFO") {
      return this.textReply(
        event,
        MOCK_REWARDS_NOTICE,
        "MOCK_NOTICE_SENT",
        "TEST_REWARDS_ONLY",
      );
    }

    const intentByAction: Readonly<Partial<Record<CustomerAction, FaqIntent>>> =
      {
        SHOW_MENU: "MENU",
        MENU_PRICE: "PRICE",
        LOCATION: "LOCATION",
        OPENING_HOURS: "OPENING_HOURS",
        WHOLESALE: "WHOLESALE",
      };
    const intent = intentByAction[action];
    return intent
      ? this.answerFaqOrFallback(event, this.faq.lookupIntent(intent))
      : this.safeFallback(event, "ACTION_NOT_APPROVED");
  }

  private answerFaqOrFallback(
    event: Extract<MockEvent, { kind: "customer" }>,
    result: ReturnType<ApprovedFaqKnowledgeBase["lookupText"]>,
  ): readonly ReplyEnvelope[] {
    if (result.status === "APPROVED" && result.answer !== undefined) {
      return this.textReply(
        event,
        result.answer,
        "FAQ_ANSWERED",
        `FAQ_${result.intent ?? "UNKNOWN"}`,
      );
    }
    return this.safeFallback(
      event,
      result.status === "NO_MATCH"
        ? "QUESTION_NOT_IN_APPROVED_FAQ"
        : `FAQ_${result.intent ?? "UNKNOWN"}_NOT_AUTHORITATIVE`,
    );
  }

  private safeFallback(
    event: Extract<MockEvent, { kind: "customer" }>,
    reasonCode: string,
  ): readonly ReplyEnvelope[] {
    return this.textReply(event, SAFE_FALLBACK, "SAFE_FALLBACK", reasonCode);
  }

  private flexMenu(
    event: Extract<MockEvent, { kind: "customer" }>,
  ): readonly ReplyEnvelope[] {
    const reply = this.enqueue(event.conversationId, `flex:${event.eventId}`, {
      type: "flex",
      altText: FLEX_MENU_ALT_TEXT,
      contents: buildFlexMenu(),
    });
    this.audit(event, "FLEX_MENU_SENT", "EXPLICIT_MENU_REQUEST");
    return [reply];
  }

  private enterHandoff(
    event: Extract<MockEvent, { kind: "customer" }>,
    reasonCode: string,
  ): readonly ReplyEnvelope[] {
    const conversation = this.store.conversation(event.conversationId);
    conversation.mode = "HUMAN_HANDOFF";
    conversation.handoffWindow += 1;
    if (conversation.handoffAcknowledged) return [];
    conversation.handoffAcknowledged = true;
    const reply = this.enqueue(
      event.conversationId,
      `handoff:${event.conversationId}:${conversation.handoffWindow}`,
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    );
    this.audit(event, "HANDOFF_STARTED", reasonCode);
    return [reply];
  }

  private textReply(
    event: Extract<MockEvent, { kind: "customer" }>,
    text: string,
    outcome: "FAQ_ANSWERED" | "SAFE_FALLBACK" | "MOCK_NOTICE_SENT",
    reasonCode: string,
  ): readonly ReplyEnvelope[] {
    const reply = this.enqueue(event.conversationId, `text:${event.eventId}`, {
      type: "text",
      text,
    });
    this.audit(event, outcome, reasonCode);
    return [reply];
  }

  private enqueue(
    conversationId: string,
    replyKey: string,
    message: ReplyMessage,
  ): ReplyEnvelope {
    const existing = this.store.outbox.get(replyKey);
    if (existing) return existing;
    const reply = { replyKey, conversationId, message };
    this.store.outbox.set(replyKey, reply);
    return reply;
  }

  private audit(
    event: MockEvent,
    outcome: Parameters<RedactedAuditLog["record"]>[0]["outcome"],
    reasonCode: string,
  ): void {
    this.options.auditLog?.record({
      eventId: event.eventId,
      conversationId: event.conversationId,
      outcome,
      reasonCode,
    });
  }
}

function isHumanRequest(text: string): boolean {
  const normalized = normalize(text);
  return ["คุยกับพนักงาน", "ขอคุยกับพนักงาน", "แอดมิน", "เจ้าหน้าที่"].some(
    (keyword) => normalized.includes(keyword),
  );
}

function isFlexMenuRequest(text: string): boolean {
  const normalized = normalize(text);
  return ["เมนูหลัก", "เมนูช่วยเหลือ", "ตัวเลือก", "help"].some((keyword) =>
    normalized.includes(keyword),
  );
}

function requiresHumanReview(text: string): boolean {
  const normalized = normalize(text);
  return [
    "ชำระเงิน",
    "โอนเงิน",
    "สลิป",
    "ร้องเรียน",
    "ไม่พอใจ",
    "แพ้อาหาร",
    "สารก่อภูมิแพ้",
    "ออเดอร์จำนวนมาก",
    "สั่งเยอะ",
    "สต๊อก",
    "มีของวันนี้",
    "ของเหลือ",
    "โปรโมชั่น",
    "โปรโมชัน",
  ].some((keyword) => normalized.includes(keyword));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}
