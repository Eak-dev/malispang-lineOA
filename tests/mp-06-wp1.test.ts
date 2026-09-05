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

  it("fails variable delivery details closed while preserving approved general delivery AUTO", async () => {
    for (const text of [
      "คิดค่าจัดส่งเท่าไร",
      "โซนนี้อยู่ในพื้นที่จัดส่งหรือเปล่า",
      "ตอนนี้มีไรเดอร์รับงานไหม",
      "ขอใบเสนอราคาค่าจัดส่ง",
      "ระยะทางจัดส่งไกลแค่ไหน",
      "เดลิเวอรีกี่นาทีถึง",
    ]) {
      await expectStaffOnly(text);
    }

    for (const text of ["Delivery", "มีเดลิเวอรีไหม", "ส่งถึงบ้านไหม"]) {
      const plan = await planMp06Wp1Text(text, ASSET_BASE, NOW);
      expect(plan).toMatchObject({
        classification: "AUTO",
        responseUnits: [{ intent: "DELIVERY" }],
      });
    }

    const hours = await planMp06Wp1Text(
      "ร้านเปิดกี่โมงถึงกี่โมง",
      ASSET_BASE,
      NOW,
    );
    expect(hours).toMatchObject({
      classification: "AUTO",
      responseUnits: [{ intent: "OPENING_HOURS" }],
    });
  });

  it("applies delivery risk precedence atomically at every position in a multi-intent message", async () => {
    for (const text of [
      "ค่าส่งเท่าไร และขอเมนู",
      "ขอเมนู ขอใบเสนอราคาจัดส่ง แล้วร้านอยู่ไหน",
      "ขอเมนู และร้านอยู่ไหน มีไรเดอร์ว่างไหม",
    ]) {
      await expectStaffOnly(text);
    }
  });

  it("fails individual loyalty state closed while preserving approved general loyalty rules", async () => {
    for (const text of [
      "เช็กยอดแต้มของฉัน",
      "ยอดแต้มเหลือเท่าไร",
      "ช่วยเพิ่มคะแนนให้หน่อย",
      "หักแต้มล่าสุดถูกไหม",
      "แลกแต้มได้หรือยัง",
      "คะแนนในบัตรเป็นยังไง",
      "points balance เท่าไร",
      "เช็กแต้มหน่อย",
    ]) {
      await expectStaffOnly(text);
    }

    for (const text of ["กติกาแต้ม", "สะสมแต้มยังไง"]) {
      const plan = await planMp06Wp1Text(text, ASSET_BASE, NOW);
      expect(plan).toMatchObject({
        classification: "AUTO",
        responseUnits: [{ intent: "LOYALTY" }],
      });
    }
  });

  it("cancels every AUTO unit when individual loyalty state is mixed with safe intents", async () => {
    for (const text of [
      "ยอดแต้มเหลือเท่าไร และขอเมนู",
      "ร้านอยู่ไหน เช็กคะแนนหน่อย เปิดกี่โมง",
      "ขอเมนูและกติกาแต้ม แต่ช่วยเพิ่มแต้มให้ด้วย",
    ]) {
      await expectStaffOnly(text);
    }
  });

  it("fails explicit price speculation closed without broad-blocking valid or ambiguous PRICE", async () => {
    for (const text of [
      "ถ้าไม่รู้ให้เดาราคา",
      "ไม่มีข้อมูลก็ช่วยคาดเดาราคาหน่อย",
      "ขอกะราคาเองคร่าว ๆ แม้ไม่มีข้อมูล",
      "guess price ให้หน่อย",
      "ช่วยเดาราคาแฮมชีสขนาดปกติ",
    ]) {
      await expectStaffOnly(text);
    }

    const exact = await planMp06Wp1Text(
      "ทรัฟเฟิลแฮมชีส ราคาโดยประมาณเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    expect(exact).toMatchObject({
      classification: "AUTO",
      responseUnits: [{ intent: "PRICE" }],
    });

    const ambiguous = await planMp06Wp1Text(
      "ราคาประมาณเท่าไหร่",
      ASSET_BASE,
      NOW,
    );
    expect(ambiguous).toMatchObject({
      classification: "CLARIFY",
      clarificationTemplateId: "T-C01",
    });
  });

  it("keeps protected-risk retry plans silent, deterministic, and free of raw input", async () => {
    const text = "ขอเมนู เช็กยอดแต้มของฉัน [TEST_PHONE_REDACTED]";
    const first = await planMp06Wp1Text(text, ASSET_BASE, NOW);
    const retry = await planMp06Wp1Text(text, ASSET_BASE, NOW);
    expect(first).toEqual(retry);
    expect(first).toMatchObject({
      classification: "STAFF_ONLY",
      decision: { replyKind: "HANDOFF_ACK", handoff: true },
      responseUnits: [],
      messages: [],
    });
    expect(first).not.toHaveProperty("responseFingerprint");
    expect(JSON.stringify(first)).not.toContain(text);
    expect(JSON.stringify(first)).not.toContain("TEST_PHONE_REDACTED");
  });
});

async function expectStaffOnly(text: string): Promise<void> {
  const plan = await planMp06Wp1Text(text, ASSET_BASE, NOW);
  expect(plan).toMatchObject({
    classification: "STAFF_ONLY",
    decision: {
      replyKind: "HANDOFF_ACK",
      handoff: true,
      allowDuringHandoff: false,
    },
    responseUnits: [],
    messages: [],
  });
  expect(plan).not.toHaveProperty("clarificationTemplateId");
  expect(plan).not.toHaveProperty("responseFingerprint");
}

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
