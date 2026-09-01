import { env, exports } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { disabledPromotion } from "../worker/draft-order-objects.js";

const baseNow = Date.now();

describe("Issue #2 Durable Object persistence", () => {
  it("deduplicates Draft events and never sends the same reply twice", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-duplicate");
    const input = draftInput("a".repeat(64), "พรีออเดอร์", true);
    const first = await stub.processText(input);
    expect(first).toMatchObject({
      handled: true,
      duplicate: false,
      state: "CONSENT_REQUIRED",
    });
    await stub.markDelivered(input.eventRef);
    const duplicate = await stub.processText(input);
    expect(duplicate).toMatchObject({ duplicate: true, messages: [] });
  });

  it("persists every edit as a revision without exposing PII in audit", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-revisions");
    await stub.processText(draftInput("b".repeat(64), "พรีออเดอร์", true));
    await stub.processText(draftInput("c".repeat(64), "ยินยอม"));
    await stub.processText(draftInput("d".repeat(64), "ชื่อ: มะลิ"));
    await stub.processText(draftInput("e".repeat(64), "เบอร์โทร: 0812345678"));
    expect(await stub.state(baseNow + 10)).toBe("COLLECTING");
    const audit = await stub.redactedAudit();
    expect(
      audit.some((entry) => entry.outcome === "DRAFT_REVISION_CREATED"),
    ).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("มะลิ");
    expect(JSON.stringify(audit)).not.toContain("0812345678");
  });

  it("purges PII and revision snapshots when the 48-hour alarm expires", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-expiry");
    await stub.processText(draftInput("f".repeat(64), "พรีออเดอร์", true));
    await stub.processText(draftInput("1".repeat(64), "ยินยอม"));
    await stub.processText(draftInput("2".repeat(64), "ชื่อ: ข้อมูลทดสอบ"));

    await runInDurableObject(stub, async (_instance, state) => {
      const row = state.storage.sql
        .exec<{ aggregate_json: string }>(
          "SELECT aggregate_json FROM draft_current WHERE id = 1",
        )
        .one();
      const aggregate = JSON.parse(row.aggregate_json) as Record<
        string,
        unknown
      >;
      aggregate.expiresAt = Date.now() - 1;
      state.storage.sql.exec(
        "UPDATE draft_current SET aggregate_json = ?, expires_at = ? WHERE id = 1",
        JSON.stringify(aggregate),
        Date.now() - 1,
      );
      await state.storage.setAlarm(Date.now() + 60_000);
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    expect(await stub.state(Date.now())).toBe("EXPIRED_PURGED");
    await runInDurableObject(stub, (_instance, state) => {
      expect(
        state.storage.sql
          .exec<{ count: number }>(
            "SELECT COUNT(*) AS count FROM draft_revisions",
          )
          .one().count,
      ).toBe(0);
      const current = state.storage.sql
        .exec<{ aggregate_json: string }>(
          "SELECT aggregate_json FROM draft_current WHERE id = 1",
        )
        .one().aggregate_json;
      expect(current).not.toContain("ข้อมูลทดสอบ");
    });
    expect(await stub.redactedAudit()).toContainEqual(
      expect.objectContaining({ outcome: "DRAFT_EXPIRED_PII_PURGED" }),
    );
  });

  it("fails closed when persisted state is unavailable or corrupt", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-corrupt");
    await stub.processText(draftInput("3".repeat(64), "พรีออเดอร์", true));
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.sql.exec(
        "UPDATE draft_current SET aggregate_json = '{invalid' WHERE id = 1",
      );
    });
    await expect(
      stub.processText(draftInput("4".repeat(64), "ชื่อ: ไม่ควรถูกบันทึก")),
    ).resolves.toMatchObject({
      handled: true,
      state: "FAILED_REVIEW",
      messages: [],
      enterHandoff: false,
    });
  });
});

describe("Issue #2 protected TEST-only promotion admin flow", () => {
  it("keeps the promotion disabled by default", async () => {
    expect(
      await env.PROMOTION_CONTROL.getByName("promotion-default").current(),
    ).toEqual(disabledPromotion());
  });

  it("allows the separately allowlisted Owner to set an effective window", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/promotion", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ownerId: "OWNER_TEST_ONLY",
          enabled: true,
          startAt: baseNow,
          endAt: baseNow + 60_000,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json<{
      promotion: { enabled: boolean; revision: number };
    }>();
    expect(body.promotion).toMatchObject({ enabled: true, revision: 1 });
    expect(JSON.stringify(body)).not.toContain("OWNER_TEST_ONLY");
  });

  it("rejects a staff identity that is not in the Owner allowlist", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/promotion", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ownerId: "OWNER_TEST",
          enabled: true,
          startAt: baseNow,
          endAt: baseNow + 60_000,
        }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("allows only authorized staff to create an explicit repricing revision", async () => {
    const conversationRef = "9".repeat(64);
    const draft = env.DRAFT_ORDER.getByName(conversationRef);
    const texts = [
      ["a", "พรีออเดอร์", true],
      ["b", "ยินยอม", false],
      ["c", "ชื่อ: TEST", false],
      ["d", "เบอร์โทร: 0812345678", false],
      ["e", "วันรับ: 2026-09-03", false],
      ["f", "รอบรับ: 11:00", false],
      ["1", "วิธีรับ: รับที่ร้าน", false],
      ["2", "รายการ: แฮมชีส x 3", false],
    ] as const;
    for (const [ref, text, startRequested] of texts) {
      await draft.processText(draftInput(ref.repeat(64), text, startRequested));
    }
    await env.PROMOTION_CONTROL.getByName("test-draft-promotion").change(
      {
        enabled: true,
        startAt: Date.now() - 1_000,
        endAt: Date.now() + 60_000,
      },
      "redacted-owner-ref",
      Date.now(),
    );
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/draft/reprice", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ conversationRef, staffId: "OWNER_TEST" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json<{
      draft: {
        subtotalSatang: number;
        proposedDepositSatang: number;
        promotionApplied: boolean;
      };
    }>();
    expect(body.draft).toEqual({
      state: "READY_FOR_REVIEW",
      revision: 9,
      subtotalSatang: 10_000,
      proposedDepositSatang: 5_000,
      promotionApplied: true,
    });
    expect(JSON.stringify(body)).not.toContain("0812345678");
  });

  it("rejects missing admin authentication before reading Owner input", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/promotion", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
  });
});

function draftInput(eventRef: string, text: string, startRequested = false) {
  return {
    eventRef,
    text,
    now: baseNow,
    startRequested,
    promotion: disabledPromotion(),
    auditRetentionSeconds: 604_800,
  } as const;
}
