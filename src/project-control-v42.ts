import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";

export const LOCAL_HARNESS_REPAIR_V42 = {
  version: "2026.09.29-v42",
  ownerDecision: "MP-OD-2026-09-29-V42",
  supersedes: "2026.09.29-v41",
  baseline: "a05bab89bc6d5cdf2914581ed658be86dd00b062",
  baselineTree: "7d3ede2902d545092300171faa83fa403f5d3e1e",
  sourceCommit: "b1ab0d6ce86487c324df291235d53e86ca5da66e",
  publishedParent: "35b67ab87ecd052ab80f450d766c9eabd2991861",
  workId: "MP-06",
  githubIssue: 12,
  stage: "LOCAL_HISTORICAL_HARNESS_REPAIR_ONLY",
  targetEnvironment: "LOCAL_ONLY",
  integrationPr: 19,
  integrationGrant: "CONSUMED_AT_BASELINE_NO_REPLACEMENT",
  localImplementation: true,
  commit: false,
  publication: false,
  remoteExecution: false,
  production: false,
  watchdogMs: 5000,
  retries: 0,
  invariants:
    "HISTORICAL_ASSERTIONS_HASHES_PATHS_CLEANUP_OPERATOR_GUARDS_UNCHANGED",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  forbidden:
    "RUNTIME_WORKFLOW_DEPENDENCY_COMMIT_PUSH_PR_MERGE_DEPLOY_REMOTE_TEST_PRODUCTION_ISSUE_CLOSE",
} as const;

export const V42_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v42.ts",
  "tests/project-control-v42.test.ts",
  "tests/project-control-integration.test.ts",
  "tests/project-control.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;
export const V42_ALLOWED_ACTIONS = [
  "LOCAL_IMPLEMENTATION",
  "LOCAL_VALIDATION",
  "LOCAL_ANALYSIS",
] as const;

