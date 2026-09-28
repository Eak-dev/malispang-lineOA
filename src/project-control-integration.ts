import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  TEST_POLICY_REPAIR_V40,
  V40_ALLOWED_PATHS,
  projectV40ToV39,
} from "./project-control-v40.js";
import { projectV39ToV38 } from "./project-control-v39.js";
import { projectV38ToV37 } from "./project-control-v38.js";

export const TEST_POLICY_INTEGRATION_V41 = {
  version: "2026.09.29-v41",
  ownerDecision: "MP-OD-2026-09-29-V41",
  supersedes: "2026.09.28-v40",
  baseline: "07ce10f641ebaa74ceab83c98e8f5fdc40d6858b",
  publishedBaseline: "35b67ab87ecd052ab80f450d766c9eabd2991861",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/test-policy-v40",
  baseBranch: "codex/mp-06-guardrailed-ai",
  downstreamPr: 16,
  downstreamBaseBranch: "codex/phase-1a-foundation",
  downstreamBaseHead: "88deb90a58369923f11a7266ec63fa8fd5f293c2",
  qualifiedSnapshotSha256:
    "d76fa61d8ff2e82a96002a78c41b5ce584512013c7614609534e3c39c3369d48",
  workId: "MP-06",
  githubIssue: 12,
  stage: "CONDITIONAL_POLICY_INTEGRATION_ONLY",
  targetEnvironment: "LOCAL_AND_GITHUB_CONTROL_ONLY",
  remoteExecution: false,
  production: false,
  maximumDraftPullRequests: 1,
  maximumIntegrationMerges: 1,
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  forbidden:
    "RUNTIME_DEPLOY_ACTIVATE_STORAGE_LINE_PROVIDER_PRODUCTION_DEFAULT_MERGE_RESET_REBASE_FORCE_PUSH_ISSUE_CLOSE",
} as const;

export const V41_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-integration.ts",
  "tests/project-control-integration.test.ts",
  "tests/project-control-v40.test.ts",
  "tests/fixtures/mp06-v40-qualified/snapshot.json",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;

const c = TEST_POLICY_INTEGRATION_V41;
const snapshotPath = "tests/fixtures/mp06-v40-qualified/snapshot.json";
const controlPaths = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
] as const;
const appendPaths = [
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;
const sha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const digest = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const positive = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new Error("V41_OBJECT_REQUIRED");
  return value;
}
function closed(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!record(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && "value" in descriptor;
    })
  );
}
const ownerDecision = () => ({
  decisionId: c.ownerDecision,
  decidedAt: "2026-09-29",
  supersedes: c.supersedes,
});

export function projectV41ToV40(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  schema?: Record<string, unknown>,
): void {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: TEST_POLICY_REPAIR_V40.ownerDecision,
    decidedAt: "2026-09-28",
    supersedes: TEST_POLICY_REPAIR_V40.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.testPolicyIntegrationV41;
  if (schema) {
    schema.required = (schema.required as string[]).filter(
      (key) => key !== "testPolicyIntegrationV41",
    );
    const properties = object(schema.properties);
    delete properties.testPolicyIntegrationV41;
    properties.roadmapVersion = { const: c.supersedes };
  }
}

export const v41PathsAllowed = (paths: readonly string[]) =>
  paths.every((path) =>
    (V41_ALLOWED_PATHS as readonly string[]).includes(path),
  );
export function v41AuthoritySummary() {
  return {
    status: c.stage,
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: [
      "COMMIT",
      "PUSH_BRANCH",
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE_MP06_POLICY",
      "UPDATE_GITHUB_ROADMAP",
    ],
    allowedPaths: [...V41_ALLOWED_PATHS],
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    toolPermission: "NOT_EVALUATED",
    externalReceipts: "INDEPENDENT_AUTHENTICATION_REQUIRED",
    storageHold: c.storageHold,
    uatReadiness: "NOT_VERIFIED",
    downstreamPr16: "REVIEW_ONLY_NO_READY_OR_MERGE",
    sourceRoles: {
      publishedControlBaseline: c.publishedBaseline,
      inheritedLocalBaseline: c.baseline,
      qualifiedV40SnapshotSha256: c.qualifiedSnapshotSha256,
      runtimeCandidate: "1790da58635edcee154b60d76730248e8130c2d3",
      evidenceHead: "NOT_OBSERVED_BY_PURE_SUMMARY",
      deployedVersion: "NOT_OBSERVED_BY_PURE_SUMMARY",
    },
  } as const;
}

