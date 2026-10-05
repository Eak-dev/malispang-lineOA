import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  TEST_DEPLOYMENT_V59 as c,
  V59_ALLOWED_PATHS,
  evaluateV59Action,
  inspectV59Repository,
  readV59GitBlobs,
  projectV59ToV58,
  validateV59PullRequestReceipt,
} from "../src/project-control-v59.js";
import {
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
  summarizeProjectAuthority,
} from "../src/project-control.js";

const operatorRoot = fileURLToPath(new URL("../", import.meta.url));
const git = (cwd: string, ...args: string[]) =>
  execFileSync(
    "git",
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "protocol.allow=never",
      "-c",
      "protocol.file.allow=always",
      "-c",
      "user.name=Synthetic",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
// Preserve every v59 assertion using its real immutable published checkout.
const operatorBefore = {
  head: git(operatorRoot, "rev-parse", "HEAD"),
  index: readFileSync(
    join(git(operatorRoot, "rev-parse", "--absolute-git-dir"), "index"),
  ),
  status: git(
    operatorRoot,
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ),
};
const root = await mkdtemp(join(tmpdir(), "mp06-v59-published-"));
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  expect(existsSync(root)).toBe(false);
  expect(git(operatorRoot, "rev-parse", "HEAD")).toBe(operatorBefore.head);
  expect(
    readFileSync(
      join(git(operatorRoot, "rev-parse", "--absolute-git-dir"), "index"),
    ),
  ).toEqual(operatorBefore.index);
  expect(
    git(operatorRoot, "status", "--porcelain=v1", "--untracked-files=all"),
  ).toBe(operatorBefore.status);
});
try {
  git(
    operatorRoot,
    "clone",
    "--quiet",
    "--shared",
    "--no-hardlinks",
    "--no-checkout",
    operatorRoot,
    root,
  );
  git(
    root,
    "checkout",
    "--quiet",
    "-B",
    c.headBranch,
    "6973a12f0c54d51945830b4ad635250e7612fdba",
  );
  git(
    root,
    "remote",
    "set-url",
    "origin",
    "https://github.com/" + c.repository + ".git",
  );
} catch (error) {
  await rm(root, { recursive: true, force: true });
  throw error;
}
const state = () => ({
  head: git(root, "rev-parse", "HEAD"),
  index: readFileSync(
    join(git(root, "rev-parse", "--absolute-git-dir"), "index"),
  ),
  status: git(root, "status", "--porcelain=v1", "--untracked-files=all"),
});
const read = (p: string) =>
  JSON.parse(readFileSync(join(root, p), "utf8")) as Record<string, unknown>;
