import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";
import {
  POST_MERGE_V64,
  V64_WORK_FIELDS,
  V64_ALLOWED_PATHS,
  inspectV64Repository,
} from "./project-control-v64.js";

export const PUBLICATION_V65 = {
  version: "2026.10.12-v65",
  ownerDecision: "MP-OD-2026-10-12-V65",
  supersedes: "2026.10.12-v64",
  ownerRelayComment: 6120205691,
  ownerQuote:
    '* อนุมัติ publish คือ commit, push branch codex/mp06-control-reconcile และเปิด Draft PR เข้า codex/mp-06-guardrailed-ai\n* อนุมัติ merge แยกต่างหากภายหลัง\n* ผมแนะนำให้อนุมัติเป็นข้อความชัดเจนทีละเรื่อง เพราะคำว่า "สั่งแก้ไข ได้เลย" ครอบคลุมการ publish ด้วยหรือไม่ เป็นเรื่องที่คุณต้องตัดสิน ผลรีวิวของผมให้สิทธิ์แทนไม่ได้    อนุมัติทั้งหมด',
  repository: POST_MERGE_V64.repository,
  baseline: POST_MERGE_V64.baseline,
  headBranch: POST_MERGE_V64.implementationBranch,
  baseBranch: POST_MERGE_V64.targetBranch,
  maximumCommits: 1,
  maximumPushes: 1,
  maximumDraftPullRequests: 1,
  normalPushOnly: true,
  mergedPr20: "COORDINATION_ONLY_NEVER_REOPEN_OR_PUSH",
  laterMerge: "SEPARATE_ACTION_CONTROL_AFTER_HOSTED_CI_AND_POSTPUSH_REVIEW",
  defaultIntegration: "OUT_OF_SCOPE_PR16_UNCHANGED",
  remoteExecution: false,
  production: "NO_GO",
} as const;
const c = PUBLICATION_V65;
/** Enforce the newly approved one-child topology as well as inherited frozen-source guards. */
export function inspectV65Repository(
  ...args: Parameters<typeof inspectV64Repository>
) {
  const result = inspectV64Repository(...args),
    [cwd, git = "git", event, context] = args;
  const count = Number(
    execFileSync(
      git,
      [
        "--no-replace-objects",
        "--no-optional-locks",
        "rev-list",
        "--count",
        c.baseline + ".." + result.source,
      ],
      { cwd, encoding: "utf8" },
    ).trim(),
  );
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > 1 ||
    ((event !== undefined || context?.eventName !== undefined) && count !== 1)
  )
    throw Error("V65_SINGLE_CHILD_TOPOLOGY_REQUIRED");
  return { ...result, sourceCommitCount: count };
}
export const V65_WORK_FIELDS = {
  ...V64_WORK_FIELDS,
  authorization: {
    ...V64_WORK_FIELDS.authorization,
    commit: true,
    pushBranch: true,
  },
} as const;
export const V65_GATE_NAMES = [
  "validate:toolchain",
  "render:rich-menu",
  "preview",
  "preview:rich-menu",
  "format:check",
  "lint",
  "typecheck",
  "test:node:unit",
  "test:node:benchmark",
  "test:worker",
  "build",
  "validate:flex",
  "validate:rich-menu",
  "validate:approved-knowledge-base",
  "validate:product-catalog",
  "validate:draft-order-config",
  "validate:production-readiness",
  "validate:project-control",
  "validate:mp-06-policy",
  "validate:mp-06-test-readiness",
  "benchmark:mp-06:check",
  "ai-nlu:mp-06:check",
  "worker:dry-run",
  "dev-operations",
  "secret:scan",
  "audit-zero",
  "diff-check",
] as const;
const plain = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  [Object.prototype, null].includes(
    Object.getPrototypeOf(v) as object | null,
  ) &&
  Reflect.ownKeys(v).every(
    (k) =>
      typeof k === "string" &&
      "value" in Object.getOwnPropertyDescriptor(v, k)!,
  );
