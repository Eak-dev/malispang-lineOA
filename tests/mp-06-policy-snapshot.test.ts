import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import {
  computeMp06PolicyChecksum,
  MP06_EXACT_TEMPLATES,
  validateMp06PolicySchema,
  validateMp06PolicySnapshot,
} from "../src/mp-06-policy-snapshot.js";

let snapshot: Record<string, unknown>;
let schema: unknown;

beforeAll(async () => {
  snapshot = (await readJson("config/mp-06/policy-snapshot.json")) as Record<
    string,
    unknown
  >;
  schema = await readJson("config/mp-06/policy-snapshot.schema.json");
});

describe("MP-06 owner-approved policy snapshot", () => {
  it("validates the frozen policy and schema", () => {
    expect(validateMp06PolicySnapshot(snapshot).errors).toEqual([]);
    expect(validateMp06PolicySchema(schema)).toEqual([]);
  });

  it("keeps T-A02, T-C01, T-C03 and T-C04 text exact", () => {
    const templates = snapshot.templates as Record<
      string,
      { classification: string; text: string }
    >;
    expect(Object.keys(templates)).toEqual([
      "T-A02",
      "T-C01",
      "T-C03",
      "T-C04",
    ]);
    for (const [templateId, exactText] of Object.entries(
      MP06_EXACT_TEMPLATES,
    )) {
      expect(templates[templateId]?.text).toBe(exactText);
    }
    expect(templates["T-A02"]?.classification).toBe("AUTO");
    expect(templates["T-C01"]?.classification).toBe("CLARIFY");
    expect(templates["T-C03"]?.classification).toBe("CLARIFY");
    expect(templates["T-C04"]?.classification).toBe("CLARIFY");
  });

  it("fails schema validation when an exact template const drifts", () => {
    const changed = structuredClone(schema) as {
      $defs: {
        templates: {
          properties: { "T-C03": { const: { text: string } } };
        };
      };
    };
    changed.$defs.templates.properties["T-C03"].const.text = "changed";
    expect(validateMp06PolicySchema(changed)).toContain(
      "POLICY_SCHEMA_TEMPLATE_DRIFT_T-C03",
    );
  });

  it("freezes safety precedence, I-13 limits, ordering and no-partial behavior", () => {
    const classification = snapshot.classification as {
      safetyPrecedence: string[];
      autoComposite: Record<string, unknown>;
      clarification: Record<string, unknown>;
    };
    expect(classification.safetyPrecedence).toEqual([
      "STAFF_ONLY",
      "CLARIFY",
      "AUTO_COMPOSITE",
      "AUTO",
    ]);
    expect(classification.autoComposite).toMatchObject({
      intentId: "I-13",
      minimumUnitsAfterDedup: 2,
      maximumUnitsAfterDedup: 3,
      overflowClassification: "CLARIFY",
      overflowTemplateId: "T-C04",
      sendPartialAuto: false,
      invalidResponseUnitCancelsEntireComposite: true,
      aiMayMergeSummarizeOrBridgeTemplates: false,
    });
    expect(classification.autoComposite.responseOrder).toEqual([
      "MENU",
      "PRICE",
      "LOCATION",
      "OPENING_HOURS",
      "PICKUP",
      "STORAGE",
      "DELIVERY",
      "LOYALTY",
      "CONTACT",
    ]);
    expect(classification.clarification).toMatchObject({
      sharedBudgetPerConversation: 1,
      singleUseTemplateIds: ["T-C01", "T-C04"],
      unresolvedAfterBudgetIntentId: "I-22",
      unresolvedAfterBudgetClassification: "STAFF_ONLY",
      templateWithoutApprovedTriggerOrBudgetRule: "T-C03",
    });
  });

  it("requires binding-aware PII-free response-unit fingerprints", () => {
    expect(snapshot.deduplication).toEqual({
      dynamicUnitFingerprintFields: [
        "templateId",
        "approvedRecordId",
        "boundFieldValues",
        "sku",
        "catalogVersionOrChecksum",
      ],
      staticUnitFingerprintFields: ["templateId", "checksum"],
      templateChecksumAloneAllowedForDynamicUnit: false,
      forbiddenFingerprintAndAuditInputs: [
        "rawCustomerText",
        "personallyIdentifiableInformation",
      ],
      serializationAndHashAlgorithm: "IMPLEMENTATION_NOT_AUTHORIZED",
    });
  });

  it("freezes exact single-row PRICE binding and fail-closed baht rules", () => {
    const priceBinding = snapshot.priceBinding as Record<string, unknown>;
    expect(priceBinding).toMatchObject({
      templateId: "T-A02",
      authoritativeSource: "APPROVED_PRODUCT_CATALOG",
      requiredResolvedRows: 1,
      notFoundMoreThanOneOrIncomplete: {
        classification: "CLARIFY",
        templateId: "T-C01",
      },
      unitPriceSatang: {
        mustBeInteger: true,
        mustBePositive: true,
        mustBeDivisibleBy: 100,
        catalogPriceCalculation: "unitPriceSatang / 100",
        catalogPriceDisplay: "POSITIVE_INTEGER_BAHT_ONLY",
        fractionalSatangOrInvalidRow: "STAFF_ONLY",
        roundingAllowed: false,
      },
      catalogDisplaySize: {
        NORMAL: " ขนาดปกติ",
        SMALL: " ขนาดเล็ก",
        invalidEmptyOrUnknown: "STAFF_ONLY",
        leadingSpaceIncluded: true,
      },
      aiMayGuessCanonicalNameSizePriceOrBinding: false,
    });
  });

  it("fails closed on policy drift or checksum drift", () => {
    const changed = structuredClone(snapshot);
    const classification = changed.classification as {
      autoComposite: { maximumUnitsAfterDedup: number };
    };
    classification.autoComposite.maximumUnitsAfterDedup = 4;
    expect(validateMp06PolicySnapshot(changed).errors).toEqual(
      expect.arrayContaining([
        "POLICY_CONTENT_DRIFT",
        "POLICY_CHECKSUM_MISMATCH",
      ]),
    );

    const badChecksum = structuredClone(snapshot);
    (badChecksum.integrity as { policyChecksum: string }).policyChecksum =
      "0".repeat(64);
    expect(validateMp06PolicySnapshot(badChecksum).errors).toContain(
      "POLICY_CHECKSUM_MISMATCH",
    );
  });

  it("computes the recorded checksum without including the checksum itself", () => {
    const recorded = (snapshot.integrity as { policyChecksum: string })
      .policyChecksum;
    expect(computeMp06PolicyChecksum(snapshot)).toBe(recorded);
  });

  it("keeps the snapshot specification-only and all external writes blocked", () => {
    expect(snapshot.scope).toEqual({
      artifactType: "SPECIFICATION_ONLY",
      runtimeImplementation: false,
      aiProviderCalls: false,
      testDeployment: false,
      productionStatus: "NO_GO",
    });
  });
});

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"),
  ) as unknown;
}
