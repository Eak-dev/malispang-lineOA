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

export const PROMOTION_TIME_ZONE = "Asia/Bangkok";
export const TEST_OWNER_ALLOWLIST_VALUE = "OWNER_TEST";

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
    request.endAt < 0
  ) {
    throw new Error("PROMOTION_INVALID_EFFECTIVE_RANGE");
  }
  if (request.startAt % 1000 !== 0 || request.endAt % 1000 !== 0) {
    throw new Error("PROMOTION_TIMESTAMP_PRECISION_INVALID");
  }
  if (request.endAt <= request.startAt) {
    throw new Error("PROMOTION_END_NOT_AFTER_START");
  }
  if (
    bangkokCalendarDate(request.startAt) !== bangkokCalendarDate(request.endAt)
  ) {
    throw new Error("PROMOTION_RANGE_CROSSES_BANGKOK_DAY");
  }
  return {
    enabled: request.enabled,
    startAt: request.startAt,
    endAt: request.endAt,
  };
}

export function bangkokCalendarDate(timestamp: number): string {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("PROMOTION_INVALID_EFFECTIVE_RANGE");
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROMOTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (!year || !month || !day) {
    throw new Error("PROMOTION_TIME_ZONE_UNAVAILABLE");
  }
  return `${year}-${month}-${day}`;
}

export function effectivePromotion(
  promotion: TestPromotion,
  now: number,
): TestPromotion {
  return promotion.enabled && now >= promotion.startAt && now < promotion.endAt
    ? promotion
    : { ...promotion, enabled: false };
}
