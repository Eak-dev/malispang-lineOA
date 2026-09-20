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
  inspectV23SealedRepository,
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
  const inheritsV22 =
    version === "2026.09.10-v22" ||
    version === "2026.09.11-v23" ||
    version === "2026.09.11-v24" ||
    version === "2026.09.12-v25" ||
    version === "2026.09.20-v26" ||
    version === "2026.09.20-v27" ||
    version === "2026.09.20-v28" ||
    version === "2026.09.20-v29" ||
    version === "2026.09.20-v30" ||
    version === "2026.09.20-v31";
  if (version === "2026.09.10-v21" || inheritsV22) {
    if (
      typeof currentWork !== "object" ||
      currentWork === null ||
      !("wp8fSuccessorOperationJournal" in currentWork)
    )
      throw new Error("V21_OPERATION_JOURNAL_MISSING");
    const journal = currentWork.wp8fSuccessorOperationJournal;
    const v26 =
      version === "2026.09.20-v26" ||
      version === "2026.09.20-v27" ||
      version === "2026.09.20-v28" ||
      version === "2026.09.20-v29" ||
      version === "2026.09.20-v30" ||
      version === "2026.09.20-v31";
    let newerSuccessorJournal = journal;
    let newerV22Journal =
      "wp8fV22OperationJournal" in currentWork
        ? currentWork.wp8fV22OperationJournal
        : undefined;
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
          historical.roadmapVersion === "2026.09.10-v22" ||
          historical.roadmapVersion === "2026.09.11-v23" ||
          historical.roadmapVersion === "2026.09.11-v24" ||
          historical.roadmapVersion === "2026.09.12-v25" ||
          historical.roadmapVersion === "2026.09.20-v26" ||
          historical.roadmapVersion === "2026.09.20-v27" ||
          historical.roadmapVersion === "2026.09.20-v28" ||
          historical.roadmapVersion === "2026.09.20-v29" ||
          historical.roadmapVersion === "2026.09.20-v30" ||
          historical.roadmapVersion === "2026.09.20-v31")
      ) {
        if (
          !("wp8fSuccessorOperationJournal" in historical) ||
          !validateSuccessorOperationJournal(
            v26 ? newerSuccessorJournal : journal,
            historical.wp8fSuccessorOperationJournal,
          )
        )
          throw new Error("V21_OPERATION_HISTORY_RESET_OR_REWRITE_DENIED");
        newerSuccessorJournal = historical.wp8fSuccessorOperationJournal;
      }
      if (
        inheritsV22 &&
        typeof historical === "object" &&
        historical !== null &&
        "roadmapVersion" in historical &&
        (historical.roadmapVersion === "2026.09.10-v22" ||
          historical.roadmapVersion === "2026.09.11-v23" ||
          historical.roadmapVersion === "2026.09.11-v24" ||
          historical.roadmapVersion === "2026.09.12-v25" ||
          historical.roadmapVersion === "2026.09.20-v26" ||
          historical.roadmapVersion === "2026.09.20-v27" ||
          historical.roadmapVersion === "2026.09.20-v28" ||
          historical.roadmapVersion === "2026.09.20-v29" ||
          historical.roadmapVersion === "2026.09.20-v30" ||
          historical.roadmapVersion === "2026.09.20-v31")
      ) {
        if (
          !("wp8fV22OperationJournal" in currentWork) ||
          !("wp8fV22OperationJournal" in historical) ||
          !validateV22OperationJournal(
            v26 ? newerV22Journal : currentWork.wp8fV22OperationJournal,
            historical.wp8fV22OperationJournal,
          )
        )
          throw new Error("V22_OPERATION_HISTORY_RESET_OR_REWRITE_DENIED");
        newerV22Journal = historical.wp8fV22OperationJournal;
        if (
          v26 &&
          (!("wp8fSuccessorOperationJournal" in historical) ||
            JSON.stringify(historical.wp8fSuccessorOperationJournal) !==
              JSON.stringify(journal))
        )
          throw new Error("V21_OPERATION_HISTORY_RESET_OR_REWRITE_DENIED");
      }
    }
    if (!validateSuccessorOperationJournal(journal))
      throw new Error("V21_OPERATION_JOURNAL_INVALID");
    if (
      inheritsV22 &&
      (!("wp8fV22OperationJournal" in currentWork) ||
        !validateV22OperationJournal(currentWork.wp8fV22OperationJournal))
    )
      throw new Error("V22_OPERATION_JOURNAL_INVALID");
  }
  if (
    version === "2026.09.11-v23" ||
    version === "2026.09.11-v24" ||
    version === "2026.09.12-v25" ||
    version === "2026.09.20-v26" ||
    version === "2026.09.20-v27" ||
    version === "2026.09.20-v28" ||
    version === "2026.09.20-v29" ||
    version === "2026.09.20-v30" ||
    version === "2026.09.20-v31"
  ) {
    const sealed = inspectV23SealedRepository(fileURLToPath(root));
    if (!sealed.ok) throw new Error(sealed.reason);
    console.log(
      `V23 sealed Git inventory verified: ${sealed.proof.paths.length} complete post-candidate paths; checkout clean=${sealed.proof.clean}; this is not deployment/state/CI approval`,
    );
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
    inheritsV22
      ? `Project control validation passed: ${version}, MP-06 (#12), exact frozen TEST_ONLY; separate one-use deployment/successor grants; historical and current journals verified; U1 GAP/A1-A3 UNRESOLVED retained; no handoff-close/rollback/PR/merge/closure/Production/MP07; ${warningSuffix}`
      : version === "2026.09.10-v21"
        ? `Project control validation passed: ${version}, MP-06 (#12), frozen successor TEST_ONLY; independent exact deployment/close/continuation/UAT/review/integration gates required; append-only operation history verified; historical PR14 is not acceptance; Production NO_GO, MP07 blocked; ${warningSuffix}`
        : `Project control validation passed: ${version}, historical preparation only; no remote mutation; ${warningSuffix}`,
  );
}

