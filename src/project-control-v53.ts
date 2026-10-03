import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { CI_HARNESS_REPAIR_V50 } from "./project-control-v50.js";
import {
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const RESUME_CODEX_PLAN_V53 = {
  version: "2026.10.02-v53",
  ownerDecision: "MP-OD-2026-10-02-V53",
  supersedes: "2026.10.02-v52",
  technicalBase: "2026.09.30-v50",
  baseline: "0774131ef334e09426203cd6aff92c59bbf52a52",
  baselineTree: "dfe6d6839fd07325f391a9ca66b8721f6f378ad6",
  baselineParent: "b1ca3a90c7a550f48c91d971b35dd9f148ce91e9",
  publishedBaseline: "0774131ef334e09426203cd6aff92c59bbf52a52",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  workId: "MP-06",
  githubIssue: 12,
  stage: "RESUME_CODEX_PLAN_STEP_A_NON_INVASIVE_EVIDENCE_AND_HANDOFF_ONLY",
  pausedLineage: {
    versions: ["2026.10.02-v51", "2026.10.02-v52"],
    branch: "codex/mp06-uat-round2-prep",
    head: "d63d620820a4f1ea6f452e553724d34d16535a90",
    status: "PAUSED_FROZEN_NO_DEPLOY_NO_DELETE_NO_EDIT_REFERENCE_ONLY",
  },
  codexPlan:
    "A_NON_INVASIVE_EVIDENCE_CURRENT_B_DRAFT_DOCUMENT_ONLY_C_D_E_NOT_AUTHORIZED",
  evidencePolicy:
    "OWNER_PROVIDED_LINE_CHAT_AUDIT_LOG_METRICS_SUMMARY_ONLY_NO_PII_COMMIT",
  rootCause: "UNKNOWN_CODE_PATH_POSSIBLE_NOT_PROVEN",
  implementationSeals: {
    "tests/project-control-v50.test.ts":
      "1b591efc688641db0a86c115e44e3b0db80efcc00e8c0c5d211554dd51c53ecb",
    "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md":
      "714d97e5fd8043f8383fd4d98decd69db73625cf41c9f654091d1d16b6e6c647",
  },
  publication:
    "EXISTING_DRAFT_PR20_ONLY_ONE_CHILD_COMMIT_FULL_GATES_AUDIT0_FRESH_PR_READBACK",
  storageHold: "UNCHANGED_NO_READ_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  deploy: false,
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "DEPLOY_SECRET_LINE_WEBHOOK_PILOT_STORAGE_SQL_DATA_STUDIO_PROVIDER_LIVE_NEW_PR_READY_MERGE_U2_ISSUE_CLOSE_RUNTIME_POLICY_KB_CATALOG_DEPENDENCY_PAUSED_LINEAGE_CHANGE_PRODUCTION",
} as const;
const c = RESUME_CODEX_PLAN_V53;
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
export const V53_ALLOWED_PATHS = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v53.ts",
  "tests/project-control-v53.test.ts",
  ...Object.keys(c.implementationSeals),
] as const;
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V53_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV53ToV50(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.technicalBase;
  r.ownerDecision = {
    decisionId: CI_HARNESS_REPAIR_V50.ownerDecision,
    decidedAt: "2026-09-30",
    supersedes: CI_HARNESS_REPAIR_V50.supersedes,
  };
  // Technical base on this branch is v50; v51/v52 live on the paused branch.
  w.roadmapVersion = c.technicalBase;
  delete w.resumeCodexPlanV53;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "resumeCodexPlanV53",
    );
    const properties = object(s.properties);
    delete properties.resumeCodexPlanV53;
    properties.roadmapVersion = { const: c.technicalBase };
  }
}
export function v53AuthoritySummary() {
  return {
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    status: c.stage,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: ["COMMIT", "PUSH_BRANCH"],
    allowedPaths: V53_ALLOWED_PATHS,
    pullRequest: 20,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
  } as const;
}
/** Receipt shape is never external approval. Authenticate exact Git, full tests,
 * audit, independent review and current GitHub identity before any invocation. */
