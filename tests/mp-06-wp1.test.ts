import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import catalogDocument from "../config/product-catalog/test-approved-catalog.json" with { type: "json" };
import { MP06_EXACT_TEMPLATES } from "../src/mp-06-policy-snapshot.js";
import { approvedKnowledgeResponseUnit } from "../worker/knowledge.js";
import {
  MP06_AUTO_INTENT_ORDER,
  MP06_POLICY_CHECKSUM,
  deduplicateResponseUnits,
  detectMp06IntentMatches,
  planMp06Wp1Text,
  type Mp06Wp1Dependencies,
} from "../worker/mp-06-wp1.js";

const ASSET_BASE = "https://malispang-lineoa-test.eakkachai-dev.workers.dev";
const NOW = Date.parse("2026-09-05T12:00:00+07:00");
const defaultDependencies: Mp06Wp1Dependencies = {
  catalogDocument,
  approvedKnowledgeUnit: approvedKnowledgeResponseUnit,
};

describe("MP-06 WP1 deterministic multi-intent gate", () => {
  it("matches and orders all approved AUTO intents deterministically", () => {
    expect(
      detectMp06IntentMatches("ขอเมนู ร้านอยู่ไหน เปิดกี่โมง และเก็บได้กี่วัน"),
    ).toEqual(["MENU", "LOCATION", "OPENING_HOURS", "STORAGE"]);
    expect(MP06_AUTO_INTENT_ORDER).toEqual([
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
  });

  it("builds an AUTO_COMPOSITE of 2-3 exact approved response units", async () => {
    const plan = await planMp06Wp1Text(
      "ขอเมนู ร้านอยู่ไหน เปิดกี่โมง",
      ASSET_BASE,
      NOW,
    );
    expect(plan).toMatchObject({ classification: "AUTO_COMPOSITE" });
    expect(plan).not.toHaveProperty("clarificationTemplateId");
    expect(plan?.responseUnits.map((unit) => unit.intent)).toEqual([
      "MENU",
      "LOCATION",
      "OPENING_HOURS",
    ]);
    expect(plan?.messages).toHaveLength(5);
    expect(plan?.responseFingerprint).toMatch(/^[a-f0-9]{64}$/);
    const firstUnit = plan?.responseUnits[0];
    if (!firstUnit) throw new Error("TEST_RESPONSE_UNIT_MISSING");
    expect(deduplicateResponseUnits([firstUnit, firstUnit])).toEqual([
      firstUnit,
    ]);
  });

  it("cancels a composite over three units and emits T-C04 exactly", async () => {
    const plan = await planMp06Wp1Text(
      "ขอเมนู ทรัฟเฟิลแฮมชีสขนาดปกติราคา ร้านอยู่ไหน เปิดกี่โมง",
      ASSET_BASE,
      NOW,
    );
    expect(plan).toMatchObject({
      classification: "CLARIFY",
      clarificationTemplateId: "T-C04",
      responseUnits: [],
    });
    expect(plan?.messages).toEqual([
      { type: "text", text: MP06_EXACT_TEMPLATES["T-C04"] },
    ]);
  });

  it("renders T-A02 only for one uniquely resolved, whole-baht Approved Catalog row", async () => {
    const normal = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีส ราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    expect(normal).toMatchObject({ classification: "AUTO" });
    expect(normal?.messages).toEqual([
      expect.objectContaining({
        type: "text",
        text: MP06_EXACT_TEMPLATES["T-A02"]
          .replace("{catalogDisplayName}", "ทรัฟเฟิลแฮมชีส")
          .replace("{catalogDisplaySize}", " ขนาดปกติ")
          .replace("{catalogPrice}", "39"),
      }),
    ]);

    const small = await planMp06Wp1Text(
      "แฮมชีส ขนาดเล็ก ราคา",
      ASSET_BASE,
      NOW,
    );
    const smallMessage = small?.messages[0];
    expect(smallMessage?.type).toBe("text");
    if (smallMessage?.type === "text") {
      expect(smallMessage.text).toContain("แฮมชีส ขนาดเล็ก ราคา 20 บาทค่ะ");
    }
  });

  it("uses T-C01 for missing or ambiguous PRICE binding", async () => {
    for (const text of ["ราคาเท่าไหร่", "แฮมชีส ราคาเท่าไหร่"]) {
      const plan = await planMp06Wp1Text(text, ASSET_BASE, NOW);
      expect(plan).toMatchObject({
        classification: "CLARIFY",
        clarificationTemplateId: "T-C01",
      });
      expect(plan?.messages).toEqual([
        { type: "text", text: MP06_EXACT_TEMPLATES["T-C01"] },
      ]);
    }
    const mixed = await planMp06Wp1Text(
      "ราคาเท่าไหร่ และร้านอยู่ไหน",
      ASSET_BASE,
      NOW,
    );
    expect(mixed).toMatchObject({
      classification: "CLARIFY",
      clarificationTemplateId: "T-C01",
      responseUnits: [],
    });
  });

  it("resolves a product-and-size follow-up for a pending T-C01 without guessing", async () => {
    const followUp = await planMp06Wp1Text("แฮมชีส ขนาดปกติ", ASSET_BASE, NOW, {
      pendingClarificationTemplateId: "T-C01",
    });
    expect(followUp).toMatchObject({ classification: "AUTO" });
    const message = followUp?.messages[0];
    expect(message?.type).toBe("text");
    if (message?.type === "text") {
      expect(message.text).toContain("แฮมชีส ขนาดปกติ ราคา 39 บาทค่ะ");
    }
  });

  it("fails the whole message to STAFF_ONLY for risky or invalid units without partial AUTO", async () => {
    const risky = await planMp06Wp1Text("ขอเมนู และมีของไหม", ASSET_BASE, NOW);
    expect(risky).toMatchObject({
      classification: "STAFF_ONLY",
      responseUnits: [],
      messages: [],
    });

    const blockedPrice = await planMp06Wp1Text(
      "ชิฟฟ่อนราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    expect(blockedPrice).toMatchObject({
      classification: "STAFF_ONLY",
      responseUnits: [],
      messages: [],
    });
  });

  it("cancels all AUTO units when any KB authority record is unavailable", async () => {
    const unavailable: Mp06Wp1Dependencies = {
      ...defaultDependencies,
      approvedKnowledgeUnit: async (replyKind) =>
        replyKind === "LOCATION"
          ? undefined
          : approvedKnowledgeResponseUnit(replyKind),
    };
    const plan = await planMp06Wp1Text(
      "ขอเมนู ร้านอยู่ไหน",
      ASSET_BASE,
      NOW,
      {},
      unavailable,
    );
    expect(plan).toMatchObject({
      classification: "STAFF_ONLY",
      responseUnits: [],
      messages: [],
    });
  });

  it("applies STAFF_ONLY precedence even when an earlier unit requires CLARIFY", async () => {
    const unavailable: Mp06Wp1Dependencies = {
      ...defaultDependencies,
      approvedKnowledgeUnit: async (replyKind) =>
        replyKind === "LOCATION"
          ? undefined
          : approvedKnowledgeResponseUnit(replyKind),
    };
    const plan = await planMp06Wp1Text(
      "ราคาเท่าไหร่ และร้านอยู่ไหน",
      ASSET_BASE,
      NOW,
      {},
      unavailable,
    );
    expect(plan).toMatchObject({
      classification: "STAFF_ONLY",
      responseUnits: [],
      messages: [],
    });
    expect(plan).not.toHaveProperty("clarificationTemplateId");
  });

  it("fails closed on catalog checksum drift or a fractional-baht row", async () => {
    const checksumDrift = structuredClone(catalogDocument) as Record<
      string,
      unknown
    >;
    checksumDrift.checksum = `sha256:${"0".repeat(64)}`;
    const driftPlan = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีสราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
      {},
      { ...defaultDependencies, catalogDocument: checksumDrift },
    );
    expect(driftPlan?.classification).toBe("STAFF_ONLY");

    const fractional = withCatalogPrice(catalogDocument, 3_950);
    const fractionalPlan = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีสราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
      {},
      { ...defaultDependencies, catalogDocument: fractional },
    );
    expect(fractionalPlan?.classification).toBe("STAFF_ONLY");

    const invalidSize = withCatalogSize(catalogDocument, "OTHER");
    const invalidSizePlan = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีสราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
      {},
      { ...defaultDependencies, catalogDocument: invalidSize },
    );
    expect(invalidSizePlan?.classification).toBe("STAFF_ONLY");
  });

  it("uses binding-aware fingerprints with no raw customer text or PII", async () => {
    const ham = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีสราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    const tuna = await planMp06Wp1Text(
      "ทูน่าคอร์นสลัดราคาเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    expect(ham?.responseUnits[0]?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(tuna?.responseUnits[0]?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(ham?.responseUnits[0]?.fingerprint).not.toBe(
      tuna?.responseUnits[0]?.fingerprint,
    );
    expect(JSON.stringify(ham)).not.toContain("ทรัฟเฟิลแฮมชีสราคาเท่าไหร่");
    expect(JSON.stringify(ham)).not.toContain("0812345678");
  });

  it("never emits forbidden T-C03", async () => {
    for (const text of [
      "ราคาเท่าไหร่",
      "ขอเมนู ร้านอยู่ไหน เปิดกี่โมง เก็บได้กี่วัน",
      "ขอเมนู ร้านอยู่ไหน",
    ]) {
      const plan = await planMp06Wp1Text(text, ASSET_BASE, NOW);
      expect(JSON.stringify(plan)).not.toContain(MP06_EXACT_TEMPLATES["T-C03"]);
    }
    expect(MP06_POLICY_CHECKSUM).toBe(
      "504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0",
    );
  });
});

function withCatalogPrice(
  original: typeof catalogDocument,
  unitPriceSatang: number,
): Record<string, unknown> {
  const changed = structuredClone(original) as {
    checksum: string;
    products: { sku: string; unitPriceSatang: number | null }[];
    [key: string]: unknown;
  };
  const row = changed.products.find(
    (product) => product.sku === "BR-N-TRUFFLE-HAM-CHEESE",
  );
  if (!row) throw new Error("TEST_CATALOG_ROW_MISSING");
  row.unitPriceSatang = unitPriceSatang;
  const payload = { ...changed, checksum: undefined };
  changed.checksum = `sha256:${createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  return changed;
}

function withCatalogSize(
  original: typeof catalogDocument,
  size: "OTHER",
): Record<string, unknown> {
  const changed = structuredClone(original) as {
    checksum: string;
    products: { sku: string; size: string }[];
    [key: string]: unknown;
  };
  const row = changed.products.find(
    (product) => product.sku === "BR-N-TRUFFLE-HAM-CHEESE",
  );
  if (!row) throw new Error("TEST_CATALOG_ROW_MISSING");
  row.size = size;
  const payload = { ...changed, checksum: undefined };
  changed.checksum = `sha256:${createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  return changed;
}
