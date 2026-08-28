# แผนโครงการ MalisPang LINE OA

## หลักควบคุม

ทุก phase ใช้ Test/Mock ก่อน แยกจาก Production และระบบพนักงาน ห้าม live action จนได้รับอนุมัติชัดเจนเป็นรายขั้น

## Phase 0 — Audit และออกแบบ

ผลลัพธ์: แยก verified/reported/unknown, รวม specification, สร้าง UAT baseline และรายการ owner decisions
เสร็จเมื่อ: เอกสารชุดนี้ครบและไม่มีการแก้ live system

## Phase 1A — FAQ + Handoff

สถานะ ณ 28 สิงหาคม 2026: **TEST LIVE UAT PASS** — webhook, Rich Menu, เมนูรูปภาพ, human handoff, bot silence และ Reward Card entry point ผ่านบน `มะลิปัง TEST`; ข้อมูล FAQ ธุรกิจยังเป็น `TEST_SEED`

ขอบเขต:

- รับ mock LINE event, ตรวจ duplicate, route intent ตามลำดับ
- ตอบเฉพาะ FAQ/menu/price/location/opening/storage/wholesale ที่ `APPROVED` และยังมีผล
- fallback แบบไม่ขอโทษโดยไม่จำเป็น
- `HUMAN_HANDOFF`: acknowledge ครั้งเดียว แล้ว silence จน staff close

Acceptance criteria:

- FAQ ที่อนุมัติคืนข้อความตรงเวอร์ชัน โดยไม่ต้องพนักงาน
- ข้อมูลไม่มี/หมดอายุส่ง neutral fallback หรือ handoff ไม่สร้างคำตอบ
- event ซ้ำไม่ทำให้ตอบซ้ำ
- handoff active ห้าม greeting/FAQ/fallback แทรก
- ใช้ mock adapters และไม่มี Production credential path

## Phase 1B — Staff-assisted Availability

ขอบเขต:

- สร้าง request แบบ idempotent จากคำถามสต็อก
- รองรับ `AVAILABLE`, `LOW_STOCK`, `SOLD_OUT`, `UNKNOWN_NEEDS_PHYSICAL_CHECK`
- บันทึกจำนวนเมื่อเกี่ยวข้อง ผู้ยืนยัน เวลา และ expiry
- ตอบลูกค้าหลังการยืนยันที่ยังสดเท่านั้น; ออกอายุ/timeout อย่างปลอดภัย

Acceptance criteria:

- ไม่เดาหรือประมาณจำนวน
- stale/unknown สร้าง request ไม่ใช้ record เดิม
- staff response ที่ late/invalid ไม่ถูกส่งอัตโนมัติ
- duplicate message/request ไม่สร้างงานซ้ำ
- audit trail ไม่มีเนื้อหาลูกค้าเกินจำเป็น

## Phase 1C — Draft Order/Quote

ขอบเขต:

- เก็บชื่อ สินค้า/ไส้ จำนวน วัน เวลา/ช่วงเวลา วิธีรับ สาขา packaging/sticker
- คำนวณ subtotal/fees/grand total ด้วย integer satang หรือ fixed decimal เท่านั้น
- แสดงสรุปพร้อมขอให้ลูกค้าตรวจ; แก้ไขแล้วคำนวณใหม่
- คงสถานะ `DRAFT`

Acceptance criteria:

- summary มี required fields ครบหรือถามเฉพาะช่องที่ขาด
- LLM ไม่คำนวณยอดสุดท้าย
- ไม่สัญญาสต็อก ไม่จอง ไม่ยืนยันกำลังผลิต/ออเดอร์ ไม่ขอชำระ และไม่ตรวจสลิป
- duplicate/retry ไม่สร้าง draft หรือ reply ซ้ำ

## Phase 2–4 (ขอบเขตเท่านั้น)

- Phase 2: order/revision/payment state, immutable quote/payment history, manual slip review, deposit policy
- Phase 3: controlled catalog/inventory integration, dashboard, monitoring/reconciliation; แยก HR/finance employee data
- Phase 4: internal Test OA UAT, readiness, rollback และ owner approval ก่อน live action

## Phase 6 — Rich Menu และ Reward Card TEST

สถานะ ณ 28 สิงหาคม 2026: **PASS เฉพาะ TEST**

- Rich Menu TEST เป็น current menu และ Owner UAT ผ่าน
- Reward Card `บัตรแต้ม TEST` แยกจาก Production, live UAT รับบัตรและเพิ่ม 1 แต้มผ่าน
- URL จริงเก็บใน encrypted `TEST_REWARD_CARD_URL`; ไม่อยู่ใน Git
- ผลนี้ไม่อนุญาตให้ reuse บัตร, URL, Worker, credential หรือ state ใน Production

## Phase 7 — Production readiness และ controlled rollout

สถานะ ณ 28 สิงหาคม 2026: **NO-GO / READ-ONLY REVIEW COMPLETE**

- รายงานหลัก: `docs/line-oa/PRODUCTION_READINESS_REVIEW_TH.md`
- Production ไม่ถูกเปิดหรือเปลี่ยนแปลงระหว่าง review
- ต้องปิด authoritative-data, Reward Card/QR/audit, separate infrastructure, rollback และ Owner approval gates ก่อน external Production action
- GitHub Issue #5 ต้องคงเปิด; review นี้ไม่ใช่สิทธิ์ deploy หรือเปลี่ยน Production

## Success targets รอเจ้าของอนุมัติ

- FAQ ทั่วไปตอบจากข้อความที่อนุมัติได้
- ไม่สร้าง stock/price/promotion/branch/payment/allergy data
- availability ระบุ status/quantity และเวลา
- quote math deterministic
- duplicate ไม่สร้าง reply/request ซ้ำ
- handoff active ไม่มี bot reply
- isolated Test design ไม่ก่อ Production/employee regression

## ลำดับ implementation ที่แนะนำ

เริ่ม **Phase 1A vertical slice: mock webhook event → idempotency gate → handoff guard → approved FAQ lookup → safe fallback → audit event** พร้อม automated tests ก่อนทำ stock หรือ draft order เพราะเป็นแกนความปลอดภัยที่ทุก increment ใช้ร่วมกัน
