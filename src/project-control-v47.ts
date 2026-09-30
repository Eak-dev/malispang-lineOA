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
import {
  TEST_KNOWLEDGE_VALIDITY_V46,
  V46_ALLOWED_PATHS,
} from "./project-control-v46.js";

export const KNOWLEDGE_PUBLICATION_V47 = {
  version: "2026.09.30-v47.1",
  ownerDecision: "MP-OD-2026-09-30-V47A",
  supersedes: "2026.09.30-v47",
  projectionVersion: "2026.09.30-v46",
  amendsUnpublished: "2026.09.30-v47",
  priorUnpublishedTree: "cc947a6f2f956584c1772cc51df42f554141aa72",
  baseline: "86e5c967dd29e669ee0bc66e594fc9636a188c4e",
  baselineTree: "b9f39bc1d309f186d042f6d0ec9926c764112b2a",
  baselineParent: "d0f63188c50da6e204a4ecc1e91bed97f5ec44eb",
  publishedHead: "d0f63188c50da6e204a4ecc1e91bed97f5ec44eb",
  baseHead: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  pullRequest: 20,
  workId: "MP-06",
  githubIssue: 12,
  stage: "FROZEN_TEST_KNOWLEDGE_EXISTING_DRAFT_PR20_ONLY",
  snapshotPath: "tests/fixtures/mp06-v46-local/snapshot.json",
  snapshotSha256:
    "1934b50063f6cc3ec4dd3407f943f61888a1dde3e77180e01e2fb39fe5a74109",
  v46FixtureAdapterSha256:
    "5f38fb7e2c5934b500a38b3969339bff636f61dc1f0f09019fbbfb65591f7bf8",
  amendedHistory: {
    "docs/project/OWNER_DECISION_LOG.md": {
      bytes: 298123,
      sha256:
        "85987282050d66dc3fb038387f6cefb2c0c15e1fd7790f472f0f3888d663ce9c",
    },
    "docs/project/ROADMAP_CHANGELOG.md": {
      bytes: 165324,
      sha256:
        "a59fa4e3424b33ac758109d655bf72f0bbca6c60e168535a5c4bf189f5cb209f",
    },
    "docs/project/EXECUTION_GATES.md": {
      bytes: 798413,
      sha256:
        "13ae305b72a7fa2195cd85a2b623610c8cd2b269ce83b40970623842f7d41c82",
    },
    "PROJECT_CONTROL.md": {
      bytes: 88546,
      sha256:
        "75924a8576dfc43dcb43c10abb7ec28234fddf1927e99b6b65b70a45920a7c48",
    },
  },
  dependencyPatch: {
    package: "brace-expansion",
    upgrades: [
      { from: "1.1.18", to: "1.1.21" },
      { from: "5.0.9", to: "5.0.12" },
    ],
    status: "SEALED",
    workspaceSha256:
      "1a4f86bd18f075a14d76da77b4d24735aac2659c4f1704736757c3d8f8715615",
    lockfileSha256:
      "4b7ff8fa2f0339f9ee934373c979ad55501dca88590b074c111a4efd4f1c48fd",
  },
  content: "V46_SNAPSHOT_FROZEN_EXACT_ANSWERS_CHECKSUMS_AND_WORKER_CLOCK",
  creationGrant: "CONSUMED_NO_NEW_PR",
  priorIntegrationGrant: "PR19_CONSUMED_NO_REPLACEMENT",
  priorReceipts: "HISTORICAL_ONLY_NEW_V47_EXACT_SOURCE_RECEIPTS_REQUIRED",
  sourceLineage: "ONE_DIRECT_CHILD_OF_BASELINE_ONLY",
  watchdogMs: 5000,
  retries: 0,
  auditGate: "FRESH_ZERO_AT_EVERY_SEVERITY_NO_SUPPRESSION",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  forbidden:
    "NEW_PR_READY_MERGE_DEPLOY_REMOTE_TEST_STORAGE_SQL_LINE_PROVIDER_PRODUCTION_U2_ISSUE_CLOSE",
} as const;
const c = KNOWLEDGE_PUBLICATION_V47;
export const V47_ALLOWED_PATHS = [
  ...V46_ALLOWED_PATHS,
  "src/project-control-v47.ts",
  "tests/project-control-v47.test.ts",
  c.snapshotPath,
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
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
const adapters: readonly string[] = [
  ...controls,
  ...appendPaths,
  "PROJECT_CONTROL.md",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "tests/project-control-v46.test.ts",
];
const frozen = V46_ALLOWED_PATHS.filter((path) => !adapters.includes(path));
const dependencies = ["pnpm-workspace.yaml", "pnpm-lock.yaml"] as const;
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const sha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const dependencySealed = () =>
  String(c.dependencyPatch.status) === "SEALED" &&
  digest(c.dependencyPatch.workspaceSha256) &&
  digest(c.dependencyPatch.lockfileSha256);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("V47_OBJECT_REQUIRED");
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
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && "value" in descriptor;
    })
  );
}
function fresh(observed: unknown, checked: unknown) {
  if (typeof observed !== "string" || typeof checked !== "string") return false;
  const start = Date.parse(observed),
    end = Date.parse(checked),
    now = Date.now();
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= end &&
    end <= now &&
    now - start <= 120000
  );
}
export function projectV47ToV46(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.projectionVersion;
  r.ownerDecision = {
    decisionId: TEST_KNOWLEDGE_VALIDITY_V46.ownerDecision,
    decidedAt: "2026-09-30",
    supersedes: TEST_KNOWLEDGE_VALIDITY_V46.supersedes,
  };
  w.roadmapVersion = c.projectionVersion;
  delete w.knowledgePublicationV47;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "knowledgePublicationV47",
    );
    const properties = object(s.properties);
    delete properties.knowledgePublicationV47;
    properties.roadmapVersion = { const: c.projectionVersion };
  }
}
export function v47AuthoritySummary() {
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
    allowedPaths: [...V47_ALLOWED_PATHS],
    pullRequest: c.pullRequest,
    creationGrant: c.creationGrant,
    priorIntegrationGrant: c.priorIntegrationGrant,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
    receiptProvenance:
      "SHAPE_ONLY_INDEPENDENT_GIT_QUALIFICATION_REVIEW_AUDIT_AND_PR20_READBACK_REQUIRED",
  } as const;
}
export function validateV47PullRequestReceipt(
  event: unknown,
  observed: V43CheckoutReceipt,
): V43PrReceipt | null {
  const receipt = validateV43PullRequestReceipt(event, observed);
  return receipt?.pr === c.pullRequest &&
    receipt.head !== c.baseline &&
    receipt.head !== c.publishedHead &&
    (event as { pull_request: { merged?: unknown } }).pull_request.merged ===
      false
    ? receipt
    : null;
}