async function fixture(run: (dir: string) => void | Promise<void>) {
  const before = state(),
    dir = await mkdtemp(join(tmpdir(), "mp06-v59-"));
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
    git(dir, "checkout", "--quiet", "-B", c.headBranch, c.baseline);
    git(
      dir,
      "remote",
      "set-url",
      "origin",
      "https://github.com/" + c.repository + ".git",
    );
    for (const p of V59_ALLOWED_PATHS) {
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
const now = () => new Date().toISOString();
const sha = "a".repeat(40),
  tree = "b".repeat(40),
  diff = "c".repeat(64);
const comment20 =
  "https://github.com/Eak-dev/malispang-lineOA/pull/20#issuecomment-123";
const comment12 =
  "https://github.com/Eak-dev/malispang-lineOA/issues/12#issuecomment-124";
// SYNTHETIC fixtures below never authorize a real operation.
function receipt() {
  return {
    controlVersion: c.version,
    kind: "V59_REMOTE_QUALIFICATION",
    repository: c.repository,
    branch: c.headBranch,
    source: sha,
    parent: c.baseline,
    tree,
    clean: true,
    sourceStable: true,
    artifactSha256: c.artifact.sha256,
    artifactBytes: c.artifact.bytes,
    runtimeMatchesBaseline: true,
    account: c.target.account,
    worker: c.target.worker,
    origin: c.target.origin,
    environment: "TEST",
    profile: "default",
    credentialMode: "EXISTING_NATIVE_NO_PLAINTEXT",
    noProductionAccess: true,
    noOldStorageAccess: true,
    holdPreserved: true,
    accountSelection: { ...c.accountSelection },
    nativeRefresh: { ...c.nativeRefresh },
    nativeContainmentVerified: true,
    qualification: {
      source: sha,
      tree,
      diffSha256: diff,
      fullGates: "PASS",
      audit: "ZERO_AT_EVERY_SEVERITY",
      precommitReview: "PASS",
      precommitResponse: comment20,
      exactPrepushReview: "PASS",
      prepushResponse: comment20,
      postpushReview: "PASS",
      postpushResponse: comment20,
      hostedCi: "SUCCESS",
      ciUrl: "https://github.com/Eak-dev/malispang-lineOA/actions/runs/123",
      remoteHead: sha,
      prBase: c.baseHead,
      prState: "open",
      prDraft: true,
      prMerged: false,
      observedAt: now(),
    },
    operation: "VERSION_BINDINGS_EXPORTS",
    targetScriptOnly: true,
    rawOutputSuppressed: true,
    noOtherWorkerScan: true,
    noObjectLookup: true,
    newLoginAllowed: false,
    secretMutationAllowed: false,
    preflight: {
      account: c.target.account,
      worker: c.target.worker,
      observedAt: now(),
      version: "old-version",
      targetAccountAccessProven: true,
      deploymentTrafficVerified: true,
      bindingsMatched: true,
      oldClassesVerified: true,
      newClassesAbsent: true,
      requiredSecretsPresent: [...c.requiredSecrets],
      providerSecretRequired: false,
      currentQuietWindowConfirmed: true,
      ownerLastMessageDate: c.ownerFacts.lastTestMessageDate,
      redelivery: "UNKNOWN_NOT_WAIVED_AS_ABSENT",
      externalBindings: "RELY_ON_PLATFORM_REJECTION_NO_SCAN",
      atomicity: "UNPROVEN_OWNER_ACCEPTED_PARTIAL_UNKNOWN",
      oldStorageRead: false,
      alarmAssessment: "SOURCE_ONLY_NOT_LIVE_ABSENCE",
      nativeCredentialReady: true,
      postverifyCredentialReady: true,
    },
    journal: {
      controlVersion: c.version,
      source: sha,
      artifactSha256: c.artifact.sha256,
      worker: c.target.worker,
      receipt: comment12,
      maximumAttempts: 1,
      originControl: c.deploymentGrant.originControl,
      priorJournalChecked: true,
      priorStartedInvocations: 0,
      attempts: 0,
      outcome: "NOT_STARTED",
    },
    startJournalWillPrecedeInvocation: true,
    maximumDeployInvocations: 1,
    nativeRetry: { ...c.nativeRetry },
    operatorRetry: false,
    rollback: false,
    deployment: {
      source: sha,
      artifactSha256: c.artifact.sha256,
      account: c.target.account,
      worker: c.target.worker,
      version: "new-version",
      trafficPercent: 100,
      observedAt: now(),
      classes: [...c.newClasses],
      oldClassesDeleted: true,
      noPartialOutcome: true,
      messageSourceMatched: true,
      newNamespaceIdentityVerified: true,
    },
    probe: {
      method: "GET",
      origin: c.target.origin,
      path: "/admin/mp06/conversation-observation",
      previousInvocations: 0,
      maximumInvocations: 1,
      rawOutputSuppressed: true,
      onlyNewV2: true,
      existingAdminCredentialReady: true,
      synthetic: true,
      syntheticObjectCount: 1,
      noEventRef: true,
      noOwnerIdentity: true,
      noStateSeeding: true,
      expect: "EMPTY_DEFAULT",
    },
  };
}
const target = {
  worker: c.target.worker,
  sourceCommit: sha,
  artifactSha256: c.artifact.sha256,
};
describe("v59 conditional TEST-only reset", () => {
  it("projects precisely to the real published v58 without modifying historical authority", () => {
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
        readFileSync(join(root, "docs/project/OWNER_DECISION_LOG.md"), "utf8"),
        c.version,
      ),
    ).toBe(true);
    expect(summarizeProjectAuthority(r, w)?.remoteExecutionAuthorized).toBe(
      false,
    );
    projectV59ToV58(r, w, s);
    for (const [p, v] of [
      ["config/project/roadmap.json", r],
      ["config/project/current-work.json", w],
      ["config/project/current-work.schema.json", s],
    ] as const)
      expect(v).toEqual(JSON.parse(git(root, "show", c.baseline + ":" + p)));
    expect(V59_ALLOWED_PATHS).toHaveLength(14);
  });
  it("reads allowlisted baseline, index and revision blobs byte-identically to git show", async () =>
    fixture(async (dir) => {
      const empty = "PROJECT_CONTROL.md";
      const binary = "docs/project/HANDOFF_MP06_CLAUDE_TO_CODEX_TH.md";
      await writeFile(join(dir, empty), Buffer.alloc(0));
      await writeFile(
        join(dir, binary),
        Buffer.from([0, 255, 128, 10, 13, 0, 254]),
      );
      git(dir, "add", "--", ...V59_ALLOWED_PATHS);
      git(dir, "commit", "--quiet", "-m", "Synthetic binary framing");
      for (const revision of [c.baseline, "", git(dir, "rev-parse", "HEAD")]) {
        const blobs = readV59GitBlobs(dir, "git", revision);
        for (const [p, bytes] of blobs) {
          expect(
            bytes.equals(
              execFileSync(
                "git",
                [
                  "--no-replace-objects",
                  "--no-optional-locks",
                  "-c",
                  "diff.autoRefreshIndex=false",
                  "show",
                  revision + ":" + p,
                ],
                { cwd: dir },
              ),
            ),
            p,
          ).toBe(true);
        }
        if (revision !== c.baseline) {
          expect(blobs.get(empty)).toEqual(Buffer.alloc(0));
          expect(blobs.get(binary)).toEqual(
            Buffer.from([0, 255, 128, 10, 13, 0, 254]),
          );
        }
      }
      expect(() => readV59GitBlobs(dir, "git", "HEAD")).toThrow(
        /REVISION_INVALID/,
      );
    }));
  for (const malformed of [
    "missing",
    "ambiguous",
    "non-blob",
    "truncated",
    "wrong-oid",
    "bad-delimiter",
    "unsafe-size",
    "high-bit-header",
    "trailing",
    "child-error",
  ])
    it("fails closed on blob batch " + malformed, async () =>
      fixture(async (dir) => {
        const stub = join(dir, ".git", "synthetic-batch-git.cjs");
        await writeFile(
          stub,
          `#!/usr/bin/env node
const cp = require("node:child_process");
const mode = ${JSON.stringify(malformed)};
if (mode === "child-error") process.exit(73);
let b = cp.execFileSync("git", process.argv.slice(2), { input: require("node:fs").readFileSync(0), maxBuffer: 64 * 1024 * 1024 });
const n = b.indexOf(10);
if (mode === "missing" || mode === "ambiguous") b = Buffer.from("spec " + mode + "\\n");
if (mode === "non-blob") b = Buffer.from(b.toString("utf8").replace(" blob ", " tree "));
if (mode === "truncated") b = b.subarray(0, n + 2);
if (mode === "wrong-oid") b[0] = b[0] === 97 ? 98 : 97;
if (mode === "bad-delimiter") b[n + 1 + Number(b.subarray(0, n).toString().split(" ")[2])] = 0;
if (mode === "unsafe-size") b = Buffer.from("a".repeat(40) + " blob 9007199254740992\\n");
if (mode === "high-bit-header") b[0] |= 128;
if (mode === "trailing") b = Buffer.concat([b, Buffer.from("unexpected")]);
process.stdout.write(b);
`,
          { mode: 0o700 },
        );
        expect(() => readV59GitBlobs(dir, stub, c.baseline)).toThrow(
          malformed === "child-error" ? /Command failed/ : /BLOB_BATCH_INVALID/,
        );
      }),
    );
  it("requires exact manifest, schema and Owner record", () => {
    const r = read("config/project/roadmap.json"),
      w = read("config/project/current-work.json");
    (w.testDeploymentV59 as Record<string, unknown>).production = true;
    expect(validateProjectControl(r, w).errors.length).toBeGreaterThan(0);
    const s = read("config/project/current-work.schema.json");
    (s.required as string[]).push("testDeploymentV59");
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        s,
        c.version,
      ),
    ).toContain("V59_SCHEMA_NOT_CLOSED");
    expect(validateWp8fOwnerDecisionRecord("", c.version)).toBe(false);
  });
  it("structurally validates worktree/stage and preserves operator", async () =>
    fixture((dir) => {
      expect(inspectV59Repository(dir, "git").mode).toBe("LOCAL_PREPARATION");
      git(dir, "add", "--", ...V59_ALLOWED_PATHS);
      expect(inspectV59Repository(dir, "git").clean).toBe(false);
    }));
  it("accepts exact sole child and PR merge mapping, rejects reversed parents and a second child", async () =>
    fixture((dir) => {
      git(dir, "add", "--", ...V59_ALLOWED_PATHS);
      git(dir, "commit", "--quiet", "-m", "Synthetic v59 source");
      const source = git(dir, "rev-parse", "HEAD"),
        tree = git(dir, "rev-parse", "HEAD^{tree}");
      expect(inspectV59Repository(dir, "git").mode).toBe("SOURCE_COMMIT");
      const merge = git(
        dir,
        "commit-tree",
        tree,
        "-p",
        c.baseHead,
        "-p",
        source,
        "-m",
        "Synthetic merge",
      );
      const event = {
        number: 20,
        repository: { full_name: c.repository },
        pull_request: {
          number: 20,
          state: "open",
          draft: true,
          merged: false,
          head: {
            ref: c.headBranch,
            sha: source,
            repo: { full_name: c.repository },
          },
          base: {
            ref: c.baseBranch,
            sha: c.baseHead,
            repo: { full_name: c.repository },
          },
        },
      };
      const observed = {
        sha: merge,
        ref: "refs/pull/20/merge",
        merge,
        parents: [c.baseHead, source],
        tree,
        sourceTree: tree,
      };
      const receipt = validateV59PullRequestReceipt(event, observed);
      expect(receipt).not.toBeNull();
      expect(
        validateV59PullRequestReceipt(event, {
          ...observed,
          parents: [source, c.baseHead],
        }),
      ).toBeNull();
      git(dir, "checkout", "--quiet", "--detach", merge);
      expect(inspectV59Repository(dir, "git", receipt!).mode).toBe(
        "DRAFT_PR20_SYNTHETIC_MERGE",
      );
      git(dir, "checkout", "--quiet", c.headBranch);
      git(
        dir,
        "commit",
        "--quiet",
        "--allow-empty",
        "-m",
        "Forbidden second child",
      );
      expect(() => inspectV59Repository(dir, "git")).toThrow(
        /SUCCESSOR_CONTROL/,
      );
    }));
  it("rejects any edit to the reviewed historical-test adapter", async () =>
    fixture(async (dir) => {
      const p = join(dir, "tests/project-control-v58.test.ts");
      await writeFile(p, readFileSync(p, "utf8") + "\n// changed\n");
      expect(() => inspectV59Repository(dir, "git")).toThrow(/ADAPTER_DRIFT/);
    }));
  for (const p of [
    "worker/index.ts",
    "wrangler.jsonc",
    "src/project-control-v56.ts",
    "worker-configuration.d.ts",
  ])
    it("rejects frozen source edit " + p, async () =>
      fixture(async (dir) => {
        await writeFile(
          join(dir, p),
          readFileSync(join(dir, p), "utf8") + "\n// drift\n",
        );
        expect(() => inspectV59Repository(dir, "git")).toThrow(/OUTSIDE_SCOPE/);
      }),
    );
  it("rejects historical rewrite and inherited authority drift", async () =>
    fixture(async (dir) => {
      const p = join(dir, "docs/project/OWNER_DECISION_LOG.md");
      await writeFile(p, "changed\n" + readFileSync(p, "utf8"));
      expect(() => inspectV59Repository(dir, "git")).toThrow(
        /HISTORY_REWRITTEN/,
      );
    }));
  it("denies every remote operation without an authenticated receipt", () => {
    for (const a of [
      "PREFLIGHT_METADATA_READ",
      "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
      "POSTVERIFY_NEW_V2",
      "READBACK_UNKNOWN_DEPLOYMENT",
      "COMMIT",
      "PUSH_BRANCH",
      "DEPLOY",
      "ACTIVATE",
      "STOP",
      "OLD_STORAGE",
      "PRODUCTION",
      "MERGE",
      "ROLLBACK",
    ])
      expect(evaluateV59Action(a).allowed, a).toBe(false);
    for (const a of [
      "LOCAL_IMPLEMENTATION",
      "LOCAL_ANALYSIS",
      "LOCAL_VALIDATION",
    ])
      expect(evaluateV59Action(a).allowed).toBe(true);
  });
  it("accepts only complete synthetic receipt shapes; not operational authority", () => {
    const e = receipt();
    expect(evaluateV59Action("PREFLIGHT_METADATA_READ", e).allowed).toBe(true);
    expect(
      evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
        .allowed,
    ).toBe(true);
    e.journal.attempts = 1;
    e.journal.outcome = "SUCCEEDED";
    expect(evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed).toBe(true);
    e.journal.outcome = "UNKNOWN";
    expect(evaluateV59Action("READBACK_UNKNOWN_DEPLOYMENT", e).allowed).toBe(
      true,
    );
    expect(evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed).toBe(false);
    expect(
      evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
        .allowed,
    ).toBe(false);
  });
  it("fails closed on each missing deploy field and nested evidence field", () => {
    for (const section of [
      "qualification",
      "preflight",
      "journal",
      "nativeRetry",
    ] as const)
      for (const k of Object.keys(receipt()[section])) {
        const e = receipt();
        delete (e[section] as Record<string, unknown>)[k];
        expect(
          evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
            .allowed,
          section + "." + k,
        ).toBe(false);
      }
    for (const k of [
      "source",
      "parent",
      "tree",
      "clean",
      "sourceStable",
      "artifactSha256",
      "artifactBytes",
      "runtimeMatchesBaseline",
      "account",
      "worker",
      "origin",
      "environment",
      "profile",
      "credentialMode",
      "noProductionAccess",
      "noOldStorageAccess",
      "holdPreserved",
      "startJournalWillPrecedeInvocation",
      "maximumDeployInvocations",
      "nativeRetry",
      "operatorRetry",
      "rollback",
    ]) {
      const e = receipt();
      delete (e as Record<string, unknown>)[k];
      expect(
        evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
          .allowed,
        k,
      ).toBe(false);
    }
  });
  it("rejects operator retries and any altered or unbounded native upload retry contract", () => {
    for (const changes of [
      { operatorRetry: true },
      { nativeRetry: undefined, automaticRetry: false },
      { nativeRetry: { ...c.nativeRetry, maximumAttemptsPerUploadCall: 4 } },
      { nativeRetry: { ...c.nativeRetry, maximumAttemptsPerUploadCall: 1 } },
      { nativeRetry: { ...c.nativeRetry, wrangler: "4.123.0" } },
      { nativeRetry: { ...c.nativeRetry, exactBundleConfigAndTarget: false } },
      { nativeRetry: { ...c.nativeRetry, scope: "ALL_NETWORK_REQUESTS" } },
      {
        nativeRetry: { ...c.nativeRetry, ambiguousOutcomeRetryAccepted: false },
      },
      { nativeRetry: { ...c.nativeRetry, operatorMayRetry: true } },
      { maximumDeployInvocations: 2 },
    ]) {
      expect(
        evaluateV59Action(
          "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
          { ...receipt(), ...changes },
          target,
        ).allowed,
      ).toBe(false);
    }
  });
  it("requires scoped target-account access and rejects unscoped identity lookup", () => {
    const e = receipt();
    const preflight: Record<string, unknown> = { ...e.preflight };
    delete preflight.targetAccountAccessProven;
    expect(
      evaluateV59Action(
        "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
        { ...e, preflight: { ...preflight, identityMatched: true } },
        target,
      ).allowed,
    ).toBe(false);
    expect(
      evaluateV59Action("PREFLIGHT_METADATA_READ", {
        ...e,
        operation: "IDENTITY",
      }).allowed,
    ).toBe(false);
  });
  it("denies stale/future, wrong target, substituted artifacts and inherited receipts", () => {
    for (const time of [
      "invalid",
      new Date(Date.now() - 121000).toISOString(),
      new Date(Date.now() + 60000).toISOString(),
    ]) {
      const e = receipt();
      e.preflight.observedAt = time;
      expect(
        evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
          .allowed,
      ).toBe(false);
    }
    for (const bad of [
      { ...target, worker: "malispang-lineoa" },
      { ...target, sourceCommit: c.baseline },
      { ...target, artifactSha256: diff },
      undefined,
    ])
      expect(
        evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", receipt(), bad)
          .allowed,
      ).toBe(false);
    const e = receipt();
    e.controlVersion = "2026.10.04-v56" as typeof e.controlVersion;
    expect(evaluateV59Action("PREFLIGHT_METADATA_READ", e).allowed).toBe(false);
  });
  it("never interprets rejection/unknown/partial as unused or permits old endpoints", () => {
    for (const outcome of [
      "STARTED",
      "UNKNOWN",
      "PARTIAL",
      "REJECTED",
      "SUCCEEDED",
    ]) {
      const e = receipt();
      e.journal.attempts = 1;
      e.journal.outcome = outcome;
      expect(
        evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
          .allowed,
      ).toBe(false);
    }
    for (const path of [
      "/admin/mp06-pilot/owner-uat-readiness",
      "/admin/mp06-pilot/activate",
      "/admin/mp06-pilot/stop",
      "/admin/mp06-pilot/resume",
      "/webhook",
    ]) {
      const e = receipt();
      e.journal.attempts = 1;
      e.journal.outcome = "SUCCEEDED";
      e.probe.path = path;
      expect(evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed, path).toBe(
        false,
      );
    }
  });
  it("requires proven new namespaces and bounded synthetic invocation", () => {
    for (const k of Object.keys(receipt().deployment)) {
      const e = receipt();
      e.journal.attempts = 1;
      e.journal.outcome = "SUCCEEDED";
      delete (e.deployment as Record<string, unknown>)[k];
      expect(
        evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed,
        "deployment." + k,
      ).toBe(false);
    }
    for (const k of Object.keys(receipt().probe)) {
      const e = receipt();
      e.journal.attempts = 1;
      e.journal.outcome = "SUCCEEDED";
      delete (e.probe as Record<string, unknown>)[k];
      expect(
        evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed,
        "probe." + k,
      ).toBe(false);
    }
    const e = receipt();
    e.journal.attempts = 1;
    e.journal.outcome = "SUCCEEDED";
    e.probe.previousInvocations = 1;
    expect(evaluateV59Action("POSTVERIFY_NEW_V2", e).allowed).toBe(false);
  });
  it("rejects nested getters without invoking them", () => {
    const e = receipt();
    Object.defineProperty(e.qualification, "source", {
      get() {
        throw Error("must not execute");
      },
    });
    expect(evaluateV59Action("PREFLIGHT_METADATA_READ", e).allowed).toBe(false);
  });
});

