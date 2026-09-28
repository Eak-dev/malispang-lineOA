import { readFileSync, existsSync } from "node:fs";
import {
  copyFile,
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import { runProjectControlValidation } from "../src/project-control-cli.js";
import {
  TEST_OPERATION_POLICY_V39,
  V39_ALLOWED_PATHS,
  inspectV39Repository,
  projectV39ToV38,
  v39PathsAllowed,
} from "../src/project-control-v39.js";

// Keep every v39 assertion on its immutable inputs while exercising the current
// validator. A new overlay must not silently rewrite this historical contract.
const sourceRoot = new URL("../", import.meta.url);
const historicalRoot = await mkdtemp(join(tmpdir(), "mp06-v39-regression-"));
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
  ["checkout", "--detach", "07ce10f641ebaa74ceab83c98e8f5fdc40d6858b"],
  { cwd: historicalRoot, stdio: "pipe" },
);
const root = pathToFileURL(historicalRoot + "/");
afterAll(async () => {
  await rm(historicalRoot, { recursive: true, force: true });
});
type FixtureDocument = Record<string, unknown> & {
  version: string;
  testOperationPolicyV39: Record<string, unknown>;
  properties: Record<string, unknown>;
  required: string[];
};
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as FixtureDocument;
const fixtures = () => ({
  r: read("config/project/roadmap.json"),
  w: read("config/project/current-work.json"),
  s: read("config/project/current-work.schema.json"),
});
const ownerRecord = () =>
  readFileSync(new URL("docs/project/OWNER_DECISION_LOG.md", root), "utf8");

