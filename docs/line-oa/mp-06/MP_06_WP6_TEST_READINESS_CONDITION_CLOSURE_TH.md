# MP-06 WP6 — TEST Readiness Condition Closure

วันที่: 6 กันยายน 2026

สถานะระหว่าง implementation: `AUTHORIZED_TEST_READINESS_CONDITION_CLOSURE_WP6_ONLY`

## วัตถุประสงค์และขอบเขต

ปิดเฉพาะสี่ conditions จาก WP6 assessment โดยไม่เปลี่ยน runtime, policy, templates, KB/catalog, benchmark dataset/oracle/semantics/reports, dependencies, Worker/Wrangler deployment configuration หรือ remote state งานนี้ไม่ใช่ AI/NLU, TEST deployment, live smoke, rollback rehearsal, Owner UAT หรือ Production readiness

Control commit ที่อนุญาตงานนี้คือ `96a5a2271969b1cc1d23cdbf1afe457fa0f6808b` ภายใต้ Roadmap `2026.09.06-v4`

## Condition 1 — Active benchmark timeout metadata

Active contract ถูก normalize ให้ตรง commit `b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a`:

- dedicated benchmark process
- hook execution watchdog `300_000` ms
- test-specific watchdog `15_000` ms จำนวนสองจุด
- 5,000 cases และ 10,000 actual evaluator attempts
- observed five-run maximum 260.20s
- remediation acceptance ceiling 270s; margin 9.80s

watchdog ทั้งหมดเป็น execution safety limits ไม่ใช่ product latency target หรือ performance guarantee ค่าจากเครื่องนี้มี margin ต่อ ceiling ต่ำ จึงห้ามนำไปตั้ง CI performance SLA โดยตรง เอกสาร 60/120/180 วินาทีเดิมเป็น historical evidence และไม่ถูกแก้ย้อนหลัง Validator ใหม่ตรวจ active metadata กับ source โดยตรงและ fail closed เมื่อ drift

## Condition 2 — TEST-only alert, rate และ stop controls

Source of truth คือ `config/mp-06/test-readiness-controls.json`:

- pilot จำกัด Owner-approved internal testers ไม่เกิน 5 roles/users ที่ Owner ระบุใน change window
- budget 20 accepted webhook events/นาที, 200/ชั่วโมง และ session ไม่เกิน 60 นาที
- alert สำคัญด้าน environment/destination, PII/raw text, unsupported/partial AUTO, authority, duplicate และ rate budget หยุด pilot ตั้งแต่ occurrence แรก
- webhook error หยุดเมื่อครบ 3 ครั้งใน 5 นาที
- decision owner คือ role `OWNER_PO`; executor คือ `TEST_DEPLOYMENT_OPERATOR`; monitor คือ `TEST_MONITOR`
- kill switch คือปิด `Use webhook` เฉพาะ TEST channel; Production impact ต้องเป็น `NONE`
- metadata หายหรือ malformed ต้อง block การขอ TEST deployment authorization รอบถัดไป

ตัวเลขเป็น conservative synthetic/UAT pilot limits ไม่ได้คัดลอกหรืออนุมานจาก Production traffic Repository ไม่มี runtime rate-limiter primitive และรอบนี้ห้ามแก้ runtime จึง freeze เป็น pre-deployment gate กับ operator runbook; separate deployment authorization ต้องยืนยัน monitoring/operator พร้อมใช้งานก่อน live pilot ไม่มี secret value อยู่ใน manifest

## Condition 3 — Rollback และ synthetic fixtures

### Rollback freeze

- TEST Worker: `malispang-lineoa-test`
- pre-MP-06 rollback target: version 21 / `3e02e79b-29c9-46cf-9218-ed2d0b7d7655`
- source: read-only TEST version history captured 6 September 2026
- decision owner: role `OWNER_PO`
- executor: role `TEST_DEPLOYMENT_OPERATOR`
- maximum decision target: 5 minutes
- maximum recovery target: 15 minutes
- target unavailable, worker identity mismatch, Production reference หรือ operator ไม่พร้อม: disable TEST webhook และ abort

Plan พร้อมในระดับเอกสารและ machine-readable control แต่ rollback rehearsal ยังเป็น `NOT_PERFORMED` และเป็น gate ที่ต้องทำหลัง separate TEST deployment authorization ห้ามอ้างว่า rehearsal ผ่านแล้ว

### Synthetic smoke/UAT fixtures

`config/mp-06/test-readiness-fixtures.json` มี 8 fixtures และครอบคลุม happy/AUTO, CLARIFY, STAFF_ONLY, risky authority/fail closed, invalid signature, duplicate event, idempotency/composite retry และ kill-switch behavior Inputs เป็น synthetic/PII-free และไม่มี Production endpoint, customer identity, phone, address, order identifier, token หรือ secret Validator ปฏิเสธ Production target, obvious PII, duplicate fixture ID และ missing coverage

Owner UAT ยังเป็น `NOT_PERFORMED`; fixtures เป็นแผนที่ Owner ใช้ตรวจภายหลังและ automated tests ไม่แทน Owner UAT

## Condition 4 — Validation-chain formatting idempotence

Root cause คือ Rich Menu preview generator เขียน HTML แบบ compact หลัง `format:check` ทำให้ tracked preview drift แม้ semantics ไม่เปลี่ยน การแก้มีสองส่วน:

1. generator format HTML ด้วย committed Prettier dependency ก่อนเขียน ทำให้ output ตรง canonical tracked artifact
2. `pnpm check` สร้าง local preview ก่อน `format:check` และเรียก readiness validator เป็น mandatory gate

ไม่มีการเปลี่ยน Rich Menu content, dimensions, actions, labels, design หรือ Production artifact semantics ไม่เพิ่ม `.gitignore`, ไม่ลบ preview validation และไม่ใช้ formatter write step ท้าย chain เพื่อกลบ drift Regression test render ซ้ำและเทียบ byte กับ committed preview

## Validator และ test contract

ใช้คำสั่ง:

```sh
pnpm validate:mp-06-test-readiness
pnpm test:node:unit
pnpm check
```

Validator ตรวจ timeout source/metadata, TEST namespace/no Production fallback, exact pilot controls, stop/rollback roles, synthetic fixture coverage/PII boundary และ validation-chain ordering Error output เป็น stable codes และไม่ echo input หรือ environment values

## Remaining gates

แม้สี่ conditions ปิดครบแล้ว Issue #12 ต้องเปิดต่อจนมีหลักฐานตาม scope จริง:

- Owner เลือกและอนุมัติ AI/NLU work package หรือเส้นทางที่ Issue กำหนด
- separate TEST deployment authorization
- live TEST smoke
- rollback rehearsal
- Owner TEST UAT
- PR/review/default-branch integration
- Production decision แยกต่างหาก; ปัจจุบัน `NO_GO`

## Deployment status

**NOT DEPLOYED**

TEST deployment: `false`

Production: `NO_GO`
