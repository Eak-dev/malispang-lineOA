import { readFile } from "node:fs/promises";

import {
  evaluateProjectAction,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "./project-control.js";

export async function runProjectControlValidation(root: URL): Promise<void> {
  if (
    !validateWp8fOwnerDecisionRecord(
      await readFile(
        new URL("docs/project/OWNER_DECISION_LOG.md", root),
        "utf8",
      ),
    )
  ) {
    throw new Error(
      "ROADMAP_UNVERIFIED: explicit v17 Owner decision record missing or inconsistent",
    );
  }
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

  const exactStateReconciliation = evaluateProjectAction(
    roadmap,
    currentWork,
    "TEST_ACCEPTANCE_COMPLETION_WP8F",
  );
  if (!exactStateReconciliation.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: WP8F scoped acceptance completion must be authorized",
    );
  }

  // A control snapshot alone must never authorize deployment.
  if (
    evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST", {
      worker: "malispang-lineoa-test",
      sourceCommit: "f986a478bc980f9e53748ed49cedd543f54cd64a",
      artifactSha256:
        "f93807109b7d700f79a7b7b90979659ac285be8420e74fb809cc6900d78adec2",
    }).allowed
  ) {
    throw new Error(
      "ROADMAP_UNVERIFIED: deployment without candidate/state evidence",
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
    "PROVIDER_RECONCILIATION_CONTROLLED_RETEST_WP8C",
    "DURABLE_LIFECYCLE_DIAGNOSTICS_REMEDIATION_WP8D",
    "EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E",
    "CREATE_DRAFT_PR",
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
    `Project control validation passed: 2026.09.08-v17, MP-06 (GitHub #12), exact precedence remediation and one continuation authorized; deployment requires independent candidate/state evidence; PR requires TEST acceptance/final review; merge and Production blocked, ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}
