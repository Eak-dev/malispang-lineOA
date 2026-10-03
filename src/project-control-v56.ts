import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  TEST_NAMESPACE_RESET_V55,
  projectV55ToV54,
  V55_ALLOWED_PATHS,
} from "./project-control-v55.js";
import {
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const REVIEWED_V55_PUBLICATION_V56 = {
  version: "2026.10.04-v56",
  ownerDecision: "MP-OD-2026-10-04-V56",
  supersedes: "2026.10.03-v55",
  technicalBase: "2026.10.03-v55",
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
  stage: "REVIEWED_V55_EXISTING_DRAFT_PR20_PUBLICATION_ONLY",
  pausedLineage: {
    versions: ["2026.10.02-v51", "2026.10.02-v52"],
    branch: "codex/mp06-uat-round2-prep",
    head: "d63d620820a4f1ea6f452e553724d34d16535a90",
    status: "PAUSED_FROZEN_NO_DEPLOY_NO_DELETE_NO_EDIT_REFERENCE_ONLY",
  },
  codexPlan:
    "PUBLISH_FROZEN_V55_PLUS_V56_ONE_CHILD_NO_DEPLOY_RESET_OR_LIVE_UAT",
  evidencePolicy:
    "SANITIZED_SUMMARIES_AND_APPROVED_PREPUSH_PATCH_ONLY_NO_PII_RAW_CHAT_OR_REMOTE_ACCESS",
  rootCause: "SEPTEMBER_UNKNOWN_PERMANENT_HISTORICAL_GAPS_UNCHANGED",
  implementationSeals: {
    "src/project-control-v55.ts":
      "ee425a2ba08662c2666831c1c6c0819bd6bdca7240bdea4b1f9ed5bbd33d0598",
    "tests/project-control-v54.test.ts":
      "0e6a9d7e7b6afb5632f6beaf0aabf8993e0dc8b953fb3704845a56e98bbb64b7",
    "worker-configuration.d.ts":
      "1d0487801b1eb667f01ce1bccf541bbb6acd86b18acecbc54fc916d73a184def",
    "worker-tests/mp-06-v55-fresh-baseline.test.ts":
      "44c0684c9fe3fb374aaadd103e909049d9469b462e9c248906a9cfd3f42967fe",
    "worker/durable-objects.ts":
      "a859439445d75295572f0f561eb4407d41f49f94008fb992c56e778cf847ef9b",
    "worker/index.ts":
      "640558da1a92e60d3ace3d00cd1f44a7bbd52f5aedb81662fd52bfbe3260d872",
    "wrangler.jsonc":
      "d529ceddee36678bb672ec88c49cd6c21a9e02f1c92a5f2ba184fa89b94d79d5",
  },
  publication:
    "ONE_CHILD_FULL_GATES_CLAUDE_STAGED_REVIEW_COMMIT_EXACT_COMMIT_REVIEW_NORMAL_PUSH_CI",
  storageHold: "UNCHANGED_NO_READ_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  deploy: false,
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "DEPLOY_RESET_SECRET_WEBHOOK_PILOT_UAT_REMOTE_STORAGE_SQL_DATA_STUDIO_PROVIDER_HOLD_BYPASS_RUNTIME_POLICY_KB_CATALOG_MODEL_PROMPT_SCHEMA_THRESHOLD_DEPENDENCY_WORKFLOW_PAUSED_LINEAGE_PRODUCTION_NEW_PR_READY_MERGE_ISSUE_CLOSE",
  prePushReview:
    "PR20_COMPLETE_PATCH_NONPERSONAL_RAW_COMMIT_RECONSTRUCT_EXACT_SHA_TREE_PARENT_DIFF_FULL_GATES_AUDIT0",
  postPushReview: "REQ_VERIFY_REMOTE_EXACT_SHA_PARENT_HISTORY_HOSTED_CI",
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
  commit: "CONDITIONAL_FULL_STAGE_GATES_CLAUDE_REVIEW",
  push: "CONDITIONAL_EXACT_COMMIT_GATES_CLAUDE_REVIEW_FRESH_PR20",
  reviewedV55: {
    baseline: "47cf2f2c1c24ca365627ce515df30ed12fcea2f0",
    tree: "82a7121e032ef14bbac1ea3e85aea3c2414df0ed",
    diffSha256:
      "cce49bb3c0d8bc3e352f286d0892726fc654e17dcd1f09a6bc6cb724e93e7b25",
    files: {
      "PROJECT_CONTROL.md":
        "ff1e00e2e02f81c95ea05863b4d96ff5e770fd433db667e8b37e563627fd5265",
      "config/project/current-work.json":
        "a102f875288095261ac1d579cdc561581f6d9b71db39ba7ad2c70ff091988dc7",
      "config/project/current-work.schema.json":
        "89920e66ba05bd564e4e21a4652122509636d973134c233bccf14119488f86ba",
      "config/project/roadmap.json":
        "5332ecbb99111db6d89dffdd67d3fa846958fc796ce7006cde8296fed322adb4",
      "docs/project/EXECUTION_GATES.md":
        "0c65c206eeba470d7e4cfa1b6b72980cae72e3ea9c90c605715bc67bfb0555de",
      "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md":
        "1ceb96fc8ae1dcb469006c614872534df559633277cb6b2b0363c3da3d78cda8",
      "docs/project/OWNER_DECISION_LOG.md":
        "45bed3b1c75d4380fbb9b4ccbc3e0e1f7c29f117965017b51ab214d0feb4eb88",
      "docs/project/ROADMAP_CHANGELOG.md":
        "3a683b8f01d6f620d4a9ec43838decab155f94543c162b6dfa5ae1591200beb9",
      "src/project-control-cli.ts":
        "ea321e20a1a1d17af8cf5a1e16fca9d6140b7d7863c74c6456e5b9ad9046ceab",
      "src/project-control-v55.ts":
        "ee425a2ba08662c2666831c1c6c0819bd6bdca7240bdea4b1f9ed5bbd33d0598",
      "src/project-control.ts":
        "1e8fa98f3127d9d14228df712df2bc536ef4ae39d9e59c946b20419a10e04ab1",
      "tests/project-control-v54.test.ts":
        "0e6a9d7e7b6afb5632f6beaf0aabf8993e0dc8b953fb3704845a56e98bbb64b7",
      "tests/project-control-v55.test.ts":
        "54bb2c35122c5bc2b2a81129d605f0e32d1e8206a69149cb0a4ea271c0bae41e",
      "worker-configuration.d.ts":
        "1d0487801b1eb667f01ce1bccf541bbb6acd86b18acecbc54fc916d73a184def",
      "worker-tests/mp-06-v55-fresh-baseline.test.ts":
        "44c0684c9fe3fb374aaadd103e909049d9469b462e9c248906a9cfd3f42967fe",
      "worker/durable-objects.ts":
        "a859439445d75295572f0f561eb4407d41f49f94008fb992c56e778cf847ef9b",
      "worker/index.ts":
        "640558da1a92e60d3ace3d00cd1f44a7bbd52f5aedb81662fd52bfbe3260d872",
      "wrangler.jsonc":
        "d529ceddee36678bb672ec88c49cd6c21a9e02f1c92a5f2ba184fa89b94d79d5",
    },
  },
  fixturePath: "tests/fixtures/project-control/v55-local-patch.json",
} as const;
const c = REVIEWED_V55_PUBLICATION_V56;
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
export const V56_ALLOWED_PATHS = [
  ...V55_ALLOWED_PATHS,
  "src/project-control-v56.ts",
  "tests/project-control-v56.test.ts",
  c.fixturePath,
] as const;
export const V56_CONTROL_PATHS = V56_ALLOWED_PATHS.filter(
  (p) => !(p in c.implementationSeals),
);
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("V56_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
};
export function projectV56ToV55(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.technicalBase;
  r.ownerDecision = {
    decisionId: TEST_NAMESPACE_RESET_V55.ownerDecision,
    decidedAt: "2026-10-03",
    supersedes: TEST_NAMESPACE_RESET_V55.supersedes,
  };
  // Project to the exact reviewed, uncommitted v55 snapshot; no invented v55 commit.
  w.roadmapVersion = c.technicalBase;
  delete w.publicationV56;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "publicationV56",
    );
    const properties = object(s.properties);
    delete properties.publicationV56;
    properties.roadmapVersion = { const: c.technicalBase };
  }
}
export function v56AuthoritySummary() {
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
    allowedPaths: V56_ALLOWED_PATHS,
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
export function evaluateV56Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V56_SCOPED_LOCAL_EVIDENCE_AND_HANDOFF" };
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
    e.kind === "V56_EXACT_SOURCE_QUALIFICATION" &&
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
        e.validation === "FULL_PASS" &&
        e.head === c.baseline
      : e.stage === "POST_COMMIT" &&
        e.validation === "FULL_PASS" &&
        e.clean === true &&
        e.head !== c.baseline);
  const review = plain(e.claudeReview) ? e.claudeReview : {};
  const reviewBound =
    review.channel === "PR20_COMMENTS" &&
    review.verdict === "PASS" &&
    review.parent === c.baseline &&
    review.tree === e.tree &&
    review.diffSha256 === e.diffSha256 &&
    review.completePatch === true &&
    review.fullGates === "PASS" &&
    review.audit === "ZERO_AT_EVERY_SEVERITY" &&
    typeof review.responseComment === "string" &&
    /^https:\/\/github\.com\/Eak-dev\/malispang-lineOA\/pull\/20#issuecomment-[1-9][0-9]*$/u.test(
      review.responseComment,
    );
  if (action === "COMMIT")
    return {
      allowed: source && reviewBound && review.stage === "PRE_COMMIT",
      reason: "V56_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
    };
  if (action === "PUSH_BRANCH") {
    const p = plain(e.pr) ? e.pr : {};
    const start =
      typeof p.observedAt === "string" ? Date.parse(p.observedAt) : NaN;
    return {
      allowed:
        source &&
        reviewBound &&
        review.channel === "PR20_COMMENTS" &&
        review.verdict === "PASS" &&
        review.commit === e.head &&
        review.parent === c.baseline &&
        review.tree === e.tree &&
        review.diffSha256 === e.diffSha256 &&
        review.completePatch === true &&
        review.exactCommitReconstructed === true &&
        review.fullGates === "PASS" &&
        review.audit === "ZERO_AT_EVERY_SEVERITY" &&
        typeof review.responseComment === "string" &&
        /^https:\/\/github\.com\/Eak-dev\/malispang-lineOA\/pull\/20#issuecomment-[1-9][0-9]*$/u.test(
          review.responseComment,
        ) &&
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
      reason: "V56_FULL_EXACT_SOURCE_AND_FRESH_PR20_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V56_NO_MERGE_DEPLOY_REMOTE_OR_INHERITED_GRANT",
  };
}
export function validateV56PullRequestReceipt(
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
export function inspectV56Repository(
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
      throw Error("V56_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V56_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V56_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V56_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V56_BASELINE_MISMATCH");
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
        throw Error("V56_REMOTE_MISMATCH");
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
        throw Error("V56_PR_IDENTITY_MISMATCH");
      source = receipt.head;
    } else if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V56_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V56_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V56_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V56_STATUS_UNVERIFIED");
      return e.slice(3);
    });
    if (receipt && status) throw Error("V56_PR_DIRTY");
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
      changed.some((p) => !(V56_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V56_PATH_OUTSIDE_SCOPE");
    for (const p of V56_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V56_NON_REGULAR_PATH");
      }
    }
    const snapshot = reconstructReviewedV55(cwd, git);
    const baseline = new Map<string, Buffer>();
    for (const path of [...controls, ...appendPaths, "PROJECT_CONTROL.md"])
      baseline.set(path, snapshot.files.get(path)!);
    const check = (read: (p: string) => Buffer) => {
      const r = object(JSON.parse(read(controls[0]).toString())),
        w = object(JSON.parse(read(controls[1]).toString())),
        s = object(JSON.parse(read(controls[2]).toString()));
      if (
        r.version !== c.version ||
        w.roadmapVersion !== c.version ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: c.ownerDecision,
          decidedAt: "2026-10-04",
          supersedes: c.supersedes,
        }) ||
        !isDeepStrictEqual(w.publicationV56, c) ||
        !isDeepStrictEqual(object(s.properties).publicationV56, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "publicationV56").length !== 1
      )
        throw Error("V56_EXACT_TRANSITION_REQUIRED");
      verifyV55Fixture(read(c.fixturePath));
      projectV56ToV55(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V56_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V56_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V56_CONTROL_HISTORY_REWRITTEN");
      const historicalHandoff = snapshot.files.get(
        "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md",
      )!;
      const handoff = read("docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md");
      if (
        !handoff
          .subarray(handoff.length - historicalHandoff.length)
          .equals(historicalHandoff)
      )
        throw Error("V56_HANDOFF_HISTORY_REWRITTEN");
      // The complete delta is checked against the v55 reconstructed tree inventory below.
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if (hash(read(p)) !== seal)
          throw Error("V56_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)));
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V56_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V56_NON_REGULAR_INDEX");
      check((p) => Buffer.from(run("show", ":" + p)));
    }
    const checkTreeDelta = (entries: string[]) => {
      const current = new Map(
        entries.map((e) => {
          const i = e.indexOf("\t");
          return [
            e.slice(i + 1),
            e.slice(0, i).replace(" blob ", " ").replace(/ 0$/, ""),
          ];
        }),
      );
      for (const p of new Set([
        ...current.keys(),
        ...snapshot.inventory.keys(),
      ]))
        if (
          current.get(p) !== snapshot.inventory.get(p) &&
          !V56_CONTROL_PATHS.includes(p)
        )
          throw Error("V56_REVIEWED_TREE_DELTA_OUTSIDE_CONTROL:" + p);
    };
    if (staged.length) checkTreeDelta(split(run("ls-files", "--stage", "-z")));
    for (const rev of revisions) {
      checkTreeDelta(split(run("ls-tree", "-r", "-z", rev)));
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V56_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V56_NON_REGULAR_HISTORY");
      check((p) => Buffer.from(run("show", rev + ":" + p)));
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

/** The reviewed local v55 was never a commit. Reconstruct its exact tree in a
 * disposable local clone; no checkout/index/object writes in the operator repo. */
function verifyV55Fixture(bytes: Buffer) {
  const fixture = object(JSON.parse(bytes.toString()));
  const { patchGzipBase64, ...manifest } = fixture;
  if (
    !isDeepStrictEqual(manifest, c.reviewedV55) ||
    typeof patchGzipBase64 !== "string"
  )
    throw Error("V56_V55_FIXTURE_MANIFEST_MISMATCH");
  const patch = gunzipSync(Buffer.from(patchGzipBase64, "base64"), {
    maxOutputLength: 200000,
  });
  if (hash(patch) !== c.reviewedV55.diffSha256)
    throw Error("V56_V55_PATCH_DIGEST_MISMATCH");
  return patch;
}
export function reconstructReviewedV55(cwd: string, binary: string) {
  const patch = verifyV55Fixture(readFileSync(join(cwd, c.fixturePath)));
  const dir = mkdtempSync(join(tmpdir(), "mp06-v56-history-"));
  const args = [
    "--no-replace-objects",
    "--no-optional-locks",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "protocol.allow=never",
    "-c",
    "protocol.file.allow=always",
  ];
  const git = (...a: string[]) =>
    execFileSync(binary, [...args, ...a], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  try {
    git(
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      cwd,
      ".",
    );
    git("checkout", "--quiet", "--detach", c.baseline);
    execFileSync(
      binary,
      [...args, "apply", "--index", "--whitespace=error", "-"],
      { cwd: dir, input: patch, stdio: ["pipe", "pipe", "pipe"] },
    );
    const tree = git("write-tree").trim();
    if (tree !== c.reviewedV55.tree) throw Error("V56_V55_TREE_MISMATCH");
    const changed = git("diff", "--cached", "--name-only", "-z", c.baseline)
      .split("\0")
      .filter(Boolean)
      .sort();
    if (!isDeepStrictEqual(changed, Object.keys(c.reviewedV55.files).sort()))
      throw Error("V56_V55_RECONSTRUCTION_SCOPE_MISMATCH");
    const files = new Map<string, Buffer>();
    for (const [p, sha] of Object.entries(c.reviewedV55.files)) {
      const bytes = readFileSync(join(dir, p));
      if (hash(bytes) !== sha) throw Error("V56_V55_FILE_MISMATCH:" + p);
      files.set(p, bytes);
    }
    // Also recheck the projection against the real published v54, not only fixture metadata.
    const r = object(JSON.parse(files.get(controls[0])!.toString())),
      w = object(JSON.parse(files.get(controls[1])!.toString())),
      schema = object(JSON.parse(files.get(controls[2])!.toString()));
    projectV55ToV54(r, w, schema);
    for (const [i, v] of [r, w, schema].entries())
      if (
        !isDeepStrictEqual(
          v,
          JSON.parse(git("show", c.baseline + ":" + controls[i])),
        )
      )
        throw Error("V56_V55_BASELINE_PROJECTION_DRIFT");
    const inventory = new Map(
      git("ls-tree", "-r", "-z", tree)
        .split("\0")
        .filter(Boolean)
        .map((e) => {
          const i = e.indexOf("\t");
          return [e.slice(i + 1), e.slice(0, i).replace(" blob ", " ")];
        }),
    );
    return { tree, files, inventory };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
