import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { projectV38ToV37 } from "./project-control-v38.js";
import {
  TEST_OPERATION_POLICY_V39,
  projectV39ToV38,
} from "./project-control-v39.js";

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("V40_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

/** Local adoption only. Published v37 and inherited local v39 are distinct. */
export const TEST_POLICY_REPAIR_V40 = {
  version: "2026.09.28-v40",
  ownerDecision: "MP-OD-2026-09-28-V40",
  supersedes: "2026.09.24-v39",
  baseline: "07ce10f641ebaa74ceab83c98e8f5fdc40d6858b",
  publishedControlVersion: "2026.09.24-v37",
  publishedBaseline: "35b67ab87ecd052ab80f450d766c9eabd2991861",
  inheritedLocalVersion: "2026.09.24-v39",
  workId: "MP-06",
  githubIssue: 12,
  targetEnvironment: "LOCAL_ONLY",
  stage: "LOCAL_CONTROL_REPAIR_ONLY",
  policyRevision: 3,
  localImplementation: true,
  remoteExecution: false,
  commit: false,
  publication: false,
  authority: "LOCAL_CONTROL_ONLY_NOT_TOOL_PERMISSION",
  storageHold: "UNRESOLVED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  inheritedEvidence: "IMMUTABLE_GRANTS_COUNTS_JOURNALS_ACCOUNTING_AND_UAT_GAPS",
  parallelWork: "MP07_EXISTING_SEPARATE_SCOPE_UNCHANGED",
  forbidden:
    "RUNTIME_REMOTE_PRODUCTION_COMMIT_PUSH_PR_PUBLICATION_MERGE_DEPLOY_RESET_REBASE_FORCE_PUSH_ISSUE_CLOSE",
} as const;

export const V40_ALLOWED_ACTIONS = [
  "LOCAL_IMPLEMENTATION",
  "LOCAL_VALIDATION",
  "LOCAL_ANALYSIS",
] as const;

export const V40_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v40.ts",
  "tests/project-control-v40.test.ts",
  "tests/project-control-v39.test.ts",
  "docs/project/CONTROL_REPAIR_V40_TH.md",
  "docs/project/TEST_OPERATION_POLICY_TH.md",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
] as const;

/** Presentation data only; callers must validate before exposing this summary.
 * This helper accepts no proposed evidence and cannot grant tool permission. */
export function v40AuthoritySummary() {
  return {
    status: "LOCAL_CONTROL_REPAIR_ONLY" as const,
    controlVersion: TEST_POLICY_REPAIR_V40.version,
    ownerDecision: TEST_POLICY_REPAIR_V40.ownerDecision,
    allowedActions: [...V40_ALLOWED_ACTIONS],
    allowedPaths: [...V40_ALLOWED_PATHS],
    remoteExecutionAuthorized: false as const,
    commitAuthorized: false as const,
    publicationAuthorized: false as const,
    releaseAuthorized: false as const,
    productionAuthorized: false as const,
    toolPermission: "NOT_EVALUATED" as const,
    repositoryInspection: "SEPARATE_INSPECTION_REQUIRED" as const,
    publicationStatus: "LOCAL_ONLY_NOT_PUSHED_OR_MERGED" as const,
    uatReadiness: "NOT_VERIFIED" as const,
    storageHold: TEST_POLICY_REPAIR_V40.storageHold,
    parallelWork: TEST_POLICY_REPAIR_V40.parallelWork,
    sourceRoles: {
      publishedControlVersion: TEST_POLICY_REPAIR_V40.publishedControlVersion,
      publishedControlBaseline: TEST_POLICY_REPAIR_V40.publishedBaseline,
      inheritedLocalVersion: TEST_POLICY_REPAIR_V40.inheritedLocalVersion,
      inheritedLocalBaseline: TEST_POLICY_REPAIR_V40.baseline,
      runtimeCandidate: "1790da58635edcee154b60d76730248e8130c2d3",
      evidenceHead: "NOT_OBSERVED_BY_PURE_SUMMARY",
      deployedVersion: "NOT_OBSERVED_BY_PURE_SUMMARY",
    },
  };
}