describe("v39 TEST operation policy without new execution grants", () => {
  it("validates the active CLI and exact inherited v38 manifests", async () => {
    const { r, w, s } = fixtures();
    expect(r.version).toBe(TEST_OPERATION_POLICY_V39.version);
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
    for (const action of [
      "LOCAL_IMPLEMENTATION",
      "COMMIT",
      "UPDATE_GITHUB_ROADMAP",
    ])
      expect(evaluateProjectAction(r, w, action).allowed, action).toBe(true);
    projectV39ToV38(r, w, s);
    const git = projectControlGitExecutable();
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(value).toEqual(
        JSON.parse(
          execFileSync(
            git,
            ["show", `${TEST_OPERATION_POLICY_V39.baseline}:${path}`],
            { cwd: fileURLToPath(root), encoding: "utf8" },
          ),
        ),
      );
    expect(validateProjectControl(r, w).errors).toEqual([]);
  });

  it.each([
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
    "PUSH_BRANCH",
    "ACTIVATE_SUCCESSOR_V22",
    "OPEN_CONTINUATION",
    "CLOSE_OWNER_HANDOFF",
    "UNKNOWN",
  ])(
    "denies live/release action %s even with caller-provided approval",
    (action) => {
      const { r, w } = fixtures();
      expect(
        evaluateProjectAction(r, w, action, undefined, {
          approved: true,
          remoteExecution: true,
        }).allowed,
      ).toBe(false);
    },
  );

  it.each(Object.keys(TEST_OPERATION_POLICY_V39))(
    "rejects malformed or expanded %s authority",
    (key) => {
      for (const value of ["drift", null, true, {}, []]) {
        const { r, w } = fixtures();
        w.testOperationPolicyV39[key] = value;
        if (
          value ===
          TEST_OPERATION_POLICY_V39[
            key as keyof typeof TEST_OPERATION_POLICY_V39
          ]
        )
          continue;
        expect(validateProjectControl(r, w).errors).toContain(
          "V39_EXACT_OPERATION_POLICY_CONTROL_INVALID",
        );
        expect(
          evaluateProjectAction(r, w, "LOCAL_IMPLEMENTATION").allowed,
        ).toBe(false);
      }
    },
  );

  it("rejects widened schemas, duplicate required keys, unknown scope and missing/duplicate Owner records", () => {
    const { r, w, s } = fixtures();
    s.properties.testOperationPolicyV39 = { type: "object" };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ),
    ).toContain("V39_SCHEMA_NOT_CLOSED");
    const duplicate = fixtures().s;
    duplicate.required.push("testOperationPolicyV39");
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        duplicate,
        r.version,
      ),
    ).toContain("V39_SCHEMA_NOT_CLOSED");
    w.testOperationPolicyV39.extraGrant = true;
    expect(validateProjectControl(r, w).errors).toContain(
      "V39_EXACT_OPERATION_POLICY_CONTROL_INVALID",
    );
    for (const text of [
      "Owner approved",
      ownerRecord().replace('"policyRevision": 2', '"policyRevision": 3'),
      ownerRecord() + "\n## MP-OD-2026-09-24-V39 — duplicate",
    ])
      expect(validateWp8fOwnerDecisionRecord(text, r.version)).toBe(false);
  });

  it.each([
    "src/project-control-v38.ts",
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
    expect(v39PathsAllowed([path])).toBe(false);
  });

  it.each([
    "journal-reset",
    "grant-reset",
    "historical-browser-quota",
    "owner-history",
    "project-control-history",
    "staged-manifest-restored",
    "staged-runtime-restored",
    "staged-symlink-restored",
    "committed-manifest-restored",
    "committed-runtime-restored",
    "committed-symlink-restored",
    "committed-baseline-reset",
  ])("rejects independently inspected %s", async (variant) => {
    const cwd = await mkdtemp(join(tmpdir(), "mp06-v39-negative-"));
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
        "synthetic v39 fixture",
      ]);
    };
    try {
      git(["clone", "--shared", "--no-hardlinks", fileURLToPath(root), cwd]);
      git(["checkout", "--detach", TEST_OPERATION_POLICY_V39.baseline]);
      for (const path of V39_ALLOWED_PATHS) {
        if (!existsSync(new URL(path, root))) continue;
        await mkdir(dirname(join(cwd, path)), { recursive: true });
        await copyFile(new URL(path, root), join(cwd, path));
      }
      expect(() =>
        inspectV39Repository(cwd, projectControlGitExecutable()),
      ).not.toThrow();
      if (variant.startsWith("committed")) commit();
      const path = variant.includes("symlink")
        ? "src/project-control.ts"
        : variant.includes("runtime")
          ? "worker/index.ts"
          : variant === "project-control-history"
            ? "PROJECT_CONTROL.md"
            : variant === "owner-history"
              ? "docs/project/OWNER_DECISION_LOG.md"
              : "config/project/current-work.json";
      const original = readFileSync(join(cwd, path), "utf8");
      if (variant.includes("symlink")) {
        await rm(join(cwd, path));
        await symlink("project-control-v39.ts", join(cwd, path));
      } else if (variant === "owner-history") {
        await writeFile(
          join(cwd, path),
          original.replace("Owner", "Rewritten"),
        );
      } else if (variant === "project-control-history") {
        await writeFile(
          join(cwd, path),
          original.replace(
            "## Current effective control — v38",
            "## Rewritten historical v38",
          ),
        );
      } else if (variant.includes("runtime")) {
        await writeFile(
          join(cwd, path),
          original + "\n// forbidden runtime edit\n",
        );
      } else if (variant === "committed-baseline-reset") {
        for (const controlPath of [
          "config/project/roadmap.json",
          "config/project/current-work.json",
          "config/project/current-work.schema.json",
        ])
          await writeFile(
            join(cwd, controlPath),
            git([
              "show",
              `${TEST_OPERATION_POLICY_V39.baseline}:${controlPath}`,
            ]),
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
        else work.wp8fSuccessorOperationJournal = [];
        await writeFile(join(cwd, path), JSON.stringify(work));
      }
      if (variant.startsWith("staged")) {
        git(["add", path]);
        if (variant.includes("symlink")) await rm(join(cwd, path));
        await writeFile(join(cwd, path), original);
      } else if (variant.startsWith("committed")) {
        commit();
        if (variant === "committed-baseline-reset") {
          for (const controlPath of [
            "config/project/roadmap.json",
            "config/project/current-work.json",
            "config/project/current-work.schema.json",
          ])
            await copyFile(new URL(controlPath, root), join(cwd, controlPath));
        } else {
          if (variant.includes("symlink")) await rm(join(cwd, path));
          await writeFile(join(cwd, path), original);
        }
        commit();
      }
      expect(() =>
        inspectV39Repository(cwd, projectControlGitExecutable()),
      ).toThrow();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
