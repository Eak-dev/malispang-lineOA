import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { CI_HARNESS_REPAIR_V50 } from "./project-control-v50.js";

export const UAT_ROUND2_PREPARATION_V51 = {
  version: "2026.10.02-v51",
  ownerDecision: "MP-OD-2026-10-02-V51",
  supersedes: "2026.09.30-v50",
  baseline: "0774131ef334e09426203cd6aff92c59bbf52a52",
  baselineTree: "dfe6d6839fd07325f391a9ca66b8721f6f378ad6",
  baselineParent: "b1ca3a90c7a550f48c91d971b35dd9f148ce91e9",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-uat-round2-prep",
  sourceBranch: "codex/mp06-harness-v43",
  workId: "MP-06",
  githubIssue: 12,
  stage: "UAT_ROUND2_LOCAL_PREPARATION_ONLY",
  decisions: {
    isolation: "SEPARATE_WORKER_SCRIPT_MALISPANG_LINEOA_TEST_UAT2",
    stoppedStateGap:
      "PROCEDURAL_PER_CASE_GATE_NO_RUNTIME_CHANGE_SEPARATE_WORK_BEFORE_MP12",
    sequence:
      "V51_LOCAL_THEN_DEPLOY_THEN_SECRETS_THEN_WEBHOOK_THEN_R1_R2_R3_STOP_R4_EACH_SEPARATELY_APPROVED",
    webhookAfterUat: "REMAIN_ON_UAT2_PILOT_STOPPED_NEVER_BACK_TO_HELD_WORKER",
    historyInvestigation:
      "DEFERRED_PRESERVE_HELD_STORAGE_COUNTERS_ONLY_AFTER_ACCESS_REVIEW",
    issue12Closure:
      "ROUND2_FULL_PASS_AND_OWNER_ACCEPTED_RISK_RECORD_FOR_HISTORICAL_GAPS",
  },
  uatWorker: "malispang-lineoa-test-uat2",
  heldWorker: "malispang-lineoa-test",
  cases: "R1_R2_R3_STOP_R4_FINAL_FROM_EMPTY_STORAGE",
  runtime: "UNCHANGED_FROM_V50_BASELINE",
  implementationSeals: {
    "wrangler.jsonc":
      "79ffd50c0e82632698ba63bb69fda5d9570075d0b0bdcb4880d1619ff8db5e62",
    "src/mp-06-uat-round2-gate.ts":
      "012789dc1c81cb337311983cf3b44d4c1f65dcdafbc4814de8d6d12a23a7dd15",
    "worker-tests/mp-06-uat-round2.test.ts":
      "ca6ea8a2e0ea48f8ab2690aa24e609dfb1ffb95994644049c589f142d6726632",
    "docs/line-oa/mp-06/MP_06_UAT_ROUND2_RUNBOOK_TH.md":
      "9c00934d9e3545392121f4ea154a4ea8482688a3d5bf3d02a9fdf72331da2e7f",
    "tests/project-control-v50.test.ts":
      "1b591efc688641db0a86c115e44e3b0db80efcc00e8c0c5d211554dd51c53ecb",
  },
  historicalGaps:
    "U1_GAP_A1_A3_UNRESOLVED_BILLING_UNKNOWN_PENDING_TEMPLATE_CAUSE_UNKNOWN_UNCHANGED",
  publication: "ONE_COMMIT_PUSH_NEW_BRANCH_ONLY_NO_PULL_REQUEST",
  storageHold: "UNCHANGED_NO_READ_DEPLOY_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  deploy: false,
  secrets: false,
  lineWebhook: false,
  pullRequest: false,
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "DEPLOY_SECRET_LINE_WEBHOOK_HELD_STORAGE_SQL_PROVIDER_LIVE_PR_READY_MERGE_PRODUCTION_U2_ISSUE_CLOSE_RUNTIME_POLICY_KB_CATALOG_DEPENDENCY_CHANGE",
} as const;
const c = UAT_ROUND2_PREPARATION_V51;
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
export const V51_ALLOWED_PATHS = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v51.ts",
  "tests/project-control-v51.test.ts",
  ...Object.keys(c.implementationSeals),
] as const;
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V51_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV51ToV50(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: CI_HARNESS_REPAIR_V50.ownerDecision,
    decidedAt: "2026-09-30",
    supersedes: CI_HARNESS_REPAIR_V50.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.uatRound2PreparationV51;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "uatRound2PreparationV51",
    );
    const properties = object(s.properties);
    delete properties.uatRound2PreparationV51;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v51AuthoritySummary() {
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
    allowedPaths: V51_ALLOWED_PATHS,
    pullRequestAuthorized: false,
    readyAuthorized: false,
    mergeAuthorized: false,
    deployAuthorized: false,
    secretsAuthorized: false,
    lineWebhookAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
  } as const;
}
/** Receipt shape is never external approval. Commit and branch push need fresh
 * exact-source qualification; every remote TEST/LINE/provider action is denied. */
