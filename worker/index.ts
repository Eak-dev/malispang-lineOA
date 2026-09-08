import { ConversationStateDO, HandoffRegistryDO } from "./durable-objects.js";
import { DraftOrderDO, PromotionControlDO } from "./draft-order-objects.js";
import { authorizeTestPromotionChange } from "../src/test-promotion-control.js";
import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "./knowledge.js";
import { sendLineReply } from "./line-api.js";
import {
  createOpenAiMp06NluProvider,
  MP06_AI_NLU_MODEL,
  planMp06WithAdvisoryNlu,
  type Mp06AiNluAttemptController,
  type Mp06AiNluEnvironment,
  type Mp06AiNluSafeMetadata,
} from "./mp-06-ai-nlu.js";
import {
  admitMp06PilotEventThroughCoordinator,
  isMp06PilotReference,
  mp06PilotLimitsFromEnvironment,
  MP06_PILOT_CONTROL_OBJECT_NAME,
  verifiedMp06PilotSender,
  type Mp06PilotAdmissionCode,
} from "./mp-06-pilot-control.js";
import { planMp06Wp1Text, type Mp06Wp1Plan } from "./mp-06-wp1.js";
import {
  classifyPostback,
  classifyText,
  replyMessage,
  replyMessages,
  type RouteDecision,
} from "./routing.js";
import {
  assertTestEnvironment,
  assertRequiredSecrets,
  bearerToken,
  MAX_ADMIN_BYTES,
  MAX_WEBHOOK_BYTES,
  readBoundedBody,
  secureTextEqual,
  sha256Reference,
  verifyLineSignature,
} from "./security.js";
import { parseWebhook, type ParsedLineEvent } from "./webhook-schema.js";

export {
  ConversationStateDO,
  DraftOrderDO,
  HandoffRegistryDO,
  PromotionControlDO,
};

