import { readFile } from "node:fs/promises";

import {
  evaluateProjectAction,
  validateProjectControl,
  validateSchemaDocuments,
} from "./project-control.js";

export async function runProjectControlValidation(root: URL): Promise<void> {
  const [roadmap, currentWork, roadmapSchema, currentWorkSchema] =
    await Promise.all([
      readJson(root, "config/project/roadmap.json"),
      readJson(root, "config/project/current-work.json"),
      readJson(root, "config/project/roadmap.schema.json"),
      readJson(root, "config/project/current-work.schema.json"),
    ]);

  const validation = validateProjectControl(roadmap, currentWork);
  const schemaErrors = validateSchemaDocuments(
    roadmapSchema,
    currentWorkSchema,
  );
  const errors = [...validation.errors, ...schemaErrors].sort();

  if (errors.length > 0) {
    throw new Error(`ROADMAP_UNVERIFIED: ${errors.join(", ")}`);
  }

  const githubReconciliation = evaluateProjectAction(
    roadmap,
    currentWork,
    "UPDATE_GITHUB_ROADMAP",
  );
  if (!githubReconciliation.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: GitHub Roadmap reconciliation must be authorized",
    );
  }

  const wp7Implementation = evaluateProjectAction(
    roadmap,
    currentWork,
    "AI_NLU_IMPLEMENTATION_WP7",
  );
  if (!wp7Implementation.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: WP7 AI/NLU implementation must be authorized",
    );
  }

  for (const action of [
    "POLICY_SNAPSHOT",
    "RUNTIME_WP1",
    "BENCHMARK_WP2",
    "RUNTIME_REMEDIATION_WP3",
    "BENCHMARK_COMPLETION_WP4",
    "LOCAL_CLOSURE_REMEDIATION_WP5",
    "TEST_READINESS_ASSESSMENT_WP6",
    "TEST_READINESS_CONDITION_CLOSURE_WP6",
    "LOCAL_IMPLEMENTATION",
    "DEPLOY_TEST",
    "CHANGE_PRODUCTION",
  ] as const) {
    const decision = evaluateProjectAction(roadmap, currentWork, action);
    if (decision.allowed) {
      throw new Error(`ROADMAP_UNVERIFIED: ${action} must remain blocked`);
    }
  }

  const warningSuffix =
    validation.warnings.length === 0
      ? "no warnings"
      : `warnings recorded: ${validation.warnings.join(", ")}`;
  console.log(
    `Project control validation passed: 2026.09.06-v5, MP-06 (GitHub #12), WP7 guarded AI/NLU implementation is authorized as an advisory default-off path, deterministic policy remains final authority and TEST/Production deployment remains blocked, ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}
