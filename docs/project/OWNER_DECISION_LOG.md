# Owner Decision Log

เอกสาร append-only สำหรับ Project Control ห้ามแก้หรือลบ decision ที่เคยใช้เป็นฐานงาน หากเปลี่ยนคำตัดสินให้เพิ่ม decision ใหม่พร้อม `supersedes`

## MP-OD-2026-09-02-V4

| Field                  | Decision                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decided                | 2 September 2026                                                                                                                                                                   |
| Roadmap                | `2026.09.02-v4`                                                                                                                                                                    |
| Supersedes             | `2026.09.02-v3`                                                                                                                                                                    |
| Current                | `MP-05 (GitHub #11)` only                                                                                                                                                          |
| Next                   | `MP-06 (GitHub #12)` blocked pending MP-05 Owner/PO review                                                                                                                         |
| MP-06 benchmark        | at least 5,000 PII-free cases: functional 3,000; Thai-language variation 1,000; adversarial/safety 1,000                                                                           |
| TEST deployment        | `false`                                                                                                                                                                            |
| Production             | `NO_GO`                                                                                                                                                                            |
| Authorized MP-05 scope | local implementation, tests, documentation, commit and push on dedicated branch                                                                                                    |
| Explicitly prohibited  | MP-06 implementation, deployment, default-branch merge, LINE OA/Cloudflare/Webhook/Rich Menu/Reward Card/secret changes, Production access/change, PII/raw chat/credential storage |

GitHub Issue numbers remain immutable external references; `MP-01`–`MP-12` are the canonical sequence IDs.

## MP-OD-2026-09-04-V1

| Field                 | Decision                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decided               | 4 September 2026                                                                                                                                                           |
| Roadmap               | `2026.09.04-v1`                                                                                                                                                            |
| Supersedes            | `2026.09.02-v4`                                                                                                                                                            |
| Governance baseline   | MP-05 commit `d036063a562a4fa780f162c69f7824ebcb9a250b`, approved by Owner/PO                                                                                              |
| Current               | `MP-06 (GitHub #12)`                                                                                                                                                       |
| Next                  | `MP-07 (GitHub #7)` blocked pending MP-06 completion and Owner/PO review                                                                                                   |
| MP-06 benchmark       | at least 5,000 PII-free cases: functional 3,000; Thai-language variation 1,000; adversarial/safety 1,000                                                                   |
| Authorized transition | update versioned control files, schemas, validator/tests and documentation; commit/push `codex/mp-06-guardrailed-ai`; reconcile GitHub Roadmap #9                          |
| MP-06 implementation  | **not authorized**                                                                                                                                                         |
| TEST deployment       | `false`                                                                                                                                                                    |
| Production            | `NO_GO`                                                                                                                                                                    |
| Explicitly prohibited | MP-06/runtime/benchmark implementation, MP-07 or other work, deployment, default-branch merge, LINE OA/Cloudflare/Webhook/Rich Menu/Reward Card/secret changes, Production |

`CURRENT` records sequencing only. It does not grant implementation or deployment permission.

## MP-OD-2026-09-05-V1

| Field                         | Decision                                                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decided                       | 5 September 2026                                                                                                                                                                                                                       |
| Roadmap                       | `2026.09.05-v1`                                                                                                                                                                                                                        |
| Supersedes                    | `2026.09.04-v1`                                                                                                                                                                                                                        |
| Baseline                      | `5ddf9cc88d0bb868aadbc8f2a41860b56a5f2682` on `codex/mp-06-guardrailed-ai`                                                                                                                                                             |
| Current                       | `MP-06 (GitHub #12)`                                                                                                                                                                                                                   |
| Status                        | `AUTHORIZED_POLICY_SNAPSHOT_ONLY`                                                                                                                                                                                                      |
| Authorized future scope       | MP-06 policy specification, schema, validator, regression tests, Owner decision log, Roadmap changelog, commit and push on the dedicated MP-06 branch                                                                                  |
| Required locked policy topics | I-13 AUTO_COMPOSITE; precedence/limit/clarification budget; no partial AUTO; response-unit fingerprint and PII prohibition; T-A02 exact text; PRICE binding/unitPriceSatang; NORMAL/SMALL display mapping                              |
| Runtime/AI                    | `false`; no routing, matcher, Worker, Durable Object, LINE handler, KB/catalog, AI integration or provider call                                                                                                                        |
| TEST deployment               | `false`                                                                                                                                                                                                                                |
| Production                    | `NO_GO`                                                                                                                                                                                                                                |
| Transition-round limit        | This decision authorizes only the control transition to the new status. The actual policy snapshot must be performed in a later round under the resulting current-work manifest; it must not be created in the same transition commit. |

No raw customer text, PII, credential or secret may appear in the future snapshot, fingerprint or audit evidence.

## MP-06-POLICY-2026-09-05-V1