export interface IntegrationPrReceipt {
  kind: "INTEGRATION" | "DOWNSTREAM_REVIEW_ONLY";
  repository: string;
  pr: number;
  baseBranch: string;
  headBranch: string;
  base: string;
  head: string;
  merge: string;
  tree: string;
}
export interface IntegrationCheckoutReceipt {
  sha: string | undefined;
  ref: string | undefined;
  merge: string;
  parents: readonly string[];
  tree: string;
  sourceTree: string;
}

/** CI event identity only, never an approval or evidence of a real merge. */
export function validateIntegrationPullRequestReceipt(
  event: unknown,
  checkout: IntegrationCheckoutReceipt,
): IntegrationPrReceipt | null {
  try {
    if (
      !record(event) ||
      !record(event.repository) ||
      !record(event.pull_request)
    )
      return null;
    const pr = event.pull_request;
    if (
      !record(pr.head) ||
      !record(pr.base) ||
      !record(pr.head.repo) ||
      !record(pr.base.repo)
    )
      return null;
    if (
      event.repository.full_name !== c.repository ||
      pr.head.repo.full_name !== c.repository ||
      pr.base.repo.full_name !== c.repository ||
      !positive(event.number) ||
      pr.number !== event.number ||
      pr.state !== "open" ||
      pr.merged === true ||
      !sha(pr.head.sha) ||
      !sha(pr.base.sha) ||
      !sha(checkout.merge) ||
      !sha(checkout.tree) ||
      checkout.sha !== checkout.merge ||
      checkout.ref !== `refs/pull/${event.number}/merge` ||
      !isDeepStrictEqual(checkout.parents, [pr.base.sha, pr.head.sha]) ||
      checkout.tree !== checkout.sourceTree ||
      (pr.merge_commit_sha !== undefined &&
        pr.merge_commit_sha !== checkout.merge)
    )
      return null;
    const integration =
      event.number !== 16 &&
      event.number !== 18 &&
      pr.head.ref === c.headBranch &&
      pr.base.ref === c.baseBranch &&
      pr.base.sha === c.publishedBaseline;
    const downstream =
      event.number === c.downstreamPr &&
      pr.draft === true &&
      pr.head.ref === c.baseBranch &&
      pr.base.ref === c.downstreamBaseBranch &&
      pr.base.sha === c.downstreamBaseHead;
    if (!integration && !downstream) return null;
    return {
      kind: integration ? "INTEGRATION" : "DOWNSTREAM_REVIEW_ONLY",
      repository: c.repository,
      pr: event.number,
      baseBranch: String(pr.base.ref),
      headBranch: String(pr.head.ref),
      base: pr.base.sha,
      head: pr.head.sha,
      merge: checkout.merge,
      tree: checkout.tree,
    };
  } catch {
    return null;
  }
}

export interface IntegrationMergeReceipt {
  repository: string;
  pr: number;
  baseBranch: string;
  headBranch: string;
  base: string;
  head: string;
  merge: string;
  tree: string;
  state: "closed";
  merged: true;
  method: "merge";
  htmlUrl: string;
}
function mergedEvidence(value: unknown): value is IntegrationMergeReceipt {
  return (
    closed(value, [
      "repository",
      "pr",
      "baseBranch",
      "headBranch",
      "base",
      "head",
      "merge",
      "tree",
      "state",
      "merged",
      "method",
      "htmlUrl",
    ]) &&
    value.repository === c.repository &&
    positive(value.pr) &&
    value.pr !== 16 &&
    value.pr !== 18 &&
    value.baseBranch === c.baseBranch &&
    value.headBranch === c.headBranch &&
    value.base === c.publishedBaseline &&
    sha(value.head) &&
    sha(value.merge) &&
    sha(value.tree) &&
    value.merge !== value.head &&
    value.state === "closed" &&
    value.merged === true &&
    value.method === "merge" &&
    value.htmlUrl === `https://github.com/${c.repository}/pull/${value.pr}`
  );
}
export type IntegrationInspectionContext =
  | { kind: "PULL_REQUEST"; receipt: IntegrationPrReceipt }
  | { kind: "INTEGRATED"; receipt: IntegrationMergeReceipt };

