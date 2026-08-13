import type { ConversationState, ReplyEnvelope } from "./types.js";

export class MemoryStore {
  readonly processedEventIds = new Set<string>();
  readonly conversations = new Map<string, ConversationState>();
  readonly outbox = new Map<string, ReplyEnvelope>();

  conversation(id: string): ConversationState {
    const existing = this.conversations.get(id);
    if (existing) return existing;
    const created: ConversationState = {
      mode: "BOT_ACTIVE",
      handoffWindow: 0,
      handoffAcknowledged: false,
    };
    this.conversations.set(id, created);
    return created;
  }
}
