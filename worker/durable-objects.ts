import { DurableObject } from "cloudflare:workers";

import type { ReplyKind, RouteDecision } from "./routing.js";

export interface ProcessEventInput {
  readonly eventRef: string;
  readonly decision: RouteDecision;
  readonly now: number;
  readonly processedRetentionSeconds: number;
  readonly auditRetentionSeconds: number;
}

export interface ProcessEventResult {
  readonly status: "RESPOND" | "SILENT" | "DUPLICATE";
  readonly replyKind: ReplyKind;
  readonly enteredHandoff: boolean;
}

interface ProcessedRow extends Record<string, SqlStorageValue> {
  reply_kind: ReplyKind;
  delivered: number;
  entered_handoff: number;
}

interface StateRow extends Record<string, SqlStorageValue> {
  mode: "BOT_ACTIVE" | "HUMAN_HANDOFF";
}

export class ConversationStateDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS conversation_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          mode TEXT NOT NULL,
          acknowledged INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO conversation_state (id, mode, acknowledged, updated_at)
        VALUES (1, 'BOT_ACTIVE', 0, 0);
        CREATE TABLE IF NOT EXISTS processed_events (
          event_ref TEXT PRIMARY KEY,
          reply_kind TEXT NOT NULL,
          delivered INTEGER NOT NULL,
          entered_handoff INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_processed_expiry ON processed_events(expires_at);
        CREATE TABLE IF NOT EXISTS audit_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_ref TEXT NOT NULL,
          outcome TEXT NOT NULL,
          reason_code TEXT NOT NULL,
          actor_ref TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_expiry ON audit_events(expires_at);
      `);
      return Promise.resolve();
    });
  }

  processEvent(input: ProcessEventInput): ProcessEventResult {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM processed_events WHERE expires_at <= ?", input.now);
    sql.exec("DELETE FROM audit_events WHERE expires_at <= ?", input.now);

    const existing = sql
      .exec<ProcessedRow>(
        "SELECT reply_kind, delivered, entered_handoff FROM processed_events WHERE event_ref = ?",
        input.eventRef,
      )
      .toArray()[0];
    if (existing) {
      if (existing.delivered === 1) {
        this.audit(input, "DUPLICATE_IGNORED", "EVENT_ALREADY_DELIVERED");
        return {
          status: "DUPLICATE",
          replyKind: "NONE",
          enteredHandoff: false,
        };
      }
      return {
        status: "RESPOND",
        replyKind: existing.reply_kind,
        enteredHandoff: existing.entered_handoff === 1,
      };
    }

    const state = sql
      .exec<StateRow>("SELECT mode FROM conversation_state WHERE id = 1")
      .one();
    const processedExpiry = input.now + input.processedRetentionSeconds * 1000;
    if (state.mode === "HUMAN_HANDOFF") {
      if (input.decision.allowDuringHandoff) {
        sql.exec(
          "INSERT INTO processed_events VALUES (?, ?, 0, 0, ?, ?)",
          input.eventRef,
          input.decision.replyKind,
          input.now,
          processedExpiry,
        );
        this.audit(
          input,
          "HANDOFF_APPROVED_STATIC_RESPONSE",
          input.decision.reasonCode,
        );
        return {
          status: "RESPOND",
          replyKind: input.decision.replyKind,
          enteredHandoff: false,
        };
      }
      sql.exec(
        "INSERT INTO processed_events VALUES (?, 'NONE', 1, 0, ?, ?)",
        input.eventRef,
        input.now,
        processedExpiry,
      );
      this.audit(input, "HANDOFF_SILENCE", "STAFF_OWNS_CONVERSATION");
      return { status: "SILENT", replyKind: "NONE", enteredHandoff: false };
    }

    const { replyKind } = input.decision;
    if (input.decision.handoff) {
      sql.exec(
        "UPDATE conversation_state SET mode = 'HUMAN_HANDOFF', acknowledged = 1, updated_at = ? WHERE id = 1",
        input.now,
      );
    }
    sql.exec(
      "INSERT INTO processed_events VALUES (?, ?, 0, ?, ?, ?)",
      input.eventRef,
      replyKind,
      input.decision.handoff ? 1 : 0,
      input.now,
      processedExpiry,
    );
    this.audit(
      input,
      input.decision.handoff ? "HANDOFF_STARTED" : "RESPONSE_SELECTED",
      input.decision.reasonCode,
    );
    return {
      status: "RESPOND",
      replyKind,
      enteredHandoff: input.decision.handoff,
    };
  }

  markDelivered(eventRef: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE processed_events SET delivered = 1 WHERE event_ref = ?",
      eventRef,
    );
  }

  closeHandoff(
    actorRef: string,
    now: number,
    auditRetentionSeconds: number,
  ): boolean {
    const state = this.ctx.storage.sql
      .exec<StateRow>("SELECT mode FROM conversation_state WHERE id = 1")
      .one();
    if (state.mode !== "HUMAN_HANDOFF") return false;
    this.ctx.storage.sql.exec(
      "UPDATE conversation_state SET mode = 'BOT_ACTIVE', acknowledged = 0, updated_at = ? WHERE id = 1",
      now,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO audit_events (event_ref, outcome, reason_code, actor_ref, created_at, expires_at) VALUES ('STAFF_CLOSE', 'HANDOFF_CLOSED', 'AUTHORIZED_TEST_STAFF', ?, ?, ?)",
      actorRef,
      now,
      now + auditRetentionSeconds * 1000,
    );
    return true;
  }

  state(): "BOT_ACTIVE" | "HUMAN_HANDOFF" {
    return this.ctx.storage.sql
      .exec<StateRow>("SELECT mode FROM conversation_state WHERE id = 1")
      .one().mode;
  }

  auditSnapshot(): readonly {
    outcome: string;
    reasonCode: string;
    createdAt: number;
  }[] {
    return this.ctx.storage.sql
      .exec<{ outcome: string; reason_code: string; created_at: number }>(
        "SELECT outcome, reason_code, created_at FROM audit_events ORDER BY id DESC LIMIT 100",
      )
      .toArray()
      .map((row) => ({
        outcome: row.outcome,
        reasonCode: row.reason_code,
        createdAt: row.created_at,
      }));
  }

  private audit(
    input: ProcessEventInput,
    outcome: string,
    reasonCode: string,
  ): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO audit_events (event_ref, outcome, reason_code, actor_ref, created_at, expires_at) VALUES (?, ?, ?, NULL, ?, ?)",
      input.eventRef,
      outcome,
      reasonCode,
      input.now,
      input.now + input.auditRetentionSeconds * 1000,
    );
  }
}

export class HandoffRegistryDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS active_handoffs (
          conversation_ref TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL
        );
      `);
      return Promise.resolve();
    });
  }

  activate(conversationRef: string, now: number): void {
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO active_handoffs (conversation_ref, created_at) VALUES (?, ?)",
      conversationRef,
      now,
    );
  }

  remove(conversationRef: string): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM active_handoffs WHERE conversation_ref = ?",
      conversationRef,
    );
  }

  listActive(): readonly { conversationRef: string; createdAt: number }[] {
    return this.ctx.storage.sql
      .exec<{ conversation_ref: string; created_at: number }>(
        "SELECT conversation_ref, created_at FROM active_handoffs ORDER BY created_at",
      )
      .toArray()
      .map((row) => ({
        conversationRef: row.conversation_ref,
        createdAt: row.created_at,
      }));
  }
}
