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
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
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
import { readQualifiedV42Snapshot } from "../src/project-control-v43.js";
import {
  LOCAL_HARNESS_REPAIR_V42,
  V42_ALLOWED_ACTIONS,
  V42_ALLOWED_PATHS,
  inspectV42Repository,
  projectV42ToV41,
  v42PathsAllowed,
} from "../src/project-control-v42.js";

// Restore the exact never-committed qualified overlay; current implementations
// remain imported above. No successor bytes substitute for historical inputs.
const sourceRoot = new URL("../", import.meta.url);
const snapshot = readQualifiedV42Snapshot(fileURLToPath(sourceRoot));
const historicalRoot = await mkdtemp(join(tmpdir(), "mp06-v42-qualified-"));
afterAll(async () => {
  await rm(historicalRoot, { recursive: true, force: true });
});
try {
  execFileSync(
    projectControlGitExecutable(),
    [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      fileURLToPath(sourceRoot),
      historicalRoot,
    ],
    { stdio: "pipe" },
  );
  execFileSync(
    projectControlGitExecutable(),
    ["checkout", "--quiet", "--detach", snapshot.baseline],
    { cwd: historicalRoot, stdio: "pipe" },
  );
  const patch = readFileSync(
    new URL("tests/fixtures/mp06-v42-qualified/overlay.patch", sourceRoot),
  );
  execFileSync(
    projectControlGitExecutable(),
    ["apply", "--unidiff-zero", "--check", "-"],
    {
      cwd: historicalRoot,
      input: patch,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  execFileSync(
    projectControlGitExecutable(),
    ["apply", "--unidiff-zero", "-"],
    {
      cwd: historicalRoot,
      input: patch,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  for (const path of snapshot.paths)
    if (
      createHash("sha256")
        .update(readFileSync(join(historicalRoot, path)))
        .digest("hex") !== snapshot.hashes[path]
    )
      throw new Error("V42_QUALIFIED_RESTORATION_HASH_MISMATCH:" + path);
} catch (error) {
  await rm(historicalRoot, { recursive: true, force: true });
  throw error;
}
const root = pathToFileURL(historicalRoot + "/");
async function validateHistoricalControl(
  validate = () => runProjectControlValidation(root),
) {
  const prior = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    await validate();
  } finally {
    if (prior === undefined) delete process.env.GITHUB_EVENT_NAME;
    else process.env.GITHUB_EVENT_NAME = prior;
  }
}
const c = LOCAL_HARNESS_REPAIR_V42;
const controls = [
  "config/project/roadmap.json",
  "config/project/current-work.json",
  "config/project/current-work.schema.json",
] as const;
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as Record<
    string,
    unknown
  >;
const git = (cwd: string, ...args: string[]) =>
  execFileSync(
    projectControlGitExecutable(),
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "protocol.allow=never",
      "-c",
      "protocol.file.allow=always",
      ...args,
    ],
    { cwd, encoding: "utf8", stdio: "pipe" },
  ).trim();
const inspect = (cwd: string) =>
  inspectV42Repository(cwd, projectControlGitExecutable());

async function withFixture(run: (cwd: string) => Promise<void> | void) {
  const cwd = await mkdtemp(join(tmpdir(), "mp06-v42-regression-"));
  try {
    git(
      fileURLToPath(root),
      "clone",
      "--quiet",
      "--shared",
      "--no-checkout",
      fileURLToPath(root),
      cwd,
    );
    git(cwd, "checkout", "--quiet", "--detach", c.baseline);
    for (const path of V42_ALLOWED_PATHS) {
      if (!existsSync(new URL(path, root))) continue;
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await copyFile(new URL(path, root), join(cwd, path));
    }
    await run(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
  }
}

describe("v42 local harness repair over consumed PR19 integration", () => {
  it.each(["success", "failure"])(
    "restores the outer PR event after historical CLI %s",
    async (outcome) => {
      const prior = process.env.GITHUB_EVENT_NAME;
      process.env.GITHUB_EVENT_NAME = "pull_request";
      try {
        const call = validateHistoricalControl(async () => {
          expect(process.env.GITHUB_EVENT_NAME).toBe("push");
          if (outcome === "failure")
            throw new Error("synthetic historical validation failure");
          await runProjectControlValidation(root);
        });
        if (outcome === "failure")
          await expect(call).rejects.toThrow(
            "synthetic historical validation failure",
          );
        else await expect(call).resolves.toBeUndefined();
        expect(process.env.GITHUB_EVENT_NAME).toBe("pull_request");
      } finally {
        if (prior === undefined) delete process.env.GITHUB_EVENT_NAME;
        else process.env.GITHUB_EVENT_NAME = prior;
      }
    },
  );
  it("validates the uncommitted overlay and exactly preserves the v41 manifests", async () => {
    const [r, w, s] = controls.map(read);
    if (!r || !w || !s) throw new Error("missing fixture controls");
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        c.version,
      ),
    ).toEqual([]);
    expect(
      validateWp8fOwnerDecisionRecord(
        readFileSync(
          new URL("docs/project/OWNER_DECISION_LOG.md", root),
          "utf8",
        ),
        c.version,
      ),
    ).toBe(true);
    await expect(validateHistoricalControl()).resolves.toBeUndefined();
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      status: c.stage,
      allowedActions: V42_ALLOWED_ACTIONS,
      integrationGrant: "CONSUMED_AT_BASELINE_NO_REPLACEMENT",
      commitAuthorized: false,
      publicationAuthorized: false,
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
    });
    projectV42ToV41(r, w, s);
    for (const [index, path] of controls.entries())
      expect([r, w, s][index]).toEqual(
        JSON.parse(git(fileURLToPath(root), "show", `${c.baseline}:${path}`)),
      );
  });

  it("allows only local actions and never inherits old grants or approval receipts", () => {
    const [r, w] = controls.map(read);
    for (const action of V42_ALLOWED_ACTIONS)
      expect(evaluateProjectAction(r, w, action).allowed).toBe(true);
    for (const action of [
      "COMMIT",
      "PUSH_BRANCH",
      "UPDATE_GITHUB_ROADMAP",
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE_MP06_POLICY",
      "DEPLOY_TEST",
      "QUERY_STORAGE",
      "QUERY_PRODUCTION",
      "CLOSE_ISSUE",
      "UNKNOWN_ACTION",
    ])
      expect(
        evaluateProjectAction(r, w, action, undefined, {
          approved: true,
          kind: "LIVE_GITHUB_INTEGRATION",
          integrationGrant: "UNUSED",
        }).allowed,
        action,
      ).toBe(false);
    const changed = structuredClone(w!);
    (changed.localHarnessRepairV42 as Record<string, unknown>).commit = true;
    expect(validateProjectControl(r, changed).errors).toContain(
      "V42_EXACT_LOCAL_HARNESS_CONTROL_INVALID",
    );
  });

  it("requires a closed successor schema and exact paths", () => {
    const schema = read(controls[2]);
    (schema.properties as Record<string, unknown>).localHarnessRepairV42 = {
      type: "object",
    };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        schema,
        c.version,
      ),
    ).toContain("V42_SCHEMA_NOT_CLOSED");
    expect(v42PathsAllowed(["tests/project-control.test.ts"])).toBe(true);
    for (const path of [
      "../tests/project-control.test.ts",
      "tests/unknown.ts",
      "src/project-control-integration.ts",
      ".github/workflows/ci.yml",
      "package.json",
    ])
      expect(v42PathsAllowed([path]), path).toBe(false);
  });

  it("permits only the explicit new untracked regression/module paths", async () => {
    await withFixture(async (cwd) => {
      const indexBefore = readFileSync(join(cwd, ".git/index"));
      expect(inspect(cwd).changedPaths).toContain(
        "tests/project-control-v42.test.ts",
      );
      expect(readFileSync(join(cwd, ".git/index"))).toEqual(indexBefore);
      await writeFile(
        join(cwd, "tests/unknown.ts"),
        "// outside this package\n",
      );
      expect(() => inspect(cwd)).toThrow("V42_PATH_OUTSIDE_SCOPE");
    });
  });

  it.each(["working", "staged"])(
    "rejects a protected %s edit even when the other view is clean",
    async (view) => {
      await withFixture(async (cwd) => {
        const path = "worker/index.ts",
          file = join(cwd, path),
          original = readFileSync(file);
        await writeFile(
          file,
          Buffer.concat([original, Buffer.from("\n// synthetic drift\n")]),
        );
        if (view === "staged") {
          git(cwd, "add", "--", path);
          await writeFile(file, original);
        }
        expect(() => inspect(cwd)).toThrow("V42_PATH_OUTSIDE_SCOPE");
      });
    },
  );

  it.each([
    "unknown-control",
    "unknown-schema",
    "grant",
    "history",
    "partial-index",
  ])("rejects %s drift", async (variant) => {
    await withFixture(async (cwd) => {
      const workPath = join(cwd, controls[1]);
      if (variant === "history") {
        await writeFile(
          join(cwd, "docs/project/OWNER_DECISION_LOG.md"),
          "rewritten history\n",
        );
      } else if (variant === "unknown-schema") {
        const schemaPath = join(cwd, controls[2]);
        const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
          properties: Record<string, unknown>;
        };
        schema.properties.unapprovedField = { type: "boolean" };
        await writeFile(schemaPath, JSON.stringify(schema));
      } else if (variant === "partial-index") {
        git(cwd, "add", "--", controls[1]);
      } else {
        const work = JSON.parse(readFileSync(workPath, "utf8")) as Record<
          string,
          unknown
        >;
        if (variant === "unknown-control") work.unapprovedField = true;
        else
          (
            work.testPolicyIntegrationV41 as Record<string, unknown>
          ).maximumIntegrationMerges = 2;
        await writeFile(workPath, JSON.stringify(work));
      }
      expect(() => inspect(cwd)).toThrow(
        variant === "history"
          ? "V42_HISTORY_REWRITTEN"
          : variant === "partial-index"
            ? "V42_PARTIAL_BASELINE_INDEX_REJECTED"
            : "V42_INHERITED_CONTROL_DRIFT",
      );
    });
  });

  it("rejects a changed HEAD even when the source tree is identical", async () => {
    await withFixture((cwd) => {
      git(cwd, "checkout", "--quiet", "--detach", c.sourceCommit);
      expect(() => inspect(cwd)).toThrow(
        "V42_EXACT_UNCOMMITTED_BASELINE_REQUIRED",
      );
    });
  });

  it.each(["--assume-unchanged", "--skip-worktree"])(
    "rejects a protected working edit hidden by %s",
    async (flag) => {
      await withFixture(async (cwd) => {
        const path = "worker/index.ts",
          file = join(cwd, path);
        git(cwd, "update-index", flag, "--", path);
        await writeFile(
          file,
          readFileSync(file, "utf8") + "\n// hidden synthetic drift\n",
        );
        expect(git(cwd, "diff", "--name-only", "--", path)).toBe("");
        expect(() => inspect(cwd)).toThrow("V42_HIDDEN_INDEX_FLAGS_REJECTED");
      });
    },
  );

  it.each(["index.lock", "MERGE_HEAD", "rebase-merge"])(
    "rejects incomplete Git state %s",
    async (path) => {
      await withFixture(async (cwd) => {
        if (path === "rebase-merge") await mkdir(join(cwd, ".git", path));
        else await writeFile(join(cwd, ".git", path), c.sourceCommit + "\n");
        expect(() => inspect(cwd)).toThrow("V42_IN_PROGRESS_OR_GRAFT_STATE");
      });
    },
  );

  it("rejects replacement refs even though object reads disable replacement", async () => {
    await withFixture((cwd) => {
      git(cwd, "replace", c.baseline, c.sourceCommit);
      expect(() => inspect(cwd)).toThrow("V42_REPLACEMENT_REFS_REJECTED");
    });
  });

  it("rejects a symlink on an allowed path", async () => {
    await withFixture(async (cwd) => {
      const file = join(cwd, "tests/project-control-v42.test.ts");
      await rm(file);
      await symlink(join(cwd, "worker/index.ts"), file);
      expect(() => inspect(cwd)).toThrow("V42_NON_REGULAR_PATH");
    });
  });
});
