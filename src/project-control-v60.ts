import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { TEST_DEPLOYMENT_V59 } from "./project-control-v59.js";
import {
  validateV43PullRequestReceipt,
  type V43CheckoutReceipt,
  type V43PrReceipt,
} from "./project-control-v43.js";

export const TEST_DEPLOYMENT_V60 = {
  version: "2026.10.04-v60",
  ownerDecision: "MP-OD-2026-10-04-V60",
  supersedes: "2026.10.04-v59",
  technicalBase: "2026.10.04-v59",
  baseline: "6973a12f0c54d51945830b4ad635250e7612fdba",
  baselineTree: "6d6f0c30b3124108331b17c83bd361d70af3461c",
  baselineParent: "6aa87dcb75d6e20d5fbf65351119b0fac259f255",
  publishedBaseline: "6973a12f0c54d51945830b4ad635250e7612fdba",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  workId: "MP-06",
  githubIssue: 12,
  stage: "TEST_ONLY_EXACT_DEPLOY_RESET_ONCE_CONDITIONAL",
  historicalTestAdapterSha256:
    "2361b900fe4ecb8302cddc669fef2d3950082fbc146693bf1fc768429c986a60",
  target: {
    account: "c395a1bc15b7c95267173de5ccd6407d",
    worker: "malispang-lineoa-test",
    origin: "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
    environment: "TEST",
    profile: "default",
  },
  artifact: {
    sha256: "6e38d93410d645b2c02d29d171fab2ebd5bdd281b735b707de6f76b6adc76d42",
    bytes: 258400,
    wrangler: "4.122.0",
    minify: true,
  },
  ownerFacts: {
    lastTestMessageDate: "2026-09-13",
    source: "OWNER_REPORT_NOT_CONTINUOUS_OBSERVATION",
    testOnlyOwner: true,
    testDataDisposable: true,
    partialUnknownUnavailableRiskAccepted: true,
    syntheticEmptyObjects: 1,
  },
  pausedLineage: {
    versions: ["2026.10.02-v51", "2026.10.02-v52"],
    branch: "codex/mp06-uat-round2-prep",
    head: "d63d620820a4f1ea6f452e553724d34d16535a90",
    status: "PAUSED_FROZEN_NO_DEPLOY_NO_DELETE_NO_EDIT_REFERENCE_ONLY",
  },
  retiredLineage: {
    WP8F: "RETIRED",
    v16: "RETIRED",
    v22: "RETIRED_UNUSED_NO_REISSUE",
  },
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
    "ONE_CHILD_FULL_GATES_AUDIT0_CLAUDE_PRECOMMIT_EXACT_PREPUSH_POSTPUSH_HOSTED_CI",
  deploy:
    "CONDITIONAL_ONE_EXACT_TEST_CLI_INVOCATION_WITH_BOUNDED_NATIVE_UPLOAD_RETRIES_AFTER_PUBLICATION_AND_FRESH_PREFLIGHT",
  nativeRetry: {
    wrangler: "4.122.0",
    maximumAttemptsPerUploadCall: 3,
    exactBundleConfigAndTarget: true,
    scope: "WORKER_UPLOAD_WRAPPER_ONLY_NOT_ASSETS_OR_TOTAL_NETWORK_REQUESTS",
    ambiguousOutcomeRetryAccepted: true,
  },
  operatorRetry: false,
  accountSelection: {
    variable: "CLOUDFLARE_ACCOUNT_ID",
    value: "c395a1bc15b7c95267173de5ccd6407d",
    mode: "EXPLICIT_CHILD_ONLY_AFTER_REMOVE_INHERITED_CLOUDFLARE_CF",
    otherOverrides: false,
    accountEnumeration: false,
    configOrCacheMutation: false,
  },
  nativeRefresh: {
    profile: "default",
    sameAccountAndScopes: true,
    storage: "EXISTING_ENCRYPTED_KEYCHAIN",
    silentRefresh: true,
    providerRefreshTokenRotation: true,
    nonInteractive: true,
    newLogin: false,
    newConsent: false,
    newApiKey: false,
    plaintextExport: false,
    failureOrUnknown: "STOP_NO_OPERATOR_RETRY_OR_FALLBACK",
  },
  deploymentGrant: {
    originControl: "2026.10.04-v57",
    maximumInvocationsAcrossLineage: 1,
    carryForward: "SAME_UNUSED_GRANT_NOT_REISSUED",
    priorJournalRequired: true,
  },
  metadata:
    "EXACT_TEST_ACCOUNT_ACCESS_DEPLOYMENTS_VERSION_BINDINGS_SECRET_NAMES_NO_WHOAMI_OBJECT_OR_OTHER_WORKER_SCAN",
  credential:
    "EXISTING_DEFAULT_NATIVE_SILENT_REFRESH_ENCRYPTED_KEYCHAIN_NO_NEW_LOGIN_CONSENT_APIKEY_OR_SECRET_CHANGE",
  postverify:
    "VERIFIED_NEW_V2_ONLY_HEALTH_INACTIVE_COORDINATOR_ONE_SYNTHETIC_EMPTY_CONVERSATION",
  requiredSecrets: [
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_BOT_USER_ID",
    "TEST_ADMIN_KEY",
    "TEST_REWARD_CARD_URL",
  ],
  oldClasses: [
    "ConversationStateDO",
    "DraftOrderDO",
    "HandoffRegistryDO",
    "PromotionControlDO",
  ],
  newClasses: [
    "ConversationStateDOV2",
    "DraftOrderDOV2",
    "HandoffRegistryDOV2",
    "PromotionControlDOV2",
  ],
  externalBindingPolicy:
    "CLOUDFLARE_REJECTION_NO_PRODUCTION_SCAN_NO_ADVANCE_ISOLATION_OR_ATOMICITY_PASS",
  quiescence:
    "OWNER_REPORTED_QUIET_NOT_PROOF_OF_NO_QUEUED_REDELIVERY_REQUIRE_CURRENT_QUIET_WINDOW",
  destruction:
    "IRREVERSIBLE_NO_DATA_RECOVERY_PARTIAL_UNKNOWN_CONSUMES_INVOCATION_NO_OPERATOR_RETRY_OR_ROLLBACK",
  journal:
    "APPEND_SANITIZED_ISSUE12_START_BEFORE_INVOCATION_ANY_STARTED_OUTCOME_CONSUMED",
  storageHold: "UNCHANGED_NO_OLD_READ_REPLAY_OR_TRANSPORT_BYPASS",
  historicalGaps: "U1_GAP_A1_A3_UNRESOLVED_BILLING_UNKNOWN_NOT_PASS",
  rootCause: "SEPTEMBER_UNKNOWN_PERMANENT_HISTORICAL_GAPS_UNCHANGED",
  uatReadiness: "NOT_VERIFIED",
  ready: false,
  merge: false,
  production: false,
  forbidden:
    "OLD_STORAGE_SQL_DATA_STUDIO_SELECTOR_REPLAY_PRODUCTION_OTHER_WORKER_SCAN_SECRET_CHANGE_WEBHOOK_PILOT_LIVE_UAT_PROVIDER_RUNTIME_POLICY_KB_CATALOG_MODEL_PROMPT_SCHEMA_THRESHOLD_DEPENDENCY_WORKFLOW_PAUSED_LINEAGE_NEW_PR_READY_MERGE_ISSUE_CLOSE_OPERATOR_RETRY_ROLLBACK",
  nodeTestTimeout: {
    file: "vitest.config.ts",
    sha256: "33b9cdf167339c56e94e4e2b222a849d76d14fee60a0355f5a82668b178e8264",
    from: 7000,
    to: 10000,
    maxWorkers: 2,
    retries: 0,
    assertions: "UNCHANGED",
    purpose: "OWNER_ACCEPTED_CI_TIMING_MARGIN_NOT_ROOT_CAUSE_FIX",
    failedEvidence: "CI37178910961_RETAINED_FAIL",
  },
  uatPreparation: {
    ownerPreauthorized: true,
    execution: "REQUIRES_REVIEWED_ACTION_SPECIFIC_CONTROL_AFTER_RESET",
    target: "EXISTING_TEST_ONLY",
    messages: "OWNER_ONLY",
    sameApprovedCaps: true,
    production: false,
    heldOldStorage: false,
    secretExposure: false,
    ready: false,
    merge: false,
    issueClosure: false,
  },
  nativeAssetsRetry: {
    wrangler: "4.122.0",
    phase: "BEFORE_WORKER_UPLOAD",
    ordinaryAttemptsPerBucket: 6,
    maximumAttemptsPerBucketIncludingGateway: 10,
    exactFrozenAssetsConfig: true,
    serverBucketCount: "UNOBSERVED_NO_TOTAL_REQUEST_BOUND",
    operatorRetry: false,
    providerWideIdempotence: "UNPROVEN",
    partialOrUnknown: "CONSUMES_SAME_SINGLE_CLI_GRANT_STOP_METADATA_ONLY",
  },
} as const;
const c = TEST_DEPLOYMENT_V60;
export const V60_ALLOWED_PATHS = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md",
  "src/project-control-v60.ts",
  "tests/project-control-v60.test.ts",
  "tests/project-control-v59.test.ts",
] as const;
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
const hash = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
const checkedPaths = [
  ...new Set([
    ...controls,
    ...appendPaths,
    "PROJECT_CONTROL.md",
    "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md",
    "tests/project-control-v59.test.ts",
    "vitest.config.ts",
    ...Object.keys(c.implementationSeals),
  ]),
];

