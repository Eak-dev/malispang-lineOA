# MalisPang Project Control

## Effective single Owner Mac uat2 deploy — v52

Owner approved step B on 2026-10-02 ("B") and chose to run it from their own Mac with the already authenticated wrangler, so no Cloudflare token is stored in the cloud environment. Version 2026.10.02-v52 / MP-OD-2026-10-02-V52 supersedes v51. MP-06/Issue #12 remains CURRENT/OPEN; MP-07 stays blocked. Production NO_GO — NOT TOUCHED.

Finding: Wrangler refuses the first deploy of a new Worker while any secrets.required entry is unset unless --secrets-file is used, which would merge step C into step B. v52 therefore removes secrets.required from env.uat2 only. This is safe because assertRequiredSecrets fails every route except /health closed with 503 until all five TEST secrets are set; a worker test proves it for each missing secret. Top-level config of the held malispang-lineoa-test Worker and all runtime are unchanged.

Authorization: exactly one Owner-executed `pnpm exec wrangler deploy --env uat2 --minify` of the clean v52 source commit on codex/mp06-uat-round2-prep after a frozen install, account c395a1bc15b7c95267173de5ccd6407d check, absent uat2 Worker and dry run. Post-check: /health 200, other routes 503, empty secret list, no new deployment on the held Worker, LINE webhook unchanged. An ambiguous outcome consumes the deploy; no retry. Never deploy without --env and never use pnpm deploy:test or --secrets-file.

V52_ALLOWED_PATHS is the complete scope: control manifests and append-only records, v52 module/test and wiring, wrangler.jsonc, the round-2 worker test, the runbook section 7 and the v51 historical test pinned to immutable 8343581c83d86da01183cf3a333449acfecb6a5d. Secrets, LINE webhook, pilot activation, held storage, live provider, PR, merge, U2 and Issue closure remain forbidden and need separate Owner approval. UAT readiness stays NOT_VERIFIED.

## Effective UAT round 2 local preparation — v51

Owner approved verbatim on 2026-10-02: "อนุมัติ v51 UAT_ROUND2_LOCAL_PREPARATION_ONLY ตามส่วน C", after delegating the choice of method ("ให้คุณเลือกวิธีที่ดีทีสุด") and reviewing proposal section C. Version 2026.10.02-v51 / MP-OD-2026-10-02-V51 supersedes v50. MP-06/Issue #12 remains CURRENT/OPEN; MP-07 stays blocked. Production NO_GO — NOT TOUCHED.

Local analysis (no TEST access): in the deployed candidate bfff1a553868b85e5f66144e4741a51627f4a9be the only write path that yields the observed round-1 state BOT_ACTIVE / clarificationUsed=true / pendingTemplate=null is a new processed event with an approved response. A scratch emulator test reproduced exactly that state with zero AI accounting change when a catalog follow-up arrives while the pilot is STOPPED, because admission returns PILOT_INACTIVE and the deterministic plan still runs. This proves possibility only; round-1 causality stays UNKNOWN and the held storage is not read.

Decisions: (1) isolate round 2 on a separate Worker script malispang-lineoa-test-uat2 (wrangler env uat2), so every Durable Object namespace starts empty and the held malispang-lineoa-test storage is never read, written or redeployed; runtime is byte-identical to v50 and PUBLIC_ASSET_BASE_URL stays on the existing static asset host. (2) The STOPPED-does-not-freeze-conversation gap is controlled procedurally by an exact per-case gate (src/mp-06-uat-round2-gate.ts) over the generic status/audit endpoints, with a runtime fix recorded as separate work before MP-12. (3) Sequence: this local preparation, then deploy, secrets, LINE webhook and R1/R2/R3/STOP/R4, each needing separate Owner approval. (4) After UAT the webhook remains on uat2 with the pilot STOPPED and never returns to the held Worker. (5) Historical investigation is deferred; only processed events/response plans/delivery claims may be read after a renewed access review. (6) Issue #12 may close only after a full round-2 pass plus an Owner accepted-risk record for U1 GAP, A1-A3, billing and the pendingTemplate cause.

V51_ALLOWED_PATHS is the complete scope: control manifests and append-only records, the v51 module/test and CLI/dispatch wiring, the wrangler uat2 env, the pure gate module, its worker tests, the round-2 runbook and the v50 historical test adapter pinned to immutable 0774131ef334e09426203cd6aff92c59bbf52a52. Runtime, policy, KB, catalog, dependencies, workflow and benchmark artifacts are read-only.

Publication is one normal child commit of 0774131e on new branch codex/mp06-uat-round2-prep, pushed without a pull request after full local gates and audit0. No deploy, secret, LINE webhook change, held storage/SQL access, live provider call, PR, Ready, merge, Production, U2 or Issue closure. UAT readiness stays NOT_VERIFIED.

## Effective Node test deadline amendment — v50

