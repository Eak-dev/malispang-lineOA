# Owner UAT — Phase 2 Draft Order (`มะลิปัง TEST`)

สถานะ: **PASS — OWNER ACCEPTED — 1 กันยายน 2026**

หลักฐานรวมใช้ automated tests สำหรับ failure/security paths และ Owner Live UAT สำหรับ customer flow จริงบน `มะลิปัง TEST` โดยไม่บันทึกชื่อ เบอร์โทร หรือข้อความที่มี PII ลงเอกสารนี้

## Pre-deploy gates

- [x] commit ที่ขอ deploy ตรงกับ commit ที่ validation ผ่าน
- [x] Worker target เป็น `malispang-lineoa-test` และ account เป็น `มะลิปัง TEST`
- [x] `TEST_OWNER_ALLOWLIST` เป็นค่า non-secret `OWNER_TEST` และ admin credential ยังคงเป็น encrypted secret
- [x] ช่วงโปรใช้ `Asia/Bangkok`, end หลัง start, วันไทยเดียวกัน และไม่เกิน `23:59:59`
- [x] โปรเริ่มต้น OFF
- [x] ไม่มี Production credential/binding
- [x] rollback version ถูกบันทึกก่อน deploy

## Owner UAT cases

1. [x] พิมพ์ intent พรีออเดอร์ → ได้ consent exact และยังไม่เก็บชื่อ/เบอร์
2. [x] พิมพ์อย่างอื่นแทน `ยินยอม` → ยังอยู่ `CONSENT_REQUIRED`
3. [x] พิมพ์ `ยินยอม` → ได้แบบฟอร์ม exact, วันที่วันนี้ภาษาไทย พ.ศ. ตาม `Asia/Bangkok`
4. [x] แบบฟอร์มแสดงรอบ 08:00/11:00/14:00 และไม่แสดง 16:00
5. [x] คัดลอก กรอก และส่งแบบฟอร์ม valid ทั้งก้อน → สร้าง revision เดียวและได้ summary อัตโนมัติ
6. [x] ไม่มี acknowledgement “บันทึกในร่างแล้ว” ราย field/รายบรรทัด และไม่ต้องพิมพ์ `สรุปร่าง`
7. [x] แบบฟอร์มที่ทุกช่องสินค้าว่าง → แจ้งเฉพาะว่าขาด `รายการสินค้า`; ไม่บันทึก field บางส่วน
8. [x] ชื่อ/เบอร์/วันรับ/รอบรับ/วิธีรับที่ขาดหรือผิด → แจ้งเฉพาะ field ที่ต้องแก้และไม่สร้าง revision
9. [x] จำนวนสินค้า `0`, ติดลบ, ทศนิยม หรือข้อความ → ปฏิเสธ; รับเฉพาะจำนวนเต็มบวก
10. [x] ขนมปังปกติ 1 ชิ้น → 39.00 บาท; มัดจำเสนอ 19.50 บาท
11. [x] เพิ่ม `แฮมชีสเล็ก: 1` เอง → 20.00 บาท; มัดจำเสนอ 10.00 บาท
12. [x] SKU ชิ้นเล็กที่ไม่ได้อนุมัติ → `PRICE_BLOCKED`, ไม่แสดงยอด/มัดจำ และ handoff
13. [x] alias `ไส้กรอกแฮม` แสดงชื่อมาตรฐาน `แฮมไส้กรอก`
14. [x] กรอก 16:00 เองยังผ่าน runtime policy เดิม แม้ไม่แสดงในฟอร์ม
15. [x] โปร OFF: ขนมปังปกติ 3 ชิ้น → 117.00 บาท
16. [x] Owner เปิดโปรด้วย start/end ที่ยังมีผล แล้วเริ่ม Draft ใหม่: 3 ชิ้น → 100.00 บาท
17. [x] โปรไม่กระทบชิ้นเล็กและเศษเกินชุดคิดชิ้นละ 39 บาท
18. [x] ชิฟฟ่อน/คุกกี้/บัตเตอร์เลมอน/unknown → `PRICE_BLOCKED`, ไม่มี subtotal/deposit และ handoff
19. [x] summary มีป้าย `DRAFT — ยังไม่ยืนยันออเดอร์/สต๊อก/ชำระเงิน`
20. [x] `ส่งให้พนักงานตรวจ` → `AWAITING_STAFF_REVIEW` + acknowledgement ครั้งเดียว + bot silence
21. [x] duplicate webhook ของแบบฟอร์ม → ไม่มี reply/revision ซ้ำ
22. [x] `ยกเลิกร่าง` → PII ถูก purge
23. [x] ทดสอบเวลา/fixture 48 ชั่วโมง → PII/revision ถูก purge และเหลือ audit redacted
24. [x] persistence/catalog/calculator failure → fail closed
25. [x] staff allowlist ใช้เปิด/ปิดโปรไม่ได้; ต้องเป็น Owner allowlist เท่านั้น
26. [x] ไม่มี order, stock reservation, payment acceptance/verification หรือ Production write
27. [x] `OWNER_TEST` เปิดและปิดโปรได้ผ่าน protected TEST admin flow
28. [x] ช่วงเวลาที่ข้ามวันตาม `Asia/Bangkok` ถูกปฏิเสธและมี redacted audit
29. [x] end ก่อนหรือเท่ากับ start ถูกปฏิเสธและมี redacted audit
30. [x] เมื่อถึง end time โปรถูกปิดอัตโนมัติและมี `TEST_PROMOTION_AUTO_EXPIRED`

## Evidence ที่ต้องบันทึกหลัง UAT

- Deployed commit: `37f4f81f6327daf46bbb8e146fc51d2badc4ed61`
- Worker/version: `malispang-lineoa-test` / `3e02e79b-29c9-46cf-9218-ed2d0b7d7655`
- Rollback target retained: `b4e74202-ff31-4049-99d9-71e282f2e60b` (commit `f11e45df11f06dd4e33809fc00ffbe1d8f1b4cde`)
- Automated validation: 296 node + 39 Worker tests = 335 ผ่าน, 0 ล้มเหลว
- Live UAT window: 1 กันยายน 2026 เวลา 17:40–17:49 น. (`Asia/Bangkok`)
- Owner acceptance: `Owner UAT Issue #2 PASS` เมื่อ 1 กันยายน 2026 เวลา 17:53 น. (`Asia/Bangkok`)
- Live evidence: consent/form, วันที่ไทย พ.ศ., valid whole-form submission, automatic Draft summary, deterministic subtotal/deposit, staff review, acknowledgement ครั้งเดียว และ bot silence ผ่าน
- Failure/security evidence: atomic validation, approved-only catalog, `PRICE_BLOCKED`, duplicate, expiry/purge, persistence failure, promotion guard และ redacted audit ผ่าน automated tests
- Production `มะลิปัง` ไม่ถูกเปิดหรือเปลี่ยนแปลง และไม่มี secret/PII ถูกบันทึกใน Git

Acceptance criteria ของ Issue #2 ผ่านครบ จึงอนุญาตให้ปิด Issue ตาม Roadmap #9 ได้