const sha = (v: unknown) => typeof v === "string" && /^[a-f0-9]{40}$/u.test(v);
const digest = (v: unknown) =>
  typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const closed = (v: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
const fresh = (v: unknown, now: number) => {
  const at = typeof v === "string" ? Date.parse(v) : NaN;
  return (
    Number.isFinite(now) &&
    Number.isFinite(at) &&
    at <= now &&
    now - at <= 120000
  );
};
const same = isDeepStrictEqual;
export function projectV65ToV64(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
) {
  r.version = POST_MERGE_V64.version;
  r.ownerDecision = {
    decisionId: POST_MERGE_V64.ownerDecision,
    decidedAt: "2026-10-10",
    supersedes: POST_MERGE_V64.supersedes,
  };
  w.roadmapVersion = POST_MERGE_V64.version;
  w.authorization = structuredClone(V64_WORK_FIELDS.authorization);
  delete w.publicationV65;
}
export function validateV65Overlay(r: unknown, w: unknown): string[] {
  return plain(r) &&
    plain(w) &&
    r.version === c.version &&
    w.roadmapVersion === c.version &&
    same(r.ownerDecision, {
      decisionId: c.ownerDecision,
      decidedAt: "2026-10-12",
      supersedes: c.supersedes,
    }) &&
    same(w.publicationV65, c) &&
    Object.entries(V65_WORK_FIELDS).every(([k, v]) => same(w[k], v))
    ? []
    : ["V65_CLOSED_PUBLICATION_CONTROL_REQUIRED"];
}
export function projectV65Schemas(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
) {
  if (plain(w.properties)) {
    w.properties.roadmapVersion = { const: POST_MERGE_V64.version };
    w.properties.authorization = { const: V64_WORK_FIELDS.authorization };
    delete w.properties.publicationV65;
  }
  if (Array.isArray(w.required))
    w.required = w.required.filter((k) => k !== "publicationV65");
  // The inherited roadmap schema deliberately validates the versioned Owner record in the overlay.
  void r;
}
export function validateV65Schemas(r: unknown, w: unknown): string[] {
  return plain(r) &&
    plain(w) &&
    plain(w.properties) &&
    Array.isArray(w.required) &&
    w.required.filter((k) => k === "publicationV65").length === 1 &&
    same(w.properties.publicationV65, { const: c }) &&
    same(w.properties.roadmapVersion, { const: c.version }) &&
    same(w.properties.authorization, { const: V65_WORK_FIELDS.authorization })
    ? []
    : ["V65_SCHEMA_NOT_CLOSED"];
}
export function validateV65OwnerRecord(v: unknown) {
  if (typeof v !== "string") return false;
  const sections = v.split("## " + c.ownerDecision + " —");
  if (sections.length !== 2) return false;
  try {
    const json = sections[1]
      ?.split("\n## ")[0]
      ?.match(/```json\s*([\s\S]*?)```/u)?.[1];
    return (
      json !== undefined &&
      same(JSON.parse(json), c) &&
      sections[1]?.includes("อนุมัติทั้งหมด") === true
    );
  } catch {
    return false;
  }
}
export function v65AuthoritySummary() {
  return {
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    workId: "MP-06",
    githubIssue: 12,
    status: "CONDITIONAL_POST_MERGE_CONTROL_PUBLICATION_ONLY",
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: ["COMMIT", "PUSH_BRANCH", "CREATE_PULL_REQUEST"],
    allowedPaths: V64_ALLOWED_PATHS,
    ownerPublicationApproved: true,
    publicationAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    testAcceptance: "OWNER_ACCEPTED_TEST_CLOSED",
    nextWorkAuthorized: false,
    sourceState: "STRUCTURAL_VALIDATION_NOT_AN_ACTION_RECEIPT",
  };
}
/** Pure prerequisite evaluator. Operator must authenticate every input from actual observations;
 * fixture PASS objects are NEVER authority or execution receipts. No remote call occurs here. */
export function evaluateV65Action(
  action: string,
  value?: unknown,
  now = Date.now(),
) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V65_SCOPED_LOCAL_REVIEW_REMEDIATION" };
  const e = plain(value) ? value : {},
    review = plain(e.review) ? e.review : {},
    remote = plain(e.remote) ? e.remote : {},
    journal = plain(e.journal) ? e.journal : {};
  const audit = plain(e.audit) ? e.audit : {};
  const gates = Array.isArray(e.gates) ? e.gates : [];
  const source =
    ["COMMIT", "PUSH_BRANCH", "CREATE_PULL_REQUEST"].includes(action) &&
    closed(e, [
      "kind",
      "controlVersion",
      "baseline",
      "branch",
      "parent",
      "head",
      "sourceCommitCount",
      "tree",
      "qualifiedTree",
      "diffSha256",
      "qualifiedHead",
      "qualificationStage",
      "gitGraphVerified",
      "sourceSeal",
      "entriesSeal",
      "logsVerified",
      "validation",
      "platform",
      "stage",
      "clean",
      "sourceStable",
      "indexStable",
      "workingTreeMatchesIndex",
      "gates",
      "audit",
      "review",
      "remote",
      "journal",
      "requestedDraft",
      "requestedHeadBranch",
      "requestedBaseBranch",
    ]) &&
    closed(review, [
      "channel",
      "verdict",
      "parent",
      "tree",
      "diffSha256",
      "completePatch",
      "executedOrExplicitlyReusedEvidence",
      "responseComment",
      "stage",
      "commit",
      "exactCommitReconstructed",
    ]) &&
    closed(remote, [
      "repository",
      "targetBranch",
      "target",
      "coordinationPr20Merged",
      "ownerDecisionRelayReadbackVerified",
      "ownerDecisionsUncontradicted",
      "observedAt",
      "headBranch",
      "repairBranchAbsent",
      "normalPush",
      "existingRepairPullRequests",
      "repairHead",
    ]) &&
    closed(journal, [
      "kind",
      "observedAt",
      "unknownOutcome",
      "commits",
      "pushes",
      "pullRequests",
      "productionActions",
      "deployments",
    ]) &&
    closed(audit, [
      "tree",
      "observedAt",
      "info",
      "low",
      "moderate",
      "high",
      "critical",
    ]) &&
    e.kind === "V65_ACTUAL_EXACT_SOURCE_QUALIFICATION" &&
    e.controlVersion === c.version &&
    e.baseline === c.baseline &&
    e.branch === c.headBranch &&
    e.parent === c.baseline &&
    sha(e.tree) &&
    e.tree !== POST_MERGE_V64.reviewRemediationAmendment.previousTree &&
    e.tree === e.qualifiedTree &&
    e.tree === review.tree &&
    digest(e.diffSha256) &&
    e.diffSha256 === review.diffSha256 &&
    e.validation === "FULL_PASS" &&
    e.platform === "darwin" &&
    gates.length === V65_GATE_NAMES.length &&
    gates.every(
      (g, i) =>
        plain(g) &&
        g.name === V65_GATE_NAMES[i] &&
        g.state === "PASS" &&
        g.code === 0 &&
        g.signal === null &&
        g.sourceStable === true &&
        digest(g.logSha256),
    ) &&
    e.qualifiedHead === e.head &&
    e.qualificationStage === e.stage &&
    e.gitGraphVerified === true &&
    digest(e.sourceSeal) &&
    digest(e.entriesSeal) &&
    e.logsVerified === true &&
    e.sourceStable === true &&
    e.indexStable === true &&
    e.workingTreeMatchesIndex === true &&
    audit.tree === e.tree &&
    fresh(audit.observedAt, now) &&
    ["info", "low", "moderate", "high", "critical"].every(
      (k) => audit[k] === 0,
    ) &&
    review.channel === "PR20_COMMENTS" &&
    review.verdict === "PASS" &&
    review.parent === c.baseline &&
    review.completePatch === true &&
    review.executedOrExplicitlyReusedEvidence === true &&
    typeof review.responseComment === "string" &&
    /^https:\/\/github\.com\/Eak-dev\/malispang-lineOA\/pull\/20#issuecomment-[1-9][0-9]*$/u.test(
      review.responseComment,
    ) &&
    remote.repository === c.repository &&
    remote.targetBranch === c.baseBranch &&
    remote.target === c.baseline &&
    remote.coordinationPr20Merged === true &&
    remote.ownerDecisionRelayReadbackVerified === true &&
    remote.ownerDecisionsUncontradicted === true &&
    fresh(remote.observedAt, now) &&
    journal.kind === "AUTHENTICATED_FULL_PUBLICATION_JOURNAL" &&
    fresh(journal.observedAt, now) &&
    journal.unknownOutcome === false &&
    journal.pullRequests === 0 &&
    journal.productionActions === 0 &&
    journal.deployments === 0;
  const commit =
    source &&
    e.stage === "PRE_COMMIT" &&
    e.head === c.baseline &&
    e.sourceCommitCount === 0 &&
    review.stage === "PRE_COMMIT" &&
    journal.commits === 0 &&
    journal.pushes === 0 &&
    remote.headBranch === c.headBranch &&
    remote.repairBranchAbsent === true &&
    remote.existingRepairPullRequests === 0;
  const publishedSource =
    source &&
    e.stage === "POST_COMMIT" &&
    sha(e.head) &&
    e.head !== c.baseline &&
    e.sourceCommitCount === 1 &&
    e.clean === true &&
    review.stage === "PRE_PUSH" &&
    review.commit === e.head &&
    review.exactCommitReconstructed === true &&
    journal.commits === 1;
  const push =
    publishedSource &&
    journal.pushes === 0 &&
    remote.headBranch === c.headBranch &&
    remote.repairBranchAbsent === true &&
    remote.normalPush === true;
  const create =
    publishedSource &&
    journal.pushes === 1 &&
    remote.headBranch === c.headBranch &&
    remote.repairHead === e.head &&
    remote.existingRepairPullRequests === 0 &&
    e.requestedDraft === true &&
    e.requestedHeadBranch === c.headBranch &&
    e.requestedBaseBranch === c.baseBranch;
  return {
    allowed:
      action === "COMMIT"
        ? commit
        : action === "PUSH_BRANCH"
          ? push
          : action === "CREATE_PULL_REQUEST"
            ? create
            : false,
    reason:
      "V65_ACTUAL_MAC27_REVIEW_FRESH_IDENTITY_AUDIT_AND_SINGLE_USE_JOURNAL_REQUIRED",
  };
}
