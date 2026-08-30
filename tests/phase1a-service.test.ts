import { describe, expect, it } from "vitest";

import {
  ApprovedFaqKnowledgeBase,
  HANDOFF_ACKNOWLEDGEMENT,
  MemoryStore,
  Phase1AService,
  RedactedAuditLog,
  SAFE_FALLBACK,
  type ApprovedFaqRecord,
  type MockEvent,
} from "../src/index.js";

const approvedRecords: readonly ApprovedFaqRecord[] = [
  fixture("MENU", "เมนูทดสอบที่เจ้าของอนุมัติ"),
  fixture("PRICE", "ราคาทดสอบที่เจ้าของอนุมัติ"),
  fixture("LOCATION", "ที่ตั้งทดสอบที่เจ้าของอนุมัติ"),
  fixture("OPENING_HOURS", "เวลาทำการทดสอบที่เจ้าของอนุมัติ"),
  fixture("STORAGE", "วิธีเก็บรักษาทดสอบที่เจ้าของอนุมัติ"),
  fixture("ALLERGEN", "คำเตือนภูมิแพ้ที่เจ้าของอนุมัติ"),
  fixture("WHOLESALE", "ราคาส่งทดสอบที่เจ้าของอนุมัติ"),
  fixture("ADVANCE_ORDER", "วิธีสั่งล่วงหน้าที่เจ้าของอนุมัติ"),
  fixture("PROMOTION", "โปรรายวันที่ต้องให้พนักงานตรวจสอบ"),
  fixture("LOYALTY", "กติกาแต้มที่เจ้าของอนุมัติ"),
  fixture("STOCK", "สต๊อกต้องให้พนักงานตรวจสอบ"),
];

function fixture(
  intent: ApprovedFaqRecord["intent"],
  answer: string,
): ApprovedFaqRecord {
  return {
    id: `FAQ-${intent}`,
    intent,
    keywords: [],
    answer,
    status: "APPROVED",
    source: {
      classification: "OWNER_APPROVED_REPOSITORY_RECORD",
      reference: "fixture-owner-decision-2026-08-14",
    },
    owner: "OWNER-MOCK",
    approvedAt: "2026-08-01T00:00:00.000Z",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: "2026-12-31T00:00:00.000Z",
    freshness: {
      reviewAt: "2026-12-01T00:00:00.000Z",
      maximumAgeDays: 180,
    },
    version: `fixture-${intent.toLocaleLowerCase()}`,
    checksum: "a".repeat(64),
  };
}

function setup(records: readonly ApprovedFaqRecord[] = approvedRecords) {
  const store = new MemoryStore();
  const auditLog = new RedactedAuditLog();
  return {
    auditLog,
    store,
    service: new Phase1AService(store, {
      environment: "test",
      accountName: "มะลิปัง TEST",
      authorizedStaffIds: new Set(["STAFF-TEST-1"]),
      faq: new ApprovedFaqKnowledgeBase(
        records,
        () => new Date("2026-08-14T00:00:00.000Z"),
      ),
      auditLog,
    }),
  };
}

function customer(
  eventId: string,
  content: Extract<MockEvent, { kind: "customer" }>["content"],
  conversationId = "CUST-TEST-1",
): Extract<MockEvent, { kind: "customer" }> {
  return { kind: "customer", eventId, conversationId, content };
}

