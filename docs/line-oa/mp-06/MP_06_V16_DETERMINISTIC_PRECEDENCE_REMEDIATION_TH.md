# MP-06 v16 security remediation — current gate and historical evidence

## Current v16 — PRECEDENCE_CONTRACT_CONFLICT

The additional worker/durable-objects.ts scope is approved. The old file-scope blocker below is historical and resolved; no repeat approval is requested. Accepted starting local/remote baseline: a1e0ca03f88e0d17e3627c5bd8cd7dfedf386cb0. Control transition 222182bbf3c3fb794a4e5a64f4f75b53916e0d99 is committed/pushed on codex/mp-06-guardrailed-ai and is the automatically accepted v16 control baseline. Roadmap 2026.09.08-v16 / MP-OD-2026-09-08-V16 supersedes v15, MP-06 / Issue #12 / WP8F / TEST_ONLY.

Exactly the ten authorized control files changed. The envelope adds only the approved eighth executable/test path, freezes 6/6 and 34082/0 with STOPPED / OPERATOR_STOP / no pending/in-flight, one immutable continuation, three scoped handoff closes, exact v15 pre-deploy triplet and all candidate/rollback/PR/Production restrictions. There is no new runtime candidate yet. Control authorization is not proof of a repaired vulnerability, completed continuation or deployment readiness.

### New compatibility conflict, proven locally

The blanket requirement that every existing deterministic decision with handoff:true must immediately win conflicts with the separate requirement to preserve existing safe AUTO/CLARIFY and business behavior. This is a different gate from the resolved Durable Object file allowlist.

| Synthetic case / existing path                       | Existing deterministic evidence                                                                                                            | Consequence of a blanket legacy handoff guard                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| F1 ambiguous catalog-price question                  | Primary PRICE; legacy handoff false; WP1 CLARIFY T-C01                                                                                     | Remains CLARIFY                                                                                         |
| F2 catalog product/size follow-up with pending T-C01 | Primary UNKNOWN; legacy SAFE_FALLBACK / NO_AUTHORITATIVE_ANSWER / handoff true; WP1 resolves approved catalog AUTO / PRICE / handoff false | Skips deterministic catalog resolution and changes the retained safe F2 result to HUMAN_HANDOFF         |
| WP8E location wording variant                        | Primary UNKNOWN; legacy SAFE_FALLBACK / handoff true; WP1 undefined                                                                        | Removes the existing guarded semantic interpretation path; no new live retest was performed             |
| F4 synthetic authority/refund request                | Primary HIGH_RISK; legacy HANDOFF_ACK / handoff true; WP1 undefined                                                                        | Must be blocked before AI; this original vulnerability remains unfixed                                  |
| Existing canonical advance-order intake              | ADVANCE_ORDER / handoff true; existing deterministic draft transition is CONSENT_REQUIRED, enterHandoff false                              | Immediate forced handoff also conflicts with preserving the already approved deterministic draft intake |

Reproduction used pure local functions with network disabled and a new signed HTTP webhook regression through the real Worker/SQLite runtime. The regression sends synthetic catalog clarification then a synthetic product/size follow-up, checks pending T-C01, catalog price response, BOT_ACTIVE, cleared pending template and exactly two mocked LINE replies. It explicitly checks that the legacy classifier returns handoff:true for that follow-up. No real customer data, OpenAI call or LINE request was used.

Experiment: adding only `&& !decision.handoff` to the text WP1/AI entry condition in worker/index.ts made that same regression fail: expected BOT_ACTIVE, actual HUMAN_HANDOFF, with NO_AUTHORITATIVE_ANSWER. This experimentally demonstrates the F2 compatibility conflict, not a completed security fix. The experimental one-line guard was removed with an exact inverse patch; runtime source is byte-unchanged. Assertions were not weakened. The targeted experiment selected one test and deselected 29; it is not a zero-skipped full-suite claim. The final whole pilot-control file passes 30/30 with no failed/skipped/cancelled tests.

