import policyInput from "../config/mp-06/policy-snapshot.json" with { type: "json" };
import catalogInput from "../config/product-catalog/test-approved-catalog.json" with { type: "json" };
import {
  type ApprovedCatalog,
  type CatalogProduct,
} from "../src/draft-order.js";
import {
  MENU_TEXT_LEXICON,
  detectConversationIntent,
  normalizeConversationText,
  type ConversationIntent,
} from "../src/conversation-intents.js";
import {
  approvedKnowledgeResponseUnit,
  type ApprovedKnowledgeResponseUnit,
} from "./knowledge.js";
import { canonicalJson, sha256Canonical, sha256Hex } from "./mp-06-crypto.js";
import {
  replyMessage,
  replyMessages,
  type LineReplyMessage,
  type ReplyKind,
  type RouteDecision,
} from "./routing.js";

export const MP06_POLICY_CHECKSUM =
  "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0";

export const MP06_AUTO_INTENT_ORDER = [
  "MENU",
  "PRICE",
  "LOCATION",
  "OPENING_HOURS",
  "PICKUP",
  "STORAGE",
  "DELIVERY",
  "LOYALTY",
  "CONTACT",
] as const;

export type Mp06AutoIntent = (typeof MP06_AUTO_INTENT_ORDER)[number];
export type Mp06Classification =
  "AUTO" | "AUTO_COMPOSITE" | "CLARIFY" | "STAFF_ONLY";
export type Mp06ClarificationTemplateId = "T-C01" | "T-C04";

export interface Mp06ResponseUnit {
  readonly intent: Mp06AutoIntent;
  readonly templateId: string;
  readonly fingerprint: string;
  readonly messages: readonly LineReplyMessage[];
}

export interface Mp06Wp1Plan {
  readonly classification: Mp06Classification;
  readonly decision: RouteDecision;
  readonly responseUnits: readonly Mp06ResponseUnit[];
  readonly messages: readonly LineReplyMessage[];
  readonly responseFingerprint?: string;
  readonly clarificationTemplateId?: Mp06ClarificationTemplateId;
}

export interface Mp06Wp1Dependencies {
  readonly catalogDocument: unknown;
  readonly approvedKnowledgeUnit: (
    replyKind: ReplyKind,
  ) => Promise<ApprovedKnowledgeResponseUnit | undefined>;
}

export interface Mp06Wp1Context {
  readonly pendingClarificationTemplateId?: Mp06ClarificationTemplateId;
}

const DEFAULT_DEPENDENCIES: Mp06Wp1Dependencies = {
  catalogDocument: catalogInput,
  approvedKnowledgeUnit: approvedKnowledgeResponseUnit,
};

const STAFF_ONLY_INTENTS = new Set<ConversationIntent>([
  "SENSITIVE_PERSONAL_DATA",
  "HIGH_RISK",
  "ALLERGEN",
  "STOCK",
  "PROMOTION",
  "WHOLESALE",
  "ADVANCE_ORDER",
  "LOYALTY_REDEMPTION",
  "STAFF",
]);

const AUTO_MATCHERS: Readonly<
  Record<Mp06AutoIntent, (normalized: string) => boolean>
