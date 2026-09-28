import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { TEST_READINESS_V38 } from "./project-control-v38.js";

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("V39_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

/** Project policy advice only: this transition issues no remote tool grant. */
export const TEST_OPERATION_POLICY_V39 = {
  version: "2026.09.24-v39",
  ownerDecision: "MP-OD-2026-09-24-V39",
  supersedes: "2026.09.24-v38",
  baseline: "7c9e08ade55494892af4ae2fd6708134f78329d5",
  workId: "MP-06",
  githubIssue: 12,
  targetEnvironment: "TEST_ONLY",
  worker: "malispang-lineoa-test",
  stage: "LOCAL_TEST_OPERATION_POLICY_AND_CONTROL",
  policyRevision: 2,
  localImplementation: true,
  remoteExecution: false,
  authority: "PROJECT_POLICY_ADVICE_NOT_TOOL_PERMISSION",
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  browserRecovery: "THREE_TOTAL_ATTEMPTS_PER_HARMLESS_INCIDENT_NOT_LIFETIME",
  unknownOutcome: "STOP_NO_BLIND_REPLAY_RECONCILE_READ_ONLY_WHEN_AUTHORIZED",
  denial: "STOP_NO_WORKAROUND_OR_ALTERNATE_TRANSPORT",
  inheritedEvidence: "IMMUTABLE_GRANTS_COUNTS_JOURNALS_ACCOUNTING_AND_UAT_GAPS",
  forbidden:
    "RUNTIME_REMOTE_PRODUCTION_PUSH_PR_MERGE_DEPLOY_RESET_REBASE_FORCE_PUSH_ISSUE_CLOSE",
} as const;

export const V39_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v39.ts",
  "src/test-operation-policy.ts",
  "tests/project-control.test.ts",
  "tests/project-control-v38.test.ts",
  "tests/project-control-v39.test.ts",
  "tests/test-operation-policy.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
  "docs/project/TEST_OPERATION_POLICY_TH.md",
] as const;

export function projectV39ToV38(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
  schema?: Record<string, unknown>,
): void {
  if (roadmap.version !== TEST_OPERATION_POLICY_V39.version) return;
  roadmap.version = TEST_OPERATION_POLICY_V39.supersedes;
  roadmap.ownerDecision = {
    decisionId: TEST_READINESS_V38.ownerDecision,
    decidedAt: "2026-09-24",
    supersedes: TEST_READINESS_V38.supersedes,
  };
  work.roadmapVersion = roadmap.version;
  delete work.testOperationPolicyV39;
  if (schema) {
    schema.required = (schema.required as string[]).filter(
      (key) => key !== "testOperationPolicyV39",
    );
    const properties = schema.properties as Record<string, unknown>;
    delete properties.testOperationPolicyV39;
    properties.roadmapVersion = { const: roadmap.version };
  }
}

export function v39PathsAllowed(paths: readonly string[]): boolean {
  return paths.every((path) =>
    (V39_ALLOWED_PATHS as readonly string[]).includes(path),
  );
}

/** Independently inspect working tree, index, and every post-baseline commit.
 * Historical manifests are byte-semantic frozen after removing only v39. */
