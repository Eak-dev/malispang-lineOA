import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  HARNESS_PUBLICATION_V43,
  evaluateV43Action,
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43LocalReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const INSPECTOR_BATCH_V45 = {
  version: "2026.09.30-v45",
  ownerDecision: "MP-OD-2026-09-30-V45",
  supersedes: "2026.09.29-v43",
  replacesUnpublishedDraft: "2026.09.30-v44",
  baseline: "d0f63188c50da6e204a4ecc1e91bed97f5ec44eb",
  baselineTree: "69ba68699b20f5c93bf078aef66d3b4f76a9514f",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  creationGrant: "CONSUMED_NO_NEW_PR",
  priorIntegrationGrant: "PR19_CONSUMED_NO_REPLACEMENT",
  workId: "MP-06",
  githubIssue: 12,
  stage: "IMMUTABLE_GIT_BATCHING_EXISTING_DRAFT_ONLY",
  harnessPath: "tests/project-control.test.ts",
  harnessSha256:
    "feec02a8e5536ea91354a6744b75e5b69409fd2358826eed271efdbb82deaff2",
  implementationSeals: {
    "src/project-control.ts":
      "707998f462fca122e7d59e1d3ebf10f5930130603353ce90d8fcffcda53ba1d6",
    "src/project-control-git-batch.ts":
      "c899f89dcef27dc5c59ad9b508564e2ebca046e94679ab0ff905441367cade61",
    "tests/project-control-git-batch.test.ts":
      "e3d872ec4af95beddb5bb740d8887edd12488ce46251b7c464d000c108d6a906",
  },
  implementationScope:
    "CURRENT_INSPECTOR_INVOCATION_IMMUTABLE_BLOB_BATCHING_ONLY_NO_CACHE_OR_CHECK_OMISSION",
  measurement: "PAIRED_MEASUREMENT_REQUIRED_NO_HOSTED_CAUSE_CLAIM",
  invariants:
    "ALL_ASSERTIONS_RAW_INDEX_OPERATOR_ISOLATION_AWAITED_CLEANUP_UNCHANGED",
  watchdogMs: 5000,
  retries: 0,
  node: "24.19.0",
  pnpm: "11.19.0",
  auditGate: "ZERO_AT_EVERY_SEVERITY_NO_SUPPRESSION",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  remoteExecution: false,
  ready: false,
  merge: false,
  production: false,
  forbidden:
    "NEW_PR_READY_MERGE_RUNTIME_WORKFLOW_PARALLELISM_DEPENDENCY_DEPLOY_REMOTE_TEST_STORAGE_SQL_LINE_PROVIDER_PRODUCTION_U2_ISSUE_CLOSE",
} as const;
export const V45_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v45.ts",
  "tests/project-control-v45.test.ts",
  "tests/project-control-v43.test.ts",
  "src/project-control-git-batch.ts",
  "tests/project-control-git-batch.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;
const c = INSPECTOR_BATCH_V45;
const controls = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
] as const;
const appendPaths = [
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;
const documents = ["PROJECT_CONTROL.md", ...appendPaths] as const;
const hash = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
const sha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("V45_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}
function closed(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    [Object.prototype, null].includes(
      Object.getPrototypeOf(value) as object | null,
    ) &&
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => {
      const d = Object.getOwnPropertyDescriptor(value, key);
      return d !== undefined && "value" in d;
    })
  );
}
export function projectV45ToV43(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: HARNESS_PUBLICATION_V43.ownerDecision,
    decidedAt: "2026-09-29",
    supersedes: HARNESS_PUBLICATION_V43.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.inspectorBatchV45;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "inspectorBatchV45",
    );
    const properties = object(s.properties);
    delete properties.inspectorBatchV45;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v45AuthoritySummary() {
  return {
    status: c.stage,
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: ["COMMIT", "PUSH_BRANCH"],
    allowedPaths: [...V45_ALLOWED_PATHS],
    pullRequest: c.pullRequest,
    creationGrant: c.creationGrant,
    priorIntegrationGrant: c.priorIntegrationGrant,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: "NOT_VERIFIED",
    receiptProvenance:
      "INDEPENDENT_GIT_CHECKOUT_QUALIFICATION_REVIEW_AND_FRESH_PR20_READBACK_REQUIRED",
  } as const;
}
export function validateV45PullRequestReceipt(
  event: unknown,
  observed: V43CheckoutReceipt,
): V43PrReceipt | null {
  const receipt = validateV43PullRequestReceipt(event, observed);
  return receipt?.pr === c.pullRequest &&
    receipt.head !== c.baseline &&
    (event as { pull_request: { merged?: unknown } }).pull_request.merged ===
      false
    ? receipt
    : null;
}

