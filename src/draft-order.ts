import catalogDocument from "../config/product-catalog/test-approved-catalog.json" with { type: "json" };

export const DRAFT_CONSENT_TEXT = `เพื่อจัดทำร่างออเดอร์ ร้านมะลิปังขอเก็บชื่อและเบอร์โทรของคุณเป็นเวลาไม่เกิน 48 ชั่วโมงค่ะ

ข้อมูลนี้เป็นเพียงร่างออเดอร์ ยังไม่ใช่การยืนยันสินค้า สต๊อก รอบอบ โปรโมชัน หรือการชำระเงินนะคะ

หากยินยอม กรุณาพิมพ์ ‘ยินยอม’ เพื่อเริ่มกรอกรายละเอียดได้เลยค่ะ`;

export const DRAFT_LABEL = "DRAFT — ยังไม่ยืนยันออเดอร์/สต๊อก/ชำระเงิน";
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;
export const DRAFT_TIME_ZONE = "Asia/Bangkok";
export const DRAFT_PICKUP_SLOTS = ["08:00", "11:00", "14:00", "16:00"] as const;

const FORM_PRODUCT_NAMES = [
  "ทรัฟเฟิลแฮมชีส",
  "ฮาวายเอี้ยน",
  "ทูน่าคอร์นสลัด",
  "แฮมชีส",
  "เนยสด",
  "สังขยา",
  "หมูหยอง",
  "หมูหยองไส้กรอก",
  "ไส้กรอก",
  "ไส้กรอกชีส",
  "หมูหยองพริกเผา",
  "หมูหยองลูกเกด",
  "หมูหยองน้ำสลัด",
  "แฮมสลัด",
  "แฮมไส้กรอก",
  "ไส้กรอกพิซซ่า",
  "ฝอยทอง",
  "เผือก",
  "ถั่วแดง",
  "ลูกเกด",
  "รวมมิตร",
] as const;

export type DraftState =
  | "NO_DRAFT"
  | "CONSENT_REQUIRED"
  | "COLLECTING"
  | "READY_FOR_REVIEW"
  | "AWAITING_STAFF_REVIEW"
  | "PRICE_BLOCKED"
  | "CANCELLED"
  | "EXPIRED_PURGED"
  | "FAILED_REVIEW";

export interface CatalogProduct {
  readonly sku: string;
  readonly displayName: string;
  readonly aliases: readonly string[];
  readonly size: "NORMAL" | "SMALL" | "OTHER";
  readonly unitPriceSatang: number | null;
  readonly status: "APPROVED" | "PRICE_BLOCKED";
  readonly promotionEligible: boolean;
}

export interface ApprovedCatalog {
  readonly catalogVersion: string;
  readonly checksum: string;
  readonly approval: {
    readonly status: "APPROVED";
    readonly ownerDecisionDate: string;
    readonly effectiveFrom: string;
    readonly effectiveUntil: string | null;
    readonly source: string;
  };
  readonly products: readonly CatalogProduct[];
}

export interface DraftLine {
  readonly sku: string;
  readonly displayName: string;
  readonly size: CatalogProduct["size"];
  readonly quantity: number;
  readonly unitPriceSatang: number | null;
  readonly promotionEligible: boolean;
  readonly status: CatalogProduct["status"];
}

export interface DraftFields {
  readonly name?: string;
  readonly phone?: string;
  readonly pickupDate?: string;
  readonly pickupSlot?: string;
  readonly pickupMethod?: string;
  readonly paymentPreference?: string;
  readonly notes?: string;
  readonly items: readonly DraftLine[];
}

export interface DraftAggregate {
  readonly state: DraftState;
  readonly revision: number;
  readonly consentedAt?: number;
  readonly updatedAt: number;
  readonly expiresAt?: number;
  readonly fields: DraftFields;
  readonly catalogVersion: string;
  readonly catalogChecksum: string;
  readonly promotionRevision?: number;
  readonly pricingPromotion?: TestPromotion;
}

export interface TestPromotion {
  readonly enabled: boolean;
  readonly revision: number;
  readonly startAt: number;
  readonly endAt: number;
}

export interface DraftCalculation {
  readonly subtotalSatang: number;
  readonly proposedDepositSatang: number;
  readonly promotionApplied: boolean;
  readonly promotionGroups: number;
}