export function readV60GitBlobs(cwd: string, git: string, revision: string) {
  if (revision !== "" && !/^[a-f0-9]{40}$/u.test(revision))
    throw Error("V60_BLOB_REVISION_INVALID");
  const bytes = execFileSync(
    git,
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-c",
      "diff.autoRefreshIndex=false",
      "cat-file",
      "--batch",
    ],
    {
      cwd,
      input: checkedPaths.map((p) => revision + ":" + p + "\n").join(""),
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const blobs = new Map<string, Buffer>();
  let offset = 0;
  for (const p of checkedPaths) {
    const newline = bytes.indexOf(10, offset);
    if (newline < offset) throw Error("V60_BLOB_BATCH_INVALID");
    const header = /^([a-f0-9]{40}) blob ([0-9]+)$/u.exec(
      bytes.subarray(offset, newline).toString("utf8"),
    );
    if (!header) throw Error("V60_BLOB_BATCH_INVALID");
    const size = Number(header[2]),
      start = newline + 1,
      end = start + size;
    if (!Number.isSafeInteger(size) || end >= bytes.length || bytes[end] !== 10)
      throw Error("V60_BLOB_BATCH_INVALID");
    const blob = bytes.subarray(start, end);
    const oid = createHash("sha1")
      .update("blob " + size + "\0")
      .update(blob)
      .digest("hex");
    if (oid !== header[1]) throw Error("V60_BLOB_BATCH_INVALID");
    blobs.set(p, blob);
    offset = end + 1;
  }
  if (offset !== bytes.length) throw Error("V60_BLOB_BATCH_INVALID");
  return blobs;
}

const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("V60_OBJECT_REQUIRED");
  return v as Record<string, unknown>;
};
export function projectV60ToV59(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  r.version = c.technicalBase;
  r.ownerDecision = {
    decisionId: TEST_DEPLOYMENT_V59.ownerDecision,
    decidedAt: "2026-10-04",
    supersedes: TEST_DEPLOYMENT_V59.supersedes,
  };
  w.roadmapVersion = c.technicalBase;
  delete w.testDeploymentV60;
  if (s) {
    s.required = (s.required as string[]).filter(
      (k) => k !== "testDeploymentV60",
    );
    const p = object(s.properties);
    delete p.testDeploymentV60;
    p.roadmapVersion = { const: c.technicalBase };
  }
}
export function v60AuthoritySummary() {
  return {
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    status: c.stage,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: [
      "COMMIT",
      "PUSH_BRANCH",
      "PREFLIGHT_METADATA_READ",
      "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
      "POSTVERIFY_NEW_V2",
      "READBACK_UNKNOWN_DEPLOYMENT",
    ],
    allowedPaths: V60_ALLOWED_PATHS,
    pullRequest: 20,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
  };
}
export function evaluateV60Action(
  action: string,
  evidence?: unknown,
  deploymentTarget?: unknown,
) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V60_SCOPED_LOCAL_EVIDENCE_AND_HANDOFF" };
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
    e.kind === "V60_EXACT_SOURCE_QUALIFICATION" &&
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
      reason: "V60_FRESH_EXACT_STAGE_QUALIFICATION_REQUIRED",
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
      reason: "V60_FULL_EXACT_SOURCE_AND_FRESH_PR20_REQUIRED",
    };
  }
  return evaluateRemoteV60(action, e, deploymentTarget);
}

