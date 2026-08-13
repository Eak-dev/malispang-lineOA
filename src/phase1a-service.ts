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

    return [
      this.enqueue(event.conversationId, `flex:${event.eventId}`, {
        type: "flex",
        altText: FLEX_MENU_ALT_TEXT,
        contents: buildFlexMenu(),
      }),
    ];
  }

  private routeAction(
    eventId: string,
    conversationId: string,
    action: CustomerAction,
  ): readonly ReplyEnvelope[] {
    if (action === "SHOW_MENU") {
      return [
        this.enqueue(conversationId, `flex:${eventId}`, {
          type: "flex",
          altText: FLEX_MENU_ALT_TEXT,
          contents: buildFlexMenu(),
        }),
      ];
    }

    // These actions require owner-approved business data or a staff decision.
    // Phase 1A deliberately fails closed instead of inventing an answer/form.
    return this.enterHandoff(eventId, conversationId);
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
