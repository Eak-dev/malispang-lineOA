## Current v19 — preparation-only exact TEST deployment gates

Roadmap2026.09.09-v19 / MP-OD-2026-09-09-V19. Owner-approved baseline ca4904ef3f316f8e381e57e4757f3fe173dbeb1f; previous evidence42026b22069e4299dfc8ff5f73b5077e3b0856fb; original runtime control64d598183ea55c3b79e3f27aa9f9992bc318ac27; candidatec59eb5e12bb96a34da38759a5585be67d8c2ab6e; index.js SHA-2562203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308. Existing malispang-lineoa-test only. Exact future grant APPROVED_UNUSED0/1; executable deployment remains false. This round ends before the first upload/create-version/change-traffic/deployment call. No session/LINE/recovery/rollback/additional PR/merge/Production query or mutation.

Integration correction: Owner PR #14 merged the full feature history at2026-09-09T02:40:20Z into aad8c5e0ef41c5e47df3d93ae462b9122368c15d on codex/phase-1a-foundation. INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW, not acceptance/release/deployment. The authorized local fast-forward to ca4904ef preserved all ten unstaged control files byte-identically: before/after git diff --binary --full-index --no-ext-diff SHA-2562b0b219fb0cde6bd60174f8b9ec8eb80fe04167c2fe117c08d14fdb56a29fc99. README is clean and identical to origin. No merge commit, reset, rebase, overwrite or stash was performed. Later v19 edits reconcile the new baseline and event explicitly; they do not alter the frozen runtime or merged history.

The immutable v18 envelope below is historical; its runtime/dependency paths are not writable under v19. Only ten approved control paths may change. Do not deploy from the later v19/evidence checkout. Control/schema/roadmap tests, validators, formatting, control typecheck and secret scan must pass; existing exact733/733 candidate evidence is reused only after no-deploy-affecting diff proof. Reproduce the artifact locally from the exact clean candidate and frozen lockfile. Read actual TEST state only through reviewed read-only interfaces. Missing schema/claim/egress evidence is a gap, not zero or PASS.

Before a later Owner-confirmed execution, require fresh independently verified exact8486019d-9b62-4de9-ae15-6299909a23d9 /8a5b6547b4713ff50ad6b08ee58682e129641b6a /15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64 at100%, unchanged bindings/secrets/config, AI OFF/STOPPED,6/6,34082/0,in-flight/pending attempts0, exact Owner HUMAN_HANDOFF and no pending delivery claim. Preserve all ledger/history. Prepare independent containment and the seven required failure branches without automatic unfenced rollback. Unknown remote outcome consumes the operation permanently pending a new Owner decision; no retry, counter reset or implicit renewed grant. Readiness evaluation is a pure check of externally verified evidence, not a remote proof collector, dispatch lock or activation capability.

### v19 preparation evidence — 2026-09-09

Current verdict: **READINESS_BLOCKED — required schema/delivery observation unavailable; independent all-webhook containment not verified.** Do not label this READY_FOR_EXACT_TEST_DEPLOYMENT or substitute UNKNOWN with zero. The baseline/PR reconciliation and artifact gates below passed; they do not resolve the remaining observations. No remote-mutating deployment call has run. Grant APPROVED_UNUSED, usage0/1; no new session, Owner LINE, recovery, rollback/revert or additional PR/merge. Issue12 remains OPEN. Production NO_GO — NOT TOUCHED (not queried).

#### Source, integration and validation

