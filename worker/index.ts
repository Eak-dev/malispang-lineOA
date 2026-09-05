import { ConversationStateDO, HandoffRegistryDO } from "./durable-objects.js";
import { DraftOrderDO, PromotionControlDO } from "./draft-order-objects.js";
import { authorizeTestPromotionChange } from "../src/test-promotion-control.js";
import {
  approvedAnswerForReplyKind,
  enforceApprovedKnowledge,
} from "./knowledge.js";
import { sendLineReply } from "./line-api.js";
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
  async fetch(request, env): Promise<Response> {
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
      if (url.pathname === "/webhook") return await handleWebhook(request, env);
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

async function handleWebhook(request: Request, env: Env): Promise<Response> {
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

  for (const event of webhook.events) await processLineEvent(event, env);
  return Response.json({ ok: true });
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
    const plan = await planMp06Wp1Text(
      event.text,
      env.PUBLIC_ASSET_BASE_URL,
      now,
      mp06Context,
    );
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
  const registry = env.HANDOFF_REGISTRY.getByName("test-active-handoffs");
  const promotion = env.PROMOTION_CONTROL.getByName("test-draft-promotion");
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

function safeErrorCode(value: string): string {
  return /^[A-Z0-9_]{1,80}$/.test(value) ? value : "UNEXPECTED_ERROR";
}
