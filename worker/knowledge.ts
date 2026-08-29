import manifestInput from "../config/approved-knowledge-base/test-knowledge-base.json" with { type: "json" };
import {
  approvedFaqRecordsFromManifest,
  parseApprovedKnowledgeManifest,
} from "../src/approved-knowledge-manifest.js";
import { ApprovedFaqKnowledgeBase, type FaqIntent } from "../src/faq.js";
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
  const fallback =
    record.status === "BLOCKED"
      ? record.fallback
      : defaultFallbackForIntent(intent);
  const reasonCode =
    record.status === "BLOCKED"
      ? record.blockerCode
      : `${intent}_STALE_OR_NOT_EFFECTIVE`;
  if (fallback === "HUMAN_REVIEW") {
    return {
      replyKind: "HANDOFF_ACK",
      reasonCode,
      handoff: true,
    };
  }
  return { ...decision, reasonCode };
}

function defaultFallbackForIntent(
  intent: FaqIntent,
): "SAFE_FALLBACK" | "HUMAN_REVIEW" {
  return ["MENU", "PRICE", "LOCATION", "CONTACT"].includes(intent)
    ? "SAFE_FALLBACK"
    : "HUMAN_REVIEW";
}

export function approvedAnswerForReplyKind(
  replyKind: ReplyKind,
): string | undefined {
  const intent = intentForReplyKind(replyKind);
  if (!intent) return undefined;
  const result = knowledgeBase.lookupIntent(intent);
  return result.status === "APPROVED" ? result.answer : undefined;
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
    WHOLESALE: "WHOLESALE",
    ADVANCE_ORDER: "ADVANCE_ORDER",
    DELIVERY: "DELIVERY",
    PROMOTION: "PROMOTION",
    LOYALTY: "LOYALTY",
  };
  return mapping[replyKind];
}