> = {
  MENU: (value) => includesAny(value, MENU_TEXT_LEXICON),
  PRICE: (value) =>
    includesAny(value, [
      "ราคา",
      "ราาคา",
      "กี่บาท",
      "ราคาเท่าไหร่",
      "ราคาเท่าไร",
      "ขอราคา",
    ]),
  LOCATION: (value) =>
    includesAny(value, [
      "ที่ตั้ง",
      "ร้านอยู่ที่ไหน",
      "ร้านอยู่ไหน",
      "ร้านอยุ่ไหน",
      "ร้านยุไหน",
      "พิกัดร้าน",
      "แผนที่",
      "เดินทาง",
    ]) || isExact(value, ["พิกัด"]),
  OPENING_HOURS: (value) =>
    includesAny(value, [
      "เปิดกี่โมง",
      "ปิดกี่โมง",
      "เวลาทำการ",
      "ร้านเปิด",
      "เปิดทุกวันไหม",
    ]) || isExact(value, ["เวลา", "กี่โมง"]),
  PICKUP: (value) =>
    includesAny(value, ["รับสินค้าที่ไหน", "จุดรับสินค้า", "รับของที่ไหน"]),
  STORAGE: (value) =>
    includesAny(value, [
      "เก็บได้กี่วัน",
      "เก็บได้นาน",
      "เก็บยังไง",
      "เก็บยังงัย",
      "เก็บรักษา",
      "แช่เย็น",
      "แช่ตู้เย็น",
      "อายุขนม",
    ]),
  DELIVERY: (value) =>
    includesAny(value, ["delivery", "เดลิเวอรี", "เดลิเวอรี่", "ส่งถึงบ้าน"]),
  LOYALTY: (value) =>
    includesAny(value, [
      "กติกาแต้ม",
      "สะสมแต้ม",
      "สะสมเเต้ม",
      "บัตรแต้ม",
      "บัตรสะสมแต้ม",
    ]) || isExact(value, ["แต้ม", "คะแนน", "สะสมแต้มและโปรโมชั่น"]),
  CONTACT: (value) =>
    includesAny(value, [
      "ติดต่อร้าน",
      "เบอร์ติดต่อ",
      "ช่องทางติดต่อ",
      "ติดต่อยังไง",
    ]) || isExact(value, ["ติดต่อ"]),
};

export function detectMp06IntentMatches(
  text: string,
): readonly Mp06AutoIntent[] {
  const normalized = normalizeConversationText(text);
  return MP06_AUTO_INTENT_ORDER.filter((intent) =>
    AUTO_MATCHERS[intent](normalized),
  );
}

export async function planMp06Wp1Text(
  text: string,
  publicAssetBaseUrl: string,
  now = Date.now(),
  context: Mp06Wp1Context = {},
  dependencies: Mp06Wp1Dependencies = DEFAULT_DEPENDENCIES,
): Promise<Mp06Wp1Plan | undefined> {
  if (!(await isRuntimePolicyValid())) {
    return staffOnlyPlan("MP06_POLICY_INTEGRITY_FAILED");
  }

  const detectedMatches = detectMp06IntentMatches(text);
  const matches =
    detectedMatches.length === 0 &&
    context.pendingClarificationTemplateId === "T-C01"
      ? (["PRICE"] as const)
      : detectedMatches;
  const primaryIntent = detectConversationIntent(text);
  if (STAFF_ONLY_INTENTS.has(primaryIntent)) {
    return matches.length > 0
      ? staffOnlyPlan(`MP06_STAFF_PRECEDENCE_${primaryIntent}`)
      : undefined;
  }
  if (primaryIntent === "FLEX_MENU") return undefined;

  if (matches.length === 0) return undefined;

  const units: Mp06ResponseUnit[] = [];
  let clarificationTemplateId: Mp06ClarificationTemplateId | undefined;
  for (const intent of matches) {
    const result =
      intent === "PRICE"
        ? await priceUnit(text, now, dependencies)
        : await staticUnit(intent, publicAssetBaseUrl, dependencies);
    if (result.classification === "STAFF_ONLY") {
      return staffOnlyPlan(result.reasonCode);
    }
    if (result.classification === "CLARIFY") {
      clarificationTemplateId = result.templateId;
      continue;
    }
    units.push(result.unit);
  }
  if (clarificationTemplateId) {
    return clarificationPlan(clarificationTemplateId);
  }

  const deduplicated = deduplicateResponseUnits(units);
  if (deduplicated.length > 3) return clarificationPlan("T-C04");
  if (deduplicated.length === 0) {
    return staffOnlyPlan("MP06_EMPTY_RESPONSE_PLAN");
  }

  const classification = deduplicated.length === 1 ? "AUTO" : "AUTO_COMPOSITE";
  const responseFingerprint = await sha256Canonical({
    policyChecksum: MP06_POLICY_CHECKSUM,
    responseUnitFingerprints: deduplicated.map((unit) => unit.fingerprint),
  });
  return {
    classification,
    decision: {
      replyKind: deduplicated[0]?.messages[0]
        ? replyKindFor(matches[0])
        : "NONE",
      reasonCode: `MP06_${classification}`,
      handoff: false,
      allowDuringHandoff: false,
    },
    responseUnits: deduplicated,
    messages: deduplicated.flatMap((unit) => unit.messages),
    responseFingerprint,
  };
}

