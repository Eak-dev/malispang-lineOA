import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  approvedFaqRecordsFromManifest,
  validateApprovedKnowledgeManifest,
  type ApprovedKnowledgeManifest,
} from "../src/approved-knowledge-manifest.js";

const manifestPath = new URL(
  "../config/approved-knowledge-base/test-knowledge-base.json",
  import.meta.url,
);
const manifest = JSON.parse(
  await readFile(manifestPath, "utf8"),
) as ApprovedKnowledgeManifest;
const errors = validateApprovedKnowledgeManifest(manifest);
if (errors.length > 0) {
  throw new Error(`Invalid Approved Knowledge Base: ${errors.join(", ")}`);
}

const approvedRecords = approvedFaqRecordsFromManifest(manifest);
for (const record of approvedRecords) {
  const checksum = createHash("sha256")
    .update(record.answer, "utf8")
    .digest("hex");
  if (checksum !== record.checksum) {
    throw new Error(`Approved Knowledge checksum mismatch: ${record.id}`);
  }
}
const blockedCount = Object.values(manifest.categories).filter(
  (record) => record.status === "BLOCKED",
).length;
console.log(
  `Approved Knowledge Base validation passed: ${approvedRecords.length} approved, ${blockedCount} blocked (fail closed)`,
);