/** Verified local Git structure is not a live review/permission receipt. A merged
 * shape without external context remains STRUCTURE_ONLY, including on CI. */
export function inspectIntegrationRepository(
  cwd: string,
  git: string,
  context?: IntegrationInspectionContext,
) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", ...args],
      { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
  const lines = (value: string) => value.trim().split("\n").filter(Boolean);
  const paths = (value: string) => value.split("\0").filter(Boolean);
  const base = c.baseline;
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V41_FULL_HISTORY_REQUIRED");
  run("merge-base", "--is-ancestor", c.publishedBaseline, base);
  const head = run("rev-parse", "HEAD").trim();
  const tree = run("rev-parse", "HEAD^{tree}").trim();
  const parentsOf = (revision: string) =>
    run("rev-list", "--parents", "-n", "1", revision)
      .trim()
      .split(" ")
      .slice(1);
  let sourceHead = head;
  let mode = head === base ? "LOCAL_SOURCE" : "SOURCE_COMMIT";
  const merges = lines(run("rev-list", "--merges", `${base}..HEAD`));
  if (merges.length) {
    const parents = parentsOf(head);
    if (parents.length !== 2)
      throw new Error("V41_EXACT_MERGE_PARENTS_REQUIRED");
    if (parents[0] === c.publishedBaseline) {
      sourceHead = parents[1]!;
      if (!isDeepStrictEqual(merges, [head]))
        throw new Error("V41_EXTRA_MERGE_REJECTED");
      mode = "MERGE_STRUCTURE_ONLY";
    } else if (parents[0] === c.downstreamBaseHead) {
      const integrationHead = parents[1]!;
      const innerParents = parentsOf(integrationHead);
      if (
        innerParents.length !== 2 ||
        innerParents[0] !== c.publishedBaseline ||
        !isDeepStrictEqual(merges, [head, integrationHead])
      )
        throw new Error("V41_DOWNSTREAM_INTEGRATION_LINEAGE_INVALID");
      sourceHead = innerParents[1]!;
      if (run("rev-parse", `${integrationHead}^{tree}`).trim() !== tree)
        throw new Error("V41_DOWNSTREAM_TREE_DIVERGENCE");
      mode = "DOWNSTREAM_STRUCTURE_ONLY";
    } else throw new Error("V41_MERGE_TARGET_NOT_AUTHORIZED");
    if (run("rev-parse", `${sourceHead}^{tree}`).trim() !== tree)
      throw new Error("V41_INTEGRATION_TREE_DIVERGENCE");
  }
  run("merge-base", "--is-ancestor", base, sourceHead);
  if (run("rev-list", "--merges", `${base}..${sourceHead}`).trim())
    throw new Error("V41_SOURCE_MERGE_REJECTED");
  const clean =
    run("status", "--porcelain=v1", "--untracked-files=all").trim() === "";
  if (merges.length && !clean) throw new Error("V41_MERGE_CHECKOUT_DIRTY");
  if (context) {
    const receipt = context.receipt;
    if (
      receipt.repository !== c.repository ||
      !positive(receipt.pr) ||
      receipt.pr === 18 ||
      receipt.merge !== head ||
      receipt.tree !== tree
    )
      throw new Error("V41_CONTEXT_IDENTITY_MISMATCH");
    if (context.kind === "PULL_REQUEST") {
      const expectedKind =
        mode === "DOWNSTREAM_STRUCTURE_ONLY"
          ? "DOWNSTREAM_REVIEW_ONLY"
          : "INTEGRATION";
      const p = parentsOf(head);
      const expectedBaseBranch =
        expectedKind === "INTEGRATION" ? c.baseBranch : c.downstreamBaseBranch;
      const expectedHeadBranch =
        expectedKind === "INTEGRATION" ? c.headBranch : c.baseBranch;
      if (
        context.receipt.kind !== expectedKind ||
        receipt.baseBranch !== expectedBaseBranch ||
        receipt.headBranch !== expectedHeadBranch ||
        !isDeepStrictEqual(p, [receipt.base, receipt.head]) ||
        (expectedKind === "DOWNSTREAM_REVIEW_ONLY"
          ? receipt.pr !== 16
          : receipt.pr === 16) ||
        !merges.length
      )
        throw new Error("V41_PR_CONTEXT_INVALID");
      mode =
        expectedKind === "INTEGRATION"
          ? "SYNTHETIC_PR_MERGE"
          : "DOWNSTREAM_REVIEW_ONLY";
    } else {
      const r = context.receipt;
      if (
        !mergedEvidence(r) ||
        mode !== "MERGE_STRUCTURE_ONLY" ||
        r.pr === 16 ||
        r.base !== c.publishedBaseline ||
        r.head !== sourceHead ||
        r.baseBranch !== c.baseBranch ||
        r.headBranch !== c.headBranch ||
        r.state !== "closed" ||
        r.merged !== true ||
        r.method !== "merge" ||
        r.htmlUrl !== `https://github.com/${c.repository}/pull/${r.pr}`
      )
        throw new Error("V41_ACTUAL_MERGE_RECEIPT_INVALID");
      mode = "INTEGRATED";
    }
  }
  const snapshotText = readFileSync(join(cwd, snapshotPath), "utf8");
  if (hash(snapshotText) !== c.qualifiedSnapshotSha256)
    throw new Error("V41_QUALIFIED_SNAPSHOT_HASH_MISMATCH");
  const files = object(object(JSON.parse(snapshotText)).files);
  if (
    !isDeepStrictEqual(Object.keys(files).sort(), [...V40_ALLOWED_PATHS].sort())
  )
    throw new Error("V41_SNAPSHOT_PATHS_INVALID");
  const qualified = (path: string): string => {
    const file = object(files[path]);
    if (typeof file.content !== "string" || file.sha256 !== hash(file.content))
      throw new Error("V41_SNAPSHOT_FILE_HASH_MISMATCH");
    return file.content;
  };
  for (const path of V40_ALLOWED_PATHS) qualified(path);
  const inherited = controlPaths.map((path) =>
    object(JSON.parse(qualified(path))),
  );
  projectV40ToV39(inherited[0]!, inherited[1]!, inherited[2]);
  for (const [i, path] of controlPaths.entries())
    if (
      !isDeepStrictEqual(
        inherited[i],
        JSON.parse(run("show", `${base}:${path}`)),
      )
    )
      throw new Error("V41_QUALIFIED_V39_LINEAGE_DRIFT");
  projectV39ToV38(inherited[0]!, inherited[1]!, inherited[2]);
  projectV38ToV37(inherited[0]!, inherited[1]!, inherited[2]);
  for (const [i, path] of controlPaths.entries())
    if (
      !isDeepStrictEqual(
        inherited[i],
        JSON.parse(run("show", `${c.publishedBaseline}:${path}`)),
      )
    )
      throw new Error("V41_PUBLISHED_LINEAGE_DRIFT");
  const revisions = lines(
    run("rev-list", "--reverse", `${base}..${sourceHead}`),
  );
  const changed = [
    ...new Set([
      ...paths(run("diff", "--no-renames", "--name-only", "-z", base)),
      ...paths(
        run("diff", "--cached", "--no-renames", "--name-only", "-z", base),
      ),
      ...paths(run("ls-files", "--others", "--exclude-standard", "-z")),
      ...revisions.flatMap((r) =>
        paths(
          run(
            "diff-tree",
            "--no-commit-id",
            "--no-renames",
            "--name-only",
            "-r",
            "-z",
            r,
          ),
        ),
      ),
    ]),
  ];
  const inventory = new Set<string>([
    ...V40_ALLOWED_PATHS,
    ...V41_ALLOWED_PATHS,
  ]);
  if (changed.some((path) => !inventory.has(path)))
    throw new Error("V41_PATH_OUTSIDE_SCOPE");
  for (const path of changed)
    if (!lstatSync(join(cwd, path)).isFile())
      throw new Error("V41_NON_REGULAR_PATH");
  if (
    changed.length &&
    paths(run("ls-files", "--stage", "-z", "--", ...changed)).some(
      (entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry),
    )
  )
    throw new Error("V41_NON_REGULAR_INDEX_PATH");
  for (const r of revisions)
    if (
      paths(run("ls-tree", "-r", "-z", r, "--", ...changed)).some(
        (entry) => !/^(100644|100755) blob [a-f0-9]+\t/u.test(entry),
      )
    )
      throw new Error("V41_NON_REGULAR_HISTORY_PATH");
  const check = (read: (path: string) => string, permitBaseline: boolean) => {
    const r = object(JSON.parse(read(controlPaths[0])));
    if (permitBaseline && r.version === "2026.09.24-v39") {
      if (run("diff", "--cached", "--name-only", base).trim())
        throw new Error("V41_PARTIAL_BASELINE_INDEX_REJECTED");
      for (const path of [
        ...controlPaths,
        ...appendPaths,
        "PROJECT_CONTROL.md",
      ])
        if (read(path) !== run("show", `${base}:${path}`))
          throw new Error("V41_BASELINE_INDEX_DRIFT");
      return;
    }
    const w = object(JSON.parse(read(controlPaths[1]))),
      s = object(JSON.parse(read(controlPaths[2])));
    const properties = object(s.properties);
    if (
      r.version !== c.version ||
      w.roadmapVersion !== c.version ||
      !isDeepStrictEqual(r.ownerDecision, ownerDecision()) ||
      !isDeepStrictEqual(w.testPolicyIntegrationV41, c) ||
      !Array.isArray(s.required) ||
      s.required.filter((key) => key === "testPolicyIntegrationV41").length !==
        1 ||
      !isDeepStrictEqual(properties.testPolicyIntegrationV41, { const: c }) ||
      !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
    )
      throw new Error("V41_EXACT_TRANSITION_REQUIRED");
    projectV41ToV40(r, w, s);
    for (const [i, value] of [r, w, s].entries())
      if (!isDeepStrictEqual(value, JSON.parse(qualified(controlPaths[i]!))))
        throw new Error("V41_INHERITED_CONTROL_DRIFT");
    for (const path of appendPaths)
      if (!read(path).startsWith(qualified(path)))
        throw new Error("V41_HISTORY_REWRITTEN");
    const header = "# MalisPang Project Control\n\n";
    if (
      !read("PROJECT_CONTROL.md").startsWith(header) ||
      !read("PROJECT_CONTROL.md").endsWith(
        qualified("PROJECT_CONTROL.md").slice(header.length),
      )
    )
      throw new Error("V41_CONTROL_HISTORY_REWRITTEN");
    const owner = read("docs/project/OWNER_DECISION_LOG.md").split(
      "## MP-OD-2026-09-29-V41 —",
    );
    const json = owner[1]
      ?.split("\n## ")[0]
      ?.match(/```json\s*([\s\S]*?)```/u)?.[1];
    if (
      owner.length !== 2 ||
      json === undefined ||
      !isDeepStrictEqual(JSON.parse(json), c)
    )
      throw new Error("V41_OWNER_RECORD_INVALID");
    if (hash(read(snapshotPath)) !== c.qualifiedSnapshotSha256)
      throw new Error("V41_SNAPSHOT_HISTORY_DRIFT");
    for (const path of V40_ALLOWED_PATHS)
      if (
        !(V41_ALLOWED_PATHS as readonly string[]).includes(path) &&
        read(path) !== qualified(path)
      )
        throw new Error(`V41_FROZEN_V40_DRIFT:${path}`);
  };
  check((path) => readFileSync(join(cwd, path), "utf8"), false);
  check((path) => run("show", `:${path}`), true);
  for (const r of revisions)
    check((path) => run("show", `${r}:${path}`), false);
  return {
    mode,
    head,
    tree,
    sourceHead,
    clean,
    remoteExecutionAuthorized: false as const,
    reviewProvenance: "EXTERNAL_AUTHENTICATION_REQUIRED" as const,
  };
}

