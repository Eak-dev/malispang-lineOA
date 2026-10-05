import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { KNOWLEDGE_PUBLICATION_V47 } from "./project-control-v47.js";
import {
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const CI_HARNESS_REPAIR_V48 = {
  version: "2026.09.30-v48",
  ownerDecision: "MP-OD-2026-09-30-V48",
  supersedes: "2026.09.30-v47.1",
  baseline: "5317849ec325bf3b18fc27d2efe902e0b3147742",
  baselineTree: "acc2c304da576d05b225761209de1a6ca41915d9",
  baselineParent: "86e5c967dd29e669ee0bc66e594fc9636a188c4e",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  workId: "MP-06",
  githubIssue: 12,
  stage: "HISTORICAL_TEST_ENVIRONMENT_AND_GIT_LATENCY_REPAIR_ONLY",
  failedRun: 36672983371,
  priorPublication: "CONSUMED_PRESERVE_V47_1_AND_ALL_FAILURE_EVIDENCE",
  watchdogMs: 5000,
  retries: 0,
  invariants:
    "PRESERVE_ASSERTIONS_PR_IDENTITY_RAW_INDEX_OPERATOR_ISOLATION_AWAITED_CLEANUP",
  measurement: "MEASURE_BEFORE_AFTER_NO_HOSTED_CAUSE_CLAIM_WITHOUT_EVIDENCE",
  implementationSeals: {
    "tests/project-control-v45.test.ts":
      "d8d7951898ce50caf1f0e15cb64db1405108379089f16bc793d6f996aae7faf8",
    "tests/project-control-v47.test.ts":
      "28b16f74a2cc7a11909035e38319bee2a7d30aeb49153cac89e453489828b06c",
    "tests/project-control-v40.test.ts":
      "59f0acc4c0a005073855127798420c0dd6e2984202cbc6bcd0ab28957a9a5b33",
    "tests/project-control-v43.test.ts":
      "18a90b5eb82723ad5e06eb6b8c2696dee95f290e357c1e25c145391fe144faa8",
    "tests/project-control.test.ts":
      "84fc4c87c5da97a5115db607970d3c9a3ca2a56f8094ceea326e49f760889b68",
    "tests/helpers/historical-environment.ts":
      "90f05ea8ac4a1646aef3ced5f9149c8ca0ef4bda34a549a5602c1a0fc0ebf02f",
    "tests/historical-environment.test.ts":
      "c5fa300207d546d73e229fdc7e3539ef8e4a21371693ca03d9efaeee7e7c8452",
  },
  sourceLineage:
    "ONE_REPAIR_CHILD_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL_WITHIN_APPROVED_SCOPE",
  publication:
    "EXISTING_DRAFT_PR20_ONLY_EXACT_SOURCE_FULL_GATES_AUDIT0_REVIEW_FRESH_PR_READBACK",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "NEW_PR_READY_MERGE_DEPLOY_REMOTE_TEST_STORAGE_SQL_LINE_PROVIDER_PRODUCTION_U2_ISSUE_CLOSE_TIMEOUT_INCREASE_RETRY_ASSERTION_REMOVAL",
} as const;
const c = CI_HARNESS_REPAIR_V48;
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
export const V48_ALLOWED_PATHS = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v48.ts",
  "tests/project-control-v48.test.ts",
  ...Object.keys(c.implementationSeals),
] as const;
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V48_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV48ToV47(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: KNOWLEDGE_PUBLICATION_V47.ownerDecision,
    decidedAt: "2026-09-30",
    supersedes: KNOWLEDGE_PUBLICATION_V47.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.ciHarnessRepairV48;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "ciHarnessRepairV48",
    );
    const properties = object(s.properties);
    delete properties.ciHarnessRepairV48;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v48AuthoritySummary() {
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
    allowedPaths: V48_ALLOWED_PATHS,
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
export function evaluateV48Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V48_SCOPED_LOCAL_REPAIR" };
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
    e.kind === "V48_EXACT_SOURCE_QUALIFICATION" &&
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
      reason: "V48_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
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
        p.head === c.baseline &&
        p.fastForward === true &&
        p.state === "open" &&
        p.draft === true &&
        p.merged === false &&
        start <= Date.now() &&
        Date.now() - start <= 120000,
      reason: "V48_FULL_EXACT_SOURCE_AND_FRESH_PR20_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V48_NO_MERGE_DEPLOY_REMOTE_OR_INHERITED_GRANT",
  };
}
export function validateV48PullRequestReceipt(
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
export function inspectV48Repository(
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
      throw Error("V48_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V48_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V48_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V48_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V48_BASELINE_MISMATCH");
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
        throw Error("V48_REMOTE_MISMATCH");
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
        throw Error("V48_PR_IDENTITY_MISMATCH");
      source = receipt.head;
    } else if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V48_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V48_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V48_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V48_STATUS_UNVERIFIED");
      return e.slice(3);
    });
    if (receipt && status) throw Error("V48_PR_DIRTY");
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
      changed.some((p) => !(V48_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V48_PATH_OUTSIDE_SCOPE");
    for (const p of V48_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V48_NON_REGULAR_PATH");
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
          decidedAt: "2026-09-30",
          supersedes: c.supersedes,
        }) ||
        !isDeepStrictEqual(w.ciHarnessRepairV48, c) ||
        !isDeepStrictEqual(object(s.properties).ciHarnessRepairV48, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "ciHarnessRepairV48").length !== 1
      )
        throw Error("V48_EXACT_TRANSITION_REQUIRED");
      projectV48ToV47(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V48_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V48_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V48_CONTROL_HISTORY_REWRITTEN");
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if ((committed || String(seal) !== "PENDING") && hash(read(p)) !== seal)
          throw Error("V48_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)), source !== c.baseline);
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V48_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V48_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)), source !== c.baseline);
    }
    for (const rev of revisions) {
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V48_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V48_NON_REGULAR_HISTORY");
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
          ? "LOCAL_REPAIR"
          : "SOURCE_COMMIT",
      publicationAuthorized: false,
      mergeAuthorized: false,
      remoteExecutionAuthorized: false,
    };
  } finally {
    assertOperatorUnchanged();
  }
}
