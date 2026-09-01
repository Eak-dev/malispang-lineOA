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
3. [ ] พิมพ์ `ยินยอม` → ได้แบบฟอร์ม exact, วันที่วันนี้ภาษาไทย พ.ศ. ตาม `Asia/Bangkok`
4. [ ] แบบฟอร์มแสดงรอบ 08:00/11:00/14:00 และไม่แสดง 16:00
5. [ ] คัดลอก กรอก และส่งแบบฟอร์ม valid ทั้งก้อน → สร้าง revision เดียวและได้ summary อัตโนมัติ
6. [ ] ไม่มี acknowledgement “บันทึกในร่างแล้ว” ราย field/รายบรรทัด และไม่ต้องพิมพ์ `สรุปร่าง`
7. [ ] แบบฟอร์มที่ทุกช่องสินค้าว่าง → แจ้งเฉพาะว่าขาด `รายการสินค้า`; ไม่บันทึก field บางส่วน
8. [ ] ชื่อ/เบอร์/วันรับ/รอบรับ/วิธีรับที่ขาดหรือผิด → แจ้งเฉพาะ field ที่ต้องแก้และไม่สร้าง revision
9. [ ] จำนวนสินค้า `0`, ติดลบ, ทศนิยม หรือข้อความ → ปฏิเสธ; รับเฉพาะจำนวนเต็มบวก
10. [ ] ขนมปังปกติ 1 ชิ้น → 39.00 บาท; มัดจำเสนอ 19.50 บาท
11. [ ] เพิ่ม `แฮมชีสเล็ก: 1` เอง → 20.00 บาท; มัดจำเสนอ 10.00 บาท
12. [ ] SKU ชิ้นเล็กที่ไม่ได้อนุมัติ → `PRICE_BLOCKED`, ไม่แสดงยอด/มัดจำ และ handoff
13. [ ] alias `ไส้กรอกแฮม` แสดงชื่อมาตรฐาน `แฮมไส้กรอก`
14. [ ] กรอก 16:00 เองยังผ่าน runtime policy เดิม แม้ไม่แสดงในฟอร์ม
15. [ ] โปร OFF: ขนมปังปกติ 3 ชิ้น → 117.00 บาท
16. [ ] Owner เปิดโปรด้วย start/end ที่ยังมีผล แล้วเริ่ม Draft ใหม่: 3 ชิ้น → 100.00 บาท
17. [ ] โปรไม่กระทบชิ้นเล็กและเศษเกินชุดคิดชิ้นละ 39 บาท
18. [ ] ชิฟฟ่อน/คุกกี้/บัตเตอร์เลมอน/unknown → `PRICE_BLOCKED`, ไม่มี subtotal/deposit และ handoff
19. [ ] summary มีป้าย `DRAFT — ยังไม่ยืนยันออเดอร์/สต๊อก/ชำระเงิน`
20. [ ] `ส่งให้พนักงานตรวจ` → `AWAITING_STAFF_REVIEW` + acknowledgement ครั้งเดียว + bot silence
21. [ ] duplicate webhook ของแบบฟอร์ม → ไม่มี reply/revision ซ้ำ
22. [ ] `ยกเลิกร่าง` → PII ถูก purge
23. [ ] ทดสอบเวลา/fixture 48 ชั่วโมง → PII/revision ถูก purge และเหลือ audit redacted
24. [ ] persistence/catalog/calculator failure → fail closed
25. [ ] staff allowlist ใช้เปิด/ปิดโปรไม่ได้; ต้องเป็น Owner allowlist เท่านั้น
26. [ ] ไม่มี order, stock reservation, payment acceptance/verification หรือ Production write
27. [ ] `OWNER_TEST` เปิดและปิดโปรได้ผ่าน protected TEST admin flow
28. [ ] ช่วงเวลาที่ข้ามวันตาม `Asia/Bangkok` ถูกปฏิเสธและมี redacted audit
29. [ ] end ก่อนหรือเท่ากับ start ถูกปฏิเสธและมี redacted audit
30. [ ] เมื่อถึง end time โปรถูกปิดอัตโนมัติและมี `TEST_PROMOTION_AUTO_EXPIRED`

## Evidence ที่ต้องบันทึกหลัง UAT

- deployed commit/Worker version (ไม่รวม secret)
- เวลา UAT Asia/Bangkok
- PASS/FAIL ต่อข้อ
- redacted audit outcomes และ rollback result
- ยืนยัน Production ไม่ถูกแตะ

ห้ามปิด Issue #2 จน automated tests, TEST deployment และ Owner UAT ผ่านครบ