describe("Phase1AService", () => {
  it("uses a safe fallback for สอบถามค่ะ and never opens an order form", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "text", text: "สอบถามค่ะ" }),
    );
    expect(replies[0]?.message).toEqual({ type: "text", text: SAFE_FALLBACK });
    expect(replies[1]?.message).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
    expect(JSON.stringify(replies)).not.toContain("ชื่อ:");
  });

  it.each([
    ["มีเมนูอะไรบ้าง", "เมนูทดสอบที่เจ้าของอนุมัติ"],
    ["ขอถามราคาค่ะ", "ราคาทดสอบที่เจ้าของอนุมัติ"],
    ["ที่ตั้งร้านอยู่ไหน", "ที่ตั้งทดสอบที่เจ้าของอนุมัติ"],
    ["เวลาทำการเป็นอย่างไร", "เวลาทำการทดสอบที่เจ้าของอนุมัติ"],
    ["เก็บรักษาขนมอย่างไร", "วิธีเก็บรักษาทดสอบที่เจ้าของอนุมัติ"],
    ["มีราคาส่งไหม", "ราคาส่งทดสอบที่เจ้าของอนุมัติ"],
  ])("answers only an approved FAQ: %s", (text, answer) => {
    const test = setup();
    expect(
      test.service.process(customer("E1", { kind: "text", text }))[0]?.message,
    ).toEqual({ type: "text", text: answer });
  });

  it("fails closed when a business answer has no authoritative source", () => {
    const test = setup([]);
    expect(
      test.service.process(
        customer("E1", { kind: "text", text: "ราคาเท่าไหร่" }),
      )[0]?.message,
    ).toEqual({ type: "text", text: SAFE_FALLBACK });
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
  });

  it("fails closed for draft, revoked, future, and expired FAQ records", () => {
    const variants: ApprovedFaqRecord[] = [
      { ...fixture("PRICE", "ห้ามส่งคำตอบ draft"), status: "DRAFT" },
      {
        ...fixture("PRICE", "ห้ามส่งคำตอบ revoked"),
        status: "REVOKED",
      },
      {
        ...fixture("PRICE", "ห้ามส่งคำตอบอนาคต"),
        effectiveFrom: "2027-01-01T00:00:00.000Z",
      },
      {
        ...fixture("PRICE", "ห้ามส่งคำตอบหมดอายุ"),
        effectiveTo: "2026-08-13T00:00:00.000Z",
      },
    ];
    for (const [index, record] of variants.entries()) {
      const test = setup([record]);
      const serialized = JSON.stringify(
        test.service.process(
          customer(`E-NON-AUTH-${index}`, {
            kind: "text",
            text: "ขอถามราคา",
          }),
        ),
      );
      expect(serialized).toContain(SAFE_FALLBACK);
      expect(serialized).not.toContain(record.answer);
    }
  });

  it("records provenance for every approved answer without customer data", () => {
    const test = setup();
    test.service.process(
      customer("EVENT-TRACE-1", { kind: "text", text: "ราคาเท่าไหร่" }),
    );
    expect(test.auditLog.entries.at(-1)).toMatchObject({
      outcome: "FAQ_ANSWERED",
      knowledgeTrace: {
        recordId: "FAQ-PRICE",
        sourceReference: "fixture-owner-decision-2026-08-14",
        approvedAt: "2026-08-01T00:00:00.000Z",
        version: "fixture-price",
        checksum: "a".repeat(64),
      },
    });
    expect(JSON.stringify(test.auditLog.entries)).not.toContain(
      "EVENT-TRACE-1",
    );
  });

  it("fails closed for stale, malformed, and conflicting approved records", () => {
    const stale = {
      ...fixture("PRICE", "ห้ามส่งคำตอบ stale"),
      freshness: {
        reviewAt: "2026-08-13T00:00:00.000Z",
        maximumAgeDays: 180,
      },
    };
    const malformed = {
      ...fixture("PRICE", "ห้ามส่งคำตอบ checksum ผิด"),
      checksum: "not-a-checksum",
    };
    for (const record of [stale, malformed]) {
      const test = setup([record]);
      expect(
        test.service.process(
          customer(`E-${record.checksum}`, {
            kind: "text",
            text: "ราคาเท่าไหร่",
          }),
        )[0]?.message,
      ).toEqual({ type: "text", text: SAFE_FALLBACK });
    }

    const test = setup([
      fixture("PRICE", "คำตอบขัดกันหนึ่ง"),
      { ...fixture("PRICE", "คำตอบขัดกันสอง"), id: "FAQ-PRICE-2" },
    ]);
    const serialized = JSON.stringify(
      test.service.process(
        customer("E-CONFLICT", { kind: "text", text: "ราคาเท่าไหร่" }),
      ),
    );
    expect(serialized).toContain(SAFE_FALLBACK);
    expect(serialized).not.toContain("คำตอบขัดกัน");
  });

  it("returns the branded Flex menu only for an explicit main-menu request", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "text", text: "ขอเมนูหลักค่ะ" }),
    );
    expect(replies).toHaveLength(1);
    expect(replies[0]?.message.type).toBe("flex");
  });

  it("deduplicates webhook events before creating another reply or state change", () => {
    const test = setup();
    const event = customer("E1", { kind: "text", text: "ขอเมนูหลัก" });
    expect(test.service.process(event)).toHaveLength(1);
    expect(test.service.process(event)).toEqual([]);
    expect(test.store.outbox.size).toBe(1);
    expect(test.auditLog.entries.at(-1)?.outcome).toBe("DUPLICATE_IGNORED");
  });

  it("acknowledges human handoff once and then stays completely silent", () => {
    const test = setup();
    const first = test.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    expect(first[0]?.message).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(
      test.service.process(
        customer("E2", { kind: "text", text: "ยังอยู่ไหม" }),
      ),
    ).toEqual([]);
    expect(
      test.service.process(
        customer("E3", { kind: "text", text: "ขอเมนูหลัก" }),
      ),
    ).toEqual([]);
    expect(test.store.outbox.size).toBe(1);
  });

  it.each(["ส่งสลิปแล้วค่ะ", "สอบถามการชำระเงิน", "ขอร้องเรียนสินค้า"])(
    "routes a direct high-risk topic to human review: %s",
    (text) => {
      const test = setup();
      expect(
        test.service.process(customer("E1", { kind: "text", text }))[0]
          ?.message,
      ).toEqual({ type: "text", text: HANDOFF_ACKNOWLEDGEMENT });
      expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
    },
  );

  it.each([
    ["ลูกค้าแพ้อาหารค่ะ", "คำเตือนภูมิแพ้ที่เจ้าของอนุมัติ"],
    ["มีราคาส่งไหม", "ราคาส่งทดสอบที่เจ้าของอนุมัติ"],
    ["มีสต๊อกวันนี้ไหม", "สต๊อกต้องให้พนักงานตรวจสอบ"],
    ["มีโปรโมชั่นอะไร", "โปรรายวันที่ต้องให้พนักงานตรวจสอบ"],
  ])("answers safe guidance then enters handoff: %s", (text, answer) => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "text", text }),
    );
    expect(replies.map((reply) => reply.message)).toEqual([
      { type: "text", text: answer },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
  });

  it("routes a mock payment-slip event without inspecting its asset", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "payment_slip", mockAssetId: "MOCK-SLIP-1" }),
    );
    expect(replies[0]?.message).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(JSON.stringify(test.auditLog.entries)).not.toContain("MOCK-SLIP-1");
  });

  it("does not let unauthorized staff close handoff", () => {
    const test = setup();
    test.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    test.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-UNKNOWN",
    });
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
  });

  it("allows only authorized staff to close handoff and restore the bot", () => {
    const test = setup();
    test.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    test.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-TEST-1",
    });
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("BOT_ACTIVE");
    expect(
      test.service.process(
        customer("E3", { kind: "text", text: "ขอเมนูหลัก" }),
      ),
    ).toHaveLength(1);
  });

  it("starts a new one-time acknowledgement window after authorized close", () => {
    const test = setup();
    test.service.process(
      customer("E1", { kind: "text", text: "คุยกับพนักงาน" }),
    );
    test.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-TEST-1",
    });
    expect(
      test.service.process(
        customer("E3", { kind: "text", text: "ขอคุยกับพนักงาน" }),
      ),
    ).toHaveLength(1);
    expect(test.store.conversation("CUST-TEST-1").handoffWindow).toBe(2);
  });

  it.each(["MENU_PRICE", "LOCATION", "OPENING_HOURS", "WHOLESALE"] as const)(
    "fails closed for unapproved %s action data",
    (action) => {
      const test = setup([]);
      expect(
        test.service.process(customer("E1", { kind: "action", action }))[0]
          ?.message,
      ).toEqual({ type: "text", text: SAFE_FALLBACK });
    },
  );

  it("requires staff verification for current stock action", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "action", action: "CHECK_TODAY" }),
    );
    expect(replies.map((reply) => reply.message)).toEqual([
      { type: "text", text: "สต๊อกต้องให้พนักงานตรวจสอบ" },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
  });

  it("keeps preorder as approved guidance plus staff handoff", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "action", action: "ADVANCE_ORDER" }),
    );
    expect(replies.map((reply) => reply.message)).toEqual([
      { type: "text", text: "วิธีสั่งล่วงหน้าที่เจ้าของอนุมัติ" },
      { type: "text", text: HANDOFF_ACKNOWLEDGEMENT },
    ]);
    expect(test.store.conversation("CUST-TEST-1").mode).toBe("HUMAN_HANDOFF");
  });

  it("answers only general loyalty rules without a Reward Card operation", () => {
    const test = setup();
    const replies = test.service.process(
      customer("E1", { kind: "action", action: "REWARDS_INFO" }),
    );
    expect(replies[0]?.message).toEqual({
      type: "text",
      text: "กติกาแต้มที่เจ้าของอนุมัติ",
    });
    expect(JSON.stringify(replies)).not.toContain("https://");
  });

  it("stores only redacted audit references and reason codes", () => {
    const test = setup();
    test.service.process(
      customer(
        "EVENT-RAW-123",
        { kind: "text", text: "เบอร์ 0812345678 ที่อยู่เต็มและข้อความส่วนตัว" },
        "CUSTOMER-RAW-456",
      ),
    );
    const serialized = JSON.stringify(test.auditLog.entries);
    expect(serialized).not.toContain("EVENT-RAW-123");
    expect(serialized).not.toContain("CUSTOMER-RAW-456");
    expect(serialized).not.toContain("0812345678");
    expect(serialized).not.toContain("ที่อยู่เต็ม");
    expect(test.auditLog.entries[0]).toMatchObject({
      outcome: "SAFE_FALLBACK",
      reasonCode: "QUESTION_NOT_IN_APPROVED_FAQ",
    });
  });
});