const decoder = new TextDecoder();

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    try {
      assertTestEnvironment(env);
      if (request.method === "GET" && url.pathname === "/health") {
        return Response.json({
          status: "ok",
          environment: "TEST",
          account: "มะลิปัง TEST",
          persistence: "durable-object-sqlite",
        });
      }
      assertRequiredSecrets(env);
      if (url.pathname === "/webhook") {
        return await handleWebhook(request, env, ctx);
      }
      if (url.pathname.startsWith("/admin/")) {
        return await handleAdmin(request, env, url);
      }
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
      if (code === "REQUEST_TOO_LARGE") {
        return Response.json({ error: code }, { status: 413 });
      }
      console.error(
        JSON.stringify({
          level: "error",
          outcome: "REQUEST_FAILED",
          code: safeErrorCode(code),
        }),
      );
      return Response.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  const signature = request.headers.get("x-line-signature") ?? "";
  const body = await readBoundedBody(request, MAX_WEBHOOK_BYTES);
  if (!(await verifyLineSignature(body, signature, env.LINE_CHANNEL_SECRET))) {
    console.warn(
      JSON.stringify({ level: "warn", outcome: "SIGNATURE_REJECTED" }),
    );
    return Response.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(decoder.decode(body));
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const webhook = parseWebhook(decoded);
  if (!webhook)
    return Response.json({ error: "INVALID_WEBHOOK" }, { status: 400 });
  if (!(await secureTextEqual(webhook.destination, env.LINE_BOT_USER_ID))) {
    console.error(
      JSON.stringify({ level: "error", outcome: "DESTINATION_GUARD_REJECTED" }),
    );
    return Response.json({ error: "WRONG_TEST_DESTINATION" }, { status: 403 });
  }

  const processing = processWebhookEvents(webhook.events, env).catch(() => {
    console.error(
      JSON.stringify({
        level: "error",
        outcome: "WEBHOOK_BACKGROUND_PROCESSING_FAILED",
        code: "FAIL_CLOSED",
      }),
    );
  });
  ctx.waitUntil(processing);
  return Response.json({ ok: true });
}

async function processWebhookEvents(
  events: readonly ParsedLineEvent[],
  env: Env,
): Promise<void> {
  for (const event of events) await processLineEvent(event, env);
}

async function processLineEvent(
  event: ParsedLineEvent,
  env: Env,
): Promise<void> {
  const [eventRef, conversationRef] = await Promise.all([
    sha256Reference(event.eventId),
    sha256Reference(event.conversationId),
  ]);
  const decision = enforceApprovedKnowledge(eventDecision(event));
  const now = Date.now();
  const conversation = env.CONVERSATION_STATE.getByName(conversationRef);
  if (event.kind === "text" && (await conversation.state()) === "BOT_ACTIVE") {
    const decisionForStart = classifyText(event.text);
    const draft = env.DRAFT_ORDER.getByName(conversationRef);
    const draftResult = await draft.processText({
      eventRef,
      text: event.text,
      now,
      startRequested: decisionForStart.replyKind === "ADVANCE_ORDER",
      promotion: await env.PROMOTION_CONTROL.getByName(
        "test-draft-promotion",
      ).current(),
      auditRetentionSeconds: positiveInteger(env.AUDIT_RETENTION_SECONDS),
    });
    if (draftResult.handled) {
      if (draftResult.duplicate) {
        logOutcome(eventRef, "DUPLICATE", "DRAFT_EVENT_ALREADY_DELIVERED");
        return;
      }
      if (draftResult.enterHandoff) {
        const handoffResult = await conversation.processEvent({
          eventRef,
          decision: {
            replyKind: "HANDOFF_ACK",
            reasonCode: "DRAFT_REQUIRES_STAFF_REVIEW",
            handoff: true,
            allowDuringHandoff: false,
          },
          now,
          processedRetentionSeconds: positiveInteger(
            env.PROCESSED_EVENT_RETENTION_SECONDS,
          ),
          auditRetentionSeconds: positiveInteger(env.AUDIT_RETENTION_SECONDS),
        });
        if (handoffResult.enteredHandoff) {
          await env.HANDOFF_REGISTRY.getByName("test-active-handoffs").activate(
            conversationRef,
            now,
          );
        }
      }
      const draftMessages = draftResult.messages.map((text) => ({
        type: "text" as const,
        text,
      }));
      if (draftResult.enterHandoff) {
        draftMessages.push({
          type: "text",
          text: "รับเรื่องแล้วค่ะ พนักงานมะลิปังจะเข้ามาตอบโดยเร็วที่สุดนะคะ ระหว่างนี้สามารถพิมพ์รายละเอียดเพิ่มเติมไว้ได้เลยค่ะ 😊",
        });
      }
      if (draftMessages.length > 0) {
        await sendLineReply(
          event.replyToken,
          draftMessages,
          env.LINE_CHANNEL_ACCESS_TOKEN,
        );
        await draft.markDelivered(eventRef);
        if (draftResult.enterHandoff)
          await conversation.markDelivered(eventRef);
      }
      logOutcome(eventRef, "REPLIED", `DRAFT_${draftResult.state}`);
      return;
    }
  }
  if (event.kind === "text") {
    const mp06Context = await conversation.mp06Context();
    let plan = await planMp06Wp1Text(
      event.text,
      env.PUBLIC_ASSET_BASE_URL,
      now,
      mp06Context,
    );
    const aiEnv = env as Env & Mp06AiNluEnvironment;
    if (!plan || plan.classification !== "STAFF_ONLY") {
      const pilot = await admitMp06PilotAiEvent(event, eventRef, env, now);
      if (pilot.code === "DUPLICATE") {
        logOutcome(eventRef, "DUPLICATE", "MP06_PILOT_EVENT_ALREADY_ADMITTED");
        return;
      }
      if (pilot.context) {
        const attemptController = createMp06PilotAttemptController(
          pilot.context,
        );
        plan = await planMp06WithAdvisoryNlu({
          text: event.text,
          publicAssetBaseUrl: env.PUBLIC_ASSET_BASE_URL,
          now,
          context: mp06Context,
          ...(plan ? { baselinePlan: plan } : {}),
          provider: createOpenAiMp06NluProvider({
            env: {
              MP06_AI_NLU_ENABLED: "true",
              ...(aiEnv.MP06_AI_NLU_MODEL
                ? { MP06_AI_NLU_MODEL: aiEnv.MP06_AI_NLU_MODEL }
                : {}),
              ...(aiEnv.OPENAI_API_KEY
                ? { OPENAI_API_KEY: aiEnv.OPENAI_API_KEY }
                : {}),
            },
            logger: logAiNluMetadata,
            attemptController,
          }),
        });
        if (
          attemptController.dispatchWasAuthorized() &&
          !(await pilot.context.coordinator.authorizeMp06PilotResult({
            sessionRef: pilot.context.sessionRef,
            eventRef,
            now: Date.now(),
          }))
        ) {
          logOutcome(eventRef, "SILENT", "MP06_PILOT_RESULT_NOT_AUTHORIZED");
          return;
        }
      } else {
        logOutcome(eventRef, "AI_BYPASSED", `MP06_PILOT_${pilot.code}`);
      }
    }
    if (plan) {
      await processMp06Plan(
        plan,
        event,
        eventRef,
        conversationRef,
        conversation,
        env,
        now,
      );
      return;
    }
  }
  const result = await conversation.processEvent({
    eventRef,
    decision,
    now,
    processedRetentionSeconds: positiveInteger(
      env.PROCESSED_EVENT_RETENTION_SECONDS,
    ),
    auditRetentionSeconds: positiveInteger(env.AUDIT_RETENTION_SECONDS),
  });

  if (result.status === "DUPLICATE" || result.status === "SILENT") {
    logOutcome(eventRef, result.status, "NO_REPLY");
    return;
  }
  if (result.enteredHandoff) {
    await env.HANDOFF_REGISTRY.getByName("test-active-handoffs").activate(
      conversationRef,
      now,
    );
  }
  const messages = replyMessages(
    result.replyKind,
    env.PUBLIC_ASSET_BASE_URL,
    approvedAnswerForReplyKind(result.replyKind),
    result.enteredHandoff,
  );
  if (messages.length === 0) return;
  await sendLineReply(
    event.replyToken,
    messages,
    env.LINE_CHANNEL_ACCESS_TOKEN,
  );
  await conversation.markDelivered(eventRef);
  logOutcome(eventRef, "REPLIED", decision.reasonCode);
}

async function processMp06Plan(
  plan: Mp06Wp1Plan,
  event: ParsedLineEvent,
  eventRef: string,
  conversationRef: string,
  conversation: DurableObjectStub<ConversationStateDO>,
  env: Env,
  now: number,
): Promise<void> {
  const result = await conversation.processEvent({
    eventRef,
    decision: plan.decision,
    ...(plan.responseFingerprint
      ? { responseFingerprint: plan.responseFingerprint }
      : {}),
    ...(plan.clarificationTemplateId
      ? { clarificationTemplateId: plan.clarificationTemplateId }
      : {}),
    now,
    processedRetentionSeconds: positiveInteger(
      env.PROCESSED_EVENT_RETENTION_SECONDS,
    ),
    auditRetentionSeconds: positiveInteger(env.AUDIT_RETENTION_SECONDS),
  });
  if (result.status === "DUPLICATE" || result.status === "SILENT") {
    logOutcome(eventRef, result.status, "MP06_NO_REPLY");
    return;
  }
  if (result.enteredHandoff) {
    await env.HANDOFF_REGISTRY.getByName("test-active-handoffs").activate(
      conversationRef,
      now,
    );
  }
  const messages =
    result.replyKind === "HANDOFF_ACK" || plan.classification === "STAFF_ONLY"
      ? replyMessages(
          result.replyKind,
          env.PUBLIC_ASSET_BASE_URL,
          approvedAnswerForReplyKind(result.replyKind),
          result.enteredHandoff,
        )
      : plan.messages;
  if (messages.length === 0) return;
  await sendLineReply(
    event.replyToken,
    messages,
    env.LINE_CHANNEL_ACCESS_TOKEN,
  );
  await conversation.markDelivered(eventRef);
  logOutcome(eventRef, "REPLIED", `MP06_${plan.classification}`);
}

function eventDecision(event: ParsedLineEvent): RouteDecision {
  if (event.kind === "text") return classifyText(event.text);
  if (event.kind === "postback") return classifyPostback(event.data);
  return {
    replyKind: "HANDOFF_ACK",
    reasonCode: "IMAGE_REQUIRES_HUMAN_REVIEW",
    handoff: true,
    allowDuringHandoff: false,
  };
}

async function handleAdmin(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (!(await secureTextEqual(bearerToken(request), env.TEST_ADMIN_KEY))) {
    console.warn(
      JSON.stringify({ level: "warn", outcome: "ADMIN_AUTH_REJECTED" }),
    );
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (url.pathname === "/admin/mp06-pilot/owner-uat-readiness") {
    const receipt = {
      actor: "AUTHENTICATED_TEST_ADMIN",
      target: "RETAINED_WP8E_OWNER_CONVERSATION",
      requestId: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
    };
    const result = (code: string, status: number, observation?: unknown) => {
      const audit = { ...receipt, code };
      console.info(
        JSON.stringify({ outcome: "OWNER_READINESS_READ", ...audit }),
      );
      return Response.json(
        { audit, ...(observation ? { observation } : {}) },
        { status, headers: { "cache-control": "no-store" } },
      );
    };
    if (
      request.method !== "GET" ||
      url.search !== "" ||
      url.origin !==
        "https://malispang-lineoa-test.eakkachai-dev.workers.dev" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true"
    )
      return result("READINESS_TARGET_REJECTED", 403);
    try {
      const coordinator = env.CONVERSATION_STATE.getByName(
        MP06_PILOT_CONTROL_OBJECT_NAME,
      );
      const before = await coordinator.ownerUatPilotObservation();
      if (!before) return result("READINESS_UNAVAILABLE", 409);
      const conversation = env.CONVERSATION_STATE.getByName(before.ownerRef);
      const draft = env.DRAFT_ORDER.getByName(before.ownerRef);
      const context = await conversation.ownerUatConversationObservation(
        before.eventRef,
      );
      const draftContext = await draft.ownerUatDraftObservation();
      if (!context || !draftContext)
        return result("READINESS_UNAVAILABLE", 409);
      // Cross-object observations are not a transaction or an activation capability.
      if (
        JSON.stringify(before) !==
          JSON.stringify(await coordinator.ownerUatPilotObservation()) ||
        JSON.stringify(context) !==
          JSON.stringify(
            await conversation.ownerUatConversationObservation(before.eventRef),
          ) ||
        JSON.stringify(draftContext) !==
          JSON.stringify(await draft.ownerUatDraftObservation())
      )
        return result("READINESS_CHANGED_DURING_READ", 409);
      const ready =
        context.mode === "BOT_ACTIVE" &&
        !context.clarificationUsed &&
        context.pendingTemplate === null &&
        context.pendingReplies === 0 &&
        draftContext.state === "NO_DRAFT" &&
        draftContext.pendingReplies === 0;
      return result(
        ready ? "READINESS_OBSERVED" : "CONVERSATION_RECOVERY_REVIEW_REQUIRED",
        200,
        {
          readyAtObservation: ready,
          activationAuthorizedByResponse: false,
          ownerLink: "RETAINED_SETTLED_WP8E_EVENT_AND_SINGLE_PRIVATE_ALLOWLIST",
          conversation: context,
          draft: draftContext,
          accounting: {
            state: before.state,
            events: before.events,
            attempts: before.attempts,
            consumedMicroUsd: before.consumedMicroUsd,
            reservedMicroUsd: before.reservedMicroUsd,
            inFlight: before.inFlight,
            conservativeMicroUsd: before.conservativeMicroUsd,
            reportedUsageMicroUsd: before.reportedUsageMicroUsd,
            independentlyVerifiedBilling: "UNKNOWN",
          },
        },
      );
    } catch {
      return result("READINESS_UNAVAILABLE", 409);
    }
  }
  const registry = env.HANDOFF_REGISTRY.getByName("test-active-handoffs");
  const promotion = env.PROMOTION_CONTROL.getByName("test-draft-promotion");
  const pilot = env.CONVERSATION_STATE.getByName(
    MP06_PILOT_CONTROL_OBJECT_NAME,
  );
  if (request.method === "GET" && url.pathname === "/admin/mp06-pilot/status") {
    return Response.json({ pilot: await pilot.mp06PilotStatus(Date.now()) });
  }
  if (
    request.method === "GET" &&
    url.pathname === "/admin/mp06-pilot/attempt-diagnostics"
  ) {
    return Response.json({
      diagnostics: await pilot.mp06PilotAttemptDiagnostics(Date.now()),
    });
  }
  if (
    request.method === "GET" &&
    url.pathname === "/admin/mp06-pilot/lifecycle-checkpoints"
  ) {
    if (
      !(await secureTextEqual(bearerToken(request), env.TEST_ADMIN_KEY)) ||
      env.ENVIRONMENT !== "TEST" ||
      env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true"
    ) {
      return Response.json({ error: "TEST_ADMIN_REQUIRED" }, { status: 403 });
    }
    return Response.json({
      lifecycle: await pilot.mp06PilotLifecycleCheckpointSnapshot(),
    });
  }
  if (
    request.method === "POST" &&
    url.pathname === "/admin/mp06-pilot/lifecycle-self-test"
  ) {
    if (
      !(await secureTextEqual(bearerToken(request), env.TEST_ADMIN_KEY)) ||
      env.ENVIRONMENT !== "TEST" ||
      env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true"
    ) {
      return Response.json({ error: "TEST_ADMIN_REQUIRED" }, { status: 403 });
    }
    const limits = mp06PilotLimitsFromEnvironment(env);
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parsePilotLifecycleSelfTestInput(decoder.decode(body));
    if (!limits || !input) {
      return Response.json(
        { error: "INVALID_LIFECYCLE_SELF_TEST" },
        { status: 400 },
      );
    }
    const diagnostic = env.CONVERSATION_STATE.getByName(
      `mp06-pilot-lifecycle-self-test-v1:${input.runRef}`,
    );
    const existing = await diagnostic.mp06PilotLifecycleCheckpointSnapshot();
    if (existing.checkpointCount > 0) {
      const expectedPhases = [
        "DISPATCH_AUTHORIZED",
        "OUTBOUND_FETCH_STARTING",
        "FETCH_PROMISE_CREATED",
        "RESPONSE_HEADERS_RECEIVED",
        "RESPONSE_BODY_READ",
        "RESPONSE_PARSED",
        "SETTLEMENT_STARTED",
        "SETTLEMENT_SUCCEEDED",
      ];
      const existingPhases = existing.checkpoints.map(
        (checkpoint) => checkpoint.phase,
      );
      const complete =
        existingPhases.length === expectedPhases.length &&
        expectedPhases.every((phase, index) => existingPhases[index] === phase);
      return Response.json(
        {
          mode: "NO_PROVIDER_NO_LINE_SIMULATION",
          outcome: complete ? "SELF_TEST_IDEMPOTENT" : "SELF_TEST_INCOMPLETE",
          checkpointCount: existing.checkpointCount,
          phases: existingPhases,
          coverage: noNetworkLifecycleSelfTestCoverage(),
        },
        { status: complete ? 200 : 409 },
      );
    }
    const now = Date.now();
    const [sessionRef, testerRef, eventRef, attemptRef] = await Promise.all([
      sha256Reference(`mp06-lifecycle-self-test:session:${input.runRef}`),
      sha256Reference(`mp06-lifecycle-self-test:tester:${input.runRef}`),
      sha256Reference(`mp06-lifecycle-self-test:event:${input.runRef}`),
      sha256Reference(`mp06-lifecycle-self-test:attempt:${input.runRef}`),
    ]);
    const clientRequestId = `self-test-${input.runRef.slice(0, 32)}`;
    const activated = await diagnostic.activateMp06Pilot({
      sessionRef,
      testerRefs: [testerRef],
      now,
      limits,
    });
    const admitted = await diagnostic.admitMp06PilotEvent({
      sessionRef,
      eventRef,
      testerRef,
      now,
    });
    const reserved = await diagnostic.reserveMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef,
      upperBoundCostMicroUsd: 1,
      now,
    });
    const authorized = await diagnostic.authorizeMp06PilotDispatch({
      sessionRef,
      eventRef,
      attemptRef,
      clientRequestId,
      now,
    });
    const phases = [
      "OUTBOUND_FETCH_STARTING",
      "FETCH_PROMISE_CREATED",
      "RESPONSE_HEADERS_RECEIVED",
      "RESPONSE_BODY_READ",
      "RESPONSE_PARSED",
      "SETTLEMENT_STARTED",
    ] as const;
    const checkpoints = [];
    if (
      activated.activated &&
      admitted.admitted &&
      reserved.accepted &&
      authorized.accepted
    ) {
      for (const phase of phases) {
        checkpoints.push(
          await diagnostic.recordMp06PilotLifecycleCheckpoint({
            sessionRef,
            eventRef,
            attemptRef,
            clientRequestId,
            phase,
            now,
            ...(phase === "RESPONSE_HEADERS_RECEIVED"
              ? { httpStatus: 200 }
              : {}),
            elapsedMs: 0,
          }),
        );
      }
    }
    const settled = await diagnostic.settleMp06PilotAttempt({
      sessionRef,
      eventRef,
      attemptRef,
      now,
      outcome: "KNOWN",
      actualCostMicroUsd: 0,
      diagnostics: {
        clientRequestId,
        httpStatus: 200,
        dispatchMs: 0,
        headersWaitMs: 0,
        bodyReadMs: 0,
        parsingMs: 0,
        settlementMs: 0,
        outcomeCode: "DIAGNOSTIC_SIMULATION",
      },
    });
    await diagnostic.stopMp06Pilot(now, "DIAGNOSTIC_COMPLETE");
    const snapshot = await diagnostic.mp06PilotLifecycleCheckpointSnapshot();
    const passed =
      checkpoints.every((checkpoint) => checkpoint.accepted) &&
      settled.accepted &&
      snapshot.checkpointCount === 8;
    return Response.json(
      {
        mode: "NO_PROVIDER_NO_LINE_SIMULATION",
        outcome: passed ? "SELF_TEST_PASSED" : "SELF_TEST_FAILED",
        checkpointCount: snapshot.checkpointCount,
        phases: snapshot.checkpoints.map((checkpoint) => checkpoint.phase),
        coverage: noNetworkLifecycleSelfTestCoverage(),
      },
      { status: passed ? 200 : 409 },
    );
  }
  if (
    request.method === "GET" &&
    url.pathname === "/admin/mp06-pilot/exact-reconciliation-target"
  ) {
    if (
      !(await secureTextEqual(bearerToken(request), env.TEST_ADMIN_KEY)) ||
      env.ENVIRONMENT !== "TEST" ||
      env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true"
    ) {
      return Response.json({ error: "TEST_ADMIN_REQUIRED" }, { status: 403 });
    }
    const target = await pilot.mp06PilotExactReconciliationTarget(Date.now());
    return Response.json({ target }, { status: target.eligible ? 200 : 409 });
  }
  if (
    request.method === "POST" &&
    url.pathname === "/admin/mp06-pilot/reconcile-exact-unknown-usage"
  ) {
    if (
      !(await secureTextEqual(bearerToken(request), env.TEST_ADMIN_KEY)) ||
      env.ENVIRONMENT !== "TEST" ||
      env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true"
    ) {
      return Response.json({ error: "TEST_ADMIN_REQUIRED" }, { status: 403 });
    }
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parseExactPilotReconciliationInput(decoder.decode(body));
    if (!input) {
      return Response.json(
        { error: "INVALID_EXACT_RECONCILIATION_PRECONDITIONS" },
        { status: 400 },
      );
    }
    const result = await pilot.reconcileExactMp06PilotUnknownUsage({
      ...input,
      now: Date.now(),
    });
    return Response.json(
      {
        outcome: result.code,
        pilot: await pilot.mp06PilotStatus(Date.now()),
        diagnostics: await pilot.mp06PilotAttemptDiagnostics(Date.now()),
      },
      { status: result.accepted ? 200 : 409 },
    );
  }
  if (
    request.method === "POST" &&
    url.pathname === "/admin/mp06-pilot/activate"
  ) {
    const limits = mp06PilotLimitsFromEnvironment(env);
    const aiEnv = env as Env & Mp06AiNluEnvironment;
    if (
      !limits ||
      aiEnv.MP06_AI_NLU_MODEL !== MP06_AI_NLU_MODEL ||
      typeof aiEnv.OPENAI_API_KEY !== "string" ||
      aiEnv.OPENAI_API_KEY.length < 20
    ) {
      return Response.json(
        { error: "PILOT_CONFIGURATION_INVALID" },
        { status: 503 },
      );
    }
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parsePilotActivationInput(decoder.decode(body));
    if (!input) {
      return Response.json(
        { error: "INVALID_PILOT_ACTIVATION" },
        { status: 400 },
      );
    }
    const sessionRef = await sha256Reference(
      `mp06-pilot:${crypto.randomUUID()}`,
    );
    const result = await pilot.activateMp06Pilot({
      sessionRef,
      testerRefs: input.testerRefs,
      now: Date.now(),
      limits,
    });
    return Response.json(
      { pilot: result.status, outcome: result.code },
      { status: result.activated ? 201 : 409 },
    );
  }
  if (
    request.method === "POST" &&
    url.pathname === "/admin/mp06-pilot/reactivate-reconciled-allowlist"
  ) {
    const limits = mp06PilotLimitsFromEnvironment(env);
    const aiEnv = env as Env & Mp06AiNluEnvironment;
    if (
      env.ENVIRONMENT !== "TEST" ||
      env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
      env.MP06_PILOT_CONTROL_ENABLED !== "true" ||
      !limits ||
      aiEnv.MP06_AI_NLU_MODEL !== MP06_AI_NLU_MODEL ||
      typeof aiEnv.OPENAI_API_KEY !== "string" ||
      aiEnv.OPENAI_API_KEY.length < 20
    ) {
      return Response.json(
        { error: "PILOT_CONFIGURATION_INVALID" },
        { status: 503 },
      );
    }
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    if (!parseReconciledPilotReactivation(decoder.decode(body))) {
      return Response.json(
        { error: "RECONCILED_PILOT_REACTIVATION_INVALID" },
        { status: 400 },
      );
    }
    const sessionRef = await sha256Reference(
      `mp06-pilot:${crypto.randomUUID()}`,
    );
    const result = await pilot.reactivateReconciledMp06Pilot({
      sessionRef,
      now: Date.now(),
      limits,
    });
    return Response.json(
      { pilot: result.status, outcome: result.code },
      { status: result.activated ? 201 : 409 },
    );
  }
  if (
    request.method === "POST" &&
    url.pathname === "/admin/mp06-pilot/resume-acceptance"
  ) {
    const limits = mp06PilotLimitsFromEnvironment(env);
    const aiEnv = env as Env & Mp06AiNluEnvironment;
    if (
      !limits ||
      aiEnv.MP06_AI_NLU_MODEL !== MP06_AI_NLU_MODEL ||
      typeof aiEnv.OPENAI_API_KEY !== "string" ||
      aiEnv.OPENAI_API_KEY.length < 20
    ) {
      return Response.json(
        { error: "PILOT_CONFIGURATION_INVALID" },
        { status: 503 },
      );
    }
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parseAcceptanceResume(decoder.decode(body));
    if (!input)
      return Response.json(
        { error: "INVALID_ACCEPTANCE_RESUME" },
        { status: 400 },
      );
    const sessionRef = await sha256Reference(`mp06-wp8f:${input.operationRef}`);
    const result = await pilot.resumeMp06Acceptance({
      ...input,
      sessionRef,
      now: Date.now(),
      limits,
    });
    return Response.json(
      { pilot: result.status, outcome: result.code },
      {
        status: result.activated
          ? result.code === "ACTIVATED_IDEMPOTENT"
            ? 200
            : 201
          : 409,
      },
    );
  }
  if (request.method === "POST" && url.pathname === "/admin/mp06-pilot/stop") {
    const result = await pilot.stopMp06Pilot(Date.now(), "OPERATOR_STOP");
    return Response.json({ pilot: result.status, outcome: result.code });
  }
  if (request.method === "GET" && url.pathname === "/admin/handoffs") {
    return Response.json({ active: await registry.listActive() });
  }
  if (request.method === "GET" && url.pathname === "/admin/flex") {
    return Response.json(replyMessage("FLEX_MENU"));
  }
  if (request.method === "GET" && url.pathname === "/admin/audit") {
    const conversationRef = url.searchParams.get("conversationRef") ?? "";
    if (!/^[a-f0-9]{64}$/.test(conversationRef)) {
      return Response.json(
        { error: "INVALID_CONVERSATION_REF" },
        { status: 400 },
      );
    }
    const snapshot =
      await env.CONVERSATION_STATE.getByName(conversationRef).auditSnapshot();
    return Response.json({ conversationRef, events: snapshot });
  }
  if (request.method === "GET" && url.pathname === "/admin/promotion") {
    if (env.TEST_OWNER_ALLOWLIST.trim().length === 0) {
      return Response.json(
        { error: "PROMOTION_OWNER_ALLOWLIST_MISSING" },
        { status: 503 },
      );
    }
    return Response.json({ promotion: await promotion.current() });
  }
  if (request.method === "POST" && url.pathname === "/admin/promotion") {
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parsePromotionInput(decoder.decode(body));
    if (!input) {
      return Response.json(
        { error: "INVALID_PROMOTION_REQUEST" },
        { status: 400 },
      );
    }
    try {
      const authorized = authorizeTestPromotionChange({
        environment: env.ENVIRONMENT,
        accountName: env.LINE_OA_ACCOUNT_NAME,
        ownerId: input.ownerId,
        ownerAllowlist: env.TEST_OWNER_ALLOWLIST,
        enabled: input.enabled,
        startAt: input.startAt,
        endAt: input.endAt,
      });
      const state = await promotion.change(
        authorized,
        await sha256Reference(input.ownerId),
        Date.now(),
      );
      return Response.json({ promotion: state });
    } catch (error) {
      const code =
        error instanceof Error
          ? safeErrorCode(error.message)
          : "PROMOTION_CHANGE_REJECTED";
      await promotion.recordRejected(
        code,
        await sha256Reference(input.ownerId),
        Date.now(),
      );
      return Response.json({ error: code }, { status: 403 });
    }
  }
  if (request.method === "POST" && url.pathname === "/admin/draft/reprice") {
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parseCloseInput(decoder.decode(body));
    if (!input) {
      return Response.json(
        { error: "INVALID_DRAFT_REPRICE_REQUEST" },
        { status: 400 },
      );
    }
    const allowedStaff = env.TEST_STAFF_ALLOWLIST.split(",").map((value) =>
      value.trim(),
    );
    if (!allowedStaff.includes(input.staffId)) {
      return Response.json({ error: "STAFF_NOT_AUTHORIZED" }, { status: 403 });
    }
    try {
      const result = await env.DRAFT_ORDER.getByName(
        input.conversationRef,
      ).repriceByStaff(
        await sha256Reference(input.staffId),
        await promotion.current(),
        Date.now(),
        positiveInteger(env.AUDIT_RETENTION_SECONDS),
      );
      return Response.json({ draft: result });
    } catch (error) {
      const code =
        error instanceof Error
          ? safeErrorCode(error.message)
          : "DRAFT_REPRICE_FAILED";
      return Response.json({ error: code }, { status: 409 });
    }
  }
  if (request.method === "POST" && url.pathname === "/admin/handoff/close") {
    const body = await readBoundedBody(request, MAX_ADMIN_BYTES);
    const input = parseCloseInput(decoder.decode(body));
    if (!input)
      return Response.json({ error: "INVALID_CLOSE_REQUEST" }, { status: 400 });
    const allowedStaff = env.TEST_STAFF_ALLOWLIST.split(",").map((value) =>
      value.trim(),
    );
    if (!allowedStaff.includes(input.staffId)) {
      console.warn(
        JSON.stringify({
          level: "warn",
          outcome: "HANDOFF_CLOSE_DENIED",
          staffRef: await sha256Reference(input.staffId),
        }),
      );
      return Response.json({ error: "STAFF_NOT_AUTHORIZED" }, { status: 403 });
    }
    const closed = await env.CONVERSATION_STATE.getByName(
      input.conversationRef,
    ).closeHandoff(
      await sha256Reference(input.staffId),
      Date.now(),
      positiveInteger(env.AUDIT_RETENTION_SECONDS),
    );
    if (closed) await registry.remove(input.conversationRef);
    return Response.json({ closed });
  }
  return Response.json({ error: "NOT_FOUND" }, { status: 404 });
}