The advance-order compatibility observation is a separate pure-function/source-path finding, not a new signed-webhook or live UAT result. An exploratory phrase that did not match ADVANCE_ORDER was excluded; the canonical intake matched ADVANCE_ORDER and produced the state above. Do not use the UNKNOWN exploratory result as draft evidence.

### Exact Owner decision required before runtime implementation

Proposed boundary clarification, not implemented or implicitly authorized:

1. Mandatory known risk/authority/staff decisions, and deterministic WP1 STAFF_ONLY or policy-integrity/protected-risk decisions, always prevail before draft interception, AI admission, reservation, construction and dispatch. No advisory downgrade, provider attempt or AI cost increment; retain approved deterministic handoff replies, duplicate handling and audit.
2. Treat only the two closed legacy unresolved-fallback reasons NO_AUTHORITATIVE_ANSWER and AMBIGUOUS_CUSTOMER_TEXT as unresolved interpretation, not a business authorization. Preserve existing context-aware deterministic catalog resolution and guarded advisory interpretation, with the unchanged deterministic policy retaining final authority. No exception for known risk, missing/stale/conflicting knowledge, or explicit staff/authority decisions.
3. Explicitly preserve the existing deterministic ADVANCE_ORDER consent/draft intake, without any provider access or business confirmation; its existing staff-review boundary remains mandatory. Alternatively, changing that intake to immediate handoff is a business-behavior change that needs a distinct Owner decision and affected acceptance review.

This clarification is necessary because the currently literal every-handoff:true requirement cannot simultaneously preserve the observed F2 and draft behavior. Do not silently add these exceptions, reclassify unknowns in worker/routing.ts, weaken assertions, change policy/model/thresholds or count the vulnerability as repaired. The atomic continuation implementation remains authorized in worker/durable-objects.ts, but no session should be enabled or deployed while this security/behavior conflict is unresolved.

### Fresh TEST containment and validation

At 2026-09-08T10:54:26.460Z, authenticated SELECT-only receipt 396b62e4-5b21-487d-aa8b-d422374b47e5 confirmed retained Owner linkage, AI admission OFF / pilot STOPPED, events/attempts 6/6, consumed/reserved 34082/0 micro-USD, pending/in-flight zero, Owner HUMAN_HANDOFF, no pending clarification/reply, and EXPIRED_PURGED draft with every purge invariant true. Activation eligibility remains false. No activation, handoff-close, accounting write or remote mutation was performed. The temporary process holding only the approved TEST_ADMIN_KEY exited; no secret value was printed, written or transmitted outside the exact TEST HTTPS endpoint.

Independently queried TEST deployment metadata still resolves version 8486019d-9b62-4de9-ae15-6299909a23d9 at 100%, source 8a5b6547b4713ff50ad6b08ee58682e129641b6a and annotated reproduced artifact 15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64. TEST health returned 200 / TEST / correct TEST account name / durable-object-sqlite. This retains the build/upload/annotation association limitation described below; it is not a new independent remote executable download.

Accounting remains 25864 conservative terminal USAGE_UNKNOWN plus 8218 reported-usage estimates = 34082, with two UNKNOWN and four SETTLED attempts. Historical independently verified billing remains UNKNOWN. No new attempt is shown between the prior stop observations and this receipt; no claim is made about future activity or absolute provider execution completion from counters alone.

Validation: control tests 62/62 (59 retained, three new), full pilot-control Worker file 30/30 (29 retained, one new compatibility regression), formatting/ESLint/TypeScript/build, control validator, secret scan and diff-check pass. Initial test-harness lint errors were corrected with a typed serialized mock-reply capture; expectations were retained. Prior full candidate evidence remains 619 unique tests; current inventory is 623 after four additions, not a claim of a new 623-test full run. No runtime candidate, full candidate validation, new clean-checkout artifact or deployment PASS is claimed. Deterministic check passes all 5000 cases with semantic checksum f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6 unchanged. WP7 frozen evidence check passes with semantic checksum 7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55 unchanged; no live evaluation rerun. Dependency audit reports no known vulnerabilities; dependencies, lockfile, Worker runtime, model/prompt/policy and reports are unchanged.

