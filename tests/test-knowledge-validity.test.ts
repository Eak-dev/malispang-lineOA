import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import manifestInput from "../config/approved-knowledge-base/test-knowledge-base.json" with { type: "json" };
import legacyInput from "./fixtures/knowledge-base/test-knowledge-base-v1.json" with { type: "json" };
import {
  approvedFaqRecordsFromManifest,
  parseApprovedKnowledgeManifest,
  validateApprovedKnowledgeManifest,
} from "../src/approved-knowledge-manifest.js";
import {
  ApprovedFaqKnowledgeBase,
  FAQ_INTENTS,
  type ApprovedFaqRecord,
} from "../src/faq.js";
import { validateProductionBusinessManifest } from "../src/production-readiness/manifest.js";

const manifest = parseApprovedKnowledgeManifest(manifestInput);
const records = approvedFaqRecordsFromManifest(manifest);
const start = Date.parse("2026-09-30T02:34:48.000Z");
const sample = records[0]!;
function lookup(record: ApprovedFaqRecord, timestamp = start) {
  return new ApprovedFaqKnowledgeBase(
    [record],
    () => new Date(timestamp),
  ).lookupIntent(record.intent);
}

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../config/approved-knowledge-base/test-knowledge-base.json");
  vi.resetModules();
});

