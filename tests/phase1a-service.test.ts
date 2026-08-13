import { describe, expect, it } from "vitest";

import {
  HANDOFF_ACKNOWLEDGEMENT,
  MemoryStore,
  Phase1AService,
  type MockEvent,
} from "../src/index.js";

function service() {
  const store = new MemoryStore();
  return {
    store,
    service: new Phase1AService(store, {
      environment: "test",
      authorizedStaffIds: new Set(["STAFF-TEST-1"]),
    }),
  };
}

function customer(
  eventId: string,
  content: Extract<MockEvent, { kind: "customer" }>["content"],
  conversationId = "CUST-TEST-1",
): MockEvent {
  return { kind: "customer", eventId, conversationId, content };
}

describe("Phase1AService", () => {
  it("returns the branded Flex menu for an ambiguous message without an order form", () => {
    const fixture = service();
    const replies = fixture.service.process(
      customer("E1", { kind: "text", text: "สอบถามค่ะ" }),
    );
    expect(replies).toHaveLength(1);
    expect(replies[0]?.message.type).toBe("flex");
    expect(JSON.stringify(replies)).not.toContain("ชื่อ:");
  });

  it("deduplicates webhook events", () => {
    const fixture = service();
    const event = customer("E1", { kind: "text", text: "สวัสดี" });
    expect(fixture.service.process(event)).toHaveLength(1);
    expect(fixture.service.process(event)).toEqual([]);
    expect(fixture.store.outbox.size).toBe(1);
  });

  it("acknowledges human handoff once and becomes silent", () => {
    const fixture = service();
    const first = fixture.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    expect(first[0]?.message).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(
      fixture.service.process(
        customer("E2", { kind: "text", text: "ยังอยู่ไหม" }),
      ),
    ).toEqual([]);
    expect(fixture.store.conversation("CUST-TEST-1").mode).toBe(
      "HUMAN_HANDOFF",
    );
  });

  it("routes a mock payment slip to human review without inspecting it", () => {
    const fixture = service();
    const replies = fixture.service.process(
      customer("E1", { kind: "payment_slip", mockAssetId: "MOCK-SLIP-1" }),
    );
    expect(replies[0]?.message).toEqual({
      type: "text",
      text: HANDOFF_ACKNOWLEDGEMENT,
    });
    expect(fixture.store.conversation("CUST-TEST-1").mode).toBe(
      "HUMAN_HANDOFF",
    );
  });

  it("does not let unauthorized staff close handoff", () => {
    const fixture = service();
    fixture.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    fixture.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-UNKNOWN",
    });
    expect(fixture.store.conversation("CUST-TEST-1").mode).toBe(
      "HUMAN_HANDOFF",
    );
  });

  it("allows authorized staff to close handoff and restores bot operation", () => {
    const fixture = service();
    fixture.service.process(
      customer("E1", { kind: "action", action: "HUMAN_HANDOFF" }),
    );
    fixture.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-TEST-1",
    });
    expect(fixture.store.conversation("CUST-TEST-1").mode).toBe("BOT_ACTIVE");
    expect(
      fixture.service.process(customer("E3", { kind: "text", text: "สวัสดี" })),
    ).toHaveLength(1);
  });

  it("starts a new one-time acknowledgement window after authorized close", () => {
    const fixture = service();
    fixture.service.process(
      customer("E1", { kind: "text", text: "คุยกับพนักงาน" }),
    );
    fixture.service.process({
      kind: "staff_close",
      eventId: "E2",
      conversationId: "CUST-TEST-1",
      staffId: "STAFF-TEST-1",
    });
    expect(
      fixture.service.process(
        customer("E3", { kind: "text", text: "ขอคุยกับพนักงาน" }),
      ),
    ).toHaveLength(1);
    expect(fixture.store.conversation("CUST-TEST-1").handoffWindow).toBe(2);
  });

  it.each(["MENU_PRICE", "ADVANCE_ORDER", "LOCATION"] as const)(
    "fails closed for unapproved %s data",
    (action) => {
      const fixture = service();
      const replies = fixture.service.process(
        customer("E1", { kind: "action", action }),
      );
      expect(replies[0]?.message).toEqual({
        type: "text",
        text: HANDOFF_ACKNOWLEDGEMENT,
      });
      expect(fixture.store.conversation("CUST-TEST-1").mode).toBe(
        "HUMAN_HANDOFF",
      );
    },
  );
});
