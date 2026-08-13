# Phase 1 Build-ready Specification

สถานะ: Design only — ยังไม่มี implementation หรือ live connection

## 1. สถาปัตยกรรมแยกส่วน

องค์ประกอบที่เสนอ:

1. LINE ingress adapter (Phase 1 ใช้ fixture/mock; live adapter ปิด)
2. Event idempotency store
3. Conversation state (`BOT_ACTIVE`, `HUMAN_HANDOFF`)
4. Intent/router และ policy engine
5. Versioned FAQ/product/promotion repositories
6. Availability request service และ mock staff adapter
7. Draft order service และ deterministic money calculator
8. Outbox สำหรับ reply แบบ idempotent
9. Redacted audit log

ห้าม import หรือ share runtime/data store กับ Attendance, Expense, payroll หรือ HR หากพบ coupling ให้หยุดและแยก service boundary ก่อน

## 2. Routing priority

ประมวลผลตามลำดับตายตัว:

1. ตรวจ environment/credential guard: Test/Mock เท่านั้น
2. ตรวจ signature ใน live adapter ในอนาคต; fixture ระบุว่า verified mock
3. deduplicate ด้วย `line_event_id` หรือ hash ที่กำหนดเมื่อ ID ไม่มี
4. ถ้า `HUMAN_HANDOFF`: รับเฉพาะ authorized staff-close event; customer event อื่นไม่ส่งข้อความ
5. คำขอคุยพนักงาน: ส่ง acknowledgement ครั้งเดียวและตั้ง handoff
6. safety intent: payment slip, allergy/medical, complaint/urgent → ข้อความที่อนุมัติและ/หรือ handoff
7. availability intent
8. draft order/correction intent
9. exact approved FAQ intent
10. ambiguous/out-of-scope fallback

Greeting ต้องไม่แทรก handoff และไม่ตอบเพิ่มเมื่อมีคำตอบ intent แล้ว

## 3. FAQ และ fallback

- อ่านเฉพาะ record `APPROVED`, `effective_start <= now < effective_end` (ถ้า end มีค่า) และสาขาตรงกัน
- price/menu/promotion/loyalty/branch/opening ต้องมาจาก domain ที่กำหนด ไม่ดึงจาก chat history
- หาก source ใช้ไม่ได้/ไม่อนุมัติ: ห้ามตอบค่าที่จำได้ ให้แจ้งว่ากำลังตรวจสอบหรือเสนอส่งต่อพนักงานตามข้อความอนุมัติ
- fallback ตัวอย่าง: `ขอข้อมูลเพิ่มเติมอีกนิดได้ไหมคะ เช่น ชื่อสินค้าหรือวันที่ต้องการรับสินค้า`
- หลีกเลี่ยง “ขออภัย” เว้นแต่เป็น complaint/error ที่ข้อความอนุมัติกำหนด

## 4. Human handoff

State fields: `conversation_key`, `state`, `opened_at`, `opened_reason`, `ack_event_id`, `closed_at`, `closed_by`
Acknowledgement seed: `รับทราบค่ะ กำลังส่งเรื่องให้พนักงานดูแลนะคะ`

- transition ต้อง atomic; acknowledge ผ่าน outbox key `handoff_ack:{conversation_key}:{handoff_version}`
- customer retry/repeated message ระหว่าง active handoff ไม่สร้าง acknowledgement ใหม่
- bot component ทุกตัวต้องตรวจ handoff guard ก่อนสร้าง reply
- ปิดได้เฉพาะ staff identity ที่ authorize ใน mock allowlist; หลังปิด event ใหม่จึงกลับสู่ automation

## 5. Availability workflow

### Request schema

`request_id`, `conversation_key` (pseudonymous), `product_id`, `branch_id`, `business_date`, `status`, `created_at`, `expires_at`, `source_event_id`, `staff_channel_ref` (mock), `resolved_at`

Request state: `PENDING → RESOLVED | EXPIRED | CANCELLED`; transition แบบ compare-and-set
Response: `availability_status`, `confirmed_quantity` (required for AVAILABLE/LOW_STOCK), `confirmed_by`, `confirmed_at`, `expires_at`, `note_code`

### Rules

- fresh เมื่อเวลา server อยู่ระหว่าง `confirmed_at` และ `expires_at`, branch/date/product ตรง และ status valid
- ค่า maximum stock age และ request timeout เป็น configuration ที่ owner ต้องอนุมัติ; ห้าม hard-code เพื่อใช้งานจริง
- record stale/unknown/ไม่มี: สร้าง request; ส่ง waiting text ที่อนุมัติได้เพียงครั้งเดียว
- staff ตอบ `UNKNOWN_NEEDS_PHYSICAL_CHECK`: ไม่ตีความเป็น available
- response หลัง request หมดอายุเก็บ audit ได้แต่ไม่ส่งอัตโนมัติ; ต้องสร้าง request ใหม่
- timeout: mark `EXPIRED`, ส่ง timeout text ตาม policy เพียงครั้งเดียว หรือ handoff; ห้ามบอกว่ามี/ไม่มีสินค้า
- quantity เป็น integer `>= 0`; `SOLD_OUT` ต้อง quantity 0 หรือ null ตาม schema decision เดียวกัน