export interface DraftTransition {
  readonly aggregate: DraftAggregate;
  readonly changed: boolean;
  readonly messages: readonly string[];
  readonly enterHandoff: boolean;
  readonly purgePii: boolean;
  readonly auditOutcome: string;
}

export interface StaffRepricingResult {
  readonly aggregate: DraftAggregate;
  readonly calculation: DraftCalculation;
}

export const APPROVED_TEST_CATALOG = validateCatalog(catalogDocument);

export function newDraft(now: number): DraftAggregate {
  return {
    state: "NO_DRAFT",
    revision: 0,
    updatedAt: now,
    fields: { items: [] },
    catalogVersion: APPROVED_TEST_CATALOG.catalogVersion,
    catalogChecksum: APPROVED_TEST_CATALOG.checksum,
  };
}

export function draftReservationForm(now: number): string {
  const pickupDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: DRAFT_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(now));
  return `🧾 แบบฟอร์มสั่งจองขนมปัง
คัดลอก → กรอก → ส่งกลับมาได้เลยค่ะ
ชื่อผู้รับ:
เบอร์โทร:
วันรับ: ${pickupDate} (หากต้องการรับวันอื่น กรุณาแก้ไขวันที่)
รอบรับ: 08:00 / 11:00 / 14:00
วิธีรับ: รับที่ร้าน / จัดส่ง
📝 รายการที่ต้องการ:
🎉 ไส้ใหม่ ชวนลอง
ทรัฟเฟิลแฮมชีส:
ฮาวายเอี้ยน:
ทูน่าคอร์นสลัด:
⭐ ไส้ขายดี ลูกค้าสั่งซ้ำบ่อย
แฮมชีส:
เนยสด:
สังขยา:
หมูหยอง:
หมูหยองไส้กรอก:
ไส้กรอก:
ไส้กรอกชีส:
หมูหยองพริกเผา:
🥖 ไส้อื่น ๆ
หมูหยองลูกเกด:
หมูหยองน้ำสลัด:
แฮมสลัด:
แฮมไส้กรอก:
ไส้กรอกพิซซ่า:
ฝอยทอง:
เผือก:
ถั่วแดง:
ลูกเกด:
รวมมิตร:
หมายเหตุ: (ถ้ามี)
หลังได้รับข้อมูล แอดมินจะตรวจสอบสินค้าและสรุปให้ พร้อมแจ้งรายการ จำนวน ยอดชำระ และรอบอบที่ยืนยันค่ะ
รีบสั่งจองกันนะคะ ไส้ขายดีหมดไวมาก!
เลือกไส้ที่ชอบ แล้วให้เราจัดเตรียมขนมปังอบใหม่ หอม นุ่ม อร่อย ส่งต่อความสุขให้ทุกคำเลยค่ะ`;
}

export function isDraftActive(state: DraftState): boolean {
  return [
    "CONSENT_REQUIRED",
    "COLLECTING",
    "READY_FOR_REVIEW",
    "PRICE_BLOCKED",
    "FAILED_REVIEW",
  ].includes(state);
}

