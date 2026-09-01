# Phase 2 — Draft Order สำหรับ `มะลิปัง TEST`

สถานะ: **LOCAL IMPLEMENTED — NOT DEPLOYED — OWNER UAT PENDING**

Issue: GitHub #2 / Roadmap #9 Phase 2

ฐานงาน: `04fa0fd457d65ea16d025a2d06572b435ce84a99`

วันที่ตัดสินใจ Owner: 1 กันยายน 2026

## เป้าหมายและขอบเขต

ระบบนี้จัดทำ “ร่างออเดอร์” เพื่อให้พนักงานตรวจเท่านั้น ไม่ใช่ออเดอร์สำเร็จ ไม่จองสต๊อก ไม่ยืนยันราคา/รอบรับ/โปรโมชัน/การชำระเงิน และไม่เรียก LINE หรือแหล่งข้อความเก่าเพื่อหาราคา

State machine ที่อนุญาต:

`NO_DRAFT → CONSENT_REQUIRED → COLLECTING → READY_FOR_REVIEW → AWAITING_STAFF_REVIEW`

สถานะ fail-closed/ปลายทาง: `PRICE_BLOCKED`, `CANCELLED`, `EXPIRED_PURGED`, `FAILED_REVIEW`

ไม่มีสถานะ `CONFIRMED`, `PAID`, `STOCK_RESERVED` หรือ `PAYMENT_VERIFIED`

## Consent, PII และ retention

- ก่อนเก็บชื่อ/เบอร์ ต้องส่งข้อความ consent ที่ Owner อนุมัติและรับคำว่า `ยินยอม` ตรงตัว
- ชื่อและเบอร์รวมถึง revision ที่มีข้อมูลดังกล่าวหมดอายุไม่เกิน 48 ชั่วโมงหลังแก้ไขล่าสุด
- ทุกการแก้ไขสร้าง revision ใหม่และเลื่อน TTL เป็น 48 ชั่วโมงจากการแก้ไขนั้น
- Durable Object alarm ลบ revision ที่มี PII และคงเฉพาะหลักฐาน audit แบบ redacted (`outcome`, `revision`, เวลา)
- การยกเลิกร่างลบ PII เช่นกัน
- log/audit ไม่บันทึกชื่อ เบอร์ ข้อความเต็ม Owner ID, token หรือ secret

## Product Catalog และราคา

Source เดียวของ runtime คือ `config/product-catalog/test-approved-catalog.json` ซึ่งมี version, effective range, approval metadata และ SHA-256 checksum

- ขนมปังปกติที่อนุมัติ: 3,900 satang/ชิ้น
- ขนมปังชิ้นเล็ก 2,000 satang เฉพาะ ฝอยทอง, ถั่วแดง, เผือก, สังขยา, แฮมชีส และเนยสด
- ชื่อมาตรฐาน `แฮมไส้กรอก`; alias `ไส้กรอกแฮม` และ `แฮม+ไส้กรอก`
- ชิฟฟ่อน คุกกี้ บัตเตอร์เลมอน และสินค้าไม่รู้จัก: `PRICE_BLOCKED`
- แถว `PRICE_BLOCKED` ไม่มี unit price และไม่มีสิทธิ์โปร

## การคำนวณและโปร TEST

