import { env, exports } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { draftReservationForm } from "../src/draft-order.js";
import { disabledPromotion } from "../worker/draft-order-objects.js";

const baseNow = Math.floor(Date.now() / 1000) * 1000;

describe("Issue #2 Durable Object persistence", () => {
  it("deduplicates Draft events and never sends the same reply twice", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-duplicate");
    const start = draftInput("a".repeat(64), "พรีออเดอร์", true);
    const first = await stub.processText(start);
    expect(first).toMatchObject({
      handled: true,
      duplicate: false,
      state: "CONSENT_REQUIRED",
    });
    await stub.markDelivered(start.eventRef);
    const duplicate = await stub.processText(start);
    expect(duplicate).toMatchObject({ duplicate: true, messages: [] });

    await stub.processText(draftInput("b".repeat(64), "ยินยอม"));
    const submission = draftInput("c".repeat(64), completedWorkerForm());
    const accepted = await stub.processText(submission);
    expect(accepted).toMatchObject({
      duplicate: false,
      state: "READY_FOR_REVIEW",
    });
    await stub.markDelivered(submission.eventRef);
    expect(await stub.processText(submission)).toMatchObject({
      duplicate: true,
      messages: [],
      state: "READY_FOR_REVIEW",
    });
    await runInDurableObject(stub, (_instance, state) => {
      expect(
        state.storage.sql
          .exec<{ count: number }>(
            "SELECT COUNT(*) AS count FROM draft_revisions",
          )
          .one().count,
      ).toBe(3);
    });
  });

  it("persists one completed form as one revision without exposing PII in audit", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-revisions");
    await stub.processText(draftInput("b".repeat(64), "พรีออเดอร์", true));
    await stub.processText(draftInput("c".repeat(64), "ยินยอม"));
    await stub.processText(draftInput("d".repeat(64), completedWorkerForm()));
    expect(await stub.state(baseNow + 10)).toBe("READY_FOR_REVIEW");
    const audit = await stub.redactedAudit();
    expect(
      audit.some((entry) => entry.outcome === "DRAFT_FORM_READY_FOR_REVIEW"),
    ).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("มะลิ");
    expect(JSON.stringify(audit)).not.toContain("0812345678");
  });

  it("purges PII and revision snapshots when the 48-hour alarm expires", async () => {
    const stub = env.DRAFT_ORDER.getByName("draft-expiry");
    await stub.processText(draftInput("f".repeat(64), "พรีออเดอร์", true));
    await stub.processText(draftInput("1".repeat(64), "ยินยอม"));
    await stub.processText(
      draftInput("2".repeat(64), completedWorkerForm({ name: "ข้อมูลทดสอบ" })),
    );

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

  it.each([true, false])(
    "allows OWNER_TEST to set enabled=%s",
    async (enabled) => {
      const response = await exports.default.fetch(
        new Request("https://test.invalid/admin/promotion", {
          method: "POST",
          headers: {
            authorization: "Bearer unit-test-admin-key",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ownerId: "OWNER_TEST",
            enabled,
            startAt: baseNow,
            endAt: baseNow + 60_000,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json<{
        promotion: { enabled: boolean; revision: number };
      }>();
      expect(body.promotion).toMatchObject({ enabled });
      expect(body.promotion.revision).toBeGreaterThan(0);
      expect(JSON.stringify(body)).not.toContain("OWNER_TEST");
    },
  );

  it("rejects a staff identity that is not in the Owner allowlist", async () => {
    const response = await exports.default.fetch(
      new Request("https://test.invalid/admin/promotion", {
        method: "POST",
        headers: {
          authorization: "Bearer unit-test-admin-key",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ownerId: "STAFF_ONLY",
          enabled: true,
          startAt: baseNow,
          endAt: baseNow + 60_000,
        }),
      }),
    );
    expect(response.status).toBe(403);
    const audit = await env.PROMOTION_CONTROL.getByName(
      "test-draft-promotion",
    ).redactedAudit();
    expect(audit[0]?.outcome).toBe("PROMOTION_OWNER_NOT_AUTHORIZED");
    expect(JSON.stringify(audit)).not.toContain("STAFF_ONLY");
  });

  it("rejects a promotion window that crosses a Bangkok calendar day", async () => {
    const response = await setPromotion({
      startAt: Date.UTC(2026, 8, 1, 16, 59, 59),
      endAt: Date.UTC(2026, 8, 1, 17, 0, 0),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "PROMOTION_RANGE_CROSSES_BANGKOK_DAY",
    });
    const audit = await env.PROMOTION_CONTROL.getByName(
      "test-draft-promotion",
    ).redactedAudit();
    expect(audit[0]?.outcome).toBe("PROMOTION_RANGE_CROSSES_BANGKOK_DAY");
  });

  it("rejects an end time that is not after start", async () => {
    const response = await setPromotion({
      startAt: baseNow + 60_000,
      endAt: baseNow,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "PROMOTION_END_NOT_AFTER_START",
    });
    const audit = await env.PROMOTION_CONTROL.getByName(
      "test-draft-promotion",
    ).redactedAudit();
    expect(audit[0]?.outcome).toBe("PROMOTION_END_NOT_AFTER_START");
  });

  it("automatically disables an expired promotion and records redacted audit", async () => {
    const stub = env.PROMOTION_CONTROL.getByName("promotion-auto-expiry");
    await stub.change(
      { enabled: true, startAt: baseNow, endAt: baseNow + 60_000 },
      "redacted-owner-ref",
      baseNow,
    );
    expect(await stub.current(baseNow + 60_000)).toMatchObject({
      enabled: false,
      revision: 2,
    });
    const audit = await stub.redactedAudit();
    expect(audit[0]?.outcome).toBe("TEST_PROMOTION_AUTO_EXPIRED");
    expect(JSON.stringify(audit)).not.toContain("redacted-owner-ref");
  });

  it("uses the Durable Object alarm to persist automatic expiry", async () => {
    const stub = env.PROMOTION_CONTROL.getByName("promotion-alarm-expiry");
    await stub.change(
      { enabled: true, startAt: baseNow, endAt: baseNow + 60_000 },
      "redacted-owner-ref",
      baseNow,
    );
    await runInDurableObject(stub, async (_instance, state) => {
      state.storage.sql.exec(
        "UPDATE promotion_state SET end_at = ? WHERE id = 1",
        Date.now() - 1,
      );
      await state.storage.setAlarm(Date.now() + 60_000);
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    expect(await stub.current()).toMatchObject({ enabled: false, revision: 2 });
  });

  it("allows only authorized staff to create an explicit repricing revision", async () => {
    const conversationRef = "9".repeat(64);
    const draft = env.DRAFT_ORDER.getByName(conversationRef);
    const texts = [
      ["a", "พรีออเดอร์", true],
      ["b", "ยินยอม", false],
      ["c", completedWorkerForm({ items: [["แฮมชีส", "3"]] }), false],
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
      revision: 4,
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

function setPromotion(times: { startAt: number; endAt: number }) {
  return exports.default.fetch(
    new Request("https://test.invalid/admin/promotion", {
      method: "POST",
      headers: {
        authorization: "Bearer unit-test-admin-key",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ownerId: "OWNER_TEST",
        enabled: true,
        ...times,
      }),
    }),
  );
}

function completedWorkerForm(
  overrides: {
    readonly name?: string;
    readonly items?: readonly (readonly [string, string])[];
  } = {},
): string {
  let form = draftReservationForm(baseNow);
  const replacements = new Map([
    ["ชื่อผู้รับ", overrides.name ?? "มะลิ"],
    ["เบอร์โทร", "0812345678"],
    ["รอบรับ", "11:00"],
    ["วิธีรับ", "รับที่ร้าน"],
  ]);
  form = form
    .split("\n")
    .map((line) => {
      const key = line.split(":", 1)[0] ?? "";
      const replacement = replacements.get(key);
      return replacement === undefined ? line : `${key}: ${replacement}`;
    })
    .join("\n");
  for (const [product, quantity] of overrides.items ?? [["แฮมชีส", "2"]]) {
    if (form.includes(`${product}:`)) {
      form = form
        .split("\n")
        .map((line) =>
          line.startsWith(`${product}:`) ? `${product}: ${quantity}` : line,
        )
        .join("\n");
    } else form += `\n${product}: ${quantity}`;
  }
  return form;
}