async function readJson(root: URL, path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

/** PR-only adapter: integration code is tested in the caller's checkout; the
 * sealed-history CLI is executed from the exact source checkout. It never
 * changes inspectV23SealedRepository's merge rejection or issues a live proof. */
export async function runPullRequestControlValidation(
  root: URL,
  eventPath: string | undefined,
): Promise<void> {
  const { mkdtemp, mkdir, readdir, symlink, rm } =
    await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const {
    PR15_CI_CONTROL,
    PR15_P1_REMEDIATION_CONTROL,
    validatePr15MergeReceipt,
  } = await import("./project-control.js");
  if (
    process.env.GITHUB_EVENT_NAME !== "pull_request" ||
    !eventPath ||
    process.env.GITHUB_REPOSITORY !== PR15_CI_CONTROL.repository
  )
    throw new Error("V29_PR_EVENT_REQUIRED");
  const event: unknown = JSON.parse(await readFile(eventPath, "utf8"));
  const cwd = fileURLToPath(root);
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["--no-replace-objects", "--no-optional-locks", ...args],
      { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    ).trim();
  const merge = git("rev-parse", "HEAD");
  const parents = git("rev-list", "--parents", "-n", "1", merge)
    .split(" ")
    .slice(1);
  const receipt = validatePr15MergeReceipt(event, {
    sha: process.env.GITHUB_SHA,
    ref: process.env.GITHUB_REF,
    merge,
    parents,
  });
  if (!receipt) throw new Error("V29_PR_MERGE_IDENTITY_MISMATCH");
  const status = git("status", "--porcelain=v1", "--untracked-files=all");
  if (status) throw new Error("V29_PR_CHECKOUT_DIRTY");
  // Integration control code/data must be identical to the source that will
  // validate its history. A base-branch control conflict cannot silently pass.
  const work = JSON.parse(
    await readFile(new URL("config/project/current-work.json", root), "utf8"),
  ) as Record<string, unknown>;
  if (
    work.roadmapVersion !== PR15_P1_REMEDIATION_CONTROL.version ||
    JSON.stringify(work.wp8fV31Pr15Remediation) !==
      JSON.stringify(PR15_P1_REMEDIATION_CONTROL)
  )
    throw new Error("V31_EXACT_CONTROL_INVALID");
  const controlPaths = [
    "config/project/roadmap.json",
    "config/project/current-work.json",
    "config/project/current-work.schema.json",
    "src/project-control.ts",
    "src/project-control-cli.ts",
    "tests/project-control.test.ts",
    "PROJECT_CONTROL.md",
    "docs/project/ROADMAP_CHANGELOG.md",
    "docs/project/EXECUTION_GATES.md",
    "docs/project/OWNER_DECISION_LOG.md",
    "config/project/roadmap.schema.json",
    "scripts/validate-project-control.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "greptile.json",
    PR15_CI_CONTROL.path,
    ...PR15_P1_REMEDIATION_CONTROL.remediationPaths,
  ];
  if (git("diff", "--name-only", receipt.head, merge, "--", ...controlPaths))
    throw new Error("V29_INTEGRATION_CONTROL_DIVERGENCE");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "mp06-pr15-control-"));
  const source = path.join(temporary, "source");
  let created = false;
  try {
    git("worktree", "add", "--detach", source, receipt.head);
    created = true;
    // Keep node_modules a real ignored directory: a root symlink is not
    // covered by the repository's node_modules/ ignore rule.
    await mkdir(path.join(source, "node_modules"));
    for (const name of await readdir(path.join(cwd, "node_modules")))
      await symlink(
        path.join(cwd, "node_modules", name),
        path.join(source, "node_modules", name),
      );
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/validate-project-control.mjs"],
      { cwd: source, stdio: "inherit" },
    );
    if (
      git("rev-parse", "HEAD") !== merge ||
      git("status", "--porcelain=v1", "--untracked-files=all") !== status
    )
      throw new Error("V29_INTEGRATION_CHECKOUT_CHANGED");
    console.log(
      `PR15 source seal PASS head=${receipt.head}; integration=${merge}; base=${receipt.base}; control bytes identical; not merge/deployment approval`,
    );
  } finally {
    if (created) git("worktree", "remove", source);
    await rm(temporary, { recursive: true, force: true });
  }
}
