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

/** Explicit TEST-only lifecycle; this is a release-control marker, not remote discovery. */
export interface TestKnowledgeValidity {
  readonly validUntil: "PRODUCTION_RELEASE";
  readonly environment: "TEST";
  readonly accountName: "มะลิปัง TEST";
  readonly releaseStatus: "PRE_RELEASE" | "RELEASED" | "UNKNOWN";
  readonly ownerDecision: "MP-OD-2026-09-30-V46";
  readonly productionApprovalRequired: true;
}

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
  readonly effectiveTo: string | null;
  readonly freshness: {
    readonly reviewAt: string | null;
    readonly maximumAgeDays: number | null;
  };
  readonly version: string;
  readonly checksum: string;
  readonly testValidity?: TestKnowledgeValidity;
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
  if (record.testValidity !== undefined) {
    return (
      isPreReleaseTestRecord(record) &&
      Number.isFinite(start) &&
      start <= timestamp
    );
  }
  const end =
    record.effectiveTo === null ? Number.NaN : Date.parse(record.effectiveTo);
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
  const reviewAt =
    record.freshness.reviewAt === null
      ? Number.NaN
      : Date.parse(record.freshness.reviewAt);
  const age = record.freshness.maximumAgeDays;
  const fresh =
    record.testValidity !== undefined
      ? isPreReleaseTestRecord(record)
      : Number.isFinite(reviewAt) &&
        timestamp < reviewAt &&
        typeof age === "number" &&
        Number.isSafeInteger(age) &&
        age > 0 &&
        timestamp < approvedAt + age * 24 * 60 * 60 * 1_000;
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
    fresh
  );
}

function isPreReleaseTestRecord(record: ApprovedFaqRecord): boolean {
  const validity = record.testValidity;
  return (
    validity !== undefined &&
    validity !== null &&
    validity.validUntil === "PRODUCTION_RELEASE" &&
    validity.environment === "TEST" &&
    validity.accountName === "มะลิปัง TEST" &&
    validity.releaseStatus === "PRE_RELEASE" &&
    validity.ownerDecision === "MP-OD-2026-09-30-V46" &&
    validity.productionApprovalRequired === true &&
    record.effectiveTo === null &&
    record.freshness.reviewAt === null &&
    record.freshness.maximumAgeDays === null
  );
}