/** These closed receipts are independently gathered observations, NOT trusted
 * simply because a caller constructs them. The executor must authenticate local
 * qualification, live GitHub results and a single-writer durable external ledger
 * immediately before the action. This pure gate never executes or mints grants. */
export interface IntegrationLocalEvidence {
  kind: "LOCAL_QUALIFICATION";
  repository: string;
  headBranch: string;
  baseBranch: string;
  baseHead: string;
  stage: "PRE_COMMIT" | "POST_COMMIT";
  head: string;
  candidateParent: string;
  tree: string;
  qualifiedTree: string;
  diffSha256: string;
  reviewedDiffSha256: string;
  snapshotSha256: string;
  validation: "PASS";
  independentReview: "NO_ACTIONABLE_FINDINGS";
  workingTreeClean: boolean;
}
export interface IntegrationCreationEvidence {
  kind: "DRAFT_CREATION";
  local: IntegrationLocalEvidence;
  creationState: "UNUSED";
  existingPullRequests: readonly number[];
  observedAt: string;
  checkedAt: string;
}
export interface IntegrationLiveEvidence {
  kind: "LIVE_GITHUB_INTEGRATION";
  repository: string;
  headBranch: string;
  baseBranch: string;
  baseHead: string;
  pullRequest: number;
  headSha: string;
  expectedHeadSha: string;
  state: "open";
  draft: boolean;
  mergeMethod: "merge";
  ciHeadSha: string;
  ciRunId: number;
  ciConclusion: "success";
  reviewHeadSha: string;
  reviewCheckRunId: number;
  reviewCheckName: "Greptile Review";
  reviewConclusion: "success";
  unresolvedFindings: 0;
  reviewCommentsAdded: 0;
  creationState: "CONSUMED";
  creationPullRequest: number;
  mergeState: "UNUSED";
  observedAt: string;
  checkedAt: string;
}
const localKeys = [
  "kind",
  "repository",
  "headBranch",
  "baseBranch",
  "baseHead",
  "stage",
  "head",
  "candidateParent",
  "tree",
  "qualifiedTree",
  "diffSha256",
  "reviewedDiffSha256",
  "snapshotSha256",
  "validation",
  "independentReview",
  "workingTreeClean",
];
function localEvidence(e: unknown): e is IntegrationLocalEvidence {
  return (
    closed(e, localKeys) &&
    e.kind === "LOCAL_QUALIFICATION" &&
    e.repository === c.repository &&
    e.headBranch === c.headBranch &&
    e.baseBranch === c.baseBranch &&
    e.baseHead === c.publishedBaseline &&
    (e.stage === "PRE_COMMIT" || e.stage === "POST_COMMIT") &&
    sha(e.head) &&
    sha(e.candidateParent) &&
    sha(e.tree) &&
    e.tree === e.qualifiedTree &&
    digest(e.diffSha256) &&
    e.diffSha256 === e.reviewedDiffSha256 &&
    e.snapshotSha256 === c.qualifiedSnapshotSha256 &&
    e.validation === "PASS" &&
    e.independentReview === "NO_ACTIONABLE_FINDINGS" &&
    typeof e.workingTreeClean === "boolean" &&
    (e.stage === "PRE_COMMIT"
      ? e.head === e.candidateParent
      : e.workingTreeClean && e.head !== e.candidateParent)
  );
}
function fresh(observed: unknown, checked: unknown) {
  if (typeof observed !== "string" || typeof checked !== "string") return false;
  const a = Date.parse(observed),
    b = Date.parse(checked);
  const now = Date.now();
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    b >= a &&
    b - a <= 120_000 &&
    now >= b &&
    now - b <= 120_000 &&
    now - a <= 120_000
  );
}
const liveKeys = [
  "kind",
  "repository",
  "headBranch",
  "baseBranch",
  "baseHead",
  "pullRequest",
  "headSha",
  "expectedHeadSha",
  "state",
  "draft",
  "mergeMethod",
  "ciHeadSha",
  "ciRunId",
  "ciConclusion",
  "reviewHeadSha",
  "reviewCheckRunId",
  "reviewCheckName",
  "reviewConclusion",
  "unresolvedFindings",
  "reviewCommentsAdded",
  "creationState",
  "creationPullRequest",
  "mergeState",
  "observedAt",
  "checkedAt",
];
function liveEvidence(e: unknown): e is IntegrationLiveEvidence {
  return (
    closed(e, liveKeys) &&
    e.kind === "LIVE_GITHUB_INTEGRATION" &&
    e.repository === c.repository &&
    e.headBranch === c.headBranch &&
    e.baseBranch === c.baseBranch &&
    e.baseHead === c.publishedBaseline &&
    positive(e.pullRequest) &&
    e.pullRequest !== 16 &&
    e.pullRequest !== 18 &&
    sha(e.headSha) &&
    e.expectedHeadSha === e.headSha &&
    e.state === "open" &&
    typeof e.draft === "boolean" &&
    e.mergeMethod === "merge" &&
    e.ciHeadSha === e.headSha &&
    positive(e.ciRunId) &&
    e.ciConclusion === "success" &&
    e.reviewHeadSha === e.headSha &&
    positive(e.reviewCheckRunId) &&
    e.reviewCheckName === "Greptile Review" &&
    e.reviewConclusion === "success" &&
    e.unresolvedFindings === 0 &&
    e.reviewCommentsAdded === 0 &&
    e.creationState === "CONSUMED" &&
    e.creationPullRequest === e.pullRequest &&
    e.mergeState === "UNUSED" &&
    fresh(e.observedAt, e.checkedAt)
  );
}
export function evaluateIntegrationAction(
  action: string,
  evidence?: unknown,
): { allowed: boolean; reason: string } {
  try {
    if (
      ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
        action,
      )
    )
      return { allowed: true, reason: "V41_LOCAL_CONTROL_SCOPE_ONLY" };
    if (action === "COMMIT" || action === "PUSH_BRANCH") {
      const allowed =
        localEvidence(evidence) &&
        evidence.stage === (action === "COMMIT" ? "PRE_COMMIT" : "POST_COMMIT");
      return {
        allowed,
        reason: allowed
          ? "V41_EXACT_LOCAL_QUALIFICATION"
          : "V41_LOCAL_QUALIFICATION_REQUIRED",
      };
    }
    if (action === "CREATE_DRAFT_PR") {
      const allowed =
        closed(evidence, [
          "kind",
          "local",
          "creationState",
          "existingPullRequests",
          "observedAt",
          "checkedAt",
        ]) &&
        evidence.kind === "DRAFT_CREATION" &&
        localEvidence(evidence.local) &&
        evidence.local.stage === "POST_COMMIT" &&
        evidence.creationState === "UNUSED" &&
        Array.isArray(evidence.existingPullRequests) &&
        evidence.existingPullRequests.length === 0 &&
        fresh(evidence.observedAt, evidence.checkedAt);
      return {
        allowed,
        reason: allowed
          ? "V41_ONE_DRAFT_CREATION_CONDITIONAL"
          : "V41_FRESH_UNUSED_CREATION_RECEIPT_REQUIRED",
      };
    }
    if (action === "UPDATE_GITHUB_ROADMAP") {
      const allowed =
        localEvidence(evidence) ||
        liveEvidence(evidence) ||
        mergedEvidence(evidence);
      return {
        allowed,
        reason: allowed
          ? "V41_SANITIZED_ISSUE9_12_STATUS_ONLY"
          : "V41_BOUND_STATUS_EVIDENCE_REQUIRED",
      };
    }
    if (["READY_FOR_REVIEW", "MERGE_MP06_POLICY"].includes(action)) {
      const allowed =
        liveEvidence(evidence) &&
        (action !== "MERGE_MP06_POLICY" || evidence.draft === false);
      return {
        allowed,
        reason: allowed
          ? "V41_EXACT_LIVE_SOURCE_REVIEW_TUPLE"
          : "V41_INDEPENDENT_LIVE_RECEIPT_REQUIRED",
      };
    }
  } catch {
    return { allowed: false, reason: "V41_MALFORMED_EVIDENCE" };
  }
  return { allowed: false, reason: "V41_ACTION_NOT_AUTHORIZED" };
}