/** Immutable historical bytes, not self-issued qualification or publication. */
function snapshotFiles(bytes: Buffer): Map<string, Buffer> {
  if (bytes.length > 16 * 1024 * 1024 || hash(bytes) !== c.snapshotSha256)
    throw new Error("V47_SNAPSHOT_SEAL_MISMATCH");
  const snapshot: unknown = JSON.parse(bytes.toString("utf8"));
  if (
    !closed(snapshot, ["version", "baseline", "files"]) ||
    snapshot.version !== c.projectionVersion ||
    snapshot.baseline !== c.baseline ||
    !closed(snapshot.files, V46_ALLOWED_PATHS)
  )
    throw new Error("V47_SNAPSHOT_SHAPE_MISMATCH");
  const files = new Map<string, Buffer>();
  for (const path of V46_ALLOWED_PATHS) {
    const encoded = snapshot.files[path];
    if (typeof encoded !== "string" || encoded.length > 8 * 1024 * 1024)
      throw new Error("V47_SNAPSHOT_FILE_INVALID");
    const decoded = Buffer.from(encoded, "base64");
    if (decoded.toString("base64") !== encoded || decoded.length === 0)
      throw new Error("V47_SNAPSHOT_FILE_INVALID");
    files.set(path, decoded);
  }
  return files;
}

