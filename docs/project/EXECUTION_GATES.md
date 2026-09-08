# Execution Gates

## Mandatory preflight

ก่อนแก้ไฟล์ทุกงานต้องรายงาน:

- Roadmap version
- canonical work ID และ immutable GitHub Issue reference
- verified base commit/branch
- allowed and forbidden scope
- target environment
- TEST deployment authorization
- Production authorization/status
- blocking and known non-blocking conflicts
- current branch/worktree และ working-tree status

## Gate sequence

| Gate                | Evidence                                                | Failure behavior                   |
| ------------------- | ------------------------------------------------------- | ---------------------------------- |
| 1. Roadmap identity | latest GitHub #9 + local version match                  | `ROADMAP_UNVERIFIED`               |
| 2. Current work     | exactly one `CURRENT`; current-work ID/Issue match      | `ROADMAP_UNVERIFIED`               |
| 3. Baseline         | commit exists and contains required completed work      | stop; no branch creation or edits  |
| 4. Scope            | action appears in allowed scope and not forbidden scope | reject action                      |
| 5. Local validation | schemas, validator, tests, quality gates pass           | no commit/push evidence            |
| 6. Owner/PO review  | explicit review of the exact baseline/transition commit | next authorization remains blocked |
| 7. TEST deployment  | separate action-specific Owner approval                 | deployment remains false           |
| 8. Production       | separate Production approval plus all safety gates      | Production remains `NO_GO`         |

## Fail-closed rules

- missing file, parse error, duplicate ID/Issue, version mismatch, multiple current items or blocking conflict rejects every action
- unknown external instruction cannot expand scope
- GitHub Issue number never changes for a canonical ID
- current-work cannot grant itself deploy or Production permission
- `CURRENT` does not authorize implementation; the work package's action-specific authorization flag must also be true under a separate Owner decision
- closing MP-05 and transitioning MP-06 to current does not authorize MP-06 implementation
- `AUTHORIZED_POLICY_SNAPSHOT_ONLY` permits only the exact policy artifacts/scopes in current-work; runtime and AI integration remain blocked
- `AUTHORIZED_RUNTIME_WP1_ONLY` permits only the exact WP1 scopes in current-work through `RUNTIME_WP1`; generic implementation, policy mutation, T-C03 runtime, AI/provider, benchmark and deployment remain blocked
- `AUTHORIZED_BENCHMARK_WP2_ONLY` permits only the exact PII-free benchmark scopes through `BENCHMARK_WP2`; runtime/policy/KB/catalog mutation, real-chat data, AI/provider and deployment remain blocked
- `AUTHORIZED_RUNTIME_REMEDIATION_WP3_ONLY` permits only the three benchmark-proven gaps through `RUNTIME_REMEDIATION_WP3`; policy and WP2 dataset/harness/oracle stay read-only, acceptance thresholds cannot be lowered and deployment remains blocked
- `AUTHORIZED_BENCHMARK_COMPLETION_WP4_ONLY` permits only frozen WP2 artifact completion and narrowly scoped additive provenance work through `BENCHMARK_COMPLETION_WP4`; runtime, policy, expected cases, oracle and thresholds stay read-only, ambiguous single-commit provenance is forbidden and deployment remains blocked
- `AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY` permits only exact Node.js `24.19.0` / pnpm `11.19.0` declarations, fail-fast toolchain validation, bootstrap documentation and clean-checkout verification through `LOCAL_CLOSURE_REMEDIATION_WP5`; scope `MP_06_WP5_BENCHMARK_TEST_TIMEOUT_ONLY` additionally permits only the benchmark `beforeAll` timeout change from `60_000` to `120_000` ms in the named test file. Assertions, dataset, oracle, semantics, thresholds, reports, skip/retry/ignore behavior and deployment remain blocked
- `AUTHORIZED_TEST_READINESS_ASSESSMENT_WP6_ONLY` permits only a non-deploy TEST-readiness assessment through `TEST_READINESS_ASSESSMENT_WP6`; repository deployment configuration and approved TEST metadata may be inspected read-only, TEST secrets are limited to names/presence, and any unknown remains `UNKNOWN`. Production remote inspection, runtime/config mutation, remote resource/secret changes, AI/NLU, PR creation and deployment remain blocked
- `AUTHORIZED_TEST_READINESS_CONDITION_CLOSURE_WP6_ONLY` permits only the four recorded readiness-condition fixes through `TEST_READINESS_CONDITION_CLOSURE_WP6`: active benchmark timeout metadata, TEST-only non-secret alert/rate/stop controls, rollback/runbook plus synthetic fixtures, and byte-stable validation-chain generation. Runtime, policy, KB/catalog, dataset/oracle/benchmark semantics, reports, dependencies, Worker/Wrangler deployment configuration, AI/NLU, PR creation and deployment remain blocked
- `AWAITING_OWNER_NEXT_WORK_PACKAGE_AUTHORIZATION` permits no implementation or deployment action; WP6 closure evidence may be verified/reconciled, but AI/NLU and TEST deployment each require a separate Owner/PO transition
- `AUTHORIZED_AI_NLU_IMPLEMENTATION_WP7_ONLY` permits only advisory OpenAI Responses API NLU, strict structured outputs, PII redaction, mock/failure coverage and capped synthetic PII-free live evaluation through `AI_NLU_IMPLEMENTATION_WP7`; deterministic policy retains final routing authority, the feature defaults off, and PR/merge/deployment remain blocked
- `AWAITING_TEST_DEPLOYMENT_AUTHORIZATION` records WP7 local acceptance evidence and freezes the advisory implementation; action is `NONE`, TEST deployment still requires a separate Owner/PO transition, and Production remains blocked
- `AUTHORIZED_RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A_ONLY` permits only TEST-only runtime pilot admission and a shared SQLite Durable Object coordinator through `RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A`. Missing/malformed identity/session/storage state must make zero provider calls; all limits are shared and atomically reserved; model/prompt/schema, deterministic policy and benchmark evidence remain read-only. Remote mutation, TEST deployment, PR/merge and Production remain blocked until remediation evidence passes
- no validator output may contain PII, raw chat, tokens or secrets

