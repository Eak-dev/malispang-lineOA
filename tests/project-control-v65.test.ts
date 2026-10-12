import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICATION_V65 as c,
  V65_GATE_NAMES,
  evaluateV65Action,
} from "../src/project-control-v65.js";
import {
  evaluateProjectAction,
  summarizeProjectAuthority,
  validateProjectControl,
  validateSchemaDocuments,
  validateWp8fOwnerDecisionRecord,
} from "../src/project-control.js";
const read = <T = Record<string, unknown>>(p: string): T =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL("../" + p, import.meta.url)), "utf8"),
  ) as T;
const now = Date.parse("2026-10-12T08:00:00Z"),
  at = new Date(now).toISOString();
// Synthetic unit fixtures exercise the pure prerequisite logic only. NEVER operator receipts.
function fixture(action = "COMMIT") {
  const committed = action !== "COMMIT",
    head = committed ? "1".repeat(40) : c.baseline,
    tree = "2".repeat(40),
    diff = "3".repeat(64);
  return {
    kind: "V65_ACTUAL_EXACT_SOURCE_QUALIFICATION",
    controlVersion: String(c.version),
    baseline: String(c.baseline),
    branch: String(c.headBranch),
    parent: String(c.baseline),
    head,
    sourceCommitCount: committed ? 1 : 0,
    tree,
    qualifiedTree: tree,
    diffSha256: diff,
    qualifiedHead: head,
    qualificationStage: committed ? "POST_COMMIT" : "PRE_COMMIT",
    gitGraphVerified: true,
    sourceSeal: "4".repeat(64),
    entriesSeal: "5".repeat(64),
    logsVerified: true,
    validation: "FULL_PASS",
    platform: "darwin",
    stage: committed ? "POST_COMMIT" : "PRE_COMMIT",
    clean: committed,
    sourceStable: true,
    indexStable: true,
    workingTreeMatchesIndex: true,
    gates: V65_GATE_NAMES.map((name) => ({
      name,
      state: "PASS",
      code: 0,
      signal: null,
      sourceStable: true,
      logSha256: "6".repeat(64),
    })),
    audit: {
      tree,
      observedAt: at,
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
    },
    review: {
      channel: "PR20_COMMENTS",
      verdict: "PASS",
      parent: c.baseline,
      tree,
      diffSha256: diff,
      completePatch: true,
      executedOrExplicitlyReusedEvidence: true,
      responseComment:
        "https://github.com/Eak-dev/malispang-lineOA/pull/20#issuecomment-999999",
      stage: committed ? "PRE_PUSH" : "PRE_COMMIT",
      commit: head,
      exactCommitReconstructed: committed,
    },
    remote: {
      repository: String(c.repository),
      targetBranch: c.baseBranch,
      target: String(c.baseline),
      coordinationPr20Merged: true,
      ownerDecisionRelayReadbackVerified: true,
      ownerDecisionsUncontradicted: true,
      observedAt: at,
      headBranch: c.headBranch,
      repairBranchAbsent: action !== "CREATE_PULL_REQUEST",
      normalPush: true,
      existingRepairPullRequests: 0,
      repairHead: head,
    },
    journal: {
      kind: "AUTHENTICATED_FULL_PUBLICATION_JOURNAL",
      observedAt: at,
      unknownOutcome: false,
      commits: committed ? 1 : 0,
      pushes: action === "CREATE_PULL_REQUEST" ? 1 : 0,
      pullRequests: 0,
      productionActions: 0,
      deployments: 0,
    },
    requestedDraft: true,
    requestedHeadBranch: c.headBranch,
    requestedBaseBranch: c.baseBranch,
  };
}
describe("v65 evidence-bound publication only", () => {
  it("binds the exact Owner relay, closes manifests/schemas and denies missing evidence", () => {
    const r = read("config/project/roadmap.json"),
      w = read<{
        publicationV65: { maximumPushes: number };
        [key: string]: unknown;
      }>("config/project/current-work.json");
    expect(validateProjectControl(r, w).errors).toEqual([]);
    expect(
      validateSchemaDocuments(
        read("config/project/roadmap.schema.json"),
        read("config/project/current-work.schema.json"),
        c.version,
      ),
    ).toEqual([]);
    const log = readFileSync(
      fileURLToPath(
        new URL("../docs/project/OWNER_DECISION_LOG.md", import.meta.url),
      ),
      "utf8",
    );
    expect(validateWp8fOwnerDecisionRecord(log, c.version)).toBe(true);
    expect(
      validateWp8fOwnerDecisionRecord(
        log.replace(c.ownerDecision, "MISSING"),
        c.version,
      ),
    ).toBe(false);
    expect(summarizeProjectAuthority(r, w)).toMatchObject({
      ownerPublicationApproved: true,
      publicationAuthorized: false,
      conditionalActions: ["COMMIT", "PUSH_BRANCH", "CREATE_PULL_REQUEST"],
      mergeAuthorized: false,
      remoteExecutionAuthorized: false,
    });
    for (const a of [
      "COMMIT",
      "PUSH_BRANCH",
      "CREATE_PULL_REQUEST",
      "MERGE",
      "MARK_READY",
      "DEPLOY_TEST",
      "CHANGE_SECRET",
      "START_MP07",
    ])
      expect(evaluateProjectAction(r, w, a).allowed, a).toBe(false);
    const changed = structuredClone(w);
    changed.publicationV65.maximumPushes = 2;
    expect(validateProjectControl(r, changed).errors.length).toBeGreaterThan(0);
    expect(
      evaluateProjectAction(r, changed, "LOCAL_IMPLEMENTATION").allowed,
    ).toBe(false);
  });
  it.each(["COMMIT", "PUSH_BRANCH", "CREATE_PULL_REQUEST"])(
    "requires all exact-source %s facts and never grants merge/deploy",
    (action) => {
      const e = fixture(action);
      expect(evaluateV65Action(action, e, now).allowed).toBe(true);
      expect(
        evaluateV65Action(action, { ...e, forcePush: true }, now).allowed,
      ).toBe(false);
      expect(
        evaluateV65Action(
          action,
          { ...e, remote: { ...e.remote, allowForeignTarget: true } },
          now,
        ).allowed,
      ).toBe(false);
      for (const mutate of [
        (v: typeof e) => {
          v.controlVersion = "historical";
        },
        (v: typeof e) => {
          v.parent = "0".repeat(40);
        },
        (v: typeof e) => {
          v.tree = "0".repeat(40);
        },
        (v: typeof e) => {
          v.qualifiedHead = "0".repeat(40);
        },
        (v: typeof e) => {
          v.qualificationStage = "PRE_COMMIT_FOR_POST_COMMIT";
        },
        (v: typeof e) => {
          v.gitGraphVerified = false;
        },
        (v: typeof e) => {
          v.diffSha256 = "0".repeat(64);
        },
        (v: typeof e) => {
          v.logsVerified = false;
        },
        (v: typeof e) => {
          v.platform = "linux";
        },
        (v: typeof e) => {
          v.indexStable = false;
        },
        (v: typeof e) => {
          v.sourceStable = false;
        },
        (v: typeof e) => {
          v.workingTreeMatchesIndex = false;
        },
        (v: typeof e) => {
          v.gates[1]!.state = "NOT_EXECUTED";
        },
        (v: typeof e) => {
          v.gates[2]!.logSha256 = "";
        },
        (v: typeof e) => {
          v.gates[3]!.sourceStable = false;
        },
        (v: typeof e) => {
          v.gates.pop();
        },
        (v: typeof e) => {
          v.gates.reverse();
        },
        (v: typeof e) => {
          v.audit.high = 1;
        },
        (v: typeof e) => {
          v.audit.tree = "0".repeat(40);
        },
        (v: typeof e) => {
          v.audit.observedAt = new Date(now - 120001).toISOString();
        },
        (v: typeof e) => {
          v.review.verdict = "CHANGES";
        },
        (v: typeof e) => {
          v.review.completePatch = false;
        },
        (v: typeof e) => {
          v.review.executedOrExplicitlyReusedEvidence = false;
        },
        (v: typeof e) => {
          v.review.responseComment = "https://example.invalid/";
        },
        (v: typeof e) => {
          v.remote.target = "0".repeat(40);
        },
        (v: typeof e) => {
          v.remote.repository = "foreign/repo";
        },
        (v: typeof e) => {
          v.remote.observedAt = new Date(now + 1).toISOString();
        },
        (v: typeof e) => {
          v.remote.coordinationPr20Merged = false;
        },
        (v: typeof e) => {
          v.remote.ownerDecisionRelayReadbackVerified = false;
        },
        (v: typeof e) => {
          v.remote.ownerDecisionsUncontradicted = false;
        },
        (v: typeof e) => {
          v.journal.unknownOutcome = true;
        },
        (v: typeof e) => {
          v.journal.pullRequests = 1;
        },
        (v: typeof e) => {
          v.journal.observedAt = new Date(now - 120001).toISOString();
        },
        (v: typeof e) => {
          v.journal.deployments = 1;
        },
        (v: typeof e) => {
          v.journal.productionActions = 1;
        },
      ]) {
        const v = structuredClone(e);
        mutate(v);
        expect(v).not.toEqual(e);
        expect(evaluateV65Action(action, v, now).allowed).toBe(false);
      }
      for (const denied of [
        "MERGE",
        "MARK_READY",
        "DEPLOY_TEST",
        "DEPLOY_EXACT_ONCE_DESTRUCTIVE_RESET",
        "PREFLIGHT_METADATA_READ",
        "START_MP07",
        "UNKNOWN",
      ])
        expect(evaluateV65Action(denied, e, now).allowed, denied).toBe(false);
    },
  );
  it("denies replay, wrong publication branches, dirty/unreconstructed source and non-Draft PRs", () => {
    const commit = fixture();
    commit.journal.commits = 1;
    expect(evaluateV65Action("COMMIT", commit, now).allowed).toBe(false);
    for (const branch of [
      c.baseBranch,
      "codex/phase-1a-foundation",
      "codex/mp06-harness-v43",
      "claude/mp06-v62-step1",
    ]) {
      const v = fixture("PUSH_BRANCH");
      v.branch = branch;
      expect(evaluateV65Action("PUSH_BRANCH", v, now).allowed).toBe(false);
    }
    for (const field of [
      "clean",
      "exactCommitReconstructed",
      "normalPush",
      "repairBranchAbsent",
    ]) {
      const v = fixture("PUSH_BRANCH");
      if (field === "clean") v.clean = false;
      else if (field === "exactCommitReconstructed")
        v.review.exactCommitReconstructed = false;
      else v.remote[field as "normalPush" | "repairBranchAbsent"] = false;
      expect(evaluateV65Action("PUSH_BRANCH", v, now).allowed).toBe(false);
    }
    const pushed = fixture("PUSH_BRANCH");
    pushed.journal.pushes = 1;
    expect(evaluateV65Action("PUSH_BRANCH", pushed, now).allowed).toBe(false);
    const pr = fixture("CREATE_PULL_REQUEST");
    pr.requestedDraft = false;
    expect(evaluateV65Action("CREATE_PULL_REQUEST", pr, now).allowed).toBe(
      false,
    );
    const exists = fixture("CREATE_PULL_REQUEST");
    exists.remote.existingRepairPullRequests = 1;
    expect(evaluateV65Action("CREATE_PULL_REQUEST", exists, now).allowed).toBe(
      false,
    );
  });
});
