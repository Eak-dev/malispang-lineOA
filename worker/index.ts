import { ConversationStateDO, HandoffRegistryDO } from "./durable-objects.js";
import { sendLineReply } from "./line-api.js";
import {
  classifyPostback,
  classifyText,
  replyMessage,
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

export { ConversationStateDO, HandoffRegistryDO };

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
  const decision = eventDecision(event);
  const now = Date.now();
  const conversation = env.CONVERSATION_STATE.getByName(conversationRef);
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
  const message = replyMessage(result.replyKind);
  if (!message) return;
  await sendLineReply(event.replyToken, message, env.LINE_CHANNEL_ACCESS_TOKEN);
  await conversation.markDelivered(eventRef);
  logOutcome(eventRef, "REPLIED", decision.reasonCode);
}

function eventDecision(event: ParsedLineEvent): RouteDecision {
  if (event.kind === "text") return classifyText(event.text);
  if (event.kind === "postback") return classifyPostback(event.data);
  return {
    replyKind: "SLIP_ACK",
    reasonCode: "IMAGE_REQUIRES_HUMAN_REVIEW",
    handoff: true,
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
