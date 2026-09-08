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
  type AuthorizeMp06PilotDispatchInput,
  type ExactReconcileMp06PilotUnknownUsageInput,
  type Mp06PilotActivationResult,
  type Mp06PilotAdmissionResult,
  type Mp06PilotAttemptInput,
  type Mp06PilotAttemptDiagnostics,
  type Mp06PilotAttemptResult,
  type Mp06PilotExactReconciliationTarget,
  type Mp06PilotLifecycleCheckpoint,
  type Mp06PilotLifecycleCheckpointSnapshot,
  type Mp06PilotLifecyclePhase,
  type Mp06PilotStatus,
  type Mp06PilotStopResult,
  type Mp06ProviderLifecycleDiagnostics,
  type ReactivateReconciledMp06PilotInput,
  type ResumeMp06AcceptanceInput,
  type ReconcileMp06PilotUnknownUsageInput,
  type RecordMp06PilotLifecycleCheckpointInput,
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

interface Mp06PilotLifecycleRow extends Record<string, SqlStorageValue> {
  client_request_id: string;
  provider_request_id: string | null;
  http_status: number | null;
  provider_error_type: string | null;
  provider_error_code: string | null;
  retry_after_ms: number | null;
  rate_limit_remaining_requests: number | null;
  dispatch_ms: number;
  headers_wait_ms: number | null;
  body_read_ms: number | null;
  parsing_ms: number | null;
  settlement_ms: number | null;
  outcome_code: string;
}

interface Mp06PilotLifecycleCheckpointRow extends Record<
  string,
  SqlStorageValue