export function deduplicateResponseUnits(
  units: readonly Mp06ResponseUnit[],
): readonly Mp06ResponseUnit[] {
  const byFingerprint = new Map<string, Mp06ResponseUnit>();
  for (const unit of units) {
    if (!byFingerprint.has(unit.fingerprint)) {
      byFingerprint.set(unit.fingerprint, unit);
    }
  }
  return [...byFingerprint.values()].sort(
    (left, right) =>
      MP06_AUTO_INTENT_ORDER.indexOf(left.intent) -
      MP06_AUTO_INTENT_ORDER.indexOf(right.intent),
  );
}

async function staticUnit(
  intent: Exclude<Mp06AutoIntent, "PRICE">,
  publicAssetBaseUrl: string,
  dependencies: Mp06Wp1Dependencies,
): Promise<UnitResult> {
  const replyKind = replyKindFor(intent);
  const authority = await dependencies.approvedKnowledgeUnit(replyKind);
  if (!authority || authority.intent !== faqIntentFor(intent)) {
    return {
      classification: "STAFF_ONLY",
      reasonCode: `MP06_${intent}_AUTHORITY_INVALID`,
    };
  }
  const fingerprint = await sha256Canonical({
    templateId: authority.templateId,
    checksum: authority.checksum,
  });
  return {
    classification: "AUTO",
    unit: {
      intent,
      templateId: authority.templateId,
      fingerprint,
      messages: replyMessages(replyKind, publicAssetBaseUrl, authority.answer),
    },
  };
}

async function priceUnit(
  text: string,
  now: number,
  dependencies: Mp06Wp1Dependencies,
): Promise<UnitResult> {
  const catalog = await authoritativeCatalog(dependencies.catalogDocument, now);
  if (!catalog) {
    return {
      classification: "STAFF_ONLY",
      reasonCode: "MP06_CATALOG_AUTHORITY_INVALID",
    };
  }
  const resolved = resolvePriceRow(text, catalog);
  if (resolved.status === "CLARIFY") {
    return { classification: "CLARIFY", templateId: "T-C01" };
  }
  if (resolved.status === "STAFF_ONLY") {
    return { classification: "STAFF_ONLY", reasonCode: resolved.reasonCode };
  }

  const size = catalogDisplaySize(resolved.product.size);
  const price = resolved.product.unitPriceSatang;
  if (
    size === undefined ||
    !Number.isSafeInteger(price) ||
    price === null ||
    price <= 0 ||
    price % 100 !== 0
  ) {
    return {
      classification: "STAFF_ONLY",
      reasonCode: "MP06_PRICE_BINDING_INVALID",
    };
  }
  const policy = runtimePolicy();
  if (!policy) {
    return {
      classification: "STAFF_ONLY",
      reasonCode: "MP06_POLICY_INTEGRITY_FAILED",
    };
  }
  const boundFieldValues = {
    catalogDisplayName: resolved.product.displayName,
    catalogDisplaySize: size,
    catalogPrice: price / 100,
  };
  const answer = policy.templates["T-A02"].text
    .replace("{catalogDisplayName}", boundFieldValues.catalogDisplayName)
    .replace("{catalogDisplaySize}", boundFieldValues.catalogDisplaySize)
    .replace("{catalogPrice}", String(boundFieldValues.catalogPrice));
  const fingerprint = await sha256Canonical({
    templateId: "T-A02",
    approvedRecordId: `CATALOG:${resolved.product.sku}`,
    boundFieldValues,
    sku: resolved.product.sku,
    catalogVersionOrChecksum: `${catalog.catalogVersion}|${catalog.checksum}`,
  });
  const message = replyMessage("PRICE", answer);
  if (!message) {
    return {
      classification: "STAFF_ONLY",
      reasonCode: "MP06_PRICE_RENDER_FAILED",
    };
  }
  return {
    classification: "AUTO",
    unit: {
      intent: "PRICE",
      templateId: "T-A02",
      fingerprint,
      messages: [message],
    },
  };
}

