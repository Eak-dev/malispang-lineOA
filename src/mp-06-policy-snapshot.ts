import { createHash } from "node:crypto";

export const MP06_POLICY_VERSION = "2026.09.05-policy-v1";

export const MP06_EXACT_TEMPLATES = {
  "T-A02":
    "{catalogDisplayName}{catalogDisplaySize} ราคา {catalogPrice} บาทค่ะ\n\nราคานี้เป็นราคาตามรายการที่ร้านอนุมัติ และไม่ใช่การยืนยันสต๊อก โปรโมชั่น คิวรับสินค้า หรือราคาส่งนะคะ หากต้องการตรวจสอบสินค้าวันนี้ กรุณากด “คุยกับพนักงาน” ได้เลยค่ะ 😊",
  "T-C01":
    "ต้องการสอบถามราคาสินค้าอะไรคะ หากสินค้ามีหลายขนาด กรุณาระบุขนาดด้วย เช่น “แฮมชีส ขนาดปกติ” ได้เลยค่ะ 😊",
  "T-C03":
    "เพื่อให้น้องมะลิตอบได้ตรงคำถาม รบกวนเลือกหัวข้อที่ต้องการสอบถามค่ะ: เมนูและราคา, ที่ตั้งร้าน, เวลาเปิด, การเก็บรักษา, Delivery หรือกติกาสะสมแต้ม 😊",
  "T-C04":
    "มีหลายหัวข้อที่ต้องการสอบถามค่ะ รบกวนเลือกหนึ่งหัวข้อก่อนนะคะ: เมนูและราคา, ที่ตั้งร้าน, เวลาเปิด, การเก็บรักษา, Delivery หรือกติกาสะสมแต้ม 😊",
} as const;

export interface Mp06PolicyValidation {
  errors: string[];
}

const EXPECTED_POLICY_BODY = {
  $schema: "./policy-snapshot.schema.json",
  schemaVersion: 1,
  policyId: "MP-06-GUARDRAILED-AI-SAFETY-GATE",
  policyVersion: MP06_POLICY_VERSION,
  roadmapVersion: "2026.09.05-v1",
  workId: "MP-06",
  githubIssue: 12,
  status: "OWNER_APPROVED_POLICY_SNAPSHOT",
  ownerDecision: {
    decisionId: "MP-06-POLICY-2026-09-05-V1",
    decidedAt: "2026-09-05",
    source: "OWNER_APPROVED_CONVERSATION_DECISIONS",
  },
  scope: {
    artifactType: "SPECIFICATION_ONLY",
    runtimeImplementation: false,
    aiProviderCalls: false,
    testDeployment: false,
    productionStatus: "NO_GO",
  },
  classification: {
    safetyPrecedence: ["STAFF_ONLY", "CLARIFY", "AUTO_COMPOSITE", "AUTO"],
    autoComposite: {
      intentId: "I-13",
      minimumUnitsAfterDedup: 2,
      maximumUnitsAfterDedup: 3,
      overflowClassification: "CLARIFY",
      overflowTemplateId: "T-C04",
      sendPartialAuto: false,
      responseOrder: [
        "MENU",
        "PRICE",
        "LOCATION",
        "OPENING_HOURS",
        "PICKUP",
        "STORAGE",
        "DELIVERY",
        "LOYALTY",
        "CONTACT",
      ],
      anyStaffOnlyIntent: "STAFF_ONLY",
      missingRequiredField: "CLARIFY",
      invalidResponseUnit: "STAFF_ONLY",
      invalidResponseUnitCancelsEntireComposite: true,
      aiMayMergeSummarizeOrBridgeTemplates: false,
    },
    clarification: {
      sharedBudgetPerConversation: 1,
      singleUseTemplateIds: ["T-C01", "T-C04"],
      unresolvedAfterBudgetIntentId: "I-22",
      unresolvedAfterBudgetClassification: "STAFF_ONLY",
      templateWithoutApprovedTriggerOrBudgetRule: "T-C03",
    },
  },
  deduplication: {
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
  },
  priceBinding: {
    templateId: "T-A02",
    authoritativeSource: "APPROVED_PRODUCT_CATALOG",
    requiredResolvedRows: 1,
    uniqueNameMayResolveWithoutSize: true,
    ambiguousNameRequiresUniqueSizeResolution: true,
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
  },
  authoritativeUnitGate: {
    validateEveryUnitBeforeSend: true,
    failureConditions: [
      "MISSING",
      "STALE",
      "CONFLICT",
      "CHECKSUM_MISMATCH",
      "INCOMPLETE_BINDING",
    ],
    failureClassification: "STAFF_ONLY",
    cancelEntireComposite: true,
  },
  templates: {
    "T-A02": { classification: "AUTO", text: MP06_EXACT_TEMPLATES["T-A02"] },
    "T-C01": {
      classification: "CLARIFY",
      text: MP06_EXACT_TEMPLATES["T-C01"],
    },
    "T-C03": {
      classification: "CLARIFY",
      text: MP06_EXACT_TEMPLATES["T-C03"],
    },
    "T-C04": {
      classification: "CLARIFY",
      text: MP06_EXACT_TEMPLATES["T-C04"],
    },
  },
  integrity: {
    algorithm: "SHA-256",
    canonicalization: "RECURSIVE_LEXICOGRAPHIC_JSON_WITH_EMPTY_POLICY_CHECKSUM",
  },
} as const;