function parsePromotionInput(raw: string):
  | {
      readonly ownerId: string;
      readonly enabled: boolean;
      readonly startAt: number;
      readonly endAt: number;
    }
  | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "ownerId" in value &&
      typeof value.ownerId === "string" &&
      /^[A-Z0-9_-]{1,64}$/.test(value.ownerId) &&
      "enabled" in value &&
      typeof value.enabled === "boolean" &&
      "startAt" in value &&
      Number.isSafeInteger(value.startAt) &&
      "endAt" in value &&
      Number.isSafeInteger(value.endAt)
    ) {
      return {
        ownerId: value.ownerId,
        enabled: value.enabled,
        startAt: value.startAt as number,
        endAt: value.endAt as number,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parsePilotActivationInput(
  raw: string,
): { readonly testerRefs: readonly string[] } | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      Object.keys(value).length !== 1 ||
      !("testerRefs" in value) ||
      !Array.isArray(value.testerRefs) ||
      value.testerRefs.length < 1 ||
      value.testerRefs.length > 5 ||
      new Set(value.testerRefs).size !== value.testerRefs.length ||
      !value.testerRefs.every(isMp06PilotReference)
    ) {
      return undefined;
    }
    return { testerRefs: value.testerRefs };
  } catch {
    return undefined;
  }
}

