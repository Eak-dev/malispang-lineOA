import { describe, expect, it } from "vitest";

import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "../worker/knowledge.js";
import { classifyText } from "../worker/routing.js";

describe("Worker Approved Knowledge gate", () => {
  it.each(["MENU", "PRICE", "LOCATION", "CONTACT"] as const)(
    "keeps blocked %s on safe fallback",
    (kind) => {
      const decision = enforceApprovedKnowledge({
        replyKind: kind,
        reasonCode: "CLASSIFIED",
        handoff: false,
      });
      expect(decision).toMatchObject({ replyKind: kind, handoff: false });
      expect(decision.reasonCode).not.toBe("CLASSIFIED");
      expect(approvedAnswerForReplyKind(kind)).toBeUndefined();
    },
  );

  it.each([
    "HOURS",
    "STORAGE",
    "WHOLESALE",
    "ADVANCE_ORDER",
    "DELIVERY",
    "PICKUP",
    "PROMOTION",
    "LOYALTY",
  ] as const)("routes blocked %s to human review", (kind) => {
    expect(
      enforceApprovedKnowledge({
        replyKind: kind,
        reasonCode: "CLASSIFIED",
        handoff: false,
      }),
    ).toMatchObject({ replyKind: "HANDOFF_ACK", handoff: true });
  });

  it("preserves direct stock and allergen handoff decisions", () => {
    for (const text of ["มีของไหม", "แพ้อาหารกินได้ไหม"]) {
      expect(enforceApprovedKnowledge(classifyText(text))).toMatchObject({
        replyKind: "HANDOFF_ACK",
        handoff: true,
      });
    }
  });
});
