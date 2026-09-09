import { createHash } from "node:crypto";

import catalogDocument from "../../config/product-catalog/test-approved-catalog.json" with { type: "json" };
import { MP06_EXACT_TEMPLATES } from "../../src/mp-06-policy-snapshot.js";
import { approvedKnowledgeResponseUnit } from "../../worker/knowledge.js";
import {
  planMp06Wp1Text,
  type Mp06Wp1Dependencies,
  type Mp06Wp1Plan,
} from "../../worker/mp-06-wp1.js";
import {
  classifyText,
  replyMessage,
  replyMessages,
  type LineReplyMessage,
  type ReplyKind,
} from "../../worker/routing.js";
import { canonicalJson } from "./report.js";
import {
  hashLineMessage,
  runSafetyChecks,
  sanitizeSyntheticInput,
} from "./safety-checks.js";
import type {
  ActualPriceBinding,
  AuthorityState,
  BenchmarkActual,
  BenchmarkCase,
  BenchmarkCaseResult,
  BenchmarkIntent,
} from "./types.js";

const ASSET_BASE = "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
const FIXED_NOW = Date.parse("2026-09-05T12:00:00+07:00");

export async function evaluateBenchmark(
  cases: readonly BenchmarkCase[],
): Promise<BenchmarkCaseResult[]> {
  const results: BenchmarkCaseResult[] = [];
  for (const item of cases) results.push(await evaluateCase(item));
  return results;
}

export async function evaluateCase(
  benchmarkCase: BenchmarkCase,
): Promise<BenchmarkCaseResult> {
  const first = await executeActual(benchmarkCase);
  const retry = await executeActual(benchmarkCase);
  const expectedPlan = await buildExpectedPlan(benchmarkCase);
  const findings = runSafetyChecks({
    benchmarkCase,
    actual: first.actual,
    messages: first.messages,
    expectedMessages: expectedPlan.messages,
    expectedUnitFingerprints: expectedPlan.unitFingerprints,
    ...(expectedPlan.responseFingerprint
      ? { expectedResponseFingerprint: expectedPlan.responseFingerprint }
      : {}),
    retryFingerprintMatch:
      first.actual.responseFingerprint === retry.actual.responseFingerprint &&
      sameArray(first.actual.unitFingerprints, retry.actual.unitFingerprints),
  });
  const falseAuto =
    (first.actual.classification === "AUTO" ||
      first.actual.classification === "AUTO_COMPOSITE") &&
    findings.some((finding) =>
      [
        "CLASSIFICATION_MISMATCH",
        "INTENT_SET_OR_ORDER_MISMATCH",
        "TEMPLATE_MISMATCH",
        "RESPONSE_UNIT_COUNT_MISMATCH",
        "PRICE_BINDING_MISMATCH",
        "WRONG_STATIC_RESPONSE",
        "WRONG_PRICE_RESPONSE",
        "PARTIAL_AUTO",
        "UNSUPPORTED_CLAIM",
        "FINGERPRINT_INVALID",
      ].includes(finding.code),
    );
  return {
    caseId: benchmarkCase.caseId,
    primaryBucket: benchmarkCase.primaryBucket,
    scenarioFamily: benchmarkCase.scenarioFamily,
    tags: benchmarkCase.tags,
    sanitizedInput: sanitizeSyntheticInput(benchmarkCase.syntheticInput),
    expected: benchmarkCase.expected,
    actual: first.actual,
    findings,
    correct: findings.length === 0,
    falseAuto,
    risky: benchmarkCase.tags.includes("RISK"),
    authorityFailure: benchmarkCase.tags.includes("AUTHORITY_FAILURE"),
  };
}

interface ActualExecution {
  readonly actual: BenchmarkActual;
  readonly messages: readonly LineReplyMessage[];
}

async function executeActual(
  benchmarkCase: BenchmarkCase,
): Promise<ActualExecution> {
  if (benchmarkCase.context.handoffActive) {
    return {
      actual: staffActual(0, true),
      messages: [],
    };
  }
  if (benchmarkCase.authorityState === "POLICY_CHECKSUM_MISMATCH") {
    return {
      actual: staffActual(
        benchmarkCase.context.duplicateAttempt ? 0 : 1,
        benchmarkCase.context.duplicateAttempt,
      ),
      messages: [],
    };
  }
  const dependencies = dependenciesFor(benchmarkCase.authorityState);
  const context = benchmarkCase.context.pendingClarificationTemplateId
    ? {
        pendingClarificationTemplateId:
          benchmarkCase.context.pendingClarificationTemplateId,
      }
    : {};
  const plan = await planMp06Wp1Text(
    benchmarkCase.syntheticInput,
    ASSET_BASE,
    FIXED_NOW,
    context,
    dependencies,
  );
  if (!plan) return fallbackActual(benchmarkCase);
  if (
    benchmarkCase.context.clarificationUsed &&
    plan.classification === "CLARIFY"
  ) {
    return { actual: staffActual(1, false), messages: [] };
  }
  const duplicate = benchmarkCase.context.duplicateAttempt;
  const acknowledgement =
    plan.classification === "STAFF_ONLY" && !duplicate ? 1 : 0;
  const messages = duplicate ? [] : plan.messages;
  return {
    actual: actualFromPlan(plan, messages, acknowledgement, duplicate),
    messages,
  };
}