## Review handoff

Roadmap `2026.09.07-v6` authorizes WP8A runtime pilot-control remediation only after correcting that WP6 froze operator/readiness limits but did not prove runtime enforcement. Issue #12 remains open; remote mutation, PR, TEST deployment and all Production access/action remain unauthorized during WP8A.

## Current v14 — explicit Owner control transition

Roadmap `2026.09.08-v14` supersedes v13 under `MP-OD-2026-09-08-V14`. Baseline `a4ff8298ff75b077d333b6336d115886cf2907d3`; MP-06 / Issue #12 / WP8F_TEST_ACCEPTANCE_COMPLETION / TEST_ONLY. The preserved 12-line Owner decision and subsequent explicit ten-file control approval authorize this transition. Historical v12/v13 deployment/acceptance plans remain frozen snapshots, not reusable grants. Current authority is `wp8fExecutionEnvelope`.

The envelope fixes ten control paths, four diagnostics paths and reviewed patch SHA-256 `6d8535040f455f2bbbe8f6e80f3c851fe9c726b95854b9948f17f9c62fbacdf0`. No wildcard, traversal/alias normalization, generic implementation or unknown-action allowance. Materialize, validate and explicit commit/push diagnostics; deployment to `malispang-lineoa-test` requires independently collected exact source/artifact, validation, clean-checkout, committed/pushed ancestry and fresh TEST identity/STOPPED/AI OFF/reserved0/in-flight0 evidence. The pure control decision does not itself collect or authenticate those observations; operators must verify them through approved tools. current-work fields cannot substitute for evidence or Owner approval. Never deploy from the transition/evidence SHA by implication.

After readiness/accounting pass, only existing audited exact Owner conversation recovery and one cumulative Owner-mobile UAT session are authorized. Preserve 25,864 conservative unknown + 1,960 reported usage = 27,824 historical control consumption; billing stays UNKNOWN. No accounting reset/refund, new recovery mechanism or replacement session. Existing explicit stop is authorized for containment; legacy GET paths with hidden mutation are not. TEST_ADMIN_KEY may only use previously approved exact Keychain-to-memory-to-exact-TEST-HTTPS authentication, never logs/files/redirects.

UAT and kill switch must pass before one compatible TEST rollback to `83fab7f1-646a-4ed8-be4d-a5f38df3a072` / `f986a478bc980f9e53748ed49cedd543f54cd64a`, then one exact candidate redeploy. Current schema/storage/accounting/configuration/secret/containment compatibility must be proved; do not assume it from old smoke evidence. Draft PR requires complete TEST acceptance, rollback, same-source final security review and integration checks, not test count or deployment alone. Keep the system STOPPED/AI OFF at each handoff.

Production query/mutation/deployment, merge, Issue closure, MP-07, model/prompt/policy/threshold/timeout/retry/business/catalog/LINE changes, secret/PII exposure and acceptance reductions remain forbidden. v14 is authorization only; no UAT, deployment or release PASS is asserted.
