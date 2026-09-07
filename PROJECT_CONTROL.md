# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยบันทึกว่า WP5 local deterministic acceptance ผ่านแบบมีข้อจำกัด, สี่ WP6 TEST-readiness conditions ถูกปิดแล้ว และ WP7 guarded AI/NLU ผ่าน local acceptance แบบมีข้อจำกัด

## Current control snapshot

| Field                 | Value                                             |
| --------------------- | ------------------------------------------------- |
| Roadmap               | `MP-ROADMAP` / GitHub #9                          |
| Version               | `2026.09.06-v5`                                   |
| Current               | `MP-06 (GitHub #12)`                              |
| Current phase         | `WP7_AI_NLU_LOCAL_ACCEPTANCE_COMPLETE`            |
| Current authorization | `AWAITING_TEST_DEPLOYMENT_AUTHORIZATION`          |
| Current action        | `NONE`                                            |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 gates |
| Verified baseline     | `237c754389fd95f433d4e9ff419afaec21d081a2`        |
| Implementation branch | `codex/mp-06-guardrailed-ai`                      |
| Target                | `LOCAL_ONLY`                                      |
| TEST readiness        | `READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION`     |
| TEST deployment       | Not authorized                                    |
| Production            | `NO_GO`                                           |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น WP7 implementation ถูก freeze หลัง local acceptance และไม่มี implementation/deployment action เปิดอยู่ Deterministic evaluator/policy เป็น final authority, feature flag ยัง default off และ AI ห้ามสร้างข้อความตอบลูกค้า, downgrade `STAFF_ONLY` หรือสร้าง business claims Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, deterministic benchmark evidence, KB/catalog และ deployment configuration เป็น read-only

WP1–WP4 ผ่าน local deterministic validation แล้ว และ WP2 artifacts ถูก commit ที่ `12e0d27dc06052f5f9a2075aff8f12c90bf5852e` Dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` และ remediated PASS result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` ถูกตรึงไว้ WP5 แก้ timeout แบบ non-semantic ที่ `98f6bc0843e376de9932acad767fb463932514cc` และ pin/enforce Node.js `24.19.0` กับ pnpm `11.19.0` ที่ `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`; clean-checkout reproducibility ผ่าน จึงบันทึก local verdict เป็น `PASS_WITH_LIMITATIONS`

WP6 assessment ที่ commit `76d1e1302c31a35ab49e565b231cf63100e27fb6` ให้ verdict `TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS`; commit `0ad0ee261eb1f270f8a81c5874d0118768244d53` ตรึงรายการ condition, control commit `96a5a2271969b1cc1d23cdbf1afe457fa0f6808b` อนุญาตการปิด condition และ implementation commit `688c1fbd75358429b7161f41de3ef706696595e4` ปิดครบทั้งสี่ โดยตรึง TEST-only non-secret controls, rollback/runbook, synthetic fixtures และ validation-chain idempotence ผลคือ `WP6_TEST_READINESS_CONDITIONS_CLOSED` และ readiness `READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION`; ไม่ใช่ deployment authorization

Active benchmark contract คือ dedicated process, hook watchdog `300_000` ms และ test-specific watchdog `15_000` ms สองจุด โดยเป็น execution safety limits ไม่ใช่ product performance guarantee ค่าสูงสุดที่สังเกตได้ระหว่าง remediation คือ 260.20 วินาที เทียบ acceptance ceiling 270 วินาที จึงเหลือ margin 9.80 วินาทีและห้ามนำผลจากเครื่องนี้ไปใช้เป็น CI performance guarantee

WP7 control commit `3722dcce68ca48412b0fc6e4a41e8fcaa1b77b70`, implementation commit `d14aa95d8ed95bcc967233d6cda252a2f61f1cd6` และ safe credential-error follow-up `796b1c2775ede01e98f5eb34314e8719b815e868` ผ่าน mock/full/clean-checkout validation แล้ว Synthetic live evaluation ใช้ 60 cases / 100 requests: structured schema 100%, risky/authority fail-closed 100%, final routing 98%, required-field extraction 100%, false final-AUTO/unsupported claim/PII leakage/prompt-injection override 0; semantic checksum `7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55`

Issue #12 ยังเปิด: TEST ยังไม่ deploy, live LINE smoke, rollback rehearsal และ Owner TEST UAT ยังไม่เกิด, PR/default-branch integration ยังไม่เกิด และ Production ยังเป็น `NO_GO`

Condition-closure verdict คือ `WP6_TEST_READINESS_CONDITIONS_CLOSED` แต่ action flag ถูกปิดแล้ว ห้ามตีความ `READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION` ว่า TEST deployed, deployment approved, Production ready หรือ go-live

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

Roadmap `2026.09.06-v5` บันทึก WP7 guarded AI/NLU local acceptance แบบมีข้อจำกัด ใช้ OpenAI project `MalisPang TEST`, environment variable `OPENAI_API_KEY` แบบไม่เปิดเผยค่า และ model `gpt-5.6-terra` ปัจจุบัน action เป็น `NONE`; การ deploy TEST ต้องได้รับ authorization แยกต่างหาก ห้ามตั้ง Cloudflare remote secret, สร้าง PR, merge หรือ deploy และยังห้ามเปลี่ยน policy, KB/catalog, deterministic benchmark evidence หรือ deployment configuration

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
