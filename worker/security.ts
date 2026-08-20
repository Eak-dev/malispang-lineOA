const encoder = new TextEncoder();
export const MAX_WEBHOOK_BYTES = 1024 * 1024;
export const MAX_ADMIN_BYTES = 8 * 1024;

export function assertTestEnvironment(env: Env): void {
  if (
    env.ENVIRONMENT !== "TEST" ||
    env.LINE_OA_ACCOUNT_NAME !== "มะลิปัง TEST" ||
    env.FAQ_SOURCE_STATUS !== "TEST_SEED"
  ) {
    throw new Error("FAIL_CLOSED_NON_TEST_ENVIRONMENT");
  }
  if (
    Object.keys(env).some((key) =>
      /(?:^|_)(?:PROD|PRODUCTION)(?:_|$)/i.test(key),
    )
  ) {
    throw new Error("FAIL_CLOSED_PRODUCTION_BINDING_PRESENT");
  }
}

export function assertRequiredSecrets(env: Env): void {
  const required = [
    env.LINE_CHANNEL_SECRET,
    env.LINE_CHANNEL_ACCESS_TOKEN,
    env.LINE_BOT_USER_ID,
    env.TEST_ADMIN_KEY,
  ];
  if (
    required.some(
      (value) => typeof value !== "string" || value.trim().length < 16,
    )
  ) {
    throw new Error("FAIL_CLOSED_REQUIRED_TEST_SECRET_MISSING");
  }
}

export async function verifyLineSignature(
  body: Uint8Array,
  signature: string,
  secret: string,
): Promise<boolean> {
  let supplied: Uint8Array;
  try {
    supplied = Uint8Array.from(atob(signature), (character) =>
      character.charCodeAt(0),
    );
  } catch {
    supplied = new Uint8Array();
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  const suppliedHash = await crypto.subtle.digest("SHA-256", supplied);
  const expectedHash = await crypto.subtle.digest("SHA-256", expected);
  return crypto.subtle.timingSafeEqual(suppliedHash, expectedHash);
}

export async function secureTextEqual(
  left: string,
  right: string,
): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

export async function sha256Reference(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`malispang-test:${value}`),
    ),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function readBoundedBody(
  request: Request,
  maximumBytes: number,
): Promise<Uint8Array> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maximumBytes) {
    throw new Error("REQUEST_TOO_LARGE");
  }
  if (request.body === null) return new Uint8Array();
  const reader =
    request.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const result: ReadableStreamReadResult<Uint8Array> = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel("REQUEST_TOO_LARGE");
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}
