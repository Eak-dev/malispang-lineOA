import type { LineReplyMessage } from "./routing.js";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function sendLineReply(
  replyToken: string,
  message: LineReplyMessage,
  accessToken: string,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("LINE_REPLY_TIMEOUT"),
    5000,
  );
  try {
    const response = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ replyToken, messages: [message] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LINE_REPLY_FAILED_${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}
