import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  POST_MERGE_V64 as c,
  V64_ALLOWED_PATHS,
  inspectV64Repository,
  validateV64DependencyBytes,
  validateV64Overlay,
} from "../src/project-control-v64.js";
import baseline from "../src/project-control-v64-baseline.json" with { type: "json" };
import {
  PUBLICATION_V65,
  projectV65ToV64,
  inspectV65Repository,
} from "../src/project-control-v65.js";
import {
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
  summarizeProjectAuthority,
  evaluateProjectAction,
} from "../src/project-control.js";

const root = fileURLToPath(new URL("../", import.meta.url));
type Roadmap = {
  items: { id: string; state: string; [key: string]: unknown }[];
  [key: string]: unknown;
};
type Work = {
  authorization: Record<string, boolean>;
  postMergeV64: {
    grants: { remainingDeployments: number };
    acceptedSource: string;
  };
  testDeploymentV61: { operatorRetry: boolean };
  [key: string]: unknown;
};
const read = <T = Record<string, unknown>>(p: string): T =>
  JSON.parse(readFileSync(join(root, p), "utf8")) as T;
const overlay = (roadmap: Roadmap, work: Work) => {
  const r = structuredClone(roadmap),
    w = structuredClone(work);
  if (r.version === PUBLICATION_V65.version) projectV65ToV64(r, w);
  return validateV64Overlay(r, w);
};
const git = (cwd: string, ...args: string[]) =>
  execFileSync(
    "git",
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-c",
      "diff.autoRefreshIndex=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "protocol.allow=never",
      "-c",
      "protocol.file.allow=always",
      ...args,
    ],
    { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ).trim();
