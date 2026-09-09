import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface PromotionPolicy {
  readonly environment: string;
  readonly accountName: string;
  readonly defaultEnabled: boolean;
  readonly activation: {
    readonly requiresTestAdminAuthentication: boolean;
    readonly requiresSeparateOwnerAllowlist: boolean;
    readonly requiresStartAndEndTime: boolean;
    readonly timeZone: string;
    readonly timestampPrecision: string;
    readonly requiresSameCalendarDay: boolean;
    readonly latestEndLocalTime: string;
    readonly endMustBeAfterStart: boolean;
    readonly autoDisableAtEnd: boolean;
    readonly approvedOwnerAllowlist: readonly string[];
    readonly ownerIdentifierStoredInRepository: boolean;
    readonly rejectedChangesAreAuditedRedacted: boolean;
  };
}

interface PromotionPolicySchema {
  readonly properties: {
    readonly activation: {
      readonly properties: {
        readonly timeZone: { readonly const: string };
        readonly latestEndLocalTime: { readonly const: string };
        readonly approvedOwnerAllowlist: { readonly const: readonly string[] };
      };
    };
  };
}

const path = resolve("config/draft-order/test-promotion-policy.json");
const schemaPath = resolve(
  "config/draft-order/test-promotion-policy.schema.json",
);
const policy = JSON.parse(await readFile(path, "utf8")) as PromotionPolicy;
const schema = JSON.parse(
  await readFile(schemaPath, "utf8"),
) as PromotionPolicySchema;
const expectedActivation = {
  requiresTestAdminAuthentication: true,
  requiresSeparateOwnerAllowlist: true,
  requiresStartAndEndTime: true,
  timeZone: "Asia/Bangkok",
  timestampPrecision: "WHOLE_SECOND",
  requiresSameCalendarDay: true,
  latestEndLocalTime: "23:59:59",
  endMustBeAfterStart: true,
  autoDisableAtEnd: true,
  ownerIdentifierStoredInRepository: true,
  rejectedChangesAreAuditedRedacted: true,
} as const;

if (
  policy.environment !== "TEST" ||
  policy.accountName !== "มะลิปัง TEST" ||
  policy.defaultEnabled !== false
) {
  throw new Error("PROMOTION_POLICY_TEST_GUARD_INVALID");
}
for (const [key, value] of Object.entries(expectedActivation)) {
  if (policy.activation[key as keyof typeof expectedActivation] !== value) {
    throw new Error(`PROMOTION_POLICY_ACTIVATION_INVALID ${key}`);
  }
}
if (
  policy.activation.approvedOwnerAllowlist.length !== 1 ||
  policy.activation.approvedOwnerAllowlist[0] !== "OWNER_TEST"
) {
  throw new Error("PROMOTION_POLICY_OWNER_ALLOWLIST_INVALID");
}
const schemaActivation = schema.properties.activation.properties;
if (
  schemaActivation.timeZone.const !== "Asia/Bangkok" ||
  schemaActivation.latestEndLocalTime.const !== "23:59:59" ||
  schemaActivation.approvedOwnerAllowlist.const.length !== 1 ||
  schemaActivation.approvedOwnerAllowlist.const[0] !== "OWNER_TEST"
) {
  throw new Error("PROMOTION_POLICY_SCHEMA_INVALID");
}
console.log("Draft-order promotion policy valid: TEST / Asia/Bangkok");
