import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { INSPECTOR_BATCH_V45 } from "./project-control-v45.js";

export const TEST_KNOWLEDGE_VALIDITY_V46 = {
  version: "2026.09.30-v46",
  ownerDecision: "MP-OD-2026-09-30-V46",
  supersedes: "2026.09.30-v45",
  baseline: "86e5c967dd29e669ee0bc66e594fc9636a188c4e",
  baselineTree: "b9f39bc1d309f186d042f6d0ec9926c764112b2a",
  baselineParent: "d0f63188c50da6e204a4ecc1e91bed97f5ec44eb",
  repository: "Eak-dev/malispang-lineOA",
  workId: "MP-06",
  githubIssue: 12,
  stage: "LOCAL_TEST_KNOWLEDGE_UNTIL_PRODUCTION_RELEASE_ONLY",
  targetEnvironment: "LOCAL_ONLY_TEST_CONFIGURATION",
  accountName: "มะลิปัง TEST",
  validity: "PRE_RELEASE_ONLY_CLOSE_ON_PRODUCTION_RELEASE_OR_OWNER_REVOCATION",
  content: "EXACT_EXISTING_ANSWERS_AND_CHECKSUMS_UNCHANGED",
  history: "ARCHIVE_EXACT_PRIOR_MANIFEST_KEEP_DATED_RECORD_EXPIRY",
  workerHangClockFixture: {
    path: "worker-tests/mp-06-pilot-control.test.ts",
    before: "2026-09-08T00:00:00.000Z",
    after: "2026-10-01T00:00:00.000Z",
    scope: "ONE_EXACT_CLOCK_LITERAL_ONLY_ALL_OTHER_BYTES_UNCHANGED",
  },
  localImplementation: true,
  commit: false,
  publication: false,
  ready: false,
  merge: false,
  remoteExecution: false,
  production: false,
  priorPublicationAuthority: "SUSPENDED_NO_V45_OR_OLDER_RECEIPT_INHERITANCE",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  uatReadiness: "NOT_VERIFIED",
  forbidden:
    "COMMIT_PUSH_PR_READY_MERGE_DEPLOY_REMOTE_TEST_STORAGE_SQL_LINE_PROVIDER_PRODUCTION_U2_ISSUE_CLOSE",
} as const;

