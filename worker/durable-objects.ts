import { DurableObject } from "cloudflare:workers";

import type { ReplyKind, RouteDecision } from "./routing.js";
import {
  isMp06PilotCost,
  isMp06PilotReference,
  isMp06PilotTimestamp,
  MP06_PILOT_ATTEMPT_LEASE_MS,
  MP06_PILOT_BUDGET_MICRO_USD,
  MP06_PILOT_EVENTS_PER_HOUR,
  MP06_PILOT_EVENTS_PER_MINUTE,
  MP06_PILOT_EVENTS_PER_SESSION,
  MP06_PILOT_MAX_CONCURRENCY,
  MP06_PILOT_MAX_TESTERS,
  MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION,
  MP06_PILOT_SESSION_DURATION_MS,
  type ActivateMp06PilotInput,
  type AdmitMp06PilotEventInput,
  type Mp06PilotActivationResult,
  type Mp06PilotAdmissionResult,
  type Mp06PilotAttemptInput,
  type Mp06PilotAttemptResult,
  type Mp06PilotStatus,
  type Mp06PilotStopResult,
  type ReserveMp06PilotAttemptInput,
  type SettleMp06PilotAttemptInput,
} from "./mp-06-pilot-control.js";

export interface ProcessEventInput {
  readonly eventRef: string;
  readonly decision: RouteDecision;
  readonly responseFingerprint?: string;
  readonly clarificationTemplateId?: "T-C01" | "T-C04";
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

interface Wp1PlanRow extends Record<string, SqlStorageValue> {
  response_fingerprint: string;
  delivered: number;
}

interface Wp1StateRow extends Record<string, SqlStorageValue> {
  clarification_used: number;
  pending_template_id: string | null;
}

interface Mp06PilotSessionRow extends Record<string, SqlStorageValue> {
  session_ref: string;
  state: "ACTIVE" | "STOPPED" | "EXPIRED";
  started_at: number;
  expires_at: number;
  admitted_events: number;
  provider_attempts: number;
  budget_consumed_micro_usd: number;
  budget_reserved_micro_usd: number;
  in_flight: number;
  stop_reason: string | null;
}

interface Mp06PilotAttemptRow extends Record<string, SqlStorageValue> {
  session_ref: string;
  event_ref: string;
  state: "RESERVED" | "DISPATCHED" | "SETTLED" | "USAGE_UNKNOWN";
  reserved_cost_micro_usd: number;
  actual_cost_micro_usd: number | null;
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
        CREATE TABLE IF NOT EXISTS mp06_conversation_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          clarification_used INTEGER NOT NULL,
          pending_template_id TEXT
        );
        INSERT OR IGNORE INTO mp06_conversation_state (id, clarification_used, pending_template_id)
        VALUES (1, 0, NULL);
        CREATE TABLE IF NOT EXISTS mp06_response_plans (
          event_ref TEXT PRIMARY KEY,
          response_fingerprint TEXT NOT NULL,
          delivered INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_mp06_plan_expiry ON mp06_response_plans(expires_at);
        CREATE TABLE IF NOT EXISTS mp06_pilot_session (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          session_ref TEXT NOT NULL,
          state TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          admitted_events INTEGER NOT NULL,
          provider_attempts INTEGER NOT NULL,
          budget_consumed_micro_usd INTEGER NOT NULL,
          budget_reserved_micro_usd INTEGER NOT NULL,
          in_flight INTEGER NOT NULL,
          stop_reason TEXT
        );
        CREATE TABLE IF NOT EXISTS mp06_pilot_testers (
          session_ref TEXT NOT NULL,
          tester_ref TEXT NOT NULL,
          PRIMARY KEY (session_ref, tester_ref)
        );
        CREATE TABLE IF NOT EXISTS mp06_pilot_events (
          session_ref TEXT NOT NULL,
          event_ref TEXT NOT NULL,
          tester_ref TEXT NOT NULL,
          admitted_at INTEGER NOT NULL,
          result_authorized INTEGER NOT NULL,
          PRIMARY KEY (session_ref, event_ref)
        );
        CREATE INDEX IF NOT EXISTS idx_mp06_pilot_event_time
          ON mp06_pilot_events(session_ref, admitted_at);
        CREATE TABLE IF NOT EXISTS mp06_pilot_attempts (
          session_ref TEXT NOT NULL,
          event_ref TEXT NOT NULL,
          attempt_ref TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          reserved_cost_micro_usd INTEGER NOT NULL,
          actual_cost_micro_usd INTEGER,
          reserved_at INTEGER NOT NULL,
          lease_expires_at INTEGER NOT NULL,
          settled_at INTEGER
        );
      `);
      return Promise.resolve();
    });
  }

  processEvent(input: ProcessEventInput): ProcessEventResult {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM processed_events WHERE expires_at <= ?", input.now);
    sql.exec("DELETE FROM audit_events WHERE expires_at <= ?", input.now);
    sql.exec(
      "DELETE FROM mp06_response_plans WHERE expires_at <= ?",
      input.now,
    );

    const existing = sql
      .exec<ProcessedRow>(
        "SELECT reply_kind, delivered, entered_handoff FROM processed_events WHERE event_ref = ?",
        input.eventRef,
      )
      .toArray()[0];
    if (existing) {
      const storedPlan = sql
        .exec<Wp1PlanRow>(
          "SELECT response_fingerprint, delivered FROM mp06_response_plans WHERE event_ref = ?",
          input.eventRef,
        )
        .toArray()[0];
      if (existing.delivered === 1) {
        this.audit(input, "DUPLICATE_IGNORED", "EVENT_ALREADY_DELIVERED");
        return {
          status: "DUPLICATE",
          replyKind: "NONE",
          enteredHandoff: false,
        };
      }
      if (
        (storedPlan &&
          storedPlan.response_fingerprint !== input.responseFingerprint) ||
        (!storedPlan && input.responseFingerprint !== undefined)
      ) {
        sql.exec(
          "UPDATE conversation_state SET mode = 'HUMAN_HANDOFF', acknowledged = 1, updated_at = ? WHERE id = 1",
          input.now,
        );
        sql.exec(
          "UPDATE processed_events SET reply_kind = 'HANDOFF_ACK', entered_handoff = 1 WHERE event_ref = ?",
          input.eventRef,
        );
        this.audit(input, "HANDOFF_STARTED", "MP06_RETRY_PLAN_MISMATCH");
        return {
          status: "RESPOND",
          replyKind: "HANDOFF_ACK",
          enteredHandoff: true,
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

    let decision = input.decision;
    let responseFingerprint = input.responseFingerprint;
    if (
      responseFingerprint !== undefined &&
      !/^[a-f0-9]{64}$/.test(responseFingerprint)
    ) {
      decision = {
        replyKind: "HANDOFF_ACK",
        reasonCode: "MP06_RESPONSE_FINGERPRINT_INVALID",
        handoff: true,
        allowDuringHandoff: false,
      };
      responseFingerprint = undefined;
    }
    if (input.clarificationTemplateId) {
      const clarification = sql
        .exec<Wp1StateRow>(
          "SELECT clarification_used, pending_template_id FROM mp06_conversation_state WHERE id = 1",
        )
        .one();
      if (clarification.clarification_used === 1) {
        decision = {
          replyKind: "HANDOFF_ACK",
          reasonCode: "MP06_I22_CLARIFICATION_BUDGET_EXHAUSTED",
          handoff: true,
          allowDuringHandoff: false,
        };
        responseFingerprint = undefined;
        sql.exec(
          "UPDATE mp06_conversation_state SET pending_template_id = NULL WHERE id = 1",
        );
      } else {
        sql.exec(
          "UPDATE mp06_conversation_state SET clarification_used = 1, pending_template_id = ? WHERE id = 1",
          input.clarificationTemplateId,
        );
      }
    } else if (responseFingerprint) {
      sql.exec(
        "UPDATE mp06_conversation_state SET pending_template_id = NULL WHERE id = 1",
      );
    }

    const { replyKind } = decision;
    if (decision.handoff) {
      sql.exec(
        "UPDATE mp06_conversation_state SET pending_template_id = NULL WHERE id = 1",
      );
      sql.exec(
        "UPDATE conversation_state SET mode = 'HUMAN_HANDOFF', acknowledged = 1, updated_at = ? WHERE id = 1",
        input.now,
      );
    }
    sql.exec(
      "INSERT INTO processed_events VALUES (?, ?, 0, ?, ?, ?)",
      input.eventRef,
      replyKind,
      decision.handoff ? 1 : 0,
      input.now,
      processedExpiry,
    );
    if (responseFingerprint) {
      sql.exec(
        "INSERT INTO mp06_response_plans (event_ref, response_fingerprint, delivered, created_at, expires_at) VALUES (?, ?, 0, ?, ?)",
        input.eventRef,
        responseFingerprint,
        input.now,
        processedExpiry,
      );
    }
    this.audit(
      input,
      decision.handoff ? "HANDOFF_STARTED" : "RESPONSE_SELECTED",
      decision.reasonCode,
    );
    return {
      status: "RESPOND",
      replyKind,
      enteredHandoff: decision.handoff,
    };
  }

  markDelivered(eventRef: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE processed_events SET delivered = 1 WHERE event_ref = ?",
      eventRef,
    );
    this.ctx.storage.sql.exec(
      "UPDATE mp06_response_plans SET delivered = 1 WHERE event_ref = ?",
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
      "UPDATE mp06_conversation_state SET clarification_used = 0, pending_template_id = NULL WHERE id = 1",
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

  mp06Context(): {
    readonly pendingClarificationTemplateId?: "T-C01" | "T-C04";
  } {
    const row = this.ctx.storage.sql
      .exec<Wp1StateRow>(
        "SELECT clarification_used, pending_template_id FROM mp06_conversation_state WHERE id = 1",
      )
      .one();
    return row.pending_template_id === "T-C01" ||
      row.pending_template_id === "T-C04"
      ? { pendingClarificationTemplateId: row.pending_template_id }
      : {};
  }

  activateMp06Pilot(input: ActivateMp06PilotInput): Mp06PilotActivationResult {
    const validTesters =
      Array.isArray(input.testerRefs) &&
      input.testerRefs.length >= 1 &&
      input.testerRefs.length <= MP06_PILOT_MAX_TESTERS &&
      new Set(input.testerRefs).size === input.testerRefs.length &&
      input.testerRefs.every(isMp06PilotReference);
    if (
      !isMp06PilotReference(input.sessionRef) ||
      !isMp06PilotTimestamp(input.now) ||
      !validTesters ||
      !validMp06PilotLimits(input.limits)
    ) {
      return {
        activated: false,
        code: "INVALID_ACTIVATION",
        status: this.mp06PilotStatus(input.now),
      };
    }
    return this.ctx.storage.transactionSync(() => {
      const current = this.mp06PilotSession();
      if (current?.in_flight === 1) {
        return {
          activated: false,
          code: "UNRESOLVED_IN_FLIGHT",
          status: pilotStatus(current, input.now),
        };
      }
      if (
        current?.state === "ACTIVE" &&
        input.now >= current.started_at &&
        input.now < current.expires_at
      ) {
        return {
          activated: false,
          code: "PILOT_ALREADY_ACTIVE",
          status: pilotStatus(current, input.now),
        };
      }
      const sql = this.ctx.storage.sql;
      sql.exec("DELETE FROM mp06_pilot_attempts");
      sql.exec("DELETE FROM mp06_pilot_events");
      sql.exec("DELETE FROM mp06_pilot_testers");
      sql.exec("DELETE FROM mp06_pilot_session");
      sql.exec(
        "INSERT INTO mp06_pilot_session VALUES (1, ?, 'ACTIVE', ?, ?, 0, 0, 0, 0, 0, NULL)",
        input.sessionRef,
        input.now,
        input.now + input.limits.sessionDurationMs,
      );
      for (const testerRef of input.testerRefs) {
        sql.exec(
          "INSERT INTO mp06_pilot_testers (session_ref, tester_ref) VALUES (?, ?)",
          input.sessionRef,
          testerRef,
        );
      }
      return {
        activated: true,
        code: "ACTIVATED",
        status: pilotStatus(this.mp06PilotSession()!, input.now),
      };
    });
  }

  admitMp06PilotEvent(
    input: AdmitMp06PilotEventInput,
  ): Mp06PilotAdmissionResult {
    if (
      !isMp06PilotReference(input.sessionRef) ||
      !isMp06PilotReference(input.eventRef) ||
      !isMp06PilotReference(input.testerRef) ||
      !isMp06PilotTimestamp(input.now)
    ) {
      return { admitted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(input.now);
      if (!session || session.session_ref !== input.sessionRef) {
        return { admitted: false, code: "PILOT_INACTIVE" };
      }
      if (session.state === "EXPIRED") {
        return { admitted: false, code: "SESSION_EXPIRED" };
      }
      if (session.state !== "ACTIVE") {
        return { admitted: false, code: "PILOT_INACTIVE" };
      }
      const sql = this.ctx.storage.sql;
      const duplicate = sql
        .exec<{ present: number }>(
          "SELECT 1 AS present FROM mp06_pilot_events WHERE session_ref = ? AND event_ref = ?",
          input.sessionRef,
          input.eventRef,
        )
        .toArray()[0];
      if (duplicate) return { admitted: false, code: "DUPLICATE" };
      const allowed = sql
        .exec<{ present: number }>(
          "SELECT 1 AS present FROM mp06_pilot_testers WHERE session_ref = ? AND tester_ref = ?",
          input.sessionRef,
          input.testerRef,
        )
        .toArray()[0];
      if (!allowed) return { admitted: false, code: "TESTER_NOT_ALLOWED" };
      const minuteCount = countMp06PilotEvents(
        sql,
        input.sessionRef,
        input.now - 60_000,
      );
      const hourCount = countMp06PilotEvents(
        sql,
        input.sessionRef,
        input.now - 3_600_000,
      );
      if (
        minuteCount >= MP06_PILOT_EVENTS_PER_MINUTE ||
        hourCount >= MP06_PILOT_EVENTS_PER_HOUR
      ) {
        sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'EVENT_RATE_LIMIT_REACHED' WHERE id = 1",
        );
        return { admitted: false, code: "RATE_LIMITED" };
      }
      if (session.admitted_events >= MP06_PILOT_EVENTS_PER_SESSION) {
        sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'SESSION_EVENT_LIMIT_REACHED' WHERE id = 1",
        );
        return { admitted: false, code: "SESSION_LIMIT_REACHED" };
      }
      sql.exec(
        "INSERT INTO mp06_pilot_events VALUES (?, ?, ?, ?, 0)",
        input.sessionRef,
        input.eventRef,
        input.testerRef,
        input.now,
      );
      sql.exec(
        "UPDATE mp06_pilot_session SET admitted_events = admitted_events + 1 WHERE id = 1",
      );
      return { admitted: true, code: "ADMITTED" };
    });
  }

  reserveMp06PilotAttempt(
    input: ReserveMp06PilotAttemptInput,
  ): Mp06PilotAttemptResult {
    if (
      !validMp06PilotAttemptInput(input) ||
      !isMp06PilotCost(input.upperBoundCostMicroUsd) ||
      input.upperBoundCostMicroUsd === 0 ||
      input.upperBoundCostMicroUsd > MP06_PILOT_BUDGET_MICRO_USD
    ) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(input.now);
      if (!session || session.session_ref !== input.sessionRef) {
        return { accepted: false, code: "PILOT_INACTIVE" };
      }
      if (session.state === "EXPIRED") {
        return { accepted: false, code: "SESSION_EXPIRED" };
      }
      if (session.state !== "ACTIVE") {
        return { accepted: false, code: "PILOT_INACTIVE" };
      }
      const sql = this.ctx.storage.sql;
      const event = sql
        .exec<{ present: number }>(
          "SELECT 1 AS present FROM mp06_pilot_events WHERE session_ref = ? AND event_ref = ?",
          input.sessionRef,
          input.eventRef,
        )
        .toArray()[0];
      if (!event) return { accepted: false, code: "EVENT_NOT_ADMITTED" };
      const existing = sql
        .exec<Mp06PilotAttemptRow>(
          "SELECT session_ref, event_ref, state, reserved_cost_micro_usd, actual_cost_micro_usd FROM mp06_pilot_attempts WHERE attempt_ref = ?",
          input.attemptRef,
        )
        .toArray()[0];
      if (existing) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      if (session.in_flight >= MP06_PILOT_MAX_CONCURRENCY) {
        return { accepted: false, code: "CONCURRENCY_BUSY" };
      }
      if (
        session.provider_attempts >= MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION
      ) {
        sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'PROVIDER_ATTEMPT_LIMIT_REACHED' WHERE id = 1",
        );
        return { accepted: false, code: "ATTEMPT_LIMIT_REACHED" };
      }
      if (
        session.budget_consumed_micro_usd +
          session.budget_reserved_micro_usd +
          input.upperBoundCostMicroUsd >
        MP06_PILOT_BUDGET_MICRO_USD
      ) {
        sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'PROVIDER_BUDGET_LIMIT_REACHED' WHERE id = 1",
        );
        return { accepted: false, code: "BUDGET_LIMIT_REACHED" };
      }
      sql.exec(
        "INSERT INTO mp06_pilot_attempts VALUES (?, ?, ?, 'RESERVED', ?, NULL, ?, ?, NULL)",
        input.sessionRef,
        input.eventRef,
        input.attemptRef,
        input.upperBoundCostMicroUsd,
        input.now,
        input.now + MP06_PILOT_ATTEMPT_LEASE_MS,
      );
      sql.exec(
        "UPDATE mp06_pilot_session SET provider_attempts = provider_attempts + 1, budget_reserved_micro_usd = budget_reserved_micro_usd + ?, in_flight = in_flight + 1 WHERE id = 1",
        input.upperBoundCostMicroUsd,
      );
      return { accepted: true, code: "RESERVED" };
    });
  }

  authorizeMp06PilotDispatch(
    input: Mp06PilotAttemptInput,
  ): Mp06PilotAttemptResult {
    if (!validMp06PilotAttemptInput(input)) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(input.now);
      if (!session || session.session_ref !== input.sessionRef) {
        return { accepted: false, code: "PILOT_INACTIVE" };
      }
      if (session.state === "EXPIRED") {
        return { accepted: false, code: "SESSION_EXPIRED" };
      }
      if (session.state !== "ACTIVE") {
        return { accepted: false, code: "PILOT_INACTIVE" };
      }
      const changed = this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_attempts SET state = 'DISPATCHED' WHERE session_ref = ? AND event_ref = ? AND attempt_ref = ? AND state = 'RESERVED'",
        input.sessionRef,
        input.eventRef,
        input.attemptRef,
      ).rowsWritten;
      return changed === 1
        ? { accepted: true, code: "DISPATCH_AUTHORIZED" }
        : { accepted: false, code: "ATTEMPT_INVALID_STATE" };
    });
  }

  cancelMp06PilotAttemptBeforeDispatch(
    input: Mp06PilotAttemptInput,
  ): Mp06PilotAttemptResult {
    if (!validMp06PilotAttemptInput(input)) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const attempt = this.mp06PilotAttempt(input.attemptRef);
      if (
        !attempt ||
        attempt.session_ref !== input.sessionRef ||
        attempt.event_ref !== input.eventRef ||
        attempt.state !== "RESERVED"
      ) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      this.ctx.storage.sql.exec(
        "DELETE FROM mp06_pilot_attempts WHERE attempt_ref = ?",
        input.attemptRef,
      );
      this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_session SET provider_attempts = provider_attempts - 1, budget_reserved_micro_usd = budget_reserved_micro_usd - ?, in_flight = in_flight - 1 WHERE id = 1 AND session_ref = ?",
        attempt.reserved_cost_micro_usd,
        input.sessionRef,
      );
      return { accepted: true, code: "CANCELLED_BEFORE_DISPATCH" };
    });
  }

  settleMp06PilotAttempt(
    input: SettleMp06PilotAttemptInput,
  ): Mp06PilotAttemptResult {
    if (
      !validMp06PilotAttemptInput(input) ||
      (input.outcome !== "KNOWN" && input.outcome !== "USAGE_UNKNOWN") ||
      (input.outcome === "KNOWN" && !isMp06PilotCost(input.actualCostMicroUsd))
    ) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const attempt = this.mp06PilotAttempt(input.attemptRef);
      if (
        !attempt ||
        attempt.session_ref !== input.sessionRef ||
        attempt.event_ref !== input.eventRef
      ) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      if (attempt.state === "SETTLED" || attempt.state === "USAGE_UNKNOWN") {
        return { accepted: true, code: "SETTLED_IDEMPOTENT" };
      }
      if (attempt.state !== "DISPATCHED") {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      const actualCost =
        input.outcome === "USAGE_UNKNOWN"
          ? attempt.reserved_cost_micro_usd
          : Number(input.actualCostMicroUsd);
      const usageExceededReservation =
        actualCost > attempt.reserved_cost_micro_usd;
      const finalCost = usageExceededReservation
        ? attempt.reserved_cost_micro_usd
        : actualCost;
      const finalState =
        input.outcome === "USAGE_UNKNOWN" || usageExceededReservation
          ? "USAGE_UNKNOWN"
          : "SETTLED";
      const sql = this.ctx.storage.sql;
      sql.exec(
        "UPDATE mp06_pilot_attempts SET state = ?, actual_cost_micro_usd = ?, settled_at = ? WHERE attempt_ref = ?",
        finalState,
        finalCost,
        input.now,
        input.attemptRef,
      );
      sql.exec(
        "UPDATE mp06_pilot_session SET budget_reserved_micro_usd = budget_reserved_micro_usd - ?, budget_consumed_micro_usd = budget_consumed_micro_usd + ?, in_flight = in_flight - 1 WHERE id = 1 AND session_ref = ?",
        attempt.reserved_cost_micro_usd,
        finalCost,
        input.sessionRef,
      );
      if (finalState === "USAGE_UNKNOWN") {
        sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'PROVIDER_USAGE_UNKNOWN' WHERE id = 1 AND session_ref = ?",
          input.sessionRef,
        );
      }
      return { accepted: true, code: "SETTLED" };
    });
  }

  authorizeMp06PilotResult(input: {
    readonly sessionRef: string;
    readonly eventRef: string;
    readonly now: number;
  }): boolean {
    if (
      !isMp06PilotReference(input.sessionRef) ||
      !isMp06PilotReference(input.eventRef) ||
      !isMp06PilotTimestamp(input.now)
    ) {
      return false;
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(input.now);
      if (
        !session ||
        session.session_ref !== input.sessionRef ||
        session.state !== "ACTIVE" ||
        session.in_flight !== 0
      ) {
        return false;
      }
      return (
        this.ctx.storage.sql.exec(
          "UPDATE mp06_pilot_events SET result_authorized = 1 WHERE session_ref = ? AND event_ref = ? AND result_authorized = 0",
          input.sessionRef,
          input.eventRef,
        ).rowsWritten === 1
      );
    });
  }

  stopMp06Pilot(now: number, reasonCode: string): Mp06PilotStopResult {
    if (!isMp06PilotTimestamp(now) || !/^[A-Z0-9_]{1,80}$/u.test(reasonCode)) {
      return {
        stopped: false,
        code: "PILOT_INACTIVE",
        status: this.mp06PilotStatus(now),
      };
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.mp06PilotSession();
      if (!session) {
        return {
          stopped: false,
          code: "PILOT_INACTIVE",
          status: inactivePilotStatus(),
        };
      }
      if (session.state !== "ACTIVE") {
        return {
          stopped: false,
          code: "ALREADY_STOPPED",
          status: pilotStatus(session, now),
        };
      }
      this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = ? WHERE id = 1",
        reasonCode,
      );
      return {
        stopped: true,
        code: "STOPPED",
        status: pilotStatus(this.mp06PilotSession()!, now),
      };
    });
  }

  mp06PilotStatus(now: number): Mp06PilotStatus {
    if (!isMp06PilotTimestamp(now)) return inactivePilotStatus();
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(now);
      return session ? pilotStatus(session, now) : inactivePilotStatus();
    });
  }

  private mp06PilotSession(): Mp06PilotSessionRow | undefined {
    return this.ctx.storage.sql
      .exec<Mp06PilotSessionRow>(
        "SELECT session_ref, state, started_at, expires_at, admitted_events, provider_attempts, budget_consumed_micro_usd, budget_reserved_micro_usd, in_flight, stop_reason FROM mp06_pilot_session WHERE id = 1",
      )
      .toArray()[0];
  }

  private mp06PilotAttempt(
    attemptRef: string,
  ): Mp06PilotAttemptRow | undefined {
    return this.ctx.storage.sql
      .exec<Mp06PilotAttemptRow>(
        "SELECT session_ref, event_ref, state, reserved_cost_micro_usd, actual_cost_micro_usd FROM mp06_pilot_attempts WHERE attempt_ref = ?",
        attemptRef,
      )
      .toArray()[0];
  }

  private expireOrStopUncertainMp06Pilot(
    now: number,
  ): Mp06PilotSessionRow | undefined {
    const session = this.mp06PilotSession();
    if (!session || session.state !== "ACTIVE") return session;
    if (now >= session.expires_at) {
      this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_session SET state = 'EXPIRED', stop_reason = 'SESSION_EXPIRED' WHERE id = 1",
      );
      return this.mp06PilotSession();
    }
    if (session.in_flight === 1) {
      const staleReservation = this.ctx.storage.sql
        .exec<{
          attempt_ref: string;
          reserved_cost_micro_usd: number;
        }>(
          "SELECT attempt_ref, reserved_cost_micro_usd FROM mp06_pilot_attempts WHERE state = 'RESERVED' AND lease_expires_at <= ? LIMIT 1",
          now,
        )
        .toArray()[0];
      if (staleReservation) {
        this.ctx.storage.sql.exec(
          "DELETE FROM mp06_pilot_attempts WHERE attempt_ref = ? AND state = 'RESERVED'",
          staleReservation.attempt_ref,
        );
        this.ctx.storage.sql.exec(
          "UPDATE mp06_pilot_session SET provider_attempts = provider_attempts - 1, budget_reserved_micro_usd = budget_reserved_micro_usd - ?, in_flight = in_flight - 1 WHERE id = 1",
          staleReservation.reserved_cost_micro_usd,
        );
        return this.mp06PilotSession();
      }
      const stale = this.ctx.storage.sql
        .exec<{ present: number }>(
          "SELECT 1 AS present FROM mp06_pilot_attempts WHERE state = 'DISPATCHED' AND lease_expires_at <= ? LIMIT 1",
          now,
        )
        .toArray()[0];
      if (stale) {
        this.ctx.storage.sql.exec(
          "UPDATE mp06_pilot_session SET state = 'STOPPED', stop_reason = 'IN_FLIGHT_USAGE_UNKNOWN' WHERE id = 1",
        );
        return this.mp06PilotSession();
      }
    }
    return session;
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

function validMp06PilotLimits(
  input: ActivateMp06PilotInput["limits"],
): boolean {
  return (
    input.maximumTesters === MP06_PILOT_MAX_TESTERS &&
    input.eventsPerMinute === MP06_PILOT_EVENTS_PER_MINUTE &&
    input.eventsPerHour === MP06_PILOT_EVENTS_PER_HOUR &&
    input.eventsPerSession === MP06_PILOT_EVENTS_PER_SESSION &&
    input.providerAttemptsPerSession ===
      MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION &&
    input.sessionDurationMs === MP06_PILOT_SESSION_DURATION_MS &&
    input.budgetMicroUsd === MP06_PILOT_BUDGET_MICRO_USD &&
    input.maximumConcurrency === MP06_PILOT_MAX_CONCURRENCY &&
    input.attemptLeaseMs === MP06_PILOT_ATTEMPT_LEASE_MS
  );
}

function validMp06PilotAttemptInput(input: Mp06PilotAttemptInput): boolean {
  return (
    isMp06PilotReference(input.sessionRef) &&
    isMp06PilotReference(input.eventRef) &&
    isMp06PilotReference(input.attemptRef) &&
    isMp06PilotTimestamp(input.now)
  );
}

function countMp06PilotEvents(
  sql: SqlStorage,
  sessionRef: string,
  earliest: number,
): number {
  return Number(
    sql
      .exec<{ count: number }>(
        "SELECT COUNT(*) AS count FROM mp06_pilot_events WHERE session_ref = ? AND admitted_at > ?",
        sessionRef,
        earliest,
      )
      .one().count,
  );
}

function inactivePilotStatus(): Mp06PilotStatus {
  return {
    state: "INACTIVE",
    admittedEvents: 0,
    providerAttempts: 0,
    budgetConsumedMicroUsd: 0,
    budgetReservedMicroUsd: 0,
    inFlight: 0,
  };
}

function pilotStatus(row: Mp06PilotSessionRow, now: number): Mp06PilotStatus {
  const state =
    row.state === "ACTIVE" && now >= row.expires_at ? "EXPIRED" : row.state;
  return {
    state,
    sessionRef: row.session_ref,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    admittedEvents: row.admitted_events,
    providerAttempts: row.provider_attempts,
    budgetConsumedMicroUsd: row.budget_consumed_micro_usd,
    budgetReservedMicroUsd: row.budget_reserved_micro_usd,
    inFlight: row.in_flight,
    ...(row.stop_reason ? { stopReason: row.stop_reason } : {}),
  };
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