- v19 control958b00eea5587d27858d3bdee1047ee52c0a736f, parent ca4904ef3f316f8e381e57e4757f3fe173dbeb1f, committed/pushed with exactly the ten approved paths. Local=origin and clean verified after push. No runtime, dependency, Worker configuration or asset edit. Original Owner-decision prefix and every historical wp* plan/envelope are byte/field-identical to the approved baseline.
- Original control64d598183ea55c3b79e3f27aa9f9992bc318ac27 → runtimec59eb5e12bb96a34da38759a5585be67d8c2ab6e → evidence4650b199b96990fce2350bc72be73ab709fab9e6 → evidence42026b22069e4299dfc8ff5f73b5077e3b0856fb → READMEca4904ef → v19 control958b00ee. All required ancestry checks passed. v19 is deliberately a later control descendant, not falsely claimed as the frozen runtime's ancestor.
- The original20 changed paths from3db7738da3edc3da265ebb623190de03a629c0ff through4650b199 match the committed report: ten control paths, nine runtime/test/dependency paths, one evidence report. README is the separately approved21st historical path, not a new runtime change or v19 write permission. Candidate→current v19 differs only in ten control paths, README and the original evidence report.
- Owner PR14 metadata reports merged at2026-09-09T02:40:20Z, head ca4904ef, base codex/phase-1a-foundation and merge aad8c5e0ef41c5e47df3d93ae462b9122368c15d. Its parents are30b79f791e276fa5f420d08ffff208a231780281 and ca4904ef. Candidate→default merge changes only README and the evidence report, so the merge includes the full runtime history without changing its executable inputs. INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW; no review/UAT/release/Production acceptance is inferred. At reconciliation default had1 default-only/0 feature-only commits; after the v19 control it has1/1. No further merge/rebase/revert was performed.
- New affected gates: 85/85 control tests (70 retained +15 new), no failed/skipped/cancelled; pinned-toolchain, schema/roadmap/Owner-decision validators, exact-path formatting, focused ESLint, Node/control TypeScript, build,213-file secret scan and diff-check PASS. The final tests reject prior-baseline/control substitution, missing/stale evidence, counter reset after uncertain outcome, fake integration acceptance, runtime path writes, sessions, deployment, additional PR/merge and Production actions.
- Reused frozen candidate evidence: [4650b199 candidate report](https://github.com/Eak-dev/malispang-lineOA/blob/4650b199b96990fce2350bc72be73ab709fab9e6/docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md):500 Node +14 mandatory benchmark +219 real Worker/SQLite =733 unique, zero failed/skipped/cancelled/unhandled, on two isolated empty-store/frozen-lockfile full validations. Signed duplicate/fencing/restart/mandatory-precedence regressions and additive-storage observations belong to c59. No new full733 run or hosted CI PASS is claimed. Current control tests are a separate later result, not additional runtime acceptance.

#### Reproduced artifact and exact configuration

Clean detached checkout HEAD c59eb5e12bb96a34da38759a5585be67d8c2ab6e, no tracked changes/untracked files/private .env or .dev.vars (only tracked .dev.vars.example). Pinned Node24.19.0/pnpm11.19.0, frozen install succeeded using the previously isolated verified store; this reuse is not called another empty-store install. Wrangler4.122.0 minified local dry-run, then a second local dry-run with the exact prepared strict/message flags, both produced index.js231587 bytes, SHA-256 **2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308**. Both exited at --dry-run; no upload, version creation, traffic change or deployment. The frozen checkout remains clean. Temporary directory is not the sole evidence; hashes, command, toolchain and results are retained here.

Fresh dependency audit: info/low/moderate/high/critical0, advisories empty; dependency/dev/optional/total metadata0/291/112/291. Frozen policy validator and WP7 check PASS; no live provider evaluation. Git blob equality to c59 and SHA-256 were verified for:

| Artifact                      | SHA-256                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| pnpm-lock.yaml                | e0a5a0f50cf38c1811e6777f82c01f40b7317687daee973e4090e6387b8edf62 |
| wrangler.jsonc                | 4e0b07de07fc73ae2d3a60f4931d6cce980847c93d86b504d2667958112e8160 |
| Policy file bytes             | dec6bf87974d19d2c1436212a225b8605ad88b440eb1947731aca733dc349cc2 |
| Approved knowledge file bytes | f9eb6973dbec13250b3889d481d83652e6aac361d02106a39499308b1786756f |
| Approved catalog file bytes   | 117be760cd38ac4062b2ce8f2449db673d84173e43e80f6a830a913a3b522f7e |
| Deterministic dataset bytes   | ad6f1bc81a974d7cc2a4f67bc627a01b31ee2835d3c46f0099039cca3b477d05 |
| Deterministic report bytes    | dd4ce92b2f531055f2662469fb7dcec5030aa5050c33ae8f3b80ccf0b452b5c8 |
| WP7 report bytes              | 11ba550100ebf3556069e1b54a8061188fbbf1b7393696a03c3228c56a2fdd73 |

The distinct frozen semantic checksums remain policy504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0, deterministic dataset6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa, deterministic resultf1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6 and WP7 result7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55; byte hashes are not substituted for semantic hashes. No policy/model/prompt/catalog/threshold/timeout/retry change.

Candidate plain configuration equals the active version for every key, not just the selected displayed keys (read2026-09-09T03:13:08.472Z). Canonically sorted plain-config SHA-2566c1601fa5a5df8e2ff6eca4e5da57566d86db244db244343f840314e19bfd9f8. All four DO binding names/classes and compatibility2026-08-14/nodejs_compat match. Secret names are present, values neither read back nor changed. Local sorted public-file path/SHA manifest hash369a2cdae3af9bf3f4223e07476d2fe19422fcaa81d493c9e39bca8d2d123a7a (three tracked JPEG files). This is distinct from the Worker bundle and upload multipart metadata hashes.

#### Authenticated TEST-only observation

Account observation2026-09-09T03:07:36.135Z: sole configured account, masked c395…407d. Only exact Worker malispang-lineoa-test was queried; no Production Worker/resource query. Deployment read03:07:39.758Z: id9ae16f15-c18f-435a-adc3-5befeeeb8edc, created2026-09-08T08:54:52.06282Z, version **8486019d-9b62-4de9-ae15-6299909a23d9 at100%**. Exact version read03:08:30.636Z: source **8a5b6547b4713ff50ad6b08ee58682e129641b6a**, annotated artifact **15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64**, matching the retained build/upload/source annotation chain. This is association evidence, not an independent download/hash of remote executable bytes. Platform etag3d089d1f824ce45465e3f94262188faeca5ae4a7939413a90756d0f6a265b6ec is not substituted for the approved artifact hash.

SQLite binding namespace IDs preserved: CONVERSATION_STATE a87e8a2d78b447d7a71d4130ab6b31b5; DRAFT_ORDER d5c94ac9f9344dca97a555832387defc; HANDOFF_REGISTRY49c04a1b3368455bb644a342fb2fdf50; PROMOTION_CONTROL94ce3541e2dd4646b99bd42fa3e513da. Environment TEST, OA label มะลิปัง TEST, bot model gpt-5.6-terra. Secret presence read03:08:34.357Z: LINE_BOT_USER_ID, LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, OPENAI_API_KEY, TEST_ADMIN_KEY, TEST_REWARD_CARD_URL. Names/presence only, not values. The sole permitted Keychain TEST_ADMIN_KEY was read into temporary process memory for the fixed HTTPS readiness GET with redirects forbidden; process exited after the call. No other secret was read, no key was printed/written/published and no permission changed.

Health03:09:27.369Z HTTP200, ok/TEST/มะลิปัง TEST. Reviewed SELECT-only readiness audit **a377e9e5-e4da-4c87-a90d-f7be2953375e**, server timestamp **2026-09-09T03:09:27.450Z**, actor AUTHENTICATED_TEST_ADMIN, target RETAINED_WP8E_OWNER_CONVERSATION, HTTP200/STATE_OBSERVED:

| State                                                | Observed value                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Pilot / AI admission                                 | STOPPED / OFF                                                                                     |
| Cumulative events / attempts                         | 6 / 6                                                                                             |
| Consumed / reserved                                  | 34,082 / 0 micro-USD                                                                              |
| In-flight / pending provider attempts                | 0 / 0                                                                                             |
| Terminal classifications                             | 2 USAGE_UNKNOWN; 4 SETTLED                                                                        |
| Conservative unknown charges                         | 25,864 micro-USD                                                                                  |
| Reported provider-response usage cost                | 8,218 micro-USD; 25,864 +8,218 =34,082                                                            |
| Independently verified historical provider billing   | UNKNOWN                                                                                           |
| Owner provenance                                     | Retained SETTLED WP8E event +single private allowlist; immutable previous/current session lineage |
| Owner mode / clarification / pending template        | HUMAN_HANDOFF /false /null                                                                        |
| Owner pending replies                                | 0                                                                                                 |
| Draft                                                | EXPIRED_PURGED, nonBlocking true, pending replies0                                                |
| Session observation                                  | available, expiredAtObservation true; no activation/dispatch/reply/recovery authority             |
| Remote SQL schema version / delivery-claim inventory | UNKNOWN — not returned by the authorized HTTP interface                                           |

There is no measured ledger drift relative to the committed6/6/34082/0 baseline. The readiness response's readyAtObservation=false describes UAT activation, not an unexpected deployment-state failure: HUMAN_HANDOFF and a stopped used session are the expected preparation state. No new session was attempted to probe readiness. These timestamps are snapshots, not a lease; refresh within the120-second execution gate before any future authorized operation. Zero provider counters do not prove every LINE dispatch or every SQL table state.

Final read-only refresh: deployment metadata at2026-09-09T03:25:42.646Z still ends at deployment9ae16f15-c18f-435a-adc3-5befeeeb8edc / version8486019d-9b62-4de9-ae15-6299909a23d9 /100%; health at03:25:42.791Z HTTP200/TEST/มะลิปัง TEST. Readiness audit **d93bf2ae-0b5d-4f22-b5ec-8dc6daf6175c**, server **2026-09-09T03:25:42.846Z** (10:25:42.846 Asia/Bangkok), HTTP200/STATE_OBSERVED, matches every pilot/ledger/conversation/draft field above. All seven returned purge invariants are true. Events/attempts/consumed/reserved deltas from the earlier snapshot are0/0/0/0; in-flight/pending remain0. Schema/delivery-claim inventory remain unexposed/UNKNOWN. The key-holding process exited0. This refresh is not a continuous no-LINE-dispatch monitor or a proof of remote shutdown newly performed this round.

#### Independent containment and one-operation failure matrix

The c59 local source/tests prove additive CREATE TABLE IF NOT EXISTS plus INSERT OR IGNORE tombstones and claim fencing; no binding, destructive migration or ledger reset is introduced. The constructor can backfill delivery_claims on the first DO invocation, including diagnostics, even without a new webhook. Therefore "candidate processed no event" alone cannot establish "no new claim rows/no storage transition". A future post-deploy snapshot must distinguish non-dispatchable DELIVERED/LEGACY_UNKNOWN tombstones from owned CLAIMED/DELIVERY_UNKNOWN records; never normalize/delete any to pass a gate.

Keep pilot STOPPED/AI OFF and do not request Owner LINE, synthetic webhook, live provider, continuation or recovery. Retain the fenced candidate if it later becomes active; do not fall back automatically to unfenced8a5b or f986. A rollback changes code/configuration, not connected stored data, so additive encoding alone is not rollback acceptance ([Cloudflare rollback semantics](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)). External LINE I/O is outside a DO storage transaction; only at-most-one dispatch/fenced acknowledgement is claimed, not exactly-once delivery ([DO concurrency guidance](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)).

| Failure point                              | Containment / operation accounting                                                                                                                 | Permitted read-only checks                                                                                 | New Owner authority required                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Before first remote mutation               | Do not run command; grant remains0/1; preserve artifact and state                                                                                  | Git/diff/hash, exact TEST metadata/health/readiness                                                        | Any new candidate, state repair, missing diagnostics or ingress control                                       |
| Remote mutation explicitly rejected        | End the one attempted operation; no retry/re-grant; keep pilot closed                                                                              | Exact TEST versions/deployments/health/readiness; distinguish reject from uncertain effect                 | Another attempt, changed credentials/permissions/configuration or fix-forward                                 |
| Remote outcome unknown                     | Treat allowance as consumed1/1; never infer no effect from timeout or reset to0; stop all execution                                                | Bounded exact version/traffic/health/readiness checks, sanitized operation receipt                         | Any further mutation, traffic action, deploy, recovery or rollback                                            |
| Version created; traffic unchanged         | Preserve the inactive version; do not separately promote/delete it; operation consumed                                                             | Exact created-version source/config plus active traffic and unchanged pilot ledger                         | Completing/promoting/deleting version or another deploy                                                       |
| Traffic changed; health/diagnostics fail   | Leave AI/session closed; stop UAT and all probes; do not automatically restore unfenced code                                                       | Exact active version/traffic and authorized diagnostics that remain available                              | Incident containment beyond existing closed pilot; reviewed fix-forward or separately gated recovery          |
| Schema migration fails                     | No reset/delete/repair; do not treat failed GET or health as no storage change; stop                                                               | Only supported SELECT-only schema/state/claim receipts, platform version/error metadata                    | Reviewed additive repair/fix-forward; any database write or old-version recovery                              |
| Unexpected webhook/event during deployment | Stop acceptance and further deployment actions; never replay the event, reclaim a delivery grant or open AI; retain current version until reviewed | Readiness/ledger deltas, authoritative event/claim metadata if supported; unknown delivery remains UNKNOWN | TEST ingress/egress containment or exact audited event recovery; no guessed LINE setting or broad state reset |

The command's logical operation begins at its first remote mutation, including any asset upload before Worker version creation; a later Owner-confirmed execution must durably record operation consumption before that boundary. One CLI invocation can have several platform steps; it is not an atomic remote transaction. A rejected/unknown/partial invocation must not be continued by a second upload/deploy/traffic call. No such operation record was consumed this round.

Current containment limitation: pilot STOPPED prevents provider admission, but neither current nor candidate source has a verified independent global TEST-webhook/LINE-egress switch. Owner silence and HUMAN_HANDOFF are not proof that other TEST traffic cannot reach deterministic replies. No supported ingress mutation is authorized this round. Thus this is an explicit fail-closed/no-rollback plan, not evidence of global webhook containment; the unexpected-event branch requires a separate approved incident action if that broader containment is necessary. The old rollback exception is not currently proved and no rollback command is prepared for automatic use.

#### Prepared deployment operation — DO NOT EXECUTE in this round

Working directory: a freshly reverified clean detached checkout of exact c59eb5e12bb96a34da38759a5585be67d8c2ab6e (the reproduced checkout is /private/tmp/mp06-v18-validation.ly721D/candidate-checkout). Pinned PATH/Node/pnpm as above; verify the sole Wrangler account matches the retained exact TEST identity and namespace tuple before use. wrangler.jsonc is already TEST-only top-level configuration; do not invent an --env alias or deploy from the v19/evidence/default checkout.

```sh
# PREPARED ONLY — blocked pending complete readiness and Owner execute confirmation.
WRANGLER_SEND_METRICS=false CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false \
pnpm exec wrangler deploy \
  --config wrangler.jsonc \
  --name malispang-lineoa-test \
  --minify --strict --autoconfig=false \
  --message "v19 source c59eb5e12bb96a34da38759a5585be67d8c2ab6e artifact 2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308; AI OFF pilot STOPPED"
```

The same flags were executed **only with --dry-run --outdir /private/tmp/mp06-v19-artifact.oe38II** and reproduced the frozen hash. Installed Wrangler4.122.0 help and [official dry-run documentation](https://developers.cloudflare.com/workers/wrangler/commands/workers/) were checked. No --force/--yes, secret/config upload, altered binding, compatibility date, routing, model or source substitution. The intended post-deploy allocation is100% to the single newly verified version; any partial result stops without a follow-up traffic change.

Required post-deploy checks, not executed: exact new version/source/artifact annotation and100% traffic; unchanged TEST account/bindings/secrets/configuration; health plus authenticated state; preserved6/6 and34082/0, pending/in-flight0, Owner HUMAN_HANDOFF and draft/clarification; additive schema/tombstone evidence and idempotence with no ledger/history rewrite; no new provider attempt, outbound dispatch or late reply; no session. Missing evidence is failure, not health-only success. Stop with the failure matrix and request narrow new authority; do not automatically rollback or redeploy.

#### Remaining exact approval boundary

The reviewed deployed readiness GET and available Wrangler metadata do not expose SQL schema/version/fingerprint or delivery_claims counts. The official [Durable Objects API](https://developers.cloudflare.com/api/resources/durable_objects/) exposes namespace/object inventory, not SQL-row inspection; listing object IDs/hasStoredData would not supply the missing proof and was not substituted. Installed Wrangler4.122.0 has no remote DO SQL query command. No arbitrary SQL, hidden-mutating legacy GET, historical-observability permission bypass, new remote helper/resource or preview was used.

To resolve this gap without weakening the gate, obtain an independently authorized read-only snapshot for the exact existing Owner/coordinator objects: supported schema identifiers/fingerprint, legacy pending reply counts, delivery-claim table presence and counts by allowed state, malformed/unknown state count, with the same ledger/lineage snapshot and timestamp. Return only enums/counts/booleans/schema hash and an audit receipt; no raw event identity, owner token, tester ID, message or secret. If this requires a new endpoint/remote inspection mechanism, its reviewed diff and exact deployment/containment sequence need separate Owner authorization because this round permits only ten control paths and zero remote mutations. Do not modify c59 or deploy a helper to discover whether the gate passes. A separately authorized independent TEST-only ingress containment mechanism would also need exact target, before/after configuration, recovery invariant and audit; no Production or LINE settings change is implied.

| Acceptance/readiness area                                          | Current status                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Owner-approved FF / preserved patch / v19 control                  | PASS                                                         |
| Frozen c59 provenance / artifact / reused733 tests / audit         | PASS                                                         |
| TEST active version/source/config/health                           | PASS at recorded observations; refresh before execution      |
| Pilot/ledger/Owner/draft/clarification observation                 | PASS for expected stopped pre-deploy state                   |
| Direct remote schema and delivery-claim inventory                  | GAP — unavailable through authorized interface               |
| Independent all-webhook containment / old rollback safety          | NOT VERIFIED / rollback not authorized                       |
| Prepared exact command                                             | Local dry-run PASS; remote operation NOT_STARTED,0/1         |
| WP8E location and F1/F2/F3 historical UAT                          | Retained evidence, not repeated or upgraded                  |
| Targeted F4/F5/F6, current rollback, final security/release review | GAP; no new UAT/rollback authority                           |
| Integration                                                        | INTEGRATION_OCCURRED_BEFORE_FINAL_REVIEW — Owner PR14 merged |
| Issue12 / Production                                               | OPEN / NO_GO — NOT TOUCHED                                   |

## Historical v18 — local-only delivery fencing

Owner approved the four-advisory dependency remediation and existing mixed staff/redemption precedence only. This is an expansion of the still-uncommitted v18 addendum, not a rewrite of v17. worker/mp-06-wp1.ts may recognize the existing explicit staff and reward-redemption semantics before preorder/draft, with order/spacing/punctuation, no-draft-mutation, no-provider, duplicate and safe F1/F2 regressions in the existing test allowlist. No new broad keyword/intent rule or routing.ts change. The only additional files are package.json, pnpm-workspace.yaml and pnpm-lock.yaml for sharp0.35.2 to0.35.4, js-yaml4.3.1 to4.3.2, and vitest/@vitest/mocker4.1.10 to4.1.11 under the four recorded advisory findings (two high/two moderate). Only the exact miniflare@5.20260811.0-alpha>sharp override to0.35.4 and @eslint/eslintrc@3.3.6>js-yaml resolution to4.3.2 within the existing ^4.3.0 range are permitted, with affected native/matching Vitest transitive resolutions; no new direct dependency, major/parent upgrade, peer conflict, patch/fork, force, broad update, registry/toolchain/build-policy/workspace change or audit suppression. Generate the lockfile with pinned pnpm11.19.0; inspect full before/after graph, native loading, real Worker/SQLite, frozen empty-store clean checkout and artifact reproducibility. Any baseline audit mismatch, residual scoped advisory or required unapproved dependency change stops for Owner. No deploy, session, remote recovery, rollback or PR in v18; no LINE or Production action. All prior delivery, accounting, policy, history and acceptance constraints remain.

The explicit Owner caller-integration confirmation permits worker/index.ts claim propagation, pre-send ownership enforcement and exact acknowledgement only. Inventory all LINE dispatch and acknowledgement sites; wrap draft outbound without changing DraftOrderDO methods/schema/lifecycle. Missing, forged or stale claims deny before LINE. Success ACK must refer to the dispatch's original claim; unknown/non-2xx outcomes never release or retry. No new runtime path or operational authorization is implied.

Roadmap 2026.09.09-v18 / MP-OD-2026-09-09-V18 supersedes 2026.09.08-v17 from 3db7738da3edc3da265ebb623190de03a629c0ff. MP-06 / Issue #12 / WP8F / TEST_ONLY. Owner explicitly approved v18 local atomic delivery ownership and fenced acknowledgement, superseding v17 operational execution for this round. No deploy, session, remote recovery, rollback or PR in v18. Stop at exact candidate/recovery-plan handoff for separate TEST deployment approval.

The same ten control paths and existing evidence path apply. Retain all six pre-existing working changes. The only additional test path is worker-tests/durable-state.test.ts: use real processEvent claim tokens for the three acknowledgement callers; suppress both previously RESPONDing undelivered replays; reject wrong/stale/missing tokens, require idempotent identical ACK and no re-grant after ACK. Preserve handoff/routing/policy/history/isolation assertions; no optional token, overload/default token, constant-token shortcut or compatibility bypass.

worker/durable-objects.ts additionally permits only processEvent atomic delivery ownership, markDelivered acknowledgement fencing, necessary additive claim storage/schema and SELECT-only delivery evidence. Existing v17 precedence and v16 continuation implementation/regressions remain local scope, not remote activation authority. No other runtime file/component/method expansion. Canonical verified webhookEventId is the deduplication key, never reply token. One winning persistent event/owner/revision claim, no duplicate/concurrent outbound dispatch. No-message events need no claim. Acknowledgement requires the exact claim; forged/stale/reordered/missing ACKs cannot mark another/current owner delivered. Identical ACK is idempotent.

Promise/transaction boundaries do not encompass LINE: only at-most-one outbound dispatch attempt, never exactly-once delivery. Crash, timeout, network error, non-2xx or uncertain outcome retains CLAIMED/DELIVERY_UNKNOWN; no automatic retry/reassignment by lease, alarm, restart or time. Recovery requires separately approved audited operator action; no recovery mechanism or reset in this round. No raw reply tokens, secrets, customer text or PII in logs/evidence. Additive schema compatibility must be demonstrated; rollback safety cannot be inferred from schema compatibility or old smoke.

Retain mandatory risk/staff precedence before draft/AI; only the two exact unresolved legacy reasons remain exceptions. Preserve F1/F2 approved price39, deterministic draft intake/history, zero provider/accounting increments on mandatory/duplicate paths, frozen bot gpt-5.6-terra/model/prompt/policy/catalog/threshold/timeout/provider-retry and cumulative limits. Reported TEST baseline remains STOPPED/AI OFF, events/attempts6/6, consumed/reserved34082/0, in-flight0, HUMAN_HANDOFF; no new remote observation is asserted here. Historical billing UNKNOWN; no accounting reset/refund.

Before candidate commit/push require real Worker/SQLite signed duplicate race, fencing/restart/failure regressions, all original tests, full Node/benchmark/Worker suites, formatting/lint/typecheck/build, all validators/frozen hashes, secret scan/audit/diff review and isolated empty-store/frozen-lockfile clean-checkout verification. Explicit paths only; validated control commit automatically becomes the local authoritative baseline, not deployment approval. Issue #12 OPEN. Production NO_GO — NOT TOUCHED; no query/mutation, merge/closure/MP-07, new resources, secret permissions, business/LINE settings or acceptance downgrade.

## Historical v17 — closed deterministic precedence contract

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

## Historical v15 — exact diagnostics follow-up

Decision `MP-OD-2026-09-08-V15` / `2026.09.08-v15` supersedes v14 from `fb9458e995a44a0233c3746fd506198f2f1805c7`. The same ten control paths and four diagnostics paths remain closed allowlists. D1 purge invariants and D2 immutable previous/current session-lineage reads only; missing, malformed, ambiguous or changed observations fail closed. No state cleanup/mutation to pass readiness.

Follow-up deployment requires the independently observed exact version/source/artifact triplet `5e04ec6f-f225-4a45-b9f1-6908bc79596c` / `946876eb94daecbb90eed24c2f4b8834a63447a2` / `eab12622a248b115ffce0b2cd1915a61171a0afe104265f38b924eccec7a933b`. Reject swapped/unknown/stale/missing evidence, artifact drift and rollback-pair misuse. Candidate evidence must also prove descent from the validated v15 control commit, commit/push, exact diff, full validation, clean-checkout reproduction and fresh TEST identity/STOPPED/AI OFF/reserved0/in-flight0/accounting preservation. No manifest self-grant, wildcard or alias. Rollback remains conditional on UAT/kill-switch/compatibility and is not a bypass.

Readiness response separates stateObservation from activationEligibility; neither is an authorization token. Only when every readiness gate passes may the existing single cumulative UAT session begin. Production NO_GO, Issue #12 OPEN, no merge/PR before acceptance/MP-07; preserve all earlier safety and accounting prohibitions.

## Historical v14 — explicit Owner control transition

Roadmap `2026.09.08-v14` supersedes v13 under `MP-OD-2026-09-08-V14`. Baseline `a4ff8298ff75b077d333b6336d115886cf2907d3`; MP-06 / Issue #12 / WP8F_TEST_ACCEPTANCE_COMPLETION / TEST_ONLY. The preserved 12-line Owner decision and subsequent explicit ten-file control approval authorize this transition. Historical v12/v13 deployment/acceptance plans remain frozen snapshots, not reusable grants. Current authority is `wp8fExecutionEnvelope`.

The envelope fixes ten control paths, four diagnostics paths and reviewed patch SHA-256 `6d8535040f455f2bbbe8f6e80f3c851fe9c726b95854b9948f17f9c62fbacdf0`. No wildcard, traversal/alias normalization, generic implementation or unknown-action allowance. Materialize, validate and explicit commit/push diagnostics; deployment to `malispang-lineoa-test` requires independently collected exact source/artifact, validation, clean-checkout, committed/pushed ancestry and fresh TEST identity/STOPPED/AI OFF/reserved0/in-flight0 evidence. The pure control decision does not itself collect or authenticate those observations; operators must verify them through approved tools. current-work fields cannot substitute for evidence or Owner approval. Never deploy from the transition/evidence SHA by implication.

After readiness/accounting pass, only existing audited exact Owner conversation recovery and one cumulative Owner-mobile UAT session are authorized. Preserve 25,864 conservative unknown + 1,960 reported usage = 27,824 historical control consumption; billing stays UNKNOWN. No accounting reset/refund, new recovery mechanism or replacement session. Existing explicit stop is authorized for containment; legacy GET paths with hidden mutation are not. TEST_ADMIN_KEY may only use previously approved exact Keychain-to-memory-to-exact-TEST-HTTPS authentication, never logs/files/redirects.

UAT and kill switch must pass before one compatible TEST rollback to `83fab7f1-646a-4ed8-be4d-a5f38df3a072` / `f986a478bc980f9e53748ed49cedd543f54cd64a`, then one exact candidate redeploy. Current schema/storage/accounting/configuration/secret/containment compatibility must be proved; do not assume it from old smoke evidence. Draft PR requires complete TEST acceptance, rollback, same-source final security review and integration checks, not test count or deployment alone. Keep the system STOPPED/AI OFF at each handoff.

Production query/mutation/deployment, merge, Issue closure, MP-07, model/prompt/policy/threshold/timeout/retry/business/catalog/LINE changes, secret/PII exposure and acceptance reductions remain forbidden. v14 is authorization only; no UAT, deployment or release PASS is asserted.