/** Read-only structure checks. A passing inspection grants no commit or push.
 * Porcelain status avoids worktree diff's raw-index stat refresh side effect. */
export function inspectV47Repository(
  cwd: string,
  git: string,
  receipt?: V43PrReceipt,
) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", ...args],
      { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  const split = (value: string) => value.split("\0").filter(Boolean);
  const lines = (value: string) => value.trim().split("\n").filter(Boolean);
  const parents = (revision: string) =>
    run("rev-list", "--parents", "-n", "1", revision)
      .trim()
      .split(" ")
      .slice(1);
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V47_FULL_HISTORY_REQUIRED");
  const gitDirectory = run("rev-parse", "--absolute-git-dir").trim();
  const indexPath = join(gitDirectory, "index");
  const indexLock = join(gitDirectory, "index.lock");
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
    throw new Error("V47_IN_PROGRESS_OR_GRAFT_STATE");
  const initialIndex = readFileSync(indexPath);
  const head = run("rev-parse", "HEAD").trim();
  const assertOperatorStatePreserved = () => {
    if (
      run("rev-parse", "HEAD").trim() !== head ||
      !readFileSync(indexPath).equals(initialIndex) ||
      existsSync(indexLock)
    )
      throw new Error("V47_OPERATOR_STATE_CHANGED");
  };
  try {
    if (
      !receipt &&
      run("symbolic-ref", "--quiet", "--short", "HEAD").trim() !== c.headBranch
    )
      throw new Error("V47_SOURCE_BRANCH_MISMATCH");
    const remoteUrls = [
      "https://github.com/" + c.repository + ".git",
      "https://github.com/" + c.repository,
      "git@github.com:" + c.repository + ".git",
      "ssh://git@github.com/" + c.repository + ".git",
    ];
    for (const args of [
      ["remote", "get-url", "--all", "origin"],
      ["remote", "get-url", "--push", "--all", "origin"],
    ]) {
      const urls = lines(run(...args));
      if (urls.length !== 1 || !remoteUrls.includes(urls[0]!))
        throw new Error("V47_REPOSITORY_REMOTE_MISMATCH");
    }
    if (run("for-each-ref", "--format=%(refname)", "refs/replace").trim())
      throw new Error("V47_REPLACEMENT_REFS_REJECTED");
    if (
      split(run("ls-files", "-v", "-z")).some((entry) =>
        /^[a-zS] /u.test(entry),
      )
    )
      throw new Error("V47_HIDDEN_INDEX_FLAGS_REJECTED");
    if (
      run("rev-parse", c.baseline + "^{tree}").trim() !== c.baselineTree ||
      !isDeepStrictEqual(parents(c.baseline), [c.baselineParent])
    )
      throw new Error("V47_BASELINE_IDENTITY_MISMATCH");
    const tree = run("rev-parse", "HEAD^{tree}").trim();
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
        throw new Error("V47_PR_CONTEXT_IDENTITY_MISMATCH");
      source = receipt.head;
    }
    run("merge-base", "--is-ancestor", c.baseline, source);
    if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
      throw new Error("V47_SOURCE_MERGE_REJECTED");
    if (
      source !== c.baseline &&
      !isDeepStrictEqual(parents(source), [c.baseline])
    )
      throw new Error("V47_SINGLE_PUBLICATION_CHILD_REQUIRED");
    const status = run(
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
      "--ignore-submodules=none",
    );
    const statusPaths: string[] = [];
    if (status !== "" && !status.endsWith("\0"))
      throw new Error("V47_STATUS_UNVERIFIED");
    for (const entry of split(status)) {
      const code = entry.slice(0, 2),
        path = entry.slice(3);
      if (
        entry[2] !== " " ||
        (code !== "??" && (!/^[ MADT]{2}$/u.test(code) || code === "  ")) ||
        path
          .split("/")
          .some((part) => !part || part === "." || part === "..") ||
        statusPaths.includes(path)
      )
        throw new Error("V47_STATUS_UNVERIFIED");
      statusPaths.push(path);
    }
    const clean = status === "";
    if (receipt && !clean) throw new Error("V47_PR_CHECKOUT_DIRTY");
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
        ...revisions.flatMap((revision) =>
          split(
            run(
              "diff-tree",
              "--no-commit-id",
              "--no-renames",
              "--name-only",
              "-r",
              "-z",
              revision,
            ),
          ),
        ),
      ]),
    ];
    if (
      changed.some(
        (path) => !(V47_ALLOWED_PATHS as readonly string[]).includes(path),
      )
    )
      throw new Error("V47_PATH_OUTSIDE_SCOPE");
    for (const path of V47_ALLOWED_PATHS) {
      const parts = path.split("/");
      for (let i = 1; i <= parts.length; i++) {
        const stat = lstatSync(join(cwd, ...parts.slice(0, i)));
        if (i === parts.length ? !stat.isFile() : !stat.isDirectory())
          throw new Error("V47_NON_REGULAR_PATH");
      }
    }
    if (
      split(run("ls-files", "--stage", "-z", "--", ...V47_ALLOWED_PATHS)).some(
        (entry) => !/^100644 [a-f0-9]{40} 0\t/u.test(entry),
      )
    )
      throw new Error("V47_NON_REGULAR_INDEX_PATH");
    for (const revision of revisions)
      if (
        split(
          run("ls-tree", "-r", "-z", revision, "--", ...V47_ALLOWED_PATHS),
        ).some((entry) => !/^100644 blob [a-f0-9]{40}\t/u.test(entry))
      )
        throw new Error("V47_NON_REGULAR_HISTORY_PATH");
    const snapshotStat = lstatSync(join(cwd, c.snapshotPath));
    if (snapshotStat.size > 16 * 1024 * 1024)
      throw new Error("V47_SNAPSHOT_SIZE_LIMIT");
    const snapshot = snapshotFiles(readFileSync(join(cwd, c.snapshotPath)));
    const historical = (path: string) => {
      const bytes = snapshot.get(path);
      if (!bytes) throw new Error("V47_SNAPSHOT_PATH_MISSING");
      return bytes;
    };
    const blobs = (revision: string) => {
      const expressions = V47_ALLOWED_PATHS.map(
        (path) => revision + ":" + path,
      );
      const out = execFileSync(
        git,
        ["--no-replace-objects", "--no-optional-locks", "cat-file", "--batch"],
        {
          cwd,
          input: expressions.join("\n") + "\n",
          maxBuffer: 64 * 1024 * 1024,
        },
      );
      let offset = 0;
      const values = new Map<string, Buffer>();
      for (const [i, path] of V47_ALLOWED_PATHS.entries()) {
        const end = out.indexOf(10, offset);
        if (end < offset) throw new Error("V47_BLOB_HEADER_INVALID");
        const header = out.subarray(offset, end).toString("utf8");
        offset = end + 1;
        if (header === expressions[i] + " missing")
          throw new Error("V47_BLOB_MISSING:" + path);
        const match = /^([a-f0-9]{40}) blob (\d+)$/u.exec(header),
          length = Number(match?.[2]);
        if (
          !match ||
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > 16 * 1024 * 1024 ||
          offset + length >= out.length ||
          out[offset + length] !== 10
        )
          throw new Error("V47_BLOB_FRAME_INVALID");
        values.set(path, out.subarray(offset, offset + length));
        offset += length + 1;
      }
      if (offset !== out.length) throw new Error("V47_BLOB_TRAILING_DATA");
      return (path: string) => {
        const bytes = values.get(path);
        if (!bytes) throw new Error("V47_BLOB_MISSING:" + path);
        return bytes;
      };
    };
    const check = (
      read: (path: string) => Buffer,
      requireCandidate: boolean,
    ) => {
      const r = object(JSON.parse(read(controls[0]).toString("utf8"))),
        w = object(JSON.parse(read(controls[1]).toString("utf8"))),
        s = object(JSON.parse(read(controls[2]).toString("utf8"))),
        properties = object(s.properties);
      if (
        r.version !== c.version ||
        w.roadmapVersion !== c.version ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: c.ownerDecision,
          decidedAt: "2026-09-30",
          supersedes: c.supersedes,
        }) ||
        !isDeepStrictEqual(w.knowledgePublicationV47, c) ||
        !Array.isArray(s.required) ||
        s.required.filter((key) => key === "knowledgePublicationV47").length !==
          1 ||
        !isDeepStrictEqual(properties.knowledgePublicationV47, { const: c }) ||
        !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
      )
        throw new Error("V47_EXACT_TRANSITION_REQUIRED");
      projectV47ToV46(r, w, s);
      for (const [i, value] of [r, w, s].entries())
        if (
          !isDeepStrictEqual(
            value,
            JSON.parse(historical(controls[i]!).toString("utf8")),
          )
        )
          throw new Error("V47_INHERITED_CONTROL_DRIFT");
      for (const path of appendPaths)
        if (
          !read(path)
            .subarray(0, historical(path).length)
            .equals(historical(path))
        )
          throw new Error("V47_HISTORY_REWRITTEN");
      for (const path of appendPaths) {
        const seal = c.amendedHistory[path];
        if (hash(read(path).subarray(0, seal.bytes)) !== seal.sha256)
          throw new Error("V47_PRIOR_PUBLICATION_HISTORY_REWRITTEN");
      }
      const header = Buffer.from("# MalisPang Project Control\n\n");
      const previous = historical("PROJECT_CONTROL.md").subarray(header.length),
        current = read("PROJECT_CONTROL.md");
      if (
        !current.subarray(0, header.length).equals(header) ||
        !current.subarray(current.length - previous.length).equals(previous)
      )
        throw new Error("V47_CONTROL_HISTORY_REWRITTEN");
      const priorPublication = c.amendedHistory["PROJECT_CONTROL.md"];
      if (
        current.length < header.length + priorPublication.bytes ||
        hash(current.subarray(current.length - priorPublication.bytes)) !==
          priorPublication.sha256
      )
        throw new Error("V47_PRIOR_PUBLICATION_CONTROL_HISTORY_REWRITTEN");
      for (const path of frozen)
        if (!read(path).equals(historical(path)))
          throw new Error("V47_FROZEN_V46_PATH_DRIFT:" + path);
      if (
        !digest(c.v46FixtureAdapterSha256) ||
        hash(read("tests/project-control-v46.test.ts")) !==
          c.v46FixtureAdapterSha256
      )
        throw new Error("V47_V46_FIXTURE_ADAPTER_SEAL_REQUIRED");
      if (hash(read(c.snapshotPath)) !== c.snapshotSha256)
        throw new Error("V47_SNAPSHOT_HISTORY_DRIFT");
      const dependencyHashes = dependencies.map((path) => hash(read(path)));
      if (
        dependencySealed() &&
        isDeepStrictEqual(dependencyHashes, [
          c.dependencyPatch.workspaceSha256,
          c.dependencyPatch.lockfileSha256,
        ])
      )
        return "SEALED_CANDIDATE" as const;
      if (
        !requireCandidate &&
        source === c.baseline &&
        isDeepStrictEqual(dependencyHashes, [
          HARNESS_PUBLICATION_V43.dependencyPatch.workspaceSha256,
          HARNESS_PUBLICATION_V43.dependencyPatch.lockfileSha256,
        ])
      )
        return "BASELINE_PREPARATION_ONLY" as const;
      throw new Error("V47_DEPENDENCY_PAIR_NOT_EXACT_OR_SEALED");
    };
    const dependencyPairState = check(
      (path) => readFileSync(join(cwd, path)),
      source !== c.baseline,
    );
    if (source !== c.baseline || staged.length !== 0)
      check(blobs(""), source !== c.baseline);
    for (const revision of revisions) check(blobs(revision), true);
    return {
      mode: receipt
        ? "DRAFT_PR20_SYNTHETIC_MERGE"
        : source === c.baseline
          ? "LOCAL_PUBLICATION_PREPARATION"
          : "SOURCE_COMMIT",
      head,
      tree,
      sourceHead: source,
      clean,
      changedPaths: changed.sort(),
      dependencyPairState,
      commitAuthorized: false as const,
      publicationAuthorized: false as const,
      remoteExecutionAuthorized: false as const,
      mergeAuthorized: false as const,
      productionAuthorized: false as const,
    };
  } finally {
    assertOperatorStatePreserved();
  }
}

