import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  calculateReceiptPoints,
  evaluateProductionReadiness,
  isAuthorizedIssuer,
  lookupApprovedBusinessData,
  postAwardRefundDecision,
  PRODUCTION_LOYALTY_POLICY,
  REQUIRED_BUSINESS_CATEGORIES,
  validateProductionBusinessManifest,
  type BusinessCategory,
  type PointDecisionInput,
  type ProductionBusinessManifest,
  type ProductionReadinessEvidence,
} from "../src/production-readiness/index.js";

const basePointInput: PointDecisionInput = {
  netAfterDiscountSatang: 5_000,
  paymentState: "PAID",
  qrState: "UNUSED",
  receiptAwardState: "NOT_AWARDED",
  issuerRole: "SHIFT_LEAD",
  daysSinceLaunch: 1,
  qrIssuedAtEpochMs: 1_000_000,
  evaluatedAtEpochMs: 1_300_000,
};

describe("Production loyalty policy — local fail-closed model", () => {
  it("records the exact Owner-approved business rules", () => {
    expect(PRODUCTION_LOYALTY_POLICY).toMatchObject({
      accountName: "มะลิปัง",
      earningBahtPerPoint: 50,
      goalPoints: 50,
      qualifyingSpendBaht: 2_500,
      rewardName: "ตุ๊กตามะลิจัง 1 ตัว",
      maximumRewardLandedCostBaht: 25,
      cardValidityMonthsFromReceipt: 12,
      voucherValidityDaysFromIssue: 60,
      voucherPerReceipt: 1,
      voucherCashExchangeAllowed: false,
      voucherStackingAllowed: false,
      voucherValueEarnsPoints: false,
      markVoucherUsedOnlyAfterRewardHandover: true,
      welcomeBonusPoints: 0,
      reminder: "NONE",
      dailyCooldown: false,
      qrMode: "ONE_TIME_PER_RECEIPT",
      qrTargetLifetimeMinutes: 10,
      workerLogRetentionDays: 7,
      reconciliationRetentionDays: 90,
      configIncidentRetentionDays: 365,
    });
  });

  it.each([
    [0, 0],
    [49, 0],
    [50, 1],
    [99, 1],
    [100, 2],
    [249, 4],
    [2_500, 50],
  ])("uses floor(net after discount / 50): %i baht -> %i", (baht, points) => {
    expect(
      calculateReceiptPoints({
        ...basePointInput,
        netAfterDiscountSatang: baht * 100,
      }).points,
    ).toBe(points);
  });

  it("awards 2 points for the approved promo example net 100 baht", () => {
    expect(
      calculateReceiptPoints({
        ...basePointInput,
        netAfterDiscountSatang: 10_000,
      }),
    ).toEqual({ status: "ELIGIBLE", points: 2, reasonCode: "ELIGIBLE" });
  });

  it.each([
    [{ paymentState: "UNPAID" }, "RECEIPT_NOT_PAID"],
    [{ paymentState: "CANCELLED" }, "RECEIPT_CANCELLED"],
    [{ paymentState: "REFUNDED" }, "RECEIPT_REFUNDED"],
    [{ receiptAwardState: "ALREADY_AWARDED" }, "RECEIPT_ALREADY_AWARDED"],
    [{ qrState: "USED" }, "QR_ALREADY_USED"],
    [{ qrState: "EXPIRED" }, "QR_EXPIRED"],
  ] as const)("blocks ineligible receipt/QR state: %s", (override, reason) => {
    expect(calculateReceiptPoints({ ...basePointInput, ...override })).toEqual({
      status: "BLOCKED",
      points: 0,
      reasonCode: reason,
    });
  });

  it("models the 10-minute target locally and fails closed after it", () => {
    expect(
      calculateReceiptPoints({
        ...basePointInput,
        evaluatedAtEpochMs: basePointInput.qrIssuedAtEpochMs + 10 * 60 * 1_000,
      }).status,
    ).toBe("ELIGIBLE");
    expect(
      calculateReceiptPoints({
        ...basePointInput,
        evaluatedAtEpochMs:
          basePointInput.qrIssuedAtEpochMs + 10 * 60 * 1_000 + 1,
      }).reasonCode,
    ).toBe("QR_EXPIRED");
  });

  it("keeps QR issuance restricted to Owner/Shift lead after day 30", () => {
    expect(isAuthorizedIssuer("OWNER", 0)).toBe(true);
    expect(isAuthorizedIssuer("SHIFT_LEAD", 29)).toBe(true);
    expect(isAuthorizedIssuer("OWNER", 31)).toBe(true);
    expect(isAuthorizedIssuer("SHIFT_LEAD", 365)).toBe(true);
    expect(isAuthorizedIssuer("STAFF", 1)).toBe(false);
    expect(isAuthorizedIssuer("STAFF", 31)).toBe(false);
  });

  it("never adjusts post-award refunds automatically", () => {
    expect(postAwardRefundDecision()).toEqual({
      automaticPointAdjustment: 0,
      action: "OWNER_RECONCILIATION_REQUIRED",
      retainForDays: 90,
    });
  });
});

