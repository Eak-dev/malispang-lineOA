# MP-06 v14 — Diagnostics deployment and TEST acceptance gate

## Verdict

**WP8F_TEST_ACCEPTANCE_BLOCKED — diagnostics/control follow-up required.**

The v14 control transition and exact reviewed diagnostics deployment passed. TEST acceptance, Owner UAT, kill-switch acceptance for a new session, rollback rehearsal and final release review did not pass by implication. No new UAT session or provider/LINE request was initiated. Issue #12 remains OPEN; Production **NO_GO — NOT TOUCHED**.

## Authority, source and scope

- Accepted starting baseline: `a4ff8298ff75b077d333b6336d115886cf2907d3`.
- Control: `7ebacf3ea174683f272511589cd3ca4b2b34801c`, Roadmap `2026.09.08-v14`, decision `MP-OD-2026-09-08-V14`, supersedes v13. MP-06 / Issue #12 / WP8F_TEST_ACCEPTANCE_COMPLETION / TEST_ONLY.
- Control commit changed exactly the ten approved paths. The original twelve appended Owner decision lines were retained. All 45 existing control tests remain, with 12 additional negative/contract tests: 57/57 pass. No Worker source changed in that commit.
- Runtime candidate: `946876eb94daecbb90eed24c2f4b8834a63447a2`, parent control commit above. Exactly four files, 575 additive lines: `worker/index.ts`, `worker/durable-objects.ts`, `worker/draft-order-objects.ts`, `worker-tests/mp-06-owner-readiness.test.ts`.
- Reviewed patch SHA-256: `6d8535040f455f2bbbe8f6e80f3c851fe9c726b95854b9948f17f9c62fbacdf0`. Apply-check, reverse-check and all four resulting Git blob IDs matched the reviewed patch. The patch file remains unchanged.
- Minified artifact SHA-256: `eab12622a248b115ffce0b2cd1915a61171a0afe104265f38b924eccec7a933b`, reproduced in the primary and empty-store detached checkouts, matching the historical review artifact.
- Evidence commit containing this document and two additional reproduction tests is **not the deployed source**. Those tests do not change executable Worker source or repair the gaps below.

The execution envelope preserves exact paths, fail-closed validation, independent candidate/state evidence and conditional UAT/rollback/draft-PR gates. It grants neither Production nor Issue closure. No model/prompt/policy/threshold/timeout/retry, dependency/lockfile, business data, binding, secret or LINE setting changed.

## Deployment and live read evidence

Exact target: `malispang-lineoa-test`, masked account `c395…407d`, TEST / มะลิปัง TEST, HTTPS `malispang-lineoa-test.eakkachai-dev.workers.dev`. No Production endpoint or metadata was queried.

1. Before deployment, source `f986a478bc980f9e53748ed49cedd543f54cd64a` / version `83fab7f1-646a-4ed8-be4d-a5f38df3a072` retained 100% traffic. Its source/artifact annotation matched committed evidence.
2. At `2026-09-08T07:35:43.756Z`, the explicitly authorized authenticated POST stop returned `ALREADY_STOPPED`: STOPPED / OPERATOR_STOP, events/attempts 3/3, consumed/reserved 27,824/0, in-flight 0. Review confirms this already-stopped branch reads the ledger without expiry/cleanup/accounting mutation. Legacy GET status/attempt-diagnostics were not called.
3. Exact candidate was validated, committed and pushed; HEAD matched remote and tree was clean. The v14 action gate accepted independently verified candidate/TEST evidence before one explicit minified deployment. No failed deployment or automatic retry occurred.
4. At `2026-09-08T07:38:05.416Z`, active version **`5e04ec6f-f225-4a45-b9f1-6908bc79596c`** had 100% traffic. Version annotations associate exact runtime `946876eb94daecbb90eed24c2f4b8834a63447a2` and artifact above, following the verified local build/upload. Health confirms TEST identity. This association is build/upload plus version metadata evidence, not an independently downloaded remote bundle hash.
5. Four DO classes remain ConversationStateDO, DraftOrderDO, HandoffRegistryDO and PromotionControlDO. All six existing secret names remain present; no values were read back or changed. At `2026-09-08T07:46:10.559Z`, old/current version metadata comparisons found binding identities, non-secret configuration and runtime configuration identical. Secret-value equality was not inspected or claimed.
6. New authenticated GET `/admin/mp06-pilot/owner-uat-readiness` returned HTTP 200/no-store at `2026-09-08T07:38:05.613Z`, receipt `5878c8ad-8da3-43ed-91f4-19b0117f608a`. Final read at `2026-09-08T07:46:51.178Z`, receipt `2145bb5f-1207-441b-951f-b1d57b5ce079`, returned the same safe observation below. Both say `CONVERSATION_RECOVERY_REVIEW_REQUIRED`, not readiness PASS.