export const V46_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v46.ts",
  "tests/project-control-v46.test.ts",
  "tests/project-control-v45.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
  "src/faq.ts",
  "src/approved-knowledge-manifest.ts",
  "config/approved-knowledge-base/test-knowledge-base.json",
  "tests/fixtures/knowledge-base/test-knowledge-base-v1.json",
  "tests/approved-knowledge-base.test.ts",
  "tests/phase1b-approved-content.test.ts",
  "tests/test-knowledge-validity.test.ts",
  "tests/worker-approved-knowledge.test.ts",
  "scripts/validate-approved-knowledge-base.ts",
  "worker-tests/mp-06-pilot-control.test.ts",
] as const;
export const V46_ALLOWED_ACTIONS = [
  "LOCAL_IMPLEMENTATION",
  "LOCAL_VALIDATION",
  "LOCAL_ANALYSIS",
] as const;
const c = TEST_KNOWLEDGE_VALIDITY_V46;
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
const manifestPath = "config/approved-knowledge-base/test-knowledge-base.json";
const archivePath = "tests/fixtures/knowledge-base/test-knowledge-base-v1.json";
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("V46_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}
export function projectV46ToV45(
  r: Record<string, unknown>,
  w: Record<string, unknown>,
  s?: Record<string, unknown>,
) {
  if (r.version !== c.version) return;
  r.version = c.supersedes;
  r.ownerDecision = {
    decisionId: INSPECTOR_BATCH_V45.ownerDecision,
    decidedAt: "2026-09-30",
    supersedes: INSPECTOR_BATCH_V45.supersedes,
  };
  w.roadmapVersion = c.supersedes;
  delete w.testKnowledgeValidityV46;
  if (s) {
    s.required = (s.required as string[]).filter(
      (key) => key !== "testKnowledgeValidityV46",
    );
    const properties = object(s.properties);
    delete properties.testKnowledgeValidityV46;
    properties.roadmapVersion = { const: c.supersedes };
  }
}
export function v46AuthoritySummary() {
  return {
    status: c.stage,
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    allowedActions: [...V46_ALLOWED_ACTIONS],
    allowedPaths: [...V46_ALLOWED_PATHS],
    commitAuthorized: false,
    publicationAuthorized: false,
    readyAuthorized: false,
    mergeAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    priorPublicationAuthority: c.priorPublicationAuthority,
    storageHold: c.storageHold,
    uatReadiness: c.uatReadiness,
  } as const;
}
export function evaluateV46Action(action: string) {
  return (V46_ALLOWED_ACTIONS as readonly string[]).includes(action)
    ? { allowed: true, reason: "V46_SCOPED_LOCAL_TEST_KNOWLEDGE_ONLY" }
    : {
        allowed: false,
        reason: "V46_NO_PUBLICATION_REMOTE_OR_INHERITED_GRANT",
      };
}

/** Closed porcelain-v1 parser for this unstaged-only local package. */
export function parseV46LocalStatus(raw: unknown): string[] | null {
  if (typeof raw !== "string") return null;
  if (raw === "") return [];
  if (!raw.endsWith("\0")) return null;
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw.slice(0, -1).split("\0")) {
    if (
      entry.length < 4 ||
      entry[2] !== " " ||
      ![" M", " T", " D", "??"].includes(entry.slice(0, 2))
    )
      return null;
    const path = entry.slice(3);
    if (
      path
        .split("/")
        .some((part) => part === "" || part === "." || part === "..") ||
      seen.has(path)
    )
      return null;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

/** A local overlay only. Historical v45 publication remains frozen at baseline. */
export function inspectV46Repository(cwd: string, git: string) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", ...args],
      { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
  const split = (value: string) => value.split("\0").filter(Boolean);
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V46_FULL_HISTORY_REQUIRED");
  const gitDirectory = run("rev-parse", "--absolute-git-dir").trim();
  const indexPath = join(gitDirectory, "index");
  const initialIndex = readFileSync(indexPath);
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
    throw new Error("V46_IN_PROGRESS_OR_GRAFT_STATE");
  if (run("for-each-ref", "--format=%(refname)", "refs/replace").trim())
    throw new Error("V46_REPLACEMENT_REFS_REJECTED");
  const head = run("rev-parse", "HEAD").trim();
  if (head !== c.baseline)
    throw new Error("V46_EXACT_UNCOMMITTED_BASELINE_REQUIRED");
  if (
    run("rev-parse", "HEAD^{tree}").trim() !== c.baselineTree ||
    !isDeepStrictEqual(
      run("rev-list", "--parents", "-n", "1", head).trim().split(" ").slice(1),
      [c.baselineParent],
    )
  )
    throw new Error("V46_BASELINE_IDENTITY_MISMATCH");
  if (
    split(run("ls-files", "-v", "-z")).some((entry) => /^[a-zS] /u.test(entry))
  )
    throw new Error("V46_HIDDEN_INDEX_FLAGS_REJECTED");
  if (run("diff", "--cached", "--no-renames", "--name-only", head).trim())
    throw new Error("V46_INDEX_MUST_REMAIN_BASELINE");
  // Worktree diff can refresh index stat metadata despite --no-optional-locks.
  // Status sees real changes and identical-content rewrites without that write.
  const changed = parseV46LocalStatus(
    run(
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
      "--ignore-submodules=none",
    ),
  );
  if (changed === null) throw new Error("V46_LOCAL_STATUS_UNVERIFIED");
  if (
    changed.some(
      (path) => !(V46_ALLOWED_PATHS as readonly string[]).includes(path),
    )
  )
    throw new Error("V46_PATH_OUTSIDE_SCOPE");
  for (const path of changed) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const stat = lstatSync(join(cwd, ...parts.slice(0, i)));
      if (i === parts.length ? !stat.isFile() : !stat.isDirectory())
        throw new Error("V46_NON_REGULAR_PATH");
    }
  }
  const original = (path: string) => run("show", head + ":" + path);
  const read = (path: string) => readFileSync(join(cwd, path), "utf8");
  const r = object(JSON.parse(read(controls[0]))),
    w = object(JSON.parse(read(controls[1]))),
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
    !isDeepStrictEqual(w.testKnowledgeValidityV46, c) ||
    !Array.isArray(s.required) ||
    s.required.filter((key) => key === "testKnowledgeValidityV46").length !==
      1 ||
    !isDeepStrictEqual(properties.testKnowledgeValidityV46, { const: c }) ||
    !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
  )
    throw new Error("V46_EXACT_TRANSITION_REQUIRED");
  projectV46ToV45(r, w, s);
  for (const [i, value] of [r, w, s].entries())
    if (!isDeepStrictEqual(value, JSON.parse(original(controls[i]!))))
      throw new Error("V46_INHERITED_CONTROL_DRIFT");
  for (const path of appendPaths)
    if (!read(path).startsWith(original(path)))
      throw new Error("V46_HISTORY_REWRITTEN");
  const header = "# MalisPang Project Control\n\n";
  if (
    !read("PROJECT_CONTROL.md").startsWith(header) ||
    !read("PROJECT_CONTROL.md").endsWith(
      original("PROJECT_CONTROL.md").slice(header.length),
    )
  )
    throw new Error("V46_CONTROL_HISTORY_REWRITTEN");
  if (existsSync(join(cwd, archivePath))) {
    if (
      !lstatSync(join(cwd, archivePath)).isFile() ||
      read(archivePath) !== original(manifestPath)
    )
      throw new Error("V46_PRIOR_KNOWLEDGE_ARCHIVE_MISMATCH");
  } else if (read(manifestPath) !== original(manifestPath))
    throw new Error("V46_PRIOR_KNOWLEDGE_ARCHIVE_REQUIRED");
  const currentCategories = object(
      object(JSON.parse(read(manifestPath))).categories,
    ),
    priorCategories = object(
      object(JSON.parse(original(manifestPath))).categories,
    );
  if (
    !isDeepStrictEqual(
      Object.keys(currentCategories),
      Object.keys(priorCategories),
    )
  )
    throw new Error("V46_KNOWLEDGE_CATEGORIES_CHANGED");
  for (const key of Object.keys(priorCategories)) {
    const prior = object(priorCategories[key]),
      current = object(currentCategories[key]);
    for (const field of [
      "customerFacingAnswer",
      "checksum",
      "keywords",
      "owner",
      "status",
    ])
      if (!isDeepStrictEqual(current[field], prior[field]))
        throw new Error("V46_KNOWLEDGE_CONTENT_CHANGED");
  }
  const clock = c.workerHangClockFixture;
  const priorWorker = original(clock.path);
  const beforeClock = `    vi.setSystemTime(new Date("${clock.before}"));`;
  const afterClock = `    vi.setSystemTime(new Date("${clock.after}"));`;
  if (priorWorker.split(beforeClock).length !== 2)
    throw new Error("V46_WORKER_CLOCK_BASELINE_NOT_UNIQUE");
  const candidateWorker = priorWorker.replace(beforeClock, afterClock);
  const currentWorker = readFileSync(join(cwd, clock.path));
  const workerClockFixtureState = currentWorker.equals(
    Buffer.from(candidateWorker, "utf8"),
  )
    ? "RENEWAL_COMPATIBLE"
    : currentWorker.equals(Buffer.from(priorWorker, "utf8"))
      ? "BASELINE_PRE_RENEWAL"
      : "OUT_OF_SCOPE";
  if (workerClockFixtureState === "OUT_OF_SCOPE")
    throw new Error("V46_WORKER_CLOCK_EXACT_SINGLE_LITERAL_REQUIRED");
  if (
    run("rev-parse", "HEAD").trim() !== head ||
    !readFileSync(indexPath).equals(initialIndex) ||
    existsSync(join(gitDirectory, "index.lock"))
  )
    throw new Error("V46_OPERATOR_STATE_CHANGED");
  return {
    head,
    mode: "UNCOMMITTED_LOCAL_OVERLAY" as const,
    changedPaths: changed.sort(),
    workerClockFixtureState,
    commitAuthorized: false as const,
    publicationAuthorized: false as const,
    remoteExecutionAuthorized: false as const,
    productionAuthorized: false as const,
  };
}
