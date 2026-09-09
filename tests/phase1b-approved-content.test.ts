import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  type ApprovedKnowledgeManifest,
  type FaqIntent,
} from "../src/index.js";

const manifestPath = new URL(
  "../config/approved-knowledge-base/test-knowledge-base.json",
  import.meta.url,
);

const MENU_STOCK_ANSWER =
  "เมนูตามรูปเป็นรายการอ้างอิง สินค้าหน้าร้านมีการขายออกตลอดวัน จึงอาจมีสินค้าไม่ครบหรือหมดได้ค่ะ หากต้องการเช็กสต๊อกสินค้าวันนี้ สอบถามโปรโมชั่นพิเศษประจำวัน หรือไส้พิเศษประจำวัน กรุณากด “คุยกับพนักงาน” ได้เลยค่ะ 😊";

const PICKUP_ANSWER =
  "สามารถสั่งล่วงหน้าและรับสินค้าได้ที่ร้านมะลิปัง ตลาดยิ่งเจริญ สะพานใหม่ค่ะ 😊 กรุณากด “คุยกับพนักงาน” แล้วแจ้งชื่อ เบอร์โทร วันและเวลารับสินค้า พร้อมรายการที่ต้องการ ทางร้านจะตรวจสอบและยืนยันรายการ ยอดรวม และรายละเอียดการรับสินค้าให้ก่อนรับออเดอร์ค่ะ";

const ADVANCE_ORDER_ANSWER = `🍞 ขนมปังอบใหม่ หอม นุ่ม ไส้แน่น เลือกความอร่อยได้ตามใจเลยค่ะ ✨

🎉 ไส้ใหม่ ชวนลอง
• ทรัฟเฟิลแฮมชีส
• ฮาวายเอี้ยน
• ทูน่าคอร์นสลัด

⭐ ไส้ขายดี ลูกค้าสั่งซ้ำบ่อย
• แฮมชีส
• เนยสด
• สังขยา
• หมูหยอง
• หมูหยองไส้กรอก
• ไส้กรอก
• ไส้กรอกชีส
• หมูหยองพริกเผา

🥖 ไส้อื่น ๆ ก็มีให้เลือกอีกมากมาย
• หมูหยองลูกเกด
• หมูหยองน้ำสลัด
• แฮมสลัด
• แฮมไส้กรอก
• ไส้กรอกพิซซ่า
• ฝอยทอง
• เผือก
• ถั่วแดง
• ลูกเกด
• รวมมิตร

📌 อยากได้ไส้ไหน แนะนำให้สั่งจองล่วงหน้า เพราะบางไส้มีจำนวนจำกัดในแต่ละวันนะคะ

🧾 วิธีสั่งซื้อ
คัดลอกแบบฟอร์มด้านล่าง กรอกข้อมูล แล้วส่งกลับมาได้เลยค่ะ 😊

👤 ชื่อผู้รับ:
📞 เบอร์โทร:
📅 วันรับ:
⏰ รอบอบ: 08:00 / 11:00 / 14:00
🚗 วิธีรับ: รับที่ร้าน / จัดส่ง

🥖 รายการที่สั่ง
ระบุชื่อไส้ + จำนวน
ตัวอย่าง: แฮมชีส 2 / เนยสด 3

📝 รายการที่ต้องการ:
•
•
•
•

🗒️ หมายเหตุ:

หลังได้รับข้อมูล พนักงานจะตรวจสอบสินค้าและสรุปให้ พร้อมแจ้งรายการ จำนวน ยอดชำระ และรอบอบที่ยืนยันค่ะ

⏳ ไส้ขายดีมีจำนวนจำกัดในแต่ละวัน แนะนำสั่งจองล่วงหน้านะคะ 💕🍞`;

