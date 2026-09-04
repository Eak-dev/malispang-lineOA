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