function parsePilotLifecycleSelfTestInput(
  raw: string,
): { readonly runRef: string } | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      Object.keys(value).length !== 1 ||
      !("runRef" in value) ||
      !isMp06PilotReference(value.runRef)
    ) {
      return undefined;
    }
    return { runRef: value.runRef };
  } catch {
    return undefined;
  }
}

function noNetworkLifecycleSelfTestCoverage(): Record<string, boolean> {
  return {
    isolatedDurableObject: true,
    durableCheckpointRpc: true,
    durableSettlementRpc: true,
    simulatedTransportOnly: true,
    nativeProviderFetch: false,
    lineReply: false,
    webhookExecutionContextCoveredByThisRoute: false,
  };
}

interface ExactMp06PilotReconciliationRequest {
  readonly expectedSessionRef: string;
  readonly expectedAttemptTargetRef: string;
  readonly expectedState: "STOPPED";
  readonly expectedStopReason: "IN_FLIGHT_USAGE_UNKNOWN";
  readonly expectedAdmittedEvents: 2;
  readonly expectedProviderAttempts: 2;
  readonly expectedBudgetConsumedMicroUsd: 12932;
  readonly expectedBudgetReservedMicroUsd: 12932;
  readonly expectedInFlight: 1;
  readonly disposition: "CONSUME_FULL_RESERVATION_NO_REFUND";
}

