import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import {
  runProjectControlValidation,
  runPullRequestControlValidation,
} from "../src/project-control-cli.js";
import {
  TEST_KNOWLEDGE_VALIDITY_V46 as c,
  V46_ALLOWED_PATHS,
  inspectV46Repository,
  parseV46LocalStatus,
  projectV46ToV45,
} from "../src/project-control-v46.js";
import {
  INSPECTOR_BATCH_V45,
  evaluateV45Action,
} from "../src/project-control-v45.js";
import { HARNESS_PUBLICATION_V43 } from "../src/project-control-v43.js";

const root = new URL("../", import.meta.url);
const snapshotBytes = readFileSync(
  new URL("tests/fixtures/mp06-v46-local/snapshot.json", root),
);
if (
  createHash("sha256").update(snapshotBytes).digest("hex") !==
  "1934b50063f6cc3ec4dd3407f943f61888a1dde3e77180e01e2fb39fe5a74109"
)
  throw new Error("V46_HISTORICAL_SNAPSHOT_CHANGED");
const snapshot = JSON.parse(snapshotBytes.toString("utf8")) as {
  files: Record<string, string>;
};
const historical = (path: string) => {
  if (path === "config/project/roadmap.schema.json")
    return execFileSync(
      projectControlGitExecutable(),
      [
        "--no-replace-objects",
        "--no-optional-locks",
        "show",
        `${c.baseline}:${path}`,
      ],
      { cwd: fileURLToPath(root), stdio: ["pipe", "pipe", "pipe"] },
    );
  const content = snapshot.files[path];
  if (typeof content !== "string")
    throw new Error("V46_HISTORICAL_PATH_MISSING");
  return Buffer.from(content, "base64");
};
const read = (path: string) =>
  JSON.parse(historical(path).toString("utf8")) as Record<string, unknown>;