export function evaluateV53Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V53_SCOPED_LOCAL_EVIDENCE_AND_HANDOFF" };
  const plain = (value: unknown): value is Record<string, unknown> =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(
      Object.getPrototypeOf(value) as object | null,
    ) &&
    Reflect.ownKeys(value).every(
      (key) => "value" in Object.getOwnPropertyDescriptor(value, key)!,
    );
  const e = plain(evidence) ? evidence : {};
  const sha = (v: unknown) =>
    typeof v === "string" && /^[a-f0-9]{40}$/u.test(v);
  const digest = (v: unknown) =>
    typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
  const source =
    ["COMMIT", "PUSH_BRANCH"].includes(action) &&
    e.kind === "V53_EXACT_SOURCE_QUALIFICATION" &&
    e.controlVersion === c.version &&
    e.baseline === c.baseline &&
    Object.values(c.implementationSeals).every(digest) &&
    isDeepStrictEqual(e.implementationSeals, c.implementationSeals) &&
    sha(e.head) &&
    sha(e.parent) &&
    e.parent === c.baseline &&
    sha(e.tree) &&
    e.tree === e.qualifiedTree &&
    e.tree === e.reviewedTree &&
    digest(e.diffSha256) &&
    e.diffSha256 === e.reviewedDiffSha256 &&
    e.baselineAncestor === true &&
    e.sourceStable === true &&
    e.indexStable === true &&
    e.workingTreeMatchesIndex === true &&
    e.audit === "ZERO_AT_EVERY_SEVERITY" &&
    e.auditTree === e.tree &&
    e.review === "NO_ACTIONABLE_FINDINGS" &&
    (action === "COMMIT"
      ? e.stage === "PRE_COMMIT" &&
        e.validation === "FOCUSED_PASS" &&
        e.head === c.baseline
      : e.stage === "POST_COMMIT" &&
        e.validation === "FULL_PASS" &&
        e.clean === true &&
        e.head !== c.baseline);
  if (action === "COMMIT")
    return {
      allowed: source,
      reason: "V53_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
    };
  if (action === "PUSH_BRANCH") {
    const p = plain(e.pr) ? e.pr : {};
    const start =
      typeof p.observedAt === "string" ? Date.parse(p.observedAt) : NaN;
    return {
      allowed:
        source &&
        p.repository === c.repository &&
        p.number === c.pullRequest &&
        p.headBranch === c.headBranch &&
        p.baseBranch === c.baseBranch &&
        p.base === c.baseHead &&
        p.head === c.publishedBaseline &&
        p.fastForward === true &&
        p.state === "open" &&
        p.draft === true &&
        p.merged === false &&
        start <= Date.now() &&
        Date.now() - start <= 120000,
      reason: "V53_FULL_EXACT_SOURCE_AND_FRESH_PR20_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V53_NO_MERGE_DEPLOY_REMOTE_OR_INHERITED_GRANT",
  };
}
export function validateV53PullRequestReceipt(
  event: unknown,
  observed: V43CheckoutReceipt,
) {
  const receipt = validateV43PullRequestReceipt(event, observed);
  return receipt?.pr === c.pullRequest &&
    receipt.head !== c.baseline &&
    (event as { pull_request: { merged: unknown } }).pull_request.merged ===
      false
    ? receipt
    : null;
}
/** Whole checkout/history allowlist plus exact inherited manifests and sealed
 * test repairs. This is structural inspection, never publication authority. */