Only previously authorized TEST_ADMIN_KEY was retrieved from its exact macOS Keychain service/account into temporary process memory and sent to the verified TEST HTTPS origin with redirects rejected. No value was printed, saved or sent to OpenAI. Each credential-holding process exited. Receipts identify the authenticated admin role, target, UTC time and correlation UUID; they do not identify which human held a shared credential. Historical Observability 403 is not bypassed; no independently retrieved durable remote log trail is claimed.

## Fresh accounting and retained Owner conversation

| Field                                              | Verified observation                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pilot / AI admission                               | STOPPED / OFF; new UAT session NOT_STARTED                                    |
| Cumulative admitted events / provider attempts     | 3 / 3                                                                         |
| Cumulative control consumed / reserved             | 27,824 / 0 micro-USD                                                          |
| In-flight                                          | 0                                                                             |
| Two terminal USAGE_UNKNOWN reservations            | 25,864 micro-USD conservative consumption                                     |
| One SETTLED attempt                                | 1,960 micro-USD reported-usage cost                                           |
| Control equation                                   | 25,864 + 1,960 = 27,824                                                       |
| Independently verified historical provider billing | UNKNOWN                                                                       |
| Retained Owner linkage                             | Unique delivered settled WP8E event joined to single private allowlist member |
| Owner conversation mode / active handoff           | BOT_ACTIVE / 0                                                                |
| Clarification used / pending template              | false / null                                                                  |
| Conversation pending replies                       | 0                                                                             |
| Draft / draft pending replies                      | EXPIRED_PURGED / 0                                                            |

The singleton pilot ledger carries cumulative WP8 accounting across activations. The authoritative budget quantity remains consumed plus reserved; conservative unknown charges are not actual billed usage. Remaining control budget is 4,972,176 micro-USD, 197 events and 197 attempts at the final observation. No reset, refund, reconciliation, recovery mutation, new provider dispatch or synthetic/live LINE message occurred. Old unknown provider receipt/completion/root causes remain UNKNOWN; a later successful attempt does not explain them. Global handoff inventory was not queried anew; the zero here refers to the verified Owner conversation only.

## Proven diagnostics gaps and control conflict

### D1 — Terminal draft is not the same as an active draft

The current route requires `draftContext.state === "NO_DRAFT"`. The observed EXPIRED_PURGED label therefore denies readiness. Existing `transitionDraft` returns unchanged for a terminal, unexpired/no-expiry draft when an ordinary UAT text does not request a new draft. A new real Worker/SQLite regression triggers the actual draft alarm, verifies the purged state, then calls `DraftOrderDO.processText` with F1 text: handled=false, messages=[], no handoff, unchanged business rows. The readiness route still reports recovery-required. This proves a **local false-negative class**, not that the remote aggregate has all the same invariants.

The deployed observation exposes only a state enum and pending count. It does not prove the remote aggregate's expiry, purged-field invariants or purge audit linkage. Do not mark that remote draft safe merely from its label, and do not erase it to satisfy the predicate. Existing handoff-close acts only in HUMAN_HANDOFF; this Owner conversation is BOT_ACTIVE. No existing audited terminal-draft normalization operation was found. No new recovery mechanism or broad reset was introduced.

### D2 — Observation is lost after the already-approved activation

The current pilot observation requires the old STOPPED 3/3 state and joins the settled Owner event through the current session's allowlist. The existing one-shot `resume-acceptance` moves allowlist membership to the new audited session while retaining history and accounting. A second real Worker/SQLite regression activates through the existing authenticated HTTP route, verifies readiness GET returns 409 without changing rows, stops the local session and verifies the read still returns 409. Thus this route cannot currently supply the required post-activation/post-stop evidence. The local regression did not activate remote TEST or consume campaign budget.

### C1 — Follow-up deployment is not represented by the current exact-state gate

`wp8fCandidateGate` requires pre-deployment TEST version `83fab7f1-646a-4ed8-be4d-a5f38df3a072` and source `f986a478bc980f9e53748ed49cedd543f54cd64a`. After the approved deployment, actual TEST is `5e04ec6f-f225-4a45-b9f1-6908bc79596c` / `946876eb94daecbb90eed24c2f4b8834a63447a2`. Even a locally corrected diagnostics candidate cannot satisfy that old-version predicate. This is an execution-envelope/control representation gap for the otherwise Owner-authorized diagnostics follow-up, **not an unexpected remote commit or permission to select a convenient baseline**.