const state = () => ({
  head: git(root, "rev-parse", "HEAD"),
  index: readFileSync(
    join(git(root, "rev-parse", "--absolute-git-dir"), "index"),
  ),
  status: git(root, "status", "--porcelain=v1", "--untracked-files=all"),
});
const commitFixture = (dir: string, message = "Synthetic review fixture") => {
  git(
    dir,
    "-c",
    "user.name=Codex Harness",
    "-c",
    "user.email=codex-harness@invalid.example",
    "commit",
    "--quiet",
    "-m",
    message,
  );
  return git(dir, "rev-parse", "HEAD");
};
async function fixture(run: (dir: string) => Promise<void> | void) {
  const before = state(),
    dir = await mkdtemp(join(tmpdir(), "mp06-v64-"));
  try {
    git(
      root,
      "clone",
      "--quiet",
      "--shared",
      "--no-hardlinks",
      "--no-checkout",
      root,
      dir,
    );
    git(dir, "checkout", "--quiet", "-B", c.implementationBranch, c.baseline);
    git(
      dir,
      "remote",
      "set-url",
      "origin",
      "https://github.com/" + c.repository + ".git",
    );
    for (const p of V64_ALLOWED_PATHS) {
      await mkdir(dirname(join(dir, p)), { recursive: true });
      await copyFile(join(root, p), join(dir, p));
    }
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
    expect(existsSync(dir)).toBe(false);
    expect(state()).toEqual(before);
  }
}
describe("v64 post-merge reconciliation", () => {
  it("enforces the v65 one-child topology, not just a final matching tree", async () => {
    await fixture(async (dir) => {
      git(dir, "add", "--", ...V64_ALLOWED_PATHS);
      expect(inspectV65Repository(dir).sourceCommitCount).toBe(0);
      commitFixture(dir);
      expect(inspectV65Repository(dir).sourceCommitCount).toBe(1);
      const p = join(dir, "PROJECT_CONTROL.md");
      await writeFile(p, readFileSync(p, "utf8") + "\nfixture child two\n");
      git(dir, "add", "--", "PROJECT_CONTROL.md");
      commitFixture(dir);
      expect(() => inspectV65Repository(dir)).toThrow(
        "V65_SINGLE_CHILD_TOPOLOGY_REQUIRED",
      );
    });
  });
  it("seals every roadmap root/item and working-tree policy to the immutable merge baseline", () => {
    const immutable = <T = Record<string, unknown>>(p: string): T =>
      JSON.parse(git(root, "show", c.baseline + ":" + p)) as T;
    expect(baseline.roadmap).toEqual(immutable("config/project/roadmap.json"));
    expect(baseline.work.workingTreePolicy).toEqual(
      immutable("config/project/current-work.json").workingTreePolicy,
    );
    expect(baseline.schema.workingTreePolicy).toEqual(
      immutable<{ properties: Record<string, unknown> }>(
        "config/project/current-work.schema.json",
      ).properties.workingTreePolicy,
    );
    expect(
      createHash("sha256")
        .update(JSON.stringify(baseline, null, 2) + "\n")
        .digest("hex"),
    ).toBe(c.baselineFieldsSha256);
    const r = read<Roadmap>("config/project/roadmap.json"),
      w = read<Work>("config/project/current-work.json");
    expect(r.items).toEqual(
      baseline.roadmap.items.map((item) =>
        item.id === "MP-06" ? { ...item, state: "COMPLETED" } : item,
      ),
    );
    expect(overlay(r, w)).toEqual([]);
  });
  it("rejects every review-reported roadmap drift before historical projection", () => {
    const originalR = read<Roadmap>("config/project/roadmap.json"),
      originalW = read<Work>("config/project/current-work.json");
    const mutations: [string, (r: Roadmap) => void][] = [
      ...["MP-12", "MP-09", "MP-11"].map(
        (id) =>
          [
            id,
            (r: Roadmap) => {
              r.items.find((x) => x.id === id)!.state =
                id === "MP-11" ? "PLANNED" : "COMPLETED";
            },
          ] as [string, (r: Roadmap) => void],
      ),
      [
        "title",
        (r) => {
          r.items.find((x) => x.id === "MP-07")!.title = "UNAUTHORIZED";
        },
      ],
      [
        "precedence",
        (r) => {
          (r.sourceOfTruthPrecedence as string[]).reverse();
        },
      ],
      [
        "item order",
        (r) => {
          r.items.reverse();
        },
      ],
      [
        "schema reference",
        (r) => {
          r.$schema = "foreign.json";
        },
      ],
      [
        "schema version",
        (r) => {
          r.schemaVersion = 2;
        },
      ],
      [
        "repository",
        (r) => {
          r.repository = "foreign/repo";
        },
      ],
      [
        "roadmap id",
        (r) => {
          r.roadmapId = "FOREIGN";
        },
      ],
      [
        "issue",
        (r) => {
          r.githubIssue = 10;
        },
      ],
    ];
    for (const [name, mutate] of mutations) {
      const r = structuredClone(originalR);
      mutate(r);
      expect(r, name).not.toEqual(originalR);
      expect(overlay(r, originalW), name).toContain(
        "V64_CLOSED_RECONCILIATION_SCOPE_INVALID",
      );
      expect(
        validateProjectControl(r, originalW).errors.length,
        name,
      ).toBeGreaterThan(0);
    }
    const w = structuredClone(originalW);
    w.workingTreePolicy = "DISCARD_OWNER_CHANGES";
    expect(w).not.toEqual(originalW);
    expect(overlay(originalR, w)).toContain(
      "V64_CLOSED_RECONCILIATION_SCOPE_INVALID",
    );
    expect(validateProjectControl(originalR, w).errors.length).toBeGreaterThan(
      0,
    );
  });
  it("allows only the Owner-approved exact dependency patch and sealed lockfile", async () => {
    const pkg = git(root, "show", c.baseline + ":package.json") + "\n";
    const workspace =
      git(root, "show", c.baseline + ":pnpm-workspace.yaml") + "\n";
    const currentPkg = readFileSync(join(root, "package.json"), "utf8");
    const currentWorkspace = readFileSync(
      join(root, "pnpm-workspace.yaml"),
      "utf8",
    );
    const lock = readFileSync(join(root, "pnpm-lock.yaml"));
    const check = (p = currentPkg, w = currentWorkspace, l = lock) =>
      validateV64DependencyBytes(pkg, workspace, p, w, l);
    expect(check()).toBe(true);
    expect(check(pkg)).toBe(false);
    expect(
      check(currentPkg.replace('"vitest": "4.1.11"', '"vitest": "4.1.12"')),
    ).toBe(false);
    expect(check(undefined, workspace)).toBe(false);
    expect(
      check(undefined, currentWorkspace.replace('"1.2.2"', '"^1.2.2"')),
    ).toBe(false);
    expect(
      check(undefined, undefined, Buffer.concat([lock, Buffer.from("\n")])),
    ).toBe(false);
    await fixture(async (dir) => {
      git(dir, "add", ...V64_ALLOWED_PATHS);
      expect(inspectV64Repository(dir).remoteExecutionAuthorized).toBe(false);
      await writeFile(
        join(dir, "package.json"),
        currentPkg.replace('"sharp": "0.35.5"', '"sharp": "0.35.6"'),
      );
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_DEPENDENCY_SECURITY_SCOPE_DRIFT",
      );
    });
  });
  it("records closure without starting MP07 or granting a new deployment", () => {
    const r = read<Roadmap>("config/project/roadmap.json"),
      w = read<Work>("config/project/current-work.json");
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      r.items.filter((x: { state: string }) => x.state === "CURRENT"),
    ).toHaveLength(0);
    expect(r.items.find((x: { id: string }) => x.id === "MP-06")?.state).toBe(
      "COMPLETED",
    );
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      testAcceptance: "OWNER_ACCEPTED_TEST_CLOSED",
      remoteExecutionAuthorized: false,
      publicationAuthorized: false,
      nextWorkAuthorized: false,
    });
    for (const action of [
      "COMMIT",
      "PUSH_BRANCH",
      "MERGE",
      "CREATE_PULL_REQUEST",
      "GITHUB_ROADMAP_UPDATE",
      "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
      "PREFLIGHT_METADATA_READ",
      "ACTIVATE_PILOT",
      "CHANGE_SECRET",
      "START_MP07",
      "UNKNOWN",
    ]) {
      expect(evaluateProjectAction(r, w, action).allowed, action).toBe(false);
    }
    expect(evaluateProjectAction(r, w, "LOCAL_VALIDATION").allowed).toBe(true);
  });
  it("rejects manifest grants, unknown fields and false roadmap transitions", () => {
    const originalR = read<Roadmap>("config/project/roadmap.json"),
      originalW = read<Work>("config/project/current-work.json");
    for (const mutate of [
      (r: typeof originalR) => {
        r.items.find((x: { id: string }) => x.id === "MP-06")!.state =
          "CURRENT";
      },
      (r: typeof originalR) => {
        r.items.find((x: { id: string }) => x.id === "MP-07")!.state =
          "CURRENT";
      },
      (r: typeof originalR) => {
        r.extra = "invented";
      },
    ]) {
      const r = structuredClone(originalR);
      mutate(r);
      expect(
        validateProjectControl(r, originalW).errors.length,
      ).toBeGreaterThan(0);
    }
    for (const mutate of [
      (w: typeof originalW) => {
        w.authorization.production = true;
      },
      (w: typeof originalW) => {
        w.authorization.testDeploymentAuthorization = true;
      },
      (w: typeof originalW) => {
        w.authorization.pushBranch = !originalW.authorization.pushBranch;
      },
      (w: typeof originalW) => {
        w.postMergeV64.grants.remainingDeployments = 1;
      },
      (w: typeof originalW) => {
        w.postMergeV64.acceptedSource = "0".repeat(40);
      },
      (w: typeof originalW) => {
        w.extra = true;
      },
      (w: typeof originalW) => {
        w.testDeploymentV61.operatorRetry = true;
      },
    ]) {
      const w = structuredClone(originalW);
      mutate(w);
      expect(
        validateProjectControl(originalR, w).errors.length,
      ).toBeGreaterThan(0);
    }
  });
  it("requires closed schemas and appended Owner decision", () => {
    const r = read("config/project/roadmap.schema.json"),
      w = read("config/project/current-work.schema.json");
    expect(validateSchemaDocuments(r, w, PUBLICATION_V65.version)).toEqual([]);
    w.additionalProperties = true;
    expect(
      validateSchemaDocuments(r, w, PUBLICATION_V65.version).length,
    ).toBeGreaterThan(0);
    const log = readFileSync(
      join(root, "docs/project/OWNER_DECISION_LOG.md"),
      "utf8",
    );
    expect(validateWp8fOwnerDecisionRecord(log, c.version)).toBe(true);
    expect(
      validateWp8fOwnerDecisionRecord(
        log.replace(c.ownerDecision, "MISSING"),
        c.version,
      ),
    ).toBe(false);
  });
  it("inspects the accepted merge on an isolated repair branch without changing operator state", async () => {
    await fixture((dir) => {
      expect(inspectV64Repository(dir)).toMatchObject({
        baseline: c.baseline,
        publicationAuthorized: false,
        remoteExecutionAuthorized: false,
      });
    });
  });
  it("rejects runtime byte drift, mode drift and hidden index flags", async () => {
    await fixture(async (dir) => {
      const p = join(dir, "worker/index.ts"),
        bytes = readFileSync(p);
      await writeFile(
        p,
        Buffer.concat([bytes, Buffer.from("\n// unauthorized\n")]),
      );
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_FROZEN_SOURCE_DRIFT",
      );
      await writeFile(p, bytes);
      git(dir, "update-index", "--chmod=+x", "worker/index.ts");
      expect(() => inspectV64Repository(dir)).toThrow("V64_FROZEN_INDEX_DRIFT");
    });
    await fixture((dir) => {
      git(dir, "update-index", "--assume-unchanged", "worker/index.ts");
      expect(() => inspectV64Repository(dir)).toThrow("V64_HIDDEN_INDEX_FLAGS");
    });
  });
  it("rejects a foreign remote, wrong branch and unapproved files", async () => {
    await fixture((dir) => {
      git(
        dir,
        "remote",
        "set-url",
        "origin",
        "https://example.invalid/foreign.git",
      );
      expect(() => inspectV64Repository(dir)).toThrow("V64_REMOTE_MISMATCH");
    });
    await fixture((dir) => {
      git(dir, "checkout", "--quiet", "-B", "wrong-branch");
      expect(() => inspectV64Repository(dir)).toThrow("V64_BRANCH_MISMATCH");
    });
    await fixture(async (dir) => {
      await writeFile(join(dir, "unapproved.txt"), "unexpected");
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_WORKTREE_SCOPE_DRIFT",
      );
    });
  });
  it("rejects substituted projection data and forged PR identity", async () => {
    await fixture(async (dir) => {
      await writeFile(
        join(dir, "src/project-control-v64-baseline.json"),
        "{}\n",
      );
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_PROJECTION_BASELINE_DRIFT",
      );
    });
    await fixture((dir) => {
      expect(() =>
        inspectV64Repository(dir, "git", {
          action: "synchronize",
          repository: { full_name: c.repository },
          pull_request: {
            head: { ref: c.implementationBranch, sha: c.acceptedSource },
            base: { ref: c.targetBranch, sha: c.baseline },
          },
        }),
      ).toThrow("V64_PR_IDENTITY_MISMATCH");
    });
  });
  it.each(["runtime", "dependency"])(
    "rejects reverted intermediate %s source drift",
    async (kind) => {
      await fixture(async (dir) => {
        git(dir, "add", "--", ...V64_ALLOWED_PATHS);
        commitFixture(dir);
        const p = kind === "runtime" ? "worker/index.ts" : "package.json",
          before = readFileSync(join(dir, p), "utf8");
        const changed =
          kind === "runtime"
            ? before + "\n// fixture drift\n"
            : before.replace('"sharp": "0.35.5"', '"sharp": "0.35.6"');
        expect(changed).not.toBe(before);
        await writeFile(join(dir, p), changed);
        git(dir, "add", "--", p);
        commitFixture(dir, "Intermediate drift fixture");
        await writeFile(join(dir, p), before);
        git(dir, "add", "--", p);
        commitFixture(dir, "Reverted bytes fixture");
        expect(readFileSync(join(dir, p), "utf8")).toBe(before);
        expect(() => inspectV64Repository(dir)).toThrow(
          kind === "runtime"
            ? "V64_SOURCE_SCOPE_DRIFT"
            : "V64_SOURCE_DEPENDENCY_SCOPE_DRIFT",
        );
      });
    },
  );
  it("rejects a source merge and replace refs", async () => {
    await fixture((dir) => {
      git(dir, "add", "--", ...V64_ALLOWED_PATHS);
      const source = commitFixture(dir),
        tree = git(dir, "rev-parse", "HEAD^{tree}");
      const merge = git(
        dir,
        "-c",
        "user.name=Codex Harness",
        "-c",
        "user.email=codex-harness@invalid.example",
        "commit-tree",
        tree,
        "-p",
        c.baseline,
        "-p",
        source,
        "-m",
        "Synthetic unreviewed merge",
      );
      git(dir, "checkout", "--quiet", "-B", c.implementationBranch, merge);
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_UNREVIEWED_SOURCE_MERGE",
      );
    });
    await fixture((dir) => {
      git(dir, "replace", c.acceptedSource, c.baseline);
      expect(
        git(dir, "for-each-ref", "--format=%(refname)", "refs/replace"),
      ).not.toBe("");
      expect(() => inspectV64Repository(dir)).toThrow(
        "V64_FULL_IDLE_UNREPLACED_HISTORY_REQUIRED",
      );
    });
  });
  it.each(["executable", "symlink"])(
    "rejects dependency %s substitution",
    async (kind) => {
      await fixture(async (dir) => {
        git(dir, "add", "--", ...V64_ALLOWED_PATHS);
        if (kind === "executable")
          await chmod(join(dir, "package.json"), 0o755);
        else {
          await unlink(join(dir, "pnpm-lock.yaml"));
          await symlink(
            join(root, "pnpm-lock.yaml"),
            join(dir, "pnpm-lock.yaml"),
          );
        }
        expect(() => inspectV64Repository(dir)).toThrow(
          "V64_DEPENDENCY_MODE_DRIFT",
        );
      });
    },
  );
  it.each(["pr-base", "pr-head", "pr-tree", "integration-parent", "pr-dirty"])(
    "rejects %s identity/stability drift",
    async (kind) => {
      await fixture(async (dir) => {
        git(dir, "add", "--", ...V64_ALLOWED_PATHS);
        const source = commitFixture(dir),
          tree = git(dir, "rev-parse", "HEAD^{tree}");
        const merge = git(
          dir,
          "-c",
          "user.name=Codex Harness",
          "-c",
          "user.email=codex-harness@invalid.example",
          "commit-tree",
          kind === "pr-tree" ? c.baselineTree : tree,
          "-p",
          kind === "integration-parent" ? c.acceptedSource : c.baseline,
          "-p",
          source,
          "-m",
          "Synthetic identity fixture",
        );
        git(dir, "checkout", "--quiet", "--detach", merge);
        const event = {
          action: "synchronize",
          number: 999,
          repository: { full_name: c.repository },
          pull_request: {
            number: 999,
            state: "open",
            merged: false,
            head: {
              ref:
                kind === "pr-head" ? "foreign-branch" : c.implementationBranch,
              sha: source,
              repo: { full_name: c.repository },
            },
            base: {
              ref: c.targetBranch,
              sha: kind === "pr-base" ? c.acceptedSource : c.baseline,
              repo: { full_name: c.repository },
            },
          },
        };
        const context = {
          eventName: "pull_request",
          repository: c.repository,
          sha: merge,
          ref: "refs/pull/999/merge",
        };
        if (kind === "integration-parent") {
          git(dir, "checkout", "--quiet", "-B", c.targetBranch, merge);
          expect(() =>
            inspectV64Repository(dir, "git", undefined, {
              ...context,
              eventName: "push",
              ref: "refs/heads/" + c.targetBranch,
            }),
          ).toThrow("V64_INTEGRATION_MERGE_IDENTITY_MISMATCH");
        } else {
          if (kind === "pr-dirty")
            await writeFile(
              join(dir, "PROJECT_CONTROL.md"),
              readFileSync(join(dir, "PROJECT_CONTROL.md"), "utf8") +
                "\nfixture drift\n",
            );
          expect(() =>
            inspectV64Repository(dir, "git", event, context),
          ).toThrow(
            kind === "pr-tree"
              ? "V64_PR_MERGE_IDENTITY_MISMATCH"
              : kind === "pr-dirty"
                ? "V64_CI_DIRTY"
                : "V64_PR_IDENTITY_MISMATCH",
          );
        }
      });
    },
  );
  it("validates a scoped synthetic PR and target push without granting publication", async () => {
    await fixture((dir) => {
      git(dir, "add", "--", ...V64_ALLOWED_PATHS);
      git(
        dir,
        "-c",
        "user.name=Codex Harness",
        "-c",
        "user.email=codex-harness@invalid.example",
        "commit",
        "--quiet",
        "-m",
        "Synthetic control repair fixture",
      );
      const source = git(dir, "rev-parse", "HEAD"),
        sourceTree = git(dir, "rev-parse", "HEAD^{tree}");
      const merge = git(
        dir,
        "-c",
        "user.name=Codex Harness",
        "-c",
        "user.email=codex-harness@invalid.example",
        "commit-tree",
        sourceTree,
        "-p",
        c.baseline,
        "-p",
        source,
        "-m",
        "Synthetic PR merge fixture",
      );
      git(dir, "checkout", "--quiet", "--detach", merge);
      const event = {
        action: "synchronize",
        number: 999,
        repository: { full_name: c.repository },
        pull_request: {
          number: 999,
          state: "open",
          merged: false,
          head: {
            ref: c.implementationBranch,
            sha: source,
            repo: { full_name: c.repository },
          },
          base: {
            ref: c.targetBranch,
            sha: c.baseline,
            repo: { full_name: c.repository },
          },
        },
      };
      const context = {
        eventName: "pull_request",
        repository: c.repository,
        sha: merge,
        ref: "refs/pull/999/merge",
      };
      expect(inspectV64Repository(dir, "git", event, context)).toMatchObject({
        source,
        clean: true,
        publicationAuthorized: false,
      });
      for (const changed of [
        { sha: source },
        { ref: "refs/pull/999/head" },
        { repository: "foreign/repo" },
      ])
        expect(() =>
          inspectV64Repository(dir, "git", event, { ...context, ...changed }),
        ).toThrow("V64_PR_IDENTITY_MISMATCH");
      expect(() =>
        inspectV64Repository(
          dir,
          "git",
          {
            ...event,
            pull_request: {
              ...event.pull_request,
              head: {
                ...event.pull_request.head,
                repo: { full_name: "foreign/repo" },
              },
            },
          },
          context,
        ),
      ).toThrow("V64_PR_IDENTITY_MISMATCH");
      git(dir, "checkout", "--quiet", "-B", c.targetBranch, merge);
      const push = {
        eventName: "push",
        repository: c.repository,
        sha: merge,
        ref: "refs/heads/" + c.targetBranch,
      };
      expect(inspectV64Repository(dir, "git", undefined, push)).toMatchObject({
        source,
        clean: true,
        publicationAuthorized: false,
      });
      expect(() =>
        inspectV64Repository(dir, "git", undefined, { ...push, sha: source }),
      ).toThrow("V64_PUSH_IDENTITY_MISMATCH");
      git(dir, "checkout", "--quiet", "-B", c.targetBranch, source);
      expect(
        inspectV64Repository(dir, "git", undefined, { ...push, sha: source }),
      ).toMatchObject({ source, clean: true });
      git(dir, "checkout", "--quiet", "-B", c.implementationBranch, source);
      expect(() =>
        inspectV64Repository(dir, "git", undefined, {
          ...push,
          sha: source,
          ref: "refs/heads/" + c.implementationBranch,
        }),
      ).toThrow("V64_PUSH_IDENTITY_MISMATCH");
    });
  });
});
