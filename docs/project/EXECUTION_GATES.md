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
- no validator output may contain PII, raw chat, tokens or secrets

## Review handoff

Commit the `2026.09.06-v4` control transition separately before condition implementation. The same explicit Owner instruction authorizes continuing into the four scoped fixes after that commit. Issue #12 remains open; this state does not authorize AI/NLU, a PR, TEST deployment or Production access/action.
