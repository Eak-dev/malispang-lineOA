import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import prior from "./project-control-v64-baseline.json" with { type: "json" };

export const POST_MERGE_V64 = {
  version: "2026.10.12-v64",
  ownerDecision: "MP-OD-2026-10-10-V64",
  supersedes: "2026.10.04-v61",
  repository: "Eak-dev/malispang-lineOA",
  workId: "MP-06",
  githubIssue: 12,
  stage: "POST_MERGE_CONTROL_RECONCILIATION",
  baseline: "e67b8d973f8dca63de17caf0d74e2cec0b691685",
  baselineTree: "6f0e031fb4d3f1c8bf2ca7c7c4caf3546bea2c71",
  mergeParents: [
    "a05bab89bc6d5cdf2914581ed658be86dd00b062",
    "1bb977570729740c7c9125b5b8c7c5e6a58c8f42",
  ],
  acceptedSource: "1bb977570729740c7c9125b5b8c7c5e6a58c8f42",
  acceptedParent: "6cb1f431fc395888b249d9e631bc7576617ddbcf",
  implementationBranch: "codex/mp06-control-reconcile",
  targetBranch: "codex/mp-06-guardrailed-ai",
  baselineFieldsSha256:
    "69f4104507d5ed0e065e9c588e17ba18c4fec83168aff9c3d24ad4d20380070c",
  acceptance: {
    state: "OWNER_ACCEPTED_TEST_CLOSED",
    closureComment: 5987341233,
    journalComment: 5987310377,
    observedAt: "2026-10-05",
    liveState: "NOT_RECHECKED",
    artifact: {
      bytes: 259870,
      sha256:
        "083d6ecd33551d61522b57073b9e3d0dc7d51eb8d70851cf0bf5ab50fb9870ab",
      evidence: "CLAUDE_MAC_RECEIPT_NOT_REPRODUCED_BY_THIS_CONTROL",
    },
  },
  grants: {
    originV57: "CONSUMED_UNKNOWN_STOP",
    replacement: "CONSUMED_FAILED_10086",
    v62: "CONSUMED_2_OF_2",
    v63: "CONSUMED_1_OF_1",
    remainingDeployments: 0,
  },
  residuals: [
    "SEPTEMBER_CAUSE_UNKNOWN",
    "HISTORICAL_U1_GAP_RETAINED_FRESH_U1_PASS_SEPARATE",
    "A1_A3_UNRESOLVED",
    "HISTORICAL_BILLING_UNKNOWN",
    "OWNER_HANDOFF_CLOSE_SLOT_CONSUMED",
    "FOUR_STALE_TOMBSTONES",
    "TEST_CHANNEL_SECRET_EXPOSURE_SECURITY_FOLLOWUP",
  ],
  ci: {
    run145: 37259387018,
    run146: 37259456189,
    state: "FAILED_CONTROL_VALIDATION_LATER_SECURITY_GATES_NOT_EXECUTED",
  },
  publication: "REVIEW_REQUIRED_NOT_AUTHORIZED_BY_STRUCTURAL_VALIDATION",
  defaultIntegration: "PR16_CLOSED_UNMERGED_DEFAULT_88deb90a",
  nextWork: "MP07_NOT_STARTED_AWAITING_OWNER",
  production: "NO_GO",
  remoteExecution: false,
  dependencySecurityAmendment: {
    decidedAt: "2026-10-11",
    ownerQuote: "แก้ได้เลย",
    previousUnpublishedDraft: "2026.10.10-v64",
    sharp: { from: "0.35.4", to: "0.35.5", miniflareOverride: true },
    sourceMapJs: { from: "1.2.1", to: "1.2.2", exactOverride: true },
    libvips: { from: "1.3.3", to: "1.3.4", scope: "SHARP_NATIVE_CLOSURE_ONLY" },
    priorAudit: "2026-10-10_HIGH_2_FAIL_NOT_RETROACTIVE_PASS",
    allOtherDependencies: "FROZEN_TO_MERGE_BASELINE",
    lockfileSha256:
      "3e2f98d071555a86f178d14b460325cf5624b3e263b235e5b50b90f26817735f",
    remoteExecution: false,
  },
  reviewRemediationAmendment: {
    decidedAt: "2026-10-12",
    ownerQuote: "คุณจัดการแก้ไข งานต่อได้เลย",
    reviewComment: 6113392025,
    previousUnpublishedCandidate: "2026.10.11-v64",
    previousTree: "f4323c1c7340f54f9d92d2b755b6c6e31fbc1798",
    previousDiffSha256:
      "4d994aa9fea27e18b0b900a8ad15734c1181916dedf3a01931a29d65ac28c89d",
    scope: "ROADMAP_VALIDATOR_CLOSURE_REGRESSION_TESTS_STEADY_STATE_DOCS_ONLY",
    publication: "F2_PENDING_NEW_ACTION_SPECIFIC_OWNER_CONTROL",
    remoteExecution: false,
  },
} as const;
export const V64_WORK_FIELDS = {
  currentPhase: "POST_MERGE_CONTROL_RECONCILIATION",
  status: "MP06_TEST_CLOSED_REPOSITORY_RECONCILIATION",
  targetEnvironment: "LOCAL_AND_GITHUB_CONTROL_ONLY",
  authorizedWorkPackage: "POST_MERGE_CONTROL_RECONCILIATION",
  base: {
    commit: "e67b8d973f8dca63de17caf0d74e2cec0b691685",
    branch: "codex/mp-06-guardrailed-ai",
  },
  implementationBranch: "codex/mp06-control-reconcile",
  allowedScope: [
    "CONTROL_SCHEMA_VALIDATOR_TESTS_DOCUMENTATION_ONLY",
    "EXACT_SHARP_SOURCE_MAP_SECURITY_PATCH_ONLY",
  ],
  authorization: {
    localImplementation: true,
    runtimeWp1: false,
    benchmarkWp2: false,
    runtimeRemediationWp3: false,
    benchmarkCompletionWp4: false,
    localClosureRemediationWp5: false,
    testReadinessAssessmentWp6: false,
    testReadinessConditionClosureWp6: false,
    testReadinessConditionsClosedWp6: true,
    aiNluImplementationWp7: false,
    aiNluLocalAcceptanceCompleteWp7: true,
    runtimePilotControlRemediationWp8a: false,
    runtimePilotControlsCompleteWp8a: true,
    testDeploymentSmokeRollbackWp8: false,
    providerAttemptSettlementRemediationWp8b: false,
    providerReconciliationControlledRetestWp8c: false,
    durableLifecycleDiagnosticsRemediationWp8d: false,
    exactStateReconciliationControlledRetestWp8e: false,
    policySnapshot: false,
    policySnapshotReadOnly: true,
    commit: false,
    pushBranch: false,
    githubRoadmapUpdate: true,
    testDeploymentAuthorization: false,
    testDeploymentOccurred: true,
    testDeployment: false,
    production: false,
    testAcceptanceCompletionWp8f: false,
    testDeploymentPreparationWp8f: false,
  },
  nextWork: {
    id: "MP-07",
    githubIssue: 7,
    status: "NOT_STARTED_AWAITING_OWNER_AUTHORIZATION",
  },
  conflicts: [
    {
      code: "POST_MERGE_CONTROL_DRIFT",
      blocking: false,
      detail:
        "Historical: v63 was accepted and PR20 merged while effective control remained v61; CI145/146 failed.",
      resolution:
        "This control records the accepted closure and merge without renewing grants. Publication requires a separately authorized evidence-bound successor; no new TEST action.",
    },
  ],
} as const;
export const V64_ALLOWED_PATHS = [
  "AGENTS.md",
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/roadmap.schema.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v64.ts",
  "src/project-control-v64-baseline.json",
  "tests/project-control-v61.test.ts",
  "tests/project-control-v64.test.ts",
  "src/project-control-v65.ts",
  "tests/project-control-v65.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
  "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md",
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
] as const;
const WORK_ROOT_KEYS = [
  "$schema",
  "schemaVersion",
  "roadmapId",
  "roadmapVersion",
  "ciHarnessRepairV48",
  "testKnowledgeValidityV46",
  "inspectorBatchV45",
  "harnessPublicationV43",
  "localHarnessRepairV42",
  "testPolicyIntegrationV41",
  "localControlRepairV40",
  "testOperationPolicyV39",
  "testReadinessV38",
  "devOperationsIntegrationV37",
  "devOperationsOptimizationV36",
  "devOperationsRemediationV35",
  "devOperationsReviewV34",
  "devOperationsV33",
  "wp8fV32GreptilePushDraft",
  "wp8fV28GreptileReviewer",
  "wp8fV27ProviderHangSeal",
  "wp8fV26WorkflowSeal",
  "wp8fV24LiveUatEnablement",
  "wp8fV23InstrumentationAddendum",
  "workId",
  "githubIssue",
  "currentPhase",
  "status",
  "base",
  "implementationBranch",
  "targetEnvironment",
  "authorizedWorkPackage",
  "allowedScope",
  "forbiddenScope",
  "authorization",
  "wp8fExactDeploymentPreparation",
  "wp8fExecutionEnvelope",
  "wp8fApprovedDeployment",
  "policySnapshotReference",
  "wp2BenchmarkReference",
  "benchmarkCompletionPlan",
  "localClosureRemediationPlan",
  "localDeterministicAcceptance",
  "testReadinessAssessmentPlan",
  "wp8TestPilotPlan",
  "wp8bProviderAttemptSettlementPlan",
  "wp8cProviderReconciliationControlledRetestPlan",
  "wp8dDurableLifecycleDiagnosticsPlan",
  "wp8eExactStateReconciliationControlledRetestPlan",
  "testReadinessConditionClosurePlan",
  "wp7AiNluPlan",
  "wp8aRuntimePilotControlPlan",
  "benchmarkAcceptanceCriteria",
  "nextWork",
  "conflicts",
  "workingTreePolicy",
  "failureMode",
  "wp8fTestAcceptancePlan",
  "wp8fSuccessorCompletion",
  "wp8fV22Authorization",
  "wp8fV22OperationJournal",
  "wp8fSuccessorOperationJournal",
  "wp8fV25WorkerTimingAddendum",
  "wp8fV29PrCi",
  "wp8fV30CiTimeout",
  "wp8fV31Pr15Remediation",
  "knowledgePublicationV47",
  "ciHarnessRepairV49",
  "ciHarnessRepairV50",
  "resumeCodexPlanV53",
  "timeAwareEvidenceV54",
  "testResetV55",
  "publicationV56",
  "testDeploymentV57",
  "testDeploymentV58",
  "testDeploymentV59",
  "testDeploymentV60",
  "testDeploymentV61",
  "postMergeV64",
];
const ROADMAP_ROOT_KEYS = [
  "$schema",
  "schemaVersion",
  "roadmapId",
  "githubIssue",
  "repository",
  "version",
  "status",
  "ownerDecision",
  "sourceOfTruthPrecedence",
  "verifiedLatestBaseline",
  "authorization",
  "items",
  "externalReferences",
];
const sameKeys = (v: Record<string, unknown>, keys: readonly string[]) =>
  isDeepStrictEqual(Object.keys(v).sort(), [...keys].sort());
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function validateV64Overlay(roadmap: unknown, work: unknown): string[] {
  if (!record(roadmap) || !record(work)) return ["V64_MANIFEST_REQUIRED"];
  const expectedRoadmap = {
    ...prior.roadmap,
    version: POST_MERGE_V64.version,
    status: "AWAITING_OWNER_NEXT_WORK",
    ownerDecision: {
      decisionId: POST_MERGE_V64.ownerDecision,
      decidedAt: "2026-10-10",
      supersedes: POST_MERGE_V64.supersedes,
    },
    verifiedLatestBaseline: {
      ...prior.roadmap.verifiedLatestBaseline,
      commit: POST_MERGE_V64.baseline,
      verifiedAt: "2026-10-10",
    },
    authorization: {
      ...prior.roadmap.authorization,
      testDeploymentAuthorization: false,
    },
    externalReferences: {
      ...prior.roadmap.externalReferences,
      lastVerifiedAt: "2026-10-10",
    },
    items: prior.roadmap.items.map((item) =>
      item.id === "MP-06" ? { ...item, state: "COMPLETED" } : item,
    ),
  };
  const valid =
    sameKeys(roadmap, ROADMAP_ROOT_KEYS) &&
    sameKeys(work, WORK_ROOT_KEYS) &&
    Object.entries(expectedRoadmap).every(([k, v]) =>
      isDeepStrictEqual(roadmap[k], v),
    ) &&
    work.roadmapVersion === POST_MERGE_V64.version &&
    isDeepStrictEqual(work.postMergeV64, POST_MERGE_V64) &&
    work.workingTreePolicy === prior.work.workingTreePolicy &&
    Object.entries(V64_WORK_FIELDS).every(([k, v]) =>
      isDeepStrictEqual(work[k], v),
    ) &&
    Array.isArray(roadmap.items) &&
    roadmap.items.filter((x) => record(x) && x.state === "CURRENT").length ===
      0 &&
    roadmap.items.some(
      (x) => record(x) && x.id === "MP-06" && x.state === "COMPLETED",
    ) &&
    roadmap.items.some(
      (x) => record(x) && x.id === "MP-07" && x.state === "PLANNED",
    );
  return valid ? [] : ["V64_CLOSED_RECONCILIATION_SCOPE_INVALID"];
}
/** Projection validates retained historical data; it never grants historical actions. */
export function projectV64ToV61(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
) {
  Object.assign(roadmap, structuredClone(prior.roadmap), {
    version: POST_MERGE_V64.supersedes,
  });
  if (Array.isArray(roadmap.items))
    for (const item of roadmap.items)
      if (record(item) && item.id === "MP-06") item.state = "CURRENT";
  Object.assign(work, structuredClone(prior.work), {
    roadmapVersion: POST_MERGE_V64.supersedes,
  });
  delete work.postMergeV64;
}
export function projectV64Schemas(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
) {
  if (record(roadmap.properties))
    roadmap.properties.status = { const: "ACTIVE" };
  if (record(work.properties)) {
    Object.assign(work.properties, structuredClone(prior.schema), {
      roadmapVersion: { const: POST_MERGE_V64.supersedes },
    });
    delete work.properties.postMergeV64;
  }
  if (Array.isArray(work.required))
    work.required = work.required.filter((k) => k !== "postMergeV64");
}
export function validateV64Schemas(roadmap: unknown, work: unknown): string[] {
  if (
    !record(roadmap) ||
    !record(roadmap.properties) ||
    !record(work) ||
    !record(work.properties) ||
    !Array.isArray(work.required) ||
    work.required.filter((k) => k === "postMergeV64").length !== 1 ||
    !sameKeys(work.properties, WORK_ROOT_KEYS) ||
    !sameKeys(roadmap.properties, ROADMAP_ROOT_KEYS) ||
    work.additionalProperties !== false ||
    roadmap.additionalProperties !== false ||
    !isDeepStrictEqual(roadmap.properties.status, {
      enum: ["ACTIVE", "AWAITING_OWNER_NEXT_WORK"],
    }) ||
    !isDeepStrictEqual(work.properties.roadmapVersion, {
      const: POST_MERGE_V64.version,
    }) ||
    !isDeepStrictEqual(work.properties.postMergeV64, {
      const: POST_MERGE_V64,
    }) ||
    !isDeepStrictEqual(work.properties.workingTreePolicy, {
      const: prior.work.workingTreePolicy,
    }) ||
    !Object.entries(V64_WORK_FIELDS).every(([k, v]) =>
      isDeepStrictEqual((work.properties as Record<string, unknown>)[k], {
        const: v,
      }),
    )
  )
    return ["V64_SCHEMA_NOT_CLOSED"];
  return [];
}
export function v64AuthoritySummary() {
  return {
    controlVersion: POST_MERGE_V64.version,
    ownerDecision: POST_MERGE_V64.ownerDecision,
    status: POST_MERGE_V64.stage,
    workId: "MP-06",
    githubIssue: 12,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: [],
    allowedPaths: V64_ALLOWED_PATHS,
    testAcceptance: "OWNER_ACCEPTED_TEST_CLOSED",
    nextWorkAuthorized: false,
    publicationAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
  };
}
export function evaluateV64Action(action: string) {
  return [
    "LOCAL_IMPLEMENTATION",
    "LOCAL_VALIDATION",
    "LOCAL_ANALYSIS",
  ].includes(action)
    ? { allowed: true, reason: "V64_LOCAL_CONTROL_REPAIR_ONLY" }
    : {
        allowed: false,
        reason: "V64_NO_PUBLICATION_REMOTE_OR_NEXT_WORK_AUTHORITY",
      };
}
export function validateV64OwnerRecord(record: unknown) {
  if (typeof record !== "string") return false;
  const sections = record.split("## " + POST_MERGE_V64.ownerDecision + " —");
  if (sections.length !== 2) return false;
  try {
    const json = sections[1]
      ?.split("\n## ")[0]
      ?.match(/```json\s*([\s\S]*?)```/u)?.[1];
    return (
      json !== undefined &&
      isDeepStrictEqual(JSON.parse(json), POST_MERGE_V64) &&
      sections[1]?.includes("เริ่มแก้ไขได้เลย") === true &&
      sections[1]?.includes("แก้ได้เลย") === true
    );
  } catch {
    return false;
  }
}
/** Exact exceptions, not blanket permission to change dependency manifests. */
export function validateV64DependencyBytes(
  baselinePackage: string,
  baselineWorkspace: string,
  packageBytes: string,
  workspaceBytes: string,
  lockBytes: Uint8Array,
) {
  const expectedPackage = baselinePackage.replace(
    '"sharp": "0.35.4"',
    '"sharp": "0.35.5"',
  );
  const expectedWorkspace = baselineWorkspace.replace(
    '"miniflare@5.20260811.0-alpha>sharp": "0.35.4"',
    '"miniflare@5.20260811.0-alpha>sharp": "0.35.5"\n  "source-map-js": "1.2.2"',
  );
  return (
    expectedPackage !== baselinePackage &&
    expectedWorkspace !== baselineWorkspace &&
    packageBytes === expectedPackage &&
    workspaceBytes === expectedWorkspace &&
    createHash("sha256").update(lockBytes).digest("hex") ===
      POST_MERGE_V64.dependencySecurityAmendment.lockfileSha256
  );
}
/** Only reads Git and files. Checks every frozen path, not just runtime hashes. */
export function inspectV64Repository(
  cwd: string,
  git = "git",
  event?: unknown,
  context?: {
    eventName?: string | undefined;
    repository?: string | undefined;
    sha?: string | undefined;
    ref?: string | undefined;
  },
) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      [
        "--no-replace-objects",
        "--no-optional-locks",
        "-c",
        "diff.autoRefreshIndex=false",
        ...args,
      ],
      { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  const initialHead = run("rev-parse", "HEAD").trim();
  const gitDir = run("rev-parse", "--absolute-git-dir").trim(),
    indexPath = join(gitDir, "index"),
    initialIndex = readFileSync(indexPath);
  const parents = (sha: string) =>
    run("rev-list", "--parents", "-n", "1", sha).trim().split(" ").slice(1);
  const tree = (sha: string) => run("rev-parse", sha + "^{tree}").trim();
  let result:
    | {
        head: string;
        source: string;
        tree: string;
        clean: boolean;
        baseline: string;
        publicationAuthorized: false;
        remoteExecutionAuthorized: false;
      }
    | undefined;
  let caught = false,
    failure: unknown;
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim() ||
      [
        "index.lock",
        "MERGE_HEAD",
        "CHERRY_PICK_HEAD",
        "REVERT_HEAD",
        "rebase-merge",
        "rebase-apply",
        "sequencer",
        "info/grafts",
      ].some((p) => existsSync(join(gitDir, p)))
    )
      throw Error("V64_FULL_IDLE_UNREPLACED_HISTORY_REQUIRED");
    if (
      tree(POST_MERGE_V64.baseline) !== POST_MERGE_V64.baselineTree ||
      tree(POST_MERGE_V64.acceptedSource) !== POST_MERGE_V64.baselineTree ||
      !isDeepStrictEqual(
        parents(POST_MERGE_V64.baseline),
        POST_MERGE_V64.mergeParents,
      ) ||
      !isDeepStrictEqual(parents(POST_MERGE_V64.acceptedSource), [
        POST_MERGE_V64.acceptedParent,
      ])
    )
      throw Error("V64_ACCEPTED_LINEAGE_MISMATCH");
    const urls = [
      "https://github.com/" + POST_MERGE_V64.repository + ".git",
      "https://github.com/" + POST_MERGE_V64.repository,
      "git@github.com:" + POST_MERGE_V64.repository + ".git",
    ];
    for (const args of [
      ["remote", "get-url", "--all", "origin"],
      ["remote", "get-url", "--push", "--all", "origin"],
    ]) {
      const values = run(...args)
        .trim()
        .split("\n");
      if (values.length !== 1 || !urls.includes(values[0]!))
        throw Error("V64_REMOTE_MISMATCH");
    }
    let source = initialHead;
    if (event !== undefined) {
      if (
        context?.eventName !== "pull_request" ||
        context.repository !== POST_MERGE_V64.repository ||
        context.sha !== initialHead ||
        !record(event) ||
        !["opened", "reopened", "synchronize", "ready_for_review"].includes(
          String(event.action),
        ) ||
        !Number.isSafeInteger(event.number) ||
        Number(event.number) <= 0 ||
        context.ref !== `refs/pull/${String(event.number)}/merge` ||
        !record(event.repository) ||
        event.repository.full_name !== POST_MERGE_V64.repository ||
        !record(event.pull_request) ||
        event.pull_request.number !== event.number ||
        event.pull_request.state !== "open" ||
        event.pull_request.merged !== false ||
        !record(event.pull_request.head) ||
        !record(event.pull_request.base) ||
        !record(event.pull_request.head.repo) ||
        !record(event.pull_request.base.repo) ||
        event.pull_request.head.repo.full_name !== POST_MERGE_V64.repository ||
        event.pull_request.base.repo.full_name !== POST_MERGE_V64.repository ||
        event.pull_request.head.ref !== POST_MERGE_V64.implementationBranch ||
        event.pull_request.base.ref !== POST_MERGE_V64.targetBranch ||
        event.pull_request.base.sha !== POST_MERGE_V64.baseline ||
        typeof event.pull_request.head.sha !== "string" ||
        !/^[a-f0-9]{40}$/.test(event.pull_request.head.sha)
      )
        throw Error("V64_PR_IDENTITY_MISMATCH");
      source = event.pull_request.head.sha;
      if (
        !isDeepStrictEqual(parents(initialHead), [
          POST_MERGE_V64.baseline,
          source,
        ]) ||
        tree(initialHead) !== tree(source)
      )
        throw Error("V64_PR_MERGE_IDENTITY_MISMATCH");
    } else {
      const branch = run("symbolic-ref", "--quiet", "--short", "HEAD").trim();
      if (context?.eventName === "push") {
        if (
          branch !== POST_MERGE_V64.targetBranch ||
          context.repository !== POST_MERGE_V64.repository ||
          context.ref !== "refs/heads/" + POST_MERGE_V64.targetBranch ||
          context.sha !== initialHead
        )
          throw Error("V64_PUSH_IDENTITY_MISMATCH");
        const mergeParents = parents(initialHead);
        if (mergeParents.length === 2) {
          if (
            mergeParents[0] !== POST_MERGE_V64.baseline ||
            tree(initialHead) !== tree(mergeParents[1]!)
          )
            throw Error("V64_INTEGRATION_MERGE_IDENTITY_MISMATCH");
          source = mergeParents[1]!;
        }
      } else if (
        context?.eventName !== undefined ||
        branch !== POST_MERGE_V64.implementationBranch
      )
        throw Error("V64_BRANCH_MISMATCH");
    }
    run("merge-base", "--is-ancestor", POST_MERGE_V64.baseline, source);
    const revisions = run("rev-list", POST_MERGE_V64.baseline + ".." + source)
      .trim()
      .split("\n")
      .filter(Boolean);
    if (revisions.some((sha) => parents(sha).length !== 1))
      throw Error("V64_UNREVIEWED_SOURCE_MERGE");
    const allowed = new Set<string>(V64_ALLOWED_PATHS);
    const baselinePackage = run(
      "show",
      POST_MERGE_V64.baseline + ":package.json",
    );
    const baselineWorkspace = run(
      "show",
      POST_MERGE_V64.baseline + ":pnpm-workspace.yaml",
    );
    if (
      !validateV64DependencyBytes(
        baselinePackage,
        baselineWorkspace,
        readFileSync(join(cwd, "package.json"), "utf8"),
        readFileSync(join(cwd, "pnpm-workspace.yaml"), "utf8"),
        readFileSync(join(cwd, "pnpm-lock.yaml")),
      )
    )
      throw Error("V64_DEPENDENCY_SECURITY_SCOPE_DRIFT");
    for (const p of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"])
      if (
        !lstatSync(join(cwd, p)).isFile() ||
        lstatSync(join(cwd, p)).mode & 0o111
      )
        throw Error("V64_DEPENDENCY_MODE_DRIFT");
    for (const rev of revisions)
      if (
        !validateV64DependencyBytes(
          baselinePackage,
          baselineWorkspace,
          run("show", rev + ":package.json"),
          run("show", rev + ":pnpm-workspace.yaml"),
          Buffer.from(run("show", rev + ":pnpm-lock.yaml")),
        )
      )
        throw Error("V64_SOURCE_DEPENDENCY_SCOPE_DRIFT");
    for (const rev of revisions)
      for (const p of run(
        "diff-tree",
        "--no-commit-id",
        "--no-renames",
        "--name-only",
        "-r",
        "-z",
        rev,
      )
        .split("\0")
        .filter(Boolean))
        if (!allowed.has(p)) throw Error("V64_SOURCE_SCOPE_DRIFT");
    if (
      run("ls-files", "-v", "-z")
        .split("\0")
        .filter(Boolean)
        .some((e) => !e.startsWith("H "))
    )
      throw Error("V64_HIDDEN_INDEX_FLAGS");
    const baselineFiles = run("ls-tree", "-r", "-z", POST_MERGE_V64.baseline)
      .split("\0")
      .filter(Boolean);
    const indexFiles = new Map(
      run("ls-files", "--stage", "-z")
        .split("\0")
        .filter(Boolean)
        .map((e) => {
          const [meta, p] = e.split("\t");
          return [p, meta] as const;
        }),
    );
    for (const entry of baselineFiles) {
      const [meta, p] = entry.split("\t");
      if (!meta || !p || allowed.has(p)) continue;
      const [mode, , oid] = meta.split(" ");
      if (indexFiles.get(p) !== mode + " " + oid + " 0")
        throw Error("V64_FROZEN_INDEX_DRIFT");
      const path = join(cwd, p),
        stat = lstatSync(path);
      if (!stat.isFile() || ((stat.mode & 0o111) !== 0) !== (mode === "100755"))
        throw Error("V64_FROZEN_MODE_DRIFT");
      const data = readFileSync(path),
        actual = createHash("sha1")
          .update("blob " + data.length + "\0")
          .update(data)
          .digest("hex");
      if (actual !== oid) throw Error("V64_FROZEN_SOURCE_DRIFT");
    }
    const status = run(
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
    )
      .split("\0")
      .filter(Boolean);
    if (status.some((e) => !allowed.has(e.slice(3))))
      throw Error("V64_WORKTREE_SCOPE_DRIFT");
    if ((event !== undefined || context?.eventName === "push") && status.length)
      throw Error("V64_CI_DIRTY");
    const baselineBytes =
      JSON.stringify(
        JSON.parse(
          readFileSync(
            join(cwd, "src/project-control-v64-baseline.json"),
            "utf8",
          ),
        ),
        null,
        2,
      ) + "\n";
    if (
      createHash("sha256").update(baselineBytes).digest("hex") !==
      POST_MERGE_V64.baselineFieldsSha256
    )
      throw Error("V64_PROJECTION_BASELINE_DRIFT");
    result = {
      head: initialHead,
      source,
      tree: tree(initialHead),
      clean: status.length === 0,
      baseline: POST_MERGE_V64.baseline,
      publicationAuthorized: false,
      remoteExecutionAuthorized: false,
    };
  } catch (error) {
    caught = true;
    failure = error;
  }
  if (
    run("rev-parse", "HEAD").trim() !== initialHead ||
    !readFileSync(indexPath).equals(initialIndex) ||
    existsSync(indexPath + ".lock")
  )
    throw Error("V64_OPERATOR_STATE_CHANGED");
  if (caught) throw failure;
  if (!result) throw Error("V64_INSPECTION_RECEIPT_MISSING");
  return result;
}