| Field           | Decision                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Decided         | 5 September 2026                                                                                                     |
| Roadmap         | `2026.09.05-v1`                                                                                                      |
| Work            | `MP-06 (GitHub #12)`                                                                                                 |
| Artifact        | Policy snapshot `2026.09.05-policy-v1`; specification/schema/validator/tests only                                    |
| Classification  | `STAFF_ONLY > CLARIFY > AUTO_COMPOSITE > AUTO`                                                                       |
| I-13            | 2–3 deduplicated AUTO units; deterministic order; over 3 uses T-C04; no partial AUTO                                 |
| Clarification   | T-C01/T-C04 share one use per conversation; unresolved afterward becomes I-22 / `STAFF_ONLY`                         |
| Fingerprint     | Binding-aware dynamic inputs; static template/checksum; raw customer text and PII prohibited                         |
| PRICE           | Exactly one Approved Catalog row, integer positive whole-baht price only, invalid binding fails to `STAFF_ONLY`      |
| Size display    | `NORMAL` → ` ขนาดปกติ`; `SMALL` → ` ขนาดเล็ก`; invalid/empty/unknown → `STAFF_ONLY`                                  |
| Exact templates | T-A02, T-C01, T-C03 and T-C04 frozen in the versioned snapshot                                                       |
| T-C03 boundary  | Exact text approved; trigger and clarification-budget behavior remain undecided and therefore unavailable to runtime |
| Runtime/deploy  | Not authorized; no Worker, routing, AI provider, TEST deployment or Production action                                |

The machine-readable snapshot contains no raw chat, PII, token, secret or customer data.

## MP-OD-2026-09-05-V2

| Field                      | Decision                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decided                    | 5 September 2026                                                                                                                                                                                                                             |
| Roadmap                    | `2026.09.05-v2`                                                                                                                                                                                                                              |
| Supersedes                 | `2026.09.05-v1`                                                                                                                                                                                                                              |
| Current                    | `MP-06 (GitHub #12)`                                                                                                                                                                                                                         |
| Status                     | `AUTHORIZED_RUNTIME_WP1_ONLY`                                                                                                                                                                                                                |
| Verified baseline          | `a701eac403aef924d587b4427397c63553bdda3e`                                                                                                                                                                                                   |
| Policy control             | `2026.09.05-policy-v1`, checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, read-only                                                                                                                               |
| Authorized next-round work | WP1 multi-intent match set, deterministic policy gate, response-unit plan, atomic authority validation, composite idempotency, runtime tests and documentation                                                                               |
| Runtime boundary           | `localImplementation=true` only for scoped `RUNTIME_WP1`; generic implementation is rejected                                                                                                                                                 |
| Explicitly prohibited      | policy/template/Owner-decision/KB/catalog changes; T-C03 runtime; AI/provider/model/prompt/key/secret/raw chat; benchmark 5,000 cases; MP-07/other work; deploy; LINE OA/Cloudflare/Webhook/Rich Menu/Reward Card; default merge; Production |
| TEST deployment            | `false`                                                                                                                                                                                                                                      |
| Production                 | `NO_GO`                                                                                                                                                                                                                                      |
| Transition-round limit     | This commit may change only project-control/schema/validator/tests/docs, commit/push and GitHub Roadmap #9; it must not start WP1 runtime implementation                                                                                     |

## MP-OD-2026-09-05-V3

| Field                      | Decision                                                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decided                    | 5 September 2026                                                                                                                                                                                                                                                                        |
| Roadmap                    | `2026.09.05-v3`                                                                                                                                                                                                                                                                         |
| Supersedes                 | `2026.09.05-v2`                                                                                                                                                                                                                                                                         |
| Current                    | `MP-06 (GitHub #12)`                                                                                                                                                                                                                                                                    |
| Status                     | `AUTHORIZED_BENCHMARK_WP2_ONLY`                                                                                                                                                                                                                                                         |
| Verified baseline          | `2a2571369f7e845c5d72883d816556ce24be18c0`                                                                                                                                                                                                                                              |
| Policy control             | `2026.09.05-policy-v1`, checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, read-only                                                                                                                                                                          |
| Authorized next-round work | WP2 benchmark harness, PII-free case dataset, coverage report, confusion matrix and every false-AUTO report, tests and documentation                                                                                                                                                    |
| Acceptance criteria        | ≥5,000 meaningfully distinct PII-free cases: functional ≥3,000, Thai variation ≥1,000, adversarial/safety ≥1,000; AUTO correctness ≥98%; risky fail-closed 100%; unsupported claim and PII/raw-chat leakage 0; authority failure fail-closed 100%; confusion matrix/false-AUTO required |
| Explicitly prohibited      | runtime/policy/template/Owner-decision/KB/catalog changes; AI/provider/model/prompt/key/secret; real chat/raw chat/PII; MP-07/other work; GitHub Roadmap edit; deploy; LINE OA/Cloudflare/Webhook/Rich Menu/Reward Card; default merge; Production                                      |
| TEST deployment            | `false`                                                                                                                                                                                                                                                                                 |
| Production                 | `NO_GO`                                                                                                                                                                                                                                                                                 |
| Transition-round limit     | This commit may change only project-control/schema/validator/tests/docs and commit/push the dedicated branch. It must not create the WP2 harness, dataset, benchmark output or reports.                                                                                                 |