function resolvePriceRow(
  text: string,
  catalog: ApprovedCatalog,
): PriceResolution {
  const normalized = normalizeConversationText(text);
  const explicitSize = requestedSize(normalized);
  const mentions = catalog.products.flatMap((product) =>
    [product.displayName, ...product.aliases].flatMap((label) => {
      const normalizedLabel = normalizeConversationText(label);
      const start = normalized.indexOf(normalizedLabel);
      return start < 0
        ? []
        : [{ product, start, end: start + normalizedLabel.length }];
    }),
  );
  const maximalMentions = mentions.filter(
    (candidate) =>
      !mentions.some(
        (other) =>
          other.product.sku !== candidate.product.sku &&
          other.start <= candidate.start &&
          other.end >= candidate.end &&
          other.end - other.start > candidate.end - candidate.start,
      ),
  );
  let products = uniqueProducts(maximalMentions.map((match) => match.product));
  if (explicitSize) {
    products = products.filter((product) => product.size === explicitSize);
  }
  if (products.length !== 1) return { status: "CLARIFY" };
  const product = products[0];
  if (!product) return { status: "CLARIFY" };
  if (product.status !== "APPROVED" || product.unitPriceSatang === null) {
    return {
      status: "STAFF_ONLY",
      reasonCode: "MP06_PRICE_ROW_NOT_APPROVED",
    };
  }
  return { status: "RESOLVED", product };
}

async function authoritativeCatalog(
  document: unknown,
  now: number,
): Promise<ApprovedCatalog | undefined> {
  if (!isRecord(document)) return undefined;
  const checksum = document.checksum;
  const approval = document.approval;
  if (
    typeof document.catalogVersion !== "string" ||
    document.catalogVersion.length === 0 ||
    typeof checksum !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(checksum) ||
    !isRecord(approval) ||
    approval.status !== "APPROVED" ||
    typeof approval.effectiveFrom !== "string" ||
    !Array.isArray(document.products) ||
    document.products.length === 0 ||
    !document.products.every(isCatalogProduct)
  ) {
    return undefined;
  }
  const products = document.products as readonly Record<string, unknown>[];
  if (
    new Set(products.map((product) => product.sku)).size !== products.length
  ) {
    return undefined;
  }
  const effectiveFrom = Date.parse(approval.effectiveFrom);
  const effectiveUntil =
    approval.effectiveUntil === null
      ? Number.POSITIVE_INFINITY
      : typeof approval.effectiveUntil === "string"
        ? Date.parse(approval.effectiveUntil)
        : Number.NaN;
  if (
    !Number.isFinite(effectiveFrom) ||
    Number.isNaN(effectiveUntil) ||
    now < effectiveFrom ||
    now >= effectiveUntil
  ) {
    return undefined;
  }
  const payload = { ...document, checksum: undefined };
  if (checksum !== `sha256:${await sha256Hex(JSON.stringify(payload))}`) {
    return undefined;
  }
  return document as unknown as ApprovedCatalog;
}

async function isRuntimePolicyValid(): Promise<boolean> {
  const policy = runtimePolicy();
  if (!policy) return false;
  const copy = structuredClone(policyInput) as Record<string, unknown>;
  const integrity = isRecord(copy.integrity) ? copy.integrity : undefined;
  if (!integrity) return false;
  integrity.policyChecksum = "";
  return (await sha256Hex(canonicalJson(copy))) === MP06_POLICY_CHECKSUM;
}

function runtimePolicy(): RuntimePolicy | undefined {
  if (
    policyInput.policyVersion !== "2026.09.05-policy-v1" ||
    policyInput.integrity.policyChecksum !== MP06_POLICY_CHECKSUM
  ) {
    return undefined;
  }
  return policyInput;
}

