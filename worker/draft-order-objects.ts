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

  ownerUatDraftObservation() {
    try {
      const sql = this.ctx.storage.sql;
      const row = sql
        .exec<{ state: string }>(
          "SELECT json_extract(aggregate_json, '$.state') AS state FROM draft_current WHERE id = 1",
        )
        .toArray()[0];
      const state = row ? row.state : "NO_DRAFT";
      if (
        ![
          "NO_DRAFT",
          "CONSENT_REQUIRED",
          "COLLECTING",
          "READY_FOR_REVIEW",
          "AWAITING_STAFF_REVIEW",
          "PRICE_BLOCKED",
          "CANCELLED",
          "EXPIRED_PURGED",
          "FAILED_REVIEW",
        ].includes(state)
      )
        return null;
      const deliveries = sql
        .exec<{ pending: number; malformed: number }>(
          "SELECT COUNT(CASE WHEN delivered != 1 THEN 1 END) AS pending, COUNT(CASE WHEN delivered NOT IN (0, 1) THEN 1 END) AS malformed FROM draft_processed_events",
        )
        .one();
      if (deliveries.malformed !== 0) return null;
      // Project predicates only: never load/normalize customer fields or invoke expiry.
      const purge =
        state === "EXPIRED_PURGED"
          ? sql
              .exec<{
                structure: number;
                empty_fields: number;
                empty_items: number;
                no_expiry: number;
                history: number;
                audit: number;
              }>(
                `
        SELECT
          (json_type(aggregate_json) = 'object'
           AND (SELECT COUNT(*) FROM json_each(aggregate_json)) = 6
           AND (SELECT COUNT(DISTINCT key) FROM json_each(aggregate_json)) = 6
           AND NOT EXISTS (SELECT 1 FROM json_each(aggregate_json)
             WHERE key NOT IN ('state','revision','updatedAt','fields','catalogVersion','catalogChecksum'))
           AND json_type(aggregate_json, '$.revision') = 'integer'
           AND json_extract(aggregate_json, '$.revision') > 0
           AND json_type(aggregate_json, '$.updatedAt') = 'integer'
           AND json_extract(aggregate_json, '$.updatedAt') = updated_at
           AND updated_at > 0
           AND json_extract(aggregate_json, '$.catalogVersion') = ?
           AND json_extract(aggregate_json, '$.catalogChecksum') = ?) AS structure,
          (json_type(aggregate_json, '$.fields') = 'object'
           AND (SELECT COUNT(*) FROM json_each(aggregate_json, '$.fields')) = 1
           AND NOT EXISTS (SELECT 1 FROM json_each(aggregate_json, '$.fields') WHERE key != 'items')) AS empty_fields,
          (json_type(aggregate_json, '$.fields.items') = 'array'
           AND json_array_length(aggregate_json, '$.fields.items') = 0) AS empty_items,
          (expires_at IS NULL AND json_type(aggregate_json, '$.expiresAt') IS NULL) AS no_expiry,
          (NOT EXISTS (SELECT 1 FROM draft_revisions r WHERE r.aggregate_json != d.aggregate_json
           OR r.revision != json_extract(d.aggregate_json, '$.revision'))) AS history,
          (EXISTS (SELECT 1 FROM draft_audit a WHERE a.id = (SELECT MAX(id) FROM draft_audit)
           AND a.outcome = 'DRAFT_EXPIRED_PII_PURGED'
           AND a.revision = json_extract(d.aggregate_json, '$.revision')
           AND a.created_at = d.updated_at AND a.expires_at > a.created_at
           AND a.actor_ref IS NULL)) AS audit
        FROM draft_current d WHERE id = 1`,
                newDraft(0).catalogVersion,
                newDraft(0).catalogChecksum,
              )
              .one()
          : null;
      const purgeInvariants = purge
        ? {
            validStructure: purge.structure === 1,
            noRetainedCustomerFields: purge.empty_fields === 1,
            noRetainedItems: purge.empty_items === 1,
            noActiveExpiry: purge.no_expiry === 1,
            purgedHistory: purge.history === 1,
            validPurgeAudit: purge.audit === 1,
            noPendingDelivery: deliveries.pending === 0,
          }
        : null;
      const purgeVerified =
        purgeInvariants !== null &&
        Object.values(purgeInvariants).every((value) => value === true);
      // A row labelled NO_DRAFT is not equivalent to absence of an aggregate.
      return {
        state,
        pendingReplies: deliveries.pending,
        nonBlocking: (!row || purgeVerified) && deliveries.pending === 0,
        purgeInvariants,
      };
    } catch {
      return null;
    }
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

  current(now = Date.now()): TestPromotion {
    return this.expireIfNeeded(now);
  }

  alarm(): void {
    this.expireIfNeeded(Date.now());
  }

  redactedAudit(): readonly {
    outcome: string;
    revision: number;
    createdAt: number;
  }[] {
    return this.ctx.storage.sql
      .exec<{ outcome: string; revision: number; created_at: number }>(
        "SELECT outcome, revision, created_at FROM promotion_audit ORDER BY id DESC LIMIT 100",
      )
      .toArray()
      .map((row) => ({
        outcome: row.outcome,
        revision: row.revision,
        createdAt: row.created_at,
      }));
  }

  recordRejected(outcome: string, actorRef: string, now: number): void {
    const current = this.readCurrent();
    this.ctx.storage.sql.exec(
      "INSERT INTO promotion_audit (actor_ref, outcome, revision, start_at, end_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      actorRef,
      outcome,
      current.revision,
      current.startAt,
      current.endAt,
      now,
    );
  }

  private readCurrent(): TestPromotion {
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

  async change(
    change: {
      readonly enabled: boolean;
      readonly startAt: number;
      readonly endAt: number;
    },
    actorRef: string,
    now: number,
  ): Promise<TestPromotion> {
    const current = this.readCurrent();
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
    if (change.enabled) await this.ctx.storage.setAlarm(change.endAt);
    else await this.ctx.storage.deleteAlarm();
    return { ...change, revision };
  }

  private expireIfNeeded(now: number): TestPromotion {
    const current = this.readCurrent();
    if (!current.enabled || now < current.endAt) return current;
    const revision = current.revision + 1;
    this.ctx.storage.sql.exec(
      "UPDATE promotion_state SET enabled = 0, revision = ?, updated_at = ? WHERE id = 1",
      revision,
      now,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO promotion_audit (actor_ref, outcome, revision, start_at, end_at, created_at) VALUES ('SYSTEM', 'TEST_PROMOTION_AUTO_EXPIRED', ?, ?, ?, ?)",
      revision,
      current.startAt,
      current.endAt,
      now,
    );
    return { ...current, enabled: false, revision };
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
