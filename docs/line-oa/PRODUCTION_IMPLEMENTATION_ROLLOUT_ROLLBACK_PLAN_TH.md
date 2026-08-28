# Proposed Production Implementation, Rollout and Rollback Plan

จัดทำ: 28 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `LOCAL_IMPLEMENTATION_COMPLETE / FINAL_PACK_NO-GO / NO_EXTERNAL_ACTION`

แผนนี้แปลง Owner baseline จาก `PRODUCTION_OWNER_DECISION_RECORD_2026-08-28_TH.md` เป็น local fail-closed implementation, acceptance tests และลำดับ external execution ที่ตรวจสอบ/ย้อนกลับได้ Final decision และ combined approval อยู่ใน `PRODUCTION_FINAL_GO_NO_GO_PACK_TH.md` ยังไม่ใช่สิทธิ์เปิด Production, deploy, สร้าง resource/secret/Reward Card หรือเชื่อม Rich Menu

## หลักแยก TEST กับ Production

- สร้าง Production Channel, Worker, state namespace, Reward Card, URL และ encrypted secrets แยกจาก TEST ทุกชิ้น; ห้าม copy/reuse TEST state หรือ credential
- account/environment guard ต้องยอมรับ exact Production target ที่บันทึกใน encrypted configuration เท่านั้น และปฏิเสธ marker `TEST`
- versioned business manifest ต้องแยก `environment: production`, มี Owner approval/effective/review dates และ fail closed เมื่อข้อมูลหาย หมดอายุ ขัดกัน หรือยังเป็น `TEST_SEED`
- structured audit เก็บเฉพาะ pseudonymous reference, actor role, points, timestamp, outcome และ config version; ห้ามเก็บข้อความลูกค้าเต็ม, QR value/image, secret, token, slip, เบอร์โทรหรือที่อยู่เต็ม

## ลำดับ implementation ที่เสนอ

### Gate 0 — ปัจจุบัน: เอกสารเท่านั้น

- บันทึก OD-01 ถึง OD-12 และช่องว่าง
- ห้าม Production access/write, deploy, secret, Reward Card และ Rich Menu
- Exit: Owner อนุมัติให้เริ่ม **local implementation เท่านั้น** จาก commit ที่ระบุ

### Gate 1 — Technical feasibility review แบบ read-only

ต้องขออนุมัติ read-only แยกก่อนเปิด LINE Production เพื่อยืนยัน:

1. rolling card expiry 12 เดือนต่อผู้รับ
2. Voucher expiry 60 วัน
3. One Time QR อายุ 10 นาทีและจำนวนแต้มต่อครั้ง
4. native role/audit/adjustment ที่ใช้ได้จริง
5. current Production response/Rich Menu rollback targets โดยไม่ save/publish

หากค่าใดไม่รองรับ ให้หยุดเฉพาะส่วนนั้นและเสนอ revised options; ห้ามสร้างบัตรหรือเลือกค่าใกล้เคียงเอง

### Gate 2 — Local implementation และ automated evidence

หลัง Owner อนุมัติ Gate 2 เท่านั้น:

- เพิ่ม schema/versioned Production manifest โดยใส่เฉพาะข้อมูลที่ Owner อนุมัติและ placeholder fail-closed สำหรับส่วนที่ขาด
- เพิ่ม deterministic point policy: paid net after discounts, `floor(net/50)`, one receipt/transaction once
- เพิ่ม eligibility state machine สำหรับ unpaid/cancelled/refunded/reused QR
- เพิ่ม exact reward policy `ตุ๊กตามะลิจัง 1 ตัว`, COGS ceiling 25 บาท และห้าม runtime substitution
- เพิ่ม role policy ช่วง 30 วันแรก, authenticated actions, idempotency, retention jobs และ redacted audit
- เพิ่ม production-safe config validation ที่ปฏิเสธ TEST resource/URL/credential marker
- ยังไม่ deploy, เพิ่ม secret หรือเปลี่ยน external system

### Gate 3 — Security/operations rehearsal ใน isolated environment

