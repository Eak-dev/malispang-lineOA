import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  evaluateProjectAction,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
  validateSuccessorOperationJournal,
  validateV22OperationJournal,
} from "./project-control.js";

export async function runProjectControlValidation(root: URL): Promise<void> {
  const [roadmap, currentWork, roadmapSchema, currentWorkSchema] =
    await Promise.all([
      readJson(root, "config/project/roadmap.json"),
      readJson(root, "config/project/current-work.json"),
      readJson(root, "config/project/roadmap.schema.json"),
      readJson(root, "config/project/current-work.schema.json"),
    ]);

  const version =
    typeof roadmap === "object" &&
    roadmap !== null &&
    "version" in roadmap &&
    typeof roadmap.version === "string"
      ? roadmap.version
      : "UNKNOWN";
  if (
    !validateWp8fOwnerDecisionRecord(
      await readFile(
        new URL("docs/project/OWNER_DECISION_LOG.md", root),
        "utf8",
      ),
      version,
    )
  ) {
    throw new Error(
      "ROADMAP_UNVERIFIED: explicit versioned Owner record missing or inconsistent",
    );
  }
  if (version === "2026.09.10-v21" || version === "2026.09.10-v22") {
    if (
      typeof currentWork !== "object" ||
      currentWork === null ||
      !("wp8fSuccessorOperationJournal" in currentWork)
    )
      throw new Error("V21_OPERATION_JOURNAL_MISSING");
    const journal = currentWork.wp8fSuccessorOperationJournal;
    const cwd = fileURLToPath(root);
    if (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        cwd,
        encoding: "utf8",
      }).trim() !== "false"
    )
      throw new Error("V21_FULL_CHECKPOINT_HISTORY_REQUIRED");
    const revisions = execFileSync(
      "git",
      [
        "log",
        "--format=%H",
        "958b00eea5587d27858d3bdee1047ee52c0a736f^..HEAD",
        "--",
        "config/project/current-work.json",
      ],
      { cwd, encoding: "utf8" },
    )
      .trim()
      .split("\n");
    for (const revision of revisions) {
      if (!/^[a-f0-9]{40}$/u.test(revision))
        throw new Error("V21_CONTROL_HISTORY_UNVERIFIED");
      const historical: unknown = JSON.parse(
        execFileSync(
          "git",
          ["show", revision + ":config/project/current-work.json"],
          { cwd, encoding: "utf8", maxBuffer: 1024 * 1024 },
        ),
      );
      if (
        typeof historical === "object" &&
        historical !== null &&
        "roadmapVersion" in historical &&
        (historical.roadmapVersion === "2026.09.10-v21" ||
          historical.roadmapVersion === "2026.09.10-v22")
      ) {
        if (
          !("wp8fSuccessorOperationJournal" in historical) ||
          !validateSuccessorOperationJournal(
            journal,
            historical.wp8fSuccessorOperationJournal,
          )
        )
          throw new Error("V21_OPERATION_HISTORY_RESET_OR_REWRITE_DENIED");
      }
      if (
        version === "2026.09.10-v22" &&
        typeof historical === "object" &&
        historical !== null &&
        "roadmapVersion" in historical &&
        historical.roadmapVersion === version
      ) {
        if (
          !("wp8fV22OperationJournal" in currentWork) ||
          !("wp8fV22OperationJournal" in historical) ||
          !validateV22OperationJournal(
            currentWork.wp8fV22OperationJournal,
            historical.wp8fV22OperationJournal,
          )
        )
          throw new Error("V22_OPERATION_HISTORY_RESET_OR_REWRITE_DENIED");
      }
    }
    if (!validateSuccessorOperationJournal(journal))
      throw new Error("V21_OPERATION_JOURNAL_INVALID");
    if (
      version === "2026.09.10-v22" &&
      (!("wp8fV22OperationJournal" in currentWork) ||
        !validateV22OperationJournal(currentWork.wp8fV22OperationJournal))
    )
      throw new Error("V22_OPERATION_JOURNAL_INVALID");
  }

  const validation = validateProjectControl(roadmap, currentWork);
  const schemaErrors = validateSchemaDocuments(
    roadmapSchema,
    currentWorkSchema,
    version,
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
    "ACTIVATE_SUCCESSOR_V22",
    "RECOVER_CONVERSATION",
    "CLOSE_OWNER_HANDOFF",
    "OWNER_UAT_NEXT_CASE",
    "CREATE_PR",
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
    version === "2026.09.10-v22"
      ? `Project control validation passed: ${version}, MP-06 (#12), exact frozen TEST_ONLY; separate one-use deployment/successor grants; historical and current journals verified; U1 GAP/A1-A3 UNRESOLVED retained; no handoff-close/rollback/PR/merge/closure/Production/MP07; ${warningSuffix}`
      : version === "2026.09.10-v21"
        ? `Project control validation passed: ${version}, MP-06 (#12), frozen successor TEST_ONLY; independent exact deployment/close/continuation/UAT/review/integration gates required; append-only operation history verified; historical PR14 is not acceptance; Production NO_GO, MP07 blocked; ${warningSuffix}`
        : `Project control validation passed: ${version}, historical preparation only; no remote mutation; ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}