| Acceptance gate                                                    | Current verdict                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| v16 exact control / additional DO file authority                   | PASS, committed/pushed control                                         |
| Existing F1/F2 / F3 button UAT                                     | Historical evidence retained; F2 compatibility regression PASS         |
| Deterministic precedence security repair                           | BLOCKED — new exact contract conflict; original vulnerability retained |
| Atomic one-shot continuation / lineage / rollback compatibility    | GAP — authorized, not implemented or validated                         |
| Targeted F4, F5, F6 / new-session kill switch                      | NOT_STARTED                                                            |
| TEST containment and unchanged accounting                          | PASS at the timestamped read above                                     |
| New runtime deployment / rollback rehearsal / final release review | BLOCKED                                                                |
| Draft PR / integration / Issue closure                             | BLOCKED; Issue #12 OPEN                                                |
| Production                                                         | NO_GO — NOT TOUCHED                                                    |

## Historical preflight — prior file-scope blocker, now resolved

Status: BLOCKED_PENDING_EXACT_CONTINUATION_FILE_SCOPE. This is evidence only, not a v16 control transition, implemented fix, deployment authorization bypass or completed acceptance. Current committed control remains Roadmap 2026.09.08-v15. Owner has approved the v16 objective, but its exact runtime file allowlist does not include the coordinator required for continuation.

## Provenance and exact preflight

This permanent sanitized record captures the prior operator evidence and fresh verification. It intentionally excludes raw chat, screenshots, customer identifiers, private conversation references, secret values, tokens and raw provider bodies. The Owner's subsequent v16 instruction explicitly authorizes committing this sanitized evidence; the earlier detailed-publication restriction is retained as history, not bypassed by copying its payload verbatim.

- Repository: Eak-dev/malispang-lineOA; branch: codex/mp-06-guardrailed-ai.
- Starting evidence/local/remote HEAD: cbced781f8e06f078b079f4e06f1c181872167ff; fetch origin completed; tracked tree clean, no staged files.
- Control ancestor: 4aa1cba94a74442fab6608196211cabd5e6df0b3.
- Deployed runtime ancestor: 8a5b6547b4713ff50ad6b08ee58682e129641b6a.
- Exact TEST Worker: malispang-lineoa-test.
- Independently resolved active version: 8486019d-9b62-4de9-ae15-6299909a23d9; traffic 100%.
- Artifact SHA-256: 15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64.
- Remote version annotation matches the runtime SHA and the previously reproduced/uploaded minified artifact; the retained local bundle hashes identically. This is source/build/upload/annotation association, not an independent download and hash of the remote executable.
- Health: TEST / correct TEST account name / durable-object-sqlite / ok.
- Fresh SELECT-only observation: 2026-09-08T09:45:06.848Z, receipt 5b0efd53-552c-4f3c-9d52-34811b6ae9e6.
- AI admission OFF / pilot STOPPED; events/attempts 6/6; consumed/reserved 34082/0 micro-USD; in-flight/pending attempts zero; Owner HUMAN_HANDOFF.
- Node 24.19.0, pnpm 11.19.0; project-control validator PASS with the previously documented default-branch-drift warning. GitHub #9/#12 remain OPEN; v15 follow-up comments align with current control.

No remote mutation, activation, recovery, provider request, LINE message or deployment occurred in this v16 preflight.

## Historical Owner UAT and containment evidence

The one v15 session activated at 2026-09-08T08:59:00.434Z with expiry 09:59:00.434Z. Actual Owner-mobile screenshots corroborate the visible results below; no transcript or screenshot is committed. F1/F2/F4 each have all eight durable phases from dispatch authorization through response headers, body, parsing and successful settlement. A pre-fetch checkpoint alone is not evidence that OpenAI received a request.