export function transitionDraft(
  current: DraftAggregate,
  text: string,
  now: number,
  startRequested: boolean,
  promotion: TestPromotion,
): DraftTransition {
  if (current.expiresAt !== undefined && current.expiresAt <= now) {
    return {
      aggregate: {
        ...newDraft(now),
        state: "EXPIRED_PURGED",
        revision: current.revision + 1,
      },
      changed: true,
      messages: [
        "ร่างออเดอร์หมดอายุและข้อมูลชื่อ/เบอร์ถูกลบแล้วค่ะ หากต้องการเริ่มใหม่ กรุณาพิมพ์ “พรีออเดอร์” นะคะ",
      ],
      enterHandoff: false,
      purgePii: true,
      auditOutcome: "DRAFT_EXPIRED_PII_PURGED",
    };
  }

  const normalized = text.trim();
  if (
    (current.state === "NO_DRAFT" || isTerminal(current.state)) &&
    startRequested
  ) {
    const promotionActive =
      promotion.enabled && now >= promotion.startAt && now < promotion.endAt;
    return changed(
      {
        ...current,
        promotionRevision: promotion.revision,
        pricingPromotion: {
          ...promotion,
          enabled: promotionActive,
          startAt: 0,
          endAt: Number.MAX_SAFE_INTEGER,
        },
      },
      now,
      "CONSENT_REQUIRED",
      current.fields,
      [DRAFT_CONSENT_TEXT],
      "DRAFT_CONSENT_REQUESTED",
    );
  }
  if (!isDraftActive(current.state)) return unchanged(current);

  if (normalized === "ยกเลิกร่าง") {
    return {
      ...changed(
        current,
        now,
        "CANCELLED",
        { items: [] },
        ["ยกเลิกร่างออเดอร์และลบข้อมูลชื่อ/เบอร์แล้วค่ะ"],
        "DRAFT_CANCELLED_PII_PURGED",
      ),
      purgePii: true,
    };
  }

  if (current.state === "CONSENT_REQUIRED") {
    if (normalized !== "ยินยอม") {
      return {
        ...unchanged(current),
        messages: [DRAFT_CONSENT_TEXT],
        auditOutcome: "DRAFT_CONSENT_NOT_GRANTED",
      };
    }
    return changed(
      { ...current, consentedAt: now },
      now,
      "COLLECTING",
      current.fields,
      [draftReservationForm(now)],
      "DRAFT_CONSENT_GRANTED",
    );
  }

  if (normalized === "ส่งให้พนักงานตรวจ") {
    if (current.state !== "READY_FOR_REVIEW") {
      return {
        ...unchanged(current),
        messages: [
          "กรุณากรอกแบบฟอร์มให้ครบและตรวจสอบ Draft ก่อนส่งให้พนักงานค่ะ",
        ],
        auditOutcome: "DRAFT_STAFF_REVIEW_BLOCKED",
      };
    }
    return {
      ...changed(
        current,
        now,
        "AWAITING_STAFF_REVIEW",
        current.fields,
        [
          `${DRAFT_LABEL}\nส่งร่างให้พนักงานตรวจแล้วค่ะ ร่างนี้ยังไม่ยืนยันสินค้า สต๊อก รอบรับ หรือการชำระเงิน`,
        ],
        "DRAFT_AWAITING_STAFF_REVIEW",
      ),
      enterHandoff: true,
    };
  }

  const submission = parseReservationForm(normalized);
  if (submission === undefined) {
    return {
      ...unchanged(current),
      messages: [draftReservationForm(now)],
      auditOutcome: "DRAFT_INPUT_NOT_RECOGNIZED",
    };
  }
  if (submission.kind === "INVALID") {
    return {
      ...unchanged(current),
      messages: [formatFormIssues(submission.missing, submission.invalid)],
      auditOutcome: "DRAFT_FORM_VALIDATION_REJECTED",
    };
  }
  if (submission.kind === "PRICE_BLOCKED") {
    return {
      ...changed(
        current,
        now,
        "PRICE_BLOCKED",
        submission.fields,
        [
          `${DRAFT_LABEL}\nสินค้านี้ไม่มีราคาใน Approved TEST Catalog จึงไม่คำนวณยอดหรือมัดจำ และต้องให้พนักงานตรวจสอบค่ะ`,
        ],
        "DRAFT_PRICE_BLOCKED",
      ),
      enterHandoff: true,
    };
  }
  try {
    const calculation = calculateDraft(
      submission.fields.items,
      current.pricingPromotion ?? {
        enabled: false,
        revision: 0,
        startAt: 0,
        endAt: 0,
      },
      now,
    );
    const aggregate = revise(
      current,
      now,
      "READY_FOR_REVIEW",
      submission.fields,
    );
    return {
      aggregate,
      changed: true,
      messages: [formatDraftSummary(aggregate, calculation)],
      enterHandoff: false,
      purgePii: false,
      auditOutcome: "DRAFT_FORM_READY_FOR_REVIEW",
    };
  } catch (error) {
    const code = safeDomainError(error);
    const blocked = revise(current, now, "PRICE_BLOCKED", submission.fields);
    return {
      aggregate: blocked,
      changed: true,
      messages: [
        `${DRAFT_LABEL}\nไม่สามารถคำนวณราคา/มัดจำได้ (${code}) กรุณาให้พนักงานตรวจสอบค่ะ`,
      ],
      enterHandoff: true,
      purgePii: false,
      auditOutcome: code,
    };
  }
}