export function validateMp06PolicySnapshot(
  input: unknown,
): Mp06PolicyValidation {
  const errors: string[] = [];
  if (!isRecord(input)) return { errors: ["POLICY_SNAPSHOT_INVALID"] };

  const comparable = structuredClone(input);
  const integrity = isRecord(comparable.integrity)
    ? comparable.integrity
    : undefined;
  const checksum = integrity?.policyChecksum;
  if (typeof checksum !== "string" || !/^[a-f0-9]{64}$/.test(checksum)) {
    errors.push("POLICY_CHECKSUM_FORMAT_INVALID");
  }
  if (integrity) delete integrity.policyChecksum;

  if (!deepEqual(comparable, EXPECTED_POLICY_BODY)) {
    errors.push("POLICY_CONTENT_DRIFT");
  }
  if (
    typeof checksum === "string" &&
    checksum !== computeMp06PolicyChecksum(input)
  ) {
    errors.push("POLICY_CHECKSUM_MISMATCH");
  }
  return { errors };
}

export function computeMp06PolicyChecksum(input: unknown): string {
  if (!isRecord(input)) return "";
  const copy = structuredClone(input);
  if (isRecord(copy.integrity)) copy.integrity.policyChecksum = "";
  return createHash("sha256").update(canonicalize(copy), "utf8").digest("hex");
}

export function validateMp06PolicySchema(input: unknown): string[] {
  if (!isRecord(input)) return ["POLICY_SCHEMA_INVALID"];
  const properties = isRecord(input.properties) ? input.properties : undefined;
  const defs = isRecord(input.$defs) ? input.$defs : undefined;
  const errors: string[] = [];
  if (input.additionalProperties !== false) {
    errors.push("POLICY_SCHEMA_ROOT_MUST_BE_CLOSED");
  }
  if (!properties || !defs) {
    errors.push("POLICY_SCHEMA_STRUCTURE_INVALID");
    return errors;
  }
  if (!constEquals(properties.policyVersion, MP06_POLICY_VERSION)) {
    errors.push("POLICY_SCHEMA_VERSION_DRIFT");
  }
  if (!constEquals(properties.roadmapVersion, "2026.09.05-v1")) {
    errors.push("POLICY_SCHEMA_ROADMAP_DRIFT");
  }
  const templates = isRecord(defs.templates) ? defs.templates : undefined;
  const requiredTemplates = templates?.required;
  if (
    !Array.isArray(requiredTemplates) ||
    !deepEqual(requiredTemplates, ["T-A02", "T-C01", "T-C03", "T-C04"])
  ) {
    errors.push("POLICY_SCHEMA_TEMPLATE_SET_INVALID");
  }
  const templateProperties = isRecord(templates?.properties)
    ? templates.properties
    : undefined;
  for (const [templateId, text] of Object.entries(MP06_EXACT_TEMPLATES)) {
    const expectedClassification = templateId === "T-A02" ? "AUTO" : "CLARIFY";
    if (
      !templateProperties ||
      !constEquals(templateProperties[templateId], {
        classification: expectedClassification,
        text,
      })
    ) {
      errors.push(`POLICY_SCHEMA_TEMPLATE_DRIFT_${templateId}`);
    }
  }
  return errors;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const entries = Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function constEquals(value: unknown, expected: unknown): boolean {
  return isRecord(value) && deepEqual(value.const, expected);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
