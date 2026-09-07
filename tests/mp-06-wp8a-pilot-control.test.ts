import { describe, expect, it, vi } from "vitest";

import {
  MP06_AI_NLU_MODEL,
  MP06_AI_NLU_SCHEMA_VERSION,
  requestOpenAiMp06Nlu,
  type Mp06AiNluAttemptController,
} from "../worker/mp-06-ai-nlu.js";
import {
  admitMp06PilotEventThroughCoordinator,
  estimateMp06AttemptUpperBoundMicroUsd,
  mp06PilotLimitsFromEnvironment,
  mp06UsageCostMicroUsd,
  MP06_PILOT_BUDGET_MICRO_USD,
  verifiedMp06PilotSender,
} from "../worker/mp-06-pilot-control.js";
import { parseWebhook } from "../worker/webhook-schema.js";

const validEnvironment = {
  ENVIRONMENT: "TEST",
  LINE_OA_ACCOUNT_NAME: "มะลิปัง TEST",
  MP06_PILOT_CONTROL_ENABLED: "true",
  MP06_PILOT_MAX_TESTERS: "5",
  MP06_PILOT_EVENTS_PER_MINUTE: "20",
  MP06_PILOT_EVENTS_PER_HOUR: "200",
  MP06_PILOT_EVENTS_PER_SESSION: "200",
  MP06_PILOT_PROVIDER_ATTEMPTS_PER_SESSION: "200",
  MP06_PILOT_SESSION_MINUTES: "60",
  MP06_PILOT_BUDGET_MICRO_USD: "5000000",
  MP06_PILOT_MAX_CONCURRENCY: "1",
} as const;

const aiEnvironment = {
  MP06_AI_NLU_ENABLED: "true",
  MP06_AI_NLU_MODEL,
  OPENAI_API_KEY: "unit-test-placeholder-never-a-real-key",
} as const;

