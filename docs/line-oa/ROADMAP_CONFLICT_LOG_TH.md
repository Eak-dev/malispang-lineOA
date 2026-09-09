# Roadmap conflict log

บันทึกเมื่อ: 29 สิงหาคม 2026 (Asia/Bangkok)

แหล่งหลัก: `GitHub Issue #9 — Roadmap: MalisPang LINE OA — TEST-first customer service`

## ความขัดแย้งที่พบ

`docs/line-oa/PHASE_PLAN_TH.md` เป็นเอกสารเก่าที่เรียก Phase 1B ว่า Staff-assisted Availability และ Phase 1C ว่า Draft Order แต่ Roadmap #9 ปัจจุบันกำหนด:

- Phase 1B = Issue #8 Approved Knowledge Base
- Phase 1C = Issue #6 Conversation UX และ Intent Routing
- Phase 2 = Issue #2 Draft Order
- Phase 3 = Issue #7 Staff Stock Confirmation

## การตัดสินใจระหว่างรอ Owner

- ไม่แก้หรือ reinterpret Roadmap #9
- ไม่เริ่ม Staff Availability, Draft Order หรือ Issue อื่น
- ทำเฉพาะ Issue #8 ตาม acceptance criteria และ Definition of Done บน GitHub
- ถือ `PHASE_PLAN_TH.md` เป็น historical document ในจุดที่ขัดกับ Roadmap #9

Owner ควรตัดสินใจภายหลังว่าจะ archive หรือปรับเอกสารเก่าให้ตรง Roadmap แต่การตัดสินใจนั้นไม่ block งาน local ของ Issue #8

## Status drift ที่พบก่อน Issue #6 — 31 สิงหาคม 2026

body ของ Roadmap #9 ยังแสดง Phase 1B / Issue #8 เป็น unchecked แต่ GitHub Issue #8 ถูกปิดหลัง Owner re-UAT PASS และมี completion commit `ebab874bf4be7c9f03e2d5ea76508d7fd44fb403` แล้ว

การจัดการ:

- ไม่ reinterpret หรือเปลี่ยนลำดับ Roadmap
- ใช้สถานะ Issue #8 ที่ปิดพร้อม evidence commit เป็นหลักฐานว่าเริ่ม Issue #6 ซึ่งเป็นลำดับถัดไปได้
- ไม่เริ่ม Issue #2, #7, #4 หรือ #5
- status drift นี้ไม่เปลี่ยน business rules และไม่ block local implementation ของ Issue #6
