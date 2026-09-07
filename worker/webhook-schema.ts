export type ParsedLineEvent =
  | {
      readonly kind: "text";
      readonly eventId: string;
      readonly replyToken: string;
      readonly conversationId: string;
      readonly sourceType: "USER" | "GROUP" | "ROOM";
      readonly senderId?: string;
      readonly text: string;
    }
  | {
      readonly kind: "image";
      readonly eventId: string;
      readonly replyToken: string;
      readonly conversationId: string;
      readonly sourceType: "USER" | "GROUP" | "ROOM";
      readonly senderId?: string;
    }
  | {
      readonly kind: "postback";
      readonly eventId: string;
      readonly replyToken: string;
      readonly conversationId: string;
      readonly sourceType: "USER" | "GROUP" | "ROOM";
      readonly senderId?: string;
      readonly data: string;
    };

export interface ParsedWebhook {
  readonly destination: string;
  readonly events: readonly ParsedLineEvent[];
}

export function parseWebhook(value: unknown): ParsedWebhook | undefined {
  if (
    !isRecord(value) ||
    typeof value.destination !== "string" ||
    !Array.isArray(value.events)
  ) {
    return undefined;
  }
  if (
    value.destination.length < 1 ||
    value.destination.length > 128 ||
    value.events.length > 50
  ) {
    return undefined;
  }
  const events: ParsedLineEvent[] = [];
  for (const candidate of value.events) {
    const parsed = parseEvent(candidate);
    if (parsed) events.push(parsed);
  }
  return { destination: value.destination, events };
}

function parseEvent(value: unknown): ParsedLineEvent | undefined {
  if (
    !isRecord(value) ||
    typeof value.webhookEventId !== "string" ||
    value.webhookEventId.length < 1 ||
    value.webhookEventId.length > 256 ||
    typeof value.replyToken !== "string" ||
    value.replyToken.length < 1 ||
    value.replyToken.length > 256 ||
    !isRecord(value.source)
  ) {
    return undefined;
  }
  const source = sourceIdentity(value.source);
  if (!source) return undefined;

  if (value.type === "message" && isRecord(value.message)) {
    if (
      value.message.type === "text" &&
      typeof value.message.text === "string" &&
      value.message.text.length <= 5000
    ) {
      return {
        kind: "text",
        eventId: value.webhookEventId,
        replyToken: value.replyToken,
        ...source,
        text: value.message.text,
      };
    }
    if (value.message.type === "image") {
      return {
        kind: "image",
        eventId: value.webhookEventId,
        replyToken: value.replyToken,
        ...source,
      };
    }
  }

  if (
    value.type === "postback" &&
    isRecord(value.postback) &&
    typeof value.postback.data === "string" &&
    value.postback.data.length <= 300
  ) {
    return {
      kind: "postback",
      eventId: value.webhookEventId,
      replyToken: value.replyToken,
      ...source,
      data: value.postback.data,
    };
  }
  return undefined;
}

function sourceIdentity(source: Record<string, unknown>):
  | {
      readonly conversationId: string;
      readonly sourceType: "USER" | "GROUP" | "ROOM";
      readonly senderId?: string;
    }
  | undefined {
  const senderId = boundedId(source.userId);
  if (source.type === "user" && senderId) {
    return { conversationId: senderId, sourceType: "USER", senderId };
  }
  const groupId = boundedId(source.groupId);
  if (source.type === "group" && groupId) {
    return {
      conversationId: groupId,
      sourceType: "GROUP",
      ...(senderId ? { senderId } : {}),
    };
  }
  const roomId = boundedId(source.roomId);
  if (source.type === "room" && roomId) {
    return {
      conversationId: roomId,
      sourceType: "ROOM",
      ...(senderId ? { senderId } : {}),
    };
  }
  return undefined;
}

function boundedId(value: unknown): string | undefined {
  return typeof value === "string" && value.length >= 1 && value.length <= 128
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
