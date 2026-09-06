import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

import { canonicalJson } from "./report.js";

export function serializeDeterministic(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export async function writeTextFile(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function checkTextFile(
  path: string,
  expected: string,
): Promise<string | undefined> {
  let actual: string;
  try {
    actual = await readFile(path, "utf8");
  } catch {
    return `MISSING_COMMITTED_ARTIFACT:${path}`;
  }
  return actual === expected ? undefined : `COMMITTED_ARTIFACT_DRIFT:${path}`;
}

export function deterministicChecksum(value: unknown): string {
  return canonicalJson(value);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}
