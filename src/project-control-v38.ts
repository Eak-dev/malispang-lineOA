import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("V38_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

/** Owner's TEST mandate is staged; this local stage cannot issue remote grants. */
export const TEST_READINESS_V38 = {
  version: "2026.09.24-v38",
  ownerDecision: "MP-OD-2026-09-24-V38",
  supersedes: "2026.09.24-v37",
  baseline: "35b67ab87ecd052ab80f450d766c9eabd2991861",
  workId: "MP-06",
  githubIssue: 12,
  targetEnvironment: "TEST_ONLY",
  worker: "malispang-lineoa-test",
  stage: "LOCAL_REMEDIATION_AND_UAT_CONTRACT",
  localImplementation: true,
  remoteExecution: false,
  storageHold: "UNCHANGED_NO_REPLAY_OR_TRANSPORT_BYPASS",
  inheritedEvidence: "PRESERVE_JOURNALS_ACCOUNTING_AND_UNRESOLVED_UAT",
  forbidden: "PRODUCTION_RESET_REBASE_FORCE_PUSH_MERGE_ISSUE_CLOSE",
} as const;

export const V38_ALLOWED_PATHS = [
  "PROJECT_CONTROL.md",
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
  "src/project-control.ts",
  "src/project-control-cli.ts",
  "src/project-control-v38.ts",
  "tests/project-control.test.ts",
  "tests/project-control-v38.test.ts",
  "docs/project/OWNER_DECISION_LOG.md",
  "docs/project/ROADMAP_CHANGELOG.md",
  "docs/project/EXECUTION_GATES.md",
  "docs/line-oa/mp-06/MP_06_V38_TEST_READINESS.md",
  "worker/durable-objects.ts",
  "worker/index.ts",
  "worker-tests/durable-state.test.ts",
  "worker-tests/mp-06-pilot-control.test.ts",
] as const;

export function projectV38ToV37(
  roadmap: Record<string, unknown>,
  work: Record<string, unknown>,
  schema?: Record<string, unknown>,
): void {
  if (roadmap.version !== TEST_READINESS_V38.version) return;
  roadmap.version = TEST_READINESS_V38.supersedes;
  roadmap.ownerDecision = {
    decisionId: "MP-OD-2026-09-24-V37",
    decidedAt: "2026-09-24",
    supersedes: "2026.09.24-v36",
  };
  work.roadmapVersion = roadmap.version;
  delete work.testReadinessV38;
  if (schema) {
    schema.required = (schema.required as string[]).filter(
      (key) => key !== "testReadinessV38",
    );
    const properties = schema.properties as Record<string, unknown>;
    delete properties.testReadinessV38;
    properties.roadmapVersion = { const: roadmap.version };
  }
}

/** No wildcard or path normalization that could hide an out-of-scope path. */
export function v38PathsAllowed(paths: readonly string[]): boolean {
  return paths.every((path) =>
    (V38_ALLOWED_PATHS as readonly string[]).includes(path),
  );
}

/** Verify preserved evidence against Git, not a caller-supplied receipt.
 * This proves LOCAL scope only. It deliberately cannot authorize deployment. */
export function inspectV38Repository(cwd: string, git: string): void {
  const run = (args: string[]) =>
    execFileSync(git, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  const base = TEST_READINESS_V38.baseline;
  run(["merge-base", "--is-ancestor", base, "HEAD"]);
  if (run(["rev-list", "--merges", `${base}..HEAD`]).trim())
    throw new Error("V38_NO_MERGE_AUTHORITY");
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
  if (!v38PathsAllowed(paths)) throw new Error("V38_PATH_OUTSIDE_SCOPE");
  for (const path of new Set(paths)) {
    try {
      if (!lstatSync(join(cwd, path)).isFile())
        throw new Error("V38_NON_REGULAR_PATH");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      // A deleted allowed path is still inventoried; required files fail below.
    }
  }
  const read = (path: string) => readFileSync(join(cwd, path), "utf8");
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
    if (r.version === TEST_READINESS_V38.version) {
      if (
        !isDeepStrictEqual(w.testReadinessV38, TEST_READINESS_V38) ||
        !isDeepStrictEqual(r.ownerDecision, {
          decisionId: TEST_READINESS_V38.ownerDecision,
          decidedAt: "2026-09-24",
          supersedes: TEST_READINESS_V38.supersedes,
        }) ||
        w.roadmapVersion !== TEST_READINESS_V38.version ||
        !Array.isArray(s.required) ||
        !s.required.includes("testReadinessV38") ||
        !isDeepStrictEqual(properties.testReadinessV38, {
          const: TEST_READINESS_V38,
        }) ||
        !isDeepStrictEqual(properties.roadmapVersion, {
          const: TEST_READINESS_V38.version,
        })
      )
        throw new Error("V38_SCOPE_SNAPSHOT_DRIFT");
    } else if (!allowBaseline) throw new Error("V38_VERSION_REQUIRED");
    projectV38ToV37(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const) {
      if (!isDeepStrictEqual(value, JSON.parse(baseline(path))))
        throw new Error(`V38_INHERITED_CONTROL_DRIFT:${path}`);
    }
    for (const path of [
      "docs/project/OWNER_DECISION_LOG.md",
      "docs/project/ROADMAP_CHANGELOG.md",
      "docs/project/EXECUTION_GATES.md",
    ]) {
      if (!read(path).startsWith(baseline(path)))
        throw new Error(`V38_HISTORY_REWRITTEN:${path}`);
    }
  };
  checkSnapshot(read, false);
  checkSnapshot((path) => run(["show", `:${path}`]), true);
  for (const revision of revisions)
    checkSnapshot((path) => run(["show", `${revision}:${path}`]), false);
}