No current-work self-authorization, fabricated old-state evidence, generic allowAll, gate bypass or rollback to make the predicate true was used. The explicit security/control-conflict stop applies before a second deployment or UAT. Original v14 control transition remains committed and accepted; no new baseline approval is being requested for that completed commit.

## Exact follow-up proposal — not executed

Owner/control decision needed: represent a diagnostics follow-up from the **actual exact** version `5e04ec6f-f225-4a45-b9f1-6908bc79596c`, source `946876eb94daecbb90eed24c2f4b8834a63447a2`, artifact `eab12622a248b115ffce0b2cd1915a61171a0afe104265f38b924eccec7a933b`, while retaining v14's original TEST-only rights and conditional rollback target. Do not broaden to arbitrary current versions. Require independently verified ancestry, exact allowed diff, validation, clean checkout, pushed candidate, artifact, fresh STOPPED/zero reservation state, negative tests for all unknown targets and no current-work grant. Any executable fix remains within the four diagnostics files; no bot or accounting mutation is proposed.

The proposed control delta is a closed pre-deployment observation mapping in `src/project-control.ts`, not a wildcard or a current-work field. Keep the existing rollback source/version pair and add only the observed `5e04ec6f-f225-4a45-b9f1-6908bc79596c` / `946876eb94daecbb90eed24c2f4b8834a63447a2` pair with its exact artifact above. Require the pair and artifact together; reject swapped pairs, unknown versions, artifact drift, missing evidence and candidate self-authorization. Preserve every other candidate/TEST/Production/UAT/rollback/PR condition. Add negative tests in `tests/project-control.test.ts` and append the approved resolution in the existing governance files. Do not replace the approved rollback target or treat this proposal as authority to execute a rollback.

Proposed diagnostics corrections to review with regressions before that follow-up deployment:

1. Add SELECT-only safe predicates for an actually purged terminal draft: no pending delivery, no active expiry, no retained customer fields/items, valid purge/audit/state structure. Report only booleans/enums/counts. Use the existing runtime contract to decide non-blocking; malformed/unknown remains denied. Preserve the aggregate, revision, history and accounting. Do not simply allow all terminal labels.
2. Retain exact WP8E Owner provenance across the existing one-shot activation using its immutable previous/current session linkage. Observe cumulative typed ledger and pending attempts without calling cleanup/expiry/mutation helpers. Keep activation eligibility separate from state observation during/after UAT; a read must never authorize activation, dispatch, reply or recovery.
3. Test real storage and HTTP paths for purged versus malformed/active drafts, activation/stop, restart, changed/missing lineage, concurrent observation, no mutation/leak, unknown usage and cumulative ledger agreement. Preserve the original nine negative/security tests.
4. Validate and push the exact successor candidate/artifact, then deploy only after its updated exact-state gate passes. Read readiness again before asking Owner for F1. Do not consume the one permitted UAT session while observability is incomplete.

No new recovery is requested on current evidence; diagnostics may establish that no recovery is necessary. If it instead proves a state requiring a new mechanism, return with exact fields/invariants/audit/containment for separate approval. Rollback cannot be used to bypass C1 because its v14 authorization is conditional on completed UAT/kill-switch gates.

## Validation and reproducibility

- Runtime candidate full `pnpm check`: Node unit 475 + mandatory benchmark 14 + Worker 92 = **581 unique**, failed/skipped/cancelled 0. Nine new diagnostics tests passed.
- Detached checkout of exact runtime SHA: Node 24.19.0, pnpm 11.19.0, empty isolated store, frozen lockfile, 187 packages, reused 0. No `.env`, `.dev.vars` or OPENAI_API_KEY in that checkout/process. Two consecutive full `pnpm check` runs passed the same 581 tests each and ended with tracked tree clean. Benchmark suite observations: primary 25.59s, clean runs 25.16s and 25.94s; not performance guarantees.
- Deterministic report generation twice remained byte-identical, followed by minified artifact reproduction. Formatting, ESLint, both TypeScript projects, build, all validators, TEST dry-runs, secret scan (210 files), dependency audit (no known vulnerabilities) and diff-check passed. No live evaluation was rerun.
- After D1/D2 evidence was discovered, two additive reproduction tests were added without runtime changes or weakened assertions. Full Worker suite **94/94**, including diagnostics **11/11**, passed; lint, typecheck, build, control validator, secret scan and diff-check passed. Current unique inventory is **583** (475 + 14 + 94), while the deployed candidate's complete clean-checkout gate remains 581. These extra tests reproduce gaps; they are not evidence that those gaps have been fixed. Unaffected full Node/benchmark gates were not rerun merely to inflate totals.
- Dependency graph, lockfile, policy/KB/catalog/templates, model/prompt/schema, deterministic dataset/oracle/reports, generated assets/previews and deployment configuration remain unchanged.
- The detached verification worktree and its isolated dependency store were removed after clean verification. No main-worktree files or credentials were removed. The LINE bot model remains `gpt-5.6-terra`; no change followed the Codex model-selection discussion.

