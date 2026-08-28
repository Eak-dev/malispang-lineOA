# Production security, monitoring, incident and reconciliation runbook

จัดทำ: 28 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `LOCAL_DESIGN_COMPLETE / EXTERNAL_CONFIGURATION_NOT_CREATED / PRODUCTION_NO-GO`

## Configuration sources

- Production configuration: `config/production-readiness/production-configuration-manifest.json`
- Business data: `config/production-readiness/production-business-manifest.json`
- Secret inventory (names only): `config/production-readiness/secret-inventory.json`
- Role matrix: `config/production-readiness/role-matrix.json`
- Monitoring thresholds: `config/production-readiness/monitoring-thresholds.json`
- Stable/rollback targets: `config/production-readiness/stable-version-record.json`

ไม่มี resource, ID, URL value, QR, token หรือ secret จริงถูกสร้าง/อ่าน/บันทึกใน package นี้

## Role matrix

| Action                            | Owner                     | Technical operator            | Shift lead                 |
| --------------------------------- | ------------------------- | ----------------------------- | -------------------------- |
| ตัดสินใจ GO/STOP                  | Accountable               | Consulted/execute             | emergency pause + escalate |
| เปลี่ยน business/reward policy    | Approve                   | ไม่อนุมัติ                    | ไม่อนุมัติ                 |
| Deploy/rollback                   | อนุมัติตาม frozen package | execute เฉพาะ change window   | ไม่ทำ                      |
| ตรวจ paid receipt/ออก One Time QR | ทำได้                     | ไม่ทำ                         | ทำได้                      |
| Refund หลังออกแต้ม                | อนุมัติ reconciliation    | implement approved adjustment | บันทึก/ส่งต่อ; ห้ามแก้แต้ม |
| ตรวจยอด                           | Accountable               | ช่วยด้านระบบ                  | Responsible รายกะ          |

Fail-closed default หลังวันเปิดตัว 30 วัน: ยังคงให้เฉพาะ Owner/Shift lead ออก QR จน Owner อนุมัติ role policy version ใหม่ ไม่ขยายสิทธิ์อัตโนมัติ Shared account ถูกห้าม

## Monitoring defaults

- Structured redacted logs เท่านั้น; ไม่เก็บ raw message, customer ID, QR value/image, slip, token/secret, เบอร์หรือที่อยู่เต็ม
- Sampling 100% เฉพาะ 30-minute rollout และ observation 120 นาที โดยต้องตรวจ plan/cost ก่อน activation
- Rollback ทันทีเมื่อ account guard ผิด, duplicate reply, secret/PII/QR ใน log, unauthorized QR/receipt reuse หรือ unexplained point variance อย่างละ 1 ครั้ง
- Persistence/LINE reply: alert ครั้งแรก; rollback เมื่อ 3 ครั้งติดหรือ error rateเกิน 1% ใน 5 นาที
- Handoff: alert เมื่อ oldest เกิน 15 นาทีหรือ active เกิน 5; Owner ตัดสิน pause หากพนักงานไม่พอ
- Decision-to-disable target: ไม่เกิน 5 นาที
- Retention: Worker logs 7 วัน, reconciliation 90 วัน, config/incident 365 วัน

Cloudflare Workers Logs documentation (ตรวจ 28 สิงหาคม 2026) ระบุ retention สูงสุด 7 วันและขึ้นกับ plan; ต้องยืนยันว่า Production account รองรับ 7 วันโดยไม่เปลี่ยนแผน/เกิดค่าใช้จ่ายที่ยังไม่อนุมัติ หากไม่รองรับให้คง `WORKER_LOG_RETENTION_BLOCKER`

## Point and refund reconciliation

ต่อรายการเก็บเฉพาะ pseudonymous receipt reference, net eligible amount, points, actor role, issued/expiry/outcome timestamps และ policy/config version

1. Shift lead ตรวจว่าใบเสร็จ paid และยังไม่เคยให้แต้ม
2. แต้ม = `floor(net after discount / 50)`; ไม่รวมมูลค่าที่ใช้ Voucher/ส่วนลดชำระ
3. ออก One Time QR เพียงหนึ่งรายการต่อใบเสร็จหลัง capability gate ผ่าน
4. QR/receipt duplicate ต้องเป็น 0 แต้มและ audit reason
5. คืนเงินหลังให้แต้ม: บันทึก `OWNER_RECONCILIATION_REQUIRED`; ห้าม staff ปรับแต้ม
6. Owner ตรวจหลักฐานและอนุมัติ adjustment; technical operator ทำเฉพาะวิธีที่ LINE รองรับและบันทึก outcome
7. variance ใด ๆ ต้อง resolve ก่อนปิดกะ; unresolved variance 1 รายการหยุด QR และเปิด incident

Safe Voucher defaults: 1 Voucher ต่อ 1 ใบเสร็จ, ห้ามแลกเงินสด/เงินทอน, ห้าม stacking กับ promotion/Voucher อื่น, ไม่ได้แต้มจากมูลค่าที่ชำระด้วย Voucher และ mark used ต่อหน้าพนักงานหลังส่งมอบตุ๊กตาจริงเท่านั้น หากตุ๊กตาไม่มีให้หยุด/ส่ง Owner ห้ามให้ของแทน

## Incident runbook

1. Shift lead หยุดออก QR และแจ้ง Owner/Technical operator
2. Owner ประกาศ `STOP`; บันทึกเวลาตัดสินใจแบบ redacted
3. Technical operator disable automation ตาม exact approved control ภายใน 5 นาที
4. คืน native/manual customer-service path และ Rich Menu rollback target ที่ capture ไว้
5. Rollback Worker ไป stable version ที่บันทึก
6. ตรวจ health, signature, collision และ manual chat
7. Reconcile Durable Object/state แยก เพราะ code rollback ไม่ย้อน storage
8. preserve evidence ตาม retention; rotate/revoke เฉพาะกรณี credential ได้รับผลกระทบ
9. Suspend Reward Card เฉพาะเมื่อ Owner ยืนยันผลกระทบที่ย้อนกลับไม่ได้ ณ เวลาดำเนินการ

Cloudflare Workers Rollbacks documentation (ตรวจ 28 สิงหาคม 2026) ระบุว่า rollback เปลี่ยน active Worker version แต่ไม่ย้อน storage resources/state และบาง Durable Object lifecycle changes อาจขวาง rollback จึงต้อง freeze schema และใช้ forward-compatible migration

## Rollout window

- Event-based window: 30 นาทีในช่วงลูกค้าน้อย เริ่มเมื่อ Owner อยู่หน้างานและพิมพ์ `GO` สำหรับ frozen commit/change package
- Executor: Technical operator; QR/reconciliation: Shift lead; STOP authority: Owner
- Checkpoints: T-30, T+0, T+5, T+15, T+30; observation ต่อ 120 นาที
- ไม่มีวัน/เวลา calendar ใน package เพราะยังไม่อนุญาต Production action; Owner final approval ต้องระบุหรือยืนยัน event-based window นี้
- Stable Worker/Rich Menu/response setting targets ยังเป็น `PENDING_READ_ONLY_PRODUCTION_CAPTURE`; ถ้า capture ไม่ครบห้ามเริ่ม
