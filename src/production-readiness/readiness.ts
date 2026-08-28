import type { BusinessCategory } from "./manifest.js";
import { REQUIRED_BUSINESS_CATEGORIES } from "./manifest.js";
import { PRODUCTION_LOYALTY_POLICY } from "./policy.js";

export type CapabilityStatus = "SUPPORTED" | "NOT_VERIFIED" | "UNSUPPORTED";

export interface ProductionReadinessEvidence {
  readonly rewardLandedCostBaht: number | null;
  readonly rewardLandedCostEvidenceStatus: "VERIFIED" | "MISSING";
  readonly lineCapabilities: {
    readonly rollingCardExpiryFromReceipt: CapabilityStatus;
    readonly oneTimeQr: CapabilityStatus;
    readonly tenMinuteQrExpiry: CapabilityStatus;
    readonly multiPointOneTimeQr: CapabilityStatus;
    readonly sixtyDayVoucherExpiry: CapabilityStatus;
  };
  readonly authoritativeCategories: Readonly<
    Partial<Record<BusinessCategory, "APPROVED" | "BLOCKED">>
  >;
  readonly productionResourcesCaptured: boolean;
  readonly sevenDayWorkerLogRetentionReady: boolean;
  readonly rollbackRehearsed: boolean;
  readonly finalOwnerGo: boolean;
}

export type ReadinessBlockerCode =
  | "COGS_BLOCKER"
  | "COGS_EXCEEDS_LIMIT"
  | "LINE_ROLLING_EXPIRY_BLOCKER"
  | "LINE_ONE_TIME_QR_BLOCKER"
  | "LINE_QR_TTL_BLOCKER"
  | "LINE_MULTI_POINT_QR_BLOCKER"
  | "LINE_VOUCHER_EXPIRY_BLOCKER"
  | `AUTHORITATIVE_DATA_BLOCKER_${BusinessCategory}`
  | "PRODUCTION_RESOURCE_CAPTURE_BLOCKER"
  | "WORKER_LOG_RETENTION_BLOCKER"
  | "ROLLBACK_REHEARSAL_BLOCKER"
  | "FINAL_OWNER_GO_REQUIRED";

export interface ProductionReadinessResult {
  readonly decision: "GO" | "NO_GO";
  readonly blockers: readonly ReadinessBlockerCode[];
}

export function evaluateProductionReadiness(
  evidence: ProductionReadinessEvidence,
): ProductionReadinessResult {
  const blockers: ReadinessBlockerCode[] = [];
  if (
    evidence.rewardLandedCostBaht === null ||
    evidence.rewardLandedCostEvidenceStatus !== "VERIFIED"
  ) {
    blockers.push("COGS_BLOCKER");
  } else if (
    !Number.isFinite(evidence.rewardLandedCostBaht) ||
    evidence.rewardLandedCostBaht < 0 ||
    evidence.rewardLandedCostBaht >
      PRODUCTION_LOYALTY_POLICY.maximumRewardLandedCostBaht
  ) {
    blockers.push("COGS_EXCEEDS_LIMIT");
  }

  const capabilityBlockers = [
    [
      evidence.lineCapabilities.rollingCardExpiryFromReceipt,
      "LINE_ROLLING_EXPIRY_BLOCKER",
    ],
    [evidence.lineCapabilities.oneTimeQr, "LINE_ONE_TIME_QR_BLOCKER"],
    [evidence.lineCapabilities.tenMinuteQrExpiry, "LINE_QR_TTL_BLOCKER"],
    [
      evidence.lineCapabilities.multiPointOneTimeQr,
      "LINE_MULTI_POINT_QR_BLOCKER",
    ],
    [
      evidence.lineCapabilities.sixtyDayVoucherExpiry,
      "LINE_VOUCHER_EXPIRY_BLOCKER",
    ],
  ] as const;
  for (const [status, blocker] of capabilityBlockers) {
    if (status !== "SUPPORTED") blockers.push(blocker);
  }

  for (const category of REQUIRED_BUSINESS_CATEGORIES) {
    if (evidence.authoritativeCategories[category] !== "APPROVED") {
      blockers.push(`AUTHORITATIVE_DATA_BLOCKER_${category}`);
    }
  }
  if (!evidence.productionResourcesCaptured) {
    blockers.push("PRODUCTION_RESOURCE_CAPTURE_BLOCKER");
  }
  if (!evidence.sevenDayWorkerLogRetentionReady) {
    blockers.push("WORKER_LOG_RETENTION_BLOCKER");
  }
  if (!evidence.rollbackRehearsed) {
    blockers.push("ROLLBACK_REHEARSAL_BLOCKER");
  }
  if (!evidence.finalOwnerGo) blockers.push("FINAL_OWNER_GO_REQUIRED");
  return {
    decision: blockers.length === 0 ? "GO" : "NO_GO",
    blockers,
  };
}
