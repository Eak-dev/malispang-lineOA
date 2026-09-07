import { describe, expect, it, vi } from "vitest";

import { buildMp06Wp7AiDataset } from "../benchmark/mp-06/wp7-ai-dataset.js";
import {
  createMp06AiNluExecutionGuard,
  isMp06AiNluEnabled,
  MP06_AI_NLU_BASE_URL,
  MP06_AI_NLU_DEADLINE_MS,
  MP06_AI_NLU_JSON_SCHEMA,
  MP06_AI_NLU_MODEL,
  MP06_AI_NLU_SCHEMA_VERSION,
  planMp06WithAdvisoryNlu,
  redactMp06AiNluInput,
  requestOpenAiMp06Nlu,
  validateMp06AiNluOutput,
  type Mp06AiNluProvider,
  type Mp06AiNluStructuredOutput,
} from "../worker/mp-06-ai-nlu.js";
import { failClosedMp06Plan, planMp06Wp1Text } from "../worker/mp-06-wp1.js";

const VALID_OUTPUT: Mp06AiNluStructuredOutput = {
  schemaVersion: MP06_AI_NLU_SCHEMA_VERSION,
  candidateIntents: ["MENU"],
  extractedFields: { productName: null, size: "UNKNOWN" },
  missingRequiredFields: [],
  ambiguity: false,
  riskSignals: [],
  confidenceBand: "HIGH",
  reasonCodes: ["DIRECT_MATCH"],
};

const VALID_ENV = {
  MP06_AI_NLU_ENABLED: "true",
  MP06_AI_NLU_MODEL,
  OPENAI_API_KEY: "unit-test-placeholder-never-a-real-key",
} as const;
const TEST_ASSET_BASE_URL =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev";