const c = LOCAL_HARNESS_REPAIR_V42;
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
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("V42_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}
export const v42PathsAllowed = (paths: readonly string[]) =>
  paths.every((path) =>
    (V42_ALLOWED_PATHS as readonly string[]).includes(path),
  );

export function projectV42ToV41(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
  schema?: Record<string, unknown>,
): void {
  if (roadmap.version !== c.version) return;
  roadmap.version = c.supersedes;
  roadmap.ownerDecision = {
    decisionId: "MP-OD-2026-09-29-V41",
    decidedAt: "2026-09-29",
    supersedes: "2026.09.28-v40",
  };
  work.roadmapVersion = c.supersedes;
  delete work.localHarnessRepairV42;
  if (schema) {
    schema.required = (schema.required as string[]).filter(
      (key) => key !== "localHarnessRepairV42",
    );
    const properties = object(schema.properties);
    delete properties.localHarnessRepairV42;
    properties.roadmapVersion = { const: c.supersedes };
  }
}

export function v42AuthoritySummary() {
  return {
    status: c.stage,
    controlVersion: c.version,
    ownerDecision: c.ownerDecision,
    allowedActions: [...V42_ALLOWED_ACTIONS],
    allowedPaths: [...V42_ALLOWED_PATHS],
    commitAuthorized: false,
    publicationAuthorized: false,
    remoteExecutionAuthorized: false,
    productionAuthorized: false,
    integrationGrant: c.integrationGrant,
    storageHold: c.storageHold,
    toolPermission: "NOT_EVALUATED",
    uatReadiness: "NOT_VERIFIED",
    sourceRoles: {
      publishedControlBaseline: c.baseline,
      publishedControlVersion: c.supersedes,
      runtimeCandidate: "1790da58635edcee154b60d76730248e8130c2d3",
      evidenceHead: "NOT_OBSERVED_BY_PURE_SUMMARY",
      deployedVersion: "NOT_OBSERVED_BY_PURE_SUMMARY",
    },
  } as const;
}

/** This package permits an uncommitted local overlay at the actual merge only.
 * It neither alters the historical v41 inspector nor inherits its spent grant. */
export function inspectV42Repository(cwd: string, git: string) {
  const run = (...args: string[]) =>
    execFileSync(
      git,
      ["--no-replace-objects", "--no-optional-locks", ...args],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  if (run("rev-parse", "--is-shallow-repository").trim() !== "false")
    throw new Error("V42_FULL_HISTORY_REQUIRED");
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
    throw new Error("V42_IN_PROGRESS_OR_GRAFT_STATE");
  if (run("for-each-ref", "--format=%(refname)", "refs/replace").trim())
    throw new Error("V42_REPLACEMENT_REFS_REJECTED");
  const head = run("rev-parse", "HEAD").trim();
  if (head !== c.baseline)
    throw new Error("V42_EXACT_UNCOMMITTED_BASELINE_REQUIRED");
  if (
    run("rev-parse", "HEAD^{tree}").trim() !== c.baselineTree ||
    !isDeepStrictEqual(
      run("rev-list", "--parents", "-n", "1", head).trim().split(" ").slice(1),
      [c.publishedParent, c.sourceCommit],
    )
  )
    throw new Error("V42_BASELINE_IDENTITY_MISMATCH");
  const split = (value: string) => value.split("\0").filter(Boolean);
  // Lower-case tags mean assume-unchanged; S means skip-worktree. Either can
  // conceal protected working bytes from normal diff/status observations.
  if (
    split(run("ls-files", "-v", "-z")).some((entry) => /^[a-zS] /u.test(entry))
  )
    throw new Error("V42_HIDDEN_INDEX_FLAGS_REJECTED");
  const changed = [
    ...new Set([
      ...split(run("diff", "--no-renames", "--name-only", "-z", head)),
      ...split(
        run("diff", "--cached", "--no-renames", "--name-only", "-z", head),
      ),
      ...split(run("ls-files", "--others", "--exclude-standard", "-z")),
    ]),
  ];
  if (!v42PathsAllowed(changed)) throw new Error("V42_PATH_OUTSIDE_SCOPE");
  for (const path of changed) {
    const parts = path.split("/");
    for (let length = 1; length <= parts.length; length++) {
      const stat = lstatSync(join(cwd, ...parts.slice(0, length)));
      if (length === parts.length ? !stat.isFile() : !stat.isDirectory())
        throw new Error("V42_NON_REGULAR_PATH");
    }
  }
  if (
    changed.length &&
    split(run("ls-files", "--stage", "-z", "--", ...changed)).some(
      (entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry),
    )
  )
    throw new Error("V42_NON_REGULAR_INDEX_PATH");
  const baseline = new Map<string, string>();
  for (const path of [...controls, ...appendPaths, "PROJECT_CONTROL.md"])
    baseline.set(path, run("show", `${head}:${path}`));
  const original = (path: string) => {
    const value = baseline.get(path);
    if (value === undefined) throw new Error("V42_BASELINE_FILE_MISSING");
    return value;
  };
  const check = (read: (path: string) => string, allowBaseline: boolean) => {
    const documents = controls.map((path) => object(JSON.parse(read(path))));
    const [r, w, s] = documents;
    if (!r || !w || !s) throw new Error("V42_CONTROLS_MISSING");
    if (allowBaseline && r.version === c.supersedes) {
      for (const path of [...controls, ...appendPaths, "PROJECT_CONTROL.md"])
        if (read(path) !== original(path))
          throw new Error("V42_PARTIAL_BASELINE_INDEX_REJECTED");
      return;
    }
    const properties = object(s.properties);
    if (
      r.version !== c.version ||
      w.roadmapVersion !== c.version ||
      !isDeepStrictEqual(r.ownerDecision, {
        decisionId: c.ownerDecision,
        decidedAt: "2026-09-29",
        supersedes: c.supersedes,
      }) ||
      !isDeepStrictEqual(w.localHarnessRepairV42, c) ||
      !Array.isArray(s.required) ||
      s.required.filter((key) => key === "localHarnessRepairV42").length !==
        1 ||
      !isDeepStrictEqual(properties.localHarnessRepairV42, { const: c }) ||
      !isDeepStrictEqual(properties.roadmapVersion, { const: c.version })
    )
      throw new Error("V42_EXACT_TRANSITION_REQUIRED");
    projectV42ToV41(r, w, s);
    for (const [index, path] of controls.entries())
      if (!isDeepStrictEqual(documents[index], JSON.parse(original(path))))
        throw new Error("V42_INHERITED_CONTROL_DRIFT");
    for (const path of appendPaths)
      if (!read(path).startsWith(original(path)))
        throw new Error("V42_HISTORY_REWRITTEN");
    const header = "# MalisPang Project Control\n\n";
    if (
      !read("PROJECT_CONTROL.md").startsWith(header) ||
      !read("PROJECT_CONTROL.md").endsWith(
        original("PROJECT_CONTROL.md").slice(header.length),
      )
    )
      throw new Error("V42_CONTROL_HISTORY_REWRITTEN");
  };
  check((path) => readFileSync(join(cwd, path), "utf8"), false);
  check((path) => run("show", `:${path}`), true);
  return {
    head,
    mode: "UNCOMMITTED_LOCAL_OVERLAY" as const,
    changedPaths: changed.sort(),
    integrationGrant: c.integrationGrant,
    remoteExecutionAuthorized: false as const,
  };
}
