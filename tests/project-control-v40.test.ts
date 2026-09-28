import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import { runProjectControlValidation } from "../src/project-control-cli.js";
import {
  TEST_POLICY_REPAIR_V40,
  V40_ALLOWED_ACTIONS,
  V40_ALLOWED_PATHS,
  inspectV40Repository,
  projectV40ToV39,
  v40PathsAllowed,
} from "../src/project-control-v40.js";

// The qualified v40 overlay was intentionally never committed. Reconstruct its
// exact sealed bytes over its real v39 ancestor, then exercise today's dispatcher
// on those historical inputs. Keep every existing assertion and negative case.
const sourceRoot = new URL("../", import.meta.url);
const snapshotText = readFileSync(
  new URL("tests/fixtures/mp06-v40-qualified/snapshot.json", sourceRoot),
  "utf8",
);
if (
  createHash("sha256").update(snapshotText).digest("hex") !==
  "d76fa61d8ff2e82a96002a78c41b5ce584512013c7614609534e3c39c3369d48"
)
  throw new Error("V40_QUALIFIED_SNAPSHOT_HASH_MISMATCH");
const snapshot = JSON.parse(snapshotText) as {
  files: Record<string, { sha256: string; content: string }>;
};
if (
  JSON.stringify(Object.keys(snapshot.files).sort()) !==
  JSON.stringify([...V40_ALLOWED_PATHS].sort())
)
  throw new Error("V40_QUALIFIED_SNAPSHOT_PATHS_MISMATCH");
for (const [path, { sha256, content }] of Object.entries(snapshot.files)) {
  if (createHash("sha256").update(content).digest("hex") !== sha256)
    throw new Error(`V40_QUALIFIED_SNAPSHOT_CONTENT_MISMATCH:${path}`);
}
const historicalRoot = await mkdtemp(join(tmpdir(), "mp06-v40-regression-"));
afterAll(async () => {
  await rm(historicalRoot, { recursive: true, force: true });
});
try {
  execFileSync(
    projectControlGitExecutable(),
    [
      "clone",
      "--shared",
      "--no-hardlinks",
      fileURLToPath(sourceRoot),
      historicalRoot,
    ],
    { stdio: "pipe" },
  );
  execFileSync(
    projectControlGitExecutable(),
    ["checkout", "--detach", TEST_POLICY_REPAIR_V40.baseline],
    { cwd: historicalRoot, stdio: "pipe" },
  );
  for (const path of V40_ALLOWED_PATHS) {
    await mkdir(dirname(join(historicalRoot, path)), { recursive: true });
    await writeFile(join(historicalRoot, path), snapshot.files[path]!.content);
  }
} catch (error) {
  await rm(historicalRoot, { recursive: true, force: true });
  throw error;
}
const root = pathToFileURL(historicalRoot + "/");
type Document = Record<string, unknown> & {
  version: string;
  localControlRepairV40: Record<string, unknown>;
  properties: Record<string, unknown>;
  required: string[];
};
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as Document;
const fixtures = () => ({
  r: read("config/project/roadmap.json"),
  w: read("config/project/current-work.json"),
  s: read("config/project/current-work.schema.json"),
});
const ownerRecord = () =>
  readFileSync(new URL("docs/project/OWNER_DECISION_LOG.md", root), "utf8");
const controlPaths = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
] as const;