- threat model, privacy review, least privilege, dependency/secret/config scans
- failure tests: invalid signature, replay/duplicate, storage failure, timeout, unauthorized issuer, expired QR, refund/cancel และ fail-closed manifest
- rollback rehearsal ด้วย non-Production resources พร้อมจับเวลาและตรวจ state reconciliation
- freeze schema ก่อน change window; Cloudflare version rollback ไม่ย้อน Durable Object/KV/D1 state

### Gate 4 — Production change package สำหรับ final action-time approval

จัดทำรายการ exact changes โดยยังไม่ execute:

- frozen Git commit และ build hashes
- exact Production resource names/bindings โดยปกปิด IDs/secrets
- Reward Card preview/config, customer wording และ QR procedure
- Rich Menu before/after manifest, image hash และ rollback target
- Worker stable/new version, database migration compatibility และ rollback command/runbook
- exact change window, executor, approver, backup, monitoring dashboard และ Owner `GO/NO-GO`

การอนุมัติ Gate 4 ต้องแยกจากการอนุมัติเอกสารรอบนี้

## Acceptance criteria ก่อนเสนอ external Production action

### Points/reward

- 49→0, 50→1, 99→1, 100→2, promo net 100→2, 249→4
- welcome bonus 0; เป้าหมาย 50; ยอดซื้อสะสม 2,500 บาท
- unpaid/cancelled/refunded/reused transaction→0 และไม่มี state ซ้ำ
- duplicate event/receipt ไม่เพิ่มแต้มซ้ำ
- exact reward เท่ากับ `ตุ๊กตามะลิจัง 1 ตัว`; generic reward หรือ COGS >25 บาทต้อง fail validation
- expired/used Voucher และ reward unavailable ต้อง fail closed ไม่เลือกของแทน

### QR/access

- One Time QR ผูกกับ 1 paid receipt, หมดสิทธิ์หลัง 10 นาทีและใช้ซ้ำไม่ได้
- 30 วันแรก actor ต้องเป็น Owner หรือ Shift lead ที่ authenticated และอยู่ใน allowlist
- unauthorized, revoked, expired session และ shared-account path ถูกปฏิเสธและ audit แบบ redacted
- ไม่มี QR value/image หรือ customer identity เต็มใน source/log

### Business data/customer response

- response ทุกหมวด trace กลับไปยัง manifest version/approval/effective dates ได้
- stale/missing/conflicting/`TEST_SEED` data ต้องไม่ตอบลูกค้า
- stock, allergen และ promotion ที่ไม่ยืนยันต้อง handoff/fail closed
- ไม่มี TEST URL/resource/credential marker ใน Production package

### Reliability/security

- LINE signature verification แบบ constant-time, account guard, idempotency และ persistence fail closed
- rollback/failure/load/retry tests ผ่านจาก frozen commit
- formatting, ESLint, TypeScript, tests, build, validators, dry-run, dependency audit, secret scan และ `git diff --check` ผ่าน
- retention enforcement: Worker logs 7 วัน, reconciliation 90 วัน, config/incident 365 วัน; deletion/access review มีหลักฐาน

## Proposed rollout runbook — รอ Owner กำหนดวัน/เวลา

เงื่อนไขก่อนเริ่ม: Owner อยู่หน้างาน, Technical operator และ Shift lead พร้อม, stable Worker/Rich Menu targets ถูก capture, rollback rehearsal ผ่าน, native response collision plan ผ่าน และ Owner พิมพ์ `GO` สำหรับ frozen commit/change window

