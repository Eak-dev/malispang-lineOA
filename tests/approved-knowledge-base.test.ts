import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  ApprovedFaqKnowledgeBase,
  FAQ_INTENTS,
  approvedFaqRecordsFromManifest,
  validateApprovedKnowledgeManifest,
  type ApprovedKnowledgeManifest,
} from "../src/index.js";

const manifestPath = new URL(
  "../config/approved-knowledge-base/test-knowledge-base.json",
  import.meta.url,
);

describe("Issue #8 Approved Knowledge Base manifest", () => {
  it("validates the committed TEST-only fail-closed manifest", async () => {
    const manifest = await loadManifest();
    expect(validateApprovedKnowledgeManifest(manifest)).toEqual([]);
    expect(manifest).toMatchObject({
      environment: "TEST",
      accountName: "มะลิปัง TEST",
      sourceOfTruth: "VERSIONED_REPOSITORY_MANIFEST",
      defaultBehavior: "FAIL_CLOSED",
    });
    expect(Object.keys(manifest.categories).sort()).toEqual(
      [...FAQ_INTENTS].sort(),
    );
    expect(
      Object.values(manifest.categories).every(
        (record) => record.status === "BLOCKED",
      ),
    ).toBe(true);
    expect(approvedFaqRecordsFromManifest(manifest)).toEqual([]);
  });

  it("does not store a customer-facing answer on any blocked category", async () => {
    const serialized = JSON.stringify(await loadManifest());
    expect(serialized).not.toContain("customerFacingAnswer");
    expect(serialized).not.toContain("TEST_SEED");
    expect(serialized).not.toContain("39 บาท");
    expect(serialized).not.toContain("08:00");
  });

  it("fails closed for every current Thai business-data question", async () => {
    const manifest = await loadManifest();
    const knowledgeBase = new ApprovedFaqKnowledgeBase(
      approvedFaqRecordsFromManifest(manifest),
      () => new Date("2026-08-29T00:00:00+07:00"),
    );
    for (const text of [
      "มีเมนูอะไรบ้าง",
      "ราคาเท่าไหร่",
      "ร้านอยู่ที่ไหน",
      "เปิดกี่โมง",
      "ติดต่อร้านอย่างไร",
      "รับสินค้าได้ที่ไหน",
      "เก็บได้กี่วัน",
      "แพ้อาหารกินได้ไหม",
      "มีราคาส่งไหม",
      "สั่งล่วงหน้าอย่างไร",
      "มี Delivery ไหม",
      "มีโปรโมชั่นอะไร",
      "สะสมแต้มอย่างไร",
      "มีของไหม",
    ]) {
      expect(knowledgeBase.lookupText(text).status).toBe("NOT_AUTHORITATIVE");
    }
  });

  it("rejects an approved record that contains TEST seed wording", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    const categories = manifest.categories as Record<string, unknown>;
    categories.PRICE = approvedRecord("ข้อมูล TEST_SEED ราคา");
    expect(validateApprovedKnowledgeManifest(manifest)).toContain(
      "PRICE_TEST_DATA_PROHIBITED",
    );
  });

  it("rejects malformed approved provenance and keywords", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    const categories = manifest.categories as Record<string, unknown>;
    categories.PRICE = {
      ...approvedRecord("คำตอบ fixture ที่ไม่มีข้อมูลจริง"),
      source: {
        classification: "OWNER_APPROVED_REPOSITORY_RECORD",
        reference: "มีช่องว่าง ไม่ผ่าน",
      },
      keywords: [""],
    };
    const errors = validateApprovedKnowledgeManifest(manifest);
    expect(errors).toContain("PRICE_INVALID_SOURCE_REFERENCE");
    expect(errors).toContain("PRICE_KEYWORDS_MISSING");
  });
});

async function loadManifest(): Promise<ApprovedKnowledgeManifest> {
  return JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as ApprovedKnowledgeManifest;
}

function approvedRecord(answer: string): Record<string, unknown> {
  return {
    status: "APPROVED",
    source: {
      classification: "OWNER_APPROVED_REPOSITORY_RECORD",
      reference: "fixture-owner-decision",
    },
    owner: "OWNER-MOCK",
    approvedAt: "2026-08-01T00:00:00.000Z",
    effectiveFrom: "2026-08-01T00:00:00.000Z",
    effectiveTo: "2026-12-31T00:00:00.000Z",
    freshness: {
      reviewAt: "2026-11-01T00:00:00.000Z",
      maximumAgeDays: 90,
    },
    version: "fixture-v1",
    checksum: "b".repeat(64),
    keywords: ["ราคา"],
    customerFacingAnswer: answer,
  };
}