export interface V47LocalReceipt {
  kind: "V47_LOCAL_QUALIFICATION";
  controlVersion: string;
  baseline: string;
  pullRequest: number;
  snapshotSha256: string;
  workspaceSha256: string;
  lockfileSha256: string;
  baselineAncestorOfCandidateParent: true;
  observedAt: string;
  checkedAt: string;
  local: Omit<V43LocalReceipt, "kind">;
}
export interface V47PushReceipt {
  kind: "V47_EXISTING_DRAFT_PUSH";
  local: V47LocalReceipt;
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
): e is V47LocalReceipt {
  if (
    !closed(e, [
      "kind",
      "controlVersion",
      "baseline",
      "pullRequest",
      "snapshotSha256",
      "workspaceSha256",
      "lockfileSha256",
      "baselineAncestorOfCandidateParent",
      "observedAt",
      "checkedAt",
      "local",
    ]) ||
    e.kind !== "V47_LOCAL_QUALIFICATION" ||
    e.controlVersion !== c.version ||
    e.baseline !== c.baseline ||
    e.pullRequest !== c.pullRequest ||
    e.snapshotSha256 !== c.snapshotSha256 ||
    !dependencySealed() ||
    e.workspaceSha256 !== c.dependencyPatch.workspaceSha256 ||
    e.lockfileSha256 !== c.dependencyPatch.lockfileSha256 ||
    e.baselineAncestorOfCandidateParent !== true ||
    !fresh(e.observedAt, e.checkedAt) ||
    !digest(c.v46FixtureAdapterSha256) ||
    !e.local ||
    typeof e.local !== "object" ||
    Array.isArray(e.local) ||
    "kind" in e.local
  )
    return false;
  const local = e.local as Record<string, unknown>;
  return (
    closed(local, Object.keys(local)) &&
    ![c.baseHead, c.publishedHead].includes(local.head as typeof c.baseHead) &&
    local.candidateParent === c.baseline &&
    (action !== "PUSH_BRANCH" || local.head !== c.baseline) &&
    evaluateV43Action(action, { ...local, kind: "V43_LOCAL_QUALIFICATION" })
      .allowed
  );
}
/** Shape checks only. Authenticate current Git ancestry, exact staged/final
 * source/tree/diff, NEW qualification/review/audit and live PR20 independently.
 * Outer dependency hashes bind the actual candidate pair. Nested V43 dependency
 * hashes preserve historical provenance only, never current installed bytes or
 * reused authority. A PENDING dependency seal cannot authorize publication. */