function parseExactPilotReconciliationInput(
  raw: string,
): ExactMp06PilotReconciliationRequest | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      Object.keys(value).length !== 10 ||
      !("expectedSessionRef" in value) ||
      !isMp06PilotReference(value.expectedSessionRef) ||
      !("expectedAttemptTargetRef" in value) ||
      !isMp06PilotReference(value.expectedAttemptTargetRef) ||
      !("expectedState" in value) ||
      value.expectedState !== "STOPPED" ||
      !("expectedStopReason" in value) ||
      value.expectedStopReason !== "IN_FLIGHT_USAGE_UNKNOWN" ||
      !("expectedAdmittedEvents" in value) ||
      value.expectedAdmittedEvents !== 2 ||
      !("expectedProviderAttempts" in value) ||
      value.expectedProviderAttempts !== 2 ||
      !("expectedBudgetConsumedMicroUsd" in value) ||
      value.expectedBudgetConsumedMicroUsd !== 12_932 ||
      !("expectedBudgetReservedMicroUsd" in value) ||
      value.expectedBudgetReservedMicroUsd !== 12_932 ||
      !("expectedInFlight" in value) ||
      value.expectedInFlight !== 1 ||
      !("disposition" in value) ||
      value.disposition !== "CONSUME_FULL_RESERVATION_NO_REFUND"
    ) {
      return undefined;
    }
    return value as ExactMp06PilotReconciliationRequest;
  } catch {
    return undefined;
  }
}