describe("TEST knowledge validity until Production release", () => {
  it("uses a release event, not an invented future date or automatic Production approval", () => {
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      environment: "TEST",
      accountName: "มะลิปัง TEST",
      validity: {
        validUntil: "PRODUCTION_RELEASE",
        releaseStatus: "PRE_RELEASE",
        ownerDecision: "MP-OD-2026-09-30-V46",
        productionApprovalRequired: true,
      },
    });
    for (const record of Object.values(manifest.categories)) {
      expect(record).toMatchObject({
        effectiveTo: null,
        freshness: { reviewAt: null, maximumAgeDays: null },
      });
    }
  });

  it("preserves the exact historical manifest bytes and all 14 approved answers", async () => {
    const bytes = await readFile(
      new URL(
        "./fixtures/knowledge-base/test-knowledge-base-v1.json",
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "f9eb6973dbec13250b3889d481d83652e6aac361d02106a39499308b1786756f",
    );
    for (const intent of FAQ_INTENTS) {
      const current = manifest.categories[intent];
      const prior = legacyInput.categories[intent];
      expect(current.status).toBe("APPROVED");
      if (current.status !== "APPROVED")
        throw new Error("CURRENT_RECORD_NOT_APPROVED");
      expect(current.customerFacingAnswer).toBe(prior.customerFacingAnswer);
      expect(current.checksum).toBe(prior.checksum);
      expect(current.checksum).toBe(
        createHash("sha256").update(current.customerFacingAnswer).digest("hex"),
      );
      expect(current.keywords).toEqual(prior.keywords);
      expect(current.owner).toBe(prior.owner);
      expect(current.supersedes).toBe(prior.version);
      expect(current.version).not.toBe(prior.version);
      expect(current.source.reference).toBe(
        "docs/project/OWNER_DECISION_LOG.md",
      );
    }
  });

  it.each([
    start,
    Date.parse("2026-10-31T00:00:00+07:00"),
    Date.parse("2099-12-31T00:00:00+07:00"),
  ])("keeps all 14 categories usable during PRE_RELEASE at %s", (timestamp) => {
    const kb = new ApprovedFaqKnowledgeBase(records, () => new Date(timestamp));
    for (const intent of FAQ_INTENTS)
      expect(kb.lookupIntent(intent).status).toBe("APPROVED");
  });

  it("does not backdate the new permission or freeze the runtime clock", () => {
    let timestamp = start - 1;
    const kb = new ApprovedFaqKnowledgeBase(records, () => new Date(timestamp));
    expect(kb.lookupIntent("MENU").status).toBe("NOT_AUTHORITATIVE");
    timestamp = start;
    expect(kb.lookupIntent("MENU").status).toBe("APPROVED");
    timestamp = Number.NaN;
    expect(kb.lookupIntent("MENU").status).toBe("NOT_AUTHORITATIVE");
  });

  it.each(["RELEASED", "UNKNOWN"] as const)(
    "blocks every category when release status is %s",
    (releaseStatus) => {
      const input = structuredClone(manifestInput);
      input.validity.releaseStatus = releaseStatus;
      const kb = new ApprovedFaqKnowledgeBase(
        approvedFaqRecordsFromManifest(parseApprovedKnowledgeManifest(input)),
        () => new Date(start),
      );
      for (const intent of FAQ_INTENTS)
        expect(kb.lookupIntent(intent).status).toBe("NOT_AUTHORITATIVE");
    },
  );

  it("does not reuse an earlier successful lifecycle decision", () => {
    const testValidity = { ...sample.testValidity! };
    const kb = new ApprovedFaqKnowledgeBase(
      [{ ...sample, testValidity }],
      () => new Date(start),
    );
    expect(kb.lookupIntent(sample.intent).status).toBe("APPROVED");
    testValidity.releaseStatus = "RELEASED";
    expect(kb.lookupIntent(sample.intent).status).toBe("NOT_AUTHORITATIVE");
  });

  it.each(["REVOKED", "DRAFT"] as const)(
    "does not override %s status",
    (status) => {
      expect(lookup({ ...sample, status }).status).toBe("NOT_AUTHORITATIVE");
    },
  );

  it("preserves future approval/start, missing provenance, checksum format and conflict guards", () => {
    for (const record of [
      { ...sample, approvedAt: new Date(start + 1).toISOString() },
      { ...sample, effectiveFrom: new Date(start + 1).toISOString() },
      { ...sample, owner: "" },
      { ...sample, version: "" },
      { ...sample, checksum: "invalid" },
      { ...sample, source: { ...sample.source, reference: "" } },
    ])
      expect(lookup(record).status).toBe("NOT_AUTHORITATIVE");
    expect(
      new ApprovedFaqKnowledgeBase(
        [sample, { ...sample, id: "second-record" }],
        () => new Date(start),
      ).lookupIntent(sample.intent).status,
    ).toBe("CONFLICT");
  });

  it("requires lifecycle metadata for null cutoffs; no implicit never-expire fallback", () => {
    const without = structuredClone(sample);
    Reflect.deleteProperty(without, "testValidity");
    expect(lookup(without).status).toBe("NOT_AUTHORITATIVE");
    for (const field of [
      "environment",
      "accountName",
      "validUntil",
      "releaseStatus",
      "ownerDecision",
      "productionApprovalRequired",
    ]) {
      const record = structuredClone(sample);
      Reflect.deleteProperty(record.testValidity!, field);
      expect(lookup(record).status).toBe("NOT_AUTHORITATIVE");
    }
  });

  it("does not convert a dated record to never-expire through injected metadata", () => {
    const prior = approvedFaqRecordsFromManifest(
      parseApprovedKnowledgeManifest(legacyInput),
    )[0]!;
    expect(
      lookup({ ...prior, testValidity: sample.testValidity! }).status,
    ).toBe("NOT_AUTHORITATIVE");
    expect(
      validateApprovedKnowledgeManifest({
        ...legacyInput,
        validity: manifestInput.validity,
      }),
    ).toContain("LIFECYCLE_REQUIRES_SCHEMA_2");
  });

  it.each(["effectiveTo", "reviewAt", "maximumAgeDays"])(
    "requires explicit null for %s, not omitted or dated",
    (field) => {
      for (const value of [undefined, "2099-01-01T00:00:00Z", 999999]) {
        const input = structuredClone(manifestInput);
        const target =
          field === "effectiveTo"
            ? input.categories.MENU
            : input.categories.MENU.freshness;
        Reflect.set(target, field, value);
        expect(validateApprovedKnowledgeManifest(input)).toContain(
          "MENU_LIFECYCLE_DATES_MUST_BE_NULL",
        );
      }
    },
  );

  it("rejects missing/malformed lifecycle and different environments at parse and projection boundaries", () => {
    for (const input of [
      { ...manifestInput, validity: undefined },
      {
        ...manifestInput,
        validity: { ...manifestInput.validity, releaseStatus: ["PRE_RELEASE"] },
      },
      {
        ...manifestInput,
        validity: { ...manifestInput.validity, releaseStatus: {} },
      },
      {
        ...manifestInput,
        validity: { ...manifestInput.validity, releaseStatus: "GUESS" },
      },
      {
        ...manifestInput,
        validity: {
          ...manifestInput.validity,
          productionApprovalRequired: false,
        },
      },
      { ...manifestInput, environment: "PRODUCTION" },
      { ...manifestInput, accountName: "มะลิปัง" },
    ]) {
      expect(validateApprovedKnowledgeManifest(input).length).toBeGreaterThan(
        0,
      );
      expect(() => parseApprovedKnowledgeManifest(input)).toThrow(
        "INVALID_APPROVED_KNOWLEDGE_MANIFEST",
      );
      // Even an untyped/cast caller cannot skip the runtime validation in projection.
      expect(() => {
        Reflect.apply(approvedFaqRecordsFromManifest, undefined, [input]);
      }).toThrow("INVALID_APPROVED_KNOWLEDGE_MANIFEST");
    }
    expect(
      validateProductionBusinessManifest({
        ...manifestInput,
        environment: "PRODUCTION",
        accountName: "มะลิปัง",
      }),
    ).toContain("INVALID_SCHEMA_VERSION");
  });

  it.each(["RELEASED", "UNKNOWN"] as const)(
    "Worker refuses route, answer and response unit when %s",
    async (releaseStatus) => {
      vi.setSystemTime(new Date("2026-10-01T00:00:00+07:00"));
      vi.doMock(
        "../config/approved-knowledge-base/test-knowledge-base.json",
        () => ({
          default: {
            ...manifestInput,
            validity: { ...manifestInput.validity, releaseStatus },
          },
        }),
      );
      const worker = await import("../worker/knowledge.js");
      expect(
        worker.enforceApprovedKnowledge({
          replyKind: "MENU",
          reasonCode: "TEST",
          handoff: false,
          allowDuringHandoff: true,
        }),
      ).toMatchObject({
        replyKind: "SAFE_FALLBACK",
        handoff: true,
        allowDuringHandoff: false,
      });
      expect(worker.approvedAnswerForReplyKind("MENU")).toBeUndefined();
      expect(
        await worker.approvedKnowledgeResponseUnit("MENU"),
      ).toBeUndefined();
    },
  );
});