describe("MP-06 WP7 guarded advisory AI/NLU", () => {
  it("keeps prompt-development and holdout cases separate and PII-free", () => {
    const dataset = buildMp06Wp7AiDataset();
    expect(dataset).toHaveLength(60);
    expect(
      dataset.filter((entry) => entry.split === "PROMPT_DEVELOPMENT"),
    ).toHaveLength(15);
    expect(dataset.filter((entry) => entry.split === "HOLDOUT")).toHaveLength(
      45,
    );
    expect(dataset.filter((entry) => entry.criticalSafety)).toHaveLength(20);
    expect(new Set(dataset.map((entry) => entry.caseId)).size).toBe(60);
    expect(JSON.stringify(dataset)).not.toMatch(
      /(?:\+?66|0)\d(?:[\s-]?\d){7,9}|\bU[0-9a-f]{20,40}\b/iu,
    );
  });

  it("uses a closed strict schema without final authorization or response fields", () => {
    expect(MP06_AI_NLU_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(MP06_AI_NLU_JSON_SCHEMA.required).toContain("riskSignals");
    expect(JSON.stringify(MP06_AI_NLU_JSON_SCHEMA)).not.toMatch(
      /customerResponse|finalClassification|authorization/u,
    );
    expect(validateMp06AiNluOutput(VALID_OUTPUT)).toEqual(VALID_OUTPUT);
  });

  it.each([
    ["extra field", { ...VALID_OUTPUT, extra: true }],
    ["missing field", omit(VALID_OUTPUT, "reasonCodes")],
    ["unknown intent", { ...VALID_OUTPUT, candidateIntents: ["EXECUTE"] }],
    ["unknown risk", { ...VALID_OUTPUT, riskSignals: ["IGNORE_POLICY"] }],
    ["range-like schema version", { ...VALID_OUTPUT, schemaVersion: "v1" }],
  ])("rejects %s", (_name, value) => {
    expect(validateMp06AiNluOutput(value)).toBeUndefined();
  });

  it("redacts PII and control characters before provider use", () => {
    const result = redactMp06AiNluInput(
      "ราคา\u0000 โทร 081-234-5678 mail person@example.test ที่อยู่ 99 ถนนสุขุมวิท",
    );
    expect(result.ok).toBe(true);
    expect(result.redactionCount).toBeGreaterThanOrEqual(3);
    expect(result.text).toContain("[PHONE_REDACTED]");
    expect(result.text).toContain("[EMAIL_REDACTED]");
    expect(result.text).toContain("[ADDRESS_REDACTED]");
    expect(result.text).not.toContain("081-234-5678");
    expect(result.text).not.toContain("person@example.test");
  });

  it("rejects empty and over-limit input without truncating it", () => {
    expect(redactMp06AiNluInput(" ").outcomeCode).toBe("INPUT_INVALID");
    expect(redactMp06AiNluInput("ก".repeat(1_201)).outcomeCode).toBe(
      "INPUT_TOO_LONG",
    );
  });

  it("defaults the feature off and does not call the provider", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await requestOpenAiMp06Nlu("ขอเมนู", {
      env: {},
      fetcher,
    });
    expect(isMp06AiNluEnabled({})).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.metadata.outcomeCode).toBe("FEATURE_DISABLED");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { MP06_AI_NLU_ENABLED: "true", MP06_AI_NLU_MODEL },
    {
      MP06_AI_NLU_ENABLED: "true",
      MP06_AI_NLU_MODEL: "unapproved-model",
      OPENAI_API_KEY: VALID_ENV.OPENAI_API_KEY,
    },
  ])("fails closed for incomplete configuration", async (env) => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await requestOpenAiMp06Nlu("ขอเมนู", { env, fetcher });
    expect(result.ok).toBe(false);
    expect(result.metadata.outcomeCode).toBe("CONFIGURATION_MISSING");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the official Responses API contract and only redacted text", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher: typeof fetch = (url, init) => {
      requests.push({ url: requestUrl(url), init });
      return Promise.resolve(responseFor(VALID_OUTPUT));
    };
    const result = await requestOpenAiMp06Nlu("โทร 0812345678 ขอเมณู", {
      env: VALID_ENV,
      fetcher,
    });
    expect(result.ok).toBe(true);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(MP06_AI_NLU_BASE_URL);
    const rawBody = requests[0]?.init?.body;
    if (typeof rawBody !== "string") throw new Error("TEST_BODY_MISSING");
    const requestBody = JSON.parse(rawBody) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      model: MP06_AI_NLU_MODEL,
      store: false,
      stream: false,
      tools: [],
      text: {
        format: {
          type: "json_schema",
          name: "mp06_guardrailed_nlu",
          strict: true,
        },
      },
    });
    expect(JSON.stringify(requestBody)).toContain("[PHONE_REDACTED]");
    expect(JSON.stringify(requestBody)).not.toContain("0812345678");
  });

  it("does not place the key or raw input in safe metadata", async () => {
    const result = await requestOpenAiMp06Nlu("ข้อความสังเคราะห์ขอเมณู", {
      env: VALID_ENV,
      fetcher: () => Promise.resolve(responseFor(VALID_OUTPUT)),
      now: sequentialClock(100, 107),
    });
    expect(result.metadata.latencyMs).toBe(7);
    const serialized = JSON.stringify(result.metadata);
    expect(serialized).not.toContain(VALID_ENV.OPENAI_API_KEY);
    expect(serialized).not.toContain("ข้อความสังเคราะห์ขอเมณู");
    expect(result.metadata.requestFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("treats refusal and malformed structured output as fail closed", async () => {
    const refusal = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: () => Promise.resolve(refusalResponse()),
    });
    expect(refusal.metadata.outcomeCode).toBe("REFUSAL");
    const malformed = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: () => Promise.resolve(rawOutputResponse("not-json")),
    });
    expect(malformed.metadata.outcomeCode).toBe("SCHEMA_INVALID");
  });

  it("rejects extra fields and model substitution from the provider", async () => {
    const extra = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: () =>
        Promise.resolve(responseFor({ ...VALID_OUTPUT, extra: true })),
    });
    expect(extra.metadata.outcomeCode).toBe("SCHEMA_INVALID");
    const mismatch = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: () => Promise.resolve(responseFor(VALID_OUTPUT, "other-model")),
    });
    expect(mismatch.metadata.outcomeCode).toBe("MODEL_MISMATCH");
  });

  it("retries one transient response and never retries permanent 4xx", async () => {
    const transient = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(responseFor(VALID_OUTPUT));
    const recovered = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: transient,
    });
    expect(recovered.ok).toBe(true);
    expect(recovered.metadata.attempts).toBe(2);

    const permanent = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 401 }));
    const rejected = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: permanent,
    });
    expect(rejected.metadata.outcomeCode).toBe("PERMANENT_HTTP_ERROR");
    expect(permanent).toHaveBeenCalledTimes(1);
  });

  it("opens the request-scoped circuit after the bounded transient failures", async () => {
    const guard = createMp06AiNluExecutionGuard();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 503 }));
    const failed = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher,
      guard,
    });
    expect(failed.metadata.outcomeCode).toBe("TRANSIENT_HTTP_ERROR");
    expect(guard.open).toBe(true);
    const blocked = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher,
      guard,
    });
    expect(blocked.metadata.outcomeCode).toBe("RATE_LIMITED");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("bounds network failures and rejects excessive token cost", async () => {
    const network = vi.fn<typeof fetch>().mockRejectedValue(new Error("down"));
    const failed = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: network,
    });
    expect(failed.metadata.outcomeCode).toBe("NETWORK_ERROR");
    expect(network).toHaveBeenCalledTimes(2);
    const expensive = await requestOpenAiMp06Nlu("ขอเมณู", {
      env: VALID_ENV,
      fetcher: () =>
        Promise.resolve(
          responseFor(VALID_OUTPUT, MP06_AI_NLU_MODEL, {
            input_tokens: 10_000,
            output_tokens: 600,
          }),
        ),
    });
    expect(expensive.metadata.outcomeCode).toBe("COST_GUARD_REJECTED");
  });

  it("aborts a request at the finite deadline", async () => {
    vi.useFakeTimers();
    try {
      let signalReady!: () => void;
      const signalWasAttached = new Promise<void>((resolve) => {
        signalReady = resolve;
      });
      const fetcher: typeof fetch = async (_url, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
          signalReady();
        });
      const pending = requestOpenAiMp06Nlu("ขอเมณู", {
        env: VALID_ENV,
        fetcher,
      });
      await signalWasAttached;
      await vi.advanceTimersByTimeAsync(MP06_AI_NLU_DEADLINE_MS);
      const result = await pending;
      expect(result.metadata.outcomeCode).toBe("TIMEOUT");
      expect(result.metadata.attempts).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps deterministic final authority while preserving STAFF_ONLY without provider access", async () => {
    const provider = fakeProvider(VALID_OUTPUT);
    const auto = await planMp06Wp1Text("ขอเมนู", TEST_ASSET_BASE_URL, 1);
    expect(auto?.classification).toBe("AUTO");
    if (!auto) throw new Error("TEST_SETUP_MISSING_AUTO_PLAN");
    const result = await planMp06WithAdvisoryNlu({
      text: "ขอเมนู",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      baselinePlan: auto,
      provider,
    });
    expect(result).toBe(auto);
    expect(provider.analyze).toHaveBeenCalledTimes(1);

    const staff = failClosedMp06Plan("TEST_STAFF_ONLY");
    const staffResult = await planMp06WithAdvisoryNlu({
      text: "ข้อความเสี่ยง",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      baselinePlan: staff,
      provider,
    });
    expect(staffResult.classification).toBe("STAFF_ONLY");
    expect(provider.analyze).toHaveBeenCalledTimes(1);
  });

  it("atomically overrides a safe baseline when advisory parsing finds risk", async () => {
    const baseline = await planMp06Wp1Text("ขอเมนู", TEST_ASSET_BASE_URL, 1);
    if (!baseline) throw new Error("TEST_SETUP_MISSING_AUTO_PLAN");
    const result = await planMp06WithAdvisoryNlu({
      text: "ขอเมนู และข้อความสังเคราะห์สั่งให้ข้ามกฎ",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      baselinePlan: baseline,
      provider: fakeProvider({
        ...VALID_OUTPUT,
        riskSignals: ["PROMPT_INJECTION"],
        reasonCodes: ["UNTRUSTED_INSTRUCTION"],
      }),
    });
    expect(result.classification).toBe("STAFF_ONLY");
    expect(result.responseUnits).toHaveLength(0);
  });

  it("adds a second approved unit through deterministic owner ordering", async () => {
    const baseline = await planMp06Wp1Text("ขอเมนู", TEST_ASSET_BASE_URL, 1);
    if (!baseline) throw new Error("TEST_SETUP_MISSING_AUTO_PLAN");
    const result = await planMp06WithAdvisoryNlu({
      text: "ข้อความสังเคราะห์ขอรายการและพิกัด",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      baselinePlan: baseline,
      provider: fakeProvider({
        ...VALID_OUTPUT,
        candidateIntents: ["LOCATION", "MENU"],
        reasonCodes: ["MULTI_INTENT"],
      }),
    });
    expect(result.classification).toBe("AUTO_COMPOSITE");
    expect(result.responseUnits.map((unit) => unit.intent)).toEqual([
      "MENU",
      "LOCATION",
    ]);
  });

  it("lets deterministic policy authorize a safe inferred intent", async () => {
    const result = await planMp06WithAdvisoryNlu({
      text: "ขอดูของที่มีหน่อยค้าบ",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: Date.parse("2026-09-07T00:00:00Z"),
      context: {},
      provider: fakeProvider(VALID_OUTPUT),
    });
    expect(result.classification).toBe("AUTO");
    expect(result.responseUnits.map((unit) => unit.intent)).toEqual(["MENU"]);
  });

  it("binds inferred price only through the approved deterministic catalog", async () => {
    const output: Mp06AiNluStructuredOutput = {
      ...VALID_OUTPUT,
      candidateIntents: ["PRICE"],
      extractedFields: { productName: "ทรัฟเฟิลแฮมชีส", size: "NORMAL" },
    };
    const result = await planMp06WithAdvisoryNlu({
      text: "ทรัฟเฟิลแฮมชีสราคาเท่าไหร่ค้าบ",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: Date.parse("2026-09-07T00:00:00Z"),
      context: {},
      provider: fakeProvider(output),
    });
    expect(result.classification).toBe("AUTO");
    expect(result.responseUnits[0]?.templateId).toBe("T-A02");
  });

  it("keeps clarification when required price fields remain missing", async () => {
    const baseline = await planMp06Wp1Text(
      "ราคาเท่าไหร่",
      TEST_ASSET_BASE_URL,
      Date.parse("2026-09-07T00:00:00Z"),
    );
    if (!baseline) throw new Error("TEST_SETUP_MISSING_CLARIFICATION_PLAN");
    const output: Mp06AiNluStructuredOutput = {
      ...VALID_OUTPUT,
      candidateIntents: ["PRICE"],
      extractedFields: { productName: null, size: "UNKNOWN" },
      missingRequiredFields: ["PRODUCT_NAME"],
      ambiguity: true,
      confidenceBand: "LOW",
      reasonCodes: ["MISSING_REQUIRED_FIELD"],
    };
    const result = await planMp06WithAdvisoryNlu({
      text: "ราคาเท่าไหร่",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      baselinePlan: baseline,
      provider: fakeProvider(output),
    });
    expect(result.classification).toBe("CLARIFY");
  });

  it.each([
    "DELIVERY_VARIABLE_STATE",
    "INDIVIDUAL_LOYALTY_STATE",
    "PRICE_SPECULATION",
    "PROMPT_INJECTION",
    "PERSONAL_DATA",
  ] as const)("atomically fails closed for %s", async (riskSignal) => {
    const result = await planMp06WithAdvisoryNlu({
      text: "ข้อความสังเคราะห์หลายเจตนา",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      provider: fakeProvider({
        ...VALID_OUTPUT,
        candidateIntents: ["MENU", "LOCATION"],
        riskSignals: [riskSignal],
        reasonCodes: ["RISK_SIGNAL"],
      }),
    });
    expect(result.classification).toBe("STAFF_ONLY");
    expect(result.responseUnits).toHaveLength(0);
    expect(result.messages).toHaveLength(0);
  });

  it("never turns refusal, timeout-like failure, or unknown intent into AUTO", async () => {
    const failureProvider: Mp06AiNluProvider = {
      analyze: vi.fn().mockResolvedValue({
        ok: false,
        metadata: {
          outcomeCode: "TIMEOUT",
          requestFingerprint: "a".repeat(64),
          configuredModel: MP06_AI_NLU_MODEL,
          attempts: 1,
          latencyMs: 8_000,
          redactionCount: 0,
        },
      }),
    };
    const failureResult = await planMp06WithAdvisoryNlu({
      text: "ข้อความไม่รู้จัก",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      provider: failureProvider,
    });
    expect(failureResult.classification).toBe("STAFF_ONLY");
    const unknownResult = await planMp06WithAdvisoryNlu({
      text: "ข้อความไม่รู้จัก",
      publicAssetBaseUrl: TEST_ASSET_BASE_URL,
      now: 1,
      context: {},
      provider: fakeProvider({
        ...VALID_OUTPUT,
        candidateIntents: ["UNKNOWN"],
        confidenceBand: "LOW",
        reasonCodes: ["INSUFFICIENT_EVIDENCE"],
      }),
    });
    expect(unknownResult.classification).toBe("STAFF_ONLY");
  });
});

