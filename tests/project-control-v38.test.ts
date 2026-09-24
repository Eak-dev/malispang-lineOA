import { readFileSync, existsSync } from "node:fs";
import { copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectAction,
  projectControlGitExecutable,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
import {
  TEST_READINESS_V38,
  V38_ALLOWED_PATHS,
  inspectV38Repository,
  projectV38ToV37,
  v38PathsAllowed,
} from "../src/project-control-v38.js";

const root = new URL("../", import.meta.url);
type FixtureDocument = Record<string, unknown> & {
  version: string;
  testReadinessV38: Record<string, unknown>;
  properties: Record<string, unknown>;
};
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8")) as FixtureDocument;
const fixtures = () => ({
  r: read("config/project/roadmap.json"),
  w: read("config/project/current-work.json"),
  s: read("config/project/current-work.schema.json"),
});

describe("v38 TEST mandate without inherited remote authority", () => {
  it.each(["journal", "owner-history", "staged-policy", "history-restored"])(
    "rejects independently observed %s drift",
    async (variant) => {
      const cwd = await mkdtemp(join(tmpdir(), "mp06-v38-negative-"));
      const git = (args: string[]) =>
        execFileSync(projectControlGitExecutable(), args, {
          cwd,
          encoding: "utf8",
          stdio: "pipe",
        });
      try {
        git(["clone", "--shared", "--no-hardlinks", fileURLToPath(root), cwd]);
        git(["checkout", "--detach", TEST_READINESS_V38.baseline]);
        for (const path of V38_ALLOWED_PATHS) {
          if (!existsSync(new URL(path, root))) continue;
          await mkdir(dirname(join(cwd, path)), { recursive: true });
          await copyFile(new URL(path, root), join(cwd, path));
        }
        expect(() =>
          inspectV38Repository(cwd, projectControlGitExecutable()),
        ).not.toThrow();
        if (variant === "journal") {
          const path = join(cwd, "config/project/current-work.json");
          const work = JSON.parse(readFileSync(path, "utf8")) as Record<
            string,
            unknown
          >;
          work.wp8fSuccessorOperationJournal = [];
          await writeFile(path, JSON.stringify(work));
        } else if (variant === "owner-history") {
          const path = join(cwd, "docs/project/OWNER_DECISION_LOG.md");
          await writeFile(
            path,
            readFileSync(path, "utf8").replace("Owner", "Altered"),
          );
        } else if (variant === "staged-policy") {
          const path = join(cwd, "wrangler.jsonc");
          const original = readFileSync(path);
          await writeFile(path, "forbidden staged config");
          git(["add", "wrangler.jsonc"]);
          await writeFile(path, original);
        } else {
          git(["add", "--all"]);
          git([
            "-c",
            "user.name=Synthetic Test",
            "-c",
            "user.email=synthetic@example.invalid",
            "commit",
            "-m",
            "synthetic v38 fixture",
          ]);
          expect(() =>
            inspectV38Repository(cwd, projectControlGitExecutable()),
          ).not.toThrow();
          const path = join(cwd, "config/project/current-work.json");
          const original = readFileSync(path);
          const work = JSON.parse(original.toString()) as Record<
            string,
            unknown
          >;
          work.wp8fSuccessorOperationJournal = [];
          await writeFile(path, JSON.stringify(work));
          git(["add", "config/project/current-work.json"]);
          git([
            "-c",
            "user.name=Synthetic Test",
            "-c",
            "user.email=synthetic@example.invalid",
            "commit",
            "-m",
            "synthetic forbidden mutation",
          ]);
          await writeFile(path, original);
          git(["add", "config/project/current-work.json"]);
          git([
            "-c",
            "user.name=Synthetic Test",
            "-c",
            "user.email=synthetic@example.invalid",
            "commit",
            "-m",
            "synthetic restoration",
          ]);
        }
        expect(() =>
          inspectV38Repository(cwd, projectControlGitExecutable()),
        ).toThrow();
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  );
  it("validates current controls and preserved inherited controls", () => {
    const { r, w, s } = fixtures();
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ),
    ).toEqual([]);
    expect(
      validateWp8fOwnerDecisionRecord(
        readFileSync(
          new URL("docs/project/OWNER_DECISION_LOG.md", root),
          "utf8",
        ),
        r.version,
      ),
    ).toBe(true);
    expect(evaluateProjectAction(r, w, "LOCAL_IMPLEMENTATION").allowed).toBe(
      true,
    );
    expect(evaluateProjectAction(r, w, "UPDATE_GITHUB_ROADMAP").allowed).toBe(
      true,
    );
    projectV38ToV37(r, w, s);
    expect(r.version).toBe(TEST_READINESS_V38.supersedes);
    expect(validateProjectControl(r, w).errors).toEqual([]);
  });

  it.each([
    "DEPLOY_TEST",
    "ACTIVATE_TEST",
    "SEND_LINE",
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
    "UNKNOWN",
  ])("does not inherit authority for %s", (action) => {
    const { r, w } = fixtures();
    expect(evaluateProjectAction(r, w, action).allowed).toBe(false);
  });

  it.each(Object.keys(TEST_READINESS_V38))("rejects scope drift: %s", (key) => {
    const { r, w } = fixtures();
    w.testReadinessV38[key] = "drift";
    expect(validateProjectControl(r, w).errors).toContain(
      "V38_EXACT_TEST_READINESS_CONTROL_INVALID",
    );
    expect(evaluateProjectAction(r, w, "LOCAL_IMPLEMENTATION").allowed).toBe(
      false,
    );
  });

  it("rejects schema widening, missing Owner record and unknown scope fields", () => {
    const { r, w, s } = fixtures();
    s.properties.testReadinessV38 = { type: "object" };
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        r.version,
      ),
    ).toContain("V38_SCHEMA_NOT_CLOSED");
    expect(
      validateWp8fOwnerDecisionRecord("Owner said approved", r.version),
    ).toBe(false);
    w.testReadinessV38.extraGrant = true;
    expect(validateProjectControl(r, w).errors).toContain(
      "V38_EXACT_TEST_READINESS_CONTROL_INVALID",
    );
  });

  it.each([
    "wrangler.jsonc",
    ".env",
    "worker/../wrangler.jsonc",
    "../worker/index.ts",
    "worker/index.ts\n",
    ".github/workflows/ci.yml",
    "config/project/roadmap.schema.json",
  ])("rejects out-of-scope path %s", (path) => {
    expect(v38PathsAllowed([path])).toBe(false);
  });

  it("allows only the exact local path inventory and verifies inherited Git evidence", () => {
    expect(v38PathsAllowed(V38_ALLOWED_PATHS)).toBe(true);
    expect(() =>
      inspectV38Repository(fileURLToPath(root), projectControlGitExecutable()),
    ).not.toThrow();
  });
});