| Case | Actual observed result                                                                    | Backend evidence                                                                          | Cumulative accounting after case                             |
| ---- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| F1   | Clarification asks product/size; no price assertion                                       | CLARIFY T-C01; HTTP 200; settlement complete; pending reply zero                          | events/attempts 4/4; consumed 29898; reserved/in-flight zero |
| F2   | Approved catalog price with required disclaimer; shortened input variant retained as such | AUTO; pending T-C01 resolved; HTTP 200; settlement complete                               | 5/5; consumed 32024; reserved/in-flight zero                 |
| F3   | Staff-button postback produces one handoff acknowledgement                                | CUSTOMER_REQUESTED_STAFF; retained Owner HUMAN_HANDOFF; no provider increment             | 5/5; consumed 32024; reserved/in-flight zero                 |
| F4   | Refund request safely handed to staff; no refund approved                                 | MP06_AI_NLU_RISK_PAYMENT_OR_REFUND; HTTP 200; settlement complete; one provider increment | 6/6; consumed 34082; reserved/in-flight zero                 |

F3 proves the button/postback path, not natural-language staff classification. F4 had a safe actual response; it is not evidence of an unsafe live AUTO. Its additional provider attempt exposed the separate code-level authority gap described below. F5/F6 were not run. Existing WP8E location evidence remains separate and is not retested or counted again.

F1/F2/F4 observed header durations were 3594/2607/3225 ms; body durations 75/74/73 ms; parsing 0/0/0 ms. These instrumented measurements are not product performance guarantees. All recorded HTTP statuses were 200; no provider error or Retry-After was recorded for these cases. Their reported-usage cost increments were 2074/2126/2058 micro-USD.

After F3, one existing authenticated exact-Owner handoff-close operation was verified with before/after observations and HANDOFF_CLOSED / AUTHORIZED_TEST_STAFF audit at 1788859043474. Accounting and draft remained unchanged, prior audit records retained, Owner returned BOT_ACTIVE. No recovery was performed after F4; the Owner remains HUMAN_HANDOFF.

Containment was requested at 2026-09-08T09:27:24.592Z. Receipt 3a7bc973-6c85-4471-b93e-c8f8d603da4e at 09:27:24.952Z confirmed STOPPED / AI OFF, reserved/in-flight zero. Receipt 462de4f8-fab3-4e59-af4d-12d88fc1e275 at 09:30:08.844Z confirmed unchanged accounting and no new lifecycle checkpoint after stop. This is incident containment, not completed F6 Owner kill-switch acceptance or an indefinite no-call guarantee.

Accounting reconciliation: 25864 conservative historical USAGE_UNKNOWN charges + 8218 reported-usage estimates = 34082 micro-USD. The latter includes the historical settled location cost 1960 and the three new successful calls. Two attempts remain terminal USAGE_UNKNOWN, four SETTLED. Historical independently verified provider billing and the causes of the two original unknown attempts remain UNKNOWN. No refund, ledger reset or audit deletion occurred.

## Proven security counterexample — not fixed

The existing deterministic classifier correctly produces a handoff decision for the synthetic F4 risk request. However, worker/mp-06-wp1.ts returns undefined when a staff-only primary intent has no AUTO-intent match. worker/index.ts then admits AI for an undefined plan. A schema-valid mock advisory selecting a benign intent with HIGH confidence and no risk signal can produce AUTO through planMp06WithAdvisoryNlu; the original legacy handoff decision is not retained on that path.

The local counterexample used no network and no code change. The corrected mock passed validateMp06AiNluOutput and produced: legacy handoff true, WP1 baseline undefined, one mock invocation, final AUTO. An initial exploratory mock had empty reason codes and failed schema validation; it is not used as proof. This is a planner-level counterexample plus source-path analysis, not a completed signed-webhook regression. Real F4 was safely handed off because the actual advisory recognized the risk.

