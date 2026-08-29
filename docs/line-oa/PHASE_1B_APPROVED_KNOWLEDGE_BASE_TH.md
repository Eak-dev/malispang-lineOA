# Phase 1B — Approved Knowledge Base (`Issue #8`)

วันที่เริ่ม implementation: 29 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `LOCAL FOUNDATION PASS / OWNER DATA AND UAT PENDING / NOT DEPLOYED`

เอกสารนี้ทำตาม `GitHub Issue #9` และ Issue #8 เท่านั้น งานนี้ไม่อนุญาตให้เปิดหรือเปลี่ยน Production `มะลิปัง` และไม่ได้เปลี่ยนระบบภายนอกของ `มะลิปัง TEST`

## Acceptance criteria และ Definition of Done ที่ใช้

- schema มี source, owner, approvedAt, effectiveFrom/effectiveTo, freshness, status, version และ checksum
- lookup ส่งเฉพาะ record `APPROVED` ที่อยู่ในช่วงมีผล ยังไม่ถึง review/maximum age และไม่มี record ที่ active ขัดกัน
- ข้อมูลที่หาย, หมดอายุ, stale, malformed, ซ้ำขัดกัน หรือมีคำว่า `TEST_SEED` ต้อง fail closed
- stock, allergen และหมวดที่ manifest กำหนด `HUMAN_REVIEW` ต้องส่งต่อพนักงาน; บอตต้องคง acknowledgement ครั้งเดียวและ silence ระหว่าง handoff
- audit ของคำตอบที่อนุมัติมี record ID, source reference, approvedAt, version และ checksum โดยไม่เก็บข้อความลูกค้า
- Definition of Done ของ Issue #8 จะผ่านเมื่อไม่มีคำตอบที่ยังไม่อนุมัติ ทุกคำตอบ trace ได้ ข้อมูลหมดอายุไม่ถูกส่ง และ Owner UAT ภาษาไทยผ่าน

## สิ่งที่ทำแล้ว

1. `config/approved-knowledge-base/test-knowledge-base.json` เป็น source of truth แบบ versioned สำหรับ `มะลิปัง TEST`
2. validator ปฏิเสธ account/environment ผิด, field ไม่ครบ, checksum ผิด, blocked record ที่มีคำตอบ และคำตอบที่เป็น TEST seed
3. `ApprovedFaqKnowledgeBase` ตรวจ effective window, approval date, review date, maximum age, status, checksum และ active-record conflict
4. Worker local build ใช้ manifest เดียวกันและตั้ง `FAQ_SOURCE_STATUS=APPROVED_ONLY`
5. runtime รุ่นถัดไปส่ง safe fallback หรือ human handoff ตาม manifest; ไม่มี hard-coded ราคา ที่อยู่ เวลา การเก็บรักษา Delivery หรือรูปเมนูที่ยังไม่ผ่าน Issue #8
6. test fixtures ที่เป็น `APPROVED` มี provenance ครบและใช้เฉพาะ automated tests

> การเปลี่ยน Worker ใน branch นี้ยังไม่ deploy เพื่อไม่ทำให้ TEST ที่ผ่าน Phase 1A UAT เปลี่ยนพฤติกรรมก่อน Owner อนุมัติข้อมูลและ UAT ของ Phase 1B

## สถานะข้อมูลใน TEST manifest

| หมวด          | สถานะ     | fallback      | หลักฐานที่ยังต้องมี                            |
| ------------- | --------- | ------------- | ---------------------------------------------- |
| Menu          | `BLOCKED` | safe fallback | รายการ/รูป/ราคา current พร้อม Owner approval   |
| Price         | `BLOCKED` | safe fallback | ราคาปัจจุบันและช่วงมีผล                        |
| Location      | `BLOCKED` | safe fallback | แหล่งที่อยู่ปัจจุบันที่ Owner รับรอง           |
| Opening hours | `BLOCKED` | human review  | แก้หลักฐานเวลาที่ขัดกัน                        |
| Contact       | `BLOCKED` | safe fallback | ช่องทางติดต่อที่อนุมัติ                        |
| Pickup        | `BLOCKED` | human review  | จุด/เวลา/เงื่อนไขรับสินค้า                     |
| Storage       | `BLOCKED` | human review  | ข้อความ product-safety แยกตามสินค้า            |
| Allergen      | `BLOCKED` | human review  | แหล่งส่วนผสม/สารก่อภูมิแพ้ที่อนุมัติ           |
| Wholesale     | `BLOCKED` | human review  | ราคา/MOQ/lead time/ช่วงมีผล                    |
| Advance order | `BLOCKED` | human review  | cutoff, ช่องทาง และ confirmation terms         |
| Delivery      | `BLOCKED` | human review  | สถานะ/พื้นที่/ค่าบริการ/ช่วงมีผล               |
| Promotion     | `BLOCKED` | human review  | ข้อเสนอและ effective/expiry dates              |
| Loyalty       | `BLOCKED` | human review  | ข้อความกติกาและ effective/review dates         |
| Current stock | `BLOCKED` | human review  | ต้องใช้ staff confirmation ที่สดใน Phase ถัดไป |

manifest ไม่มี customer-facing answer และไม่มีการเลื่อนข้อมูลจาก TEST artwork, UAT เก่า หรือหลักฐาน historical เป็น `APPROVED`

## Owner UAT ที่ยังต้องทำ

หลัง Owner อนุมัติ record จริงและ freeze commit ให้ทดสอบภาษาไทยอย่างน้อย:

1. เมนู ราคา ที่อยู่ เวลา ช่องทางติดต่อ การรับสินค้า การเก็บรักษา ราคาส่ง สั่งล่วงหน้า Delivery โปรโมชั่น และกติกาแต้ม ตรง manifest version
2. record ก่อนวันมีผล/หมดอายุ/stale/ขัดกันไม่ถูกส่ง
3. คำถาม stock และ allergen เข้าสู่ handoff เพียงครั้งเดียว
4. ข้อความเพิ่มระหว่าง handoff ไม่มีบอตตอบแทรก
5. audit trace ตรง source/approvedAt/version/checksum และไม่มีข้อความลูกค้าหรือข้อมูลส่วนตัว

## Rollback

งานรอบนี้ยังไม่ deploy จึง rollback ภายนอกไม่จำเป็น หาก local regression ให้ revert commit ของ Phase 1B เท่านั้น ห้ามแก้ Worker, Webhook, LINE OA หรือ Production เพื่อชดเชย การ deploy ในอนาคตต้องเป็น approval แยกหลัง Owner UAT ผ่าน

## Blocker ที่ทำให้ Issue #8 ยังเปิด

- ทั้ง 14 หมวดยัง `BLOCKED`; exact authoritative values และ source ยังไม่ครบ
- ยังไม่มี Owner UAT ภาษาไทยจาก frozen Phase 1B commit
- จึงยังไม่ผ่าน Definition of Done และห้ามเริ่ม Issue #6 ตาม Roadmap