export function evaluateV51Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V51_SCOPED_LOCAL_PREPARATION" };
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
    e.kind === "V51_EXACT_SOURCE_QUALIFICATION" &&
    e.controlVersion === c.version &&
    e.baseline === c.baseline &&
    Object.values(c.implementationSeals).every(digest) &&
    isDeepStrictEqual(e.implementationSeals, c.implementationSeals) &&
    sha(e.head) &&
    sha(e.parent) &&
    e.parent === c.baseline &&
    sha(e.tree) &&
    e.tree === e.qualifiedTree &&
    digest(e.diffSha256) &&
    e.sourceStable === true &&
    e.indexStable === true &&
    e.workingTreeMatchesIndex === true &&
    e.audit === "ZERO_AT_EVERY_SEVERITY" &&
    e.auditTree === e.tree &&
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
      reason: "V51_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
    };
  if (action === "PUSH_BRANCH")
    return {
      allowed:
        source &&
        e.repository === c.repository &&
        e.remoteBranch === c.headBranch &&
        e.remoteBranchExisted === false &&
        e.pullRequest === null,
      reason: "V51_NEW_BRANCH_ONLY_NO_PULL_REQUEST",
    };
  return {
    allowed: false,
    reason: "V51_NO_DEPLOY_SECRET_WEBHOOK_REMOTE_PR_MERGE_OR_INHERITED_GRANT",
  };
}
/** Whole checkout/history allowlist plus exact inherited manifests and sealed
 * preparation files. Structural inspection, never publication authority. */
export function inspectV51Repository(cwd: string, git: string) {
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
      throw Error("V51_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V51_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V51_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V51_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V51_BASELINE_MISMATCH");
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
        throw Error("V51_REMOTE_MISMATCH");
    }
    const tree = run("rev-parse", "HEAD^{tree}").trim();
    const source = head;
    if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V51_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V51_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V51_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V51_STATUS_UNVERIFIED");
      return e.slice(3);
    });
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
      changed.some((p) => !(V51_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V51_PATH_OUTSIDE_SCOPE");
    for (const p of V51_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V51_NON_REGULAR_PATH");
      }
    }
    const baseline = new Map<string, Buffer>();
    for (const path of [...controls, ...appendPaths, "PROJECT_CONTROL.md"])
      baseline.set(path, Buffer.from(run("show", c.baseline + ":" + path)));
    const check = (read: (p: string) => Buffer) => {
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
        !isDeepStrictEqual(w.uatRound2PreparationV51, c) ||
        !isDeepStrictEqual(object(s.properties).uatRound2PreparationV51, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "uatRound2PreparationV51").length !== 1
      )
        throw Error("V51_EXACT_TRANSITION_REQUIRED");
      projectV51ToV50(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V51_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V51_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V51_CONTROL_HISTORY_REWRITTEN");
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if (hash(read(p)) !== seal)
          throw Error("V51_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)));
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V51_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V51_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)));
    }
    for (const rev of revisions) {
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V51_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V51_NON_REGULAR_HISTORY");
      check((p) => Buffer.from(run("show", rev + ":" + p)));
    }
    return {
      head,
      tree,
      sourceHead: source,
      clean: status === "",
      changedPaths: changed.sort(),
      mode: source === c.baseline ? "LOCAL_PREPARATION" : "SOURCE_COMMIT",
      publicationAuthorized: false,
      deployAuthorized: false,
      remoteExecutionAuthorized: false,
    };
  } finally {
    assertOperatorUnchanged();
  }
}