Idempotency key: `availability:{conversation_key}:{source_event_id}:{product_id}:{branch_id}:{business_date}`

## 6. Draft order/quote

### Schema

`draft_id`, `conversation_key`, `customer_name`, `items[] {product_id, display_name_snapshot, filling, quantity, unit_price_satang, line_total_satang}`, `pickup_date`, `pickup_time_window`, `pickup_method`, `pickup_branch_id`, `packaging_request`, `sticker_request`, `fees[] {code, label, amount_satang}`, `subtotal_satang`, `grand_total_satang`, `currency=THB`, `status=DRAFT`, `catalog_version`, `revision`, timestamps

### Calculation boundary

- `line_total = unit_price_satang × quantity`
- `subtotal = sum(line_total)`
- `grand_total = subtotal + sum(fees)`
- ใช้ signed 64-bit integer satang, validate nonnegative, quantity integer, overflow และ catalog version
- calculator รับ structured inputs เท่านั้นและคืน structured result; LLM มีหน้าที่สกัด/ถาม/เรียบเรียง แต่ห้ามกำหนดราคา/ค่าธรรมเนียมหรือยอด
- correction สร้าง draft revision ใหม่ภายใน Phase 1 store; ห้ามแก้ amount โดยข้อความอิสระ

Summary ต้องมี: ชื่อลูกค้า สินค้า/ไส้ จำนวน วันรับ เวลา/ช่วงเวลา วิธีรับ สาขา packaging/sticker subtotal fees grand total และคำขอให้ตรวจยืนยันข้อมูล ทั้งหมดต้องระบุชัดว่าเป็น **ร่าง** ไม่ใช่การยืนยันออเดอร์

หากข้อมูลขาด ถามเฉพาะช่องที่จำเป็น หาก catalog/fee ไม่มีหรือหมดอายุ หยุด calculation และส่งต่อพนักงาน ไม่ใช้ราคาเดิม Phase 1 จะไม่รับรอง stock, reserve, capacity, order, payment หรือ slip

## 7. Source-of-truth และ approval

ทุก domain มี `version`, `status`, `effective_start/end`, `approved_by`, `approved_at`, `source_ref`; runtime อ่านเฉพาะ version ที่ publish สำหรับ Test environment การ publish/live connection อยู่นอก Phase 1 task

ห้ามใช้ historical chat/order เป็น source of truth วันที่ pickup ในอดีตต้องถูกมองเป็น historical/context และห้ามสร้าง availability request หรือ draft ปัจจุบันโดยอัตโนมัติ

## 8. Idempotency, retry, timeout

- inbox บันทึก unique `event_id`; processing และ outbox write อยู่ transaction เดียวกันเมื่อทำได้
- outbox มี unique `reply_key`; retry network ใช้ exponential backoff + jitter และจำนวนครั้งจำกัด
- timeout ไม่ทำให้ fallback ซ้ำ; failed reply อยู่ `FAILED_REVIEW` หลัง retry limit
- repeated customer text ที่ event ID ต่างกัน: ใช้ short dedupe window/fingerprint เฉพาะ action ที่มี side effect; policy/window รอ owner อนุมัติ ข้อความใหม่ที่ตั้งใจแก้จำนวนต้องไม่ถูกกลืน
- timestamp ใช้ UTC ภายใน และแสดง Asia/Bangkok; business date อ้างอิงสาขา

## 9. Audit, privacy, logging

เก็บ: event ID hash, pseudonymous conversation ID, intent, policy/version, state transition, request/draft ID, outcome/error code, actor ID แบบ pseudonymous และ timestamp
ไม่เก็บโดย default: raw message, ชื่อ/เบอร์, address, token/secret/signature, รูป/สลิป หรือ payment detail
หากจำเป็นต้องเก็บข้อความเพื่อ debug ต้อง opt-in, redact, จำกัดสิทธิ์/เวลา และมี audit access ห้าม log header/body ดิบ

## 10. Mock-data design และ failure behavior

- fixtures ใช้ `CUST-TEST-*`, `STAFF-TEST-*`, สินค้า `TEST-*`, จำนวน/ราคา/สลิปปลอม และวันที่อนาคตคงที่
- mock adapters ต้อง fail closed หากพบ Production channel ID/token pattern หรือ environment ไม่ใช่ test
- catalog/FAQ unavailable: safe fallback/handoff
- promotion expired: ไม่แสดง promotion
- availability unavailable: request/timeout เท่านั้น ไม่บอก stock
- calculator error: ไม่แสดงยอดและส่ง review
- audit/outbox persistence unavailable: ไม่ตอบแบบ best-effort ที่อาจซ้ำ; queue/fail closed

## 11. Non-goals

ไม่มี live OA configuration, production credentials, payment/slip verification, inventory/Sheets connection, order confirmation, stock reservation, production-capacity promise หรือ employee-system modification
