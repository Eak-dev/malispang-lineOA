import { createHash } from "node:crypto";

export type AuditOutcome =
  | "DUPLICATE_IGNORED"
  | "FAQ_ANSWERED"
  | "SAFE_FALLBACK"
  | "HANDOFF_STARTED"
  | "HANDOFF_SILENCE"
  | "HANDOFF_CLOSE_DENIED"
  | "HANDOFF_CLOSED"
  | "FLEX_MENU_SENT"
  | "MOCK_NOTICE_SENT"
  | "SIGNATURE_REJECTED"
  | "PERSISTENCE_FAILURE";

export interface RedactedAuditEntry {
  readonly eventRef: string;
  readonly conversationRef: string;
  readonly outcome: AuditOutcome;
  readonly reasonCode: string;
  readonly knowledgeTrace?: {
    readonly recordId: string;
    readonly sourceReference: string;
    readonly approvedAt: string;
    readonly version: string;
    readonly checksum: string;
  };
}

export class RedactedAuditLog {
  readonly entries: RedactedAuditEntry[] = [];

  record(input: {
    eventId: string;
    conversationId: string;
    outcome: AuditOutcome;
    reasonCode: string;
    knowledgeTrace?: RedactedAuditEntry["knowledgeTrace"];
  }): void {
    const entry: RedactedAuditEntry = {
      eventRef: reference(input.eventId),
      conversationRef: reference(input.conversationId),
      outcome: input.outcome,
      reasonCode: input.reasonCode,
      ...(input.knowledgeTrace === undefined
        ? {}
        : { knowledgeTrace: input.knowledgeTrace }),
    };
    this.entries.push(entry);
  }
}

function reference(value: string): string {
  return createHash("sha256")
    .update(`malispang-test:${value}`)
    .digest("hex")
    .slice(0, 12);
}
