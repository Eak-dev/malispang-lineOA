import {
  detectConversationIntent,
  normalizeConversationText,
  type ConversationIntent,
} from "./conversation-intents.js";

export const FAQ_INTENTS = [
  "MENU",
  "PRICE",
  "LOCATION",
  "OPENING_HOURS",
  "CONTACT",
  "PICKUP",
  "STORAGE",
  "ALLERGEN",
  "WHOLESALE",
  "ADVANCE_ORDER",
  "DELIVERY",
  "PROMOTION",
  "LOYALTY",
  "STOCK",
] as const;

export type FaqIntent = (typeof FAQ_INTENTS)[number];

export interface ApprovedFaqRecord {
  readonly id: string;
  readonly intent: FaqIntent;
  readonly keywords: readonly string[];
  readonly answer: string;
  readonly status: "APPROVED" | "DRAFT" | "REVOKED";
  readonly source: {
    readonly classification: "OWNER_APPROVED_REPOSITORY_RECORD";
    readonly reference: string;
  };
  readonly owner: string;
  readonly approvedAt: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly freshness: {
    readonly reviewAt: string;
    readonly maximumAgeDays: number;
  };
  readonly version: string;
  readonly checksum: string;
}

export interface FaqProvenance {
  readonly recordId: string;
  readonly sourceReference: string;
  readonly owner: string;
  readonly approvedAt: string;
  readonly version: string;
  readonly checksum: string;
}

export interface FaqLookupResult {
  readonly intent?: FaqIntent;
  readonly answer?: string;
  readonly provenance?: FaqProvenance;
  readonly status: "APPROVED" | "NO_MATCH" | "NOT_AUTHORITATIVE" | "CONFLICT";
}

export class ApprovedFaqKnowledgeBase {
  constructor(
    private readonly records: readonly ApprovedFaqRecord[] = [],
    private readonly now: () => Date = () => new Date(),
  ) {}

  lookupText(text: string): FaqLookupResult {
    const intent = faqIntentForConversationIntent(
      detectConversationIntent(text),
    );
    if (intent) return this.lookupIntent(intent);

    const normalized = normalizeConversationText(text);
    const customRecord = this.records.find((record) =>
      record.keywords.some((keyword) =>
        normalized.includes(normalizeConversationText(keyword)),
      ),
    );
    return customRecord
      ? this.lookupIntent(customRecord.intent)
      : { status: "NO_MATCH" };
  }

  lookupIntent(intent: FaqIntent): FaqLookupResult {
    const timestamp = this.now().getTime();
    if (!Number.isFinite(timestamp)) {
      return { intent, status: "NOT_AUTHORITATIVE" };
    }

    const active = this.records.filter(
      (record) =>
        record.intent === intent &&
        record.status === "APPROVED" &&
        isInsideEffectiveWindow(record, timestamp),
    );
    if (active.length > 1) return { intent, status: "CONFLICT" };

    const record = active[0];
    if (!record || !isAuthoritative(record, timestamp)) {
      return { intent, status: "NOT_AUTHORITATIVE" };
    }

    return {
      intent,
      answer: record.answer,
      provenance: {
        recordId: record.id,
        sourceReference: record.source.reference,
        owner: record.owner,
        approvedAt: record.approvedAt,
        version: record.version,
        checksum: record.checksum,
      },
      status: "APPROVED",
    };
  }
}

function faqIntentForConversationIntent(
  intent: ConversationIntent,
): FaqIntent | undefined {
  switch (intent) {
    case "MENU":
    case "PRICE":
    case "LOCATION":
    case "CONTACT":
    case "PICKUP":
    case "STORAGE":
    case "ALLERGEN":
    case "WHOLESALE":
    case "ADVANCE_ORDER":
    case "DELIVERY":
    case "PROMOTION":
    case "LOYALTY":
    case "STOCK":
      return intent;
    case "HOURS":
      return "OPENING_HOURS";
    case "LOYALTY_REDEMPTION":
      return "LOYALTY";
    default:
      return undefined;
  }
}

function isInsideEffectiveWindow(
  record: ApprovedFaqRecord,
  timestamp: number,
): boolean {
  const start = Date.parse(record.effectiveFrom);
  const end = Date.parse(record.effectiveTo);
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= timestamp &&
    timestamp < end
  );
}

function isAuthoritative(
  record: ApprovedFaqRecord,
  timestamp: number,
): boolean {
  const approvedAt = Date.parse(record.approvedAt);
  const reviewAt = Date.parse(record.freshness.reviewAt);
  const maximumAgeMs = record.freshness.maximumAgeDays * 24 * 60 * 60 * 1_000;
  return (
    record.id.trim().length > 0 &&
    record.answer.trim().length > 0 &&
    !/TEST_SEED|TEST ONLY|ทดสอบระบบ/i.test(record.answer) &&
    record.source.classification === "OWNER_APPROVED_REPOSITORY_RECORD" &&
    record.source.reference.trim().length > 0 &&
    record.owner.trim().length > 0 &&
    record.version.trim().length > 0 &&
    /^[a-f0-9]{64}$/.test(record.checksum) &&
    Number.isFinite(approvedAt) &&
    approvedAt <= timestamp &&
    Number.isFinite(reviewAt) &&
    timestamp < reviewAt &&
    Number.isSafeInteger(record.freshness.maximumAgeDays) &&
    record.freshness.maximumAgeDays > 0 &&
    timestamp < approvedAt + maximumAgeMs
  );
}
