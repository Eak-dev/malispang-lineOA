# MP-06 v16 security remediation — preflight and scope blocker

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