Owner explicitly approved changing the Node test deadline from five to seven seconds after asking whether it was system imposed. Vitest supplies a 5000ms Node testTimeout default (https://vitest.dev/config/testtimeout); vitest.config.ts at published v49 b1ca3a90c7a550f48c91d971b35dd9f148ce91e9 did not override it. Historical controls subsequently froze that inherited value. It is not an immutable platform limit, LINE bot response SLA, or permission grant. Version2026.09.30-v50 / MP-OD-2026-09-30-V50 supersedes v49 for exactly this Owner-approved parameter amendment. MP06/Issue12 remains CURRENT/OPEN in WP8F_TEST_ACCEPTANCE_COMPLETION.

Baseline is published v49 b1ca3a90c7a550f48c91d971b35dd9f148ce91e9, tree f09f86c981adda6db7660010c54c8254a6392d24, parent4167e492d3d8ad61037485f3eb0ac9545e86c401. PR20 stays OPEN Draft on codex/mp06-harness-v43 against codex/mp-06-guardrailed-ai/basea05bab89bc6d5cdf2914581ed658be86dd00b062. Only insert testTimeout:7000 in the Node Vitest config, preserve maxWorkers:2, includes/excludes, zero retries, assertions and all business acceptance thresholds. Worker config, Worker deadlines, runtime/provider/LINE deadlines, workflow, dependencies, knowledge and old control inspectors are unchanged. No further timeout increase is authorized.

Preserve hosted v49 CI run36682758857:1492/1497 Node tests passed; four timed out at5000ms and one failed a PR environment identity assertion. One timed-out case took12689ms. A /usr/bin/git version launch alone took5865.83ms while the direct installed Git path took23.05ms. The cause of hosted launch latency and the exact environment interleaving remain UNKNOWN; a seven-second ceiling is an Owner parameter decision, not proof of root-cause repair. The current change might not fix every failure. Never relabel prior failures or skipped downstream stages as PASS.

Adapt historical v49 test input sourcing only to immutable baseline b1ca3a90 while retaining its assertions/current imported validators and awaited fixture cleanup plus operator guards. Seal that adapter and the exact config. New manifests must project exactly to v49; previous decisions and evidence remain append-only. V50_ALLOWED_PATHS is the complete scope. No unrelated harness behavior changes.

Require fresh exact staged-source focused gates, frozen install, zero-all-severity audit and separate evidence-bound primary-agent review before one normal child commit. Require fresh full26 local gates, frozen install, audit0 and review on the actual clean SHA/tree/diff before the previously authorized ordinary push to existing Draft PR20. Fresh <=120second PR readback must match published v49 and unchanged base; read back after push and do not blindly retry uncertain publication. Hosted CI must be observed separately; local PASS is not hosted PASS or UAT readiness. No new PR/Ready/merge/deploy/remote TEST/storage/SQL/LINE/provider/Production/U2/Issue closure, no grant reset and no replay or transport bypass of a denied action. Storage hold and live UAT gaps remain unchanged.

## Effective Node scheduling amendment — v49

Owner approved exactly Node maxWorkers=2 and the necessary control transition, followed by full qualification and ordinary push to existing Draft PR20. Version2026.09.30-v49 supersedes v48; MP06/Issue12 remains CURRENT/OPEN. Local baseline4167e492d3d8ad61037485f3eb0ac9545e86c401 has tree06c4c7ff78a7b6a41c77310860fee4162e06a168 and parent/published PR20 head5317849ec325bf3b18fc27d2efe902e0b3147742. Basea05bab89bc6d5cdf2914581ed658be86dd00b062 and both branches are unchanged. V48 was committed locally but not pushed: its post-commit full run-qP3i34 failed three 5000ms timeouts. Preserve that failure and all prior evidence; do not inherit the earlier precommit PASS.

The only scheduling exception is the exact maxWorkers:2 insertion in vitest.config.ts, used by local Node tests and unchanged CI. Preserve includes/excludes, every assertion, 5000ms test deadlines, zero retries, Worker config/in-test concurrency, workflows, dependencies, runtime, knowledge and old inspectors. Adapt only historical v48 input sourcing to immutable4167e492 while exercising current imports and preserving/adding operator guards. Seal both exact changed files. Latest manifests must project exactly to v48; previous records remain append-only. The exact allowed paths are V49_ALLOWED_PATHS.

Local diagnostic default/two-worker runs each executed1472 Node tests and15471 observed Git commands. Peak distinct Git workers fell7 to2; three problematic cases improved from4614/3312/3293ms to3087/2743/2651ms. Total elapsed increased212 to248seconds and Git p95 did not improve. This single pair supports a contention contribution, not proof of the historical hosted cause or qualification. A new source needs fresh evidence.

Require exact staged-tree focused checks, audit0 and review before one normal child commit; full26 local gates, frozen install, fresh zero-all-severity audit and review on that actual clean SHA/tree/diff before push. Fresh <=120second PR20 readback must remain OPEN Draft/unmerged at published5317849e and unchanged base. Normal fast-forward push only, no blind retry of uncertain outcomes. No Ready/new PR/merge/deploy/remote TEST/storage/SQL/LINE/provider/Production/U2/Issue closure, no grant reset or denied-action replay. This is not live TEST readiness.

## Effective CI repair — v48 / existing Draft PR20 only

Owner explicitly approved scoped test-harness and CI repair and ordinary follow-up push to existing Draft PR20, without merge/deploy. MP06 / Issue12 remains CURRENT/OPEN. Baseline5317849ec325bf3b18fc27d2efe902e0b3147742 and basea05bab89bc6d5cdf2914581ed658be86dd00b062 are verified; PR20 OPEN Draft, unmerged. This transition supersedes consumed v47.1 publication, not its immutable history.

Repair only historical-test environment isolation and measured Git fixture overhead in the exact V48_ALLOWED_PATHS. Pin historical v47 tests to baseline Git bytes while exercising current dispatchers. Preserve all assertions, real PR synthetic identity checks, raw-index/operator/isolation/awaited-cleanup proofs, 5000ms watchdogs and zero retries. Workflows/parallelism, dependencies, runtime, knowledge answers/lifecycle, old inspector modules and snapshots remain frozen. PENDING repair seals permit local measurement only, never publication.

New exact-stage focused tests/audit0/review precede commit; all26 local gates and fresh audit0/review bind each actual source SHA/tree/diff before an ordinary fast-forward push to PR20. Fresh <=120second PR identity must verify the expected published head and unchanged base; no blind retry of ambiguous push. Read-only snapshots must preserve raw index. Failed CI36672983371 and all earlier failure evidence remain historical FAIL, never replaced by later PASS. New source invalidates prior qualification.

No new PR, Ready, merge, deploy, remote TEST/storage/SQL/LINE/provider, Production, U2, Issue closure, grants reset or tool-denial replay. Historical storage hold, pendingTemplate cause, accounting/UAT gaps unchanged. Local/CI repair is not live TEST readiness.

## Effective publication amendment — v47.1 / exact brace-expansion security patch

Owner approved only brace-expansion1.1.18 to1.1.21 and5.0.9 to5.0.12, their minimal workspace/lock/control changes, requalification and ordinary push to existing Draft PR20. MP-OD-2026-09-30-V47A supersedes the unpublished v47 decision for this exception; the immutable v46 snapshot remains the content/projection baseline, not the latest authority. Preserve the complete prior v47 records and failed evidence below. MP06 / Issue12 remains CURRENT/OPEN, H86e5c967 and PR20 sourceSd0f63188/baseMa05bab89 unchanged.

The27 exact allowed paths are the previous25 plus pnpm-workspace.yaml and pnpm-lock.yaml. Add only the two parent-scoped overrides minimatch@3.1.5>brace-expansion=1.1.21 and minimatch@10.2.6>brace-expansion=5.0.12. Preserve all other dependency versions, importers and overrides, including miniflare>undici7.29.1, workflows, runtime/knowledge bytes and prior test assertions. Review exact registry provenance and diff before sealing the new pair. Pending or mixed/baseline dependency bytes must not authorize commit/push; one direct source child of H must contain the complete sealed pair.

Fresh v47.1 qualification binds the actual workspace/lock hashes outside the immutable V43 receipt structure. Historical nested hashes are preserved evidence only, not a claim that the new files have the old hashes. Require independent exact-stage/source review, frozen installation, zero-all-severity audit, all26 local gates and fresh PR20 identity before normal push. No new PR, Ready, merge, deploy, remote TEST/storage/SQL/LINE/provider, Production, U2 or Issue closure. All earlier failures, storage hold and unresolved UAT/causal/accounting evidence remain unchanged.

## Effective publication control — v47 / frozen TEST knowledge to existing Draft PR20

This publication permits exactly one source commit that is a direct child of H. A second source successor is outside this grant; this also prevents later commits from rewriting evidence appended by the first.

Owner approved the proposed publication successor and normal commit/push to existing Draft PR20, after all gates pass. MP-OD-2026-09-30-V47 supersedes local-only v46 solely for this package. MP06 / Issue12 remains CURRENT / OPEN. Baseline H is 86e5c967dd29e669ee0bc66e594fc9636a188c4e, its parent and expected published source S is d0f63188c50da6e204a4ecc1e91bed97f5ec44eb, and MP06 base M remains a05bab89bc6d5cdf2914581ed658be86dd00b062. The source branch remains codex/mp06-harness-v43; PR20 remains OPEN Draft into codex/mp-06-guardrailed-ai.

Freeze the completed v46 local overlay in tests/fixtures/mp06-v46-local/snapshot.json, SHA256 1934b50063f6cc3ec4dd3407f943f61888a1dde3e77180e01e2fb39fe5a74109. Permit only V47_ALLOWED_PATHS: the inherited22 paths plus the v47 module/test and snapshot. Runtime, TEST answers/checksums/keywords, manifest lifecycle, exact one-literal Worker clock correction and v46 inspector are frozen to that snapshot. Only publication control/dispatcher/CLI, append-only records and the hash-sealed historical-v46 fixture sourcing adapter may differ. Historical test assertions, 5000ms deadlines, zero retries, awaited cleanup and operator/index guards stay unchanged. Workflows, dependencies and existing main historical harness stay frozen.

PRE_COMMIT requires exact staged tree/diff, focused checks, fresh audit zero at every severity and independent review. POST_COMMIT requires full original26 local gates, frozen-install and fresh audit0 evidence plus review, all authenticated against one exact clean source SHA/tree/diff. Observe raw index bytes before the first read and immediately after each child process, before further Git observations; record any mutation and stop without restore or rebaseline. Use read-only porcelain observations and disable diff.autoRefreshIndex for whitespace inspection. Preserve old failures and RAW_INDEX_WRITER_UNKNOWN: fresh success does not resolve historical attribution.

Only new v47 receipts may conditionally authorize COMMIT and normal PUSH_BRANCH. Historical nested seals are dependency/provenance structure, not inherited authorization. Immediately before push, independently verify PR20 OPEN Draft/unmerged, source S, exact repo/branches/base M, freshness at most120 seconds and fast-forward ancestry. No new PR, Ready, merge, force-push/reset/rebase, deployment, remote TEST/storage/SQL/LINE/provider, Production, U2 or Issue closure. CI synthetic merge validation grants no merge authority. Storage hold, pendingTemplate cause, accounting and UAT gaps remain unchanged; publication is not permission to start user testing.

## Effective local control — v46 / TEST knowledge validity

Owner requested replacing the TEST September cutoff with validity until Production release. MP-OD-2026-09-30-V46 supersedes v45 for LOCAL_IMPLEMENTATION, LOCAL_VALIDATION and LOCAL_ANALYSIS only at unchanged local HEAD 86e5c967dd29e669ee0bc66e594fc9636a188c4e. MP06 / Issue12 remains CURRENT / OPEN. Use explicit TEST-only PRE_RELEASE lifecycle, closing on recorded Production release or Owner revocation; no invented calendar date and no Production data approval.

Only V46_ALLOWED_PATHS may change. Preserve exact previous manifest bytes as a historical fixture, all exact customer answers/checksums, dated-record expiry, provenance and fail-closed behavior. Adapt v45 historical test fixture sourcing to its immutable commit without changing assertions, watchdog or cleanup. Preserve all earlier controls, journals, failures, unresolved raw-index drift, storage hold and UAT gaps. Their booleans and receipts are historical, not executable v46 authority.

One necessary Worker fixture compatibility change is allowed: move only the provider-hang test clock from 2026-09-08 to 2026-10-01, after renewed TEST knowledge approval. The complete Worker file must equal its immutable baseline or that exact one-literal transformation; every other byte/assertion/deadline/retry is frozen. Final evidence requires the aligned candidate and focused/full Worker PASS. Historical seals and the initial failure remain preserved.

No commit, push, new or updated PR, Ready, merge, deploy, remote TEST/storage/SQL/LINE/provider, Production, U2 or Issue closure. Prior v45 COMMIT/PUSH permissions are suspended for this package. Keep baseline HEAD and index unchanged; current-source local results do not qualify or publish it. Production release requires a separate reviewed transition that ends this TEST validity and approves Production data and operations independently.

## Effective inspector control — v45 / existing Draft PR20 only

Owner explicitly approved extending the current local Git inspector to batch immutable reads on 2026-09-30. MP-OD-2026-09-30-V45 supersedes published v43 directly and replaces unpublished v44; v44 was never committed or published. Its helper-only child-process experiment passed locally but was 5.41% slower in the observed comparison, so it was rejected, not sealed or qualified. The external 12-file v44 draft snapshot preserves its exact bytes; it is not a Git ancestor or acceptance evidence.

Only current inspectV23Repository immutable Git-read batching, src/project-control-git-batch.ts and direct regressions are newly editable, alongside the minimal V45_ALLOWED_PATHS control transition. Keep main tests/project-control.test.ts exact S bytes, every historical assertion, path/blob/hash/history/ancestry/index/provenance check, operator/isolation/awaited-cleanup proof, 5000ms and zero retries. No cache across invocations, mutable-state read reuse, skipped observation, moved watchdog work or acceptance downgrade. Freeze older inspector modules, snapshots, runtime, workflows/parallelism and dependencies.

Baseline remains published S=d0f63188c50da6e204a4ecc1e91bed97f5ec44eb, MP06 base M=a05bab89bc6d5cdf2914581ed658be86dd00b062; read-only reconciliation confirms PR20 OPEN Draft at S, Issues9/12 OPEN and MP06 CURRENT. Measure candidate effects without claiming the historical hosted cause. Seal final current inspector and the two batch files only after review; PENDING seals block COMMIT/PUSH. Exact staged-tree focused checks/review/fresh audit0 precede COMMIT; exact final SHA/tree full local qualification/review/fresh audit0 and fresh <=120-second PR20 readback precede normal same-branch PUSH. Preserve independently authenticated V43 receipt structure inside the V45 envelope; old grants do not execute.

Creation remains CONSUMED, PR19 integration consumed, and PR20 stays Draft. No new PR, Ready, merge, force-push/reset/rebase, deploy, remote TEST/storage/SQL/LINE/provider, Production, U2 or Issue closure. Retain all earlier journals/accounting/holds/UAT gaps and unpublished v44 records below. CI still requires exact PR20 runner/source/synthetic [M,source] identity and source-identical tree, never merge authority.

## Effective repair control — v44 / existing Draft PR20 only

Owner approved measuring and repairing the new Git-harness case, complete requalification and update of existing Draft PR20 on 2026-09-30. MP-OD-2026-09-30-V44 supersedes v43 only for V44_ALLOWED_PATHS. MP06/Issue12 remains CURRENT/OPEN; read-only reconciliation confirms Issue9/Issue12 OPEN, PR20 OPEN Draft at S=d0f63188c50da6e204a4ecc1e91bed97f5ec44eb and MP06 base M=a05bab89bc6d5cdf2914581ed658be86dd00b062. Preserve S as immutable Git history; no new historical snapshot is needed.

Measure and repair only fixture overhead in tests/project-control.test.ts with direct regressions. Preserve every assertion, raw-index proof, operator HEAD/index/worktree guard, isolated mutable child, awaited cleanup, 5000ms watchdog and zero retries. Local paired timings are not the cause of the historical hosted failure. Candidate bytes must be sealed after measurement/review; unsealed or unqualified work cannot publish. All runtime, workflows/parallelism, dependencies, v43/v42 inspectors and sealed fixtures remain frozen.

Only normal follow-up commits and pushes to codex/mp06-harness-v43 updating PR20 into codex/mp-06-guardrailed-ai are conditional. PRE_COMMIT binds exact staged-tree focused checks, candidate harness seal, fresh audit0 and independent review; POST_COMMIT binds full local qualification and fresh audit/review to exact SHA/tree. PUSH also requires independent fresh PR20 OPEN Draft readback at expected published head/base and normal fast-forward. Authenticate actual Git, receipts and GitHub state independently; the pure gate is not provenance. A later source invalidates prior qualification/review.

Creation CONSUMED: no new PR, Ready, merge, force-push/rebase/reset, deploy, remote TEST/storage/SQL/LINE/provider, Production, U2 or Issue closure. PR19 integration stays consumed; journals/accounting/holds/UAT gaps stay unchanged. CI requires actual runner SHA/ref, exact PR20 repository/branches/base, ordered synthetic parents [M,source] and source-identical tree; this grants no merge authority. Prior records below remain immutable history.

## Effective publication control — v43 / one harness Draft PR

Owner approved publishing the qualified local historical harness repair to GitHub and running CI, then explicitly approved the sole dependency exception: undici 7.29.0 to 7.29.1 through miniflare@5.20260811.0-alpha in pnpm-workspace.yaml and pnpm-lock.yaml, for GHSA-3wwx-pv8p-q78v. MP-OD-2026-09-29-V43 supersedes v42 for this exact package. MP06/Issue12 remains CURRENT/OPEN. Read-only reconciliation confirms Issue9/Issue12 OPEN, MP06 at a05bab89bc6d5cdf2914581ed658be86dd00b062 and existing PR16 Draft.

Only codex/mp06-harness-v43 to codex/mp-06-guardrailed-ai in Eak-dev/malispang-lineOA is eligible, with that exact merge as base. Preserve the never-committed qualified v42 overlay using the sealed snapshot and compact overlay patch. Keep its harness, frozen v42 inspector, historical assertions, 5000ms and zero retries unchanged. The v41 PR19 integration grant remains consumed. All old grants, holds, accounting and UAT gaps remain unchanged.

Permit only the 19 exact V43_ALLOWED_PATHS for the inherited v42 package, minimal publication control/CI adapters and the two dependency files. No other dependency, runtime, workflow, credential, bot model or business-policy change. The reviewed minimal dependency pair is hash-sealed in harnessPublicationV43; exact bytes, fresh audit zero at every severity and the applicable qualification receipt are required before publication actions. Hash sealing alone is not qualification or publication.

COMMIT requires a focused-check/review receipt bound to the exact staged tree, prior v42 qualification and fresh zero audit. PUSH_BRANCH and one CREATE_DRAFT_PR require complete local qualification after commit and independent review on the same actual source SHA/tree. Preserve all failed/unknown outcomes; authenticate receipts independently and keep the one-use creation ledger externally. No duplicate PR or blind retry. Existing unchanged workflow runs on the Draft PR event; source push alone does not trigger its MP06 push filter.

CI validates the actual runner SHA/ref, exact open Draft event/repository/branches/base, ordered synthetic parents [base, source] and source-identical tree. A synthetic merge is validation only. No Ready, merge, default-branch action, deploy, remote TEST, storage/SQL, LINE/provider call, Production, U2 or Issue closure is authorized. A new source commit requires fresh qualification/review; old receipts cannot authorize it. All prior records below remain preserved historical evidence.

## Effective local control — v42 / historical harness repair

Owner approved “อนุมัติซ่อมชุดทดสอบเฉพาะ local” on 2026-09-29, including the necessary control transition, following the local harness repair proposal. MP-OD-2026-09-29-V42 supersedes v41 only for local diagnosis, implementation and validation of historical fixture setup and cleanup in the exact V42_ALLOWED_PATHS. MP-06 / Issue12 remains CURRENT and OPEN. Read-only reconciliation observed Issue9/Issue12 OPEN and MP06 at the exact baseline below; publication of this successor is not authorized.

The baseline is actual PR19 merge a05bab89bc6d5cdf2914581ed658be86dd00b062, with parents 35b67ab87ecd052ab80f450d766c9eabd2991861 and b1ab0d6ce86487c324df291235d53e86ca5da66e, tree 7d3ede2902d545092300171faa83fa403f5d3e1e. V41's single integration grant is CONSUMED; its unchanged historical record cannot authorize another commit, push, PR or merge. This package is an uncommitted local overlay with HEAD fixed at that merge. Current authority comes only from validated v42.

Measure the expensive setup phase before changing it. Preserve every historical assertion, commit/path/hash check, isolated mutable fixture, cleanup and operator guard, the failing case's 5000ms watchdog and zero retries. Allowed changes are the specific test harness/helper/regression paths, minimal control/schema/dispatcher wiring and append-only evidence. Frozen inspectors v38/v39/v40/v41, runtime, workflows, dependencies, model, policy and secrets remain unchanged. Full required local gates and focused positive/negative/cleanup evidence are required; local success is not hosted CI qualification.

No commit, push, publication, PR/Ready/merge, deployment, remote TEST, SQL/storage, LINE/provider call, permission change, Production access or Issue closure. Historical one-use grants, journals, counters, accounting, storage hold and UAT gaps remain unchanged. No U2 request follows this package. Report measured root cause, exact delta and limitations before any separately authorized publication package. All earlier records below remain historical evidence.

## Effective integration control — v41 / MP-06 policy publication only

Owner approved option 1 of the scoped integration plan on 2026-09-29, after the plan explicitly listed local control/CI changes, commit, source push, one Draft PR, exact-source CI and independent review, and one ordinary merge into codex/mp-06-guardrailed-ai. MP-OD-2026-09-29-V41 supersedes the local-only action selector of v40 for this package only. MP-06 / Issue12 remains CURRENT and OPEN. No general publication, deployment or runtime authority is granted.

The actual Git parent is local v39 07ce10f641ebaa74ceab83c98e8f5fdc40d6858b. Qualified v40 was never committed: its 14-path working-tree snapshot is retained under tests/fixtures/mp06-v40-qualified/snapshot.json with a compiled SHA256 seal. The integration validator compares inherited manifests and append-only records against that snapshot and the pinned Git lineage. It must not invent a v40 ancestor or reinterpret its historical COMMIT=false as permission. Frozen v38/v39/v40 modules and the pure policy evaluator stay unchanged.

Only source branch codex/test-policy-v40 to pinned MP06 base35b67ab87ecd052ab80f450d766c9eabd2991861 in Eak-dev/malispang-lineOA is eligible. Source qualification binds parent/tree/diff before commit and the actual SHA after commit. Published source, current PR head, successful CI source and independently reviewed source must match before Ready or the single ordinary merge; use expected-head checking. Record the actual PR number and grant consumption externally once GitHub returns them. No duplicate creation, blind retry of an unknown outcome, stale review inheritance or base-drift auto-rebase is permitted.

Structural validation of source, synthetic merge or merged history is not evidence of live GitHub approval. The action gate needs independently observed exact receipts; a caller-supplied approval boolean or local PASS cannot substitute for them. PR16's downstream synthetic merge may be validated read-only but PR16 must remain Draft and cannot be merged by this package. Stop integration for scope/base drift or unresolved review findings.

Every current-head Ready/merge receipt must also include the independently verified POST_COMMIT local qualification receipt for that same source SHA. A later source commit requires new local qualification and independent review bound to its tree/diff; neither initial Draft creation nor newer hosted CI can inherit an earlier local result.

For CI synthetic merges, authoritative identity is the runner GITHUB_SHA/GITHUB_REF plus actual Git HEAD, ordered base/source parents and exact source tree, with the pinned event repository/branches/base. The optional PR-event merge_commit_sha is asynchronous metadata, not that identity proof: absent/null or a well-formed different SHA does not replace or veto the required tuple. Malformed metadata still fails closed. CI36485083070 demonstrated a metadata mismatch while every required tuple check matched. This adapter correction grants no action or real integration approval; actual merge receipts, same-head qualification/CI/review and the single-merge ledger remain mandatory.

No Production, default-branch merge, deploy, activation, LINE/provider call, SQL/storage observation, permission/credential change, denied-action replay, grant/history/accounting reset or Issue closure. Storage/claims/Registry remain NOT_OBSERVED and pending-template cause UNKNOWN; UAT gaps remain. Publication of policy is not permission to execute the historical denied action and does not make TEST ready for U2. Existing independent MP07 scope is unchanged.

All preceding local selectors and original audit records below are preserved as historical evidence. Resolve current authority by validated version and exact action evidence, not by choosing an old heading or flag. The integration grant expires upon its one completed merge/handoff or Owner revocation/replacement; it cannot start another package.

## Local authority entrypoint — v40 / CONTROL_REPAIR_ONLY

Owner approved TEST policy revision 3 on 2026-09-28: “อนุมัติที่คุณร่างและปรับแก้ได้เลย เพื่อสามารถทำงานต่อได้”. Decision MP-OD-2026-09-28-V40 authorizes only isolated local control/policy/schema/validator/tests and evidence documentation in V40_ALLOWED_PATHS. The permitted action selector is LOCAL_IMPLEMENTATION, LOCAL_VALIDATION, LOCAL_ANALYSIS. It does not authorize commit, push, GitHub/Notion publication, PR, merge, deployment, runtime changes, remote TEST, Production or Issue closure. The scope expires when this local repair is handed off, or is revoked/replaced; it cannot bootstrap additional packages.

Published MP-06 control remains 2026.09.24-v37 at 35b67ab87ecd052ab80f450d766c9eabd2991861. This isolated candidate inherits local v39 commit 07ce10f641ebaa74ceab83c98e8f5fdc40d6858b, with v38/v39 preserved as local history, not retrospectively published authority. The technical overlay supersedes v39 only here; the exact published-v37 adoption/change mapping is in docs/project/CONTROL_REPAIR_V40_TH.md. No change is made to another checkout or MP-07's separately approved package.

Read the validated `summarizeProjectAuthority` output from the control CLI for this checkout's single local authority summary. It distinguishes published control, inherited local control, frozen runtime, observed evidence HEAD and unobserved deployed state. Historical root authorization/status fields and headings below are audit evidence, not independent current action selectors. The summary is not a permission broker, proof of external access, or UAT readiness. Invalid or conflicting control fails closed.

Historical denials, one-use grants, counters, journals, accounting and UAT gaps remain immutable. Support Case 15724958 provided no procedure to reopen the historical review; there is no asserted pending release. No replay, fresh denial, SQL, permission change, transport bypass or pendingTemplate reset is authorized. The storage hold and unexplained retained state remain separate blockers, not a ban on independent approved local work.

### Historical index — preserved original records below

- v39: local policy revision 2, inherited but not published on MP-06.
- v38: local readiness mandate, not remote execution authority.
- v37: published MP-06 integration baseline.
- v36 and earlier: preserved historical controls, grant usage and acceptance evidence.

The following original text is intentionally retained byte-for-byte. Resolve current scope by versioned validation above, never by selecting the most permissive historical heading or flag.

## Current effective control — v39 / TEST operation policy revision 2

Owner explicitly approved implementing the nine-part revised TEST operation policy on 2026-09-24. MP-OD-2026-09-24-V39 supersedes v38 only for local policy/control/schema/validator/tests and documentation, local commit and GitHub/Notion evidence reconciliation. Baseline is 7c9e08ade55494892af4ae2fd6708134f78329d5. MP-06 / Issue #12 remains CURRENT. See docs/project/TEST_OPERATION_POLICY_TH.md for the approved rules and retained boundaries.

Distinguish routine work from retry, and proven non-execution from completed, failed-with-effects, unknown, in-flight and safety-denied outcomes. Three total attempts apply only to a harmless browser preparation/selection incident, not the lifetime of a task. Counter/history cannot reset through task/tool/session changes. No blind replay after unknown side-effectful outcomes; no tool-denial workaround. SELECT alone does not prove the whole request has no business side effects. Continue independent authorized local work while reporting the exact blocked action, evidence, responsible party and resumption condition.

This is a LOCAL policy/control implementation stage, not remote permission: no push, PR, merge, deploy, activation, LINE/provider request, Storage query, Production, reset/rebase/force-push or Issue closure. The pure policy evaluator issues no external authority and is not an executor or persistent retry ledger. Preserve all v38-and-earlier manifests, grants, counters, journals, accounting and unresolved UAT evidence against the Git baseline. Historical sections below are retained evidence, not competing current action selectors. The storage hold is unchanged and is neither released nor broadened to unrelated work by this decision. Local policy acceptance is not user-test readiness.

## Current effective control — v38 / MP06 TEST readiness

Owner approved project-scoped development, configuration and testing toward user UAT on มะลิปัง TEST, then explicitly approved executing the complete plan. This supersedes v37's completed DevOps-only scope. MP-06 / Issue #12 remains CURRENT. The first executable stage is local remediation and UAT-contract qualification; remote execution remains fail-closed pending exact candidate, environment, state, rollback and tool-permission gates. No repeated broad Owner approval is required for local implementation in the exact v38 path set.

The v38 inspector compares inherited manifests and append-only evidence to commit35b67ab87ecd052ab80f450d766c9eabd2991861. Existing journals, consumed grants, accounting and historical UAT gaps are not replacement authority. Historical sections below remain evidence, not the effective action selector. Production, reset, rebase, force-push, merge and Issue closure remain forbidden. The storage-review hold is not released by this Owner mandate. The current local stage cannot deploy, activate, send LINE messages, or query the held storage action. A validated control transition is not proof of user-test readiness.

## Current effective control — v37 / existing PR18 integration into MP-06

Owner chose option 1 and approved proceeding on 2026-09-24: integrate only existing PR18 from codex/dev-operations-v33 into codex/mp-06-guardrailed-ai at pinned base 1508782a9cbf9412b3a6967264e9f4e8d6c19376. MP-OD-2026-09-24-V37 supersedes v36 only for commit/push, exact-PR review, Ready, and one ordinary merge commit after complete exact-source CI and independent findings review. PR16 remains Draft; its automatic CI synchronization is review-only, not default-branch merge permission. Preserve v36/v35/v34/v33/v32 records, consumed PR18 creation, all grants/journals/holds, MP-06 UAT gaps and frozen runtime. The DevOps history ends at the reviewed PR18 source; future feature edits require a separate explicit MP-06 work-package transition. No new PR, squash, rebase, force-push, default merge, deploy, remote TEST, Production, Issue closure or MP-07.

Greptile's exact-head P1 is an action gate: branch/base ancestry and a green PR CI adapter are not Ready or merge permission. Immediately before either action, independently fetch live PR18, hosted CI and review from GitHub, verify that current PR head, successful CI commit, independent reviewed commit and merge API `expected_head_sha` are the **same full SHA**, that no priority finding remains unresolved, and that the base is still pinned. Pass only that closed evidence tuple to `evaluateProjectAction`; absent or mismatched evidence must deny the action. A review of an earlier SHA is never inherited by a later commit. After merge, compare the merge's second parent to this exact reviewed SHA and retain the evidence outside the source commit for audit. The local repository inspector proves history/tree structure, not live review provenance.

## Current effective control — v36 / local Dev Operations efficiency

Owner explicitly approved MP-OD-2026-09-24-V36 / 2026.09.24-v36 in response to the targeted control-transition question. Supersedes v35 only for LOCAL_DEV_OPERATIONS_EFFICIENCY_ONLY from baseline 90aa98305105377d006c67f40259297273db3849. Keep the exact v33 paths and V35_V34_V33_V32_GRANTS_JOURNALS_HOLDS_UNCHANGED. Optimize repeated local Git observations, verified system Git startup and fixed control-validation execution with source-bound evidence and compact output. NO_COMMIT_PUSH_NEW_PR_READY_MERGE_DEPLOY_RUNTIME_TEST_PRODUCTION_ISSUE_CLOSE. Preserve consumed PR18 creation and all source/index/dirty-state checks and test criteria. Synthetic fixture commits are test setup only. Timing/output-byte measurements do not certify billing savings.

## Current effective control — v35 / existing Draft PR18 P1 remediation

Owner approved MP-OD-2026-09-23-V35 / 2026.09.23-v35, superseding v34 only for the three confirmed P1 findings in existing Draft PR18: consumed creation authority, stable checkpoint capture, and pre-validation receipt source binding. Creation grant CONSUMED, exact PR18 only. Retain the v33 path allowlist and all inherited grants/journals/holds. Require negative regressions, full isolated validation and exact-SHA CI/findings-only re-review. No new PR, Ready, merge, reset, rebase, force-push, workflow/credential/runtime edits, remote TEST, deploy, Production or Issue closure. Historical v34 is not fresh creation authority.

## Current effective control — v34 / one Draft Dev Operations review

Roadmap 2026.09.23-v34 / MP-OD-2026-09-23-V34 supersedes v33 only for one Draft PR from codex/dev-operations-v33 to codex/mp-06-guardrailed-ai at base 1508782a9cbf9412b3a6967264e9f4e8d6c19376, hosted CI and findings-only Greptile review. Owner explicitly approved this transition. Exact v33 allowed paths and inherited grants/journals/holds remain unchanged. No workflow edit, credentials, runtime, remote TEST, Ready, merge, deploy, Production or Issue closure. Validate exact source history and synthetic integration separately; local proof does not confer deployment authority.

## Current effective control — v33 / local Dev Operations tooling

Roadmap 2026.09.23-v33 / MP-OD-2026-09-23-V33 supersedes 2026.09.21-v32 only for LOCAL_DEV_OPERATIONS_TOOLING_ONLY_INHERITING_V32. Owner approved the exact Dev Operations work package and the additional closed-schema/validator/test/Owner-record paths on 2026-09-23, then explicitly added tsconfig.json and eslint.config.js for lint integration. Base HEAD is 1508782a9cbf9412b3a6967264e9f4e8d6c19376 on isolated branch codex/dev-operations-v33. The canonical work remains MP-06 / Issue #12 / WP8F / TEST_ONLY; this ancillary local tooling does not advance MP-06 or authorize any customer, remote TEST, Production, runtime, PR, merge, deployment or Issue closure action. All v32 runtime/artifact grants, journals and holds remain unchanged. Exact allowed paths and negative gates are sealed in current-work.json and the v33 validator. GitHub Roadmap #9 receives a reconciliation receipt after local validation; prior content stays intact.

## Current effective control — v30 / PR15 CI hard timeout 20 minutes

Roadmap2026.09.20-v31 supersedes v30 only for the Owner-authorized PR15 P1 handoff-close remediation and the evidenced15-second watchdog on seven exact Git-fixture control tests. The runtime contract permits an older close receipt to reconcile and acknowledge after a newer handoff generation starts while preserving the newer active handoff, retained operation, generation fencing and one-close/no-automatic-retry limits. Authorized remediation paths are tests/project-control.test.ts, worker/durable-objects.ts, worker-tests/durable-state.test.ts and worker-tests/mp-06-pilot-control.test.ts. The20-minute workflow, source-head/synthetic-merge separation, checks, runtime artifact/grants/journals/holds and Draft review-only posture remain unchanged. No rebase, force-push, Ready transition, duplicate Greptile review, merge, deploy, remote TEST, Production, grant/journal reset, Data Studio hold release, issue closure or MP07.

## Current effective control — v29 / PR15 CI repair

Roadmap2026.09.20-v29 supersedes v28 for the Owner-approved existing Draft PR15 review and exact sealed CI repair. Source-head history remains merge-free and fully sealed; synthetic merge integration tests remain mandatory. Ten control paths plus the exact ci.yml digest in wp8fV29PrCi only. All prior runtime/artifact/grants/journals/holds remain unchanged. No rebase, force-push, merge, deploy, Production, issue closure or MP07. Earlier current headings are immutable history.

## Current effective control — v28 / repository-scoped Greptile reviewer

Roadmap2026.09.20-v28 / MP-OD-2026-09-20-V28 supersedes 2026.09.20-v27 under OWNER_GREPTILE_INDEPENDENT_REVIEWER_REQUEST_2026_09_20. This is REPOSITORY_SCOPED_INDEPENDENT_GREPTILE_REVIEWER_CONTROL_ONLY_INHERITING_V27 for Eak-dev/malispang-lineOA. It authorizes only greptile.json with SHA-256 5b5f370f52925022378f5112e4ecd63b4a050a40cc5ac40b06f95a65d1754d61 in addition to the ten exact control paths.

The reviewer is FINDINGS_ONLY_NO_EDIT_APPROVE_OR_MERGE with PR_OPENED_ONLY_NO_PUSH_REBASE_OR_DRAFT, strictness2, Logic+Syntax only, SUMMARY_CONFIDENCE_ISSUE_TABLE_ON_SEQUENCE_DIAGRAM_OFF_COMMENTS_NO_DESCRIPTION_REWRITE. AUTO_APPROVE_AUTO_FIX_AUTO_MERGE_GREPTILE_CODEX_PLUGIN_GRELOOP_OFF_NOT_REQUIRED_CHECK. Scope is EXACT_REPOSITORY_ONLY_AUTO_ENABLE_NEW_REPOSITORIES_OFF_NO_CROSS_REPOSITORY_CONTEXT. No PR creation or Draft→Ready transition; review only an existing independently authorized PR.

Preserve EXACT_V27_RUNTIME_ARTIFACT_GRANTS_JOURNALS_PENDING_TEMPLATE_AND_DATA_STUDIO_HOLD_UNCHANGED. No Production, deploy, grant change, Data Studio hold release, merge, Issue closure or MP-07. Auto-enable new repositories OFF. Production NO_GO — NOT TOUCHED.

## Historical current control — v27 / exact provider-hang test-only seal

Roadmap2026.09.20-v27 / MP-OD-2026-09-20-V27 supersedes v26 under Owner-adopted Issue12 PO review section12. Earlier current headings are immutable history. Seal only provider-hang diagnostic7ad01bf623e0c6b74df579e2a39b6f94040023c3 and correction74d893dc2a7d1db13e1c4553c4a2d1e3e3914341 in worker-tests/mp-06-pilot-control.test.ts, with their exact parents/blobs/file/diff/counts/commit inventories compiled in wp8fV27ProviderHangSeal. All twelve candidate-to-HEAD/history paths must be accounted for before projecting the immutable v26/v25/v23 layers; future edits, additional paths, runtime/config/dependency/workflow/artifact drift and self-attestation remain denied.

Preserve runtime1790da58635edcee154b60d76730248e8130c2d3 / artifactadc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657/252715bytes, original hang fault/assertions/5000ms watchdog, original grants/journals and all live-state/CI gates. Bounded causal evidence supports the test-only target-deadline barrier; HISTORICAL_RUN_CAUSALITY_NOT_ESTABLISHED_NO_GREEN_RUN_WAIVER remains for35469493106. No new remote authority or replacement grant. Current scope is local diagnostic/control/validation only; Data Studio hold and retained pendingTemplate=null/T-C01 mismatch remain independent blockers. No state repair, SQL, credential/TEST action, U2, PR/merge/closure/MP07 or Production. Exact final-head CI/full gates required; a seal is not deployment approval or live readiness. Production NO_GO — NOT TOUCHED.

## Current effective control — v26 / PO-2026-09-20-01

Roadmap2026.09.20-v26 / MP-OD-2026-09-20-V26 supersedes2026.09.12-v25 under the Owner-adopted six-stage handoff in Issue12. MP-06 / WP8F_TEST_ACCEPTANCE_COMPLETION / TEST_ONLY remains current. Earlier “Current” headings below are immutable historical records, not the effective version. No Production query/mutation, PR/merge/issue closure or MP07.

The control-only repair seals only existing workflow .github/workflows/ci.yml timeout30→10minutes introduced by29efa9507604793a925f61cb81d8474c3a0983ad with sole parent0797acb37cec63fe56f0abd81cfd2b6ec50f8add. The later85800fea checkpoint is not the workflow patch. Exact parent/result/diff/numstat/blob and five-path commit inventory are compiled in wp8fV26WorkflowSeal; all original v23/v24/v25 records, ten writable control paths and Worker-test seals remain. Require complete12-path candidate/history inventories, immutable workflow history, current/working bytes, raw-index stability and process-local re-inspected Git proof. No wildcard, future edit-and-restore or evidence/self-attestation exception. Workflow is sealed evidence, not a new generic writable control path.

Keep frozen runtime1790da58635edcee154b60d76730248e8130c2d3 and artifactadc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657/252715bytes, original grants/journals/operation/session/retained Owner/account/Worker and caps unchanged. Existing scoped control watchdogs30s/60s and CI job10minutes remain; Owner permits15/20minutes only when bounded healthy execution requires it and the resulting exact workflow patch receives its own versioned seal. No global/Worker timeout or assertion change.

Execution order: (1) finish control/regressions/review, (2) exact-final-HEAD full CI and distinct provider-hang35469493106 resolution/disposition, (3) actual authentication/artifact/storage readiness, (4) fresh<=120second original one-use TEST deploy and postverification/evidence push, (5) current Owner availability/fixed activation/U2→U3→STOP→U4, (6) OFF/STOPPED and zero pending/reserved/in-flight with acceptance matrix. Independent source/log diagnosis is allowed during control/CI; independent readiness can proceed after CI, but all required gates and case-specific provider-hang disposition precede deploy. A different residual or later green CI does not waive that case.

Control-only validation uses no live credentials. Once that stage passes, inherited exact-item/default-profile encrypted credential use/refresh/persistence remains conditional on original authority and supported tool review; stage restrictions are not permanent revocations or new grants. Data Studio safety-review hold remains separate, with no browser retry or alternate-channel bypass. Reuse reviewed helper/source/hash/inputs and original artifact evidence only when verified; offline results do not prove actual authentication, and NOT_OBSERVED/UNKNOWN are not EMPTY/PASS. No Owner U2 before verified post-deploy/activation and current availability. Preserve U1 GAP/A1-A3 UNRESOLVED/billingUNKNOWN. Maximum60minutes and10minute silence stop remain. Report genuine new scope/risk/permission deltas together, not routine reapproval. Checkpoint substantive changes with explicit paths/#9/#12 and clean synchronized HEAD; no empty pin/evidence loops. Production NO_GO — NOT TOUCHED.

## Current v23 — sealed control-only instrumentation addendum

Roadmap2026.09.11-v23 / MP-OD-2026-09-11-V23 supersedes v22 solely to represent the already approved timing instrumentation. All v22 runtime, TEST target, operation/session identifiers, fresh-state/containment gates, limits and prohibitions are inherited unchanged. No mint/reset/reissue grants: use the original wp8fV22OperationJournal and preserve its full history; no v23 remote grant or journal exists. Deployment/activation/STOP remain0/1 until their authorized starts, never inferred from this document. Ephemeral TEST_ADMIN_KEY conditions remain unchanged.

The only post-candidate test exception is commit3fd4fdb184cda134f05c6effb22a7c4046094556, worker-tests/mp-06-pilot-control.test.ts,53 additions/0 removals. Candidate-file SHA2564498bc3159bb496a76632f7f6908f1d9a71b4dd5b7fb594d3b863a76f5b615ae, instrumented-file SHA256dd3b6f206660d2bfab570086b088df069b9263d074cb1dce79ea6280a3166f6c, exact path-diff SHA256173978931b60cb1721c82bc4d1c3f2f238eeb0ba28cf278cf3cf3f9861bd0d88. Only the existing ten control paths may be edited for this transition. No future edit, additional test/runtime/configuration/dependency/workflow/artifact drift or path omission is authorized.

The Node-only control inspector reads real local Git objects, complete candidate-to-HEAD and historical path inventories, sealed commit ancestry/parent/blobs/diff/numstat, HEAD and working-file bytes. It does not accept a supplied Git reader or self-reported digest. Only an inspector-created process-local proof can satisfy the action-specific exception; JSON/current-work/copied evidence cannot. The assessor re-inspects that checkout, requires clean state, matching evidence HEAD and complete path inventory. This is local provenance only, not a remote verifier, CI approval, signed capability or distributed lock. Independent candidate/control CI, exact artifact and fresh TEST gates remain mandatory. General control validation may inspect dirty allowlisted control work; that state cannot authorize deployment.

Frozen runtime1790da58635edcee154b60d76730248e8130c2d3 / artifactadc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657 remain unchanged. Residual hosted flake is ROOT_CAUSE_UNRESOLVED / RESIDUAL_HOSTED_CI_FLAKE — ACCEPTED_FOR_CONTROLLED_TEST_ONLY, not Production reliability acceptance. Primary U1 GAP and A1–A3 UNRESOLVED/AUDIT_RETENTION_RECONCILIATION_GAP remain unchanged. No Production, new PR/merge/closure/MP07, automatic rollback, replacement grant/session or acceptance downgrade. Issue12 OPEN; Production NO_GO — NOT TOUCHED.

## Historical v22 — exact TEST deployment and retained-Owner successor UAT only

Roadmap2026.09.10-v22 / MP-OD-2026-09-10-V22 supersedes v21. MP-06/Issue12/WP8F/TEST_ONLY. Approved baseline7faf727e36d13f5f83be4c904522ef0fa494ce1b, frozen candidate1790da58635edcee154b60d76730248e8130c2d3, minified index.js252715bytes/SHA256adc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657. Only ten control paths may change. No runtime/dependency/config/model/prompt/policy change. Current authority is wp8fV22Authorization, with independent append-only wp8fV22OperationJournal grants for one exact TEST deploy and one fixed successor activation. Historical v21 journal and its consumed grants remain unchanged, not reusable.

Deploy only malispang-lineoa-test/accountc395a1bc15b7c95267173de5ccd6407d/OAมะลิปัง TEST after candidate/control CI, exact artifact and independently refreshed120second state gates. Preserve6/6/34082/0, pending/inflight0, OwnerBOT_ACTIVE/T-C01/clarificationUsedtrue, closeCOMPLETE/gen1/technical1, validEXPIRED_PURGED and6DELIVEREDclaims. No state repair to make gates pass. One command only; rejected/unknown outcome consumes its grant. Post-deploy verify zero retained-state/ledger/claim/outbound delta and V22 marker still absent, then push evidence before activation. Owner must be currently available; use only fixed continue-acceptance-v22 operation/body. No handoff-close is included.

U2→U3→authenticatedSTOP→U4 only, one Owner-mobile message at a time with backend/visible/claim/settlement proof. Max60minutes, stop10minutes silence or safety failure, no replacement. Primary AI-ON U1 remains GAP and must not be repeated/reset; A1–A3 remain UNRESOLVED/AUDIT_RETENTION_RECONCILIATION_GAP under Owner's TEST-only continuation decision, not PASS/EXPLAINED. Preserve cumulativeUSD5/200events/200attempts and history/clarification. AI OFF is not global LINE-egress disable; Owner silence/no probes/immediate delta verification are compensating gates. No cross-DO atomicity or exactly-once external delivery claim.

No rollback/PR/merge/Issue closure/MP07 or Production query/action in v22, even if historical v21 completion gates pass. Prior PR14 is INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW. End OFF/STOPPED with zero reserved/inflight/pending. Every checkpoint explicit-path commit/push and #9/#12 receipt; incomplete work WIP — NOT_DEPLOYABLE. No amend/squash/rebase/reset/stash/force. Issue12 OPEN; Production NO_GO — NOT TOUCHED. Current operation usage is derived from the v22 journal, initially deployment0/1 and activation0/1; this is not remote-state evidence.

## Historical v21 — frozen successor TEST completion and conditional integration

Roadmap 2026.09.10-v21 / MP-OD-2026-09-10-V21 supersedes the executable v19 control. The separately approved v20 was never materialized; it does not provide a second grant for the superseded c59 candidate. Owner execution directives are Issue #12 comments5611740903/5611756729 and Roadmap #9 comments5611740789/5611756596, reconciled from baseline47934a41aeebea9cf17a1cf3d3b98819179b4b97. Current work remains MP-06 / Issue #12 / WP8F / TEST_ONLY. Production readiness and controlled rollout belong to MP-12 / Issue #5, not this acceptance.

Frozen successor source bfff1a553868b85e5f66144e4741a51627f4a9be, minified index.js SHA-256 8eabcc6a1628bfa776fa5768db49e2faa586ceaaaa6915510afec74835f2d2b5, exact existing Worker malispang-lineoa-test. Candidate hosted CI34436364217 succeeded on this exact SHA;767/767 tests, frozen install/build, audit0 at every severity and byte-stable protected artifacts. Two isolated clean checkouts reproduced the same bundle, with a third dry-run on the exact candidate confirming it. Runtime/dependencies/configuration are now read-only. This control-only descendant is not a different runtime candidate.

Owner conditionally authorizes one exact TEST deployment after independently verified candidate, control CI, fresh active triplet, schema/legacy inventory, accounting and containment gates; then one logical Owner handoff-close with at most3 technical attempts under the same durable operation key, at most1 mutation; then one atomic/idempotent continuation and one-at-a-time Owner-mobile UAT. Handoff generation, stable receipt and registry reconciliation must be verified separately; no transaction spans the Conversation DO and Registry DO. HUMAN_HANDOFF is the final conversational UAT case. Stop on safety failure; finish AI OFF / pilot STOPPED, pending/reserved/in-flight0, no new attempts after stop or late replies. Preserve cumulative USD5/200events/200attempts, rate/concurrency, model/prompt/policy and all historical state.

The closed successor envelope is current authority. Legacy v18/v19 envelopes remain frozen history only. A pure control assessment is not a signed capability, remote verifier, distributed lock or proof that an operation happened. Independent evidence is mandatory; current-work cannot approve itself. Append/push each operation-start receipt before its one prepared invocation, retain ambiguous/rejected outcomes as consumed, and never remove/rewrite the operation journal. The CLI checks the journal against full committed manifest history. Same-key handoff attempts must be recorded and reconciled; a completed close cannot authorize a later handoff generation or another logical close.

Compatible fenced-state recovery, UAT, kill switch, full final security/release review and exact release CI must pass before a new remediation PR; reviewed fresh head/base/required checks must pass before merge; actual integration/post-merge verification and the unchanged acceptance matrix must pass before Issue #12 closure. No automatic rollback to old unfenced runtimes, reset/refund, reply retry, broad conversation reset, history deletion, new resources, secret/PII exposure, Production access or MP-07 start. Owner PR #14 remains INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW and is not release/TEST acceptance.

Current grants have no recorded execution: deployment0/1, close0 logical/0 technical, continuation0/1. These are authorization counters, not freshly observed TEST state. Update the append-only operation journal and evidence at each start/checkpoint. Issue #12 remains OPEN until the conditional closure gate actually passes.

## Historical v19 — exact deployment preparation, not execution

Roadmap2026.09.09-v19 / MP-OD-2026-09-09-V19 supersedes v18 from Owner-approved baseline ca4904ef3f316f8e381e57e4757f3fe173dbeb1f, the README-only child of previous evidence42026b22069e4299dfc8ff5f73b5077e3b0856fb. MP-06 / Issue12 / WP8F / TEST_ONLY. The Owner explicitly authorizes only the ten control paths, affected validation, exact-candidate local artifact reproduction, TEST-only read-only observations and containment preparation. Current authority is wp8fExactDeploymentPreparation; wp8fExecutionEnvelope remains the immutable historical v18 record, not reusable runtime/dependency write permission.

INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW: Owner merged PR #14 at2026-09-09T02:40:20Z into default codex/phase-1a-foundation, merge aad8c5e0ef41c5e47df3d93ae462b9122368c15d. Both parents and GitHub merge metadata confirm the entire feature history, including runtime c59, was integrated; not only README. This is not TEST/Production deployment, completed TEST acceptance, final security/release review or Production approval. Historical statements below about no integration/default drift describe their original time only and are superseded by this correction. No additional PR/merge or default-branch operation is authorized.

Exact future grant: c59eb5e12bb96a34da38759a5585be67d8c2ab6e / index.js SHA-2562203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308 / malispang-lineoa-test, APPROVED_UNUSED,0/1. Legacy executable deployment flags stay false. Current-round remote execution is forbidden even if readiness passes. No upload/create-version/traffic change; stop for Owner confirmation to execute. Ambiguous outcome consumes the operation without retry or reset. No candidate/current-work self-authorization or Production permission.

Require independent fresh exact TEST identity/triplet/traffic/accounting/schema/claim/conversation evidence, reproducible frozen candidate and independent containment, not health alone. Failure matrix and preparation evidence belong to docs/project/EXECUTION_GATES.md. Unknowns remain UNKNOWN; no remote mutation to pass a gate. Original control64d598183ea55c3b79e3f27aa9f9992bc318ac27 is the candidate ancestor; v19 is a later control-only descendant. All sessions/LINE/recovery/rollback/PR/merge/Issue closure/MP-07 and Production query/change remain denied. Issue12 OPEN; Production NO_GO — NOT TOUCHED.

## Historical v18 — local-only delivery fencing

Owner approved the four-advisory dependency remediation and existing mixed staff/redemption precedence only. This is an expansion of the still-uncommitted v18 addendum, not a rewrite of v17. worker/mp-06-wp1.ts may recognize the existing explicit staff and reward-redemption semantics before preorder/draft, with order/spacing/punctuation, no-draft-mutation, no-provider, duplicate and safe F1/F2 regressions in the existing test allowlist. No new broad keyword/intent rule or routing.ts change. The only additional files are package.json, pnpm-workspace.yaml and pnpm-lock.yaml for sharp0.35.2 to0.35.4, js-yaml4.3.1 to4.3.2, and vitest/@vitest/mocker4.1.10 to4.1.11 under the four recorded advisory findings (two high/two moderate). Only the exact miniflare@5.20260811.0-alpha>sharp override to0.35.4 and @eslint/eslintrc@3.3.6>js-yaml resolution to4.3.2 within the existing ^4.3.0 range are permitted, with affected native/matching Vitest transitive resolutions; no new direct dependency, major/parent upgrade, peer conflict, patch/fork, force, broad update, registry/toolchain/build-policy/workspace change or audit suppression. Generate the lockfile with pinned pnpm11.19.0; inspect full before/after graph, native loading, real Worker/SQLite, frozen empty-store clean checkout and artifact reproducibility. Any baseline audit mismatch, residual scoped advisory or required unapproved dependency change stops for Owner. No deploy, session, remote recovery, rollback or PR in v18; no LINE or Production action. All prior delivery, accounting, policy, history and acceptance constraints remain.

Explicit Owner follow-up confirms worker/index.ts solely for real-claim propagation, pre-send event/owner/revision checks and fenced ACK on its three existing conversation callers, including the existing draft outbound wrapper. No DraftOrderDO method/schema/lifecycle changes, fabricated or optional claim, reply-token ownership or new runtime path. Failed/ambiguous LINE dispatch retains the claim without retry. This permission does not authorize deployment or another session; see the appended v18 Owner decision.

Roadmap 2026.09.09-v18 / MP-OD-2026-09-09-V18 supersedes 2026.09.08-v17 from 3db7738da3edc3da265ebb623190de03a629c0ff. MP-06 / Issue #12 / WP8F / TEST_ONLY. Owner explicitly approved v18 local atomic delivery ownership and fenced acknowledgement, superseding v17 operational execution for this round. No deploy, session, remote recovery, rollback or PR in v18. Stop at exact candidate/recovery-plan handoff for separate TEST deployment approval.

The same ten control paths and existing evidence path apply. Retain all six pre-existing working changes. The only additional test path is worker-tests/durable-state.test.ts: use real processEvent claim tokens for the three acknowledgement callers; suppress both previously RESPONDing undelivered replays; reject wrong/stale/missing tokens, require idempotent identical ACK and no re-grant after ACK. Preserve handoff/routing/policy/history/isolation assertions; no optional token, overload/default token, constant-token shortcut or compatibility bypass.

worker/durable-objects.ts additionally permits only processEvent atomic delivery ownership, markDelivered acknowledgement fencing, necessary additive claim storage/schema and SELECT-only delivery evidence. Existing v17 precedence and v16 continuation implementation/regressions remain local scope, not remote activation authority. No other runtime file/component/method expansion. Canonical verified webhookEventId is the deduplication key, never reply token. One winning persistent event/owner/revision claim, no duplicate/concurrent outbound dispatch. No-message events need no claim. Acknowledgement requires the exact claim; forged/stale/reordered/missing ACKs cannot mark another/current owner delivered. Identical ACK is idempotent.

Promise/transaction boundaries do not encompass LINE: only at-most-one outbound dispatch attempt, never exactly-once delivery. Crash, timeout, network error, non-2xx or uncertain outcome retains CLAIMED/DELIVERY_UNKNOWN; no automatic retry/reassignment by lease, alarm, restart or time. Recovery requires separately approved audited operator action; no recovery mechanism or reset in this round. No raw reply tokens, secrets, customer text or PII in logs/evidence. Additive schema compatibility must be demonstrated; rollback safety cannot be inferred from schema compatibility or old smoke.

Retain mandatory risk/staff precedence before draft/AI; only the two exact unresolved legacy reasons remain exceptions. Preserve F1/F2 approved price39, deterministic draft intake/history, zero provider/accounting increments on mandatory/duplicate paths, frozen bot gpt-5.6-terra/model/prompt/policy/catalog/threshold/timeout/provider-retry and cumulative limits. Reported TEST baseline remains STOPPED/AI OFF, events/attempts6/6, consumed/reserved34082/0, in-flight0, HUMAN_HANDOFF; no new remote observation is asserted here. Historical billing UNKNOWN; no accounting reset/refund.

Before candidate commit/push require real Worker/SQLite signed duplicate race, fencing/restart/failure regressions, all original tests, full Node/benchmark/Worker suites, formatting/lint/typecheck/build, all validators/frozen hashes, secret scan/audit/diff review and isolated empty-store/frozen-lockfile clean-checkout verification. Explicit paths only; validated control commit automatically becomes the local authoritative baseline, not deployment approval. Issue #12 OPEN. Production NO_GO — NOT TOUCHED; no query/mutation, merge/closure/MP-07, new resources, secret permissions, business/LINE settings or acceptance downgrade.

## Historical v17 — superseded operational authorization

Roadmap 2026.09.08-v17 / MP-OD-2026-09-08-V17 supersedes 2026.09.08-v16 from 7ed6bd927b786634bcadcaf9c0cdd6b64f1a1037. MP-06 / Issue #12 / WP8F / TEST_ONLY. This clarifies precedence only; the v16 eight executable paths (including worker/durable-objects.ts), ten control paths and existing evidence path remain exact. No new deployment target, budget, session, recovery, rollback, PR or Production permission.

Known risk/authority/explicit staff and deterministic WP1 STAFF_ONLY must preempt draft interception and AI admission/reservation/provider construction. Provider calls, attempts, reservations and consumed-cost increments must be zero. Preserve active draft/history; approved deterministic reply/handoff and duplicate-delivery contract remain mandatory. Protected risk and policy-integrity failure fail closed.

Only NO_AUTHORITATIVE_ANSWER and AMBIGUOUS_CUSTOMER_TEXT are unresolved legacy interpretation exceptions, not business authorization. Unknown handoff reasons remain mandatory/fail closed; handoff:true alone is not the security predicate. Existing deterministic WP1/advisory interpretation must retain final deterministic authority and approved knowledge only. F1 T-C01/pending and F2 approved catalog AUTO price39/BOT_ACTIVE/pending-clear must work with AI ON and OFF; unresolved or stale/missing/conflicting knowledge must fail closed. ADVANCE_ORDER remains deterministic consent/draft intake with no provider, real order, stock reservation or payment; normal draft input remains unchanged while mandatory risk preempts it without consuming that input.

The unchanged pre-deploy triplet is 8486019d-9b62-4de9-ae15-6299909a23d9 / 8a5b6547b4713ff50ad6b08ee58682e129641b6a / 15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64. Fresh independent exact TEST identity, STOPPED/OPERATOR_STOP/AI OFF, events/attempts6/6, consumed/reserved34082/0, pending/in-flight0 and preserved accounting are required. Exact candidate must descend from validated v17 control, be committed/pushed, reviewed, fully validated, clean-checkout and artifact reproduced. One TEST candidate deployment only after gates; post-deploy diagnostics and isolated synthetic no-provider precedence evidence precede Owner interaction.

The one already-granted immutable v16 continuation is not replenished by v17: at most60minutes, cumulative USD5/200events/200attempts, existing rate/concurrency/Owner controls, immutable original activation/history, atomic exact-state/idempotent replay, no extension/reopen/third activation/reset/refund. At most3 audited exact Owner handoff closes and targeted F4, F5, then F6 after explicit stop; stop on failure. Conditional compatible rollback once to83fab7f1-646a-4ed8-be4d-a5f38df3a072/f986a478bc980f9e53748ed49cedd543f54cd64a and exact candidate redeploy remain gated by UAT/kill switch. Draft PR remains gated by complete TEST acceptance/final review.

No model gpt-5.6-terra, prompt/policy/catalog/threshold/timeout/retry/business/LINE change, new resource, broad reset, history deletion, secret/PII exposure, acceptance downgrade, Production query/mutation/deploy, merge, Issue closure or MP-07. Issue #12 stays OPEN. Production NO_GO — NOT TOUCHED. A validated explicit v17 transition commit becomes authoritative automatically; this records authorization, not runtime/security/UAT acceptance.

## Historical v16 — superseded precedence contract

Roadmap 2026.09.08-v16, decision MP-OD-2026-09-08-V16, supersedes v15. Baseline a1e0ca03f88e0d17e3627c5bd8cd7dfedf386cb0; MP-06 / Issue #12 / WP8F / TEST_ONLY. Exact eight-path runtime/test remediation allowlist plus one evidence path are in wp8fExecutionEnvelope. worker/durable-objects.ts is authorized only for one atomic/idempotent continuation and immutable SELECT-only lineage. Preserve every original activation marker, audit, attempt and ledger record.

Known deterministic HIGH_RISK, sensitive data, STAFF_ONLY or handoff decisions must win before admission/reservation/provider construction: zero provider calls/attempts/cost increment, approved deterministic reply once. Required signed-webhook and real SQLite tests preserve safe AUTO/CLARIFY, duplicates, failures, lifecycle and privacy. No model/prompt/policy/catalog/threshold/timeout/retry/business/LINE changes.

The only pre-deploy triplet is 8486019d-9b62-4de9-ae15-6299909a23d9 / 8a5b6547b4713ff50ad6b08ee58682e129641b6a / 15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64. Independently verify fresh exact TEST identity, STOPPED / OPERATOR_STOP / AI OFF, events/attempts6/6, consumed/reserved34082/0, pending/in-flight0; candidate must be committed/pushed descendant of validated v16 control, exact-diff reviewed, fully validated and clean-checkout artifact reproduced. One candidate TEST deployment only after gates. No manifest self-authorization or alias/wildcard.

Then one continuation, at most60minutes, preserves cumulative USD5/200events/200attempts and rate/concurrency/Owner controls. Atomic exact-state activation, immutable additional marker/lineage, no replay extension/reopen/third activation, no accounting reset/refund. Existing audited exact Owner handoff-close at most3 times: before targeted F4, F5, F6. Owner sends one case at a time; stop on failure. F6 follows explicit AI OFF/pilot stop. Conditional compatible rollback/redeploy only after UAT/kill-switch; draft PR only after full TEST acceptance/final review. No Production query/mutation, merge, Issue closure, MP-07, new remote resources or destructive migration. Validated control commit becomes authoritative automatically; authorization is not deployment/UAT evidence.

## Historical v15 — exact diagnostics follow-up

Roadmap `2026.09.08-v15`, decision `MP-OD-2026-09-08-V15`, supersedes v14. Accepted evidence baseline `fb9458e995a44a0233c3746fd506198f2f1805c7`; MP-06 / Issue #12 / WP8F / TEST_ONLY. Only D1 SELECT-only EXPIRED_PURGED invariants and D2 immutable session-lineage observation corrections are authorized in the four existing diagnostics paths. No draft normalization, cleanup, new recovery mechanism or accounting change. State observation and activation eligibility are distinct; neither grants activation/dispatch/reply/recovery authority.

The only follow-up pre-deployment observation is version `5e04ec6f-f225-4a45-b9f1-6908bc79596c`, source `946876eb94daecbb90eed24c2f4b8834a63447a2`, artifact `eab12622a248b115ffce0b2cd1915a61171a0afe104265f38b924eccec7a933b` together. Independently verify this fresh exact TEST triplet and STOPPED/AI OFF/reserved0/in-flight0/accounting preservation. Candidate must descend from the verified v15 control commit, be validated/committed/pushed, exact-diff reviewed and artifact-reproduced in a clean checkout. Current-work cannot supply remote evidence or self-authorize. The old 83fab7f1/f986a478 pair is rollback-only, never substitute pre-deployment evidence.

One successor TEST deployment after all candidate gates; then readiness before the existing single cumulative Owner-mobile UAT session. Existing UAT/kill-switch/conditional rollback/redeploy/review/draft-PR gates and original acceptance remain unchanged. No Production query/mutation, merge, Issue closure, MP-07, model/prompt/policy/threshold/timeout/retry/business/LINE change, reset/refund, audit/history deletion or broader recovery. The validated explicit v15 transition commit becomes authoritative automatically, without further baseline approval. Authorization is not acceptance or deployment evidence.

## Historical v14 — explicit Owner control transition

Roadmap `2026.09.08-v14` supersedes v13 under `MP-OD-2026-09-08-V14`. Baseline `a4ff8298ff75b077d333b6336d115886cf2907d3`; MP-06 / Issue #12 / WP8F_TEST_ACCEPTANCE_COMPLETION / TEST_ONLY. The preserved 12-line Owner decision and subsequent explicit ten-file control approval authorize this transition. Historical v12/v13 deployment/acceptance plans remain frozen snapshots, not reusable grants. Current authority is `wp8fExecutionEnvelope`.

The envelope fixes ten control paths, four diagnostics paths and reviewed patch SHA-256 `6d8535040f455f2bbbe8f6e80f3c851fe9c726b95854b9948f17f9c62fbacdf0`. No wildcard, traversal/alias normalization, generic implementation or unknown-action allowance. Materialize, validate and explicit commit/push diagnostics; deployment to `malispang-lineoa-test` requires independently collected exact source/artifact, validation, clean-checkout, committed/pushed ancestry and fresh TEST identity/STOPPED/AI OFF/reserved0/in-flight0 evidence. The pure control decision does not itself collect or authenticate those observations; operators must verify them through approved tools. current-work fields cannot substitute for evidence or Owner approval. Never deploy from the transition/evidence SHA by implication.

After readiness/accounting pass, only existing audited exact Owner conversation recovery and one cumulative Owner-mobile UAT session are authorized. Preserve 25,864 conservative unknown + 1,960 reported usage = 27,824 historical control consumption; billing stays UNKNOWN. No accounting reset/refund, new recovery mechanism or replacement session. Existing explicit stop is authorized for containment; legacy GET paths with hidden mutation are not. TEST_ADMIN_KEY may only use previously approved exact Keychain-to-memory-to-exact-TEST-HTTPS authentication, never logs/files/redirects.

UAT and kill switch must pass before one compatible TEST rollback to `83fab7f1-646a-4ed8-be4d-a5f38df3a072` / `f986a478bc980f9e53748ed49cedd543f54cd64a`, then one exact candidate redeploy. Current schema/storage/accounting/configuration/secret/containment compatibility must be proved; do not assume it from old smoke evidence. Draft PR requires complete TEST acceptance, rollback, same-source final security review and integration checks, not test count or deployment alone. Keep the system STOPPED/AI OFF at each handoff.

Production query/mutation/deployment, merge, Issue closure, MP-07, model/prompt/policy/threshold/timeout/retry/business/catalog/LINE changes, secret/PII exposure and acceptance reductions remain forbidden. v14 is authorization only; no UAT, deployment or release PASS is asserted.

## Historical v13 exact candidate approval — superseded

Roadmap `2026.09.08-v13` supersedes v12 under the Owner's explicit approval of candidate `f986a478bc980f9e53748ed49cedd543f54cd64a`. MP-06 / Issue #12 remains WP8F TEST acceptance completion. Verified local/remote baseline `2b379570c830e1f2099ad88efdb998b05e36bd6c` is clean. Only this immutable candidate and minified artifact `f93807109b7d700f79a7b7b90979659ac285be8420e74fb809cc6900d78adec2` may be deployed once to `malispang-lineoa-test`, with persisted pilot STOPPED and accounting unchanged. Authorization is not deployment occurrence. Deploy from the exact ancestor candidate, not from the later control/evidence commit.

One already-approved cumulative Owner-mobile UAT session remains limited to 60 minutes, USD 5 / 200 events / 200 attempts including the existing 3/3 and 27,824 micro-USD. No replacement session or accounting reset. Stop on failure; final AI off/pilot STOPPED. A new rollback rehearsal requires separate approval of the exact reviewed recovery plan. All PR creation, including draft PR, is now forbidden pending final security/release review; this supersedes v12's conditional draft permission. No model/prompt/policy/threshold/timeout/configuration/secret changes, Production access, merge, Issue closure or MP-07.

The machine-readable `wp8fTestAcceptancePlan` remains the historical v12 baseline; `wp8fApprovedDeployment` is the narrower current approval. Operational occurrence/version and UAT results belong to timestamped evidence, not pre-deployment authorization flags. On completion or a clear blocker, hand off to Owner for GPT-6 Astra / High final security and release review.

## Historical v12 authorization — superseded by v13 above

MP-06 (GitHub #12), Roadmap `2026.09.08-v12` supersedes v11 under Owner authorization to complete existing acceptance. Phase `WP8F_TEST_ACCEPTANCE_COMPLETION`, status `AUTHORIZED_TEST_ACCEPTANCE_COMPLETION_WP8F_ONLY`, action `TEST_ACCEPTANCE_COMPLETION_WP8F`.

Baseline: `3ab8957e9c0e81b9a5dff95c6008f30e0c9d3fcd` on `codex/mp-06-guardrailed-ai`. Current exact TEST deployed source `c8b0d8246058c5de4991bec369e91cfe2a609a4d`, version `5835b91b-7b0d-4708-a71b-6c31473adcae`. WP8E one-case provider/settlement/LINE evidence passed; this does not close full UAT. TEST is STOPPED / AI admission off, cumulative events/attempts 3/3, consumed/reserved 27,824/0 micro-USD, in-flight 0. Historical conservative consumed is 25,864; current successful reported-usage cost is 1,960; historical actual billing remains UNKNOWN.

Allowed: acceptance matrix, one cumulative TEST UAT session (maximum 60 minutes), Owner-sent cases one at a time, existing-safety evidence verification, proven acceptance-blocker bug fixes with regressions, local validation, explicit commit/push/evidence, GitHub #9/#12 reconciliation. Draft PR is allowed only after TEST acceptance is verified complete. Deployment of new source and any new rollback rehearsal require Owner approval of exact reviewed candidate/target and recovery plan. Do not open a replacement session, reset accounting, change model/prompt/policy/thresholds/timeouts, permissions, channel settings or resources. Production remains NO_GO, Issue #12 OPEN, MP-07 blocked, merge/force-push/ready PR forbidden.

The v11 authorization snapshot remains frozen under `wp8eExactStateReconciliationControlledRetestPlan`; its pre-execution fields are historical and superseded for current operational state by `wp8fTestAcceptancePlan` and the WP8E operational report. Prior Issue #9/#12 body sections marked current v4 are stale relative to newer evidence comments and are to be explicitly reconciled while preserving historical evidence and acceptance criteria.

See [WP8F acceptance matrix/runbook](docs/line-oa/mp-06/MP_06_WP8F_TEST_ACCEPTANCE_TH.md), [WP8E evidence](docs/line-oa/mp-06/MP_06_WP8E_EXACT_RECONCILIATION_CONTROLLED_RETEST_TH.md), [execution gates](docs/project/EXECUTION_GATES.md), [Owner decision log](docs/project/OWNER_DECISION_LOG.md), and machine-readable current-work/schema. All prior policy, benchmark, knowledge/catalog and WP7 hashes remain frozen. Default-branch drift remains a recorded integration gap and must not be corrected by merge/rebase in this round.

## Historical v11 authorization snapshot — superseded

The following text records the state at v11 authorization, before WP8E execution. Current state and permissions are the v12 snapshot above; prior operational claims here are historical only.

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) ปัจจุบัน TEST ยัง AI off / pilot stopped และอนุญาต WP8E เฉพาะ exact-state reconciliation, exact TEST candidate deployment, no-network lifecycle self-test และ conditional controlled retest หนึ่งข้อความจาก Owner

### v11 authorization snapshot

| Field                 | Value                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| Roadmap               | `MP-ROADMAP` / GitHub #9                                                   |
| Version               | `2026.09.08-v11`                                                           |
| Current               | `MP-06 (GitHub #12)`                                                       |
| Current phase         | `WP8E_EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST`                        |
| Current authorization | `AUTHORIZED_EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E_ONLY`        |
| Current action        | `EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E`                        |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 gates                          |
| Verified baseline     | `d15b3f0fd794a5a08c0251a88a0a663a23d1141b`                                 |
| Verified candidate    | `d15b3f0fd794a5a08c0251a88a0a663a23d1141b`                                 |
| Implementation branch | `codex/mp-06-guardrailed-ai`                                               |
| Target                | exact existing `TEST_ONLY` Worker                                          |
| TEST readiness        | `AUTHORIZED_FOR_EXACT_RECONCILIATION_AND_ONE_CONDITIONAL_RETEST`           |
| TEST deployment       | Historical occurrence retained; exact WP8E candidate deployment authorized |
| Production            | `NO_GO`                                                                    |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น WP8E เปิดเฉพาะ exact session/attempt reconciliation ที่ authenticated, TEST-only, atomic และ idempotent; deploy candidate ที่ commit/push และตรวจแล้วขณะ AI off/pilot stopped; no-network lifecycle self-test ใน Durable Object แยก; และเมื่อทุก gate ผ่านจึงเปิด session ใหม่หนึ่งครั้งเพื่อรับ Owner LINE event หนึ่งข้อความ ห้าม probe/retry เพิ่ม Model/prompt/schema, deterministic evaluator/policy, KB/catalog และ benchmark evidenceยัง read-only

หลักฐานที่ยืนยันได้ของ attempt เดิมคือ event ถูก admit, budget/attempt ถูก reserve, dispatch ถูก authorize, session หยุดแบบ fail closed, reservation `12,932` micro-USD ยังคงถูกถือไว้ และไม่มี AI reply ที่ได้รับอนุญาต สิ่งที่ยังยืนยันไม่ได้คือ provider ได้รับ request หรือไม่, response/error/usage เป็นอะไร และ settlement RPC เริ่มหรือจบหรือไม่ จึงห้ามสรุปว่า provider ล้มเหลวหรือคืน reservation เป็นศูนย์

WP8B candidate `25b0bc9…` แก้ defect ที่ fetch/body promise อาจไม่ settle จน code ไม่ถึง settlement โดยเพิ่ม application deadline, late-result suppression, idempotent conservative reconciliation primitive และ aggregate diagnostics แต่ไม่ได้ persist phase ก่อน settlement WP8C remote attempt ที่สองจึงเหลือหลักฐานเพียง dispatch authorization และ `latestLifecyclePresent=false`; ข้อเท็จจริงนี้ยังไม่พิสูจน์ว่า fetch เริ่มหรือ OpenAI ได้รับ request และ local regression เพียงอย่างเดียวไม่ยืนยัน root cause ของ remote failure

สถานะ remote ล่าสุดที่ตรึงไว้คือ session `STOPPED`, AI off, 2 admitted events, 2 provider attempts, consumed `12,932`, reserved `12,932` micro-USD, in-flight 1 และ actual usage `UNKNOWN` WP8E อนุญาต reconciliation ของ attempt ที่ระบุด้วย safe session/attempt target references เท่านั้น ไม่อนุญาตการอ้าง counters `2/2` เพียงอย่างเดียว การเปลี่ยนต้อง consume reservation ที่เหลือแบบ conservative จน consumed `25,864`, reserved 0, in-flight 0, attempt เป็น terminal `USAGE_UNKNOWN`, session ยัง `STOPPED` และ actual usage ยัง `UNKNOWN`; ห้าม refund, ลบ audit หรืออ้างเป็น actual billed usage

WP1–WP4 ผ่าน local deterministic validation แล้ว และ WP2 artifacts ถูก commit ที่ `12e0d27dc06052f5f9a2075aff8f12c90bf5852e` Dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` และ remediated PASS result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` ถูกตรึงไว้ WP5 แก้ timeout แบบ non-semantic ที่ `98f6bc0843e376de9932acad767fb463932514cc` และ pin/enforce Node.js `24.19.0` กับ pnpm `11.19.0` ที่ `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`; clean-checkout reproducibility ผ่าน จึงบันทึก local verdict เป็น `PASS_WITH_LIMITATIONS`

WP6 assessment ที่ commit `76d1e1302c31a35ab49e565b231cf63100e27fb6` ให้ verdict `TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS`; commit `0ad0ee261eb1f270f8a81c5874d0118768244d53` ตรึงรายการ condition, control commit `96a5a2271969b1cc1d23cdbf1afe457fa0f6808b` อนุญาตการปิด condition และ implementation commit `688c1fbd75358429b7161f41de3ef706696595e4` ปิดครบทั้งสี่ โดยตรึง TEST-only non-secret controls, rollback/runbook, synthetic fixtures และ validation-chain idempotence ผลคือ `WP6_TEST_READINESS_CONDITIONS_CLOSED` และ readiness `READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION`; ไม่ใช่ deployment authorization

Active benchmark contract คือ dedicated process, hook watchdog `300_000` ms และ test-specific watchdog `15_000` ms สองจุด โดยเป็น execution safety limits ไม่ใช่ product performance guarantee ค่าสูงสุดที่สังเกตได้ระหว่าง remediation คือ 260.20 วินาที เทียบ acceptance ceiling 270 วินาที จึงเหลือ margin 9.80 วินาทีและห้ามนำผลจากเครื่องนี้ไปใช้เป็น CI performance guarantee

WP7 control commit `3722dcce68ca48412b0fc6e4a41e8fcaa1b77b70`, implementation commit `d14aa95d8ed95bcc967233d6cda252a2f61f1cd6` และ safe credential-error follow-up `796b1c2775ede01e98f5eb34314e8719b815e868` ผ่าน mock/full/clean-checkout validation แล้ว Synthetic live evaluation ใช้ 60 cases / 100 requests: structured schema 100%, risky/authority fail-closed 100%, final routing 98%, required-field extraction 100%, false final-AUTO/unsupported claim/PII leakage/prompt-injection override 0; semantic checksum `7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55`

Issue #12 ยังเปิด: candidate เคย deploy ไป TEST และ rollback rehearsal ผ่าน แต่ delegated LINE UAT ถูกหยุดจาก unresolved provider attempt; pilot/AI ปิดอยู่, PR/default-branch integration ยังไม่เกิด และ Production ยังเป็น `NO_GO`

Historical condition-closure verdict `WP6_TEST_READINESS_CONDITIONS_CLOSED` หมายถึง operator/readiness artifacts ปิดครบตาม scope เดิมเท่านั้น ไม่ได้พิสูจน์ runtime enforcement WP8 gate B พบว่า `runtimeRateLimiterPresent=false` และไม่มี shared tester/session/rate coordinator จึงแก้ readiness เป็น blocked จน WP8A ผ่าน ห้ามตีความ historical readiness ว่า deployed, Production ready หรือ go-live

GitHub default branch ยังชี้ฐาน Phase 1A ซึ่งล้าหลังกว่า verified latest baseline ข้อนี้ถูกบันทึกเป็น `DEFAULT_BRANCH_DRIFT` แบบ known/non-blocking เพราะใช้ dedicated MP-06 branch จาก transition commit ที่ Owner อนุมัติแล้ว ห้ามตีความว่า default branch เป็นฐานล่าสุด

## Machine-readable controls

- `config/project/roadmap.json`: version, canonical `MP-01`–`MP-12` mapping, current/next state, deployment posture และ verified baseline
- `config/project/current-work.json`: ขอบเขตและ authorization ของงานเดียวที่ทำได้ในขณะนี้
- JSON Schemas: ปิด unknown root fields และกำหนดรูปแบบเอกสาร
- `scripts/validate-project-control.mjs`: ตรวจ cross-file invariants และ fail closed
- `tests/project-control.test.ts`: regression สำหรับ stale/missing/conflicting state, immutable GitHub mapping และ authorization drift

## Source-of-truth precedence

1. Owner decision ที่บันทึกแบบ append-only ใน repository
2. machine-readable Roadmap version ล่าสุด
3. current-work manifest
4. MP-ROADMAP (GitHub #9) และ authorized Issue
5. Phase documents/manifests
6. chat/memory ใช้เป็น context เท่านั้น

ข้อมูลขัดกันหรือพิสูจน์ latest version ไม่ได้ = `ROADMAP_UNVERIFIED` และห้ามแก้ไฟล์, deploy หรือเปลี่ยน external system

## Roadmap change protocol

1. Owner/PO อนุมัติการเปลี่ยนแปลงโดยระบุ canonical ID, GitHub Issue และ scope
2. append decision ใน `docs/project/OWNER_DECISION_LOG.md`; ห้ามแก้หรือลบรายการเดิม
3. bump Roadmap version และระบุ `supersedes`
4. อัปเดต Roadmap/current-work พร้อมกัน โดยคง GitHub Issue mapping เดิม
5. reconcile เนื้อหาควบคุมกับ GitHub #9 และ Issue ปัจจุบัน
6. รัน validator, regression suite, secret scan และ `git diff --check`
7. commit/push dedicated branch และให้ Owner/PO review
8. ห้ามเริ่ม next work หรือ deploy จนมี authorization แยก

Roadmap `2026.09.08-v11` อนุญาต `EXACT_STATE_RECONCILIATION_CONTROLLED_RETEST_WP8E`: ต้อง commit/push candidate ก่อน deploy exact TEST, รัน isolated no-network lifecycle self-test ก่อนแตะ pilot accounting, พิสูจน์ attempt เก่า terminal และไม่สามารถ retry/authorize reply จากนั้นจึง reconcile exact attempt หนึ่งครั้งแบบ idempotent และเปิดได้สูงสุดหนึ่ง session/หนึ่ง Owner LINE eventภายใน cumulative WP8 cap เดิม การเปิด sessionไม่ reset accounting; จบรอบต้อง AI off/pilot closed ห้ามสร้าง PR, merge, ปิด Issue #12 หรือแตะ Production

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production

## Current v24 — TEST live UAT enablement control only

Roadmap2026.09.11-v24 / MP-OD-2026-09-11-V24 supersedes2026.09.11-v23. This appended current section supersedes the historical current headings above without rewriting their original decisions. Type TEST_LIVE_UAT_ENABLEMENT_CONTROL_ONLY. Only the ten existing control paths and their three evidence documents may change. Keep exact runtime1790da58635edcee154b60d76730248e8130c2d3 / artifactadc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657, v23 sealed Worker-test digests, exact TEST Worker/OA/account and all v22 operation/session/limits unchanged. No mint/reset/reissue grants or replacement journal; existing deployment/activation/STOP0/1 rights are consumed only by their original authorized operation, and ambiguous outcomes are not reusable.

Owner authorizes control-inspector timing subdivision and up to15000ms watchdog only for the three named control cases after complete phases/no semantic assertion failure. Preserve every original assertion/Git proof/order/parallelism; no retry/skip/incomplete proof/cache bypass. Timings emit fixed phase labels and monotonic milliseconds only, subscribed only in those three cases. Historical cause stays ROOT_CAUSE_UNRESOLVED / ACCEPTED_TEST_ONLY_RESIDUAL, not a Production reliability finding. Existing full reinspection remains mandatory; a copied proof, stale CI, path omission, drift or self-attestation still denies. Deployment requires hosted CI SUCCESS on the exact current v24 evidence HEAD and every inherited independent fresh-state/artifact gate.

Data Studio uses only exact TEST namespace and single visible-name result mp06-pilot-control-v1, one SELECT-only logical observation, at most3 technical selection attempts before any SQL executes. No object list, guessed ID, Owner-reference read or write. Rejected/timeout/unknown SQL or identity/nonunique mismatch stops; no alternative target. Existing authenticated exact-Owner-bound TEST diagnostics may supply Owner claims without reference exposure/enumeration. No schema repair/reset, helper or changed runtime. Ephemeral existing TEST_ADMIN_KEY remains Keychain to short-lived memory only; all logging/credential prohibitions apply.

After full validation/reproduction/exact CI and independently fresh120second TEST gates, perform one original exact deployment, verify and checkpoint zero unexpected state/accounting/claims/provider/LINE delta, then one fixed successor activation and verify retained T-C01/clarificationUsed/history/lineage. Owner alone sends U2, then U3 only after backend/visible proof, then authenticated STOP and Owner U4. All inherited caps/containment remain. Primary U1 GAP, A1–A3 UNRESOLVED, billing UNKNOWN are not controlled TEST deployment blockers and never become PASS. Final review/compatible non-mutating recovery and one consolidated residual acceptance/closure decision follow; no new remote mutation, PR/merge/Issue closure or MP07. Issue12 OPEN; Production NO_GO — NOT TOUCHED.

## Current v25 — complete sealed Worker timing addendum

Roadmap2026.09.12-v25 / MP-OD-2026-09-12-V25 supersedes v24 as a sealed control-only transition under the explicit Owner approval of Issue12 proposal5645975865, baselineaa28c6801c77ba9e71cec3d6e608ffee71cb4276. Earlier current headings describe historical versions. No runtime or Worker-test edit occurs in this transition. It binds the already committed31-addition/0-removal instrumentationce2ef9a9a75044a932d1d96ba2a8c0c633c23f4c in worker-tests/mp-06-pilot-control.test.ts, retaining5000ms, fault, assertions, requests/order and ROOT_CAUSE_UNRESOLVED. Original v23 seal and inherited v24 envelope remain immutable. Complete candidate-to-HEAD/history inventories and both exact sealed commit/parent/blob/diff chains are independently read from Git; no future edit-and-restore, extra path, mutable fixture reference, substituted digest or self-attestation can authorize deployment.

Historical v24 fixture is pinned to046eff1d72edeea539623a9bbe9e006ba241a7ae with compiled SHA256 per path checked before use and after local isolated checkout. Tests preserve historical assertions, prove v24 rejection of the new bytes and v25 acceptance only of the approved chain, prohibit network protocols other than local file clone, cleanup in finally and check operator HEAD/index/working-tree invariance. Negative guard tests mutate isolated stand-ins, never the operator. No operator checkout/reset/restore is authorized.

All ten control paths only; original runtime1790da58635edcee154b60d76730248e8130c2d3/artifactadc5e2e9d465a1426a877400379da81309152dfca66841a9c31d710907546657, TEST account/Worker/OA,120second fresh-state gates, original operations/session/caps and journals remain unchanged. No mint/reset/replace/reissue grants; deployment/activation/STOP stayAPPROVED_UNUSED0/1 until original authorized starts. Exact final control CI SUCCESS, full clean validation and artifact reproduction are prerequisites, not inferred from this text. Rejected/timeout/unknown outcome consumes its invoked grant and stops without retry. U1 GAP, A1–A3 UNRESOLVED, billingUNKNOWN, Issue12 OPEN; no PR/merge/closure or Production. Production NO_GO — NOT TOUCHED.

## MP-OD-2026-09-21-V32 — Greptile push and Draft review trigger

- version: 2026.09.21-v32
- ownerDecision: MP-OD-2026-09-21-V32
- supersedes: 2026.09.20-v31
- type: REPOSITORY_SCOPED_GREPTILE_PUSH_AND_DRAFT_REVIEW_CONTROL_ONLY_INHERITING_V31
- mandate: OWNER_GREPTILE_PUSH_AND_DRAFT_REVIEW_REQUEST_2026_09_21
- repository: Eak-dev/malispang-lineOA
- headBranch: codex/mp-06-guardrailed-ai
- baseBranch: codex/phase-1a-foundation
- mergeCommit: 88deb90a58369923f11a7266ec63fa8fd5f293c2
- mergeParents: aad8c5e0ef41c5e47df3d93ae462b9122368c15d,d41dff3e0eda6e5930d8e2a4d58a952cef2dd57c
- mergeTree: 57259355a0877677e5a88ca0c91fa0cf4f37f2ab
- inheritedBaseMergeCommit: aad8c5e0ef41c5e47df3d93ae462b9122368c15d
- inheritedBaseMergeParents: 30b79f791e276fa5f420d08ffff208a231780281,ca4904ef3f316f8e381e57e4757f3fe173dbeb1f
- inheritedBaseMergeTree: 21b8a8b3f436cfccdd6f7a2ebba82cde8debb5bb
- path: greptile.json
- priorFileSha256: 5b5f370f52925022378f5112e4ecd63b4a050a40cc5ac40b06f95a65d1754d61
- fileSha256: 3cd6a3ab140a230736ac0c2b76f9a75204afc6545a125bf6371468bb69c015b1
- automaticReview: open,push
- reviewDrafts: true
- reviewRebase: false
- dashboard: PR_OPENED_ON_NEW_PUSHES_ON_DRAFT_ON_ALL_OTHER_REVIEW_SETTINGS_UNCHANGED
- repositoryScope: EXACT_REPOSITORY_ONLY_AUTO_ENABLE_NEW_REPOSITORIES_OFF
- automation: AUTO_FIX_AUTO_APPROVE_AUTO_MERGE_OFF
- triggerProof: NEXT_REAL_PUSH_TO_OPEN_DRAFT_PR_EXACT_REVIEWED_SHA_NO_EMPTY_COMMIT
- draftPrAuthority: ONE_DRAFT_PR_EXACT_HEAD_AND_BASE_FOR_TRIGGER_PROOF_NO_READY_OR_MERGE
- inheritedState: V31_RUNTIME_ARTIFACT_GRANTS_JOURNALS_HOLDS_AND_PRODUCTION_NO_GO_UNCHANGED

Owner records the already-completed PR #15 merge as exact immutable history and authorizes one Draft PR with the exact head/base above solely to prove the Greptile push trigger. The repository config successor changes automatic review from open-only to open+push and permits Draft reviews; rebase review remains off. Dashboard values must agree with the repository file, only this repository may be enabled, and auto-enable new repositories stays off. No empty commit, duplicate PR, Ready transition, merge, deploy, remote TEST, Production, application/runtime edit, model change, grant/journal/hold mutation, Issue closure or MP-07 is authorized.
