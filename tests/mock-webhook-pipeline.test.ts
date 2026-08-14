import { describe, expect, it } from "vitest";

import {
  MemoryStore,
  MOCK_VALID_SIGNATURE,
  MockSignatureBoundary,
  MockWebhookPipeline,
  Phase1AService,
  RedactedAuditLog,
  type MockEvent,
} from "../src/index.js";

function event(eventId = "E1"): MockEvent {
  return {
    kind: "customer",
    eventId,
    conversationId: "CUST-TEST-1",
    content: { kind: "text", text: "สอบถามค่ะ" },
  };
}

function pipeline(store = new MemoryStore()) {
  const auditLog = new RedactedAuditLog();
  const service = new Phase1AService(store, {
    environment: "test",
    accountName: "มะลิปัง TEST",
    authorizedStaffIds: new Set(),
    auditLog,
  });
  return {
    auditLog,
    pipeline: new MockWebhookPipeline(
      new MockSignatureBoundary(),
      service,
      auditLog,
    ),
    store,
  };
}

describe("mock webhook safety pipeline", () => {
  it("rejects an invalid mock signature before idempotency or business logic", () => {
    const test = pipeline();
    expect(test.pipeline.process(event(), "invalid")).toEqual({
      status: "REJECTED",
      replies: [],
    });
    expect(test.store.processedEventIds.size).toBe(0);
    expect(test.auditLog.entries[0]?.outcome).toBe("SIGNATURE_REJECTED");
  });

  it("accepts only the stable mock signature and then processes the event", () => {
    const test = pipeline();
    const result = test.pipeline.process(event(), MOCK_VALID_SIGNATURE);
    expect(result.status).toBe("PROCESSED");
    expect(result.replies).toHaveLength(1);
    expect(test.store.processedEventIds).toEqual(new Set(["E1"]));
  });

  it("fails closed without reply or state mutation when persistence is unavailable", () => {
    const test = pipeline(new MemoryStore(false));
    expect(test.pipeline.process(event(), MOCK_VALID_SIGNATURE)).toEqual({
      status: "FAILED_CLOSED",
      replies: [],
    });
    expect(test.store.processedEventIds.size).toBe(0);
    expect(test.store.outbox.size).toBe(0);
    expect(test.auditLog.entries[0]?.outcome).toBe("PERSISTENCE_FAILURE");
  });

  it("fails closed if a Production credential-like variable is present", () => {
    const store = new MemoryStore();
    const prohibitedName = ["PRODUCTION", "LINE", "CHANNEL", "SECRET"].join(
      "_",
    );
    expect(
      () =>
        new Phase1AService(store, {
          environment: "test",
          accountName: "มะลิปัง TEST",
          authorizedStaffIds: new Set(),
          environmentVariables: {
            [prohibitedName]: "redacted-nonempty-fixture",
          },
        }),
    ).toThrow("FAIL_CLOSED_CREDENTIAL_PRESENT");
    expect(store.processedEventIds.size).toBe(0);
  });

  it("fails closed if the target account is not exactly มะลิปัง TEST", () => {
    expect(
      () =>
        new Phase1AService(new MemoryStore(), {
          environment: "test",
          accountName: "มะลิปัง" as "มะลิปัง TEST",
          authorizedStaffIds: new Set(),
        }),
    ).toThrow("FAIL_CLOSED_NON_TEST_TARGET");
  });
});
