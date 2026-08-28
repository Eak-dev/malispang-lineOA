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
34. **RESOLVED 28 สิงหาคม 2026 — TEST เท่านั้น:** Reward Card `บัตรแต้ม TEST` ถูก Publish แยกใต้ `มะลิปัง TEST` ด้วยเป้าหมาย 50 แต้ม, Welcome bonus 0, Reminder None, cooldown วันละครั้ง และ Voucher `รางวัล TEST ไม่มีมูลค่า`; Owner อนุมัติ `No expiration` พร้อม action ให้ปิดบัตรด้วยตนเองภายใน 31 ธันวาคม 2026 และ live UAT ผ่าน flow รับบัตร/เพิ่ม 1 แต้ม URL อยู่ใน encrypted `TEST_REWARD_CARD_URL` การใช้กับ Production ไม่ได้รับอนุมัติ
35. **RESOLVED 21 สิงหาคม 2026:** Owner อนุมัติการหมุน `TEST_ADMIN_KEY` เฉพาะ Worker `malispang-lineoa-test`; เก็บค่าใหม่ใน Keychain/Cloudflare encrypted secret, ปิด handoff ของผู้ทดสอบ 1 รายการ และยืนยัน active handoff = `0` โดยไม่เปลี่ยน LINE credential หรือ Production

## Production-readiness decisions — เพิ่มจาก read-only review 28 สิงหาคม 2026

36. **POLICY COMPLETE / EVIDENCE BLOCKED 28 สิงหาคม 2026:** Owner อนุมัติ Production baseline และ Codex เลือก safe Voucher/refund defaults แล้ว; ยังมี `COGS_BLOCKER`, LINE capability blockers และ final external GO
37. **POLICY COMPLETE / CAPABILITY BLOCKED 28 สิงหาคม 2026:** One Time QR ได้หลักฐาน, แต่ rolling expiry, QR 10 นาที, multi-point QR และ Voucher 60 วันยังไม่ verified; หลังวัน 30 คง Owner/Shift lead และ refund ให้ Owner reconcile
38. **DESIGN COMPLETE / PLATFORM BLOCKED 28 สิงหาคม 2026:** retention 7/90/365 และ names-only secret/role/monitoring manifests พร้อม; ยังรอ Production plan/storage/access identities
39. อนุมัติ Production Worker/Channel/Durable Object/secrets ที่แยกจาก TEST และชื่อ encrypted secret สำหรับ Production Reward Card URL
40. **SCHEMA COMPLETE / DATA BLOCKED 28 สิงหาคม 2026:** versioned manifest และ approved-only fail-closed lookup พร้อม; 9 หมวด customer-facing ถูก classify `BLOCKED` จนมี exact authoritative records
41. อนุมัติ Production Rich Menu manifest/action/display period และ current-menu rollback target
42. **DESIGN COMPLETE / IDENTITY BLOCKED 28 สิงหาคม 2026:** roles, least privilege, thresholds, 5-minute rollback target และ incident runbook พร้อม; named allowlists/backup/auditor ยังรอ evidence
43. อนุมัติ production tester allowlist, privacy basis, maintenance window และข้อยอมรับว่าการเปิด webhook/default Rich Menu อาจกระทบลูกค้าจริงหาก LINE จำกัด audience ไม่ได้
44. อนุมัติ response-mode/auto-response collision plan หลัง read-only Production configuration audit แยกต่างหาก
45. **FINAL PACK NO-GO:** event-based rollout 30 นาที + observation 120 นาที + rollback 5 นาทีถูกกำหนดแล้ว แต่ยังรอ blockers/stable capture/rehearsal และ combined Owner GO; ไม่มี external Production action

## Owner Decision Pack

ตารางตัวเลือก ผลกระทบ และแบบตอบทีละข้ออยู่ใน `docs/line-oa/OWNER_DECISION_PACK_PRODUCTION_TH.md`

สถานะ ณ 28 สิงหาคม 2026: `LOCAL_READINESS_PACKAGE_COMPLETE / EVIDENCE_BLOCKERS_REMAIN / PRODUCTION_NO-GO` — ดู decision record และ proposed plan ใน `PRODUCTION_OWNER_DECISION_RECORD_2026-08-28_TH.md` และ `PRODUCTION_IMPLEMENTATION_ROLLOUT_ROLLBACK_PLAN_TH.md` Issues #4, #5, #8 ต้องคงเปิดจน evidence + implementation/test/UAT acceptance criteria ผ่านจริง

Final status/combined approval: `docs/line-oa/PRODUCTION_FINAL_GO_NO_GO_PACK_TH.md` ไม่มีคำถามย่อยค้าง เหลือเฉพาะ evidence blockers ที่ safe default ทดแทนไม่ได้
