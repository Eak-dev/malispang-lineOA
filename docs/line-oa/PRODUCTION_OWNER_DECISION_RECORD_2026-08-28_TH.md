# Production Owner Decision Record — 28 สิงหาคม 2026

บัญชีเป้าหมายในอนาคต: `มะลิปัง`

สถานะ: `CONDITIONAL_EXECUTION_APPROVED / READ_ONLY_GATE_NO-GO / ACTIVATION_NOT_STARTED`

## ขอบเขตการอนุมัติ

Owner อนุมัติค่าตั้งต้นเชิงนโยบายด้านแต้ม รางวัล การออก QR แหล่งข้อมูล บทบาท retention และ rollout ตามเอกสารนี้ การอนุมัตินี้ **ไม่อนุญาต** ให้เปิด Production, สร้าง/แก้ Reward Card, deploy, เพิ่ม secret, เปลี่ยน Webhook/Rich Menu หรือส่งข้อความ การลงมือทำต้องผ่านแผนและ Owner approval รอบสุดท้ายก่อน

Owner อนุมัติ conditional execution จาก frozen commit `5b204f1c7aecc69c76577fea025e40979c73a115` ภายหลัง โดยบังคับให้หยุดเมื่อ gate ใดไม่ผ่าน ผล read-only gate วันที่ 28 สิงหาคม 2026 คือ `NO-GO`: COGS ผ่าน แต่ rolling first-use semantics, QR 10 นาที, multi-point One Time QR, Voucher 60 วัน และ existing Published card policy ไม่ผ่าน จึงไม่มี external write/deploy/UAT ดู `PRODUCTION_EXECUTION_GATE_RESULT_2026-08-28_TH.md`

## ค่าที่อนุมัติ

| หัวข้อ                        | ค่า Production baseline                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| อัตราแต้ม                     | ทุก 50 บาทจากยอดสุทธิหลังส่วนลด = 1 แต้ม                                    |
| การปัดเศษ                     | `floor(ยอดสุทธิ ÷ 50)`; เศษไม่สะสมข้ามใบเสร็จ                               |
| เป้าหมาย                      | 50 แต้ม = ยอดซื้อสะสม 2,500 บาท                                             |
| รางวัล                        | `ตุ๊กตามะลิจัง 1 ตัว`                                                       |
| เพดานต้นทุน                   | ต้นทุนจริงไม่เกิน 25 บาทต่อรางวัล หรือไม่เกิน 1% ของยอดซื้อ 2,500 บาท       |
| อายุบัตร                      | 12 เดือนนับจากวันที่ลูกค้ารับบัตร                                           |
| อายุ Voucher                  | 60 วันหลังได้รับ                                                            |
| Welcome bonus / Reminder      | 0 แต้ม / ไม่มี reminder ในรอบแรก                                            |
| Cooldown                      | ไม่มี daily cooldown; ได้แต้มทุกใบเสร็จที่เข้าเกณฑ์                         |
| QR                            | One Time QR ต่อ 1 ใบเสร็จ; ใช้ได้ 10 นาที                                   |
| ผู้มีสิทธิ์ออก QR ช่วงเปิดตัว | 30 วันแรก: Owner หรือ Shift lead เท่านั้น                                   |
| บิลที่ไม่มีสิทธิ์             | ยังไม่ชำระ, ยกเลิก, คืนเงิน หรือ transaction/QR ถูกใช้ให้แต้มแล้ว           |
| Source of truth               | versioned manifest ใน repository สำหรับราคา เมนู เวลา โปรโมชั่น และกติกา    |
| Retention                     | Worker logs 7 วัน; reconciliation 90 วัน; config/incident 365 วัน           |
| Rollout                       | 30 นาทีช่วงลูกค้าน้อย; Owner อยู่หน้างาน; rollback target พร้อมก่อนเริ่ม    |
| Incident roles                | Owner ตัดสินใจหยุด; Technical operator แก้ระบบ; Shift lead ตรวจยอดและออก QR |

## ตัวอย่างที่เป็น acceptance criteria

|                ยอดสุทธิที่เข้าเกณฑ์ | แต้ม |
| ----------------------------------: | ---: |
|                            0–49 บาท |    0 |
|                              50 บาท |    1 |
|                              99 บาท |    1 |
|                             100 บาท |    2 |
|         โปร 3 ชิ้น ยอดสุทธิ 100 บาท |    2 |
|                             249 บาท |    4 |
| 2,500 บาทสะสมจากใบเสร็จที่เข้าเกณฑ์ |   50 |

สูตรต้นทุนสูงสุด: `25 ÷ 2,500 × 100 = 1.00%`

## กติกาห้ามตีความ