export function projectV40ToV39(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
  schema?: Record<string, unknown>,
): void {
  if (roadmap.version !== TEST_POLICY_REPAIR_V40.version) return;
  roadmap.version = TEST_POLICY_REPAIR_V40.supersedes;
  roadmap.ownerDecision = {
    decisionId: TEST_OPERATION_POLICY_V39.ownerDecision,
    decidedAt: "2026-09-24",
    supersedes: TEST_OPERATION_POLICY_V39.supersedes,
  };
  work.roadmapVersion = roadmap.version;
  delete work.localControlRepairV40;
  if (schema) {
    schema.required = (schema.required as string[]).filter(
      (key) => key !== "localControlRepairV40",
    );
    const properties = record(schema.properties);
    delete properties.localControlRepairV40;
    properties.roadmapVersion = { const: roadmap.version };
  }
}

export function v40PathsAllowed(paths: readonly string[]): boolean {
  return paths.every((path) =>
    (V40_ALLOWED_PATHS as readonly string[]).includes(path),
  );
}

/** Read Git directly: all post-baseline commits, index, and working files.
 * Neither a caller receipt nor a restored HEAD erases a historical violation. */
export function inspectV40Repository(cwd: string, git: string): void {
  const run = (args: string[]) =>
    execFileSync(git, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  const base = TEST_POLICY_REPAIR_V40.baseline;
  const published = TEST_POLICY_REPAIR_V40.publishedBaseline;
  if (run(["rev-parse", "--is-shallow-repository"]).trim() !== "false")
    throw new Error("V40_FULL_HISTORY_REQUIRED");
  run([
    "merge-base",
    "--is-ancestor",
    published,
    TEST_OPERATION_POLICY_V39.baseline,
  ]);
  run([
    "merge-base",
    "--is-ancestor",
    TEST_OPERATION_POLICY_V39.baseline,
    base,
  ]);
  run(["merge-base", "--is-ancestor", base, "HEAD"]);
  if (run(["rev-list", "--merges", `${base}..HEAD`]).trim())
    throw new Error("V40_NO_MERGE_AUTHORITY");
  const baseline = (path: string) => run(["show", `${base}:${path}`]);
  const controlPaths = [
    "config/project/roadmap.json",
    "config/project/current-work.json",
    "config/project/current-work.schema.json",
  ] as const;
  const inherited = controlPaths.map((path) =>
    record(JSON.parse(baseline(path))),
  );
  const [r37, w37, s37] = inherited as [
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>,
  ];
  projectV39ToV38(r37, w37, s37);
  projectV38ToV37(r37, w37, s37);
  for (const [index, path] of controlPaths.entries()) {
    if (
      !isDeepStrictEqual(
        inherited[index],
        JSON.parse(run(["show", `${published}:${path}`])),
      )
    )
      throw new Error(`V40_PUBLISHED_LINEAGE_DRIFT:${path}`);
  }
  const revisions = run(["rev-list", "--reverse", `${base}..HEAD`])
    .trim()
    .split("\n")
    .filter(Boolean);
  const paths = [
    ...run(["diff", "--no-renames", "--name-only", "-z", base]).split("\0"),
    ...run([
      "diff",
      "--cached",
      "--no-renames",
      "--name-only",
      "-z",
      base,
    ]).split("\0"),
    ...revisions.flatMap((revision) =>
      run([
        "diff-tree",
        "--no-commit-id",
        "--no-renames",
        "--name-only",
        "-r",
        "-z",
        revision,
      ]).split("\0"),
    ),
    ...run(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
  ].filter(Boolean);
  if (!v40PathsAllowed(paths)) throw new Error("V40_PATH_OUTSIDE_SCOPE");
  const scopedPaths = [...new Set(paths)];
  for (const path of scopedPaths) {
    if (!lstatSync(join(cwd, path)).isFile())
      throw new Error("V40_NON_REGULAR_PATH");
  }
  if (scopedPaths.length) {
    if (
      run(["ls-files", "--stage", "-z", "--", ...scopedPaths])
        .split("\0")
        .filter(Boolean)
        .some((entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry))
    )
      throw new Error("V40_NON_REGULAR_INDEX_PATH");
    for (const revision of revisions) {
      if (
        run(["ls-tree", "-r", "-z", revision, "--", ...scopedPaths])
          .split("\0")
          .filter(Boolean)
          .some((entry) => !/^(100644|100755) blob [a-f0-9]+\t/u.test(entry))
      )
        throw new Error("V40_NON_REGULAR_HISTORY_PATH");
    }
  }
  const checkSnapshot = (
    read: (path: string) => string,
    allowBaseline: boolean,
  ) => {
    const r = record(JSON.parse(read(controlPaths[0])));
    const w = record(JSON.parse(read(controlPaths[1])));
    const s = record(JSON.parse(read(controlPaths[2])));
    const properties = record(s.properties);
    if (r.version === TEST_POLICY_REPAIR_V40.version) {
      if (
        !isDeepStrictEqual(w.localControlRepairV40, TEST_POLICY_REPAIR_V40) ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: TEST_POLICY_REPAIR_V40.ownerDecision,
          decidedAt: "2026-09-28",
          supersedes: TEST_POLICY_REPAIR_V40.supersedes,
        }) ||
        w.roadmapVersion !== TEST_POLICY_REPAIR_V40.version ||
        !Array.isArray(s.required) ||
        s.required.filter((key) => key === "localControlRepairV40").length !==
          1 ||
        !isDeepStrictEqual(properties.localControlRepairV40, {
          const: TEST_POLICY_REPAIR_V40,
        }) ||
        !isDeepStrictEqual(properties.roadmapVersion, {
          const: TEST_POLICY_REPAIR_V40.version,
        })
      )
        throw new Error("V40_SCOPE_SNAPSHOT_DRIFT");
      const sections = read("docs/project/OWNER_DECISION_LOG.md").split(
        "## MP-OD-2026-09-28-V40 —",
      );
      const json = sections[1]
        ?.split("\n## ")[0]
        ?.match(/```json\s*([\s\S]*?)```/u)?.[1];
      if (
        sections.length !== 2 ||
        json === undefined ||
        !isDeepStrictEqual(JSON.parse(json), TEST_POLICY_REPAIR_V40)
      )
        throw new Error("V40_OWNER_RECORD_INVALID");
    } else if (
      !allowBaseline ||
      r.version !== TEST_OPERATION_POLICY_V39.version
    )
      throw new Error("V40_VERSION_REQUIRED");
    projectV40ToV39(r, w, s);
    for (const [index, value] of [r, w, s].entries()) {
      const path = controlPaths[index]!;
      if (!isDeepStrictEqual(value, JSON.parse(baseline(path))))
        throw new Error(`V40_INHERITED_CONTROL_DRIFT:${path}`);
    }
    for (const path of [
      "docs/project/OWNER_DECISION_LOG.md",
      "docs/project/ROADMAP_CHANGELOG.md",
      "docs/project/EXECUTION_GATES.md",
    ]) {
      if (!read(path).startsWith(baseline(path)))
        throw new Error(`V40_HISTORY_REWRITTEN:${path}`);
    }
    const header = "# MalisPang Project Control\n\n";
    const historicalControl = baseline("PROJECT_CONTROL.md");
    const currentControl = read("PROJECT_CONTROL.md");
    if (
      !historicalControl.startsWith(header) ||
      !currentControl.startsWith(header) ||
      !currentControl.endsWith(historicalControl.slice(header.length))
    )
      throw new Error("V40_HISTORY_REWRITTEN:PROJECT_CONTROL.md");
    const policyPath = "docs/project/TEST_OPERATION_POLICY_TH.md";
    if (!read(policyPath).endsWith(baseline(policyPath)))
      throw new Error(`V40_HISTORY_REWRITTEN:${policyPath}`);
  };
  checkSnapshot((path) => readFileSync(join(cwd, path), "utf8"), false);
  checkSnapshot((path) => run(["show", `:${path}`]), true);
  for (const revision of revisions)
    checkSnapshot((path) => run(["show", `${revision}:${path}`]), false);
}