export function validateV60PullRequestReceipt(
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
export function inspectV60Repository(
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
      throw Error("V60_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      run("rev-parse", "--is-shallow-repository").trim() !== "false" ||
      run("for-each-ref", "--format=%(refname)", "refs/replace").trim()
    )
      throw Error("V60_FULL_UNREPLACED_HISTORY_REQUIRED");
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
      throw Error("V60_GIT_OPERATION_IN_PROGRESS");
    if (split(run("ls-files", "-v", "-z")).some((e) => !/^H /u.test(e)))
      throw Error("V60_HIDDEN_INDEX_FLAGS");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw Error("V60_BASELINE_MISMATCH");
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
        throw Error("V60_REMOTE_MISMATCH");
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
        throw Error("V60_PR_IDENTITY_MISMATCH");
      source = receipt.head;
    } else if (
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw Error("V60_BRANCH_MISMATCH");
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw Error("V60_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw Error("V60_NEW_SOURCE_REQUIRES_SUCCESSOR_CONTROL");
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
        throw Error("V60_STATUS_UNVERIFIED");
      return e.slice(3);
    });
    if (receipt && status) throw Error("V60_PR_DIRTY");
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
      changed.some((p) => !(V60_ALLOWED_PATHS as readonly string[]).includes(p))
    )
      throw Error("V60_PATH_OUTSIDE_SCOPE");
    for (const p of V60_ALLOWED_PATHS) {
      const parts = p.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const s = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !s.isFile() : !s.isDirectory())
          throw Error("V60_NON_REGULAR_PATH");
      }
    }
    const snapshot = {
      files: readV60GitBlobs(cwd, git, c.baseline),
      inventory: new Map(
        split(run("ls-tree", "-r", "-z", c.baseline)).map((e) => {
          const i = e.indexOf("\t");
          return [e.slice(i + 1), e.slice(0, i).replace(" blob ", " ")];
        }),
      ),
    };
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
        !isDeepStrictEqual(w.testDeploymentV60, c) ||
        !isDeepStrictEqual(object(s.properties).testDeploymentV60, {
          const: c,
        }) ||
        !isDeepStrictEqual(object(s.properties).roadmapVersion, {
          const: c.version,
        }) ||
        !Array.isArray(s.required) ||
        s.required.filter((k) => k === "testDeploymentV60").length !== 1
      )
        throw Error("V60_EXACT_TRANSITION_REQUIRED");

      if (
        hash(read("vitest.config.ts")) !== c.nodeTestTimeout.sha256 ||
        !read("vitest.config.ts").equals(
          snapshot.files.get("vitest.config.ts")!,
        )
      )
        throw Error("V60_FROZEN_NODE_TEST_POLICY_REQUIRED");
      projectV60ToV59(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(baseline.get(controls[i]!)!.toString()),
          )
        )
          throw Error("V60_INHERITED_CONTROL_DRIFT");
      for (const p of appendPaths)
        if (
          !read(p).subarray(0, baseline.get(p)!.length).equals(baseline.get(p)!)
        )
          throw Error("V60_HISTORY_REWRITTEN");
      const header = Buffer.from("# MalisPang Project Control\n\n"),
        old = baseline.get("PROJECT_CONTROL.md")!.subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - old.length).equals(old)
      )
        throw Error("V60_CONTROL_HISTORY_REWRITTEN");
      const historicalHandoff = snapshot.files.get(
        "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md",
      )!;
      const handoff = read("docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md");
      if (
        !handoff
          .subarray(handoff.length - historicalHandoff.length)
          .equals(historicalHandoff)
      )
        throw Error("V60_HANDOFF_HISTORY_REWRITTEN");
      if (
        hash(read("tests/project-control-v59.test.ts")) !==
        c.historicalTestAdapterSha256
      )
        throw Error("V60_HISTORICAL_TEST_ADAPTER_DRIFT");
      // The complete delta is checked against the immutable v59 tree inventory below.
      for (const [p, seal] of Object.entries(c.implementationSeals))
        if (hash(read(p)) !== seal)
          throw Error("V60_IMPLEMENTATION_SEAL_REQUIRED:" + p);
    };
    check((p) => readFileSync(join(cwd, p)));
    if (staged.length) {
      if (
        split(
          run("ls-files", "--stage", "-z", "--", ...V60_ALLOWED_PATHS),
        ).some((e) => !/^100644 [a-f0-9]{40} 0\t/u.test(e))
      )
        throw Error("V60_NON_REGULAR_INDEX");
      const stagedBlobs = readV60GitBlobs(cwd, git, "");
      check((p) => stagedBlobs.get(p)!);
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
          !(V60_ALLOWED_PATHS as readonly string[]).includes(p)
        )
          throw Error("V60_REVIEWED_TREE_DELTA_OUTSIDE_CONTROL:" + p);
    };
    if (staged.length) checkTreeDelta(split(run("ls-files", "--stage", "-z")));
    for (const rev of revisions) {
      checkTreeDelta(split(run("ls-tree", "-r", "-z", rev)));
      if (
        split(run("ls-tree", "-r", "-z", rev, "--", ...V60_ALLOWED_PATHS)).some(
          (e) => !/^100644 blob [a-f0-9]{40}\t/u.test(e),
        )
      )
        throw Error("V60_NON_REGULAR_HISTORY");
      const revisionBlobs = readV60GitBlobs(cwd, git, rev);
      check((p) => revisionBlobs.get(p)!);
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

/** Pure fail-closed receipt checking only. The operator must authenticate each
 * observation against real Git/CI/Claude/Cloudflare evidence and a durable
 * Issue12 attempt journal. Supplying an object never creates permission. */
function evaluateRemoteV60(
  action: string,
  e: Record<string, unknown>,
  deploymentTarget?: unknown,
) {
  const record = (v: unknown): Record<string, unknown> =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    [Object.prototype, null].includes(
      Object.getPrototypeOf(v) as object | null,
    ) &&
    Reflect.ownKeys(v).every(
      (k) => "value" in Object.getOwnPropertyDescriptor(v, k)!,
    )
      ? (v as Record<string, unknown>)
      : {};
  const sha = (v: unknown) =>
    typeof v === "string" && /^[a-f0-9]{40}$/u.test(v);
  const digest = (v: unknown) =>
    typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
  const comment = (v: unknown, issue: number) =>
    typeof v === "string" &&
    new RegExp(
      "^https://github\\.com/Eak-dev/malispang-lineOA/" +
        (issue === 20 ? "pull/20" : "issues/" + issue) +
        "#issuecomment-[1-9][0-9]*$",
      "u",
    ).test(v);
  const fresh = (v: unknown) =>
    typeof v === "string" &&
    Number.isFinite(Date.parse(v)) &&
    Date.parse(v) <= Date.now() &&
    Date.now() - Date.parse(v) <= 120000;
  const q = record(e.qualification),
    p = record(e.preflight),
    j = record(e.journal),
    d = record(e.deployment),
    t = record(deploymentTarget);
  const identity =
    e.controlVersion === c.version &&
    e.kind === "V60_REMOTE_QUALIFICATION" &&
    e.repository === c.repository &&
    e.branch === c.headBranch &&
    sha(e.source) &&
    e.source !== c.baseline &&
    e.parent === c.baseline &&
    sha(e.tree) &&
    e.clean === true &&
    e.sourceStable === true &&
    e.artifactSha256 === c.artifact.sha256 &&
    e.artifactBytes === c.artifact.bytes &&
    e.runtimeMatchesBaseline === true &&
    e.account === c.target.account &&
    e.worker === c.target.worker &&
    e.origin === c.target.origin &&
    e.environment === "TEST" &&
    e.profile === "default" &&
    e.credentialMode === "EXISTING_NATIVE_NO_PLAINTEXT" &&
    e.noProductionAccess === true &&
    e.noOldStorageAccess === true &&
    e.holdPreserved === true &&
    isDeepStrictEqual(e.accountSelection, c.accountSelection) &&
    isDeepStrictEqual(e.nativeRefresh, c.nativeRefresh) &&
    e.nativeContainmentVerified === true;
  const published =
    identity &&
    q.source === e.source &&
    q.tree === e.tree &&
    digest(q.diffSha256) &&
    q.fullGates === "PASS" &&
    q.audit === "ZERO_AT_EVERY_SEVERITY" &&
    q.precommitReview === "PASS" &&
    comment(q.precommitResponse, 20) &&
    q.exactPrepushReview === "PASS" &&
    comment(q.prepushResponse, 20) &&
    q.postpushReview === "PASS" &&
    comment(q.postpushResponse, 20) &&
    q.hostedCi === "SUCCESS" &&
    typeof q.ciUrl === "string" &&
    /^https:\/\/github\.com\/Eak-dev\/malispang-lineOA\/actions\/runs\/[1-9][0-9]*$/u.test(
      q.ciUrl,
    ) &&
    q.remoteHead === e.source &&
    q.prBase === c.baseHead &&
    q.prState === "open" &&
    q.prDraft === true &&
    q.prMerged === false &&
    fresh(q.observedAt);
  const metadataOps = [
    "DEPLOYMENTS",
    "VERSION_BINDINGS_EXPORTS",
    "REQUIRED_SECRET_NAMES",
  ];
  const journalBound =
    j.controlVersion === c.version &&
    j.source === e.source &&
    j.artifactSha256 === c.artifact.sha256 &&
    j.worker === c.target.worker &&
    comment(j.receipt, 12) &&
    j.maximumAttempts === 1 &&
    j.originControl === c.deploymentGrant.originControl &&
    j.priorJournalChecked === true &&
    j.priorStartedInvocations === 0;
  const metadata =
    published &&
    metadataOps.includes(String(e.operation)) &&
    e.targetScriptOnly === true &&
    e.rawOutputSuppressed === true &&
    e.noOtherWorkerScan === true &&
    e.noObjectLookup === true;
  if (action === "PREFLIGHT_METADATA_READ")
    return {
      allowed:
        metadata &&
        e.newLoginAllowed === false &&
        e.secretMutationAllowed === false,
      reason: "V60_EXACT_PUBLISHED_TEST_METADATA_ONLY",
    };
  if (action === "READBACK_UNKNOWN_DEPLOYMENT")
    return {
      allowed:
        metadata &&
        journalBound &&
        j.attempts === 1 &&
        ["STARTED", "UNKNOWN", "PARTIAL", "REJECTED", "SUCCEEDED"].includes(
          String(j.outcome),
        ) &&
        ["DEPLOYMENTS", "VERSION_BINDINGS_EXPORTS"].includes(
          String(e.operation),
        ),
      reason: "V60_CONSUMED_ATTEMPT_METADATA_READBACK_ONLY",
    };
  const preflight =
    published &&
    p.account === c.target.account &&
    p.worker === c.target.worker &&
    fresh(p.observedAt) &&
    typeof p.version === "string" &&
    p.version.length > 0 &&
    p.targetAccountAccessProven === true &&
    p.deploymentTrafficVerified === true &&
    p.bindingsMatched === true &&
    p.oldClassesVerified === true &&
    p.newClassesAbsent === true &&
    isDeepStrictEqual(p.requiredSecretsPresent, c.requiredSecrets) &&
    p.providerSecretRequired === false &&
    p.currentQuietWindowConfirmed === true &&
    p.ownerLastMessageDate === c.ownerFacts.lastTestMessageDate &&
    p.redelivery === "UNKNOWN_NOT_WAIVED_AS_ABSENT" &&
    p.externalBindings === "RELY_ON_PLATFORM_REJECTION_NO_SCAN" &&
    p.atomicity === "UNPROVEN_OWNER_ACCEPTED_PARTIAL_UNKNOWN" &&
    p.oldStorageRead === false &&
    p.alarmAssessment === "SOURCE_ONLY_NOT_LIVE_ABSENCE" &&
    p.nativeCredentialReady === true &&
    p.postverifyCredentialReady === true;
  if (action === "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET")
    return {
      allowed:
        preflight &&
        journalBound &&
        j.attempts === 0 &&
        j.outcome === "NOT_STARTED" &&
        e.startJournalWillPrecedeInvocation === true &&
        e.maximumDeployInvocations === 1 &&
        isDeepStrictEqual(e.nativeRetry, c.nativeRetry) &&
        isDeepStrictEqual(e.nativeAssetsRetry, c.nativeAssetsRetry) &&
        e.operatorRetry === false &&
        e.rollback === false &&
        t.worker === c.target.worker &&
        t.sourceCommit === e.source &&
        t.artifactSha256 === c.artifact.sha256,
      reason:
        "V60_FRESH_PREFLIGHT_AND_DURABLE_SINGLE_INVOCATION_BOUNDED_NATIVE_RETRY_JOURNAL_REQUIRED",
    };
  const verifiedNew =
    published &&
    journalBound &&
    j.attempts === 1 &&
    j.outcome === "SUCCEEDED" &&
    d.source === e.source &&
    d.artifactSha256 === c.artifact.sha256 &&
    d.account === c.target.account &&
    d.worker === c.target.worker &&
    typeof d.version === "string" &&
    d.version.length > 0 &&
    d.version !== p.version &&
    d.trafficPercent === 100 &&
    fresh(d.observedAt) &&
    isDeepStrictEqual(d.classes, c.newClasses) &&
    d.oldClassesDeleted === true &&
    d.noPartialOutcome === true &&
    d.messageSourceMatched === true &&
    d.newNamespaceIdentityVerified === true;
  const probe = record(e.probe);
  const allowedProbe =
    probe.method === "GET" &&
    probe.origin === c.target.origin &&
    probe.previousInvocations === 0 &&
    probe.maximumInvocations === 1 &&
    probe.rawOutputSuppressed === true &&
    probe.onlyNewV2 === true &&
    (probe.path === "/health" ||
      (probe.path === "/admin/mp06-pilot/status" &&
        probe.existingAdminCredentialReady === true &&
        probe.expect === "INACTIVE_ZERO_COUNTERS") ||
      (probe.path === "/admin/mp06/conversation-observation" &&
        probe.existingAdminCredentialReady === true &&
        probe.synthetic === true &&
        probe.syntheticObjectCount === 1 &&
        probe.noEventRef === true &&
        probe.noOwnerIdentity === true &&
        probe.noStateSeeding === true &&
        probe.expect === "EMPTY_DEFAULT"));
  if (action === "POSTVERIFY_NEW_V2")
    return {
      allowed: verifiedNew && allowedProbe,
      reason: "V60_VERIFIED_NEW_NAMESPACES_BOUNDED_SIDE_EFFECTS_ONLY",
    };
  return { allowed: false, reason: "V60_FORBIDDEN_ACTION_NO_INHERITED_GRANT" };
}