const expectedAnswers: Readonly<Record<FaqIntent, string>> = {
  MENU: MENU_STOCK_ANSWER,
  PRICE: MENU_STOCK_ANSWER,
  LOCATION:
    "ขณะนี้มะลิปังมีสาขาที่ ตลาดยิ่งเจริญ สะพานใหม่ ค่ะ ดูแผนที่ได้ที่: https://maps.app.goo.gl/mLTyUC1891a4uu7D9?g_st=ic และกำลังเตรียมพบกับสาขาใหม่เร็ว ๆ นี้ ติดตามข่าวสารได้ทาง LINE นี้นะคะ 😊",
  OPENING_HOURS:
    "ร้านมะลิปังเปิดทุกวัน เวลา 06:00–16:00 น. ค่ะ หากมีการเปลี่ยนแปลงในวันหยุด ทางร้านจะแจ้งล่วงหน้าผ่าน LINE นี้นะคะ 😊",
  CONTACT:
    "สอบถามเพิ่มเติมได้ทาง LINE Official Account ของมะลิปังนี้ได้เลยค่ะ หากต้องการให้พนักงานช่วยดูแล กรุณากด “คุยกับพนักงาน” นะคะ 😊",
  PICKUP: PICKUP_ANSWER,
  STORAGE:
    "ขนมปังทั่วไปและชิฟฟ่อน เก็บนอกตู้เย็นได้ 2 วันนับจากวันที่ซื้อ หรือเก็บในตู้เย็นได้ 5 วันค่ะ ควรเก็บให้พ้นแสงแดดและความร้อน สินค้าที่มีครีมหรือไส้สดควรเก็บในตู้เย็นทันที หากต้องการทราบอายุสินค้าเฉพาะรายการ กรุณากด “คุยกับพนักงาน” นะคะ 😊",
  ALLERGEN:
    "สินค้าแต่ละรายการอาจมีส่วนประกอบหรือสัมผัสกับวัตถุดิบที่ก่อภูมิแพ้ได้ เช่น แป้งสาลี นม ไข่ ถั่ว หรือวัตถุดิบอื่น ๆ หากมีอาการแพ้อาหาร หรือจำเป็นต้องหลีกเลี่ยงส่วนผสมใด กรุณากด “คุยกับพนักงาน” เพื่อให้ตรวจสอบก่อนสั่งซื้อนะคะ 😊",
  WHOLESALE:
    "สำหรับออเดอร์จำนวนมากหรือราคาส่ง กรุณากด “คุยกับพนักงาน” แล้วแจ้งชนิดสินค้า จำนวน วันที่ต้องการรับ และเวลารับสินค้า ทางร้านจะตรวจสอบราคา คิวผลิต และเงื่อนไขล่าสุดให้ก่อนยืนยันออเดอร์ค่ะ 😊",
  ADVANCE_ORDER: ADVANCE_ORDER_ANSWER,
  DELIVERY:
    "ขณะนี้ร้านมะลิปังยังไม่มีบริการ Delivery โดยตรงนะคะ หากต้องการสั่งล่วงหน้าหรือสอบถามทางเลือกในการรับสินค้า กรุณากด “คุยกับพนักงาน” ได้เลยค่ะ 😊",
  PROMOTION:
    "โปรโมชั่นพิเศษและไส้พิเศษของแต่ละวันอาจเปลี่ยนแปลงได้ค่ะ กรุณากด “คุยกับพนักงาน” เพื่อสอบถามรายการและเงื่อนไขล่าสุดได้เลยนะคะ 😊",
  LOYALTY:
    "กติกาสะสมแต้มมะลิปัง\nทุกยอดซื้อที่ชำระเงินแล้ว รับ 1 แต้มต่อทุก 50 บาท โดยปัดเศษลงค่ะ\n\n🎁 สะสมครบ 30 แต้ม แลกคุกกี้ 1 ถุง มูลค่า 159 บาท เลือกรสชาติได้ตามสินค้าที่มีในวันแลก\n🎁 สะสมครบ 50 แต้ม แลกตุ๊กตา 1 ตัว จากแบบที่ร่วมรายการและมีในวันแลก\n\nบัตรและคะแนนเดิมยังใช้ได้ ไม่มีวันหมดอายุ\nการแลกรางวัลต้องให้พนักงานตรวจสอบและยืนยันที่ร้านนะคะ 😊",
  STOCK: MENU_STOCK_ANSWER,
};