- รางวัลต้องแสดงชื่อ `ตุ๊กตามะลิจัง 1 ตัว` ไม่ใช้ถ้อยคำกว้าง เช่น “สินค้าไม่เกิน 39 บาท” หรือ “รางวัลอื่นตามที่พนักงานเลือก”
- หาก Owner ต้องการเปลี่ยนรางวัล ต้องประกาศชื่อรางวัลใหม่, ยืนยัน COGS ไม่เกิน 25 บาท, สร้าง manifest version ใหม่ และอนุมัติก่อนมีผล พนักงานห้ามแทนรางวัลเอง
- หากตุ๊กตามะลิจังไม่มี stock ให้ fail closed/ส่งต่อ Owner; ห้ามสัญญาของแทนและห้าม mark Voucher used ก่อนส่งมอบจริง
- รายชื่อเมนูไม่ใช่ข้อมูล stock ปัจจุบัน และ promotion ที่ไม่มี record `APPROVED` ซึ่งยังมีผลต้องไม่แสดง
- QR ที่หมดเวลา, ใช้แล้ว, ไม่มีใบเสร็จ paid หรือ actor ไม่มีสิทธิ์ ต้องให้ 0 แต้มและมี redacted audit outcome

## Technical feasibility gates ก่อนสร้าง Production

เอกสาร LINE ยืนยันว่า One Time QR แสดงผ่านแอป Manager และไม่สามารถพิมพ์ แต่ยังไม่มีหลักฐานใน repository ว่า native UI รองรับทุกนโยบายต่อไปนี้ จึงต้องตรวจแบบ read-only ก่อนสร้าง:

1. อายุบัตรแบบ rolling 12 เดือนนับจากวันที่ลูกค้าแต่ละรายรับบัตร
2. อายุ One Time QR ที่กำหนดได้แน่นอน 10 นาที
3. การออกหลายแต้มตาม `floor(ยอดสุทธิ/50)` ใน One Time QR หนึ่งครั้ง
4. การบังคับ actor เป็น Owner/Shift lead และ audit actor แยกรายคน
5. วิธี reverse/adjust แต้มหลังคืนเงินโดยไม่สร้างช่องทางทุจริต

หาก LINE ไม่รองรับข้อใด ให้กลับมาเสนอทางเลือกต่อ Owner ห้ามเปลี่ยนนโยบายเองหรือใช้ printable/static QR แทน

## Safe defaults ที่ Codex ปิดแทนคำถามย่อย

- 1 Voucher ต่อ 1 ใบเสร็จ, ไม่แลกเงินสด/เงินทอน, ไม่ stacking, ไม่ได้แต้มจากมูลค่า Voucher และ mark used หลังส่งมอบตุ๊กตาจริง
- Refund/cancel หลังให้แต้มต้องบันทึก reconciliation และ Owner อนุมัติ; staff ห้ามแก้แต้มเอง
- หลัง 30 วันยังคงให้เฉพาะ Owner/Shift lead ออก QR จนมี policy version ใหม่
- หมวด business data ที่ไม่มีหลักฐานอยู่สถานะ `BLOCKED`; ไม่สร้าง customer-facing value
- ใช้ monitoring/rollback thresholds จาก `config/production-readiness/monitoring-thresholds.json`
- ใช้ event-based rollout 30 นาที, observation 120 นาที และ decision-to-disable target 5 นาที

## Evidence blockers ที่ safe default ทดแทนไม่ได้

- LINE 10-minute QR/multi-point One Time QR/60-day Voucher capability
- existing Published card มี reward label/additional reward/Reminder/printable QR ขัด policy
- authoritative values/sources จริง
- Production resource/stable rollback capture, named allowlists, platform retention และ rollback rehearsal

## Mapping กับ Owner Decision Pack

- อนุมัติครบเป็น baseline: OD-01, OD-02, OD-03A, OD-03B, OD-04B, OD-05A, OD-05B, OD-07A, OD-09
- อนุมัตินโยบายแต่รอตรวจ technical feasibility: OD-04A, OD-05C, OD-06A
- อนุมัติ safe defaults แล้วแต่ยังมี execution evidence blockers: OD-03C, OD-06B, OD-06C, OD-07B, OD-08, OD-10, OD-11
- conditional Owner execution approval ได้รับแล้ว แต่ gate result เป็น NO-GO: OD-12

## ผลต่อ Issues

- Issue #8: source-of-truth design ได้ข้อสรุป แต่ยังเปิดเพราะ authoritative values/sources ยังไม่ครบและยังไม่มี approved-only implementation/UAT
- Issue #4: role/retention baseline ได้ข้อสรุป แต่ยังเปิดเพราะ auth lifecycle, monitoring, runbook และ failure tests ยังไม่ครบ
- Issue #5: rollout baseline ได้ข้อสรุป แต่ยังเปิดเพราะ feasibility, separate Production design, final plan approval, rollback rehearsal และ go/no-go ยังไม่ครบ

## หลักฐานและข้อจำกัด

- Owner decision: ข้อความใน Codex thread วันที่ 28 สิงหาคม 2026 (Asia/Bangkok)
- LINE Reward Card help: <https://help2.line.me/official_account_th/web/categoryId/20006372/3/pc?lang=th>
- Cloudflare Workers Logs: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>
- Cloudflare rollback: <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- Production `มะลิปัง` ไม่ถูกเปิดหรือเปลี่ยนระหว่างการบันทึก decision นี้