export function calculateDraft(
  lines: readonly DraftLine[],
  promotion: TestPromotion,
  now: number,
): DraftCalculation {
  if (lines.length === 0) throw new Error("PRICE_BLOCKED_EMPTY_DRAFT");
  let eligibleQuantity = 0;
  let nonPromotionSubtotal = 0;
  for (const line of lines) {
    if (
      line.status !== "APPROVED" ||
      line.unitPriceSatang === null ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0
    ) {
      throw new Error("PRICE_BLOCKED_CATALOG_ROW");
    }
    if (line.promotionEligible)
      eligibleQuantity = safeAdd(eligibleQuantity, line.quantity);
    else
      nonPromotionSubtotal = safeAdd(
        nonPromotionSubtotal,
        safeMultiply(line.unitPriceSatang, line.quantity),
      );
  }
  const promotionActive =
    promotion.enabled && now >= promotion.startAt && now < promotion.endAt;
  const promotionGroups = promotionActive
    ? Math.floor(eligibleQuantity / 3)
    : 0;
  const eligibleRemainder = promotionActive
    ? eligibleQuantity % 3
    : eligibleQuantity;
  const eligibleSubtotal = safeAdd(
    safeMultiply(promotionGroups, 10_000),
    safeMultiply(eligibleRemainder, 3_900),
  );
  const subtotalSatang = safeAdd(nonPromotionSubtotal, eligibleSubtotal);
  if (subtotalSatang % 2 !== 0) {
    throw new Error("CALCULATOR_NON_INTEGRAL_DEPOSIT");
  }
  return {
    subtotalSatang,
    proposedDepositSatang: subtotalSatang / 2,
    promotionApplied: promotionGroups > 0,
    promotionGroups,
  };
}

export function repriceDraftForStaff(
  current: DraftAggregate,
  promotion: TestPromotion,
  now: number,
): StaffRepricingResult {
  if (!isDraftActive(current.state) && current.state !== "READY_FOR_REVIEW") {
    throw new Error("DRAFT_REPRICING_STATE_BLOCKED");
  }
  const required = missingRequiredFields(current.fields);
  if (required.length > 0) throw new Error("DRAFT_REPRICING_FIELDS_INCOMPLETE");
  const promotionActive =
    promotion.enabled && now >= promotion.startAt && now < promotion.endAt;
  const snapshot: TestPromotion = {
    ...promotion,
    enabled: promotionActive,
    startAt: 0,
    endAt: Number.MAX_SAFE_INTEGER,
  };
  const calculation = calculateDraft(current.fields.items, snapshot, now);
  const aggregate = revise(
    {
      ...current,
      pricingPromotion: snapshot,
      promotionRevision: promotion.revision,
    },
    now,
    "READY_FOR_REVIEW",
    current.fields,
  );
  return { aggregate, calculation };
}

export function resolveCatalogLine(
  rawName: string,
  quantity: number,
): DraftLine {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 999) {
    throw new Error("INVALID_ITEM_QUANTITY");
  }
  const normalized = normalizeProductName(rawName);
  const wantsSmall = normalized.includes("เล็ก");
  const candidates = APPROVED_TEST_CATALOG.products.filter((product) => {
    const names = [product.displayName, ...product.aliases].map(
      normalizeProductName,
    );
    return names.some(
      (name) => normalized === name || normalized === `${name}เล็ก`,
    );
  });
  const product =
    candidates.find((candidate) =>
      wantsSmall ? candidate.size === "SMALL" : candidate.size === "NORMAL",
    ) ?? candidates.find((candidate) => candidate.size === "OTHER");
  if (!product) {
    return {
      sku: "UNKNOWN",
      displayName: rawName.trim().slice(0, 80),
      size: "OTHER",
      quantity,
      unitPriceSatang: null,
      promotionEligible: false,
      status: "PRICE_BLOCKED",
    };
  }
  return {
    sku: product.sku,
    displayName: product.displayName,
    size: product.size,
    quantity,
    unitPriceSatang: product.unitPriceSatang,
    promotionEligible: product.promotionEligible,
    status: product.status,
  };
}

export function formatDraftSummary(
  aggregate: DraftAggregate,
  calculation: DraftCalculation,
): string {
  const itemLines = aggregate.fields.items.map(
    (line) =>
      `• ${line.displayName}${line.size === "SMALL" ? " (ชิ้นเล็ก)" : ""} x ${line.quantity}`,
  );
  return [
    DRAFT_LABEL,
    `Revision: ${aggregate.revision}`,
    `ชื่อผู้รับ: ${aggregate.fields.name ?? "-"}`,
    `เบอร์โทร: ${aggregate.fields.phone ?? "-"}`,
    `วันรับ: ${aggregate.fields.pickupDate ?? "-"}`,
    `รอบรับ: ${aggregate.fields.pickupSlot ?? "-"}`,
    `วิธีรับ: ${aggregate.fields.pickupMethod ?? "-"}`,
    "รายการ:",
    ...itemLines,
    `ยอดร่าง: ${formatBaht(calculation.subtotalSatang)}`,
    `ข้อเสนอมัดจำ 50%: ${formatBaht(calculation.proposedDepositSatang)}`,
    "ยังไม่ถือว่าได้รับหรือยืนยันการชำระเงิน และต้องให้พนักงานตรวจสอบก่อนทุกครั้ง",
  ].join("\n");
}

