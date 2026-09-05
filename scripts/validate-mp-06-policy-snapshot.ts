import { readFile } from "node:fs/promises";

import {
  validateMp06PolicySchema,
  validateMp06PolicySnapshot,
} from "../src/mp-06-policy-snapshot.js";

const [snapshot, schema] = await Promise.all([
  readJson("../config/mp-06/policy-snapshot.json"),
  readJson("../config/mp-06/policy-snapshot.schema.json"),
]);
const errors = [
  ...validateMp06PolicySnapshot(snapshot).errors,
  ...validateMp06PolicySchema(schema),
];
if (errors.length > 0) {
  throw new Error(`Invalid MP-06 policy snapshot: ${errors.join(", ")}`);
}
console.log(
  "MP-06 policy snapshot validation passed: 2026.09.05-policy-v1, specification only, runtime/deployment blocked",
);

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  ) as unknown;
}
