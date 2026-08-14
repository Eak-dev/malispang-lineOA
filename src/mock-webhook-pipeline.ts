import type { RedactedAuditLog } from "./audit-log.js";
import type { Phase1AService } from "./phase1a-service.js";
import type { MockEvent, ReplyEnvelope } from "./types.js";

export const MOCK_VALID_SIGNATURE = "mock-signature-valid";

export interface MockWebhookResult {
  readonly status: "PROCESSED" | "REJECTED" | "FAILED_CLOSED";
  readonly replies: readonly ReplyEnvelope[];
}

export class MockSignatureBoundary {
  verify(signature: string): boolean {
    return signature === MOCK_VALID_SIGNATURE;
  }
}

export class MockWebhookPipeline {
  constructor(
    private readonly signatureBoundary: MockSignatureBoundary,
    private readonly service: Phase1AService,
    private readonly auditLog: RedactedAuditLog,
  ) {}

  process(event: MockEvent, signature: string): MockWebhookResult {
    if (!this.signatureBoundary.verify(signature)) {
      this.auditLog.record({
        eventId: event.eventId,
        conversationId: event.conversationId,
        outcome: "SIGNATURE_REJECTED",
        reasonCode: "MOCK_SIGNATURE_INVALID",
      });
      return { status: "REJECTED", replies: [] };
    }

    try {
      return { status: "PROCESSED", replies: this.service.process(event) };
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "PERSISTENCE_UNAVAILABLE"
      ) {
        throw error;
      }
      this.auditLog.record({
        eventId: event.eventId,
        conversationId: event.conversationId,
        outcome: "PERSISTENCE_FAILURE",
        reasonCode: "STATE_STORE_UNAVAILABLE",
      });
      return { status: "FAILED_CLOSED", replies: [] };
    }
  }
}
