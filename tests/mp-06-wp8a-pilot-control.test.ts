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

  it("denies native fetch when the durable pre-fetch checkpoint is not acknowledged", async () => {
    const calls: string[] = [];
    const base = recordingController(calls);
    const fetcher = vi.fn<typeof fetch>();
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher,
      attemptController: {
        ...base,
        checkpoint: ({ phase }) =>
          Promise.resolve(phase !== "OUTBOUND_FETCH_STARTING"),
      },
    });
    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(calls).toEqual([
      "reserve:1",
      "dispatch:1",
      "settle:1:USAGE_UNKNOWN:unknown",
    ]);
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

  it("settles at the application deadline even when fetch ignores abort and ignores a late response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T00:00:00.000Z"));
    try {
      const calls: string[] = [];
      let resolveFetch: ((response: Response) => void) | undefined;
      const fetcher = vi.fn<typeof fetch>(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      );
      const resultPromise = requestOpenAiMp06Nlu("ขอเมนู", {
        env: aiEnvironment,
        fetcher,
        attemptController: recordingController(calls),
      });
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(8_000);
      const result = await resultPromise;
      expect(result.ok).toBe(false);
      expect(result.metadata).toMatchObject({
        outcomeCode: "TIMEOUT",
        settlementCode: "USAGE_UNKNOWN_SETTLED",
      });
      expect(calls).toEqual([
        "reserve:1",
        "dispatch:1",
        "settle:1:USAGE_UNKNOWN:unknown",
      ]);

      resolveFetch?.(validResponse());
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies the same deadline while a received response body never finishes parsing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T00:00:00.000Z"));
    try {
      const calls: string[] = [];
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => new Promise<never>(() => undefined),
      } as unknown as Response);
      const resultPromise = requestOpenAiMp06Nlu("ขอเมนู", {
        env: aiEnvironment,
        fetcher,
        attemptController: recordingController(calls),
      });
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(8_000);
      const result = await resultPromise;
      expect(result.ok).toBe(false);
      expect(result.metadata).toMatchObject({
        outcomeCode: "TIMEOUT",
        settlementCode: "USAGE_UNKNOWN_SETTLED",
      });
      expect(calls).toEqual([
        "reserve:1",
        "dispatch:1",
        "settle:1:USAGE_UNKNOWN:unknown",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports settlement unavailability without exposing the control error", async () => {
    const marker = "PRIVATE_SETTLEMENT_FAILURE";
    const controller = recordingController([]);
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      attemptController: {
        ...controller,
        settle: () => Promise.reject(new Error(marker)),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.metadata).toMatchObject({
      outcomeCode: "NETWORK_ERROR",
      settlementCode: "SETTLEMENT_UNAVAILABLE",
    });
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("bounds settlement RPC wait and rejects a late completion without authorizing AI output", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T00:00:00.000Z"));
    try {
      let finishSettlement: ((accepted: boolean) => void) | undefined;
      let settlementStarted = false;
      const resultPromise = requestOpenAiMp06Nlu("ขอเมนู", {
        env: aiEnvironment,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(validResponse()),
        attemptController: {
          ...recordingController([]),
          settle: () =>
            new Promise<boolean>((resolve) => {
              settlementStarted = true;
              finishSettlement = resolve;
            }),
        },
      });
      await vi.waitFor(() => expect(settlementStarted).toBe(true));
      await vi.advanceTimersByTimeAsync(2_000);
      const result = await resultPromise;
      expect(result.ok).toBe(false);
      expect(result.metadata).toMatchObject({
        outcomeCode: "PILOT_CONTROL_REJECTED",
        settlementCode: "SETTLEMENT_UNAVAILABLE",
        phaseDurationsMs: { settlement: 2_000 },
      });
      finishSettlement?.(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(result.ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("captures only sanitized provider IDs, error metadata, headers and phase timings", async () => {
    const settleInputs: Parameters<Mp06AiNluAttemptController["settle"]>[0][] =
      [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      expect(new Headers(init?.headers).get("x-client-request-id")).toBe(
        "client-request-safe-1",
      );
      return Promise.resolve(
        Response.json(
          {
            error: {
              type: "invalid_request_error",
              code: "synthetic_invalid",
              param: "input",
              message: "PRIVATE_PROVIDER_MESSAGE",
            },
          },
          {
            status: 400,
            headers: {
              "x-request-id": "req_safe_123",
              "retry-after": "2",
              "x-ratelimit-remaining-requests": "17",
            },
          },
        ),
      );
    });
    const base = recordingController([]);
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: aiEnvironment,
      fetcher,
      clientRequestId: () => "client-request-safe-1",
      attemptController: {
        ...base,
        settle: (input) => {
          settleInputs.push(input);
          return Promise.resolve(true);
        },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.metadata).toMatchObject({
      outcomeCode: "PERMANENT_HTTP_ERROR",
      httpStatus: 400,
      providerRequestId: "req_safe_123",
      clientRequestId: "client-request-safe-1",
      providerErrorType: "invalid_request_error",
      providerErrorCode: "synthetic_invalid",
      retryAfterMs: 2_000,
      rateLimitRemainingRequests: 17,
    });
    expect(settleInputs[0]?.diagnostics).toMatchObject({
      clientRequestId: "client-request-safe-1",
      providerRequestId: "req_safe_123",
      httpStatus: 400,
      providerErrorType: "invalid_request_error",
      providerErrorCode: "synthetic_invalid",
      outcomeCode: "PROVIDER_HTTP_ERROR",
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_PROVIDER_MESSAGE");
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
    authorizeDispatch({ attempt, clientRequestId }) {
      expect(clientRequestId.length).toBeGreaterThan(0);
      calls.push(`dispatch:${attempt}`);
      return Promise.resolve(rejectedAt !== "dispatch");
    },
    cancelBeforeDispatch(attempt) {
      calls.push(`cancel:${attempt}`);
      return Promise.resolve();
    },
    checkpoint({ clientRequestId }) {
      expect(clientRequestId.length).toBeGreaterThan(0);
      return Promise.resolve(true);
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
