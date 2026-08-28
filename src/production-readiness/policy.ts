export const PRODUCTION_LOYALTY_POLICY = {
  accountName: "มะลิปัง",
  earningBahtPerPoint: 50,
  earningSatangPerPoint: 5_000,
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
  openingControlDays: 30,
  workerLogRetentionDays: 7,
  reconciliationRetentionDays: 90,
  configIncidentRetentionDays: 365,
} as const;

export type PaymentState = "PAID" | "UNPAID" | "CANCELLED" | "REFUNDED";
export type QrState = "UNUSED" | "USED" | "EXPIRED";
export type ReceiptAwardState = "NOT_AWARDED" | "ALREADY_AWARDED";
export type IssuerRole = "OWNER" | "SHIFT_LEAD" | "STAFF" | "UNKNOWN";

export type PointDecisionReason =
  | "ELIGIBLE"
  | "BELOW_MINIMUM_SPEND"
  | "INVALID_AMOUNT"
  | "RECEIPT_NOT_PAID"
  | "RECEIPT_CANCELLED"
  | "RECEIPT_REFUNDED"
  | "RECEIPT_ALREADY_AWARDED"
  | "QR_ALREADY_USED"
  | "QR_EXPIRED"
  | "QR_TIME_INVALID"
  | "ISSUER_NOT_AUTHORIZED";

export interface PointDecisionInput {
  readonly netAfterDiscountSatang: number;
  readonly paymentState: PaymentState;
  readonly qrState: QrState;
  readonly receiptAwardState: ReceiptAwardState;
  readonly issuerRole: IssuerRole;
  readonly daysSinceLaunch: number;
  readonly qrIssuedAtEpochMs: number;
  readonly evaluatedAtEpochMs: number;
}

export interface PointDecision {
  readonly status: "ELIGIBLE" | "NO_POINTS" | "BLOCKED";
  readonly points: number;
  readonly reasonCode: PointDecisionReason;
}

export function calculateReceiptPoints(
  input: PointDecisionInput,
): PointDecision {
  if (
    !Number.isSafeInteger(input.netAfterDiscountSatang) ||
    input.netAfterDiscountSatang < 0 ||
    !Number.isSafeInteger(input.daysSinceLaunch) ||
    input.daysSinceLaunch < 0 ||
    !Number.isSafeInteger(input.qrIssuedAtEpochMs) ||
    !Number.isSafeInteger(input.evaluatedAtEpochMs)
  ) {
    return blocked("INVALID_AMOUNT");
  }
  if (!isAuthorizedIssuer(input.issuerRole, input.daysSinceLaunch)) {
    return blocked("ISSUER_NOT_AUTHORIZED");
  }
  if (input.paymentState === "UNPAID") {
    return blocked("RECEIPT_NOT_PAID");
  }
  if (input.paymentState === "CANCELLED") {
    return blocked("RECEIPT_CANCELLED");
  }
  if (input.paymentState === "REFUNDED") {
    return blocked("RECEIPT_REFUNDED");
  }
  if (input.receiptAwardState === "ALREADY_AWARDED") {
    return blocked("RECEIPT_ALREADY_AWARDED");
  }
  if (input.qrState === "USED") return blocked("QR_ALREADY_USED");
  if (input.qrState === "EXPIRED") return blocked("QR_EXPIRED");

  const qrAge = input.evaluatedAtEpochMs - input.qrIssuedAtEpochMs;
  if (qrAge < 0) return blocked("QR_TIME_INVALID");
  if (qrAge > PRODUCTION_LOYALTY_POLICY.qrTargetLifetimeMinutes * 60_000) {
    return blocked("QR_EXPIRED");
  }

  const points = Math.floor(
    input.netAfterDiscountSatang /
      PRODUCTION_LOYALTY_POLICY.earningSatangPerPoint,
  );
  return points === 0
    ? { status: "NO_POINTS", points: 0, reasonCode: "BELOW_MINIMUM_SPEND" }
    : { status: "ELIGIBLE", points, reasonCode: "ELIGIBLE" };
}

export function isAuthorizedIssuer(
  role: IssuerRole,
  daysSinceLaunch: number,
): boolean {
  if (!Number.isSafeInteger(daysSinceLaunch) || daysSinceLaunch < 0) {
    return false;
  }
  // Fail-closed default: do not broaden access after day 30 until Owner approves
  // a replacement role policy.
  return role === "OWNER" || role === "SHIFT_LEAD";
}

export interface RefundReconciliationDecision {
  readonly automaticPointAdjustment: 0;
  readonly action: "OWNER_RECONCILIATION_REQUIRED";
  readonly retainForDays: 90;
}

export function postAwardRefundDecision(): RefundReconciliationDecision {
  return {
    automaticPointAdjustment: 0,
    action: "OWNER_RECONCILIATION_REQUIRED",
    retainForDays: PRODUCTION_LOYALTY_POLICY.reconciliationRetentionDays,
  };
}

function blocked(reasonCode: PointDecisionReason): PointDecision {
  return { status: "BLOCKED", points: 0, reasonCode };
}