/** Git structure only, not a live review, qualification or push authorization. */
export function inspectV45Repository(
  cwd: string,
  git: string,
  receipt?: V43PrReceipt,
) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", ...args],
      { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
  const split = (text: string) => text.split("\0").filter(Boolean);
  const lines = (text: string) => text.trim().split("\n").filter(Boolean);
  const parents = (revision: string) =>
    run("rev-list", "--parents", "-n", "1", revision)
      .trim()
      .split(" ")
      .slice(1);
  const baselinePaths = [
    ...controls,
    ...documents,
    c.harnessPath,
    "src/project-control.ts",
  ];
  const observedPaths = [
    ...new Set([...baselinePaths, ...Object.keys(c.implementationSeals)]),
  ];
  const blobs = (revision: string) => {
    const out = execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", "cat-file", "--batch"],
      {
        cwd,
        input:
          observedPaths.map((path) => revision + ":" + path).join("\n") + "\n",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    let offset = 0;
    const values = new Map<string, string>();
    for (const path of observedPaths) {
      const end = out.indexOf(10, offset),
        header = out.subarray(offset, end).toString("utf8");
      if (end >= offset && header === revision + ":" + path + " missing") {
        offset = end + 1;
        continue;
      }
      const match = /^([a-f0-9]{40}) blob (\d+)$/u.exec(header),
        length = Number(match?.[2]);
      if (
        end < offset ||
        !match ||
        !Number.isSafeInteger(length) ||
        length < 0 ||
        length > 16 * 1024 * 1024 ||
        out[end + 1 + length] !== 10
      )
        throw new Error("V45_BLOB_FRAME_INVALID");
      offset = end + 1;
      values.set(path, out.subarray(offset, offset + length).toString("utf8"));
      offset += length + 1;
    }
    if (offset !== out.length) throw new Error("V45_BLOB_TRAILING_DATA");
    return (path: string) => {
      const value = values.get(path);
      if (value === undefined) throw new Error("V45_BLOB_MISSING");
      return value;
    };
  };
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V45_FULL_HISTORY_REQUIRED");
  const gitDirectory = run("rev-parse", "--absolute-git-dir").trim();
  if (
    [
      "index.lock",
      "MERGE_HEAD",
      "CHERRY_PICK_HEAD",
      "REVERT_HEAD",
      "rebase-merge",
      "rebase-apply",
      "sequencer",
      "BISECT_LOG",
      "info/grafts",
    ].some((path) => existsSync(join(gitDirectory, path)))
  )
    throw new Error("V45_IN_PROGRESS_OR_GRAFT_STATE");
  if (run("for-each-ref", "--format=%(refname)", "refs/replace").trim())
    throw new Error("V45_REPLACEMENT_REFS_REJECTED");
  if (
    split(run("ls-files", "-v", "-z")).some((entry) => /^[a-zS] /u.test(entry))
  )
    throw new Error("V45_HIDDEN_INDEX_FLAGS_REJECTED");
  if (
    run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
    !isDeepStrictEqual(parents(c.baseline), [c.baseHead])
  )
    throw new Error("V45_BASELINE_IDENTITY_MISMATCH");
  const head = run("rev-parse", "HEAD").trim(),
    tree = run("rev-parse", "HEAD^{tree}").trim();
  let source = head;
  if (receipt) {
    if (
      receipt.pr !== c.pullRequest ||
      receipt.repository !== c.repository ||
      receipt.headBranch !== c.headBranch ||
      receipt.baseBranch !== c.baseBranch ||
      receipt.base !== c.baseHead ||
      receipt.merge !== head ||
      receipt.tree !== tree ||
      !sha(receipt.head) ||
      receipt.head === c.baseline ||
      !isDeepStrictEqual(parents(head), [c.baseHead, receipt.head]) ||
      run("rev-parse", receipt.head + "^{tree}").trim() !== tree
    )
      throw new Error("V45_PR_CONTEXT_IDENTITY_MISMATCH");
    source = receipt.head;
  }
  run("merge-base", "--is-ancestor", c.baseline, source);
  if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
    throw new Error("V45_SOURCE_MERGE_REJECTED");
  const clean =
    run("status", "--porcelain=v1", "--untracked-files=all").trim() === "";
  if (receipt && !clean) throw new Error("V45_PR_CHECKOUT_DIRTY");
  const revisions = lines(
    run("rev-list", "--reverse", c.baseline + ".." + source),
  );
  const changed = [
    ...new Set([
      ...split(run("diff", "--no-renames", "--name-only", "-z", c.baseline)),
      ...split(
        run(
          "diff",
          "--cached",
          "--no-renames",
          "--name-only",
          "-z",
          c.baseline,
        ),
      ),
      ...split(run("ls-files", "--others", "--exclude-standard", "-z")),
      ...revisions.flatMap((r) =>
        split(
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
  if (
    changed.some(
      (path) => !(V45_ALLOWED_PATHS as readonly string[]).includes(path),
    )
  )
    throw new Error("V45_PATH_OUTSIDE_SCOPE");
  for (const path of changed) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const stat = lstatSync(join(cwd, ...parts.slice(0, i)));
      if (i === parts.length ? !stat.isFile() : !stat.isDirectory())
        throw new Error("V45_NON_REGULAR_PATH");
    }
  }
  if (
    changed.length &&
    split(run("ls-files", "--stage", "-z", "--", ...changed)).some(
      (entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry),
    )
  )
    throw new Error("V45_NON_REGULAR_INDEX_PATH");
  for (const revision of revisions)
    if (
      split(run("ls-tree", "-r", "-z", revision, "--", ...changed)).some(
        (entry) => !/^(100644|100755) blob [a-f0-9]+\t/u.test(entry),
      )
    )
      throw new Error("V45_NON_REGULAR_HISTORY_PATH");
  const baseline = blobs(c.baseline);
  if (hash(baseline(c.harnessPath)) !== c.harnessSha256)
    throw new Error("V45_PRIOR_HARNESS_MISMATCH");
  const check = (
    read: (path: string) => string,
    permitBaseline: boolean,
    requireSealed: boolean,
  ) => {
    const r = object(JSON.parse(read(controls[0])));
    if (permitBaseline && r.version === c.supersedes) {
      for (const path of baselinePaths)
        if (read(path) !== baseline(path))
          throw new Error("V45_PARTIAL_BASELINE_INDEX_REJECTED");
      return;
    }
    const w = object(JSON.parse(read(controls[1]))),
      s = object(JSON.parse(read(controls[2]))),
      properties = object(s.properties);
    if (
      r.version !== c.version ||
      w.roadmapVersion !== c.version ||
      !isDeepStrictEqual(r.ownerDecision, {
        decisionId: c.ownerDecision,
        decidedAt: "2026-09-30",
        supersedes: c.supersedes,
      }) ||
      !isDeepStrictEqual(w.inspectorBatchV45, c) ||
      !Array.isArray(s.required) ||
      s.required.filter((key) => key === "inspectorBatchV45").length !== 1 ||
      !isDeepStrictEqual(properties.inspectorBatchV45, { const: c }) ||
      !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
    )
      throw new Error("V45_EXACT_TRANSITION_REQUIRED");
    projectV45ToV43(r, w, s);
    for (const [i, value] of [r, w, s].entries())
      if (!isDeepStrictEqual(value, JSON.parse(baseline(controls[i]!))))
        throw new Error("V45_INHERITED_CONTROL_DRIFT");
    for (const path of appendPaths)
      if (!read(path).startsWith(baseline(path)))
        throw new Error("V45_HISTORY_REWRITTEN");
    const header = "# MalisPang Project Control\n\n";
    if (
      !read("PROJECT_CONTROL.md").startsWith(header) ||
      !read("PROJECT_CONTROL.md").endsWith(
        baseline("PROJECT_CONTROL.md").slice(header.length),
      )
    )
      throw new Error("V45_CONTROL_HISTORY_REWRITTEN");
    if (hash(read(c.harnessPath)) !== c.harnessSha256)
      throw new Error("V45_FROZEN_HARNESS_DRIFT");
    const sealed = Object.values(c.implementationSeals).every(digest);
    if (requireSealed && !sealed)
      throw new Error("V45_MEASURED_IMPLEMENTATION_SEALS_REQUIRED");
    if (sealed)
      for (const [path, expected] of Object.entries(c.implementationSeals))
        if (hash(read(path)) !== expected)
          throw new Error("V45_IMPLEMENTATION_SEAL_MISMATCH:" + path);
  };
  check(
    (path) => readFileSync(join(cwd, path), "utf8"),
    false,
    source !== c.baseline,
  );
  check(blobs(""), true, source !== c.baseline);
  for (const revision of revisions) check(blobs(revision), false, true);
  return {
    mode: receipt
      ? "DRAFT_PR20_SYNTHETIC_MERGE"
      : source === c.baseline
        ? "LOCAL_REPAIR"
        : "SOURCE_COMMIT",
    head,
    tree,
    sourceHead: source,
    clean,
    remoteExecutionAuthorized: false as const,
    mergeAuthorized: false as const,
  };
}

export interface V45LocalReceipt {
  kind: "V45_LOCAL_QUALIFICATION";
  controlVersion: string;
  baseline: string;
  pullRequest: number;
  implementationSeals: Record<string, string>;
  measurement: "PAIRED_MEASURED_AND_REVIEWED";
  local: Omit<V43LocalReceipt, "kind">;
}
export interface V45PushReceipt {
  kind: "V45_EXISTING_DRAFT_PUSH";
  local: V45LocalReceipt;
  repository: string;
  pullRequest: number;
  headBranch: string;
  baseBranch: string;
  baseHead: string;
  publishedHead: string;
  state: "open";
  draft: true;
  merged: false;
  creationGrant: "CONSUMED_NO_NEW_PR";
  fastForwardFromPublishedHead: true;
  observedAt: string;
  checkedAt: string;
}
function localReceipt(
  e: unknown,
  action: "COMMIT" | "PUSH_BRANCH",
): e is V45LocalReceipt {
  if (
    !closed(e, [
      "kind",
      "controlVersion",
      "baseline",
      "pullRequest",
      "implementationSeals",
      "measurement",
      "local",
    ]) ||
    e.kind !== "V45_LOCAL_QUALIFICATION" ||
    e.controlVersion !== c.version ||
    e.baseline !== c.baseline ||
    e.pullRequest !== c.pullRequest ||
    !Object.values(c.implementationSeals).every(digest) ||
    !closed(e.implementationSeals, Object.keys(c.implementationSeals)) ||
    !isDeepStrictEqual(e.implementationSeals, c.implementationSeals) ||
    e.measurement !== "PAIRED_MEASURED_AND_REVIEWED" ||
    !e.local ||
    typeof e.local !== "object" ||
    Array.isArray(e.local) ||
    "kind" in e.local
  )
    return false;
  const local = e.local as Record<string, unknown>;
  return (
    closed(local, Object.keys(local)) &&
    local.head !== c.baseHead &&
    local.candidateParent !== c.baseHead &&
    (action !== "PUSH_BRANCH" || local.head !== c.baseline) &&
    evaluateV43Action(action, { ...local, kind: "V43_LOCAL_QUALIFICATION" })
      .allowed
  );
}
/** Receipt shape checks only: executor must authenticate actual Git, all checks,
 * source lineage, measured delta and GitHub readback independently before use. */
export function evaluateV45Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V45_SCOPED_LOCAL_REPAIR_ONLY" };
  if (action === "COMMIT")
    return {
      allowed: localReceipt(evidence, "COMMIT"),
      reason: "V45_EXACT_STAGED_MEASURED_REVIEWED_RECEIPT_REQUIRED",
    };
  if (action === "PUSH_BRANCH") {
    const now = Date.now();
    const valid =
      closed(evidence, [
        "kind",
        "local",
        "repository",
        "pullRequest",
        "headBranch",
        "baseBranch",
        "baseHead",
        "publishedHead",
        "state",
        "draft",
        "merged",
        "creationGrant",
        "fastForwardFromPublishedHead",
        "observedAt",
        "checkedAt",
      ]) &&
      evidence.kind === "V45_EXISTING_DRAFT_PUSH" &&
      localReceipt(evidence.local, "PUSH_BRANCH") &&
      evidence.repository === c.repository &&
      evidence.pullRequest === c.pullRequest &&
      evidence.headBranch === c.headBranch &&
      evidence.baseBranch === c.baseBranch &&
      evidence.baseHead === c.baseHead &&
      sha(evidence.publishedHead) &&
      evidence.publishedHead !== c.baseHead &&
      evidence.publishedHead !== evidence.local.local.head &&
      evidence.state === "open" &&
      evidence.draft === true &&
      evidence.merged === false &&
      evidence.creationGrant === c.creationGrant &&
      evidence.fastForwardFromPublishedHead === true &&
      typeof evidence.observedAt === "string" &&
      typeof evidence.checkedAt === "string" &&
      now >= Date.parse(evidence.checkedAt) &&
      Date.parse(evidence.checkedAt) >= Date.parse(evidence.observedAt) &&
      now - Date.parse(evidence.checkedAt) <= 120000 &&
      now - Date.parse(evidence.observedAt) <= 120000;
    return {
      allowed: valid,
      reason: "V45_FULL_EXACT_SOURCE_AND_FRESH_EXISTING_PR20_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V45_CREATION_CONSUMED_NO_READY_MERGE_REMOTE_OR_INHERITED_GRANT",
  };
}