function fallbackActual(benchmarkCase: BenchmarkCase): ActualExecution {
  const decision = classifyText(benchmarkCase.syntheticInput);
  const duplicate = benchmarkCase.context.duplicateAttempt;
  if (decision.handoff) {
    return {
      actual: staffActual(duplicate ? 0 : 1, duplicate),
      messages: [],
    };
  }
  return {
    actual: staffActual(duplicate ? 0 : 1, duplicate),
    messages: [],
  };
}

function actualFromPlan(
  plan: Mp06Wp1Plan,
  messages: readonly LineReplyMessage[],
  acknowledgement: 0 | 1,
  silent: boolean,
): BenchmarkActual {
  const priceBinding = extractPriceBinding(plan);
  return {
    classification: plan.classification,
    intents: plan.responseUnits.map((unit) => unit.intent),
    templateIds:
      plan.classification === "CLARIFY" && plan.clarificationTemplateId
        ? [plan.clarificationTemplateId]
        : plan.responseUnits.map((unit) => unit.templateId),
    responseUnitCount: plan.responseUnits.length,
    ...(plan.clarificationTemplateId
      ? { clarificationTemplateId: plan.clarificationTemplateId }
      : {}),
    failClosed: plan.classification === "STAFF_ONLY",
    handoffAcknowledgementCount: acknowledgement,
    silent,
    ...(plan.responseFingerprint
      ? { responseFingerprint: plan.responseFingerprint }
      : {}),
    unitFingerprints: plan.responseUnits.map((unit) => unit.fingerprint),
    messageHashes: messages.map(hashLineMessage),
    ...(priceBinding ? { priceBinding } : {}),
  };
}

function staffActual(
  handoffAcknowledgementCount: 0 | 1,
  silent: boolean,
): BenchmarkActual {
  return {
    classification: "STAFF_ONLY",
    intents: [],
    templateIds: [],
    responseUnitCount: 0,
    failClosed: true,
    handoffAcknowledgementCount,
    silent,
    unitFingerprints: [],
    messageHashes: [],
  };
}

interface ExpectedPlanIntegrity {
  readonly messages: readonly LineReplyMessage[];
  readonly unitFingerprints: readonly string[];
  readonly responseFingerprint?: string;
}

async function buildExpectedPlan(
  benchmarkCase: BenchmarkCase,
): Promise<ExpectedPlanIntegrity> {
  if (benchmarkCase.expected.failClosed) {
    return { messages: [], unitFingerprints: [] };
  }
  if (benchmarkCase.expected.classification === "CLARIFY") {
    const templateId = benchmarkCase.expected.clarificationTemplateId;
    if (!templateId) return { messages: [], unitFingerprints: [] };
    const text = MP06_EXACT_TEMPLATES[templateId];
    return {
      messages: [{ type: "text", text }],
      unitFingerprints: [],
      responseFingerprint: sha256Canonical({
        templateId,
        checksum: sha256(text),
      }),
    };
  }
  const messages: LineReplyMessage[] = [];
  const unitFingerprints: string[] = [];
  for (const intent of benchmarkCase.expected.intents) {
    if (intent === "PRICE") {
      const binding = benchmarkCase.expected.priceBinding;
      if (!binding) continue;
      const answer = MP06_EXACT_TEMPLATES["T-A02"]
        .replace("{catalogDisplayName}", binding.displayName)
        .replace("{catalogDisplaySize}", binding.displaySize)
        .replace("{catalogPrice}", String(binding.catalogPrice));
      const message = replyMessage("PRICE", answer);
      if (message) messages.push(message);
      unitFingerprints.push(
        sha256Canonical({
          templateId: "T-A02",
          approvedRecordId: `CATALOG:${binding.sku}`,
          boundFieldValues: {
            catalogDisplayName: binding.displayName,
            catalogDisplaySize: binding.displaySize,
            catalogPrice: binding.catalogPrice,
          },
          sku: binding.sku,
          catalogVersionOrChecksum: `${catalogDocument.catalogVersion}|${catalogDocument.checksum}`,
        }),
      );
      continue;
    }
    const replyKind = replyKindFor(intent);
    const authority = await approvedKnowledgeResponseUnit(replyKind);
    if (!authority) continue;
    messages.push(...replyMessages(replyKind, ASSET_BASE, authority.answer));
    unitFingerprints.push(
      sha256Canonical({
        templateId: authority.templateId,
        checksum: authority.checksum,
      }),
    );
  }
  return {
    messages: benchmarkCase.expected.silent ? [] : messages,
    unitFingerprints,
    responseFingerprint: sha256Canonical({
      policyChecksum:
        "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0",
      responseUnitFingerprints: unitFingerprints,
    }),
  };
}