type ReservationFormResult =
  | {
      readonly kind: "VALID" | "PRICE_BLOCKED";
      readonly fields: DraftFields;
    }
  | {
      readonly kind: "INVALID";
      readonly missing: readonly string[];
      readonly invalid: readonly string[];
    };

function parseReservationForm(text: string): ReservationFormResult | undefined {
  if (!text.includes("🧾 แบบฟอร์มสั่งจองขนมปัง")) return undefined;
  const values = new Map<string, string>();
  const itemInputs: { readonly name: string; readonly value: string }[] = [];
  const knownFormProducts = new Set<string>(FORM_PRODUCT_NAMES);
  for (const rawLine of text.split(/\r?\n/u)) {
    const match = /^([^:：\n]{1,80})[:：]\s*(.*)$/u.exec(rawLine.trim());
    if (!match?.[1]) continue;
    const key = match[1].trim();
    const value = (match[2] ?? "").trim();
    if (
      [
        "ชื่อผู้รับ",
        "เบอร์โทร",
        "วันรับ",
        "รอบรับ",
        "วิธีรับ",
        "หมายเหตุ",
      ].includes(key)
    ) {
      values.set(key, value);
      continue;
    }
    if (key === "📝 รายการที่ต้องการ") continue;
    if (
      knownFormProducts.has(key) ||
      APPROVED_TEST_CATALOG.products.some((product) =>
        [product.displayName, ...product.aliases].some(
          (name) => normalizeProductName(key) === normalizeProductName(name),
        ),
      ) ||
      value.length > 0
    ) {
      itemInputs.push({ name: key, value });
    }
  }

  const missing: string[] = [];
  const invalid: string[] = [];
  const name = values.get("ชื่อผู้รับ") ?? "";
  const phone = values.get("เบอร์โทร") ?? "";
  const pickupDate = stripPickupDateInstruction(values.get("วันรับ") ?? "");
  const pickupSlot = values.get("รอบรับ") ?? "";
  const pickupMethod = values.get("วิธีรับ") ?? "";
  const notesValue = values.get("หมายเหตุ") ?? "";

  validateRequiredText("ชื่อผู้รับ", name, 100, missing, invalid);
  if (!phone) missing.push("เบอร์โทร");
  else if (!/^[0-9+ -]{8,20}$/u.test(phone)) invalid.push("เบอร์โทร");
  validateRequiredText("วันรับ", pickupDate, 40, missing, invalid);
  if (!pickupSlot) missing.push("รอบรับ");
  else if (!(DRAFT_PICKUP_SLOTS as readonly string[]).includes(pickupSlot))
    invalid.push("รอบรับ");
  if (!pickupMethod) missing.push("วิธีรับ");
  else if (!["รับที่ร้าน", "จัดส่ง"].includes(pickupMethod))
    invalid.push("วิธีรับ");

  const items: DraftLine[] = [];
  let hasItemInput = false;
  let priceBlocked = false;
  for (const input of itemInputs) {
    if (input.value === "") continue;
    hasItemInput = true;
    if (!/^[1-9]\d{0,2}$/u.test(input.value)) {
      invalid.push(input.name);
      continue;
    }
    const line = resolveCatalogLine(input.name, Number(input.value));
    if (line.status === "PRICE_BLOCKED") priceBlocked = true;
    const existingIndex = items.findIndex((item) => item.sku === line.sku);
    if (existingIndex === -1) items.push(line);
    else {
      const existing = items[existingIndex];
      if (!existing) continue;
      const quantity = safeAdd(existing.quantity, line.quantity);
      if (quantity > 999) {
        invalid.push(input.name);
        continue;
      }
      items[existingIndex] = { ...existing, quantity };
    }
  }
  if (!hasItemInput) missing.push("รายการสินค้า");
  if (missing.length > 0 || invalid.length > 0) {
    return {
      kind: "INVALID",
      missing: unique(missing),
      invalid: unique(invalid),
    };
  }

  const notes = notesValue === "(ถ้ามี)" ? undefined : notesValue.slice(0, 500);
  const fields: DraftFields = {
    name,
    phone,
    pickupDate,
    pickupSlot,
    pickupMethod,
    ...(notes ? { notes } : {}),
    items,
  };
  return { kind: priceBlocked ? "PRICE_BLOCKED" : "VALID", fields };
}

