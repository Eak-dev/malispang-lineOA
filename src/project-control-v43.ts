import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  LOCAL_HARNESS_REPAIR_V42,
  V42_ALLOWED_PATHS,
  projectV42ToV41,
} from "./project-control-v42.js";

export const HARNESS_PUBLICATION_V43 = {
  version: "2026.09.29-v43",
  ownerDecision: "MP-OD-2026-09-29-V43",
  supersedes: "2026.09.29-v42",
  baseline: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  repository: "Eak-dev/malispang-lineOA",
  headBranch: "codex/mp06-harness-v43",
  baseBranch: "codex/mp-06-guardrailed-ai",
  workId: "MP-06",
  githubIssue: 12,
  stage: "QUALIFIED_HARNESS_DRAFT_PUBLICATION_ONLY",
  snapshotSha256:
    "0161cfb6213ed869ea23b7370ad147aec12e7c96baa4fcfcb76e461aa1e6c4f1",
  patchSha256:
    "4a271328b3822f4c1fd84a1e05fed040612ce4e034f95f2fa1397b3ff2835115",
  priorV42SourceSealSha256:
    "8a33f2339e6cc801ad5ca8a5e9c935e83fc7b604d54702859f1bcd085be51353",
  maximumDraftPullRequests: 1,
  priorIntegrationPr: 19,
  priorIntegrationGrant: "CONSUMED_NO_REPLACEMENT",
  dependencyPatch: {
    parent: "miniflare@5.20260811.0-alpha",
    package: "undici",
    from: "7.29.0",
    to: "7.29.1",
    advisory: "GHSA-3wwx-pv8p-q78v",
    status: "SEALED",
    workspaceSha256:
      "6003269d4862bed78638c80e0610ebdf2a6eb9edf9bc4041754700ce85f9f92a",
    lockfileSha256:
      "9000c0273ad14ca8876409d0b240f5737390aebf5c8f28509f720d3a4a6d810b",
  },
  auditGate: "ZERO_AT_EVERY_SEVERITY_NO_SUPPRESSION",
  watchdogMs: 5000,
  retries: 0,
  remoteExecution: false,
  ready: false,
  merge: false,
  production: false,
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  forbidden:
    "RUNTIME_WORKFLOW_OTHER_DEPENDENCY_READY_MERGE_DEPLOY_REMOTE_TEST_STORAGE_SQL_LINE_PROVIDER_PRODUCTION_U2_ISSUE_CLOSE",
} as const;
export const V43_ALLOWED_PATHS = [
  ...V42_ALLOWED_PATHS,
  "src/project-control-v43.ts",
  "tests/project-control-v43.test.ts",
  "tests/fixtures/mp06-v42-qualified/snapshot.json",
  "tests/fixtures/mp06-v42-qualified/overlay.patch",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
] as const;
const c = HARNESS_PUBLICATION_V43;
const snapshotPath = "tests/fixtures/mp06-v42-qualified/snapshot.json";
const patchPath = "tests/fixtures/mp06-v42-qualified/overlay.patch";
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
const frozen = [
  "src/project-control-v42.ts",
  "tests/project-control.test.ts",
] as const;
const dependencies = ["pnpm-workspace.yaml", "pnpm-lock.yaml"] as const;
const sha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const hash = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!record(value)) throw new Error("V43_OBJECT_REQUIRED");
  return value;
}
function closed(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    record(value) &&
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
export const v43PathsAllowed = (paths: readonly string[]) =>
  paths.every((path) =>
    (V43_ALLOWED_PATHS as readonly string[]).includes(path),
  );
export function projectV43ToV42(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: LOCAL_HARNESS_REPAIR_V42.ownerDecision,
    decidedAt: "2026-09-29",
    supersedes: LOCAL_HARNESS_REPAIR_V42.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.harnessPublicationV43;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "harnessPublicationV43",
    );
    const properties = object(s.properties);
    delete properties.harnessPublicationV43;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v43AuthoritySummary() {
  return {
    status: c.stage,
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    allowedActions: [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ],
    conditionalActions: ["COMMIT", "PUSH_BRANCH", "CREATE_DRAFT_PR"],
    allowedPaths: [...V43_ALLOWED_PATHS],
    priorIntegrationGrant: c.priorIntegrationGrant,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    storageHold: c.storageHold,
    uatReadiness: "NOT_VERIFIED",
    receiptProvenance:
      "INDEPENDENT_AUTHENTICATION_AND_DURABLE_EXTERNAL_CREATION_LEDGER_REQUIRED",
  } as const;
}
export interface QualifiedV42Snapshot {
  format: number;
  baseline: string;
  qualification: {
    sourceSealSha256: string;
    sourcePaths: number;
    testsPassed: number;
    stagesPassed: number;
    stage: string;
  };
  paths: string[];
  hashes: Record<string, string>;
  controls: Record<string, string>;
  documents: Record<
    string,
    { kind: string; header?: string; addition: string }
  >;
  patchSha256: string;
}
export function readQualifiedV42Snapshot(cwd: string): QualifiedV42Snapshot {
  const text = readFileSync(join(cwd, snapshotPath), "utf8");
  if (
    hash(text) !== c.snapshotSha256 ||
    hash(readFileSync(join(cwd, patchPath))) !== c.patchSha256
  )
    throw new Error("V43_QUALIFIED_SNAPSHOT_SEAL_MISMATCH");
  const s = JSON.parse(text) as QualifiedV42Snapshot;
  if (
    s.format !== 1 ||
    s.baseline !== c.baseline ||
    s.patchSha256 !== c.patchSha256 ||
    s.qualification.sourceSealSha256 !== c.priorV42SourceSealSha256 ||
    s.qualification.sourcePaths !== 237 ||
    s.qualification.testsPassed !== 1619 ||
    s.qualification.stagesPassed !== 26 ||
    !isDeepStrictEqual(s.paths, [...V42_ALLOWED_PATHS].sort()) ||
    !isDeepStrictEqual(Object.keys(s.hashes).sort(), s.paths) ||
    !isDeepStrictEqual(Object.keys(s.controls).sort(), [...controls].sort()) ||
    !isDeepStrictEqual(Object.keys(s.documents).sort(), [...documents].sort())
  )
    throw new Error("V43_QUALIFIED_SNAPSHOT_SHAPE_MISMATCH");
  for (const path of controls)
    if (hash(s.controls[path]!) !== s.hashes[path])
      throw new Error("V43_QUALIFIED_CONTROL_HASH_MISMATCH");
  return s;
}

export interface V43CheckoutReceipt {
  sha: string | undefined;
  ref: string | undefined;
  merge: string;
  parents: readonly string[];
  tree: string;
  sourceTree: string;
}
export interface V43PrReceipt {
  repository: string;
  pr: number;
  baseBranch: string;
  headBranch: string;
  base: string;
  head: string;
  merge: string;
  tree: string;
}
export function validateV43PullRequestReceipt(
  event: unknown,
  observed: V43CheckoutReceipt,
): V43PrReceipt | null {
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
  const number = event.number;
  if (
    !Number.isSafeInteger(number) ||
    Number(number) <= 0 ||
    [16, 18, 19].includes(Number(number)) ||
    pr.number !== number ||
    event.repository.full_name !== c.repository ||
    pr.head.repo.full_name !== c.repository ||
    pr.base.repo.full_name !== c.repository ||
    pr.head.ref !== c.headBranch ||
    pr.base.ref !== c.baseBranch ||
    pr.base.sha !== c.baseline ||
    pr.state !== "open" ||
    pr.draft !== true ||
    pr.merged === true ||
    !sha(pr.head.sha) ||
    pr.head.sha === c.baseline ||
    !sha(observed.merge) ||
    !sha(observed.tree) ||
    observed.sha !== observed.merge ||
    observed.ref !== "refs/pull/" + Number(number) + "/merge" ||
    !isDeepStrictEqual(observed.parents, [c.baseline, pr.head.sha]) ||
    observed.tree !== observed.sourceTree ||
    (pr.merge_commit_sha !== undefined &&
      pr.merge_commit_sha !== null &&
      !sha(pr.merge_commit_sha))
  )
    return null;
  return {
    repository: c.repository,
    pr: Number(number),
    baseBranch: c.baseBranch,
    headBranch: c.headBranch,
    base: c.baseline,
    head: pr.head.sha,
    merge: observed.merge,
    tree: observed.tree,
  };
}

/** Read-only Git structure check; never a hosted CI/review receipt or merge authority. */
export function inspectV43Repository(
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
  const split = (value: string) => value.split("\0").filter(Boolean);
  const lines = (value: string) => value.trim().split("\n").filter(Boolean);
  const readBlobs = (revision: string, requested: readonly string[]) => {
    const paths = [...new Set(requested)];
    const expressions = paths.map((path) => revision + ":" + path);
    const output = execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", "cat-file", "--batch"],
      {
        cwd,
        input: expressions.join("\n") + "\n",
        maxBuffer: paths.length * (16 * 1024 * 1024 + 1024),
      },
    );
    let offset = 0;
    const values = new Map<string, string>();
    for (const [index, expression] of expressions.entries()) {
      const end = output.indexOf(10, offset);
      if (end < offset) throw new Error("V43_BLOB_HEADER_INVALID");
      const header = output.subarray(offset, end).toString("utf8");
      offset = end + 1;
      if (header === expression + " missing") continue;
      const match = /^([a-f0-9]{40}) blob (\d+)$/u.exec(header),
        length = Number(match?.[2]);
      if (
        !match ||
        !Number.isSafeInteger(length) ||
        length < 0 ||
        length > 16 * 1024 * 1024 ||
        offset + length >= output.length ||
        output[offset + length] !== 10
      )
        throw new Error("V43_BLOB_FRAME_INVALID");
      values.set(
        paths[index]!,
        output.subarray(offset, offset + length).toString("utf8"),
      );
      offset += length + 1;
    }
    if (offset !== output.length) throw new Error("V43_BLOB_TRAILING_DATA");
    return (path: string): string => {
      const value = values.get(path);
      if (value === undefined)
        throw new Error("V43_REQUIRED_BLOB_MISSING:" + path);
      return value;
    };
  };
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V43_FULL_HISTORY_REQUIRED");
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
    throw new Error("V43_IN_PROGRESS_OR_GRAFT_STATE");
  if (run("for-each-ref", "--format=%(refname)", "refs/replace").trim())
    throw new Error("V43_REPLACEMENT_REFS_REJECTED");
  if (
    split(run("ls-files", "-v", "-z")).some((entry) => /^[a-zS] /u.test(entry))
  )
    throw new Error("V43_HIDDEN_INDEX_FLAGS_REJECTED");
  const head = run("rev-parse", "HEAD").trim(),
    tree = run("rev-parse", "HEAD^{tree}").trim();
  const parents = (revision: string) =>
    run("rev-list", "--parents", "-n", "1", revision)
      .trim()
      .split(" ")
      .slice(1);
  if (
    run("rev-parse", c.baseline + "^{tree}").trim() !==
      LOCAL_HARNESS_REPAIR_V42.baselineTree ||
    !isDeepStrictEqual(parents(c.baseline), [
      LOCAL_HARNESS_REPAIR_V42.publishedParent,
      LOCAL_HARNESS_REPAIR_V42.sourceCommit,
    ])
  )
    throw new Error("V43_BASELINE_IDENTITY_MISMATCH");
  let source = head;
  let mode = head === c.baseline ? "LOCAL_SOURCE" : "SOURCE_COMMIT";
  const merges = lines(run("rev-list", "--merges", c.baseline + ".." + head));
  if (receipt) {
    if (
      receipt.repository !== c.repository ||
      receipt.baseBranch !== c.baseBranch ||
      receipt.headBranch !== c.headBranch ||
      receipt.base !== c.baseline ||
      !Number.isSafeInteger(receipt.pr) ||
      receipt.pr <= 0 ||
      [16, 18, 19].includes(receipt.pr) ||
      receipt.merge !== head ||
      receipt.tree !== tree ||
      !isDeepStrictEqual(parents(head), [c.baseline, receipt.head]) ||
      !isDeepStrictEqual(merges, [head]) ||
      run("rev-parse", receipt.head + "^{tree}").trim() !== tree
    )
      throw new Error("V43_PR_CONTEXT_IDENTITY_MISMATCH");
    source = receipt.head;
    mode = "DRAFT_PR_SYNTHETIC_MERGE";
  } else if (merges.length)
    throw new Error("V43_MERGE_NOT_PUBLICATION_AUTHORITY");
  run("merge-base", "--is-ancestor", c.baseline, source);
  if (run("rev-list", "--merges", c.baseline + ".." + source).trim())
    throw new Error("V43_SOURCE_MERGE_REJECTED");
  const clean =
    run("status", "--porcelain=v1", "--untracked-files=all").trim() === "";
  if (receipt && !clean) throw new Error("V43_PR_CHECKOUT_DIRTY");
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
  if (!v43PathsAllowed(changed)) throw new Error("V43_PATH_OUTSIDE_SCOPE");
  for (const path of changed) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const stat = lstatSync(join(cwd, ...parts.slice(0, i)));
      if (i === parts.length ? !stat.isFile() : !stat.isDirectory())
        throw new Error("V43_NON_REGULAR_PATH");
    }
  }
  if (
    changed.length &&
    split(run("ls-files", "--stage", "-z", "--", ...changed)).some(
      (entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry),
    )
  )
    throw new Error("V43_NON_REGULAR_INDEX_PATH");
  for (const r of revisions)
    if (
      split(run("ls-tree", "-r", "-z", r, "--", ...changed)).some(
        (entry) => !/^(100644|100755) blob [a-f0-9]+\t/u.test(entry),
      )
    )
      throw new Error("V43_NON_REGULAR_HISTORY_PATH");
  const snapshot = readQualifiedV42Snapshot(cwd);
  const baseline = readBlobs(c.baseline, [
    ...controls,
    ...documents,
    ...dependencies,
  ]);
  const qualified = new Map<string, string>(Object.entries(snapshot.controls));
  for (const path of documents) {
    const d = snapshot.documents[path]!,
      previous = baseline(path);
    const text =
      d.kind === "append"
        ? previous + d.addition
        : d.kind === "insert-after-header" &&
            d.header &&
            previous.startsWith(d.header)
          ? d.header + d.addition + previous.slice(d.header.length)
          : "";
    if (!text || hash(text) !== snapshot.hashes[path])
      throw new Error("V43_QUALIFIED_DOCUMENT_HASH_MISMATCH");
    qualified.set(path, text);
  }
  const inherited = controls.map((path) =>
    object(JSON.parse(snapshot.controls[path]!)),
  );
  projectV42ToV41(inherited[0]!, inherited[1]!, inherited[2]);
  for (const [i, path] of controls.entries())
    if (!isDeepStrictEqual(inherited[i], JSON.parse(baseline(path))))
      throw new Error("V43_QUALIFIED_BASELINE_DRIFT");
  const check = (
    read: (path: string) => string,
    permitBaseline: boolean,
    requirePatched: boolean,
  ) => {
    const r = object(JSON.parse(read(controls[0])));
    if (permitBaseline && r.version === LOCAL_HARNESS_REPAIR_V42.supersedes) {
      for (const path of [...controls, ...documents, ...dependencies])
        if (read(path) !== baseline(path))
          throw new Error("V43_PARTIAL_BASELINE_INDEX_REJECTED");
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
        decidedAt: "2026-09-29",
        supersedes: c.supersedes,
      }) ||
      !isDeepStrictEqual(w.harnessPublicationV43, c) ||
      !Array.isArray(s.required) ||
      s.required.filter((key) => key === "harnessPublicationV43").length !==
        1 ||
      !isDeepStrictEqual(properties.harnessPublicationV43, { const: c }) ||
      !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
    )
      throw new Error("V43_EXACT_TRANSITION_REQUIRED");
    projectV43ToV42(r, w, s);
    for (const [i, value] of [r, w, s].entries())
      if (
        !isDeepStrictEqual(value, JSON.parse(snapshot.controls[controls[i]!]!))
      )
        throw new Error("V43_INHERITED_CONTROL_DRIFT");
    for (const path of appendPaths)
      if (!read(path).startsWith(qualified.get(path)!))
        throw new Error("V43_HISTORY_REWRITTEN");
    const header = "# MalisPang Project Control\n\n";
    if (
      !read("PROJECT_CONTROL.md").startsWith(header) ||
      !read("PROJECT_CONTROL.md").endsWith(
        qualified.get("PROJECT_CONTROL.md")!.slice(header.length),
      )
    )
      throw new Error("V43_CONTROL_HISTORY_REWRITTEN");
    for (const path of frozen)
      if (hash(read(path)) !== snapshot.hashes[path])
        throw new Error("V43_FROZEN_V42_PATH_DRIFT:" + path);
    if (
      hash(read(snapshotPath)) !== c.snapshotSha256 ||
      hash(read(patchPath)) !== c.patchSha256
    )
      throw new Error("V43_SNAPSHOT_HISTORY_DRIFT");
    const dependencyHashes = dependencies.map((path) => hash(read(path)));
    const original = dependencies.map((path) => hash(baseline(path)));
    const patched = [
      c.dependencyPatch.workspaceSha256,
      c.dependencyPatch.lockfileSha256,
    ];
    if (
      !isDeepStrictEqual(dependencyHashes, patched) &&
      !(permitBaseline && isDeepStrictEqual(dependencyHashes, original))
    )
      throw new Error("V43_DEPENDENCY_PATCH_NOT_EXACT");
    if (
      requirePatched &&
      (String(c.dependencyPatch.status) !== "SEALED" ||
        !isDeepStrictEqual(dependencyHashes, patched))
    )
      throw new Error("V43_DEPENDENCY_PATCH_NOT_QUALIFIED");
  };
  check(
    (path) => readFileSync(join(cwd, path), "utf8"),
    head === c.baseline,
    head !== c.baseline,
  );
  const observedPaths = [
    ...controls,
    ...documents,
    ...frozen,
    snapshotPath,
    patchPath,
    ...dependencies,
  ];
  check(readBlobs("", observedPaths), true, head !== c.baseline);
  for (const r of revisions) check(readBlobs(r, observedPaths), false, true);
  return {
    mode,
    head,
    tree,
    sourceHead: source,
    clean,
    remoteExecutionAuthorized: false as const,
    mergeAuthorized: false as const,
  };
}