export function inspectV53Repository(
  cwd: string,
  git: string,
  receipt?: V43PrReceipt,
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
  const split = (v: string) => v.split("\0").filter(Boolean);
  const lines = (v: string) => v.trim().split("\n").filter(Boolean);
  const directory = run("rev-parse", "--absolute-git-dir").trim();
  const indexPath = join(directory, "index"),
    initial = readFileSync(indexPath),
    head = run("rev-parse", "HEAD").trim();
  const parents = (rev: string) =>
    run("rev-list", "--parents", "-n", "1", rev).trim().split(" ").slice(1);
  const assertOperatorUnchanged = () => {
    if (
      !readFileSync(indexPath).equals(initial) ||
      run("rev-parse", "HEAD").trim() !== head ||
      existsSync(indexPath + ".lock")
    )
      throw Error("V53_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V53_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      ].some((p) => existsSync(join(directory, p)))
    )
      throw Error("V53_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V53_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V53_BASELINE_MISMATCH");
    const urls = [
      "https://github.com/" + c.repository + ".git",
      "https://github.com/" + c.repository,
      "git@github.com:" + c.repository + ".git",
      "ssh://git@github.com/" + c.repository + ".git",
    ];
    for (const args of [
      ["remote", "get-url", "--all", "origin"],
      ["remote", "get-url", "--push", "--all", "origin"],
    ]) {
      const actual = lines(run(...args));
      if (actual.length !== 1 || !urls.includes(actual[0]!))
        throw Error("V53_REMOTE_MISMATCH");
    }
    const tree = run("rev-parse", "HEAD^{tree}").trim();
    let source = head;
    if (receipt) {
      if (
        receipt.pr !== c.pullRequest ||
        receipt.repository !== c.repository ||
        receipt.base !== c.baseHead ||
        receipt.headBranch !== c.headBranch ||
        receipt.baseBranch !== c.baseBranch ||
        receipt.merge !== head ||
        receipt.tree !== tree ||
        !isDeepStrictEqual(parents(head), [c.baseHead, receipt.head]) ||
        run("rev-parse", receipt.head + "^{tree}").trim() !== tree
      )
        throw Error("V53_PR_IDENTITY_MISMATCH");
      source = receipt.head;
    } else if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V53_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V53_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V53_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
    const status = run(
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
      "--ignore-submodules=none",
    );
    const statusPaths = split(status).map((e) => {
      if (e[2] !== " " || !/^(\?\?|[ MADT]{2})$/u.test(e.slice(0, 2)))
        throw Error("V53_STATUS_UNVERIFIED");
      return e.slice(3);
    });
    if (receipt && status) throw Error("V53_PR_DIRTY");
    const revisions = lines(
      run("rev-list", "--reverse", c.baseline + ".." + source),
    );
    const staged = split(
      run("diff", "--cached", "--no-renames", "--name-only", "-z", c.baseline),
    );
    const changed = [
      ...new Set([
        ...statusPaths,
        ...staged,
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
      changed.some((p) => !(V53_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V53_PATH_OUTSIDE_SCOPE");
    for (const p of V53_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V53_NON_REGULAR_PATH");
      }
    }
    const baseline = new Map<string, Buffer>();
    for (const path of [...controls, ...appendPaths, "PROJECT_CONTROL.md"])
      baseline.set(path, Buffer.from(run("show", c.baseline + ":" + path)));
    const check = (read: (p: string) => Buffer, committed: boolean) => {
      const r = object(JSON.parse(read(controls[0]).toString())),
        w = object(JSON.parse(read(controls[1]).toString())),
        s = object(JSON.parse(read(controls[2]).toString()));
      if (
        r.version !== c.version ||
        w.roadmapVersion !== c.version ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: c.ownerDecision,
          decidedAt: "2026-10-02",
          supersedes: c.supersedes,
        }) ||
        !isDeepStrictEqual(w.resumeCodexPlanV53, c) ||
        !isDeepStrictEqual(object(s.properties).resumeCodexPlanV53, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "resumeCodexPlanV53").length !== 1
      )
        throw Error("V53_EXACT_TRANSITION_REQUIRED");
      projectV53ToV50(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V53_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V53_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V53_CONTROL_HISTORY_REWRITTEN");
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if ((committed || String(seal) !== "PENDING") && hash(read(p)) !== seal)
          throw Error("V53_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)), source !== c.baseline);
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V53_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V53_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)), source !== c.baseline);
    }
    for (const rev of revisions) {
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V53_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V53_NON_REGULAR_HISTORY");
      check((p) => Buffer.from(run("show", rev + ":" + p)), true);
    }
    return {
      head,
      tree,
      sourceHead: source,
      clean: status === "",
      changedPaths: changed.sort(),
      mode: receipt
        ? "DRAFT_PR20_SYNTHETIC_MERGE"
        : source === c.baseline
          ? "LOCAL_PREPARATION"
          : "SOURCE_COMMIT",
      publicationAuthorized: false,
      mergeAuthorized: false,
      remoteExecutionAuthorized: false,
    };
  } finally {
    assertOperatorUnchanged();
  }
}
