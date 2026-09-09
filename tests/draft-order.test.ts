import { describe, expect, it } from "vitest";

import {
  APPROVED_TEST_CATALOG,
  DRAFT_CONSENT_TEXT,
  DRAFT_LABEL,
  DRAFT_PICKUP_SLOTS,
  DRAFT_TTL_MS,
  calculateDraft,
  draftReservationForm,
  formatDraftSummary,
  newDraft,
  repriceDraftForStaff,
  resolveCatalogLine,
  transitionDraft,
  type DraftAggregate,
  type DraftLine,
  type TestPromotion,
} from "../src/draft-order.js";
import {
  DISABLED_TEST_PROMOTION,
  authorizeTestPromotionChange,
} from "../src/test-promotion-control.js";

const now = Date.UTC(2026, 8, 1, 2, 0, 0);
const activePromotion: TestPromotion = {
  enabled: true,
  revision: 3,
  startAt: now - 1_000,
  endAt: now + 60_000,
};

describe("Issue #2 approved TEST product catalog", () => {
  it("uses only the versioned approved catalog with approval provenance", () => {
    expect(APPROVED_TEST_CATALOG.catalogVersion).toBe("TEST-2026-09-01-v1");
    expect(APPROVED_TEST_CATALOG.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(APPROVED_TEST_CATALOG.approval).toMatchObject({
      status: "APPROVED",
      ownerDecisionDate: "2026-09-01",
    });
  });

  it.each(["ฮาวายเอี้ยน", "ทูน่าคอร์นสลัด", "ทรัฟเฟิลแฮมชีส"])(
    "prices approved normal bread %s at 39 baht",
    (name) => {
      expect(resolveCatalogLine(name, 1)).toMatchObject({
        size: "NORMAL",
        unitPriceSatang: 3900,
        status: "APPROVED",
      });
    },
  );

  it.each(["ฝอยทอง", "ถั่วแดง", "เผือก", "สังขยา", "แฮมชีส", "เนยสด"])(
    "prices approved small bread %s at 20 baht only when marked small",
    (name) => {
      expect(resolveCatalogLine(`${name}เล็ก`, 1)).toMatchObject({
        size: "SMALL",
        unitPriceSatang: 2000,
        promotionEligible: false,
      });
      expect(resolveCatalogLine(name, 1)).toMatchObject({
        size: "NORMAL",
        unitPriceSatang: 3900,
      });
    },
  );

  it("canonicalizes the legacy sausage-ham alias", () => {
    expect(resolveCatalogLine("ไส้กรอกแฮม", 2)).toMatchObject({
      sku: "BR-N-HAM-SAUSAGE",
      displayName: "แฮมไส้กรอก",
      quantity: 2,
    });
  });

  it.each(["ชิฟฟ่อน", "คุกกี้", "บัตเตอร์เลมอน", "สินค้าที่ไม่มีในแคตตาล็อก"])(
    "fails closed with PRICE_BLOCKED for %s",
    (name) => {
      expect(resolveCatalogLine(name, 1)).toMatchObject({
        status: "PRICE_BLOCKED",
        unitPriceSatang: null,
      });
    },
  );
});

describe("Issue #2 deterministic satang calculator", () => {
  it("keeps the 3-for-100 promotion disabled by default", () => {
    const calculation = calculateDraft(
      [resolveCatalogLine("แฮมชีส", 3)],
      DISABLED_TEST_PROMOTION,
      now,
    );
    expect(calculation).toEqual({
      subtotalSatang: 11_700,
      proposedDepositSatang: 5_850,
      promotionApplied: false,
      promotionGroups: 0,
    });
  });

  it("groups eligible mixed normal bread three at a time and charges extras normally", () => {
    const calculation = calculateDraft(
      [resolveCatalogLine("แฮมชีส", 2), resolveCatalogLine("เนยสด", 2)],
      activePromotion,
      now,
    );
    expect(calculation).toEqual({
      subtotalSatang: 13_900,
      proposedDepositSatang: 6_950,
      promotionApplied: true,
      promotionGroups: 1,
    });
  });

  it("excludes small bread from the promotion", () => {
    const calculation = calculateDraft(
      [resolveCatalogLine("แฮมชีส", 3), resolveCatalogLine("เนยสดเล็ก", 1)],
      activePromotion,
      now,
    );
    expect(calculation.subtotalSatang).toBe(12_000);
    expect(calculation.proposedDepositSatang).toBe(6_000);
  });

  it("does not apply an enabled promotion outside its effective window", () => {
    const calculation = calculateDraft(
      [resolveCatalogLine("แฮมชีส", 3)],
      { ...activePromotion, endAt: now },
      now,
    );
    expect(calculation.promotionApplied).toBe(false);
    expect(calculation.subtotalSatang).toBe(11_700);
  });

  it("fails closed for unknown prices and integer overflow", () => {
    expect(() =>
      calculateDraft(
        [resolveCatalogLine("unknown", 1)],
        DISABLED_TEST_PROMOTION,
        now,
      ),
    ).toThrow("PRICE_BLOCKED_CATALOG_ROW");
    const overflowLine: DraftLine = {
      ...resolveCatalogLine("แฮมชีส", 1),
      quantity: Number.MAX_SAFE_INTEGER,
    };
    expect(() =>
      calculateDraft([overflowLine], DISABLED_TEST_PROMOTION, now),
    ).toThrow("CALCULATOR_OVERFLOW");
  });
});

describe("Issue #2 Draft Order state machine", () => {
  it("requires exact consent before showing the one-message reservation form", () => {
    const requested = transitionDraft(
      newDraft(now),
      "พรีออเดอร์",
      now,
      true,
      DISABLED_TEST_PROMOTION,
    );
    expect(requested.aggregate.state).toBe("CONSENT_REQUIRED");
    expect(requested.messages).toEqual([DRAFT_CONSENT_TEXT]);
    const rejected = transitionDraft(
      requested.aggregate,
      "ตกลง",
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(rejected.aggregate.state).toBe("CONSENT_REQUIRED");
    const granted = transitionDraft(
      requested.aggregate,
      "ยินยอม",
      now + 2,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(granted.aggregate.state).toBe("COLLECTING");
    expect(granted.aggregate.consentedAt).toBe(now + 2);
    expect(granted.messages).toEqual([draftReservationForm(now + 2)]);
    expect(granted.messages[0]).toContain(
      "วันรับ: 1 กันยายน 2569 (หากต้องการรับวันอื่น กรุณาแก้ไขวันที่)",
    );
    expect(granted.messages[0]).toContain("รอบรับ: 08:00 / 11:00 / 14:00");
    expect(granted.messages[0]).not.toContain("16:00");
  });

  it("uses the Bangkok Buddhist date dynamically across the local-day boundary", () => {
    const beforeMidnight = Date.UTC(2026, 8, 1, 16, 59, 59);
    const afterMidnight = Date.UTC(2026, 8, 1, 17, 0, 0);
    expect(draftReservationForm(beforeMidnight)).toContain(
      "วันรับ: 1 กันยายน 2569",
    );
    expect(draftReservationForm(afterMidnight)).toContain(
      "วันรับ: 2 กันยายน 2569",
    );
  });

  it("creates exactly one revision, total, and summary from one completed form", () => {
    const aggregate = collectingDraft();
    const result = transitionDraft(
      aggregate,
      completedForm(),
      now + 10,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(result.aggregate.state).toBe("READY_FOR_REVIEW");
    expect(result.aggregate.revision).toBe(aggregate.revision + 1);
    expect(result.aggregate.expiresAt).toBe(now + 10 + DRAFT_TTL_MS);
    expect(result.aggregate.fields.items).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain(DRAFT_LABEL);
    expect(result.messages[0]).toContain("ยอดร่าง: 78.00 บาท");
    expect(result.messages[0]).toContain("ข้อเสนอมัดจำ 50%: 39.00 บาท");
    expect(result.messages[0]).not.toContain("บันทึกในร่างแล้ว");
  });

  it("rejects incomplete or invalid forms atomically and names only affected fields", () => {
    const aggregate = collectingDraft();
    const blankItems = transitionDraft(
      aggregate,
      completedForm({ items: [] }),
      now + 10,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(blankItems.aggregate).toEqual(aggregate);
    expect(blankItems.messages).toEqual(["ยังขาดข้อมูล: รายการสินค้า ค่ะ"]);

    const invalid = transitionDraft(
      aggregate,
      completedForm({ phone: "abc", slot: "10:30", items: [["แฮมชีส", "0"]] }),
      now + 11,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(invalid.aggregate).toEqual(aggregate);
    expect(invalid.messages).toEqual([
      "ข้อมูลไม่ถูกต้อง: เบอร์โทร, รอบรับ, แฮมชีส ค่ะ",
    ]);
    expect(invalid.messages[0]).not.toContain("มะลิ");
  });

  it.each(["0", "-1", "1.5", "สอง"])(
    "rejects non-positive or non-integer item quantity %s without a revision",
    (quantity) => {
      const aggregate = collectingDraft();
      const result = transitionDraft(
        aggregate,
        completedForm({ items: [["แฮมชีส", quantity]] }),
        now + 12,
        false,
        DISABLED_TEST_PROMOTION,
      );
      expect(result.aggregate).toEqual(aggregate);
      expect(result.messages).toEqual(["ข้อมูลไม่ถูกต้อง: แฮมชีส ค่ะ"]);
    },
  );

  it("snapshots promotion eligibility only when a new Draft starts", () => {
    const started = transitionDraft(
      newDraft(now),
      "พรีออเดอร์",
      now,
      true,
      activePromotion,
    );
    expect(started.aggregate.pricingPromotion).toMatchObject({
      enabled: true,
      revision: 3,
    });
    const laterDisabled = transitionDraft(
      started.aggregate,
      "ยินยอม",
      now + 2,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(laterDisabled.aggregate.pricingPromotion).toMatchObject({
      enabled: true,
      revision: 3,
    });
  });

  it("recalculates an existing Draft only through an explicit staff revision", () => {
    const current = completeDraft();
    expect(current.state).toBe("READY_FOR_REVIEW");
    const staffRevision = repriceDraftForStaff(
      current,
      activePromotion,
      now + 20,
    );
    expect(staffRevision.aggregate.revision).toBe(current.revision + 1);
    expect(staffRevision.calculation).toMatchObject({
      subtotalSatang: 10_000,
      proposedDepositSatang: 5_000,
      promotionApplied: true,
    });
  });

  it("supports an approved manually typed small SKU even though it is not listed", () => {
    const result = transitionDraft(
      collectingDraft(),
      completedForm({ items: [["แฮมชีสเล็ก", "2"]] }),
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(result.aggregate.fields.items).toEqual([
      expect.objectContaining({
        sku: "BR-S-HAM-CHEESE",
        size: "SMALL",
        quantity: 2,
        unitPriceSatang: 2_000,
      }),
    ]);
    expect(result.messages[0]).toContain("ยอดร่าง: 40.00 บาท");
  });

  it("moves unknown products to PRICE_BLOCKED without subtotal/deposit and enters handoff", () => {
    const result = transitionDraft(
      collectingDraft(),
      completedForm({ items: [["ชิฟฟ่อน", "2"]] }),
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(result.aggregate.state).toBe("PRICE_BLOCKED");
    expect(result.enterHandoff).toBe(true);
    expect(result.messages.join(" ")).not.toMatch(/ยอดร่าง:|มัดจำ 50%: \d/);
  });

  it("fails closed when an unapproved product is manually marked small", () => {
    const result = transitionDraft(
      collectingDraft(),
      completedForm({ items: [["ไส้กรอกเล็ก", "1"]] }),
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(result.aggregate.state).toBe("PRICE_BLOCKED");
    expect(result.enterHandoff).toBe(true);
    expect(result.messages[0]).not.toMatch(/ยอดร่าง:|ข้อเสนอมัดจำ/);
  });

  it("keeps 16:00 in runtime policy while omitting it from the new form", () => {
    expect(DRAFT_PICKUP_SLOTS).toContain("16:00");
    const result = transitionDraft(
      collectingDraft(),
      completedForm({ slot: "16:00" }),
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(result.aggregate.state).toBe("READY_FOR_REVIEW");
    expect(result.aggregate.fields.pickupSlot).toBe("16:00");
  });

  it("automatically builds an unconfirmed summary and only hands it to staff on command", () => {
    const aggregate = completeDraft();
    const review = transitionDraft(
      aggregate,
      "ส่งให้พนักงานตรวจ",
      now + 21,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(review.aggregate.state).toBe("AWAITING_STAFF_REVIEW");
    expect(review.enterHandoff).toBe(true);
  });

  it("purges PII on expiry and cancellation with redacted outcomes", () => {
    const aggregate = completeDraft();
    const expired = transitionDraft(
      { ...aggregate, expiresAt: now },
      "สรุปร่าง",
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(expired.aggregate.state).toBe("EXPIRED_PURGED");
    expect(expired.aggregate.fields).toEqual({ items: [] });
    expect(expired.auditOutcome).toBe("DRAFT_EXPIRED_PII_PURGED");
    const cancelled = transitionDraft(
      aggregate,
      "ยกเลิกร่าง",
      now + 1,
      false,
      DISABLED_TEST_PROMOTION,
    );
    expect(cancelled.aggregate.state).toBe("CANCELLED");
    expect(cancelled.aggregate.fields).toEqual({ items: [] });
  });

  it("never exposes forbidden order/payment states", () => {
    const forbidden = [
      "CONFIRMED",
      "PAID",
      "STOCK_RESERVED",
      "PAYMENT_VERIFIED",
    ];
    const source = JSON.stringify({
      newDraft,
      transitionDraft,
      formatDraftSummary,
    });
    for (const state of forbidden) expect(source).not.toContain(state);
  });
});

describe("TEST-only promotion authorization", () => {
  const request = {
    environment: "TEST",
    accountName: "มะลิปัง TEST",
    ownerId: "OWNER_TEST",
    ownerAllowlist: "OWNER_TEST",
    enabled: true,
    startAt: now,
    endAt: now + 60_000,
  } as const;

  it.each([true, false])(
    "authorizes OWNER_TEST to set enabled=%s",
    (enabled) => {
      expect(authorizeTestPromotionChange({ ...request, enabled })).toEqual({
        enabled,
        startAt: now,
        endAt: now + 60_000,
      });
    },
  );

  it("accepts an end time at 23:59:59 on the same Bangkok day", () => {
    const startAt = Date.UTC(2026, 8, 1, 2, 0, 0);
    const endAt = Date.UTC(2026, 8, 1, 16, 59, 59);
    expect(
      authorizeTestPromotionChange({ ...request, startAt, endAt }),
    ).toMatchObject({ startAt, endAt });
  });

  it.each([
    [
      { ...request, environment: "PRODUCTION" },
      "PROMOTION_FAIL_CLOSED_NON_TEST",
    ],
    [{ ...request, accountName: "มะลิปัง" }, "PROMOTION_FAIL_CLOSED_NON_TEST"],
    [{ ...request, ownerAllowlist: "" }, "PROMOTION_OWNER_ALLOWLIST_MISSING"],
    [{ ...request, ownerId: "STAFF_ONLY" }, "PROMOTION_OWNER_NOT_AUTHORIZED"],
    [
      {
        ...request,
        startAt: Date.UTC(2026, 8, 1, 16, 59, 59),
        endAt: Date.UTC(2026, 8, 1, 17, 0, 0),
      },
      "PROMOTION_RANGE_CROSSES_BANGKOK_DAY",
    ],
    [
      { ...request, startAt: now + 60_000, endAt: now },
      "PROMOTION_END_NOT_AFTER_START",
    ],
    [{ ...request, startAt: now, endAt: now }, "PROMOTION_END_NOT_AFTER_START"],
    [{ ...request, startAt: now + 1 }, "PROMOTION_TIMESTAMP_PRECISION_INVALID"],
  ] as const)("fails closed for unsafe promotion control", (input, code) => {
    expect(() => authorizeTestPromotionChange(input)).toThrow(code);
  });
});

function collectingDraft(): DraftAggregate {
  const requested = transitionDraft(
    newDraft(now),
    "พรีออเดอร์",
    now,
    true,
    DISABLED_TEST_PROMOTION,
  );
  return transitionDraft(
    requested.aggregate,
    "ยินยอม",
    now + 1,
    false,
    DISABLED_TEST_PROMOTION,
  ).aggregate;
}

function completeDraft(): DraftAggregate {
  return transitionDraft(
    collectingDraft(),
    completedForm({ items: [["แฮมชีส", "3"]] }),
    now + 2,
    false,
    DISABLED_TEST_PROMOTION,
  ).aggregate;
}

function completedForm(
  overrides: {
    readonly name?: string;
    readonly phone?: string;
    readonly date?: string;
    readonly slot?: string;
    readonly method?: string;
    readonly items?: readonly (readonly [string, string])[];
  } = {},
): string {
  let form = draftReservationForm(now);
  form = replaceFormLine(form, "ชื่อผู้รับ", overrides.name ?? "มะลิ");
  form = replaceFormLine(form, "เบอร์โทร", overrides.phone ?? "0812345678");
  if (overrides.date !== undefined)
    form = replaceFormLine(form, "วันรับ", overrides.date);
  form = replaceFormLine(form, "รอบรับ", overrides.slot ?? "11:00");
  form = replaceFormLine(form, "วิธีรับ", overrides.method ?? "รับที่ร้าน");
  for (const [product, quantity] of overrides.items ?? [["แฮมชีส", "2"]]) {
    if (form.includes(`${product}:`))
      form = replaceFormLine(form, product, quantity);
    else form += `\n${product}: ${quantity}`;
  }
  return form;
}

function replaceFormLine(form: string, key: string, value: string): string {
  return form
    .split("\n")
    .map((line) => (line.startsWith(`${key}:`) ? `${key}: ${value}` : line))
    .join("\n");
}
