# Roadmap Changelog

## 2026.09.06-v4 — current

- supersedes `2026.09.06-v3` while retaining MP-06 (GitHub #12) as the only current work
- records assessment verdict `TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS` from commit `76d1e1302c31a35ab49e565b231cf63100e27fb6` and conditions baseline `0ad0ee261eb1f270f8a81c5874d0118768244d53`
- sets phase/status/action to `WP6_TEST_READINESS_CONDITION_CLOSURE` / `AUTHORIZED_TEST_READINESS_CONDITION_CLOSURE_WP6_ONLY` / `TEST_READINESS_CONDITION_CLOSURE_WP6`
- authorizes exactly four conditions: active benchmark timeout metadata, TEST-only alert/rate/stop controls, rollback/runbook and synthetic fixtures, and byte-stable validation-chain preview generation
- normalizes the active benchmark contract to the dedicated `300_000` ms hook watchdog and two `15_000` ms test-specific watchdogs from commit `b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a`; historical 60/120/180-second evidence remains history and is not rewritten
- records observed five-run maximum 260.20s, 270s remediation ceiling and 9.80s margin as local execution evidence, not a product or CI performance guarantee
- preserves policy/dataset/result checksums and keeps runtime, benchmark semantics/reports, policy, KB/catalog, dependencies/lockfile and deployment configuration read-only
- keeps AI/NLU false, TEST deployment false, Production `NO_GO`, Issue #12 open and MP-07 blocked
- this transition commit changes only control/schema/validator/tests/governance documents; implementation follows only because the same Owner instruction separately authorizes it

## 2026.09.06-v3 — superseded

- supersedes `2026.09.06-v2` while retaining MP-06 (GitHub #12) as the only current work
- sets phase/status/action to `WP6_TEST_READINESS_ASSESSMENT` / `AUTHORIZED_TEST_READINESS_ASSESSMENT_WP6_ONLY` / `TEST_READINESS_ASSESSMENT_WP6` and verified baseline to toolchain commit `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`
- records WP5 timeout commit `98f6bc0843e376de9932acad767fb463932514cc`, toolchain commit `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331` and local deterministic verdict `PASS_WITH_LIMITATIONS`
- preserves policy checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa` and semantic result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`
- authorizes only a later non-deploy TEST-readiness assessment using repository configuration and approved TEST metadata read-only; secret inspection is limited to names/presence and Production remote inspection is forbidden
- requires unresolved evidence to remain `UNKNOWN` and `NOT_APPLICABLE` entries to include reasons; assessment verdicts are limited to the three encoded TEST-readiness outcomes
- keeps AI/NLU false, TEST deployment false, Production `NO_GO`, Issue #12 open and MP-07 blocked
- this transition changes only control/schema/validator/tests/governance documents; WP6 assessment implementation is not started

## 2026.09.06-v2 — superseded

- supersedes `2026.09.06-v1` while retaining MP-06 (GitHub #12), phase `WP5_LOCAL_CLOSURE_REMEDIATION`, status `AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY` and action `LOCAL_CLOSURE_REMEDIATION_WP5`
- sets verified baseline to control commit `9b39f22a79e1e8112abb731daf441a6feb09f8d8`
- records the six prepared, uncommitted WP5 toolchain files and the sole remaining validation blocker: the benchmark `beforeAll` hard timeout is `60_000` ms while repeated runtime is approximately 61–63 seconds
- records that the 9 skipped/cancelled tests are downstream effects of the timed-out parent hook, not explicit `.skip`, `.only`, `.todo` or conditional bypass; benchmark generation and semantic evidence remain valid
- adds only `MP_06_WP5_BENCHMARK_TEST_TIMEOUT_ONLY`, restricted to a later change of `60_000` to `120_000` ms in `tests/mp-06-wp2-benchmark.test.ts`
- defines `120_000` ms as a finite hard ceiling, not a performance threshold; forbids assertion, dataset, oracle, semantic, threshold, report, case-count, skip, retry, ignore or failure-exit changes
- requires 5 consecutive targeted runs below the ceiling with 0 skipped/cancelled tests and identical case counts, checksums and metrics; tracked benchmark reports must not change
- preserves policy, dataset and semantic result checksums, leaves runtime/policy/KB/catalog/deployment read-only, keeps TEST deployment false and Production `NO_GO`
- this transition changes only control/schema/validator/tests/governance documents; it does not modify the timeout or commit the prepared WP5 implementation

## 2026.09.06-v1 — superseded

- supersedes `2026.09.05-v5`
- retains MP-06 (GitHub #12) as the only current Roadmap item and sets phase `WP5_LOCAL_CLOSURE_REMEDIATION`
- changes current-work status/action to `AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY` / `LOCAL_CLOSURE_REMEDIATION_WP5` and sets `localClosureRemediationWp5=true`, `benchmarkWp2=false`, `runtimeRemediationWp3=false`, `benchmarkCompletionWp4=false`
- sets verified baseline to WP2 artifact commit `12e0d27dc06052f5f9a2075aff8f12c90bf5852e`; records WP1–WP4 complete with clean-checkout functional verification passed
- limits the remaining local acceptance blocker to missing exact Node.js `24.19.0` and pnpm `11.19.0` repository declarations and enforcement
- authorizes only a later Owner-instructed WP5 round for exact toolchain pinning, fail-fast validator/tests, developer bootstrap documentation, existing-CI alignment if present, empty-store frozen install and read-only benchmark/quality verification
- allows declared lockfile/integrity-checked registry downloads; does not require offline build and forbids vendoring, binary commits, private mirrors, dependency changes and supply-chain redesign
- keeps runtime, behavior tests, benchmark semantics/dataset/oracle/thresholds, policy, KB and catalog read-only; keeps TEST deployment false and Production `NO_GO`
- records that no CI workflow exists at transition and does not authorize creating one, a PR, default-branch drift repair, merge or rebase
- keeps Issue #12 open for AI/NLU, TEST readiness/deployment, Owner UAT and Production readiness; this transition does not choose a next path
- this transition changes control/schema/validator/tests/governance documents only; WP5 toolchain implementation is not started

## 2026.09.05-v5 — superseded

- supersedes `2026.09.05-v4`
- retains MP-06 (GitHub #12) as the only current Roadmap item and sets phase `WP4_WP2_BENCHMARK_COMPLETION`
- changes current-work status/action to `AUTHORIZED_BENCHMARK_COMPLETION_WP4_ONLY` / `BENCHMARK_COMPLETION_WP4` and sets `benchmarkWp2=true`, `runtimeRemediationWp3=false`
- sets verified runtime baseline to `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`
- pins policy checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed result `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` and PASS result `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`
- requires report provenance to distinguish benchmark/dataset base `8117f7c0b7cb190af81ea8f9481bd257db8a5a51` from runtime under test `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`
- authorizes a later Owner-instructed round to commit the 18 frozen WP2 artifacts and make only the narrowest additive provenance remediation if required
- keeps runtime, policy, expected cases, oracle and acceptance thresholds read-only; retains failed history; keeps TEST deployment false and Production `NO_GO`
- this transition changes control/schema/validator/tests/docs only; WP4 benchmark completion implementation is not started

## 2026.09.05-v4 — superseded

- supersedes `2026.09.05-v3`
- retains MP-06 (GitHub #12) as the only current Roadmap item and sets phase `WP3_RUNTIME_REMEDIATION`
- changes current-work status to `AUTHORIZED_RUNTIME_REMEDIATION_WP3_ONLY` and action to `RUNTIME_REMEDIATION_WP3`
- pins policy `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` as read-only
- pins WP2 dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa` and failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6`
- authorizes a later Owner-instructed round to remediate only delivery fee/area overlap 72 cases, individual loyalty balance overlap 72 cases and guess-price precedence 1 case
- keeps WP2 dataset/harness/oracle and all acceptance thresholds unchanged; reports may be regenerated only after runtime passes
- keeps TEST deployment false, Production `NO_GO`, and forbids AI/provider, real chat, policy/KB/catalog changes and work outside the three gaps
- this transition changes control/schema/validator/tests/docs only; runtime remediation is not started

## 2026.09.05-v3 — superseded

- supersedes `2026.09.05-v2`
- retains MP-06 (GitHub #12) as the only current Roadmap item
- changes current-work status to `AUTHORIZED_BENCHMARK_WP2_ONLY`
- sets the verified baseline to WP1 commit `2a2571369f7e845c5d72883d816556ce24be18c0`
- authorizes only the eight exact WP2 scopes for a later Owner-instructed benchmark round
- records ≥5,000 meaningfully distinct PII-free cases: functional ≥3,000, Thai variation ≥1,000 and adversarial/safety ≥1,000
- records AUTO correctness ≥98%, risky fail-closed 100%, unsupported claims and PII/raw-chat leakage 0, authority failures fail-closed 100%, confusion matrix and every false-AUTO report required
- keeps policy snapshot read-only and blocks runtime/policy/KB/catalog changes, real-chat data, AI/provider, TEST/Production deployment and Production access
- does not authorize a GitHub Roadmap edit in this transition

## 2026.09.05-v2 — superseded

- supersedes `2026.09.05-v1`
- retains MP-06 (GitHub #12) as the only current Roadmap item
- changes current-work status to `AUTHORIZED_RUNTIME_WP1_ONLY`
- sets verified baseline to policy snapshot commit `a701eac403aef924d587b4427397c63553bdda3e`
- authorizes only the ten exact WP1 scopes for a later Owner-instructed runtime round
- pins policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` as read-only
- keeps T-C03 runtime, policy/template/Owner-decision/KB/catalog changes, AI/provider/prompt/key/secret/raw-chat work and benchmark 5,000 cases forbidden
- keeps TEST deployment false, Production `NO_GO`, MP-07 blocked and default-branch merge forbidden

## 2026.09.05-v1 — superseded

- supersedes `2026.09.04-v1`
- retains MP-06 (GitHub #12) as the only current Roadmap item
- changes current-work status to `AUTHORIZED_POLICY_SNAPSHOT_ONLY`
- authorizes a later policy-snapshot-only round covering specification, schema, validator, tests and governance evidence
- records the seven mandatory locked policy topics and policy snapshot `2026.09.05-policy-v1` as specification-only evidence
- keeps runtime implementation and AI/provider work unauthorized
- keeps TEST deployment false and Production `NO_GO`
- records transition baseline `5ddf9cc88d0bb868aadbc8f2a41860b56a5f2682`

## 2026.09.04-v1 — superseded

- supersedes `2026.09.02-v4`
- records Owner/PO approval of MP-05 commit `d036063a562a4fa780f162c69f7824ebcb9a250b` as the governance baseline
- marks MP-05 (GitHub #11) completed and MP-06 (GitHub #12) current
- explicitly keeps MP-06 implementation unauthorized; only the transition record, commit/push and GitHub #9 reconciliation are allowed
- keeps the MP-06 minimum 5,000-case PII-free benchmark composition unchanged
- keeps MP-07 (GitHub #7) blocked pending MP-06 completion and Owner/PO review
- keeps TEST deployment false and Production `NO_GO`

## 2026.09.02-v4 — superseded

- supersedes `2026.09.02-v3`
- introduces canonical work IDs `MP-01`–`MP-12` without replacing historical GitHub Issues
- makes MP-05 (GitHub #11) the only current implementation
- keeps MP-06 (GitHub #12) blocked pending MP-05 Owner/PO review
- records the MP-06 minimum 5,000-case PII-free benchmark composition
- defaults TEST deployment to false and Production to `NO_GO`
- records verified latest baseline `a0612489b4b5ce4394042891513371d5bf10fdb2`
- records GitHub default-branch drift; dedicated worktree from verified baseline is the approved mitigation

## Reconciliation with GitHub

At MP-05 preflight on 4 September 2026:

- MP-ROADMAP (GitHub #9) declared `2026.09.02-v4`
- MP-05 (GitHub #11) declared itself current and local-only
- MP-06 (GitHub #12) declared itself next/blocked with the same benchmark
- all three declared TEST deployment unauthorized and Production `NO-GO`

On 4 September 2026, Owner/PO approved MP-05 commit `d036063a562a4fa780f162c69f7824ebcb9a250b`, then authorized transition to `2026.09.04-v1`, with MP-06 current but implementation and deployment explicitly unauthorized. On 5 September 2026, Owner authorized the policy-snapshot-only transition and snapshot, then authorized `2026.09.05-v2` and WP1 runtime commit `2a2571369f7e845c5d72883d816556ce24be18c0`. Roadmap `2026.09.05-v3` authorized WP2, whose unchanged 5,000-case benchmark exposed the three recorded gaps. Roadmap `2026.09.05-v4` authorized the WP3 remediation recorded at `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`; the unchanged benchmark reproduced PASS with result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`. Roadmap `2026.09.05-v5` authorized WP4 completion, and the 18 benchmark artifacts were committed at `12e0d27dc06052f5f9a2075aff8f12c90bf5852e`. Roadmap `2026.09.06-v1` authorized WP5 toolchain pinning and `2026.09.06-v2` narrowly authorized the non-semantic benchmark timeout remediation. Those changes passed at commits `98f6bc0843e376de9932acad767fb463932514cc` and `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`, establishing `PASS_WITH_LIMITATIONS` for local deterministic acceptance. Roadmap `2026.09.06-v3` now authorizes only a later, non-deploy TEST-readiness assessment; that assessment has not started.

Any later GitHub edit that changes those control fields requires a new Owner decision and Roadmap version before implementation. The validator cannot treat `CURRENT`, chat history or an unversioned Issue edit as implementation authorization.
