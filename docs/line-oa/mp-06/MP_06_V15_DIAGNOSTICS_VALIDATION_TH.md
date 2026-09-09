# MP-06 v15 — D1/D2 diagnostics validation

## Scope and source

Control commit: `4aa1cba94a74442fab6608196211cabd5e6df0b3`.
Diagnostics candidate: `8a5b6547b4713ff50ad6b08ee58682e129641b6a`, a direct child of that control commit.

Only `worker/index.ts`, `worker/durable-objects.ts`, `worker/draft-order-objects.ts` and `worker-tests/mp-06-owner-readiness.test.ts` changed in the candidate. AST/member and exact-region comparisons verified that executable changes are confined to the readiness route and two observation methods. Webhook/provider/activation/recovery/accounting write paths remain unchanged. This document is evidence, not a runtime candidate or authorization grant.

## D1 — SELECT-only purge invariants

EXPIRED_PURGED is non-blocking only when its closed aggregate structure, empty customer fields/items, absent expiry, purged revision history, matching purge audit and zero pending delivery are all verified. A malformed or partially purged record remains blocked; other stored terminal states are not blanket-allowed. Reads neither normalize nor delete a draft. HTTP output projects only safe state, count and boolean facts.

## D2 — immutable session lineage

Observation follows the retained settled Owner event through the existing one-shot previous/current activation marker and the single private allowlist. Missing, ambiguous or changed lineage is denied. Marker derivation, event/attempt ownership, terminal classifications and cumulative ledger agreement are checked without invoking expiry, cleanup, settlement or other mutation helpers.

All synchronous SQL results are copied before awaiting crypto. An internal-only snapshot fingerprint detects observed coordinator changes between the two HTTP observations. Cross-object reads are **not a distributed transaction**, an ABA-proof lock, or an activation token. Activation eligibility and state observation are separate; neither response grants activation, provider dispatch, reply or recovery. Existing runtime authorization remains mandatory.

## Regression evidence

- Control: 59 tests, retaining the preceding 57 and adding two v15 contract groups (including swapped/unknown/drifting/stale/missing observation, rollback misuse and self-authorization rejection).
- Diagnostics: 45 real Worker/SQLite/HTTP tests. The original nine security tests remain. Two prior defect reproductions now assert corrected behavior plus unchanged storage; 34 additional cases cover purge invariants, other draft states, lineage corruption, pending/terminal accounting, expiry and two-read drift.
- Unique full inventory: Node unit 477 + mandatory deterministic benchmark 14 + Worker 128 = **619**, versus baseline 583. Increase: two control tests and 34 diagnostics tests; no duplicate benchmark discovery.
- Main checkout: two complete `pnpm check` runs passed. Deterministic benchmark generation repeated twice with byte-identical tracked outputs.
- Detached committed-candidate checkout: frozen lockfile installation into an initially empty isolated store; two complete `pnpm check` runs passed, with clean tracked state after each.
- An additional complete mock suite passed with API/admin/LINE keys explicitly removed from the child-process environment. No env file or key was copied into the detached checkout. Mock fixtures are not live credential or live-provider evidence.
- Minified exact-target dry-run artifacts from main and detached checkouts matched byte-for-byte. No dependency, lockfile, deployment configuration, model, prompt, policy, catalog, deterministic dataset/oracle/report or acceptance threshold changed.
- Formatting, lint, both TypeScript checks, build, all configured validators, secret scan, dependency audit and diff-check passed. Full suites had no failed/skipped/cancelled tests. Dependency audit reported no known vulnerabilities.

The first implementation run exposed the two old defect-reproduction expectations, and an intermediate lint run found three typing issues. These were corrected within diagnostics scope before the passing gates; no timeout, retry, skip, assertion reduction or amended commit concealed these intermediate results.

## Limits and remaining acceptance

Local diagnostics validation is PASS. It does not by itself prove remote readiness, actual LINE UAT, kill-switch acceptance, rollback rehearsal, complete branch security/release review or integration. Those remain separately evidenced operational gates. Historical unknown provider receipt/completion/billing cannot be inferred from later success and remains UNKNOWN where not independently established.

Detailed operational deployment/accounting metadata is not republished in this local-validation report. No PR, merge or Issue closure is authorized by these tests. Issue #12 remains open. Production remains NO_GO and outside this work's remote-access scope.
