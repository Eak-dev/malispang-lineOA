import { createHash } from "node:crypto";

// Bounds are per object, matching the old git-show buffer, not per batch.
export const GIT_BLOB_LIMIT = 16 * 1024 * 1024;
const CHUNK_SIZE = 8;
const HEADER_LIMIT = 8192;

export interface GitBlob {
  text(): string;
  oid(): string;
}

function validSpec(spec: string): boolean {
  if (
    spec.length > 4096 ||
    !/^[a-f0-9]{40}:[A-Za-z0-9_./-]+(?![\s\S])/.test(spec)
  )
    return false;
  return spec
    .slice(41)
    .split("/")
    .every((p) => p !== "" && p !== "." && p !== "..");
}

function unavailable(): GitBlob {
  const reject = (): never => {
    throw new Error("GIT_BATCH_BLOB_UNAVAILABLE");
  };
  return Object.freeze({ text: reject, oid: reject });
}

function parse(output: Buffer, specs: readonly string[]): GitBlob[] {
  let offset = 0;
  const result: GitBlob[] = [];
  for (const spec of specs) {
    const end = output.indexOf(10, offset);
    if (end < offset || end - offset > HEADER_LIMIT)
      throw new Error("GIT_BATCH_HEADER_INVALID");
    const header = output.subarray(offset, end).toString("ascii");
    // ASCII decoding masks the high bit; reject non-ASCII before matching.
    if (output.subarray(offset, end).some((byte) => byte > 127))
      throw new Error("GIT_BATCH_HEADER_INVALID");
    offset = end + 1;
    if (header === spec + " missing") {
      result.push(unavailable());
      continue;
    }
    const match =
      /^([a-f0-9]{40}) (blob|tree|commit|tag) (0|[1-9][0-9]*)$/.exec(header);
    if (!match || match[0] !== header)
      throw new Error("GIT_BATCH_HEADER_INVALID");
    const size = Number(match[3]);
    if (!Number.isSafeInteger(size) || size > GIT_BLOB_LIMIT)
      throw new Error("GIT_BATCH_OBJECT_LIMIT");
    const bodyEnd = offset + size;
    if (bodyEnd >= output.length || output[bodyEnd] !== 10)
      throw new Error("GIT_BATCH_BODY_INVALID");
    const raw = output.subarray(offset, bodyEnd);
    const oid = createHash("sha1")
      .update(`${match[2]} ${size}\0`)
      .update(raw)
      .digest("hex");
    if (oid !== match[1]) throw new Error("GIT_BATCH_OID_MISMATCH");
    offset = bodyEnd + 1;
    if (match[2] !== "blob") {
      result.push(unavailable());
      continue;
    }
    // Decode each byte-sized blob independently, exactly like git-show utf8.
    const text = raw.toString("utf8");
    result.push(Object.freeze({ text: () => text, oid: () => oid }));
  }
  if (offset !== output.length) throw new Error("GIT_BATCH_TRAILING_OUTPUT");
  return result;
}

/** Read immutable full-SHA:path objects, once per invocation, in request order.
 * The inspector supplies its hardened Git transport; no mutable refs or cache.
 * Missing/non-blob access is deferred so history validation keeps its ordering.
 */
export function readGitBlobBatch(
  specs: readonly string[],
  run: (input: string, maxOutputBytes: number) => Buffer,
): readonly GitBlob[] {
  if (!specs.every(validSpec)) throw new Error("GIT_BATCH_SPEC_INVALID");
  const result: GitBlob[] = [];
  for (let start = 0; start < specs.length; start += CHUNK_SIZE) {
    const chunk = specs.slice(start, start + CHUNK_SIZE);
    const limit = chunk.length * (GIT_BLOB_LIMIT + HEADER_LIMIT + 2);
    const output = run(chunk.join("\n") + "\n", limit);
    if (output.length > limit) throw new Error("GIT_BATCH_OUTPUT_LIMIT");
    result.push(...parse(output, chunk));
  }
  return Object.freeze(result);
}
