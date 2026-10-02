import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { UAT_ROUND2_PREPARATION_V51 } from "./project-control-v51.js";

export const UAT2_DEPLOY_V52 = {
  version: "2026.10.02-v52",
  ownerDecision: "MP-OD-2026-10-02-V52",
  supersedes: "2026.10.02-v51",
  baseline: "8343581c83d86da01183cf3a333449acfecb6a5d",
  baselineTree: "5998eea38c883f8b561bed04dc314c227c84cf77",
  baselineParent: "0774131ef334e09426203cd6aff92c59bbf52a52",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-uat-round2-prep",
  workId: "MP-06",
  githubIssue: 12,
  stage: "UAT2_SINGLE_OWNER_MAC_DEPLOY_ONLY",
  deployment: {
    worker: "malispang-lineoa-test-uat2",
    wranglerEnv: "uat2",
    account: "c395a1bc15b7c95267173de5ccd6407d",
    executor: "OWNER_MAC_AUTHENTICATED_WRANGLER",
    command: "pnpm exec wrangler deploy --env uat2 --minify",
    source: "V52_SOURCE_COMMIT_ON_HEAD_BRANCH_CLEAN_FROZEN_INSTALL",
    maximumDeployments: 1,
    preCheck: "COMMIT_CLEAN_ACCOUNT_MATCH_UAT2_WORKER_ABSENT_DRY_RUN",
    postCheck:
      "HEALTH_200_OTHER_ROUTES_503_NO_SECRETS_HELD_WORKER_AND_WEBHOOK_UNCHANGED",
    ambiguousOutcome: "CONSUMED_NO_RETRY_REPORT_TO_DEV",
    secretsFile: false,
  },
  secretsGap:
    "UAT2_SECRETS_REQUIRED_REMOVED_RUNTIME_FAILS_CLOSED_503_UNTIL_STEP_C",
  heldWorker: "malispang-lineoa-test",
  runtime: "UNCHANGED_FROM_V50_BASELINE",
  implementationSeals: {
    "wrangler.jsonc":
      "56468b0292623a819b754240810aa63178f3308492d4a28d15597035a623ab16",
    "worker-tests/mp-06-uat-round2.test.ts":
      "955efe93607dcacdbaa56a33a0f48238b76f0a2acad75c698a42ed3a899f6f0d",
    "docs/line-oa/mp-06/MP_06_UAT_ROUND2_RUNBOOK_TH.md":
      "8273971df386594c1191d129ddab8e5a416606ee3e88886212f81a6c6b461206",
    "tests/project-control-v51.test.ts":
      "06fd4dcb0fcda488beb1d06c3d32538ad9b1189175007fe6e0194c841ac54565",
  },
  historicalGaps:
    "U1_GAP_A1_A3_UNRESOLVED_BILLING_UNKNOWN_PENDING_TEMPLATE_CAUSE_UNKNOWN_UNCHANGED",
  publication: "ONE_COMMIT_FAST_FORWARD_PUSH_EXISTING_BRANCH_NO_PULL_REQUEST",
  storageHold: "UNCHANGED_NO_READ_DEPLOY_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  deploy: true,
  secrets: false,
  lineWebhook: false,
  pilotActivation: false,
  pullRequest: false,
  ready: false,
  merge: false,
  production: false,
  forbidden:
    "HELD_WORKER_DEPLOY_SECOND_DEPLOY_SECRETS_FILE_SECRET_PUT_LINE_WEBHOOK_PILOT_HELD_STORAGE_SQL_PROVIDER_LIVE_PR_READY_MERGE_PRODUCTION_U2_ISSUE_CLOSE_RUNTIME_CHANGE",
} as const;
const c = UAT2_DEPLOY_V52;
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
export const V52_ALLOWED_PATHS = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v52.ts",
  "tests/project-control-v52.test.ts",
  ...Object.keys(c.implementationSeals),
] as const;
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V52_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV52ToV51(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: UAT_ROUND2_PREPARATION_V51.ownerDecision,
    decidedAt: "2026-10-02",
    supersedes: UAT_ROUND2_PREPARATION_V51.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.uat2DeployV52;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "uat2DeployV52",
    );
    const properties = object(s.properties);
    delete properties.uat2DeployV52;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v52AuthoritySummary() {
  return {
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    status: c.stage,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: ["COMMIT", "PUSH_BRANCH", "DEPLOY_UAT2"],
    allowedPaths: V52_ALLOWED_PATHS,
    pullRequestAuthorized: false,
    readyAuthorized: false,
    mergeAuthorized: false,
    deployAuthorized: "ONE_OWNER_MAC_DEPLOY_UAT2_ONLY",
    secretsAuthorized: false,
    lineWebhookAuthorized: false,
    pilotActivationAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
  } as const;
}
/** Receipt shape is never external approval. Commit and branch push need fresh
 * exact-source qualification; the single uat2 deploy needs the Owner pre-check
 * receipt; every other remote TEST/LINE/provider action is denied. */