describe("Issue #8 Owner-approved exact content", () => {
  it("stores the exact approved answer and provenance for all 14 categories", async () => {
    const manifest = await loadManifest();
    for (const [intent, expected] of Object.entries(expectedAnswers) as [
      FaqIntent,
      string,
    ][]) {
      const record = manifest.categories[intent];
      expect(record.status).toBe("APPROVED");
      if (record.status !== "APPROVED") continue;
      expect(record.customerFacingAnswer).toBe(expected);
      const approvalDate =
        intent === "MENU" || intent === "ADVANCE_ORDER"
          ? "2026-08-31T00:00:00+07:00"
          : "2026-08-30T00:00:00+07:00";
      expect(record).toMatchObject({
        owner: "MALISPANG_OWNER",
        approvedAt: approvalDate,
        effectiveFrom: approvalDate,
        effectiveTo: "2026-09-30T00:00:00+07:00",
        freshness: {
          reviewAt: "2026-09-30T00:00:00+07:00",
          maximumAgeDays: 31,
        },
      });
      expect(record.source.reference).toBe(
        "docs/line-oa/OWNER_APPROVAL_PACK_PHASE_1B_TH.md",
      );
      expect(record.checksum).toBe(answerChecksum(expected));
    }
  });

  it("versions the expanded Owner-approved menu lexicon", async () => {
    const menu = (await loadManifest()).categories.MENU;
    expect(menu.status).toBe("APPROVED");
    if (menu.status !== "APPROVED") return;
    expect(menu.version).toBe("2026-08-31-menu-v2");
    expect(menu.keywords).toEqual(
      expect.arrayContaining([
        "ขอเมนู",
        "ขอเมนูหน่อย",
        "เมนูขนมปัง",
        "มีอะไรบ้าง",
        "มีไรบ้าง",
        "ขอดูเมนู",
      ]),
    );
  });

  it("versions the Owner-approved preorder reply independently from pickup", async () => {
    const manifest = await loadManifest();
    const preorder = manifest.categories.ADVANCE_ORDER;
    const pickup = manifest.categories.PICKUP;
    expect(preorder.status).toBe("APPROVED");
    expect(pickup.status).toBe("APPROVED");
    if (preorder.status !== "APPROVED" || pickup.status !== "APPROVED") return;
    expect(preorder.version).toBe("2026-08-31-advance-order-v2");
    expect(preorder.customerFacingAnswer).toBe(ADVANCE_ORDER_ANSWER);
    expect(pickup.version).toBe("2026-08-30-pickup-v1");
    expect(pickup.customerFacingAnswer).toBe(PICKUP_ANSWER);
  });

  it("never claims real-time stock, a fixed daily promotion, or current open status", async () => {
    const manifest = await loadManifest();
    const serialized = JSON.stringify(manifest.categories);
    expect(approvedAnswer(manifest, "STOCK")).toContain(
      "อาจมีสินค้าไม่ครบหรือหมด",
    );
    expect(approvedAnswer(manifest, "PROMOTION")).toContain(
      "อาจเปลี่ยนแปลงได้",
    );
    expect(approvedAnswer(manifest, "OPENING_HOURS")).not.toContain(
      "ตอนนี้ร้านเปิดอยู่",
    );
    expect(serialized).not.toMatch(/มีพร้อมขาย|มีแน่นอน|allergen-free/i);
  });

  it("keeps loyalty as general rules without customer or Reward Card operations", async () => {
    const answer = (await loadManifest()).categories.LOYALTY;
    expect(answer.status).toBe("APPROVED");
    if (answer.status !== "APPROVED") return;
    expect(answer.customerFacingAnswer).toContain("ยอดซื้อที่ชำระเงินแล้ว");
    expect(answer.customerFacingAnswer).toContain("โดยปัดเศษลง");
    expect(answer.customerFacingAnswer).not.toMatch(
      /https?:\/\/|channel|token|secret|customer.?id|user.?id/i,
    );
  });
});

async function loadManifest(): Promise<ApprovedKnowledgeManifest> {
  return JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as ApprovedKnowledgeManifest;
}

function answerChecksum(answer: string): string {
  return createHash("sha256").update(answer, "utf8").digest("hex");
}

function approvedAnswer(
  manifest: ApprovedKnowledgeManifest,
  intent: FaqIntent,
): string {
  const record = manifest.categories[intent];
  if (record.status !== "APPROVED") throw new Error(`${intent}_NOT_APPROVED`);
  return record.customerFacingAnswer;
}
