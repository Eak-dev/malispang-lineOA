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
- no validator output may contain PII, raw chat, tokens or secrets

## Review handoff

After the `2026.09.05-v5` control transition is validated, pushed and reconciled with GitHub #9/#12, stop. WP4 benchmark completion begins only in a later Owner-instructed round using the frozen runtime, policy, dataset, oracle and acceptance thresholds. This transition does not modify or commit benchmark artifacts and does not authorize any deployment.