describe("v40 local control repair with one effective authority summary", () => {
  it("validates active controls and exact local v39 inheritance without remote authority", async () => {
    const { r, w, s } = fixtures();
    expect(r.version).toBe(TEST_POLICY_REPAIR_V40.version);
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ),
    ).toEqual([]);
    expect(validateWp8fOwnerDecisionRecord(ownerRecord(), r.version)).toBe(
      true,
    );
    await expect(runProjectControlValidation(root)).resolves.toBeUndefined();
    const summary = summarizeProjectAuthority(r, w);
    expect(summary).toMatchObject({
      status: "LOCAL_CONTROL_REPAIR_ONLY",
      allowedActions: V40_ALLOWED_ACTIONS,
      remoteExecutionAuthorized: false,
      commitAuthorized: false,
      publicationAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
      toolPermission: "NOT_EVALUATED",
      uatReadiness: "NOT_VERIFIED",
      parallelWork: "MP07_EXISTING_SEPARATE_SCOPE_UNCHANGED",
      sourceRoles: {
        publishedControlVersion: "2026.09.24-v37",
        publishedControlBaseline: TEST_POLICY_REPAIR_V40.publishedBaseline,
        inheritedLocalVersion: "2026.09.24-v39",
        inheritedLocalBaseline: TEST_POLICY_REPAIR_V40.baseline,
        evidenceHead: "NOT_OBSERVED_BY_PURE_SUMMARY",
        deployedVersion: "NOT_OBSERVED_BY_PURE_SUMMARY",
      },
    });
    // Historical broad booleans are retained evidence, never effective grants.
    expect(w.authorization).toMatchObject({
      commit: true,
      pushBranch: true,
      testDeploymentAuthorization: true,
    });
    for (const action of V40_ALLOWED_ACTIONS)
      expect(evaluateProjectAction(r, w, action).allowed, action).toBe(true);
    projectV40ToV39(r, w, s);
    for (const [index, value] of [r, w, s].entries())
      expect(value).toEqual(
        JSON.parse(
          execFileSync(
            projectControlGitExecutable(),
            [
              "show",
              `${TEST_POLICY_REPAIR_V40.baseline}:${controlPaths[index]!}`,
            ],
            { cwd: fileURLToPath(root), encoding: "utf8" },
          ),
        ),
      );
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      status: "HISTORICAL_CONTROL_NO_V40_SUMMARY",
      allowedActions: [],
      remoteExecutionAuthorized: false,
    });
  });

  it.each([
    "COMMIT",
    "PUSH_BRANCH",
    "UPDATE_GITHUB_ROADMAP",
    "UPDATE_NOTION",
    "DEPLOY_TEST",
    "ACTIVATE_TEST",
    "SEND_LINE",
    "CALL_PROVIDER",
    "QUERY_STORAGE",
    "RELEASE_STORAGE_HOLD",
    "QUERY_PRODUCTION",
    "DEPLOY_PRODUCTION",
    "RESET",
    "REBASE",
    "FORCE_PUSH",
    "MERGE_DEFAULT_BRANCH",
    "MERGE_MP06_PR18",
    "CREATE_PR",
    "CREATE_DRAFT_PR",
    "READY_FOR_REVIEW",
    "CLOSE_ISSUE",
    "ACTIVATE_SUCCESSOR_V22",
    "OPEN_CONTINUATION",
    "CLOSE_OWNER_HANDOFF",
    "START_MP07",
    "LOCAL_RUNTIME_IMPLEMENTATION",
    "UNKNOWN",
    "",
  ])(
    "denies %s even with caller-provided approval or copied summary",
    (action) => {
      const { r, w } = fixtures();
      expect(
        evaluateProjectAction(r, w, action, undefined, {
          approved: true,
          remoteExecution: true,
          toolPermission: "ALLOWED",
          ...summarizeProjectAuthority(r, w),
        }).allowed,
      ).toBe(false);
    },
  );

  it.each(Object.keys(TEST_POLICY_REPAIR_V40))(
    "rejects authority drift: %s",
    (key) => {
      const { r, w } = fixtures();
      w.localControlRepairV40[key] = "unapproved";
      expect(validateProjectControl(r, w).errors.length).toBeGreaterThan(0);
      expect(evaluateProjectAction(r, w, "LOCAL_IMPLEMENTATION").allowed).toBe(
        false,
      );
      expect(summarizeProjectAuthority(r, w)).toMatchObject({
        status: "ROADMAP_UNVERIFIED",
        allowedActions: [],
        remoteExecutionAuthorized: false,
      });
    },
  );

  it("rejects schema widening, duplicate keys, expanded scope, and invalid Owner records", () => {
    const { r, w, s } = fixtures();
    s.properties.localControlRepairV40 = { type: "object" };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ).length,
    ).toBeGreaterThan(0);
    const duplicate = fixtures().s;
    duplicate.required.push("localControlRepairV40");
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        duplicate,
        r.version,
      ).length,
    ).toBeGreaterThan(0);
    w.localControlRepairV40.extraGrant = true;
    expect(validateProjectControl(r, w).errors.length).toBeGreaterThan(0);
    for (const text of [
      "Owner approved",
      ownerRecord().replace('"policyRevision": 3', '"policyRevision": 4'),
      ownerRecord() + "\n## MP-OD-2026-09-28-V40 — duplicate",
    ])
      expect(validateWp8fOwnerDecisionRecord(text, r.version)).toBe(false);
    expect(summarizeProjectAuthority(null, null)).toMatchObject({
      status: "ROADMAP_UNVERIFIED",
      allowedActions: [],
      remoteExecutionAuthorized: false,
    });
  });

  it.each([
    "src/project-control-v38.ts",
    "src/project-control-v39.ts",
    "src/test-operation-policy.ts",
    "tests/test-operation-policy.test.ts",
    "worker/index.ts",
    "worker/durable-objects.ts",
    "wrangler.jsonc",
    ".env",
    "../src/project-control.ts",
    "src/../src/project-control.ts",
    "src/project-control.ts\n",
    "tests/*.test.ts",
    ".github/workflows/ci.yml",
  ])("rejects frozen, runtime, wildcard or aliased path %s", (path) => {
    expect(v40PathsAllowed([path])).toBe(false);
  });

  it.each([
    "journal-reset",
    "grant-reset",
    "historical-browser-quota",
    "root-authorization",
    "owner-history",
    "project-control-history",
    "policy-history",
    "frozen-policy-code",
    "staged-manifest-restored",
    "staged-runtime-restored",
    "staged-symlink-restored",
    "staged-gitlink-restored",
    "committed-manifest-restored",
    "committed-runtime-restored",
    "committed-symlink-restored",
    "committed-baseline-reset",
    "shallow-history",
  ])("rejects independently inspected %s", async (variant) => {
    const cwd = await mkdtemp(join(tmpdir(), "mp06-v40-negative-"));
    const git = (args: string[]) =>
      execFileSync(projectControlGitExecutable(), args, {
        cwd,
        encoding: "utf8",
        stdio: "pipe",
      });
    const commit = () => {
      git(["add", "--all"]);
      git([
        "-c",
        "user.name=Synthetic Test",
        "-c",
        "user.email=synthetic@example.invalid",
        "commit",
        "-m",
        "synthetic v40 fixture",
      ]);
    };
    try {
      git(["clone", "--shared", "--no-hardlinks", fileURLToPath(root), cwd]);
      git(["checkout", "--detach", TEST_POLICY_REPAIR_V40.baseline]);
      for (const path of V40_ALLOWED_PATHS) {
        if (!existsSync(new URL(path, root))) continue;
        await mkdir(dirname(join(cwd, path)), { recursive: true });
        await copyFile(new URL(path, root), join(cwd, path));
      }
      expect(() =>
        inspectV40Repository(cwd, projectControlGitExecutable()),
      ).not.toThrow();
      if (variant.startsWith("committed")) commit();
      const path =
        variant.includes("symlink") || variant.includes("gitlink")
          ? "src/project-control.ts"
          : variant.includes("runtime")
            ? "worker/index.ts"
            : variant === "project-control-history"
              ? "PROJECT_CONTROL.md"
              : variant === "owner-history"
                ? "docs/project/OWNER_DECISION_LOG.md"
                : variant === "policy-history"
                  ? "docs/project/TEST_OPERATION_POLICY_TH.md"
                  : variant === "frozen-policy-code"
                    ? "src/project-control-v39.ts"
                    : "config/project/current-work.json";
      const original = readFileSync(join(cwd, path), "utf8");
      if (variant.includes("symlink")) {
        await rm(join(cwd, path));
        await symlink("project-control-v40.ts", join(cwd, path));
      } else if (variant.includes("gitlink")) {
        git([
          "update-index",
          "--add",
          "--cacheinfo",
          `160000,${git(["rev-parse", "HEAD"]).trim()},${path}`,
        ]);
      } else if (variant === "shallow-history") {
        await writeFile(
          join(cwd, ".git", "shallow"),
          git(["rev-parse", "HEAD"]),
        );
      } else if (variant === "owner-history") {
        await writeFile(
          join(cwd, path),
          original.replace("Owner", "Rewritten"),
        );
      } else if (variant === "project-control-history") {
        await writeFile(
          join(cwd, path),
          original.replace(
            "## Current effective control — v39",
            "## Rewritten historical v39",
          ),
        );
      } else if (variant === "policy-history") {
        await writeFile(
          join(cwd, path),
          original.replace(
            "# MaliPang TEST — กติกาการปฏิบัติงานและการลองซ้ำ ฉบับ 2",
            "# Rewritten historical policy",
          ),
        );
      } else if (
        variant.includes("runtime") ||
        variant === "frozen-policy-code"
      ) {
        await writeFile(join(cwd, path), original + "\n// forbidden edit\n");
      } else if (variant === "committed-baseline-reset") {
        for (const controlPath of controlPaths)
          await writeFile(
            join(cwd, controlPath),
            git(["show", `${TEST_POLICY_REPAIR_V40.baseline}:${controlPath}`]),
          );
      } else {
        const work = JSON.parse(original) as Record<string, unknown>;
        if (variant === "grant-reset")
          (
            work.devOperationsIntegrationV37 as Record<string, unknown>
          ).creationGrant = "UNUSED";
        else if (variant === "historical-browser-quota")
          (
            (work.wp8fV24LiveUatEnablement as Record<string, unknown>)
              .dataStudio as Record<string, unknown>
          ).maximumTechnicalAttemptsBeforeSql = 30;
        else if (variant === "root-authorization")
          (work.authorization as Record<string, unknown>).production = true;
        else work.wp8fSuccessorOperationJournal = [];
        await writeFile(join(cwd, path), JSON.stringify(work));
      }
      if (variant.startsWith("staged") && !variant.includes("gitlink")) {
        git(["add", path]);
        if (variant.includes("symlink")) await rm(join(cwd, path));
        await writeFile(join(cwd, path), original);
      } else if (variant.startsWith("committed")) {
        commit();
        if (variant === "committed-baseline-reset") {
          for (const controlPath of controlPaths)
            await copyFile(new URL(controlPath, root), join(cwd, controlPath));
        } else {
          if (variant.includes("symlink")) await rm(join(cwd, path));
          await writeFile(join(cwd, path), original);
        }
        commit();
      }
      expect(() =>
        inspectV40Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