describe("Production authoritative business manifest", () => {
  it("validates the committed fail-closed manifest", async () => {
    const manifest = await loadBusinessManifest();
    expect(validateProductionBusinessManifest(manifest)).toEqual([]);
    for (const category of REQUIRED_BUSINESS_CATEGORIES) {
      expect(
        lookupApprovedBusinessData(manifest, category, new Date("2026-08-28"))
          .status,
      ).toBe("BLOCKED");
    }
  });

  it("returns a traceable value only inside an approved effective window", () => {
    const record = {
      status: "APPROVED" as const,
      sourceClassification: "OWNER_APPROVED_REPOSITORY_RECORD" as const,
      owner: "OWNER",
      approvedAt: "2026-08-28T00:00:00+07:00",
      effectiveFrom: "2026-09-01T00:00:00+07:00",
      effectiveTo: "2026-10-01T00:00:00+07:00",
      reviewAt: "2026-09-15T00:00:00+07:00",
      version: "production-menu-v1",
      checksum: "fixture-checksum",
      customerFacingValue: "ข้อมูลที่ Owner อนุมัติสำหรับ fixture",
    };
    const manifest: ProductionBusinessManifest = {
      schemaVersion: 1,
      environment: "PRODUCTION",
      accountName: "มะลิปัง",
      defaultBehavior: "FAIL_CLOSED",
      categories: Object.fromEntries(
        REQUIRED_BUSINESS_CATEGORIES.map((category) => [category, record]),
      ) as Record<BusinessCategory, typeof record>,
    };
    expect(
      lookupApprovedBusinessData(
        manifest,
        "MENU",
        new Date("2026-09-10T00:00:00+07:00"),
      ),
    ).toEqual({
      status: "APPROVED",
      value: record.customerFacingValue,
      version: "production-menu-v1",
    });
    expect(
      lookupApprovedBusinessData(
        manifest,
        "MENU",
        new Date("2026-09-16T00:00:00+07:00"),
      ).status,
    ).toBe("BLOCKED");
  });

  it("rejects TEST data and customer-facing values on blocked records", () => {
    const invalid = {
      schemaVersion: 1,
      environment: "PRODUCTION",
      accountName: "มะลิปัง",
      defaultBehavior: "FAIL_CLOSED",
      categories: Object.fromEntries(
        REQUIRED_BUSINESS_CATEGORIES.map((category) => [
          category,
          {
            status: "BLOCKED",
            sourceClassification: "TEST_EVIDENCE_ONLY",
            blockerCode: "BLOCKED",
            fallback: "SAFE_FALLBACK",
            customerFacingValue: "TEST_SEED",
          },
        ]),
      ),
    };
    const errors = validateProductionBusinessManifest(invalid);
    expect(errors).toContain("MENU_BLOCKED_VALUE_PROHIBITED");
  });
});

