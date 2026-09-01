import { DurableObject } from "cloudflare:workers";

import {
  newDraft,
  repriceDraftForStaff,
  transitionDraft,
  type DraftAggregate,
  type DraftTransition,
  type TestPromotion,
} from "../src/draft-order.js";
import { DISABLED_TEST_PROMOTION } from "../src/test-promotion-control.js";

export interface ProcessDraftTextInput {
  readonly eventRef: string;
  readonly text: string;
  readonly now: number;
  readonly startRequested: boolean;
  readonly promotion: TestPromotion;
  readonly auditRetentionSeconds: number;
}

export interface ProcessDraftTextResult {
  readonly handled: boolean;
  readonly duplicate: boolean;
  readonly state: DraftAggregate["state"];
  readonly messages: readonly string[];
  readonly enterHandoff: boolean;
}

interface DraftRow extends Record<string, SqlStorageValue> {
  aggregate_json: string;
}

interface ProcessedDraftRow extends Record<string, SqlStorageValue> {
  result_json: string;
  delivered: number;
}

export class DraftOrderDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS draft_current (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          aggregate_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          expires_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS draft_revisions (
          revision INTEGER PRIMARY KEY,
          aggregate_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS draft_processed_events (
          event_ref TEXT PRIMARY KEY,
          result_json TEXT NOT NULL,
          delivered INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS draft_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          outcome TEXT NOT NULL,
          revision INTEGER NOT NULL,
          actor_ref TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
      `);
      return Promise.resolve();
    });
  }

  async processText(
    input: ProcessDraftTextInput,
  ): Promise<ProcessDraftTextResult> {
    const sql = this.ctx.storage.sql;
    sql.exec(
      "DELETE FROM draft_processed_events WHERE expires_at <= ?",
      input.now,
    );
    sql.exec("DELETE FROM draft_audit WHERE expires_at <= ?", input.now);
    const existing = sql
      .exec<ProcessedDraftRow>(
        "SELECT result_json, delivered FROM draft_processed_events WHERE event_ref = ?",
        input.eventRef,
      )
      .toArray()[0];
    if (existing) {
      const prior = parseResult(existing.result_json);
      return existing.delivered === 1
        ? { ...prior, duplicate: true, messages: [] }
        : prior;
    }

    let current: DraftAggregate;
    try {
      current = this.load(input.now);
    } catch {
      return {
        handled: true,
        duplicate: false,
        state: "FAILED_REVIEW",
        messages: [],
        enterHandoff: false,
      };
    }
    const transition = transitionDraft(
      current,
      input.text,
      input.now,
      input.startRequested,
      input.promotion,
    );
    const result: ProcessDraftTextResult = {
      handled: transition.changed || transition.messages.length > 0,
      duplicate: false,
      state: transition.aggregate.state,
      messages: transition.messages,
      enterHandoff: transition.enterHandoff,
    };
    if (!result.handled) return result;

    if (transition.changed) this.persist(transition, input.now);
    sql.exec(
      "INSERT INTO draft_processed_events VALUES (?, ?, 0, ?, ?)",
      input.eventRef,
      JSON.stringify(result),
      input.now,
      input.now + input.auditRetentionSeconds * 1000,
    );
    sql.exec(
      "INSERT INTO draft_audit (outcome, revision, created_at, expires_at) VALUES (?, ?, ?, ?)",
      transition.auditOutcome,
      transition.aggregate.revision,
      input.now,
      input.now + input.auditRetentionSeconds * 1000,
    );
    if (transition.aggregate.expiresAt !== undefined) {
      await this.ctx.storage.setAlarm(transition.aggregate.expiresAt);
    }
    return result;
  }

  markDelivered(eventRef: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE draft_processed_events SET delivered = 1 WHERE event_ref = ?",
      eventRef,
    );
  }

  state(now: number): DraftAggregate["state"] {
    return this.load(now).state;
  }

  redactedAudit(): readonly {
    outcome: string;
    revision: number;
    createdAt: number;
  }[] {
    return this.ctx.storage.sql
      .exec<{ outcome: string; revision: number; created_at: number }>(
        "SELECT outcome, revision, created_at FROM draft_audit ORDER BY id DESC LIMIT 100",
      )
      .toArray()
      .map((row) => ({
        outcome: row.outcome,
        revision: row.revision,
        createdAt: row.created_at,
      }));
  }

  async repriceByStaff(
    actorRef: string,
    promotion: TestPromotion,
    now: number,
    auditRetentionSeconds: number,
  ): Promise<{
    readonly state: DraftAggregate["state"];
    readonly revision: number;
    readonly subtotalSatang: number;
    readonly proposedDepositSatang: number;
    readonly promotionApplied: boolean;
  }> {
    const current = this.load(now);
    const repriced = repriceDraftForStaff(current, promotion, now);
    this.persist(
      {
        aggregate: repriced.aggregate,
        changed: true,
        messages: [],
        enterHandoff: false,
        purgePii: false,
        auditOutcome: "DRAFT_STAFF_REPRICED",
      },
      now,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO draft_audit (outcome, revision, actor_ref, created_at, expires_at) VALUES ('DRAFT_STAFF_REPRICED', ?, ?, ?, ?)",
      repriced.aggregate.revision,
      actorRef,
      now,
      now + auditRetentionSeconds * 1000,
    );
    if (repriced.aggregate.expiresAt !== undefined) {
      await this.ctx.storage.setAlarm(repriced.aggregate.expiresAt);
    }
    return {
      state: repriced.aggregate.state,
      revision: repriced.aggregate.revision,
      subtotalSatang: repriced.calculation.subtotalSatang,
      proposedDepositSatang: repriced.calculation.proposedDepositSatang,
      promotionApplied: repriced.calculation.promotionApplied,
    };
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const current = this.load(now);
    if (current.expiresAt === undefined || current.expiresAt > now) {
      if (current.expiresAt !== undefined)
        await this.ctx.storage.setAlarm(current.expiresAt);
      return;
    }
    const purged: DraftAggregate = {
      ...newDraft(now),
      state: "EXPIRED_PURGED",
      revision: current.revision + 1,
    };
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM draft_revisions");
    sql.exec(
      "INSERT OR REPLACE INTO draft_current (id, aggregate_json, updated_at, expires_at) VALUES (1, ?, ?, NULL)",
      JSON.stringify(purged),
      now,
    );
    sql.exec(
      "INSERT INTO draft_audit (outcome, revision, created_at, expires_at) VALUES ('DRAFT_EXPIRED_PII_PURGED', ?, ?, ?)",
      purged.revision,
      now,
      now + 365 * 24 * 60 * 60 * 1000,
    );
  }

  private load(now: number): DraftAggregate {
    const row = this.ctx.storage.sql
      .exec<DraftRow>("SELECT aggregate_json FROM draft_current WHERE id = 1")
      .toArray()[0];
    if (!row) return newDraft(now);
    return parseAggregate(row.aggregate_json);
  }

  private persist(transition: DraftTransition, now: number): void {
    const aggregate = transition.aggregate;
    const expiresAt = aggregate.expiresAt ?? now;
    const sql = this.ctx.storage.sql;
    if (transition.purgePii) sql.exec("DELETE FROM draft_revisions");
    sql.exec(
      "INSERT OR REPLACE INTO draft_current (id, aggregate_json, updated_at, expires_at) VALUES (1, ?, ?, ?)",
      JSON.stringify(aggregate),
      aggregate.updatedAt,
      aggregate.expiresAt ?? null,
    );
    sql.exec(
      "INSERT OR REPLACE INTO draft_revisions (revision, aggregate_json, created_at, expires_at) VALUES (?, ?, ?, ?)",
      aggregate.revision,
      JSON.stringify(aggregate),
      now,
      expiresAt,
    );
  }
}

interface PromotionRow extends Record<string, SqlStorageValue> {
  enabled: number;
  revision: number;
  start_at: number;
  end_at: number;
}

export class PromotionControlDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(() => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS promotion_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          enabled INTEGER NOT NULL,
          revision INTEGER NOT NULL,
          start_at INTEGER NOT NULL,
          end_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO promotion_state VALUES (1, 0, 0, 0, 0, 0);
        CREATE TABLE IF NOT EXISTS promotion_audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_ref TEXT NOT NULL,
          outcome TEXT NOT NULL,
          revision INTEGER NOT NULL,
          start_at INTEGER NOT NULL,
          end_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      return Promise.resolve();
    });
  }

  current(): TestPromotion {
    const row = this.ctx.storage.sql
      .exec<PromotionRow>(
        "SELECT enabled, revision, start_at, end_at FROM promotion_state WHERE id = 1",
      )
      .one();
    return {
      enabled: row.enabled === 1,
      revision: row.revision,
      startAt: row.start_at,
      endAt: row.end_at,
    };
  }

  change(
    change: {
      readonly enabled: boolean;
      readonly startAt: number;
      readonly endAt: number;
    },
    actorRef: string,
    now: number,
  ): TestPromotion {
    const current = this.current();
    const revision = current.revision + 1;
    this.ctx.storage.sql.exec(
      "UPDATE promotion_state SET enabled = ?, revision = ?, start_at = ?, end_at = ?, updated_at = ? WHERE id = 1",
      change.enabled ? 1 : 0,
      revision,
      change.startAt,
      change.endAt,
      now,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO promotion_audit (actor_ref, outcome, revision, start_at, end_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      actorRef,
      change.enabled ? "TEST_PROMOTION_ENABLED" : "TEST_PROMOTION_DISABLED",
      revision,
      change.startAt,
      change.endAt,
      now,
    );
    return { ...change, revision };
  }
}

function parseAggregate(raw: string): DraftAggregate {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || !("state" in value)) {
    throw new Error("DRAFT_PERSISTENCE_INVALID");
  }
  return value as DraftAggregate;
}

function parseResult(raw: string): ProcessDraftTextResult {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || !("state" in value)) {
    throw new Error("DRAFT_PERSISTENCE_INVALID");
  }
  return value as ProcessDraftTextResult;
}

export function disabledPromotion(): TestPromotion {
  return DISABLED_TEST_PROMOTION;
}