async function clarificationPlan(
  templateId: Mp06ClarificationTemplateId,
): Promise<Mp06Wp1Plan> {
  const policy = runtimePolicy();
  if (!policy) return staffOnlyPlan("MP06_POLICY_INTEGRITY_FAILED");
  const text = policy.templates[templateId].text;
  const checksum = await sha256Hex(text);
  return {
    classification: "CLARIFY",
    decision: {
      replyKind: "NONE",
      reasonCode: `MP06_CLARIFY_${templateId}`,
      handoff: false,
      allowDuringHandoff: false,
    },
    responseUnits: [],
    messages: [{ type: "text", text }],
    responseFingerprint: await sha256Canonical({ templateId, checksum }),
    clarificationTemplateId: templateId,
  };
}

function staffOnlyPlan(reasonCode: string): Mp06Wp1Plan {
  return {
    classification: "STAFF_ONLY",
    decision: {
      replyKind: "HANDOFF_ACK",
      reasonCode,
      handoff: true,
      allowDuringHandoff: false,
    },
    responseUnits: [],
    messages: [],
  };
}

function replyKindFor(intent: Mp06AutoIntent | undefined): ReplyKind {
  const mapping: Readonly<Record<Mp06AutoIntent, ReplyKind>> = {
    MENU: "MENU",
    PRICE: "PRICE",
    LOCATION: "LOCATION",
    OPENING_HOURS: "HOURS",
    PICKUP: "PICKUP",
    STORAGE: "STORAGE",
    DELIVERY: "DELIVERY",
    LOYALTY: "LOYALTY",
    CONTACT: "CONTACT",
  };
  return intent ? mapping[intent] : "NONE";
}

function faqIntentFor(intent: Exclude<Mp06AutoIntent, "PRICE">): string {
  return intent;
}

function requestedSize(value: string): "NORMAL" | "SMALL" | undefined {
  if (
    includesAny(value, ["ขนาดเล็ก", "ชิ้นเล็ก"]) ||
    /(?:^|\s)เล็ก(?:\s|$)/u.test(value)
  ) {
    return "SMALL";
  }
  if (
    includesAny(value, ["ขนาดปกติ", "ชิ้นปกติ"]) ||
    /(?:^|\s)ปกติ(?:\s|$)/u.test(value)
  ) {
    return "NORMAL";
  }
  return undefined;
}

function catalogDisplaySize(value: CatalogProduct["size"]): string | undefined {
  if (value === "NORMAL") return " ขนาดปกติ";
  if (value === "SMALL") return " ขนาดเล็ก";
  return undefined;
}

function uniqueProducts(products: readonly CatalogProduct[]): CatalogProduct[] {
  return [
    ...new Map(products.map((product) => [product.sku, product])).values(),
  ];
}

function includesAny(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) =>
    value.includes(normalizeConversationText(keyword)),
  );
}

function isExact(value: string, keywords: readonly string[]): boolean {
  return keywords.some(
    (keyword) => value === normalizeConversationText(keyword),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCatalogProduct(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const approvedPriceIsValid =
    value.status === "APPROVED" &&
    Number.isSafeInteger(value.unitPriceSatang) &&
    Number(value.unitPriceSatang) > 0;
  const blockedPriceIsValid =
    value.status === "PRICE_BLOCKED" &&
    value.unitPriceSatang === null &&
    value.promotionEligible === false;
  return (
    typeof value.sku === "string" &&
    value.sku.length > 0 &&
    typeof value.displayName === "string" &&
    value.displayName.length > 0 &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string") &&
    ["NORMAL", "SMALL", "OTHER"].includes(String(value.size)) &&
    (approvedPriceIsValid || blockedPriceIsValid) &&
    typeof value.promotionEligible === "boolean"
  );
}

type UnitResult =
  | { readonly classification: "AUTO"; readonly unit: Mp06ResponseUnit }
  | {
      readonly classification: "CLARIFY";
      readonly templateId: Mp06ClarificationTemplateId;
    }
  | { readonly classification: "STAFF_ONLY"; readonly reasonCode: string };

type PriceResolution =
  | { readonly status: "RESOLVED"; readonly product: CatalogProduct }
  | { readonly status: "CLARIFY" }
  | { readonly status: "STAFF_ONLY"; readonly reasonCode: string };

type RuntimePolicy = typeof policyInput;