describe("Final Production readiness decision", () => {
  it("keeps the current package NO-GO with evidence-specific blockers", () => {
    const result = evaluateProductionReadiness(currentEvidence());
    expect(result.decision).toBe("NO_GO");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "LINE_QR_TTL_BLOCKER",
        "LINE_MULTI_POINT_QR_BLOCKER",
        "LINE_VOUCHER_EXPIRY_BLOCKER",
        "AUTHORITATIVE_DATA_BLOCKER_MENU",
        "AUTHORITATIVE_DATA_BLOCKER_ALLERGEN",
        "PRODUCTION_RESOURCE_CAPTURE_BLOCKER",
        "EXISTING_REWARD_CARD_POLICY_BLOCKER",
        "EXISTING_QR_POLICY_BLOCKER",
        "WORKER_LOG_RETENTION_BLOCKER",
        "ROLLBACK_REHEARSAL_BLOCKER",
      ]),
    );
    expect(result.blockers).not.toContain("COGS_BLOCKER");
    expect(result.blockers).toContain("LINE_ROLLING_EXPIRY_BLOCKER");
    expect(result.blockers).not.toContain("LINE_ONE_TIME_QR_BLOCKER");
  });

  it("accepts the Owner landed-cost ceiling attestation without inventing a value", () => {
    const result = evaluateProductionReadiness({
      ...currentEvidence(),
      authoritativeCategories: Object.fromEntries(
        REQUIRED_BUSINESS_CATEGORIES.map((category) => [category, "APPROVED"]),
      ),
      lineCapabilities: {
        rollingCardExpiryFromReceipt: "SUPPORTED",
        oneTimeQr: "SUPPORTED",
        tenMinuteQrExpiry: "SUPPORTED",
        multiPointOneTimeQr: "SUPPORTED",
        sixtyDayVoucherExpiry: "SUPPORTED",
      },
      productionResourcesCaptured: true,
      existingRewardCardPolicyConforms: true,
      existingQrPolicyConforms: true,
      sevenDayWorkerLogRetentionReady: true,
      rollbackRehearsed: true,
      finalOwnerGo: true,
    });
    expect(result.decision).toBe("GO");
    expect(result.blockers).not.toContain("COGS_BLOCKER");
  });

  it("blocks a reward landed cost above 25 baht without inventing a value", () => {
    const evidence = currentEvidence();
    const result = evaluateProductionReadiness({
      ...evidence,
      rewardLandedCostBaht: 25.01,
      rewardLandedCostEvidenceStatus: "VERIFIED",
    });
    expect(result.blockers).toContain("COGS_EXCEEDS_LIMIT");
    expect(result.blockers).not.toContain("COGS_BLOCKER");
  });

  it("can return GO only when every explicit gate has evidence", () => {
    const categories = Object.fromEntries(
      REQUIRED_BUSINESS_CATEGORIES.map((category) => [category, "APPROVED"]),
    ) as Record<BusinessCategory, "APPROVED">;
    expect(
      evaluateProductionReadiness({
        rewardLandedCostBaht: 25,
        rewardLandedCostEvidenceStatus: "VERIFIED",
        lineCapabilities: {
          rollingCardExpiryFromReceipt: "SUPPORTED",
          oneTimeQr: "SUPPORTED",
          tenMinuteQrExpiry: "SUPPORTED",
          multiPointOneTimeQr: "SUPPORTED",
          sixtyDayVoucherExpiry: "SUPPORTED",
        },
        authoritativeCategories: categories,
        productionResourcesCaptured: true,
        existingRewardCardPolicyConforms: true,
        existingQrPolicyConforms: true,
        sevenDayWorkerLogRetentionReady: true,
        rollbackRehearsed: true,
        finalOwnerGo: true,
      }).decision,
    ).toBe("GO");
  });
});

function currentEvidence(): ProductionReadinessEvidence {
  return {
    rewardLandedCostBaht: null,
    rewardLandedCostEvidenceStatus: "OWNER_ATTESTED_AT_OR_BELOW_CAP",
    lineCapabilities: {
      rollingCardExpiryFromReceipt: "NOT_VERIFIED",
      oneTimeQr: "SUPPORTED",
      tenMinuteQrExpiry: "NOT_VERIFIED",
      multiPointOneTimeQr: "NOT_VERIFIED",
      sixtyDayVoucherExpiry: "NOT_VERIFIED",
    },
    authoritativeCategories: Object.fromEntries(
      REQUIRED_BUSINESS_CATEGORIES.map((category) => [category, "BLOCKED"]),
    ),
    productionResourcesCaptured: false,
    existingRewardCardPolicyConforms: false,
    existingQrPolicyConforms: false,
    sevenDayWorkerLogRetentionReady: false,
    rollbackRehearsed: false,
    finalOwnerGo: true,
  };
}

async function loadBusinessManifest(): Promise<ProductionBusinessManifest> {
  const raw: unknown = JSON.parse(
    await readFile(
      new URL(
        "../config/production-readiness/production-business-manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (validateProductionBusinessManifest(raw).length > 0) {
    throw new Error("INVALID_TEST_FIXTURE_MANIFEST");
  }
  return raw as ProductionBusinessManifest;
}