export interface V43LocalReceipt {
  kind: "V43_LOCAL_QUALIFICATION";
  stage: "PRE_COMMIT" | "POST_COMMIT";
  repository: string;
  headBranch: string;
  baseBranch: string;
  baseHead: string;
  head: string;
  candidateParent: string;
  tree: string;
  qualifiedTree: string;
  diffSha256: string;
  reviewedDiffSha256: string;
  snapshotSha256: string;
  priorV42SourceSealSha256: string;
  validation: "FOCUSED_PASS" | "FULL_PASS";
  independentReview: "NO_ACTIONABLE_FINDINGS";
  workingTreeMatchesIndex: true;
  workingTreeClean: boolean;
  audit: "ZERO_AT_EVERY_SEVERITY";
  auditTree: string;
  workspaceSha256: string;
  lockfileSha256: string;
}
export interface V43CreationReceipt {
  kind: "V43_DRAFT_CREATION";
  local: V43LocalReceipt;
  creationState: "UNUSED";
  existingPullRequests: readonly number[];
  observedAt: string;
  checkedAt: string;
}
const localKeys = [
  "kind",
  "stage",
  "repository",
  "headBranch",
  "baseBranch",
  "baseHead",
  "head",
  "candidateParent",
  "tree",
  "qualifiedTree",
  "diffSha256",
  "reviewedDiffSha256",
  "snapshotSha256",
  "priorV42SourceSealSha256",
  "validation",
  "independentReview",
  "workingTreeMatchesIndex",
  "workingTreeClean",
  "audit",
  "auditTree",
  "workspaceSha256",
  "lockfileSha256",
] as const;
function localReceipt(
  e: unknown,
  stage: "PRE_COMMIT" | "POST_COMMIT",
): e is V43LocalReceipt {
  return (
    closed(e, localKeys) &&
    e.kind === "V43_LOCAL_QUALIFICATION" &&
    e.stage === stage &&
    e.repository === c.repository &&
    e.headBranch === c.headBranch &&
    e.baseBranch === c.baseBranch &&
    e.baseHead === c.baseline &&
    sha(e.head) &&
    sha(e.candidateParent) &&
    sha(e.tree) &&
    e.tree === e.qualifiedTree &&
    digest(e.diffSha256) &&
    e.diffSha256 === e.reviewedDiffSha256 &&
    e.snapshotSha256 === c.snapshotSha256 &&
    e.priorV42SourceSealSha256 === c.priorV42SourceSealSha256 &&
    e.independentReview === "NO_ACTIONABLE_FINDINGS" &&
    e.workingTreeMatchesIndex === true &&
    e.audit === "ZERO_AT_EVERY_SEVERITY" &&
    e.auditTree === e.tree &&
    String(c.dependencyPatch.status) === "SEALED" &&
    e.workspaceSha256 === c.dependencyPatch.workspaceSha256 &&
    e.lockfileSha256 === c.dependencyPatch.lockfileSha256 &&
    (stage === "PRE_COMMIT"
      ? e.head === e.candidateParent &&
        e.validation === "FOCUSED_PASS" &&
        e.workingTreeClean === false
      : e.head !== c.baseline &&
        e.head !== e.candidateParent &&
        e.validation === "FULL_PASS" &&
        e.workingTreeClean === true)
  );
}
/** Rich receipts still require independent authentication. This pure gate never
 * observes GitHub, creates a PR, or owns the external single-use creation ledger. */