describe("MP-06 WP8A runtime pilot contract", () => {
  it("accepts only the exact TEST-only configuration and fails closed on drift", () => {
    expect(mp06PilotLimitsFromEnvironment(validEnvironment)).toMatchObject({
      maximumTesters: 5,
      eventsPerMinute: 20,
      eventsPerHour: 200,
      eventsPerSession: 200,
      providerAttemptsPerSession: 200,
      sessionDurationMs: 3_600_000,
      budgetMicroUsd: MP06_PILOT_BUDGET_MICRO_USD,
      maximumConcurrency: 1,
    });
    for (const changed of [
      { ...validEnvironment, ENVIRONMENT: "PRODUCTION" },
      { ...validEnvironment, MP06_PILOT_CONTROL_ENABLED: "false" },
      { ...validEnvironment, MP06_PILOT_EVENTS_PER_MINUTE: "21" },
      { ...validEnvironment, MP06_PILOT_BUDGET_MICRO_USD: "" },
    ]) {
      expect(mp06PilotLimitsFromEnvironment(changed)).toBeUndefined();
    }
  });

  it("derives direct-user identity only from the signature-protected LINE source", () => {
    const direct = parseWebhook(
      webhookSource({
        type: "user",
        userId: "U_SYNTHETIC_INTERNAL_TESTER",
      }),
    );
    expect(direct?.events[0]).toMatchObject({
      sourceType: "USER",
      senderId: "U_SYNTHETIC_INTERNAL_TESTER",
      conversationId: "U_SYNTHETIC_INTERNAL_TESTER",
    });
    const group = parseWebhook(
      webhookSource({
        type: "group",
        groupId: "G_SYNTHETIC_TEST",
        userId: "U_SYNTHETIC_INTERNAL_TESTER",
      }),
    );
    expect(group?.events[0]).toMatchObject({
      sourceType: "GROUP",
      conversationId: "G_SYNTHETIC_TEST",
    });
    expect(parseWebhook(webhookSource({ userId: "U_SPOOFED" }))).toEqual({
      destination: "U_TEST_DESTINATION",
      events: [],
    });
    expect(
      verifiedMp06PilotSender({
        sourceType: "USER",
        senderId: "U_SYNTHETIC_INTERNAL_TESTER",
      }),
    ).toBe("U_SYNTHETIC_INTERNAL_TESTER");
    expect(
      verifiedMp06PilotSender({
        sourceType: "GROUP",
        senderId: "U_SYNTHETIC_INTERNAL_TESTER",
      }),
    ).toBeUndefined();
  });

  it("reserves then authorizes before dispatch and reconciles known usage", async () => {
    const calls: string[] = [];
    const controller = recordingController(calls);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(validResponse());
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher,
      attemptController: controller,
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["reserve:1", "dispatch:1", "settle:1:KNOWN:800"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when reservation or dispatch authorization fails", async () => {
    for (const rejectedAt of ["reserve", "dispatch"] as const) {
      const fetcher = vi.fn<typeof fetch>();
      const calls: string[] = [];
      const controller = recordingController(calls, rejectedAt);
      const result = await requestOpenAiMp06Nlu("ขอเมนู", {
        env: aiEnvironment,
        fetcher,
        attemptController: controller,
      });
      expect(result.ok).toBe(false);
      expect(result.metadata.outcomeCode).toBe("PILOT_CONTROL_REJECTED");
      expect(fetcher).not.toHaveBeenCalled();
      if (rejectedAt === "dispatch") expect(calls).toContain("cancel:1");
    }
  });

  it("requires a fresh reservation for a single safe transient retry", async () => {
    const calls: string[] = [];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 429 }))
      .mockResolvedValueOnce(validResponse());
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher,
      attemptController: recordingController(calls),
    });
    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(calls).toEqual([
      "reserve:1",
      "dispatch:1",
      "settle:1:KNOWN:0",
      "reserve:2",
      "dispatch:2",
      "settle:2:KNOWN:800",
    ]);
  });

  it("treats network and timeout usage as unknown, settles once and never retries", async () => {
    const calls: string[] = [];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("offline"));
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher,
      attemptController: recordingController(calls),
    });
    expect(result.ok).toBe(false);
    expect(result.metadata.outcomeCode).toBe("NETWORK_ERROR");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      "reserve:1",
      "dispatch:1",
      "settle:1:USAGE_UNKNOWN:unknown",
    ]);
  });

  it("treats 5xx and missing usage as uncertain instead of reclaiming budget", async () => {
    for (const response of [
      Response.json({}, { status: 500 }),
      Response.json({
        model: MP06_AI_NLU_MODEL,
        output: [],
      }),
    ]) {
      const calls: string[] = [];
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
      const result = await requestOpenAiMp06Nlu("ขอเมนู", {
        env: aiEnvironment,
        fetcher,
        attemptController: recordingController(calls),
      });
      expect(result.ok).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([
        "reserve:1",
        "dispatch:1",
        "settle:1:USAGE_UNKNOWN:unknown",
      ]);
    }
  });

  it("uses integer micro-USD accounting and a conservative request upper bound", () => {
    expect(mp06UsageCostMicroUsd(100, 50)).toBe(800);
    expect(mp06UsageCostMicroUsd(-1, 1)).toBeUndefined();
    expect(estimateMp06AttemptUpperBoundMicroUsd("{}")).toBeGreaterThan(7_200);
    expect(estimateMp06AttemptUpperBoundMicroUsd("{}")).toBeLessThan(
      MP06_PILOT_BUDGET_MICRO_USD,
    );
  });

  it("turns coordinator unavailability into a code-only fail-closed admission", async () => {
    const result = await admitMp06PilotEventThroughCoordinator(
      {
        mp06PilotStatus: () => Promise.reject(new Error("private detail")),
        admitMp06PilotEvent: () =>
          Promise.reject(new Error("should not be reached")),
      },
      {
        eventRef: "a".repeat(64),
        testerRef: "b".repeat(64),
        now: 1_789_000_000_000,
      },
    );
    expect(result).toEqual({ code: "CONTROL_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private detail");
  });

  it("keeps safe failures code-only and never includes injected marker data", async () => {
    const marker = "PRIVATE_TESTER_MARKER_DO_NOT_ECHO";
    const result = await requestOpenAiMp06Nlu(marker, {
      env: aiEnvironment,
      fetcher: vi.fn<typeof fetch>(),
      attemptController: recordingController([], "reserve"),
    });
    expect(JSON.stringify(result)).not.toContain(marker);
    expect(JSON.stringify(result)).not.toMatch(
      /OPENAI_API_KEY|unit-test-placeholder/u,
    );
  });
});

function recordingController(
  calls: string[],
  rejectedAt?: "reserve" | "dispatch",
): Mp06AiNluAttemptController {
  return {
    reserve({ attempt, upperBoundCostMicroUsd }) {
      expect(upperBoundCostMicroUsd).toBeGreaterThan(0);
      calls.push(`reserve:${attempt}`);
      return Promise.resolve(rejectedAt !== "reserve");
    },
    authorizeDispatch(attempt) {
      calls.push(`dispatch:${attempt}`);
      return Promise.resolve(rejectedAt !== "dispatch");
    },
    cancelBeforeDispatch(attempt) {
      calls.push(`cancel:${attempt}`);
      return Promise.resolve();
    },
    settle({ attempt, outcome, actualCostMicroUsd }) {
      calls.push(
        `settle:${attempt}:${outcome}:${actualCostMicroUsd ?? "unknown"}`,
      );
      return Promise.resolve(true);
    },
  };
}

function validResponse(): Response {
  return Response.json({
    model: MP06_AI_NLU_MODEL,
    usage: { input_tokens: 100, output_tokens: 50 },
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              schemaVersion: MP06_AI_NLU_SCHEMA_VERSION,
              candidateIntents: ["MENU"],
              extractedFields: { productName: null, size: "UNKNOWN" },
              missingRequiredFields: [],
              ambiguity: false,
              riskSignals: [],
              confidenceBand: "HIGH",
              reasonCodes: ["DIRECT_MATCH"],
            }),
          },
        ],
      },
    ],
  });
}

function webhookSource(source: Record<string, unknown>): unknown {
  return {
    destination: "U_TEST_DESTINATION",
    events: [
      {
        type: "message",
        webhookEventId: "evt-synthetic",
        replyToken: "reply-synthetic",
        source,
        message: { type: "text", text: "เมนู" },
      },
    ],
  };
}
