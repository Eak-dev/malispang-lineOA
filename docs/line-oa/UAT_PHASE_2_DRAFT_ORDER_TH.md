# Owner UAT — Phase 2 Draft Order (`มะลิปัง TEST`)

สถานะ: **PENDING TEST DEPLOYMENT APPROVAL**

## Pre-deploy gates

- [ ] commit ที่ขอ deploy ตรงกับ commit ที่ validation ผ่าน
- [ ] Worker target เป็น `malispang-lineoa-test` และ account เป็น `มะลิปัง TEST`
- [ ] `TEST_OWNER_ALLOWLIST` เป็นค่า non-secret `OWNER_TEST` และ admin credential ยังคงเป็น encrypted secret
- [ ] ช่วงโปรใช้ `Asia/Bangkok`, end หลัง start, วันไทยเดียวกัน และไม่เกิน `23:59:59`
- [ ] โปรเริ่มต้น OFF
- [ ] ไม่มี Production credential/binding
- [ ] rollback version ถูกบันทึกก่อน deploy

## Owner UAT cases

1. [ ] พิมพ์ intent พรีออเดอร์ → ได้ consent exact และยังไม่เก็บชื่อ/เบอร์
2. [ ] พิมพ์อย่างอื่นแทน `ยินยอม` → ยังอยู่ `CONSENT_REQUIRED`
3. [ ] พิมพ์ `ยินยอม` → เข้า `COLLECTING`
4. [ ] กรอก/แก้ชื่อ เบอร์ วันรับ รอบรับ วิธีรับ และหมายเหตุ → revision เพิ่มทุกครั้ง
5. [ ] ขนมปังปกติ 1 ชิ้น → 39.00 บาท; มัดจำเสนอ 19.50 บาท
6. [ ] ขนมปังชิ้นเล็กที่อนุมัติ 1 ชิ้น → 20.00 บาท; มัดจำเสนอ 10.00 บาท
7. [ ] alias `ไส้กรอกแฮม` แสดงชื่อมาตรฐาน `แฮมไส้กรอก`
8. [ ] โปร OFF: ขนมปังปกติ 3 ชิ้น → 117.00 บาท
9. [ ] Owner เปิดโปรด้วย start/end ที่ยังมีผล แล้วเริ่ม Draft ใหม่: 3 ชิ้น → 100.00 บาท
10. [ ] โปรไม่กระทบชิ้นเล็กและเศษเกินชุดคิดชิ้นละ 39 บาท
11. [ ] ชิฟฟ่อน/คุกกี้/บัตเตอร์เลมอน/unknown → `PRICE_BLOCKED`, ไม่มี subtotal/deposit และ handoff
12. [ ] `สรุปร่าง` ที่ข้อมูลไม่ครบ → ไม่เข้าสู่ review
13. [ ] summary มีป้าย `DRAFT — ยังไม่ยืนยันออเดอร์/สต๊อก/ชำระเงิน`
14. [ ] `ส่งให้พนักงานตรวจ` → `AWAITING_STAFF_REVIEW` + acknowledgement ครั้งเดียว + bot silence
15. [ ] duplicate webhook → ไม่มี reply/revision ซ้ำ
16. [ ] `ยกเลิกร่าง` → PII ถูก purge
17. [ ] ทดสอบเวลา/fixture 48 ชั่วโมง → PII/revision ถูก purge และเหลือ audit redacted
18. [ ] persistence/catalog/calculator failure → fail closed
19. [ ] staff allowlist ใช้เปิด/ปิดโปรไม่ได้; ต้องเป็น Owner allowlist เท่านั้น
20. [ ] ไม่มี order, stock reservation, payment acceptance/verification หรือ Production write
21. [ ] `OWNER_TEST` เปิดและปิดโปรได้ผ่าน protected TEST admin flow
22. [ ] ช่วงเวลาที่ข้ามวันตาม `Asia/Bangkok` ถูกปฏิเสธและมี redacted audit
23. [ ] end ก่อนหรือเท่ากับ start ถูกปฏิเสธและมี redacted audit
24. [ ] เมื่อถึง end time โปรถูกปิดอัตโนมัติและมี `TEST_PROMOTION_AUTO_EXPIRED`

## Evidence ที่ต้องบันทึกหลัง UAT

- deployed commit/Worker version (ไม่รวม secret)
- เวลา UAT Asia/Bangkok
- PASS/FAIL ต่อข้อ
- redacted audit outcomes และ rollback result
- ยืนยัน Production ไม่ถูกแตะ

ห้ามปิด Issue #2 จน automated tests, TEST deployment และ Owner UAT ผ่านครบ