// Pure synthetic receipts only; never executable remote evidence.
describe("v59 exact native exception and inherited single grant", () => {
  it("rejects every account/refresh exception drift", () => {
    for (const section of ["accountSelection", "nativeRefresh"] as const) {
      for (const key of Object.keys(receipt()[section])) {
        const e = receipt();
        (e[section] as Record<string, unknown>)[key] = "UNAPPROVED";
        expect(
          evaluateV59Action("PREFLIGHT_METADATA_READ", e).allowed,
          section + "." + key,
        ).toBe(false);
      }
    }
    const e = receipt();
    e.nativeContainmentVerified = false;
    expect(evaluateV59Action("PREFLIGHT_METADATA_READ", e).allowed).toBe(false);
  });
  it("does not mint a replacement for any prior started invocation", () => {
    for (const [key, value] of [
      ["originControl", c.version],
      ["priorJournalChecked", false],
      ["priorStartedInvocations", 1],
      ["priorStartedInvocations", "UNKNOWN"],
    ] as const) {
      const e = receipt();
      (e.journal as Record<string, unknown>)[key] = value;
      expect(
        evaluateV59Action("DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET", e, target)
          .allowed,
      ).toBe(false);
    }
  });
});

describe("v59 exact Owner timeout amendment", () => {
  it("changes only the Node timeout literal without rewriting history or test policy", () => {
    const old = git(root, "show", c.baseline + ":vitest.config.ts") + "\n";
    expect(readFileSync(join(root, "vitest.config.ts"), "utf8")).toBe(
      old.replace("testTimeout: 7000", "testTimeout: 10000"),
    );
    expect(c.nodeTestTimeout).toMatchObject({
      from: 7000,
      to: 10000,
      maxWorkers: 2,
      retries: 0,
      assertions: "UNCHANGED",
    });
    expect(c.deploymentGrant.originControl).toBe("2026.10.04-v57");
    expect(c.uatPreparation.ownerPreauthorized).toBe(true);
    expect(evaluateV59Action("ACTIVATE_PILOT", receipt()).allowed).toBe(false);
    expect(evaluateV59Action("CHANGE_WEBHOOK", receipt()).allowed).toBe(false);
  });
  it("rejects any extra Vitest delta and preserves the operator checkout", async () => {
    await fixture(async (dir) => {
      const p = join(dir, "vitest.config.ts"),
        before = readFileSync(p, "utf8");
      for (const replacement of [
        before.replace("testTimeout: 10000", "testTimeout: 11000"),
        before.replace("maxWorkers: 2", "maxWorkers: 3"),
        before.replace("maxWorkers: 2,", "maxWorkers: 2,\n    retry: 1,"),
      ]) {
        expect(replacement).not.toBe(before);
        await writeFile(p, replacement);
        expect(() => inspectV59Repository(dir, "git")).toThrow(
          "V59_EXACT_NODE_TIMEOUT_DELTA_REQUIRED",
        );
      }
    });
  });
});
