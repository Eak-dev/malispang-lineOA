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

  const controlledRetest = evaluateProjectAction(
    roadmap,
    currentWork,
    "PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C",
  );
  if (!controlledRetest.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: WP8C TEST reconciliation and controlled retest must be authorized",
    );
  }

  const testDeployment = evaluateProjectAction(
    roadmap,
    currentWork,
    "DEPLOY_TEST",
  );
  if (!testDeployment.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: exact TEST deployment must be authorized during WP8C",
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
    "AI_NLU_IMPLEMENTATION_WP7",
    "RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A",
    "TEST_DEPLOYMENT_SMOKE_ROLLBACK_WP8",
    "PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_WP8B",
    "LOCAL_IMPLEMENTATION",
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
    `Project control validation passed: 2026.09.07-v9, MP-06 (GitHub #12), WP8C exact TEST reconciliation, candidate deployment, and one controlled LINE retest are authorized while Production remains blocked, ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}
