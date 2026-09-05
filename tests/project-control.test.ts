import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import {
  CANONICAL_GITHUB_ISSUES,
  evaluateProjectAction,
  validateProjectControl,
  validateSchemaDocuments,
} from "../src/project-control.js";

const root = new URL("../", import.meta.url);
let roadmap: unknown;
let currentWork: unknown;
let roadmapSchema: unknown;
let currentWorkSchema: unknown;

beforeAll(async () => {
  [roadmap, currentWork, roadmapSchema, currentWorkSchema] = await Promise.all([
    readJson("config/project/roadmap.json"),
    readJson("config/project/current-work.json"),
    readJson("config/project/roadmap.schema.json"),
    readJson("config/project/current-work.schema.json"),
  ]);
});

describe("MP-06 WP2-only benchmark control", () => {
  it("accepts the 2026.09.05-v3 control snapshot and records default-branch drift", () => {
    expect(validateProjectControl(roadmap, currentWork)).toEqual({
      errors: [],
      warnings: ["DEFAULT_BRANCH_DRIFT"],
    });
    expect(validateSchemaDocuments(roadmapSchema, currentWorkSchema)).toEqual(
      [],
    );
  });

  it("keeps canonical work IDs mapped to immutable GitHub issues", () => {
    const record = roadmap as {
      items: Array<{ id: string; githubIssue: number }>;
    };
    expect(
      Object.fromEntries(
        record.items.map((item) => [item.id, item.githubIssue]),
      ),
    ).toEqual(CANONICAL_GITHUB_ISSUES);
  });

  it("authorizes only scoped WP2 benchmark work", () => {
    expect(
      evaluateProjectAction(roadmap, currentWork, "BENCHMARK_WP2"),
    ).toEqual({
      allowed: true,
      reason: "AUTHORIZED_BY_CURRENT_WORK",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "RUNTIME_WP1")).toEqual({
      allowed: false,
      reason: "RUNTIME_WP1_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "POLICY_SNAPSHOT"),
    ).toEqual({
      allowed: false,
      reason: "POLICY_SNAPSHOT_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "LOCAL_IMPLEMENTATION"),
    ).toEqual({
      allowed: false,
      reason: "USE_SCOPED_BENCHMARK_WP2_ACTION",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "COMMIT").allowed).toBe(
      true,
    );
    expect(
      evaluateProjectAction(roadmap, currentWork, "PUSH_BRANCH").allowed,
    ).toBe(true);
    expect(
      evaluateProjectAction(roadmap, currentWork, "UPDATE_GITHUB_ROADMAP"),
    ).toEqual({
      allowed: false,
      reason: "UPDATE_GITHUB_ROADMAP_NOT_AUTHORIZED",
    });
    expect(evaluateProjectAction(roadmap, currentWork, "DEPLOY_TEST")).toEqual({
      allowed: false,
      reason: "DEPLOY_TEST_NOT_AUTHORIZED",
    });
    expect(
      evaluateProjectAction(roadmap, currentWork, "CHANGE_PRODUCTION"),
    ).toEqual({
      allowed: false,
      reason: "CHANGE_PRODUCTION_NOT_AUTHORIZED",
    });
  });

  it("fails closed when Roadmap and current-work versions conflict", () => {
    const changed = clone(currentWork) as { roadmapVersion: string };
    changed.roadmapVersion = "2026.09.05-v2";
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "CURRENT_WORK_ROADMAP_VERSION_MISMATCH",
    );
    expect(
      evaluateProjectAction(roadmap, changed, "LOCAL_IMPLEMENTATION"),
    ).toEqual({
      allowed: false,
      reason: "ROADMAP_UNVERIFIED",
    });
  });

  it("requires the verified baseline to contain MP-06 WP1", () => {
    const changed = clone(roadmap) as {
      verifiedLatestBaseline: { contains: string[] };
    };
    changed.verifiedLatestBaseline.contains =
      changed.verifiedLatestBaseline.contains.filter((id) => id !== "MP-06");
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "VERIFIED_BASELINE_MUST_CONTAIN_MP_06_WP1",
    );
  });

  it("fails closed when current work is missing or more than one item is current", () => {
    expect(validateProjectControl(roadmap, null).errors).toEqual([
      "CURRENT_WORK_MISSING_OR_INVALID",
    ]);
    const changed = clone(roadmap) as {
      items: Array<{ id: string; state: string }>;
    };
    const next = changed.items.find((item) => item.id === "MP-07");
    if (!next) throw new Error("fixture MP-07 missing");
    next.state = "CURRENT";
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "EXACTLY_ONE_CURRENT_ITEM_REQUIRED",
    );
  });

  it("rejects a changed immutable GitHub issue reference", () => {
    const changed = clone(roadmap) as {
      items: Array<{ id: string; githubIssue: number }>;
    };
    const item = changed.items.find((candidate) => candidate.id === "MP-05");
    if (!item) throw new Error("fixture MP-05 missing");
    item.githubIssue = 99;
    expect(validateProjectControl(changed, currentWork).errors).toContain(
      "IMMUTABLE_GITHUB_REFERENCE_INVALID_MP-05",
    );
  });

  it("enforces the 5,000-case PII-free benchmark while MP-06 is current", () => {
    const changed = clone(roadmap) as {
      items: Array<{
        id: string;
        state: string;
        benchmark?: { piiFree: boolean; minimumTotal: number };
      }>;
    };
    const item = changed.items.find((candidate) => candidate.id === "MP-06");
    if (!item?.benchmark) throw new Error("fixture MP-06 benchmark missing");
    item.benchmark.minimumTotal = 4_999;
    item.benchmark.piiFree = false;
    item.state = "NEXT_BLOCKED";
    expect(validateProjectControl(changed, currentWork).errors).toEqual(
      expect.arrayContaining([
        "MP_06_BENCHMARK_MUST_BE_PII_FREE",
        "MP_06_BENCHMARK_TOTAL_TOO_SMALL",
        "MP_06_MUST_BE_CURRENT",
      ]),
    );
  });

  it("enforces WP2 quality thresholds and required reports", () => {
    const changed = clone(currentWork) as {
      benchmarkAcceptanceCriteria: {
        meaningfullyDistinct: boolean;
        minimumAutoCorrectnessPercent: number;
        riskyStaffOnlyOrFailClosedPercent: number;
        maximumUnsupportedClaims: number;
        maximumPiiOrRawChatLeakage: number;
        authorityFailureFailClosedPercent: number;
        confusionMatrixRequired: boolean;
        falseAutoReportRequired: boolean;
      };
    };
    const criteria = changed.benchmarkAcceptanceCriteria;
    criteria.meaningfullyDistinct = false;
    criteria.minimumAutoCorrectnessPercent = 97;
    criteria.riskyStaffOnlyOrFailClosedPercent = 99;
    criteria.maximumUnsupportedClaims = 1;
    criteria.maximumPiiOrRawChatLeakage = 1;
    criteria.authorityFailureFailClosedPercent = 99;
    criteria.confusionMatrixRequired = false;
    criteria.falseAutoReportRequired = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "CURRENT_WORK_BENCHMARK_CASES_MUST_BE_MEANINGFULLY_DISTINCT",
        "CURRENT_WORK_AUTO_CORRECTNESS_BELOW_98_PERCENT",
        "CURRENT_WORK_RISKY_FAIL_CLOSED_MUST_BE_100_PERCENT",
        "CURRENT_WORK_UNSUPPORTED_CLAIMS_MUST_BE_ZERO",
        "CURRENT_WORK_PII_RAW_CHAT_LEAKAGE_MUST_BE_ZERO",
        "CURRENT_WORK_AUTHORITY_FAILURE_FAIL_CLOSED_MUST_BE_100_PERCENT",
        "CURRENT_WORK_CONFUSION_MATRIX_REQUIRED",
        "CURRENT_WORK_FALSE_AUTO_REPORT_REQUIRED",
        "BENCHMARK_ACCEPTANCE_CRITERIA_MISMATCH",
      ]),
    );
  });

  it("rejects TEST deploy or Production authorization drift", () => {
    const changedRoadmap = clone(roadmap) as {
      authorization: {
        testDeployment: boolean;
        productionStatus: string;
        productionAuthorizationReference: string | null;
      };
    };
    const changedWork = clone(currentWork) as {
      authorization: { testDeployment: boolean; production: boolean };
    };
    changedRoadmap.authorization.testDeployment = true;
    changedRoadmap.authorization.productionStatus = "GO";
    changedRoadmap.authorization.productionAuthorizationReference =
      "unapproved";
    changedWork.authorization.testDeployment = true;
    changedWork.authorization.production = true;
    expect(validateProjectControl(changedRoadmap, changedWork).errors).toEqual(
      expect.arrayContaining([
        "TEST_DEPLOYMENT_MUST_DEFAULT_FALSE",
        "PRODUCTION_MUST_REMAIN_NO_GO",
        "PRODUCTION_AUTHORIZATION_MUST_BE_ABSENT",
        "CURRENT_WORK_TEST_DEPLOYMENT_MUST_BE_FALSE",
        "CURRENT_WORK_PRODUCTION_MUST_BE_FALSE",
      ]),
    );
  });

  it("rejects removal of the explicit WP2 benchmark authorization", () => {
    const changed = clone(currentWork) as {
      authorization: { benchmarkWp2: boolean };
    };
    changed.authorization.benchmarkWp2 = false;
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "WP2_BENCHMARK_NOT_AUTHORIZED",
    );
    expect(evaluateProjectAction(roadmap, changed, "BENCHMARK_WP2")).toEqual({
      allowed: false,
      reason: "ROADMAP_UNVERIFIED",
    });
  });

  it("rejects policy checksum drift or WP2 scope expansion", () => {
    const checksumDrift = clone(currentWork) as {
      policySnapshotReference: { checksum: string };
    };
    checksumDrift.policySnapshotReference.checksum = "0".repeat(64);
    expect(validateProjectControl(roadmap, checksumDrift).errors).toContain(
      "POLICY_SNAPSHOT_CHECKSUM_INVALID",
    );

    const expandedScope = clone(currentWork) as { allowedScope: string[] };
    expandedScope.allowedScope.push("CHANGE_MP_06_RUNTIME");
    expect(validateProjectControl(roadmap, expandedScope).errors).toContain(
      "WP2_SCOPE_INVALID",
    );
  });

  it("requires the policy snapshot to remain read-only", () => {
    const changed = clone(currentWork) as {
      authorization: {
        policySnapshot: boolean;
        policySnapshotReadOnly: boolean;
      };
    };
    changed.authorization.policySnapshot = true;
    changed.authorization.policySnapshotReadOnly = false;
    expect(validateProjectControl(roadmap, changed).errors).toEqual(
      expect.arrayContaining([
        "POLICY_SNAPSHOT_MUTATION_MUST_BE_FALSE",
        "POLICY_SNAPSHOT_READ_ONLY_NOT_AUTHORIZED",
      ]),
    );
    expect(evaluateProjectAction(roadmap, changed, "POLICY_SNAPSHOT")).toEqual({
      allowed: false,
      reason: "ROADMAP_UNVERIFIED",
    });
  });

  it("fails closed if the runtime-change prohibition is removed", () => {
    const changed = clone(currentWork) as { forbiddenScope: string[] };
    changed.forbiddenScope = changed.forbiddenScope.filter(
      (scope) => scope !== "CHANGE_MP_06_RUNTIME",
    );
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "FORBIDDEN_SCOPE_MISSING_CHANGE_MP_06_RUNTIME",
    );
  });

  it("turns an unresolved blocking conflict into ROADMAP_UNVERIFIED", () => {
    const changed = clone(currentWork) as {
      conflicts: Array<{
        code: string;
        blocking: boolean;
        detail: string;
        resolution: string;
      }>;
    };
    changed.conflicts.push({
      code: "GITHUB_ROADMAP_MISMATCH",
      blocking: true,
      detail: "fixture",
      resolution: "Owner review required",
    });
    expect(validateProjectControl(roadmap, changed).errors).toContain(
      "BLOCKING_CONFLICT_GITHUB_ROADMAP_MISMATCH",
    );
    expect(evaluateProjectAction(roadmap, changed, "COMMIT").reason).toBe(
      "ROADMAP_UNVERIFIED",
    );
  });
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
