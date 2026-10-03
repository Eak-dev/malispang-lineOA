import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { TIME_AWARE_EVIDENCE_V54 } from "./project-control-v54.js";
import {
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const TEST_NAMESPACE_RESET_V55 = {
  version: "2026.10.03-v55",
  ownerDecision: "MP-OD-2026-10-03-V55",
  supersedes: "2026.10.03-v54",
  technicalBase: "2026.10.03-v54",
  baseline: "47cf2f2c1c24ca365627ce515df30ed12fcea2f0",
  baselineTree: "f60f768b072750f0273138dd25edeee234a4f53b",
  baselineParent: "9e703552f1392d5107c90bf34a9f28eff8963414",
  publishedBaseline: "47cf2f2c1c24ca365627ce515df30ed12fcea2f0",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  workId: "MP-06",
  githubIssue: 12,
  stage: "TEST_NAMESPACE_RESET_LOCAL_IMPLEMENTATION_ONLY",
  pausedLineage: {
    versions: ["2026.10.02-v51", "2026.10.02-v52"],
    branch: "codex/mp06-uat-round2-prep",
    head: "d63d620820a4f1ea6f452e553724d34d16535a90",
    status: "PAUSED_FROZEN_NO_DEPLOY_NO_DELETE_NO_EDIT_REFERENCE_ONLY",
  },
  codexPlan: "RETIRE_OLD_UAT_PREPARE_FRESH_TEST_LOCALLY_NO_REMOTE_ACTION",
  evidencePolicy:
    "SANITIZED_SUMMARIES_AND_APPROVED_PREPUSH_PATCH_ONLY_NO_PII_RAW_CHAT_OR_REMOTE_ACCESS",
  rootCause: "SEPTEMBER_UNKNOWN_PERMANENT_HISTORICAL_GAPS_UNCHANGED",
  implementationSeals: {
    "tests/project-control-v54.test.ts":
      "0e6a9d7e7b6afb5632f6beaf0aabf8993e0dc8b953fb3704845a56e98bbb64b7",
    "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md":
      "1ceb96fc8ae1dcb469006c614872534df559633277cb6b2b0363c3da3d78cda8",
    "worker/index.ts":
      "640558da1a92e60d3ace3d00cd1f44a7bbd52f5aedb81662fd52bfbe3260d872",
    "worker/durable-objects.ts":
      "a859439445d75295572f0f561eb4407d41f49f94008fb992c56e778cf847ef9b",
    "wrangler.jsonc":
      "d529ceddee36678bb672ec88c49cd6c21a9e02f1c92a5f2ba184fa89b94d79d5",
    "worker-tests/mp-06-v55-fresh-baseline.test.ts":
      "44c0684c9fe3fb374aaadd103e909049d9469b462e9c248906a9cfd3f42967fe",
    "worker-configuration.d.ts":
      "1d0487801b1eb667f01ce1bccf541bbb6acd86b18acecbc54fc916d73a184def",
  },
  publication: "NOT_AUTHORIZED_LOCAL_ONLY_CLAUDE_VERIFY_BEFORE_ANY_FUTURE_PUSH",
  storageHold: "UNCHANGED_NO_READ_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  deploy: false,
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "COMMIT_PUSH_DEPLOY_SECRET_WEBHOOK_PILOT_UAT_REMOTE_STORAGE_SQL_DATA_STUDIO_PROVIDER_HOLD_BYPASS_POLICY_KB_CATALOG_MODEL_PROMPT_SCHEMA_THRESHOLD_DEPENDENCY_WORKFLOW_PAUSED_LINEAGE_PRODUCTION",
  prePushReview:
    "PR20_COMPLETE_LOCAL_PATCH_REVIEW_REQUIRED_NOT_PUBLICATION_AUTHORITY",
  postPushReview: "ONLY_AFTER_SEPARATE_PUBLICATION_AUTHORITY",
  nextBaseline: "FRESH_TEST_UAT_REQUIRES_SEPARATE_DECISION",
  retiredLineage: {
    WP8F: "RETIRED",
    v16: "RETIRED",
    v22: "RETIRED_UNUSED_NO_REISSUE",
  },
  ownerFacts: {
    testOnlyOwner: true,
    testDataDisposable: true,
    production: "NO_GO_NOT_TOUCHED",
  },
  localScope:
    "V2_EXPORT_ALIASES_FOUR_CLASSES_DELETED_CONFIG_SELECT_ONLY_OBSERVATION_DENIED_RESUME_NO_DDL",
  destruction: "NOT_EXECUTED_DEPLOY_FORBIDDEN_IRREVERSIBLE_IF_LATER_AUTHORIZED",
  historicalGaps: "U1_GAP_A1_A3_UNRESOLVED_BILLING_UNKNOWN_NOT_PASS",
  commit: false,
  push: false,
} as const;
const c = TEST_NAMESPACE_RESET_V55;
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
export const V55_ALLOWED_PATHS = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v55.ts",
  "tests/project-control-v55.test.ts",
  ...Object.keys(c.implementationSeals),
] as const;
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V55_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV55ToV54(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.technicalBase;
  r.ownerDecision = {
    decisionId: TIME_AWARE_EVIDENCE_V54.ownerDecision,
    decidedAt: "2026-10-03",
    supersedes: TIME_AWARE_EVIDENCE_V54.supersedes,
  };
  // Project exactly to immutable published v54; paused v51/v52 stay untouched.
  w.roadmapVersion = c.technicalBase;
  delete w.testResetV55;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "testResetV55",
    );
    const properties = object(s.properties);
    delete properties.testResetV55;
    properties.roadmapVersion = { const: c.technicalBase };
  }
}
export function v55AuthoritySummary() {
  return {
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    status: c.stage,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: [],
    allowedPaths: V55_ALLOWED_PATHS,
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
export function evaluateV55Action(action: string, _evidence?: unknown) {
  // No receipt can grant publication or remote actions in this local-only phase.
  void _evidence;
  return [
    "LOCAL_IMPLEMENTATION",
    "LOCAL_VALIDATION",
    "LOCAL_ANALYSIS",
  ].includes(action)
    ? { allowed: true, reason: "V55_LOCAL_ONLY_NO_REMOTE_OR_PUBLICATION" }
    : { allowed: false, reason: "V55_NO_INHERITED_GRANT_V22_RETIRED_UNUSED" };
}
export function validateV55PullRequestReceipt(
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
export function inspectV55Repository(
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
      throw Error("V55_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V55_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V55_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V55_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V55_BASELINE_MISMATCH");
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
        throw Error("V55_REMOTE_MISMATCH");
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
        throw Error("V55_PR_IDENTITY_MISMATCH");
      source = receipt.head;
    } else if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V55_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V55_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V55_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V55_STATUS_UNVERIFIED");
      return e.slice(3);
    });
    if (receipt && status) throw Error("V55_PR_DIRTY");
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
      changed.some((p) => !(V55_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V55_PATH_OUTSIDE_SCOPE");
    for (const p of V55_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V55_NON_REGULAR_PATH");
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
          decidedAt: "2026-10-03",
          supersedes: c.supersedes,
        }) ||
        !isDeepStrictEqual(w.testResetV55, c) ||
        !isDeepStrictEqual(object(s.properties).testResetV55, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "testResetV55").length !== 1
      )
        throw Error("V55_EXACT_TRANSITION_REQUIRED");
      projectV55ToV54(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V55_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V55_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V55_CONTROL_HISTORY_REWRITTEN");
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if ((committed || String(seal) !== "PENDING") && hash(read(p)) !== seal)
          throw Error("V55_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)), source !== c.baseline);
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V55_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V55_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)), source !== c.baseline);
    }
    for (const rev of revisions) {
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V55_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V55_NON_REGULAR_HISTORY");
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
