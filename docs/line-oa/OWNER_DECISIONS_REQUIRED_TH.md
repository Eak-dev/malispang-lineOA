# OWNER_DECISIONS_REQUIRED

หลักการ: รายการต่อไปนี้ห้าม Codex/AI ตัดสินแทน หากยังไม่ตอบ ให้ระบบ fail closed และใช้ mock/placeholder เท่านั้น

## P0 — ต้องตอบก่อนเริ่ม implementation slice ที่เกี่ยวข้อง

1. **แหล่งเมนูและราคาที่เป็น authoritative source** — ผู้ดูแล, รูปแบบ, version/approval, วันที่มีผล; ราคา 39 บาทและรายการ candidate อนุมัติหรือไม่
2. **รายการสาขา จุดรับสินค้า เวลาเปิด/รับสินค้า และ timezone/business-day rule**
3. **แหล่ง promotion ที่เป็น authoritative source** และผู้อนุมัติ exact customer-facing text
4. **ช่องทางที่พนักงานรับ/ตอบ stock-check ใน Test** — ออกแบบเป็น mock ก่อน; ใครมีสิทธิ์ตอบ/ปิด handoff
5. **maximum acceptable stock age** แยกตามสาขา/สินค้าได้หรือไม่
6. **staff-response timeout** และเมื่อ timeout ให้ส่งข้อความ, handoff หรือทั้งสองอย่าง
7. **ถ้อยคำระหว่างรอตรวจ stock และถ้อยคำเมื่อ timeout**
8. **Phase 1 อนุญาตให้คำนวณร่าง quote ก่อน stock confirmation หรือไม่**; ต้องติดป้าย caveat ใด
9. **ค่าบรรจุภัณฑ์/สติ๊กเกอร์/ค่าธรรมเนียม** พร้อมวิธีคิดและ effective dates
10. **แหล่งคำตอบ shelf life/storage/allergen** แยกตามสินค้าและผู้รับผิดชอบความปลอดภัย

## P1 — ต้องตอบก่อน UAT/ใช้งาน Phase 1 ครบ

11. ข้อความ FAQ/menu/location/opening/wholesale/handoff/fallback ที่อนุมัติ
12. นโยบายขายส่ง: ข้อมูลขั้นต่ำ, MOQ/lead time ที่อนุมัติ และปลายทางพนักงาน
13. แหล่งข้อมูล loyalty point และอนุญาตให้ Phase 1 ตอบอะไรได้บ้าง
14. รูปแบบ `SOLD_OUT` quantity: บังคับ 0 หรืออนุญาต null
15. repeated-message dedupe window และเกณฑ์ที่ต้องไม่กลืน correction ที่ตั้งใจส่ง
16. retry limit/backoff และแนวทางเมื่อ outbox ส่งไม่สำเร็จ
17. retention period ของ pseudonymous event, availability, draft และ audit; เงื่อนไข debug text แบบ opt-in
18. authorized staff roles สำหรับ stock confirmation/handoff close และวิธี audit actor
19. customer-facing wording สำหรับ draft disclaimer, unavailable catalog และ calculator failure

## P2 — ขอบเขต Phase 2/ก่อน live readiness

20. deposit policy และการปัดเศษเงินมัดจำ
21. order revision/approval ownership และการยกเลิก
22. payment ledger/manual slip reviewer และ SLA; AI ห้ามยืนยันเอง
23. Order ID sequence ownership สำหรับ `MLP-YYYYMMDD-XXXX`
24. monitoring, reconciliation, incident owner และ rollback approval
25. ระยะเวลาเก็บ payment/audit data ตามข้อกำหนดธุรกิจ/กฎหมาย

## คำตอบที่ต้องแนบกลับ

สำหรับแต่ละข้อระบุ: decision, owner, approval date, effective date, source link/file, Test-only หรือ Production-ready และ review date

## Safe Test mirror — รายการเพิ่มจากการตรวจ 14 สิงหาคม 2026

26. ยืนยัน menu/price artwork ปัจจุบันหรือส่งไฟล์ใหม่; source ที่พบยังมีราคาและเบอร์ที่ไม่ได้รับรอง
27. ยืนยัน campaign `Facebook อั่งเปา` ว่ายัง active หรือ retired
28. ยืนยัน public location URL สำหรับปุ่ม TEST
29. ยืนยัน cover image และ business/response hours ที่ต้อง mirror
30. **RESOLVED 20 สิงหาคม 2026:** เปิด Messaging API, สร้าง Test Provider/Channel, ตั้ง encrypted credentials, deploy Test Worker และเปิด verified Webhook เฉพาะ `มะลิปัง TEST` แล้ว
31. **RESOLVED 21 สิงหาคม 2026:** Owner live UAT จาก LINE ส่วนตัวผ่าน Rich Menu, Quick Reply, acknowledgement ครั้งเดียว และ handoff silence ครบ 8 ข้อ; authorized staff-close เคยผ่าน UAT ก่อนหน้า
32. ยืนยันว่า TEST_SEED ราคา 39 บาท, ที่ตั้ง, เวลา 08:00–19:00 และการเก็บประมาณ 2 วันถูกต้อง ก่อนเปลี่ยนสถานะเป็น authoritative
33. **RESOLVED 21 สิงหาคม 2026:** Rich Menu ใช้ราคาเริ่มต้น 39 บาท, กติกา 50 บาท = 1 แต้ม, Maps URL, Facebook URL และข้อความ Delivery ตาม GitHub Issue #1; action แต้มต้อง fail closed จน Reward Card พร้อม
34. กำหนด Reward Card TEST: Main reward/voucher, points till goal, expiration, reminder, welcome bonus และ cooldown; ห้ามเชื่อม Production Reward Card
35. **RESOLVED 21 สิงหาคม 2026:** Owner อนุมัติการหมุน `TEST_ADMIN_KEY` เฉพาะ Worker `malispang-lineoa-test`; เก็บค่าใหม่ใน Keychain/Cloudflare encrypted secret, ปิด handoff ของผู้ทดสอบ 1 รายการ และยืนยัน active handoff = `0` โดยไม่เปลี่ยน LINE credential หรือ Production