Required fix remains the Owner-approved early deterministic precedence before admission/reservation/provider construction, with zero provider/attempt/cost increment and real signed-webhook regression. No model, prompt, policy, catalog, timeout or retry change is proposed.

## Exact continuation scope conflict and proposed additional file

Add only worker/durable-objects.ts to the v16 executable allowlist, limited to the following reviewed design. No broad file scope or permission is requested. Existing approved worker/index.ts and worker-tests/mp-06-pilot-control.test.ts can contain the route wiring and real Worker/SQLite/HTTP regression coverage.

Evidence of necessity:

1. resumeMp06Acceptance() stores a single immutable mp06_wp8f_activation row with CHECK(id = 1). Once applied, only the exact original operation is idempotently acknowledged; it cannot reopen STOPPED state. A different continuation operation is denied.
2. Its first-use precondition pins 3/3 events/attempts and 27824 consumed, not the current 6/6 and 34082.
3. ownerUatPilotObservation() validates only the original previous/current session pair and its activation timestamp. A new session without a corresponding supported immutable lineage extension makes readiness unavailable.
4. The generic activation method is not a safe substitute: it replaces session/tester rows without extending that retained one-shot lineage. Do not route around the one-shot guard or edit/delete its marker. The historical reconciliation route is also pinned to the older 2/2 state and is not applicable.

Proposed diff boundary (not applied):

- Add one separately identified v16 continuation transaction with immutable audit/lineage, exact prior session and operation preconditions, STOPPED / OPERATOR_STOP, 6/6, consumed/reserved 34082/0, no pending attempt or in-flight work, and verified retained Owner linkage.
- Atomically carry forward all accounting/history, limits and the same Owner; authorize only one new session of at most 60 minutes. Same-operation replay must not extend expiry or reopen stopped state; a third activation must fail closed.
- Preserve the original v15 marker and all events/attempts. Update SELECT-only observation to validate the explicit old-to-v15-to-v16 chain and cumulative ledger; missing/ambiguous lineage denies. Do not make a read response an activation or reply capability.
- Test wrong prior identity/state, duplicate/concurrent operation, stop/restart/replay, immutable expiry, old-attempt isolation, ledger agreement and pre/active/post-stop observation using real Worker/SQLite storage. Test the already approved precedence fix separately through signed webhook entry points.
- Review storage/rollback compatibility before any deployment. Additive local storage representation is not permission for a new remote resource, binding or broad migration. If another file/resource is necessary, stop with its exact diff proposal.

Changing only the route in worker/index.ts cannot safely bypass or replace coordinator persistence. Owner approval of the continuation objective does not implicitly override the exact file allowlist. Therefore no v16 control/runtime implementation or new deployment has been performed; stop at this additional-file approval gate rather than weakening fail-closed behavior.

## Validation and acceptance status

Fresh unchanged-source local Worker/SQLite acceptance-resume tests: 9/9 PASS, including concurrent idempotency, restart, refusal to reopen after stop and denial of a different operation. No live provider calls. Project-control validator PASS. These tests prove the existing one-shot contract; they do not claim v16 remediation or continuation acceptance.

Prior candidate evidence remains 619 unique tests and clean-checkout reproducibility, as recorded in MP_06_V15_DIAGNOSTICS_VALIDATION_TH.md. No full-suite rerun is claimed for this documentation-only change, and test counts do not override the newly discovered security gap. Runtime, model/prompt/policy, benchmark reports/checksums, dependencies, lockfile and deployment configuration remain unchanged.

F1/F2 and F3-button evidence is retained. Deterministic precedence security remediation, targeted F4 rerun, F5/F6, continuation, rollback/redeploy, final security/release review and PR/integration remain GAP or BLOCKED. No PR, merge, Issue closure or MP-07. Issue #12 OPEN. Production NO_GO — NOT TOUCHED.
