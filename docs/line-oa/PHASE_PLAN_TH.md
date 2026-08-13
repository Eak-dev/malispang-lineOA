# แผนโครงการ MalisPang LINE OA

## หลักควบคุม

ทุก phase ใช้ Test/Mock ก่อน แยกจาก Production และระบบพนักงาน ห้าม live action จนได้รับอนุมัติชัดเจนเป็นรายขั้น

## Phase 0 — Audit และออกแบบ (งานปัจจุบัน)

ผลลัพธ์: แยก verified/reported/unknown, รวม specification, สร้าง UAT baseline และรายการ owner decisions
เสร็จเมื่อ: เอกสารชุดนี้ครบและไม่มีการแก้ live system

## Phase 1A — FAQ + Handoff

สถานะ ณ 14 สิงหาคม 2026: **Local foundation implemented; ยังไม่เชื่อม Test OA**

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