| เวลา | การกระทำ/จุดตรวจ                                                                              | GO เมื่อ                                    | STOP/rollback เมื่อ                                                          |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| T-30 | ตรวจ account identity, frozen hashes, secret bindings แบบไม่แสดงค่า, staff roster, dashboards | ทุก guard/check PASS                        | ชื่อบัญชี/credential/resource ไม่ชัดหรือไม่ใช่ Production package ที่อนุมัติ |
| T+0  | เริ่ม 30 นาทีช่วงลูกค้าน้อยตามลำดับ change package                                            | Owner ยืนยันเริ่ม                           | Owner ไม่อยู่หรือ rollback target ไม่พร้อม                                   |
| T+5  | health, signature, duplicate, native/Webhook collision, error/persistence                     | ไม่มี duplicate/PII/error threshold         | duplicate 1 ครั้ง, account guard reject, secret/PII หรือ state failure       |
| T+15 | customer response/handoff และ QR transaction ที่อนุมัติ                                       | response เดียว, actor/receipt/audit ถูกต้อง | unauthorized QR, QR reuse หรือ point variance                                |
| T+30 | Owner ตัดสิน GO/ROLLBACK                                                                      | acceptance criteria ครบ                     | ข้อใดไม่ผ่านหรือหน้างานรับภาระไม่ไหว                                         |

ช่วงเฝ้าดูหลัง 30 นาทีและ alert thresholds ยังต้อง Owner อนุมัติใน OD-10/OD-11

## Rollback runbook ที่เสนอ

Owner เป็นผู้ประกาศ `STOP`; Technical operator เป็นผู้ execute; Shift lead หยุดออก QR และเก็บยอด reconciliation

1. หยุดออก One Time QR และการแลก Voucher ใหม่; เก็บเฉพาะ redacted incident timestamp/reference
2. ปิดเส้นทาง Webhook/automation ตาม exact approved control เพื่อกลับสู่ manual customer service
3. restore Rich Menu เดิมจาก captured target/hash; ห้ามชี้ TEST หรือ Reward Card TEST
4. rollback Worker ไป stable version ที่บันทึกไว้
5. ตรวจ health/signature/response collision และยืนยัน manual chat path
6. reconcile Durable Object/KV/D1 state แยก เพราะ Worker rollback ไม่ย้อน storage state
7. preserve evidence ตาม retention, revoke/rotate เฉพาะ credential ที่ได้รับผลกระทบตาม incident approval
8. การ suspend/terminate Reward Card กระทบผู้ถือบัตรและอาจย้อนกลับไม่ได้ จึงต้องมี Owner confirmation แยก เว้นแต่ policy/platform รองรับ reversible disable ที่พิสูจน์ไว้แล้ว

Proposed maximum decision-to-disable-automation: 5 นาที; Owner ยังต้องอนุมัติค่าจริงและ backup executor

## Immediate rollback triggers ที่เสนอ

- account/environment guard ชี้ผิด, Production/Test resource ปะปน หรือ credential provenance พิสูจน์ไม่ได้
- secret/PII/QR value ปรากฏใน log/output
- duplicate customer reply ที่ยืนยันแล้ว 1 ครั้ง
- unauthorized QR, QR reuse, duplicated receipt หรือ point variance ที่อธิบายไม่ได้ 1 รายการ
- persistence ไม่พร้อมจน idempotency/handoff/receipt ledger fail closed ไม่ได้
- native auto-response และ webhook ตอบชนกัน
- Owner สั่งหยุดหรือหน้างานไม่สามารถควบคุม QR/reconciliation ได้

## Evidence blockers ก่อน combined Production approval

1. ยืนยัน COGS ตุ๊กตามะลิจังไม่เกิน 25 บาทด้วยหลักฐาน
2. ยืนยัน LINE rolling expiry/10-minute QR/multi-point QR/60-day Voucher capability แบบ read-only
3. authoritative values/sources ที่ยังขาดใน OD-07B
4. named allowlists/backup/auditor และ Production plan ที่รองรับ retention
5. stable targets, Production-shaped rollback rehearsal และ resource identity capture

## ข้อความอนุมัติขั้นถัดไป

ใช้ combined approval wording ใน `PRODUCTION_FINAL_GO_NO_GO_PACK_TH.md` หลัง evidence blockers ผ่านครบเท่านั้น

## แหล่งอ้างอิงทางเทคนิค

- LINE Reward Card/One Time QR: <https://help2.line.me/official_account_th/web/categoryId/20006372/3/pc?lang=th>
- Cloudflare Workers rollback: <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- Cloudflare Workers Logs: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- Cloudflare Workers best practices: <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>
