import { buildFlexMenu, FLEX_MENU_ALT_TEXT } from "./flex-menu.js";
import type {
  CustomerAction,
  MockEvent,
  ReplyEnvelope,
  ReplyMessage,
} from "./types.js";
import type { MemoryStore } from "./memory-store.js";

export const HANDOFF_ACKNOWLEDGEMENT =
  "รับทราบค่ะ กำลังส่งต่อให้พนักงานมะลิปังช่วยดูแลนะคะ 😊";

export const MOCK_DRAFT_ORDER_NOTICE =
  "โหมด TEST: เริ่มร่างคำสั่งซื้อจำลองเท่านั้น ยังไม่มีการสร้างออเดอร์จริงและไม่รับชำระเงินจริงค่ะ";

export const MOCK_REWARDS_NOTICE =
  "โหมด TEST: ข้อมูลโปรโมชั่นและสะสมแต้มเป็นข้อมูลทดสอบเท่านั้น ไม่เชื่อมบัตร Production และไม่ให้แต้มจริงค่ะ";

export interface Phase1AOptions {
  readonly environment: "test";
  readonly authorizedStaffIds: ReadonlySet<string>;
}

export class Phase1AService {
  constructor(
    readonly store: MemoryStore,
    private readonly options: Phase1AOptions,
  ) {}

  process(event: MockEvent): readonly ReplyEnvelope[] {
    if (this.options.environment !== "test")
      throw new Error("FAIL_CLOSED_NON_TEST_ENVIRONMENT");
    if (this.store.processedEventIds.has(event.eventId)) return [];
    this.store.processedEventIds.add(event.eventId);

    const conversation = this.store.conversation(event.conversationId);

    if (event.kind === "staff_close") {
      if (!this.options.authorizedStaffIds.has(event.staffId)) return [];
      if (conversation.mode === "HUMAN_HANDOFF") {
        conversation.mode = "BOT_ACTIVE";
        conversation.handoffAcknowledged = false;
        conversation.closedBy = event.staffId;
      }
      return [];
    }

    if (conversation.mode === "HUMAN_HANDOFF") return [];

    if (event.content.kind === "payment_slip") {
      return this.enterHandoff(event.eventId, event.conversationId);
    }

    if (event.content.kind === "action") {
      return this.routeAction(
        event.eventId,
        event.conversationId,
        event.content.action,
      );
    }

    if (isHumanRequest(event.content.text)) {
      return this.enterHandoff(event.eventId, event.conversationId);
    }

    if (isMenuRequest(event.content.text)) {
      return this.flexMenu(event.eventId, event.conversationId);
    }

    // Ambiguous messages must not open a form or cause a global menu response.
    return [];
  }

  private routeAction(
    eventId: string,
    conversationId: string,
    action: CustomerAction,
  ): readonly ReplyEnvelope[] {
    if (action === "SHOW_MENU") {
      return this.flexMenu(eventId, conversationId);
    }

    if (action === "ADVANCE_ORDER") {
      return [
        this.enqueue(conversationId, `draft:${eventId}`, {
          type: "text",
          text: MOCK_DRAFT_ORDER_NOTICE,
        }),
      ];
    }

    if (action === "REWARDS_INFO") {
      return [
        this.enqueue(conversationId, `rewards:${eventId}`, {
          type: "text",
          text: MOCK_REWARDS_NOTICE,
        }),
      ];
    }

    // Menu, stock and location require owner-approved data or staff review.
    return this.enterHandoff(eventId, conversationId);
  }

  private flexMenu(
    eventId: string,
    conversationId: string,
  ): readonly ReplyEnvelope[] {
    return [
      this.enqueue(conversationId, `flex:${eventId}`, {
        type: "flex",
        altText: FLEX_MENU_ALT_TEXT,
        contents: buildFlexMenu(),
      }),
    ];
  }

  private enterHandoff(
    eventId: string,
    conversationId: string,
  ): readonly ReplyEnvelope[] {
    const conversation = this.store.conversation(conversationId);
    conversation.mode = "HUMAN_HANDOFF";
    conversation.handoffWindow += 1;
    if (conversation.handoffAcknowledged) return [];
    conversation.handoffAcknowledged = true;
    return [
      this.enqueue(
        conversationId,
        `handoff:${conversationId}:${conversation.handoffWindow}:${eventId}`,
        { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
      ),
    ];
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
}

function isHumanRequest(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase("th-TH");
  return ["คุยกับพนักงาน", "ขอคุยกับพนักงาน", "แอดมิน", "เจ้าหน้าที่"].some(
    (keyword) => normalized.includes(keyword),
  );
}

function isMenuRequest(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase("th-TH");
  return ["เมนู", "ช่วยเหลือ", "ตัวเลือก", "help"].some((keyword) =>
    normalized.includes(keyword),
  );
}
