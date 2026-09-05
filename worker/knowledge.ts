import manifestInput from "../config/approved-knowledge-base/test-knowledge-base.json" with { type: "json" };
import {
  approvedFaqRecordsFromManifest,
  parseApprovedKnowledgeManifest,
} from "../src/approved-knowledge-manifest.js";
import { ApprovedFaqKnowledgeBase, type FaqIntent } from "../src/faq.js";
import { sha256Hex } from "./mp-06-crypto.js";
import type { ReplyKind, RouteDecision } from "./routing.js";

const manifest = parseApprovedKnowledgeManifest(manifestInput);
const knowledgeBase = new ApprovedFaqKnowledgeBase(
  approvedFaqRecordsFromManifest(manifest),
);

export function enforceApprovedKnowledge(
  decision: RouteDecision,
): RouteDecision {
  const intent = intentForReplyKind(decision.replyKind);
  if (!intent) return decision;
  const record = manifest.categories[intent];
  const lookup = knowledgeBase.lookupIntent(intent);
  if (record.status === "APPROVED" && lookup.status === "APPROVED") {
    return {
      ...decision,
      reasonCode: [
        "KB_APPROVED",
        intent,
        record.source.reference,
        record.approvedAt,
        record.version,
        record.checksum,
      ].join("|"),
    };
  }
  const reasonCode =
    record.status === "BLOCKED"
      ? record.blockerCode
      : `${intent}_STALE_OR_NOT_EFFECTIVE`;
  return {
    replyKind: "SAFE_FALLBACK",
    reasonCode,
    handoff: true,
    allowDuringHandoff: false,
  };
}

export function approvedAnswerForReplyKind(
  replyKind: ReplyKind,
): string | undefined {
  const intent = intentForReplyKind(replyKind);
  if (!intent) return undefined;
  const result = knowledgeBase.lookupIntent(intent);
  return result.status === "APPROVED" ? result.answer : undefined;
}

export interface ApprovedKnowledgeResponseUnit {
  readonly replyKind: ReplyKind;
  readonly intent: FaqIntent;
  readonly templateId: string;
  readonly approvedRecordId: string;
  readonly answer: string;
  readonly checksum: string;
}

export async function approvedKnowledgeResponseUnit(
  replyKind: ReplyKind,
): Promise<ApprovedKnowledgeResponseUnit | undefined> {
  const intent = intentForReplyKind(replyKind);
  if (!intent) return undefined;
  const record = manifest.categories[intent];
  const lookup = knowledgeBase.lookupIntent(intent);
  if (
    record.status !== "APPROVED" ||
    lookup.status !== "APPROVED" ||
    lookup.answer !== record.customerFacingAnswer ||
    lookup.provenance?.checksum !== record.checksum ||
    (await sha256Hex(record.customerFacingAnswer)) !== record.checksum
  ) {
    return undefined;
  }
  return {
    replyKind,
    intent,
    templateId: `KB:${intent}`,
    approvedRecordId: `${intent}:${record.version}`,
    answer: record.customerFacingAnswer,
    checksum: record.checksum,
  };
}

function intentForReplyKind(replyKind: ReplyKind): FaqIntent | undefined {
  const mapping: Readonly<Partial<Record<ReplyKind, FaqIntent>>> = {
    MENU: "MENU",
    PRICE: "PRICE",
    LOCATION: "LOCATION",
    HOURS: "OPENING_HOURS",
    CONTACT: "CONTACT",
    PICKUP: "PICKUP",
    STORAGE: "STORAGE",
    ALLERGEN: "ALLERGEN",
    WHOLESALE: "WHOLESALE",
    ADVANCE_ORDER: "ADVANCE_ORDER",
    DELIVERY: "DELIVERY",
    PROMOTION: "PROMOTION",
    LOYALTY: "LOYALTY",
    STOCK: "STOCK",
  };
  return mapping[replyKind];
}