export function evaluateV52Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V52_SCOPED_LOCAL_DEPLOY_PREPARATION" };
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
    e.kind === "V52_EXACT_SOURCE_QUALIFICATION" &&
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
      reason: "V52_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
    };
  if (action === "PUSH_BRANCH")
    return {
      allowed:
        source &&
        e.repository === c.repository &&
        e.remoteBranch === c.headBranch &&
        e.remoteHead === c.baseline &&
        e.fastForward === true &&
        e.pullRequest === null,
      reason: "V52_FAST_FORWARD_EXISTING_BRANCH_NO_PULL_REQUEST",
    };
  if (action === "DEPLOY_UAT2") {
    // Owner runs this once on their Mac; the receipt only records that the
    // exact pre-checks held. It never authorizes secrets, webhook or pilot.
    const d = c.deployment;
    return {
      allowed:
        e.kind === "V52_OWNER_MAC_DEPLOY_PRECHECK" &&
        e.executor === "OWNER" &&
        sha(e.sourceCommit) &&
        e.sourceParent === c.baseline &&
        e.branch === c.headBranch &&
        e.clean === true &&
        e.frozenInstall === true &&
        e.controlVersion === c.version &&
        e.account === d.account &&
        e.worker === d.worker &&
        e.wranglerEnv === d.wranglerEnv &&
        e.command === d.command &&
        e.workerAbsent === true &&
        e.dryRun === "PASS" &&
        e.deploymentsUsed === 0 &&
        e.secretsFile === false,
      reason: "V52_ONE_OWNER_MAC_UAT2_DEPLOY_EXACT_PRECHECK_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason:
      "V52_NO_SECRET_WEBHOOK_PILOT_HELD_WORKER_PR_MERGE_OR_INHERITED_GRANT",
  };
}
/** Whole checkout/history allowlist plus exact inherited manifests and sealed
 * preparation files. Structural inspection, never publication authority. */
export function inspectV52Repository(cwd: string, git: string) {
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
      throw Error("V52_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V52_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V52_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V52_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V52_BASELINE_MISMATCH");
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
        throw Error("V52_REMOTE_MISMATCH");
    }
    const tree = run("rev-parse", "HEAD^{tree}").trim();
    const source = head;
    if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V52_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V52_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V52_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V52_STATUS_UNVERIFIED");
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
      changed.some((p) => !(V52_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V52_PATH_OUTSIDE_SCOPE");
    for (const p of V52_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V52_NON_REGULAR_PATH");
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
        !isDeepStrictEqual(w.uat2DeployV52, c) ||
        !isDeepStrictEqual(object(s.properties).uat2DeployV52, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "uat2DeployV52").length !== 1
      )
        throw Error("V52_EXACT_TRANSITION_REQUIRED");
      projectV52ToV51(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V52_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V52_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V52_CONTROL_HISTORY_REWRITTEN");
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if (hash(read(p)) !== seal)
          throw Error("V52_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)));
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V52_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V52_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)));
    }
    for (const rev of revisions) {
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V52_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V52_NON_REGULAR_HISTORY");
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
