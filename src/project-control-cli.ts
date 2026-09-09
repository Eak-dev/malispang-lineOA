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
      "ROADMAP_UNVERIFIED: explicit v19 preparation-only Owner decision record missing or inconsistent",
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
    "PREPARE_EXACT_TEST_DEPLOYMENT",
  );
  if (!exactStateReconciliation.allowed) {
    throw new Error(
      "ROADMAP_UNVERIFIED: exact TEST deployment preparation must be authorized",
    );
  }

  // A control snapshot alone must never authorize deployment.
  if (
    evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST", {
      worker: "malispang-lineoa-test",
      sourceCommit: "c59eb5e12bb96a34da38759a5585be67d8c2ab6e",
      artifactSha256:
        "2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308",
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
    "TEST_ACCEPTANCE_COMPLETION_WP8F",
    "ASSESS_EXACT_TEST_DEPLOYMENT_READINESS",
    "UPLOAD_TEST_VERSION",
    "CREATE_TEST_VERSION",
    "CHANGE_TEST_TRAFFIC",
    "OPEN_CONTINUATION",
    "RECOVER_CONVERSATION",
    "ROLLBACK_TEST",
    "QUERY_PRODUCTION",
    "MERGE_DEFAULT_BRANCH",
    "CLOSE_ISSUE",
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
    `Project control validation passed: 2026.09.09-v19, MP-06 (GitHub #12), exact TEST deployment preparation only; Owner PR #14 integration occurred before final review, not acceptance/deployment; grant APPROVED_UNUSED 0/1, executable deployment false; stop before upload/version/traffic mutation pending Owner execute confirmation; session/recovery/rollback/additional PR/merge/closure and Production blocked, ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}