function parseAcceptanceResume(
  raw: string,
): { expectedSessionRef: string; operationRef: string } | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      Object.keys(value).length !== 2 ||
      !("expectedSessionRef" in value) ||
      !isMp06PilotReference(value.expectedSessionRef) ||
      !("operationRef" in value) ||
      !isMp06PilotReference(value.operationRef)
    )
      return undefined;
    return {
      expectedSessionRef: value.expectedSessionRef,
      operationRef: value.operationRef,
    };
  } catch {
    return undefined;
  }
}

function parseReconciledPilotReactivation(raw: string): boolean {
  try {
    const value: unknown = JSON.parse(raw);
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      "reuseReconciledTesterAllowlist" in value &&
      value.reuseReconciledTesterAllowlist === true
    );
  } catch {
    return false;
  }
}

interface Mp06PilotRuntimeContext {
  readonly coordinator: DurableObjectStub<ConversationStateDO>;
  readonly sessionRef: string;
  readonly eventRef: string;
}

async function admitMp06PilotAiEvent(
  event: ParsedLineEvent,
  eventRef: string,
  env: Env,
  now: number,
): Promise<{
  readonly code: Mp06PilotAdmissionCode;
  readonly context?: Mp06PilotRuntimeContext;
}> {
  const limits = mp06PilotLimitsFromEnvironment(env);
  const senderId = verifiedMp06PilotSender(event);
  if (!limits || !senderId) {
    return { code: limits ? "TESTER_NOT_ALLOWED" : "CONTROL_UNAVAILABLE" };
  }
  const coordinator = env.CONVERSATION_STATE.getByName(
    MP06_PILOT_CONTROL_OBJECT_NAME,
  );
  try {
    const testerRef = await sha256Reference(senderId);
    const admission = await admitMp06PilotEventThroughCoordinator(coordinator, {
      eventRef,
      testerRef,
      now,
    });
    return admission.sessionRef
      ? {
          code: admission.code,
          context: {
            coordinator,
            sessionRef: admission.sessionRef,
            eventRef,
          },
        }
      : { code: admission.code };
  } catch {
    return { code: "CONTROL_UNAVAILABLE" };
  }
}