function stripPickupDateInstruction(value: string): string {
  return value
    .replace(/\s*\(หากต้องการรับวันอื่น กรุณาแก้ไขวันที่\)\s*$/u, "")
    .trim();
}

function validateRequiredText(
  field: string,
  value: string,
  maxLength: number,
  missing: string[],
  invalid: string[],
): void {
  if (!value) missing.push(field);
  else if (value.length > maxLength) invalid.push(field);
}

function formatFormIssues(
  missing: readonly string[],
  invalid: readonly string[],
): string {
  const messages: string[] = [];
  if (missing.length > 0) messages.push(`ยังขาดข้อมูล: ${missing.join(", ")}`);
  if (invalid.length > 0)
    messages.push(`ข้อมูลไม่ถูกต้อง: ${invalid.join(", ")}`);
  return `${messages.join("\n")} ค่ะ`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function changed(
  current: DraftAggregate,
  now: number,
  state: DraftState,
  fields: DraftFields,
  messages: readonly string[],
  auditOutcome: string,
): DraftTransition {
  return {
    aggregate: revise(current, now, state, fields),
    changed: true,
    messages,
    enterHandoff: false,
    purgePii: false,
    auditOutcome,
  };
}

function revise(
  current: DraftAggregate,
  now: number,
  state: DraftState,
  fields: DraftFields,
  extra: { readonly promotionRevision?: number } = {},
): DraftAggregate {
  const base = {
    ...current,
    state,
    fields,
    revision: current.revision + 1,
    updatedAt: now,
    expiresAt: now + DRAFT_TTL_MS,
  };
  return extra.promotionRevision === undefined
    ? base
    : { ...base, promotionRevision: extra.promotionRevision };
}

function unchanged(current: DraftAggregate): DraftTransition {
  return {
    aggregate: current,
    changed: false,
    messages: [],
    enterHandoff: false,
    purgePii: false,
    auditOutcome: "DRAFT_NOT_HANDLED",
  };
}

function isTerminal(state: DraftState): boolean {
  return ["CANCELLED", "EXPIRED_PURGED", "FAILED_REVIEW"].includes(state);
}

function missingRequiredFields(fields: DraftFields): string[] {
  const missing: string[] = [];
  if (!fields.name) missing.push("ชื่อผู้รับ");
  if (!fields.phone) missing.push("เบอร์โทร");
  if (!fields.pickupDate) missing.push("วันรับ");
  if (!fields.pickupSlot) missing.push("รอบรับ");
  if (!fields.pickupMethod) missing.push("วิธีรับ");
  if (fields.items.length === 0) missing.push("รายการสินค้า");
  return missing;
}

function normalizeProductName(value: string): string {
  return value
    .toLocaleLowerCase("th-TH")
    .replace(/[\s()+]/g, "")
    .trim();
}

function formatBaht(satang: number): string {
  return `${(satang / 100).toFixed(2)} บาท`;
}

function safeAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new Error("CALCULATOR_OVERFLOW");
  return result;
}

function safeMultiply(left: number, right: number): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) throw new Error("CALCULATOR_OVERFLOW");
  return result;
}

function safeDomainError(error: unknown): string {
  const value = error instanceof Error ? error.message : "DRAFT_FAILED_REVIEW";
  return /^[A-Z0-9_]{1,80}$/.test(value) ? value : "DRAFT_FAILED_REVIEW";
}

function validateCatalog(value: unknown): ApprovedCatalog {
  if (typeof value !== "object" || value === null)
    throw new Error("CATALOG_INVALID");
  const candidate = value as Partial<ApprovedCatalog>;
  if (
    typeof candidate.catalogVersion !== "string" ||
    typeof candidate.checksum !== "string" ||
    candidate.approval?.status !== "APPROVED" ||
    !Array.isArray(candidate.products) ||
    candidate.products.length === 0
  ) {
    throw new Error("CATALOG_INVALID");
  }
  return candidate as ApprovedCatalog;
}