export function evaluateV47Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return {
      allowed: true,
      reason: "V47_SCOPED_LOCAL_PUBLICATION_PREPARATION_ONLY",
    };
  if (action === "COMMIT")
    return {
      allowed: localReceipt(evidence, action),
      reason: "V47_NEW_EXACT_STAGED_REVIEW_AUDIT_RECEIPT_REQUIRED",
    };
  if (action === "PUSH_BRANCH") {
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
      evidence.kind === "V47_EXISTING_DRAFT_PUSH" &&
      localReceipt(evidence.local, action) &&
      evidence.repository === c.repository &&
      evidence.pullRequest === c.pullRequest &&
      evidence.headBranch === c.headBranch &&
      evidence.baseBranch === c.baseBranch &&
      evidence.baseHead === c.baseHead &&
      evidence.publishedHead === c.publishedHead &&
      evidence.state === "open" &&
      evidence.draft === true &&
      evidence.merged === false &&
      evidence.creationGrant === c.creationGrant &&
      evidence.fastForwardFromPublishedHead === true &&
      fresh(evidence.observedAt, evidence.checkedAt);
    return {
      allowed: valid,
      reason: "V47_NEW_FULL_SOURCE_RECEIPT_AND_FRESH_EXACT_PR20_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V47_NO_NEW_PR_READY_MERGE_REMOTE_OR_INHERITED_GRANT",
  };
}