export function evaluateV43Action(action: string, evidence?: unknown) {
  if (
    ["LOCAL_IMPLEMENTATION", "LOCAL_VALIDATION", "LOCAL_ANALYSIS"].includes(
      action,
    )
  )
    return { allowed: true, reason: "V43_SCOPED_LOCAL_WORK_ONLY" };
  if (action === "COMMIT")
    return {
      allowed: localReceipt(evidence, "PRE_COMMIT"),
      reason: "V43_EXACT_PRE_COMMIT_RECEIPT_REQUIRED",
    };
  if (action === "PUSH_BRANCH")
    return {
      allowed: localReceipt(evidence, "POST_COMMIT"),
      reason: "V43_EXACT_FULL_POST_COMMIT_RECEIPT_REQUIRED",
    };
  if (action === "CREATE_DRAFT_PR") {
    const valid =
      closed(evidence, [
        "kind",
        "local",
        "creationState",
        "existingPullRequests",
        "observedAt",
        "checkedAt",
      ]) &&
      evidence.kind === "V43_DRAFT_CREATION" &&
      localReceipt(evidence.local, "POST_COMMIT") &&
      evidence.creationState === "UNUSED" &&
      Array.isArray(evidence.existingPullRequests) &&
      evidence.existingPullRequests.length === 0 &&
      typeof evidence.observedAt === "string" &&
      typeof evidence.checkedAt === "string" &&
      Number.isFinite(Date.parse(evidence.observedAt)) &&
      Number.isFinite(Date.parse(evidence.checkedAt)) &&
      Date.parse(evidence.checkedAt) >= Date.parse(evidence.observedAt) &&
      Date.parse(evidence.checkedAt) - Date.parse(evidence.observedAt) <=
        120000 &&
      Date.now() >= Date.parse(evidence.checkedAt) &&
      Date.now() - Date.parse(evidence.checkedAt) <= 120000 &&
      Date.now() - Date.parse(evidence.observedAt) <= 120000;
    return {
      allowed: valid,
      reason: "V43_FRESH_SINGLE_DRAFT_CREATION_RECEIPT_REQUIRED",
    };
  }
  return {
    allowed: false,
    reason: "V43_NO_READY_MERGE_REMOTE_OR_INHERITED_GRANT",
  };
}