function createMp06PilotAttemptController(
  context: Mp06PilotRuntimeContext,
): Mp06AiNluAttemptController & { dispatchWasAuthorized: () => boolean } {
  const attemptRefs = new Map<number, string>();
  let dispatchAuthorized = false;
  const attemptRef = async (attempt: number): Promise<string> => {
    const existing = attemptRefs.get(attempt);
    if (existing) return existing;
    const created = await sha256Reference(`${context.eventRef}:${attempt}`);
    attemptRefs.set(attempt, created);
    return created;
  };
  return {
    async reserve(input) {
      const result = await context.coordinator.reserveMp06PilotAttempt({
        sessionRef: context.sessionRef,
        eventRef: context.eventRef,
        attemptRef: await attemptRef(input.attempt),
        upperBoundCostMicroUsd: input.upperBoundCostMicroUsd,
        now: Date.now(),
      });
      return result.accepted;
    },
    async authorizeDispatch(input) {
      const result = await context.coordinator.authorizeMp06PilotDispatch({
        sessionRef: context.sessionRef,
        eventRef: context.eventRef,
        attemptRef: await attemptRef(input.attempt),
        clientRequestId: input.clientRequestId,
        now: Date.now(),
      });
      if (result.accepted) dispatchAuthorized = true;
      return result.accepted;
    },
    async cancelBeforeDispatch(attempt) {
      await context.coordinator.cancelMp06PilotAttemptBeforeDispatch({
        sessionRef: context.sessionRef,
        eventRef: context.eventRef,
        attemptRef: await attemptRef(attempt),
        now: Date.now(),
      });
    },
    async checkpoint(input) {
      const result =
        await context.coordinator.recordMp06PilotLifecycleCheckpoint({
          sessionRef: context.sessionRef,
          eventRef: context.eventRef,
          attemptRef: await attemptRef(input.attempt),
          clientRequestId: input.clientRequestId,
          phase: input.phase,
          now: Date.now(),
          ...(input.providerRequestId
            ? { providerRequestId: input.providerRequestId }
            : {}),
          ...(input.httpStatus === undefined
            ? {}
            : { httpStatus: input.httpStatus }),
          ...(input.providerErrorType
            ? { providerErrorType: input.providerErrorType }
            : {}),
          ...(input.providerErrorCode
            ? { providerErrorCode: input.providerErrorCode }
            : {}),
          ...(input.retryAfterMs === undefined
            ? {}
            : { retryAfterMs: input.retryAfterMs }),
          ...(input.rateLimitRemainingRequests === undefined
            ? {}
            : {
                rateLimitRemainingRequests: input.rateLimitRemainingRequests,
              }),
          ...(input.elapsedMs === undefined
            ? {}
            : { elapsedMs: input.elapsedMs }),
        });
      return result.accepted;
    },
    async settle(input) {
      const result = await context.coordinator.settleMp06PilotAttempt({
        sessionRef: context.sessionRef,
        eventRef: context.eventRef,
        attemptRef: await attemptRef(input.attempt),
        now: Date.now(),
        outcome: input.outcome,
        diagnostics: input.diagnostics,
        ...(input.actualCostMicroUsd === undefined
          ? {}
          : { actualCostMicroUsd: input.actualCostMicroUsd }),
      });
      return result.accepted;
    },
    dispatchWasAuthorized: () => dispatchAuthorized,
  };
}

function parseCloseInput(
  raw: string,
): { conversationRef: string; staffId: string } | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "conversationRef" in value &&
      "staffId" in value &&
      typeof value.conversationRef === "string" &&
      /^[a-f0-9]{64}$/.test(value.conversationRef) &&
      typeof value.staffId === "string" &&
      /^[A-Z0-9_-]{1,64}$/.test(value.staffId)
    ) {
      return { conversationRef: value.conversationRef, staffId: value.staffId };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error("INVALID_RETENTION_CONFIG");
  return parsed;
}

function logOutcome(
  eventRef: string,
  outcome: string,
  reasonCode: string,
): void {
  console.log(JSON.stringify({ level: "info", eventRef, outcome, reasonCode }));
}

function logAiNluMetadata(metadata: Mp06AiNluSafeMetadata): void {
  console.log(
    JSON.stringify({ level: "info", component: "MP06_AI_NLU", ...metadata }),
  );
}

function safeErrorCode(value: string): string {
  return /^[A-Z0-9_]{1,80}$/.test(value) ? value : "UNEXPECTED_ERROR";
}