- เงินทุกจำนวนใช้ integer satang และตรวจ `Number.isSafeInteger`
- overflow, ราคาไม่ครบ หรือมัดจำที่แบ่งเป็น satang ไม่ลงตัว fail closed
- มัดจำ 50% เป็น “ข้อเสนอ” ใน Draft เท่านั้น ไม่ถือว่ารับหรือยืนยันเงิน
- โปร 3 ชิ้น 100 บาทรวมไส้ปกติได้, คิดทีละกลุ่ม 3, เศษคิด 39 บาท
- ชิ้นเล็ก/ชิฟฟ่อน/คุกกี้/สินค้าอื่นไม่ร่วมโปร
- โปรปิดเป็นค่าเริ่มต้น
- การเปิด/ปิดต้องผ่าน TEST admin authentication และ Owner allowlist ที่แยกจาก staff allowlist; ค่า Owner ที่อนุมัติสำหรับ TEST คือ `OWNER_TEST`
- ทุกช่วงโปรใช้เวลา `Asia/Bangkok`, start/end ต้องเป็นวินาทีเต็ม, end ต้องหลัง start และอยู่ในวันปฏิทินไทยเดียวกัน โดยเวลาสิ้นสุดล่าสุดคือ `23:59:59`
- ช่วงเวลาข้ามวัน, end ก่อน/เท่ากับ start หรือ timestamp ไม่ตรงวินาทีถูกปฏิเสธแบบ fail closed และบันทึกเฉพาะ outcome/revision/time ใน audit; ไม่บันทึก Owner ID ดิบ
- `PromotionControlDO` ตั้ง alarm ที่ end time และเปลี่ยน state เป็น disabled โดยอัตโนมัติเมื่อหมดเวลา พร้อม audit `TEST_PROMOTION_AUTO_EXPIRED`
- สิทธิ์โปรถูก snapshot ตอนสร้าง Draft ใหม่ การเปลี่ยนโปรไม่คำนวณ Draft เดิมย้อนหลัง
- staff-created repricing revision ใช้ protected TEST admin endpoint, ตรวจ staff allowlist และคืนเฉพาะยอด/สถานะที่ไม่ใช่ PII; ลูกค้าไม่มีคำสั่ง reprice

## Command contract สำหรับ UAT

- เริ่ม: ข้อความ intent พรีออเดอร์
- Consent: `ยินยอม`
- แก้ไข: `ชื่อ:`, `เบอร์โทร:`, `วันรับ:`, `รอบรับ:`, `วิธีรับ:`, `วิธีชำระ:`, `หมายเหตุ:`
- เพิ่ม/แทนรายการ: `รายการ: แฮมชีส x 2`
- ชิ้นเล็ก: `รายการ: แฮมชีสเล็ก x 2`
- ลบ: `ลบรายการ: แฮมชีส`
- สรุป: `สรุปร่าง`
- ส่งพนักงาน: `ส่งให้พนักงานตรวจ`
- ยกเลิกและ purge: `ยกเลิกร่าง`

ทุก summary ขึ้นต้นด้วย `DRAFT — ยังไม่ยืนยันออเดอร์/สต๊อก/ชำระเงิน`

## Failure handling

- duplicate event: ไม่ส่ง reply ซ้ำและไม่สร้าง revision ซ้ำ
- persistence/corrupt state: `FAILED_REVIEW`, ไม่คำนวณและไม่ตอบข้อมูล
- catalog missing/blocked: `PRICE_BLOCKED`, ไม่แสดง subtotal/มัดจำ และ handoff
- calculator overflow: `PRICE_BLOCKED`, handoff
- หลัง `AWAITING_STAFF_REVIEW`: conversation เข้าสู่ human handoff; Draft ไม่เปลี่ยนเป็น confirmed order

## Local-only infrastructure changes

เพิ่ม class/binding declaration ใน source สำหรับ `DraftOrderDO` และ `PromotionControlDO` เพื่อให้ typecheck/dry-run ได้ แต่ **ยังไม่ได้ deploy หรือสร้าง resource ภายนอก** ค่า non-secret `TEST_OWNER_ALLOWLIST=OWNER_TEST` ถูกบันทึกตาม Owner decision; credential สำหรับ admin authentication ยังคงเป็น encrypted secret และไม่มีค่า secret ใน Git

## BLOCKED ก่อน deploy TEST

1. ชิฟฟ่อน คุกกี้ และบัตเตอร์เลมอนยัง `PRICE_BLOCKED` เพราะ Discovery พบ mapping ราคาไม่ตรงกัน
2. ต้องตั้ง/ตรวจ TEST bindings ตาม manifest ที่ frozen ตอน deploy โดยไม่เปิดเผย secret
3. ยังไม่มี Owner approval สำหรับ TEST deployment ของ commit นี้
4. Owner Live UAT ยังไม่ผ่าน จึงห้ามปิด Issue #2

Production `มะลิปัง` ไม่ได้ถูกเปิด แก้ไข หรือเรียกใช้ในงานนี้