const git = (cwd: string, args: string[]) =>
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
    { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
const environmentKeys = [
  "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH",
  "GITHUB_REPOSITORY",
  "GITHUB_SHA",
  "GITHUB_REF",
] as const;
async function withFixture(run: (cwd: string) => Promise<void> | void) {
  const cwd = await mkdtemp(join(tmpdir(), "mp06-v46-"));
  const previous = environmentKeys.map(
    (key) => [key, process.env[key]] as const,
  );
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    git(fileURLToPath(root), [
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      fileURLToPath(root),
      cwd,
    ]);
    git(cwd, ["checkout", "--quiet", "--detach", c.baseline]);
    for (const path of V46_ALLOWED_PATHS) {
      await mkdir(dirname(join(cwd, path)), { recursive: true });
      await writeFile(join(cwd, path), historical(path));
    }
    await run(cwd);
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
  }
}
function priorCommitReceipt() {
  const old = HARNESS_PUBLICATION_V43;
  return {
    kind: "V45_LOCAL_QUALIFICATION",
    controlVersion: INSPECTOR_BATCH_V45.version,
    baseline: INSPECTOR_BATCH_V45.baseline,
    pullRequest: 20,
    implementationSeals: { ...INSPECTOR_BATCH_V45.implementationSeals },
    measurement: "PAIRED_MEASURED_AND_REVIEWED",
    local: {
      stage: "PRE_COMMIT",
      repository: INSPECTOR_BATCH_V45.repository,
      headBranch: INSPECTOR_BATCH_V45.headBranch,
      baseBranch: INSPECTOR_BATCH_V45.baseBranch,
      baseHead: INSPECTOR_BATCH_V45.baseHead,
      head: INSPECTOR_BATCH_V45.baseline,
      candidateParent: INSPECTOR_BATCH_V45.baseline,
      tree: "b".repeat(40),
      qualifiedTree: "b".repeat(40),
      diffSha256: "c".repeat(64),
      reviewedDiffSha256: "c".repeat(64),
      snapshotSha256: old.snapshotSha256,
      priorV42SourceSealSha256: old.priorV42SourceSealSha256,
      validation: "FOCUSED_PASS",
      independentReview: "NO_ACTIONABLE_FINDINGS",
      workingTreeMatchesIndex: true,
      workingTreeClean: false,
      audit: "ZERO_AT_EVERY_SEVERITY",
      auditTree: "b".repeat(40),
      workspaceSha256: old.dependencyPatch.workspaceSha256,
      lockfileSha256: old.dependencyPatch.lockfileSha256,
    },
  };
}
describe("v46 local TEST validity control", () => {
  it("validates closed current control and projects exactly to immutable v45", () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json"),
      s = read("config/project/current-work.schema.json");
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
        historical("docs/project/OWNER_DECISION_LOG.md").toString("utf8"),
        c.version,
      ),
    ).toBe(true);
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      controlVersion: c.version,
      allowedActions: [
        "LOCAL_IMPLEMENTATION",
        "LOCAL_VALIDATION",
        "LOCAL_ANALYSIS",
      ],
      commitAuthorized: false,
      publicationAuthorized: false,
      remoteExecutionAuthorized: false,
      productionAuthorized: false,
    });
    projectV46ToV45(r, w, s);
    for (const [path, value] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(value).toEqual(
        JSON.parse(git(fileURLToPath(root), ["show", c.baseline + ":" + path])),
      );
  });
  it("denies publication and remote actions even with a valid historical v45 receipt", () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json"),
      receipt = priorCommitReceipt();
    expect(evaluateV45Action("COMMIT", receipt).allowed).toBe(true);
    for (const action of [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_VALIDATION",
      "LOCAL_ANALYSIS",
    ])
      expect(evaluateProjectAction(r, w, action).allowed).toBe(true);
    for (const action of [
      "COMMIT",
      "PUSH_BRANCH",
      "CREATE_DRAFT_PR",
      "READY_FOR_REVIEW",
      "MERGE",
      "TEST_DEPLOY",
      "PRODUCTION_DEPLOY",
      "STORAGE_OBSERVATION",
      "SQL",
      "U2",
      "CLOSE_ISSUE",
      "UNKNOWN",
    ])
      expect(
        evaluateProjectAction(r, w, action, undefined, receipt).allowed,
      ).toBe(false);
  });
  it("rejects changed authority, inherited fields and reopened schema", () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json"),
      s = read("config/project/current-work.schema.json");
    (w.testKnowledgeValidityV46 as Record<string, unknown>).commit = true;
    expect(validateProjectControl(r, w).errors).toContain(
      "V46_EXACT_LOCAL_CONTROL_INVALID",
    );
    (s.properties as Record<string, unknown>).testKnowledgeValidityV46 = {
      type: "object",
    };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        c.version,
      ),
    ).toContain("V46_SCHEMA_NOT_CLOSED");
  });
  it("accepts the local overlay without changing its raw index or HEAD", async () => {
    await withFixture(async (cwd) => {
      const index = join(
          git(cwd, ["rev-parse", "--absolute-git-dir"]),
          "index",
        ),
        before = readFileSync(index);
      expect(
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toMatchObject({
        head: c.baseline,
        mode: "UNCOMMITTED_LOCAL_OVERLAY",
        commitAuthorized: false,
        publicationAuthorized: false,
      });
      await expect(
        runProjectControlValidation(pathToFileURL(cwd + "/")),
      ).resolves.toBeUndefined();
      expect(readFileSync(index)).toEqual(before);
      expect(git(cwd, ["rev-parse", "HEAD"])).toBe(c.baseline);
    });
  });
  it("preserves the raw index when an unchanged file has stale stat metadata", async () => {
    await withFixture(async (cwd) => {
      git(cwd, ["config", "diff.autoRefreshIndex", "true"]);
      const path = join(cwd, "README.md");
      const content = readFileSync(path);
      await writeFile(path, content);
      await utimes(path, new Date(0), new Date(0));
      const index = join(
        git(cwd, ["rev-parse", "--absolute-git-dir"]),
        "index",
      );
      const before = readFileSync(index);
      expect(
        inspectV46Repository(cwd, projectControlGitExecutable()).changedPaths,
      ).not.toContain("README.md");
      expect(readFileSync(index)).toEqual(before);
      expect(readFileSync(path)).toEqual(content);
      expect(existsSync(index + ".lock")).toBe(false);
      await expect(
        runProjectControlValidation(pathToFileURL(cwd + "/")),
      ).resolves.toBeUndefined();
      expect(readFileSync(index)).toEqual(before);
      expect(git(cwd, ["rev-parse", "HEAD"])).toBe(c.baseline);
    });
  });
  it("decodes only complete unstaged porcelain paths without folding or normalization", () => {
    expect(parseV46LocalStatus("")).toEqual([]);
    expect(parseV46LocalStatus(" M src/faq.ts\0?? tests/a b.ts\0")).toEqual([
      "src/faq.ts",
      "tests/a b.ts",
    ]);
    expect(parseV46LocalStatus(" T src/faq.ts\0 D tests/a.ts\0")).toEqual([
      "src/faq.ts",
      "tests/a.ts",
    ]);
    for (const invalid of [
      null,
      [],
      " M src/faq.ts",
      " M src/faq.ts\0\0",
      " M src/faq.ts\0?? src/faq.ts\0",
      "M  src/faq.ts\0",
      "MM src/faq.ts\0",
      " A src/faq.ts\0",
      "R  old\0new\0",
      "!! ignored\0",
      "UU src/faq.ts\0",
      " M /absolute\0",
      "?? ../outside\0",
      "?? a/./b\0",
      "?? a//b\0",
      "?? \0",
    ])
      expect(parseV46LocalStatus(invalid)).toBeNull();
  });
  it("still rejects real edits outside scope while leaving index bytes untouched", async () => {
    await withFixture(async (cwd) => {
      const index = join(
        git(cwd, ["rev-parse", "--absolute-git-dir"]),
        "index",
      );
      const before = readFileSync(index);
      await writeFile(join(cwd, "README.md"), "A real out-of-scope change.\n");
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_PATH_OUTSIDE_SCOPE");
      expect(readFileSync(index)).toEqual(before);
      expect(existsSync(index + ".lock")).toBe(false);
    });
  });
  it("rejects unknown paths and staged changes", async () => {
    await withFixture(async (cwd) => {
      await writeFile(join(cwd, "out-of-scope.txt"), "synthetic");
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_PATH_OUTSIDE_SCOPE");
      await rm(join(cwd, "out-of-scope.txt"));
      git(cwd, ["add", "config/project/roadmap.json"]);
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_INDEX_MUST_REMAIN_BASELINE");
    });
  });
  it("rejects inherited record edits and rewritten history", async () => {
    await withFixture(async (cwd) => {
      const p = join(cwd, "config/project/current-work.json"),
        original = readFileSync(p, "utf8"),
        work = JSON.parse(original) as Record<string, unknown>;
      (work.inspectorBatchV45 as Record<string, unknown>).merge = true;
      await writeFile(p, JSON.stringify(work));
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_INHERITED_CONTROL_DRIFT");
      await writeFile(p, original);
      await writeFile(
        join(cwd, "docs/project/EXECUTION_GATES.md"),
        "rewritten",
      );
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_HISTORY_REWRITTEN");
    });
  });
  it("rejects changed customer answers and non-exact historical archive", async () => {
    await withFixture(async (cwd) => {
      const p = "config/approved-knowledge-base/test-knowledge-base.json",
        original = readFileSync(join(cwd, p), "utf8"),
        manifest = JSON.parse(original) as {
          categories: { MENU: { customerFacingAnswer: string } };
        };
      const archive = join(
        cwd,
        "tests/fixtures/knowledge-base/test-knowledge-base-v1.json",
      );
      await mkdir(dirname(archive), { recursive: true });
      await writeFile(
        archive,
        execFileSync(
          projectControlGitExecutable(),
          [
            "--no-replace-objects",
            "--no-optional-locks",
            "show",
            c.baseline + ":" + p,
          ],
          { cwd },
        ),
      );
      manifest.categories.MENU.customerFacingAnswer = "unauthorized change";
      await writeFile(join(cwd, p), JSON.stringify(manifest));
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_KNOWLEDGE_CONTENT_CHANGED");
      await writeFile(join(cwd, p), original);
      await writeFile(archive, "{}");
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_PRIOR_KNOWLEDGE_ARCHIVE_MISMATCH");
    });
  });
  it("rejects allowed-name symlinks and hidden index flags", async () => {
    await withFixture(async (cwd) => {
      const p = join(cwd, "tests/test-knowledge-validity.test.ts");
      await rm(p, { force: true });
      await symlink(join(cwd, "package.json"), p);
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_NON_REGULAR_PATH");
      await rm(p);
      git(cwd, ["update-index", "--assume-unchanged", "package.json"]);
      expect(() =>
        inspectV46Repository(cwd, projectControlGitExecutable()),
      ).toThrow("V46_HIDDEN_INDEX_FLAGS_REJECTED");
    });
  });
  it("allows only the exact provider-hang clock alignment and preserves every other Worker byte", async () => {
    await withFixture(async (cwd) => {
      const clock = c.workerHangClockFixture;
      const baseline = execFileSync(
        projectControlGitExecutable(),
        [
          "--no-replace-objects",
          "--no-optional-locks",
          "show",
          c.baseline + ":" + clock.path,
        ],
        { cwd, encoding: "utf8" },
      );
      const before = `    vi.setSystemTime(new Date("${clock.before}"));`;
      const after = `    vi.setSystemTime(new Date("${clock.after}"));`;
      expect(baseline.split(before)).toHaveLength(2);
      const candidate = baseline.replace(before, after);
      const path = join(cwd, clock.path);
      await writeFile(path, baseline);
      expect(
        inspectV46Repository(cwd, projectControlGitExecutable())
          .workerClockFixtureState,
      ).toBe("BASELINE_PRE_RENEWAL");
      await writeFile(path, candidate);
      expect(
        inspectV46Repository(cwd, projectControlGitExecutable())
          .workerClockFixtureState,
      ).toBe("RENEWAL_COMPATIBLE");
      for (const changed of [
        candidate.replace(
          after,
          '    vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));',
        ),
        candidate.replace(after, after + "\n" + after),
        candidate.replace(after, ""),
        candidate.replace(
          "expect(targetAbortObserved).toBe(true);",
          "expect(targetAbortObserved).toBe(false);",
        ),
        candidate + "\n// Additional change is not authorized.\n",
      ]) {
        expect(changed).not.toBe(candidate);
        await writeFile(path, changed);
        expect(() =>
          inspectV46Repository(cwd, projectControlGitExecutable()),
        ).toThrow("V46_WORKER_CLOCK_EXACT_SINGLE_LITERAL_REQUIRED");
      }
    });
  });
  it("rejects PR adapter entry points", async () => {
    await withFixture(async (cwd) => {
      process.env.GITHUB_EVENT_NAME = "pull_request";
      process.env.GITHUB_REPOSITORY = c.repository;
      const url = pathToFileURL(cwd + "/");
      await expect(runProjectControlValidation(url)).rejects.toThrow(
        "V46_LOCAL_ONLY_PR_ADAPTER_DENIED",
      );
      const eventPath = join(
        tmpdir(),
        "mp06-v46-event-" + cwd.split("/").at(-1) + ".json",
      );
      try {
        await writeFile(eventPath, "{}");
        await expect(
          runPullRequestControlValidation(url, eventPath),
        ).rejects.toThrow("V46_LOCAL_ONLY_PR_ADAPTER_DENIED");
      } finally {
        await rm(eventPath, { force: true });
      }
    });
  });
});