Frozen semantic checksums (distinct from file byte hashes):

- Policy: `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`.
- Deterministic dataset: `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`.
- Deterministic result: `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`.
- WP7 prompt: `bb32a123d6671ac2167887ea8ba476bdebe28bc4b1cca23d53b9b6879cc8eeb6`.
- WP7 schema: `811436149e813ce6ece4baade44640c56b48edf5198433822e688c9994319793`.
- WP7 dataset: `cbfb9d6030ded2ab3cb8237233313940f2df206efdd7ac91cc05c948fdcae11b`.
- WP7 result: `7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55`.

Deterministic benchmark remains 5,000 cases / 10,000 evaluator attempts, 3,000/1,000/1,000 buckets, AUTO/risky/authority 100%, false-AUTO/unsupported/leakage 0. Historical WP7 synthetic limitations and billing UNKNOWN remain unchanged.

## Acceptance matrix and rollback status

| Existing criterion or delivery gate                                  | Evidence / revision                                                             | Status             | Remaining work                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| Deterministic and advisory AI safety                                 | Frozen WP2/WP7, unchanged runtime semantics, 946876e regression                 | PASS               | Preserve synthetic limitations                                |
| Exact TEST diagnostics deployment                                    | 946876eb94daecbb90eed24c2f4b8834a63447a2 / 5e04ec6f-f225-4a45-b9f1-6908bc79596c | PASS               | Not acceptance by itself                                      |
| WP8E actual Owner location case                                      | Historical c8b0d824 provider/settlement and Owner LINE evidence                 | PASS               | Reuse, no redundant live probe                                |
| Fresh accounting reconciliation                                      | Two new SELECT-only observations; 25,864 + 1,960                                | PASS               | Actual historical billing UNKNOWN                             |
| Owner identity / handoff / clarification / pending reply observation | New route, retained event and private allowlist                                 | PASS observed      | Does not establish draft eligibility                          |
| Draft readiness and post-activation observation                      | D1/D2, two real Worker regressions                                              | BLOCKED            | Narrow diagnostics corrections plus C1 control gate           |
| F1 ambiguous price / CLARIFY                                         | Frozen T-C01 expectation                                                        | GAP                | Owner mobile message after readiness                          |
| F2 approved catalog price                                            | Frozen approved 39-baht reply/disclaimer                                        | GAP                | Verify F1 context then Owner follow-up                        |
| F3 staff handoff                                                     | Frozen handoff acknowledgement                                                  | GAP                | Owner mobile and backend evidence                             |
| F4 refund/authority request                                          | Frozen STAFF_ONLY                                                               | GAP                | Existing audited exact-conversation recovery if needed        |
| F5 injection/authority spoofing                                      | Frozen STAFF_ONLY                                                               | GAP                | Same recovery and safety gates                                |
| F6 AI-off / kill-switch acceptance                                   | Current STOPPED/no new attempts; no new UAT session                             | GAP                | Required per-case LINE plus timestamped stop evidence         |
| Current rollback/redeploy acceptance                                 | Old/current bindings/config identical; source changes additive reads only       | GAP                | UAT/kill-switch first, then one compatible approved rehearsal |
| Final branch security/release and draft PR/integration               | No PR, no merge                                                                 | BLOCKED            | Complete TEST acceptance before review/PR                     |
| Production                                                           | NO_GO — NOT TOUCHED                                                             | OUTSIDE TEST SCOPE | Separate future Owner decision; no remote inspection          |

Approved conditional rollback remains version `83fab7f1-646a-4ed8-be4d-a5f38df3a072` / source `f986a478bc980f9e53748ed49cedd543f54cd64a`. Schema, storage methods, accounting encoding, bindings and non-secret configuration are unchanged by the additive diagnostics candidate. Nevertheless no rehearsal was performed: UAT/kill-switch gates are open and post-rollback read verification must use a reviewed permitted mechanism. Preserve STOPPED, all history and accounting; no live UAT on the old target, no reset and no automatic repeated redeploy. Production rollback target remains UNKNOWN because Production was not queried; this is not a Production release plan or approval.

At candidate push, branch was 0 behind / 68 ahead of `origin/codex/phase-1a-foundation`, no PR. Evidence push adds its own commit without rebase/merge. Current source/version must be reported separately from the evidence HEAD. Owner must not send another LINE message yet. Issue #12 stays OPEN; no MP-07.
