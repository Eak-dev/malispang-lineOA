import type { TestPromotion } from "./draft-order.js";

export interface PromotionChangeRequest {
  readonly environment: string;
  readonly accountName: string;
  readonly ownerId: string;
  readonly ownerAllowlist: string;
  readonly enabled: boolean;
  readonly startAt: number;
  readonly endAt: number;
}

export interface AuthorizedPromotionChange {
  readonly enabled: boolean;
  readonly startAt: number;
  readonly endAt: number;
}

export const DISABLED_TEST_PROMOTION: TestPromotion = {
  enabled: false,
  revision: 0,
  startAt: 0,
  endAt: 0,
};

export function authorizeTestPromotionChange(
  request: PromotionChangeRequest,
): AuthorizedPromotionChange {
  if (
    request.environment !== "TEST" ||
    request.accountName !== "มะลิปัง TEST"
  ) {
    throw new Error("PROMOTION_FAIL_CLOSED_NON_TEST");
  }
  const allowed = request.ownerAllowlist
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.length === 0)
    throw new Error("PROMOTION_OWNER_ALLOWLIST_MISSING");
  if (!allowed.includes(request.ownerId)) {
    throw new Error("PROMOTION_OWNER_NOT_AUTHORIZED");
  }
  if (
    !Number.isSafeInteger(request.startAt) ||
    !Number.isSafeInteger(request.endAt) ||
    request.startAt < 0 ||
    request.endAt <= request.startAt
  ) {
    throw new Error("PROMOTION_INVALID_EFFECTIVE_RANGE");
  }
  return {
    enabled: request.enabled,
    startAt: request.startAt,
    endAt: request.endAt,
  };
}

export function effectivePromotion(
  promotion: TestPromotion,
  now: number,
): TestPromotion {
  return promotion.enabled && now >= promotion.startAt && now < promotion.endAt
    ? promotion
    : { ...promotion, enabled: false };
}