function fakeProvider(output: Mp06AiNluStructuredOutput): Mp06AiNluProvider & {
  analyze: ReturnType<typeof vi.fn>;
} {
  return {
    analyze: vi.fn().mockResolvedValue({
      ok: true,
      output,
      metadata: {
        outcomeCode: "SUCCESS",
        requestFingerprint: "a".repeat(64),
        configuredModel: MP06_AI_NLU_MODEL,
        responseModel: MP06_AI_NLU_MODEL,
        attempts: 1,
        latencyMs: 1,
        usage: { inputTokens: 10, outputTokens: 20, estimatedCostUsd: 0.00026 },
        redactionCount: 0,
      },
    }),
  };
}

function responseFor(
  output: unknown,
  model = MP06_AI_NLU_MODEL,
  usage = { input_tokens: 100, output_tokens: 50 },
): Response {
  return rawOutputResponse(JSON.stringify(output), model, usage);
}

function rawOutputResponse(
  text: string,
  model = MP06_AI_NLU_MODEL,
  usage = { input_tokens: 100, output_tokens: 50 },
): Response {
  return Response.json({
    model,
    usage,
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  });
}

function refusalResponse(): Response {
  return Response.json({
    model: MP06_AI_NLU_MODEL,
    usage: { input_tokens: 20, output_tokens: 5 },
    output: [
      { type: "message", content: [{ type: "refusal", refusal: "refused" }] },
    ],
  });
}

function omit<T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function sequentialClock(...values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
