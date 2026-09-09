import { describe, expect, it } from "vitest";

import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "../worker/knowledge.js";
import {
  HANDOFF_ACKNOWLEDGEMENT,
  STAFF_QUICK_REPLY,
  classifyText,
  replyMessages,
} from "../worker/routing.js";

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
      allowDuringHandoff: true,
    });
    expect(decision).toMatchObject({
      replyKind: kind,
      handoff: false,
      allowDuringHandoff: true,
    });
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

  it("sends the approved preorder reply followed by one acknowledgement", () => {
    const decision = enforceApprovedKnowledge(classifyText("พรีออเดอได้ไหม"));
    expect(decision).toMatchObject({
      replyKind: "ADVANCE_ORDER",
      handoff: true,
      allowDuringHandoff: false,
    });
    const answer = approvedAnswerForReplyKind("ADVANCE_ORDER");
    expect(answer).toBeTruthy();
    const messages = replyMessages(
      "ADVANCE_ORDER",
      "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
      answer,
      true,
    );
    expect(messages).toEqual([
      { type: "text", text: answer, quickReply: STAFF_QUICK_REPLY },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
    expect(
      messages.filter(
        (message) =>
          message.type === "text" && message.text === HANDOFF_ACKNOWLEDGEMENT,
      ),
    ).toHaveLength(1);
  });

  it("does not map payment, complaint, or sensitive data to an FAQ", () => {
    for (const text of ["แจ้งโอนเงิน", "ขอร้องเรียนสินค้า", "โทร 0812345678"]) {
      expect(enforceApprovedKnowledge(classifyText(text))).toMatchObject({
        replyKind: "HANDOFF_ACK",
        handoff: true,
        allowDuringHandoff: false,
      });
    }
  });
});