> {
  sequence: number;
  phase: Mp06PilotLifecyclePhase;
  client_request_id: string;
  provider_request_id: string | null;
  http_status: number | null;
  provider_error_type: string | null;
  provider_error_code: string | null;
  retry_after_ms: number | null;
  rate_limit_remaining_requests: number | null;
  elapsed_ms: number | null;
  recorded_at: number;
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
        CREATE TABLE IF NOT EXISTS mp06_pilot_lifecycle_diagnostics (
          attempt_ref TEXT PRIMARY KEY,
          client_request_id TEXT NOT NULL,
          provider_request_id TEXT,
          http_status INTEGER,
          provider_error_type TEXT,
          provider_error_code TEXT,
          retry_after_ms INTEGER,
          rate_limit_remaining_requests INTEGER,
          dispatch_ms INTEGER NOT NULL,
          headers_wait_ms INTEGER,
          body_read_ms INTEGER,
          parsing_ms INTEGER,
          settlement_ms INTEGER,
          outcome_code TEXT NOT NULL,
          recorded_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS mp06_pilot_lifecycle_checkpoints (
          attempt_ref TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          phase TEXT NOT NULL,
          client_request_id TEXT NOT NULL,
          provider_request_id TEXT,
          http_status INTEGER,
          provider_error_type TEXT,
          provider_error_code TEXT,
          retry_after_ms INTEGER,
          rate_limit_remaining_requests INTEGER,
          elapsed_ms INTEGER,
          recorded_at INTEGER NOT NULL,
          PRIMARY KEY (attempt_ref, phase)
        );
        CREATE INDEX IF NOT EXISTS idx_mp06_pilot_checkpoint_recorded
          ON mp06_pilot_lifecycle_checkpoints(recorded_at, sequence);
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
      if (
        current &&
        (current.in_flight !== 0 || current.budget_reserved_micro_usd !== 0)
      ) {
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
      sql.exec("DELETE FROM mp06_pilot_testers");
      sql.exec("DELETE FROM mp06_pilot_session");
      sql.exec(
        "INSERT INTO mp06_pilot_session VALUES (1, ?, 'ACTIVE', ?, ?, ?, ?, ?, 0, 0, NULL)",
        input.sessionRef,
        input.now,
        input.now + input.limits.sessionDurationMs,
        current?.admitted_events ?? 0,
        current?.provider_attempts ?? 0,
        current?.budget_consumed_micro_usd ?? 0,
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

  reactivateReconciledMp06Pilot(
    input: ReactivateReconciledMp06PilotInput,
  ): Mp06PilotActivationResult {
    if (
      !isMp06PilotReference(input.sessionRef) ||
      !isMp06PilotTimestamp(input.now) ||
      !validMp06PilotLimits(input.limits)
    ) {
      return {
        activated: false,
        code: "INVALID_ACTIVATION",
        status: this.mp06PilotStatus(input.now),
      };
    }
    const current = this.mp06PilotSession();
    if (
      !current ||
      current.state !== "STOPPED" ||
      current.stop_reason !== "PROVIDER_USAGE_UNKNOWN_RECONCILED" ||
      current.admitted_events !== 2 ||
      current.provider_attempts !== 2 ||
      current.budget_consumed_micro_usd !== 25_864 ||
      current.budget_reserved_micro_usd !== 0 ||
      current.in_flight !== 0
    ) {
      return {
        activated: false,
        code: "INVALID_ACTIVATION",
        status: this.mp06PilotStatus(input.now),
      };
    }
    const testerRefs = this.ctx.storage.sql
      .exec<{ tester_ref: string }>(
        "SELECT tester_ref FROM mp06_pilot_testers WHERE session_ref = ? ORDER BY tester_ref",
        current.session_ref,
      )
      .toArray()
      .map((row) => row.tester_ref);
    if (
      testerRefs.length < 1 ||
      testerRefs.length > MP06_PILOT_MAX_TESTERS ||
      new Set(testerRefs).size !== testerRefs.length ||
      !testerRefs.every(isMp06PilotReference)
    ) {
      return {
        activated: false,
        code: "INVALID_ACTIVATION",
        status: this.mp06PilotStatus(input.now),
      };
    }
    return this.activateMp06Pilot({ ...input, testerRefs });
  }

  resumeMp06Acceptance(
    input: ResumeMp06AcceptanceInput,
  ): Mp06PilotActivationResult {
    const denied = (): Mp06PilotActivationResult => {
      const current = this.mp06PilotSession();
      return {
        activated: false,
        code: "INVALID_ACTIVATION",
        status: current
          ? pilotStatus(current, input.now)
          : inactivePilotStatus(),
      };
    };
    if (
      this.env.ENVIRONMENT !== "TEST" ||
      this.env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      this.env.MP06_PILOT_CONTROL_ENABLED !== "true" ||
      !isMp06PilotReference(input.expectedSessionRef) ||
      !isMp06PilotReference(input.operationRef) ||
      !isMp06PilotReference(input.sessionRef) ||
      input.sessionRef === input.expectedSessionRef ||
      !isMp06PilotTimestamp(input.now) ||
      !validMp06PilotLimits(input.limits)
    )
      return denied();
    try {
      return this.ctx.storage.transactionSync(() => {
        const sql = this.ctx.storage.sql;
        // TEST-only additive one-shot audit; never deleted by activation, stop or restart.
        sql.exec(`CREATE TABLE IF NOT EXISTS mp06_wp8f_activation (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        previous_session_ref TEXT NOT NULL,
        operation_ref TEXT NOT NULL,
        session_ref TEXT NOT NULL,
        activated_at INTEGER NOT NULL
      )`);
        const applied = sql
          .exec<{
            previous_session_ref: string;
            operation_ref: string;
            session_ref: string;
          }>(
            "SELECT previous_session_ref, operation_ref, session_ref FROM mp06_wp8f_activation WHERE id = 1",
          )
          .toArray()[0];
        const current = this.mp06PilotSession();
        if (applied) {
          if (
            applied.previous_session_ref !== input.expectedSessionRef ||
            applied.operation_ref !== input.operationRef ||
            applied.session_ref !== input.sessionRef ||
            current?.session_ref !== input.sessionRef
          )
            return denied();
          // A replay acknowledges the original operation, even if now stopped/expired.
          // It never changes activation time, accounting, or reopens a session.
          return {
            activated: true,
            code: "ACTIVATED_IDEMPOTENT",
            status: pilotStatus(current, input.now),
          };
        }
        if (
          !current ||
          current.session_ref !== input.expectedSessionRef ||
          current.state !== "STOPPED" ||
          current.stop_reason !== "OPERATOR_STOP" ||
          input.now < current.started_at ||
          current.admitted_events !== 3 ||
          current.provider_attempts !== 3 ||
          current.budget_consumed_micro_usd !== 27_824 ||
          current.budget_reserved_micro_usd !== 0 ||
          current.in_flight !== 0
        )
          return denied();
        const attempts = sql
          .exec<{ state: string; count: number }>(
            "SELECT state, COUNT(*) AS count FROM mp06_pilot_attempts GROUP BY state",
          )
          .toArray();
        if (
          attempts.length !== 2 ||
          attempts.find((row) => row.state === "USAGE_UNKNOWN")?.count !== 2 ||
          attempts.find((row) => row.state === "SETTLED")?.count !== 1
        )
          return denied();
        const testers = sql
          .exec<{ tester_ref: string }>(
            "SELECT tester_ref FROM mp06_pilot_testers WHERE session_ref = ?",
            current.session_ref,
          )
          .toArray();
        if (
          testers.length < 1 ||
          testers.length > MP06_PILOT_MAX_TESTERS ||
          !testers.every((row) => isMp06PilotReference(row.tester_ref))
        )
          return denied();
        sql.exec(
          "INSERT INTO mp06_wp8f_activation VALUES (1, ?, ?, ?, ?)",
          current.session_ref,
          input.operationRef,
          input.sessionRef,
          input.now,
        );
        sql.exec(
          "UPDATE mp06_pilot_testers SET session_ref = ? WHERE session_ref = ?",
          input.sessionRef,
          current.session_ref,
        );
        sql.exec(
          "UPDATE mp06_pilot_session SET session_ref = ?, state = 'ACTIVE', started_at = ?, expires_at = ?, stop_reason = NULL WHERE id = 1",
          input.sessionRef,
          input.now,
          input.now + input.limits.sessionDurationMs,
        );
        return {
          activated: true,
          code: "ACTIVATED",
          status: pilotStatus(this.mp06PilotSession()!, input.now),
        };
      });
    } catch {
      return { ...denied(), code: "ACTIVATION_STORAGE_UNAVAILABLE" };
    }
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
    input: AuthorizeMp06PilotDispatchInput,
  ): Mp06PilotAttemptResult {
    if (
      !validMp06PilotAttemptInput(input) ||
      typeof input.clientRequestId !== "string" ||
      !safeMp06PilotMetadata(input.clientRequestId)
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
      const changed = this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_attempts SET state = 'DISPATCHED' WHERE session_ref = ? AND event_ref = ? AND attempt_ref = ? AND state = 'RESERVED'",
        input.sessionRef,
        input.eventRef,
        input.attemptRef,
      ).rowsWritten;
      if (changed !== 1) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      this.insertMp06PilotLifecycleCheckpoint({
        attemptRef: input.attemptRef,
        sequence: 1,
        phase: "DISPATCH_AUTHORIZED",
        clientRequestId: input.clientRequestId,
        recordedAt: input.now,
      });
      return { accepted: true, code: "DISPATCH_AUTHORIZED" };
    });
  }

  recordMp06PilotLifecycleCheckpoint(
    input: RecordMp06PilotLifecycleCheckpointInput,
  ): Mp06PilotAttemptResult {
    if (!validMp06PilotLifecycleCheckpointInput(input)) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const attempt = this.mp06PilotAttempt(input.attemptRef);
      if (
        !attempt ||
        attempt.session_ref !== input.sessionRef ||
        attempt.event_ref !== input.eventRef ||
        (attempt.state !== "DISPATCHED" &&
          attempt.state !== "SETTLED" &&
          attempt.state !== "USAGE_UNKNOWN")
      ) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      const first = this.mp06PilotInitialCheckpoint(input.attemptRef);
      if (!first || first.client_request_id !== input.clientRequestId) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      const sequence = mp06PilotLifecycleSequence(input.phase);
      const existing = this.mp06PilotCheckpoint(input.attemptRef, input.phase);
      if (existing) {
        return { accepted: true, code: "CHECKPOINT_IDEMPOTENT" };
      }
      const latestSequence = this.mp06PilotLatestCheckpointSequence(
        input.attemptRef,
      );
      if (sequence < latestSequence) {
        return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
      }
      this.insertMp06PilotLifecycleCheckpoint({
        attemptRef: input.attemptRef,
        sequence,
        phase: input.phase,
        clientRequestId: input.clientRequestId,
        ...(input.providerRequestId === undefined
          ? {}
          : { providerRequestId: input.providerRequestId }),
        ...(input.httpStatus === undefined
          ? {}
          : { httpStatus: input.httpStatus }),
        ...(input.providerErrorType === undefined
          ? {}
          : { providerErrorType: input.providerErrorType }),
        ...(input.providerErrorCode === undefined
          ? {}
          : { providerErrorCode: input.providerErrorCode }),
        ...(input.retryAfterMs === undefined
          ? {}
          : { retryAfterMs: input.retryAfterMs }),
        ...(input.rateLimitRemainingRequests === undefined
          ? {}
          : { rateLimitRemainingRequests: input.rateLimitRemainingRequests }),
        ...(input.elapsedMs === undefined
          ? {}
          : { elapsedMs: input.elapsedMs }),
        recordedAt: input.now,
      });
      return { accepted: true, code: "CHECKPOINT_RECORDED" };
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
      (input.outcome === "KNOWN" &&
        !isMp06PilotCost(input.actualCostMicroUsd)) ||
      (input.diagnostics !== undefined &&
        !validMp06ProviderLifecycleDiagnostics(input.diagnostics))
    ) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    const terminalAttempt = this.mp06PilotAttempt(input.attemptRef);
    if (
      terminalAttempt?.session_ref === input.sessionRef &&
      terminalAttempt.event_ref === input.eventRef &&
      (terminalAttempt.state === "SETTLED" ||
        terminalAttempt.state === "USAGE_UNKNOWN")
    ) {
      // A late provider completion is an accounting and evidence no-op. In
      // particular, it cannot mutate a later session or authorize a reply.
      return { accepted: true, code: "SETTLED_IDEMPOTENT" };
    }
    if (
      input.diagnostics &&
      !this.recordMp06PilotSettlementStartedCheckpoint(
        input,
        input.diagnostics.clientRequestId,
      )
    ) {
      return { accepted: false, code: "ATTEMPT_INVALID_STATE" };
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
      if (input.diagnostics) {
        this.recordMp06ProviderLifecycleDiagnostics(
          input.attemptRef,
          input.diagnostics,
          input.now,
        );
      }
      if (attempt.state === "SETTLED" || attempt.state === "USAGE_UNKNOWN") {
        this.recordMp06PilotSettlementSucceededCheckpoint(
          input.attemptRef,
          input.now,
          input.diagnostics?.settlementMs,
        );
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
      this.recordMp06PilotSettlementSucceededCheckpoint(
        input.attemptRef,
        input.now,
        input.diagnostics?.settlementMs,
      );
      return { accepted: true, code: "SETTLED" };
    });
  }

  mp06PilotAttemptDiagnostics(now: number): Mp06PilotAttemptDiagnostics {
    if (!isMp06PilotTimestamp(now)) return inactiveAttemptDiagnostics();
    return this.ctx.storage.transactionSync(() => {
      const session = this.expireOrStopUncertainMp06Pilot(now);
      if (!session) return inactiveAttemptDiagnostics();
      const counts = this.ctx.storage.sql
        .exec<{
          total_attempts: number;
          reserved_attempts: number;
          dispatched_attempts: number;
          settled_attempts: number;
          usage_unknown_attempts: number;
          stale_dispatched_attempts: number;
        }>(
          `SELECT
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN state = 'RESERVED' THEN 1 ELSE 0 END) AS reserved_attempts,
            SUM(CASE WHEN state = 'DISPATCHED' THEN 1 ELSE 0 END) AS dispatched_attempts,
            SUM(CASE WHEN state = 'SETTLED' THEN 1 ELSE 0 END) AS settled_attempts,
            SUM(CASE WHEN state = 'USAGE_UNKNOWN' THEN 1 ELSE 0 END) AS usage_unknown_attempts,
            SUM(CASE WHEN state = 'DISPATCHED' AND lease_expires_at <= ? THEN 1 ELSE 0 END) AS stale_dispatched_attempts
          FROM mp06_pilot_attempts`,
          now,
        )
        .one();
      const latest = this.ctx.storage.sql
        .exec<Mp06PilotLifecycleRow>(
          `SELECT client_request_id, provider_request_id, http_status,
            provider_error_type, provider_error_code, retry_after_ms,
            rate_limit_remaining_requests, dispatch_ms, headers_wait_ms,
            body_read_ms, parsing_ms, settlement_ms, outcome_code
          FROM mp06_pilot_lifecycle_diagnostics
          ORDER BY rowid DESC LIMIT 1`,
        )
        .toArray()[0];
      const checkpointCount = Number(
        this.ctx.storage.sql
          .exec<{ count: number }>(
            "SELECT COUNT(*) AS count FROM mp06_pilot_lifecycle_checkpoints",
          )
          .one().count,
      );
      const latestCheckpoint = this.ctx.storage.sql
        .exec<Mp06PilotLifecycleCheckpointRow>(
          `SELECT sequence, phase, client_request_id, provider_request_id,
            http_status, provider_error_type, provider_error_code,
            retry_after_ms, rate_limit_remaining_requests, elapsed_ms,
            recorded_at
          FROM mp06_pilot_lifecycle_checkpoints
          ORDER BY rowid DESC LIMIT 1`,
        )
        .toArray()[0];
      return {
        sessionState: pilotStatus(session, now).state,
        ...(session.stop_reason ? { stopReason: session.stop_reason } : {}),
        totalAttempts: Number(counts.total_attempts),
        reservedAttempts: Number(counts.reserved_attempts),
        dispatchedAttempts: Number(counts.dispatched_attempts),
        settledAttempts: Number(counts.settled_attempts),
        usageUnknownAttempts: Number(counts.usage_unknown_attempts),
        staleDispatchedAttempts: Number(counts.stale_dispatched_attempts),
        budgetConsumedMicroUsd: session.budget_consumed_micro_usd,
        budgetReservedMicroUsd: session.budget_reserved_micro_usd,
        inFlight: session.in_flight,
        ...(latest ? { latestLifecycle: lifecycleDiagnostics(latest) } : {}),
        checkpointCount,
        ...(latestCheckpoint
          ? { latestCheckpoint: lifecycleCheckpoint(latestCheckpoint) }
          : {}),
      };
    });
  }

  mp06PilotLifecycleCheckpointSnapshot(): Mp06PilotLifecycleCheckpointSnapshot {
    const checkpoints = this.ctx.storage.sql
      .exec<Mp06PilotLifecycleCheckpointRow>(
        `SELECT sequence, phase, client_request_id, provider_request_id,
          http_status, provider_error_type, provider_error_code,
          retry_after_ms, rate_limit_remaining_requests, elapsed_ms,
          recorded_at
        FROM mp06_pilot_lifecycle_checkpoints
        ORDER BY rowid ASC`,
      )
      .toArray()
      .map(lifecycleCheckpoint);
    return { checkpointCount: checkpoints.length, checkpoints };
  }

  async mp06PilotExactReconciliationTarget(
    now: number,
  ): Promise<Mp06PilotExactReconciliationTarget> {
    if (!isMp06PilotTimestamp(now)) {
      return { eligible: false, code: "EXACT_TARGET_UNAVAILABLE" };
    }
    const session = this.mp06PilotSession();
    if (!session) {
      return { eligible: false, code: "EXACT_TARGET_UNAVAILABLE" };
    }
    const initialState =
      session.state === "STOPPED" &&
      session.stop_reason === "IN_FLIGHT_USAGE_UNKNOWN" &&
      session.admitted_events === 2 &&
      session.provider_attempts === 2 &&
      session.budget_consumed_micro_usd === 12_932 &&
      session.budget_reserved_micro_usd === 12_932 &&
      session.in_flight === 1;
    const reconciledState =
      session.state === "STOPPED" &&
      session.stop_reason === "PROVIDER_USAGE_UNKNOWN_RECONCILED" &&
      session.admitted_events === 2 &&
      session.provider_attempts === 2 &&
      session.budget_consumed_micro_usd === 25_864 &&
      session.budget_reserved_micro_usd === 0 &&
      session.in_flight === 0;
    if (!initialState && !reconciledState) {
      return { eligible: false, code: "EXACT_TARGET_UNAVAILABLE" };
    }
    const attempt = this.ctx.storage.sql
      .exec<{ attempt_ref: string }>(
        initialState
          ? "SELECT attempt_ref FROM mp06_pilot_attempts WHERE session_ref = ? AND state = 'DISPATCHED' AND lease_expires_at <= ?"
          : "SELECT attempt_ref FROM mp06_pilot_attempts WHERE session_ref = ? AND state = 'USAGE_UNKNOWN'",
        session.session_ref,
        ...(initialState ? [now] : []),
      )
      .toArray();
    if (attempt.length !== 1 || !attempt[0]) {
      return { eligible: false, code: "EXACT_TARGET_UNAVAILABLE" };
    }
    return {
      eligible: true,
      code: initialState
        ? "EXACT_TARGET_READY"
        : "EXACT_TARGET_ALREADY_RECONCILED",
      sessionRef: session.session_ref,
      attemptTargetRef: await mp06PilotReconciliationTargetReference(
        session.session_ref,
        attempt[0].attempt_ref,
      ),
    };
  }

  async reconcileExactMp06PilotUnknownUsage(
    input: ExactReconcileMp06PilotUnknownUsageInput,
  ): Promise<Mp06PilotAttemptResult> {
    if (!validExactMp06ReconciliationInput(input)) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    const session = this.mp06PilotSession();
    if (!session || session.session_ref !== input.expectedSessionRef) {
      return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
    }
    const initialState =
      session.state === input.expectedState &&
      session.stop_reason === input.expectedStopReason &&
      session.admitted_events === input.expectedAdmittedEvents &&
      session.provider_attempts === input.expectedProviderAttempts &&
      session.budget_consumed_micro_usd ===
        input.expectedBudgetConsumedMicroUsd &&
      session.budget_reserved_micro_usd ===
        input.expectedBudgetReservedMicroUsd &&
      session.in_flight === input.expectedInFlight;
    const reconciledState =
      session.state === "STOPPED" &&
      session.stop_reason === "PROVIDER_USAGE_UNKNOWN_RECONCILED" &&
      session.admitted_events === 2 &&
      session.provider_attempts === 2 &&
      session.budget_consumed_micro_usd === 25_864 &&
      session.budget_reserved_micro_usd === 0 &&
      session.in_flight === 0;
    if (!initialState && !reconciledState) {
      return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
    }
    const attempt = this.ctx.storage.sql
      .exec<{ attempt_ref: string; reserved_cost_micro_usd: number }>(
        initialState
          ? "SELECT attempt_ref, reserved_cost_micro_usd FROM mp06_pilot_attempts WHERE session_ref = ? AND state = 'DISPATCHED' AND lease_expires_at <= ?"
          : "SELECT attempt_ref, reserved_cost_micro_usd FROM mp06_pilot_attempts WHERE session_ref = ? AND state = 'USAGE_UNKNOWN'",
        session.session_ref,
        ...(initialState ? [input.now] : []),
      )
      .toArray();
    if (
      attempt.length !== 1 ||
      !attempt[0] ||
      attempt[0].reserved_cost_micro_usd !== 12_932 ||
      (await mp06PilotReconciliationTargetReference(
        session.session_ref,
        attempt[0].attempt_ref,
      )) !== input.expectedAttemptTargetRef
    ) {
      return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
    }
    if (reconciledState) {
      return { accepted: true, code: "RECONCILED_EXACT_IDEMPOTENT" };
    }
    const exactAttemptRef = attempt[0].attempt_ref;
    try {
      return this.ctx.storage.transactionSync(() => {
        const current = this.mp06PilotSession();
        const currentAttempt = this.mp06PilotAttempt(exactAttemptRef);
        if (
          current?.session_ref === input.expectedSessionRef &&
          current.state === "STOPPED" &&
          current.stop_reason === "PROVIDER_USAGE_UNKNOWN_RECONCILED" &&
          current.admitted_events === 2 &&
          current.provider_attempts === 2 &&
          current.budget_consumed_micro_usd === 25_864 &&
          current.budget_reserved_micro_usd === 0 &&
          current.in_flight === 0 &&
          currentAttempt?.session_ref === input.expectedSessionRef &&
          currentAttempt.state === "USAGE_UNKNOWN"
        ) {
          return { accepted: true, code: "RECONCILED_EXACT_IDEMPOTENT" };
        }
        if (
          !current ||
          current.session_ref !== input.expectedSessionRef ||
          current.state !== input.expectedState ||
          current.stop_reason !== input.expectedStopReason ||
          current.admitted_events !== input.expectedAdmittedEvents ||
          current.provider_attempts !== input.expectedProviderAttempts ||
          current.budget_consumed_micro_usd !==
            input.expectedBudgetConsumedMicroUsd ||
          current.budget_reserved_micro_usd !==
            input.expectedBudgetReservedMicroUsd ||
          current.in_flight !== input.expectedInFlight ||
          !currentAttempt ||
          currentAttempt.session_ref !== input.expectedSessionRef ||
          currentAttempt.state !== "DISPATCHED" ||
          currentAttempt.reserved_cost_micro_usd !== 12_932
        ) {
          return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
        }
        const attemptChanged = this.ctx.storage.sql.exec(
          "UPDATE mp06_pilot_attempts SET state = 'USAGE_UNKNOWN', actual_cost_micro_usd = NULL, settled_at = ? WHERE attempt_ref = ? AND session_ref = ? AND state = 'DISPATCHED'",
          input.now,
          exactAttemptRef,
          input.expectedSessionRef,
        ).rowsWritten;
        const sessionChanged = this.ctx.storage.sql.exec(
          "UPDATE mp06_pilot_session SET budget_reserved_micro_usd = 0, budget_consumed_micro_usd = 25864, in_flight = 0, stop_reason = 'PROVIDER_USAGE_UNKNOWN_RECONCILED' WHERE id = 1 AND session_ref = ? AND state = 'STOPPED' AND stop_reason = 'IN_FLIGHT_USAGE_UNKNOWN' AND admitted_events = 2 AND provider_attempts = 2 AND budget_consumed_micro_usd = 12932 AND budget_reserved_micro_usd = 12932 AND in_flight = 1",
          input.expectedSessionRef,
        ).rowsWritten;
        if (attemptChanged !== 1 || sessionChanged !== 1) {
          throw new Error("EXACT_RECONCILIATION_CONFLICT");
        }
        return {
          accepted: true,
          code: "RECONCILED_EXACT_USAGE_UNKNOWN",
        };
      });
    } catch {
      return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
    }
  }

  reconcileMp06PilotUnknownUsage(
    input: ReconcileMp06PilotUnknownUsageInput,
  ): Mp06PilotAttemptResult {
    if (!validMp06ReconciliationInput(input)) {
      return { accepted: false, code: "CONTROL_UNAVAILABLE" };
    }
    return this.ctx.storage.transactionSync(() => {
      const session = this.mp06PilotSession();
      if (!session) {
        return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
      }
      const alreadyReconciled = this.ctx.storage.sql
        .exec<{ count: number }>(
          "SELECT COUNT(*) AS count FROM mp06_pilot_attempts WHERE state = 'USAGE_UNKNOWN'",
        )
        .one().count;
      if (
        session.state === "STOPPED" &&
        session.stop_reason === "PROVIDER_USAGE_UNKNOWN_RECONCILED" &&
        session.in_flight === 0 &&
        session.budget_reserved_micro_usd === 0 &&
        session.budget_consumed_micro_usd ===
          input.expectedBudgetReservedMicroUsd &&
        Number(alreadyReconciled) === 1
      ) {
        return { accepted: true, code: "RECONCILED_IDEMPOTENT" };
      }
      if (
        session.state !== input.expectedState ||
        session.stop_reason !== input.expectedStopReason ||
        session.admitted_events !== input.expectedAdmittedEvents ||
        session.provider_attempts !== input.expectedProviderAttempts ||
        session.budget_consumed_micro_usd !==
          input.expectedBudgetConsumedMicroUsd ||
        session.budget_reserved_micro_usd !==
          input.expectedBudgetReservedMicroUsd ||
        session.in_flight !== input.expectedInFlight
      ) {
        return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
      }
      const attempts = this.ctx.storage.sql
        .exec<{
          attempt_ref: string;
          reserved_cost_micro_usd: number;
        }>(
          "SELECT attempt_ref, reserved_cost_micro_usd FROM mp06_pilot_attempts WHERE state = 'DISPATCHED' AND lease_expires_at <= ?",
          input.now,
        )
        .toArray();
      if (
        attempts.length !== 1 ||
        attempts[0]?.reserved_cost_micro_usd !==
          input.expectedBudgetReservedMicroUsd
      ) {
        return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
      }
      const attempt = attempts[0];
      const changed = this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_attempts SET state = 'USAGE_UNKNOWN', actual_cost_micro_usd = reserved_cost_micro_usd, settled_at = ? WHERE attempt_ref = ? AND state = 'DISPATCHED'",
        input.now,
        attempt.attempt_ref,
      ).rowsWritten;
      if (changed !== 1) {
        return { accepted: false, code: "RECONCILIATION_NOT_ALLOWED" };
      }
      this.ctx.storage.sql.exec(
        "UPDATE mp06_pilot_session SET budget_reserved_micro_usd = budget_reserved_micro_usd - ?, budget_consumed_micro_usd = budget_consumed_micro_usd + ?, in_flight = in_flight - 1, stop_reason = 'PROVIDER_USAGE_UNKNOWN_RECONCILED' WHERE id = 1 AND state = 'STOPPED' AND in_flight = 1",
        attempt.reserved_cost_micro_usd,
        attempt.reserved_cost_micro_usd,
      );
      return { accepted: true, code: "RECONCILED_USAGE_UNKNOWN" };
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

  private mp06PilotInitialCheckpoint(
    attemptRef: string,
  ): Mp06PilotLifecycleCheckpointRow | undefined {
    return this.ctx.storage.sql
      .exec<Mp06PilotLifecycleCheckpointRow>(
        `SELECT sequence, phase, client_request_id, provider_request_id,
          http_status, provider_error_type, provider_error_code,
          retry_after_ms, rate_limit_remaining_requests, elapsed_ms,
          recorded_at
        FROM mp06_pilot_lifecycle_checkpoints
        WHERE attempt_ref = ? AND phase = 'DISPATCH_AUTHORIZED'`,
        attemptRef,
      )
      .toArray()[0];
  }

  private mp06PilotCheckpoint(
    attemptRef: string,
    phase: Mp06PilotLifecyclePhase,
  ): Mp06PilotLifecycleCheckpointRow | undefined {
    return this.ctx.storage.sql
      .exec<Mp06PilotLifecycleCheckpointRow>(
        `SELECT sequence, phase, client_request_id, provider_request_id,
          http_status, provider_error_type, provider_error_code,
          retry_after_ms, rate_limit_remaining_requests, elapsed_ms,
          recorded_at
        FROM mp06_pilot_lifecycle_checkpoints
        WHERE attempt_ref = ? AND phase = ?`,
        attemptRef,
        phase,
      )
      .toArray()[0];
  }

  private mp06PilotLatestCheckpointSequence(attemptRef: string): number {
    return Number(
      this.ctx.storage.sql
        .exec<{ sequence: number | null }>(
          "SELECT MAX(sequence) AS sequence FROM mp06_pilot_lifecycle_checkpoints WHERE attempt_ref = ?",
          attemptRef,
        )
        .one().sequence ?? 0,
    );
  }

  private insertMp06PilotLifecycleCheckpoint(input: {
    readonly attemptRef: string;
    readonly sequence: number;
    readonly phase: Mp06PilotLifecyclePhase;
    readonly clientRequestId: string;
    readonly providerRequestId?: string;
    readonly httpStatus?: number;
    readonly providerErrorType?: string;
    readonly providerErrorCode?: string;
    readonly retryAfterMs?: number;
    readonly rateLimitRemainingRequests?: number;
    readonly elapsedMs?: number;
    readonly recordedAt: number;
  }): void {
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO mp06_pilot_lifecycle_checkpoints (
        attempt_ref, sequence, phase, client_request_id, provider_request_id,
        http_status, provider_error_type, provider_error_code, retry_after_ms,
        rate_limit_remaining_requests, elapsed_ms, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.attemptRef,
      input.sequence,
      input.phase,
      input.clientRequestId,
      input.providerRequestId ?? null,
      input.httpStatus ?? null,
      input.providerErrorType ?? null,
      input.providerErrorCode ?? null,
      input.retryAfterMs ?? null,
      input.rateLimitRemainingRequests ?? null,
      input.elapsedMs ?? null,
      input.recordedAt,
    );
  }

  private recordMp06PilotSettlementSucceededCheckpoint(
    attemptRef: string,
    now: number,
    elapsedMs?: number,
  ): void {
    const initial = this.mp06PilotInitialCheckpoint(attemptRef);
    if (!initial) return;
    this.insertMp06PilotLifecycleCheckpoint({
      attemptRef,
      sequence: mp06PilotLifecycleSequence("SETTLEMENT_SUCCEEDED"),
      phase: "SETTLEMENT_SUCCEEDED",
      clientRequestId: initial.client_request_id,
      ...(elapsedMs === undefined ? {} : { elapsedMs }),
      recordedAt: now,
    });
  }

  private recordMp06PilotSettlementStartedCheckpoint(
    input: SettleMp06PilotAttemptInput,
    clientRequestId: string,
  ): boolean {
    return this.ctx.storage.transactionSync(() => {
      const attempt = this.mp06PilotAttempt(input.attemptRef);
      const initial = this.mp06PilotInitialCheckpoint(input.attemptRef);
      if (
        !attempt ||
        attempt.session_ref !== input.sessionRef ||
        attempt.event_ref !== input.eventRef ||
        (attempt.state !== "DISPATCHED" &&
          attempt.state !== "SETTLED" &&
          attempt.state !== "USAGE_UNKNOWN") ||
        !initial ||
        initial.client_request_id !== clientRequestId
      ) {
        return false;
      }
      this.insertMp06PilotLifecycleCheckpoint({
        attemptRef: input.attemptRef,
        sequence: mp06PilotLifecycleSequence("SETTLEMENT_STARTED"),
        phase: "SETTLEMENT_STARTED",
        clientRequestId,
        recordedAt: input.now,
      });
      return true;
    });
  }

  private recordMp06ProviderLifecycleDiagnostics(
    attemptRef: string,
    diagnostics: Mp06ProviderLifecycleDiagnostics,
    recordedAt: number,
  ): void {
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO mp06_pilot_lifecycle_diagnostics (
        attempt_ref, client_request_id, provider_request_id, http_status,
        provider_error_type, provider_error_code, retry_after_ms,
        rate_limit_remaining_requests, dispatch_ms, headers_wait_ms,
        body_read_ms, parsing_ms, settlement_ms, outcome_code, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      attemptRef,
      diagnostics.clientRequestId,
      diagnostics.providerRequestId ?? null,
      diagnostics.httpStatus ?? null,
      diagnostics.providerErrorType ?? null,
      diagnostics.providerErrorCode ?? null,
      diagnostics.retryAfterMs ?? null,
      diagnostics.rateLimitRemainingRequests ?? null,
      diagnostics.dispatchMs,
      diagnostics.headersWaitMs ?? null,
      diagnostics.bodyReadMs ?? null,
      diagnostics.parsingMs ?? null,
      diagnostics.settlementMs ?? null,
      diagnostics.outcomeCode,
      recordedAt,
    );
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

function validMp06ProviderLifecycleDiagnostics(
  value: Mp06ProviderLifecycleDiagnostics,
): boolean {
  const safeOptionalInteger = (input: number | undefined): boolean =>
    input === undefined || (Number.isSafeInteger(input) && input >= 0);
  return (
    safeMp06PilotMetadata(value.clientRequestId) &&
    value.clientRequestId.length > 0 &&
    safeMp06PilotMetadata(value.providerRequestId) &&
    safeMp06PilotMetadata(value.providerErrorType) &&
    safeMp06PilotMetadata(value.providerErrorCode) &&
    safeMp06PilotMetadata(value.outcomeCode) &&
    value.outcomeCode.length > 0 &&
    safeOptionalInteger(value.httpStatus) &&
    safeOptionalInteger(value.retryAfterMs) &&
    safeOptionalInteger(value.rateLimitRemainingRequests) &&
    safeOptionalInteger(value.dispatchMs) &&
    safeOptionalInteger(value.headersWaitMs) &&
    safeOptionalInteger(value.bodyReadMs) &&
    safeOptionalInteger(value.parsingMs) &&
    safeOptionalInteger(value.settlementMs)
  );
}

function safeMp06PilotMetadata(input: string | undefined): boolean {
  return input === undefined || /^[A-Za-z0-9_.:-]{1,128}$/u.test(input);
}

function validMp06PilotLifecycleCheckpointInput(
  input: RecordMp06PilotLifecycleCheckpointInput,
): boolean {
  const safeOptionalInteger = (value: number | undefined): boolean =>
    value === undefined || (Number.isSafeInteger(value) && value >= 0);
  return (
    validMp06PilotAttemptInput(input) &&
    typeof input.clientRequestId === "string" &&
    safeMp06PilotMetadata(input.clientRequestId) &&
    mp06PilotLifecycleSequence(input.phase) > 1 &&
    (input.providerRequestId === undefined ||
      safeMp06PilotMetadata(input.providerRequestId)) &&
    (input.providerErrorType === undefined ||
      safeMp06PilotMetadata(input.providerErrorType)) &&
    (input.providerErrorCode === undefined ||
      safeMp06PilotMetadata(input.providerErrorCode)) &&
    safeOptionalInteger(input.httpStatus) &&
    safeOptionalInteger(input.retryAfterMs) &&
    safeOptionalInteger(input.rateLimitRemainingRequests) &&
    safeOptionalInteger(input.elapsedMs)
  );
}

function mp06PilotLifecycleSequence(phase: Mp06PilotLifecyclePhase): number {
  switch (phase) {
    case "DISPATCH_AUTHORIZED":
      return 1;
    case "OUTBOUND_FETCH_STARTING":
      return 2;
    case "FETCH_PROMISE_CREATED":
      return 3;
    case "RESPONSE_HEADERS_RECEIVED":
      return 4;
    case "RESPONSE_BODY_READ":
      return 5;
    case "RESPONSE_PARSED":
      return 6;
    case "SETTLEMENT_STARTED":
      return 7;
    case "SETTLEMENT_SUCCEEDED":
      return 8;
  }
}

function lifecycleCheckpoint(
  row: Mp06PilotLifecycleCheckpointRow,
): Mp06PilotLifecycleCheckpoint {
  return {
    sequence: row.sequence,
    phase: row.phase,
    clientRequestId: row.client_request_id,
    ...(row.provider_request_id
      ? { providerRequestId: row.provider_request_id }
      : {}),
    ...(row.http_status === null ? {} : { httpStatus: row.http_status }),
    ...(row.provider_error_type
      ? { providerErrorType: row.provider_error_type }
      : {}),
    ...(row.provider_error_code
      ? { providerErrorCode: row.provider_error_code }
      : {}),
    ...(row.retry_after_ms === null
      ? {}
      : { retryAfterMs: row.retry_after_ms }),
    ...(row.rate_limit_remaining_requests === null
      ? {}
      : { rateLimitRemainingRequests: row.rate_limit_remaining_requests }),
    ...(row.elapsed_ms === null ? {} : { elapsedMs: row.elapsed_ms }),
    recordedAt: row.recorded_at,
  };
}

function validMp06ReconciliationInput(
  input: ReconcileMp06PilotUnknownUsageInput,
): boolean {
  return (
    isMp06PilotTimestamp(input.now) &&
    input.expectedState === "STOPPED" &&
    input.expectedStopReason === "IN_FLIGHT_USAGE_UNKNOWN" &&
    input.expectedAdmittedEvents === 1 &&
    input.expectedProviderAttempts === 1 &&
    input.expectedBudgetConsumedMicroUsd === 0 &&
    input.expectedBudgetReservedMicroUsd === 12_932 &&
    input.expectedInFlight === 1 &&
    input.disposition === "CONSUME_FULL_RESERVATION_NO_REFUND"
  );
}

function validExactMp06ReconciliationInput(
  input: ExactReconcileMp06PilotUnknownUsageInput,
): boolean {
  return (
    isMp06PilotTimestamp(input.now) &&
    isMp06PilotReference(input.expectedSessionRef) &&
    isMp06PilotReference(input.expectedAttemptTargetRef) &&
    input.expectedState === "STOPPED" &&
    input.expectedStopReason === "IN_FLIGHT_USAGE_UNKNOWN" &&
    input.expectedAdmittedEvents === 2 &&
    input.expectedProviderAttempts === 2 &&
    input.expectedBudgetConsumedMicroUsd === 12_932 &&
    input.expectedBudgetReservedMicroUsd === 12_932 &&
    input.expectedInFlight === 1 &&
    input.disposition === "CONSUME_FULL_RESERVATION_NO_REFUND"
  );
}

async function mp06PilotReconciliationTargetReference(
  sessionRef: string,
  attemptRef: string,
): Promise<string> {
  const data = new TextEncoder().encode(
    `mp06-exact-reconciliation-target-v1:${sessionRef}:${attemptRef}`,
  );
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function lifecycleDiagnostics(
  row: Mp06PilotLifecycleRow,
): Mp06ProviderLifecycleDiagnostics {
  return {
    clientRequestId: row.client_request_id,
    ...(row.provider_request_id
      ? { providerRequestId: row.provider_request_id }
      : {}),
    ...(row.http_status === null ? {} : { httpStatus: row.http_status }),
    ...(row.provider_error_type
      ? { providerErrorType: row.provider_error_type }
      : {}),
    ...(row.provider_error_code
      ? { providerErrorCode: row.provider_error_code }
      : {}),
    ...(row.retry_after_ms === null
      ? {}
      : { retryAfterMs: row.retry_after_ms }),
    ...(row.rate_limit_remaining_requests === null
      ? {}
      : { rateLimitRemainingRequests: row.rate_limit_remaining_requests }),
    dispatchMs: row.dispatch_ms,
    ...(row.headers_wait_ms === null
      ? {}
      : { headersWaitMs: row.headers_wait_ms }),
    ...(row.body_read_ms === null ? {} : { bodyReadMs: row.body_read_ms }),
    ...(row.parsing_ms === null ? {} : { parsingMs: row.parsing_ms }),
    ...(row.settlement_ms === null ? {} : { settlementMs: row.settlement_ms }),
    outcomeCode: row.outcome_code,
  };
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

function inactiveAttemptDiagnostics(): Mp06PilotAttemptDiagnostics {
  return {
    sessionState: "INACTIVE",
    totalAttempts: 0,
    reservedAttempts: 0,
    dispatchedAttempts: 0,
    settledAttempts: 0,
    usageUnknownAttempts: 0,
    staleDispatchedAttempts: 0,
    budgetConsumedMicroUsd: 0,
    budgetReservedMicroUsd: 0,
    inFlight: 0,
    checkpointCount: 0,
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
