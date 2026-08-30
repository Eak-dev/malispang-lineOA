import { describe, expect, it } from "vitest";

import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "../worker/knowledge.js";
import { classifyText } from "../worker/routing.js";

describe("Worker Approved Knowledge gate", () => {
  it.each([
    "MENU",
    "PRICE",
    "LOCATION",
    "HOURS",
    "CONTACT",
    "PICKUP",
    "STORAGE",
    "ALLERGEN",
    "WHOLESALE",
    "ADVANCE_ORDER",
    "DELIVERY",
    "PROMOTION",
    "LOYALTY",
    "STOCK",
  ] as const)("permits only current approved %s content", (kind) => {
    const decision = enforceApprovedKnowledge({
      replyKind: kind,
      reasonCode: "CLASSIFIED",
      handoff: false,
    });
    expect(decision).toMatchObject({ replyKind: kind, handoff: false });
    expect(decision.reasonCode).toMatch(/^KB_APPROVED\|/);
    expect(approvedAnswerForReplyKind(kind)).toBeTruthy();
  });

  it.each([
    ["มีของไหม", "STOCK"],
    ["มีไส้พิเศษวันนี้ไหม", "STOCK"],
    ["แพ้อาหารค่ะ", "ALLERGEN"],
    ["มีโปรวันนี้ไหม", "PROMOTION"],
    ["สั่งล่วงหน้าอย่างไร", "ADVANCE_ORDER"],
    ["ราคาส่งเท่าไหร่", "WHOLESALE"],
    ["ขอแลกรางวัล", "LOYALTY"],
  ] as const)("answers safe guidance then enters handoff: %s", (text, kind) => {
    const decision = enforceApprovedKnowledge(classifyText(text));
    expect(decision).toMatchObject({ replyKind: kind, handoff: true });
    expect(decision.reasonCode).toMatch(/^KB_APPROVED\|/);
    expect(approvedAnswerForReplyKind(kind)).toBeTruthy();
  });

  it("does not map payment, complaint, or sensitive data to an FAQ", () => {
    for (const text of ["แจ้งโอนเงิน", "ขอร้องเรียนสินค้า", "โทร 0812345678"]) {
      expect(enforceApprovedKnowledge(classifyText(text))).toMatchObject({
        replyKind: "HANDOFF_ACK",
        handoff: true,
      });
    }
  });
});