export function inspectV39Repository(cwd: string, git: string): void {
  const run = (args: string[]) =>
    execFileSync(git, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  const base = TEST_OPERATION_POLICY_V39.baseline;
  if (run(["rev-parse", "--is-shallow-repository"]).trim() !== "false")
    throw new Error("V39_FULL_HISTORY_REQUIRED");
  run(["merge-base", "--is-ancestor", base, "HEAD"]);
  if (run(["rev-list", "--merges", `${base}..HEAD`]).trim())
    throw new Error("V39_NO_MERGE_AUTHORITY");
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
  if (!v39PathsAllowed(paths)) throw new Error("V39_PATH_OUTSIDE_SCOPE");
  for (const path of new Set(paths)) {
    if (!lstatSync(join(cwd, path)).isFile())
      throw new Error("V39_NON_REGULAR_PATH");
  }
  // A restored worktree must not hide a staged/historical symlink or gitlink.
  const scopedPaths = [...new Set(paths)];
  if (scopedPaths.length) {
    const indexEntries = run([
      "ls-files",
      "--stage",
      "-z",
      "--",
      ...scopedPaths,
    ])
      .split("\0")
      .filter(Boolean);
    if (
      indexEntries.some(
        (entry) => !/^(100644|100755) [a-f0-9]+ 0\t/u.test(entry),
      )
    )
      throw new Error("V39_NON_REGULAR_INDEX_PATH");
    for (const revision of revisions) {
      const treeEntries = run([
        "ls-tree",
        "-r",
        "-z",
        revision,
        "--",
        ...scopedPaths,
      ])
        .split("\0")
        .filter(Boolean);
      if (
        treeEntries.some(
          (entry) => !/^(100644|100755) blob [a-f0-9]+\t/u.test(entry),
        )
      )
        throw new Error("V39_NON_REGULAR_HISTORY_PATH");
    }
  }
  const baseline = (path: string) => run(["show", `${base}:${path}`]);
  const checkSnapshot = (
    read: (path: string) => string,
    allowBaseline: boolean,
  ) => {
    const r = record(JSON.parse(read("config/project/roadmap.json")));
    const w = record(JSON.parse(read("config/project/current-work.json")));
    const s = record(
      JSON.parse(read("config/project/current-work.schema.json")),
    );
    const properties = record(s.properties);
    if (r.version === TEST_OPERATION_POLICY_V39.version) {
      if (
        !isDeepStrictEqual(
          w.testOperationPolicyV39,
          TEST_OPERATION_POLICY_V39,
        ) ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: TEST_OPERATION_POLICY_V39.ownerDecision,
          decidedAt: "2026-09-24",
          supersedes: TEST_OPERATION_POLICY_V39.supersedes,
        }) ||
        w.roadmapVersion !== TEST_OPERATION_POLICY_V39.version ||
        !Array.isArray(s.required) ||
        s.required.filter((key) => key === "testOperationPolicyV39").length !==
          1 ||
        !isDeepStrictEqual(properties.testOperationPolicyV39, {
          const: TEST_OPERATION_POLICY_V39,
        }) ||
        !isDeepStrictEqual(properties.roadmapVersion, {
          const: TEST_OPERATION_POLICY_V39.version,
        })
      )
        throw new Error("V39_SCOPE_SNAPSHOT_DRIFT");
      const section = read("docs/project/OWNER_DECISION_LOG.md").split(
        "## MP-OD-2026-09-24-V39 —",
      );
      const json = section[1]
        ?.split("\n## ")[0]
        ?.match(/```json\s*([\s\S]*?)```/u)?.[1];
      if (
        section.length !== 2 ||
        json === undefined ||
        !isDeepStrictEqual(JSON.parse(json), TEST_OPERATION_POLICY_V39)
      )
        throw new Error("V39_OWNER_RECORD_INVALID");
    } else if (!allowBaseline) throw new Error("V39_VERSION_REQUIRED");
    projectV39ToV38(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const) {
      if (!isDeepStrictEqual(value, JSON.parse(baseline(path))))
        throw new Error(`V39_INHERITED_CONTROL_DRIFT:${path}`);
    }
    for (const path of [
      "docs/project/OWNER_DECISION_LOG.md",
      "docs/project/ROADMAP_CHANGELOG.md",
      "docs/project/EXECUTION_GATES.md",
    ]) {
      if (!read(path).startsWith(baseline(path)))
        throw new Error(`V39_HISTORY_REWRITTEN:${path}`);
    }
    const header = "# MalisPang Project Control\n\n";
    const historicalControl = baseline("PROJECT_CONTROL.md");
    const currentControl = read("PROJECT_CONTROL.md");
    if (
      !historicalControl.startsWith(header) ||
      !currentControl.startsWith(header) ||
      !currentControl.endsWith(historicalControl.slice(header.length))
    )
      throw new Error("V39_HISTORY_REWRITTEN:PROJECT_CONTROL.md");
  };
  checkSnapshot((path) => readFileSync(join(cwd, path), "utf8"), false);
  checkSnapshot((path) => run(["show", `:${path}`]), true);
  for (const revision of revisions)
    checkSnapshot((path) => run(["show", `${revision}:${path}`]), false);
}