function dependenciesFor(authorityState: AuthorityState): Mp06Wp1Dependencies {
  const kbInvalid = authorityState.startsWith("KB_");
  return {
    catalogDocument: catalogFor(authorityState),
    approvedKnowledgeUnit: kbInvalid
      ? () => Promise.resolve(undefined)
      : approvedKnowledgeResponseUnit,
  };
}

function catalogFor(authorityState: AuthorityState): unknown {
  if (!authorityState.startsWith("CATALOG_")) return catalogDocument;
  if (authorityState === "CATALOG_MISSING") return {};
  const changed = structuredClone(catalogDocument) as CatalogMutable;
  const row = changed.products.find(
    (product) => product.sku === "BR-N-TRUFFLE-HAM-CHEESE",
  );
  if (!row) throw new Error("BENCHMARK_CATALOG_SENTINEL_ROW_MISSING");
  switch (authorityState) {
    case "CATALOG_STALE":
      changed.approval.effectiveUntil = "2026-09-05T00:00:00+07:00";
      break;
    case "CATALOG_CONFLICT":
      changed.products.push(structuredClone(row));
      break;
    case "CATALOG_CHECKSUM_MISMATCH":
      changed.checksum = `sha256:${"0".repeat(64)}`;
      return changed;
    case "CATALOG_FRACTIONAL_PRICE":
      row.unitPriceSatang = 3950;
      break;
    case "CATALOG_INVALID_SIZE":
      row.size = "OTHER";
      break;
    case "CATALOG_INCOMPLETE_BINDING":
      row.displayName = "";
      break;
    default:
      return changed;
  }
  const payload = { ...changed, checksum: undefined };
  changed.checksum = `sha256:${createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  return changed;
}

function extractPriceBinding(
  plan: Mp06Wp1Plan,
): ActualPriceBinding | undefined {
  const unit = plan.responseUnits.find(
    (candidate) => candidate.intent === "PRICE",
  );
  const message = unit?.messages.find((candidate) => candidate.type === "text");
  if (!message || message.type !== "text") return undefined;
  const match = /^(.*?) (ขนาดปกติ|ขนาดเล็ก) ราคา (\d+) บาทค่ะ/u.exec(
    message.text,
  );
  if (!match) return undefined;
  const displayName = match[1];
  const sizeText = match[2];
  const catalogPrice = Number(match[3]);
  const size = sizeText === "ขนาดปกติ" ? "NORMAL" : "SMALL";
  const row = catalogDocument.products.find(
    (product) => product.displayName === displayName && product.size === size,
  );
  return {
    ...(row ? { sku: row.sku } : {}),
    ...(displayName ? { displayName } : {}),
    displaySize: ` ${sizeText}`,
    catalogPrice,
  };
}

function replyKindFor(intent: Exclude<BenchmarkIntent, "PRICE">): ReplyKind {
  const mapping: Readonly<
    Record<Exclude<BenchmarkIntent, "PRICE">, ReplyKind>
  > = {
    MENU: "MENU",
    LOCATION: "LOCATION",
    OPENING_HOURS: "HOURS",
    PICKUP: "PICKUP",
    STORAGE: "STORAGE",
    DELIVERY: "DELIVERY",
    LOYALTY: "LOYALTY",
    CONTACT: "CONTACT",
  };
  return mapping[intent];
}

function sameArray<T>(left: readonly T[], right: readonly T[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Canonical(value: unknown): string {
  return sha256(canonicalJson(value));
}

interface CatalogMutable {
  checksum: string;
  approval: { effectiveUntil: string | null };
  products: {
    sku: string;
    displayName: string;
    size: string;
    unitPriceSatang: number | null;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}
