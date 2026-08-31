# Phase 1C — Conversation UX และ Intent Routing ภาษาไทย (`Issue #6`)

วันที่เริ่ม: 31 สิงหาคม 2026

ฐานงาน: `ebab874bf4be7c9f03e2d5ea76508d7fd44fb403`

สถานะ: `LOCAL IMPLEMENTATION VALIDATED / NOT DEPLOYED / OWNER TEST DEPLOY APPROVAL AND UAT REQUIRED`

## Roadmap และ Definition of Done

Issue ปัจจุบันคือ Issue #6 / Phase 1C ตาม GitHub Issue #9 งานนี้เริ่มหลัง Issue #8 ปิดพร้อม Owner UAT แล้ว ไม่เริ่ม Issue #2, #7, #4 หรือ #5

Definition of Done ของ Issue #6:

- top intents ภาษาไทย, คำสุภาพ, คำสั้น และคำสะกดใกล้เคียงที่อนุมัติผ่าน automated tests
- ข้อความกำกวม fail closed โดยไม่สร้าง order และเสนอ handoff
- Quick Reply/Flex ใช้แบรนด์และ TEST-only postback เท่านั้น
- acknowledgement หนึ่งครั้ง, bot silence, authorized staff-close และ duplicate protection ไม่ถดถอย
- transcript fixtures ไม่มี PII และครอบคลุม UAT
- full project quality gates ผ่าน
- deploy เฉพาะ TEST ต้องได้รับ Owner approval แยก และ Owner live UAT ต้องผ่านก่อนปิด Issue

## เป้าหมาย

- ทำให้คำตอบสั้น ชัด เป็นมิตร และใช้ Approved Knowledge Base จาก Issue #8 เท่านั้น
- จัดเส้นทาง intent หลัก: เมนู, ราคา, ที่ตั้ง, เวลา, โปรโมชัน, สต๊อก, สั่งล่วงหน้า, ราคาส่ง, การเก็บรักษา, แต้ม และคุยกับพนักงาน รวม contact/pickup/delivery/allergen ที่เป็น approved categories
- รองรับ punctuation, zero-width characters, คำสุภาพ, คำสั้น และคำสะกดใกล้เคียงแบบ allowlist
- ส่งข้อความกำกวม/ไม่รู้จักเข้า exact safe fallback และ handoff แทนการเดา

## Non-goals

- ไม่สร้าง draft order หรือเริ่ม Issue #2
- ไม่ยืนยันสต๊อกปัจจุบัน, โปรประจำวัน, ออเดอร์, การชำระเงิน หรือข้อมูลส่วนบุคคล
- ไม่เพิ่ม AI free-form classification และไม่เดาคำจาก fuzzy distance
- ไม่เปลี่ยน Approved Knowledge Base exact answers หรือ business rules
- ไม่ deploy, ไม่เปลี่ยน LINE OA settings/Webhook/Rich Menu/Reward Card และไม่อ่านหรือเปลี่ยน secret
- ไม่เปิดหรือแก้ Production `มะลิปัง`

## Implementation

### Shared intent boundary

`src/conversation-intents.ts` เป็นแหล่งเดียวสำหรับ normalization และ intent detection ที่ทั้ง Worker และ local mock service ใช้ร่วมกัน:

- Unicode NFKC, ตัด zero-width characters, punctuation และ whitespace ซ้ำ
- precedence ให้ high-risk/dynamic topics มาก่อน static FAQ
- typo/short-form allowlist เฉพาะรายการที่ทดสอบได้ เช่น `เมณู`, `ราาคา`, `ร้านอยุ่ไหน`, `สต๊อค`, `พรีออเดอ`, `เก็บยังงัย` และ `เดลิเวอรี่`
- คำสั้นที่ความหมายชัด เช่น `เมนู`, `ราคา`, `พิกัด`, `เวลา`, `โปร`, `สต๊อก`, `แต้ม`, `พนักงาน`
- ข้อความสั้นกำกวม เช่น `เท่าไหร่`, `มีไหม`, `ได้ไหม`, `เอาอันนี้`, `ขอรายละเอียด` เป็น `AMBIGUOUS` → safe fallback + handoff

ไม่ใช้ edit-distance/fuzzy matching เพราะอาจตีความคำธุรกิจผิดและสร้าง false positive

### UX และ state safety

- Approved static replies มี Quick Reply `คุยกับพนักงาน` หนึ่งปุ่มด้วย `test:human_handoff`
- Flex Menu เดิมมี 6 ปุ่ม, โทนครีม/น้ำตาล/ส้ม และทุก postback ใช้ namespace `test:`
- Dynamic/high-risk intent ส่ง approved guidance เมื่อมี แล้วเข้า handoff
- Direct high-risk/sensitive intent เข้า handoff โดยไม่ตอบยืนยันข้อเท็จจริง
- Unknown/ambiguous ส่ง exact fallback แล้ว acknowledgement หนึ่งครั้ง
- หลัง handoff typed message เงียบ; approved static Rich Menu postback ยังใช้ amendment ของ Issue #8
- event ID ซ้ำไม่ตอบหรือเปลี่ยน state ซ้ำ; close ได้เฉพาะ TEST staff allowlist

## Intent matrix

| Intent                  | ตัวอย่างที่รองรับ                      | ผลลัพธ์                                              |
| ----------------------- | -------------------------------------- | ---------------------------------------------------- |
| MENU                    | `เมนู`, `ขอเมณูหน่อย`                  | approved menu flow; ไม่ handoff                      |
| PRICE                   | `ราคา`, `ราาคาเท่าไรคะ`                | approved price/menu content                          |
| LOCATION                | `พิกัด`, `ร้านอยุ่ไหน`                 | approved location                                    |
| HOURS                   | `เวลา`, `เปิดกี่โมงคะ`                 | approved opening hours; ไม่อ้าง real-time open state |
| PROMOTION               | `โปร`, `มีโปรโมชันวันนี้ไหม`           | approved dynamic guidance + handoff                  |
| STOCK                   | `สต๊อค`, `มีของมั้ย`                   | ไม่ยืนยัน stock + handoff                            |
| ADVANCE_ORDER           | `พรีออเดอ`, `สั่งไว้ก่อน`              | policy guidance + handoff; ไม่สร้าง order            |
| WHOLESALE               | `ราคาส่ง`, `ขายสง`                     | guidance + handoff                                   |
| STORAGE                 | `เก็บยังงัย`, `แช่ตู้เย็นไหม`          | approved storage answer                              |
| LOYALTY                 | `แต้ม`, `สะสมเเต้ม`                    | approved general rules only                          |
| STAFF                   | `พนักงาน`, `ขอคุยกับคน`                | acknowledgement หนึ่งครั้ง + handoff                 |
| CONTACT/PICKUP/DELIVERY | `ติดต่อ`, `รับของที่ไหน`, `เดลิเวอรี่` | approved static answer                               |
| ALLERGEN/HIGH_RISK      | `แพ้กลูเตน`, complaint/payment wording | staff review; ห้ามยืนยันเอง                          |
| AMBIGUOUS/UNKNOWN       | `เท่าไหร่`, `เอาอันนี้`, `สอบถามค่ะ`   | exact fallback + handoff                             |

## Transcript fixtures

`tests/fixtures/issue6-conversation-ux.json` เป็น TEST-only fixture แบบ versioned ไม่มี user ID, phone, address, reply token, customer transcript หรือข้อมูลจริง แต่ละแถวบันทึกเฉพาะ synthetic utterance, expected intent/reply kind และ handoff policy

## ความเสี่ยงและการควบคุม

| ความเสี่ยง                              | ผลกระทบ                | การควบคุม                                              |
| --------------------------------------- | ---------------------- | ------------------------------------------------------ |
| typo matching กว้างเกินไป               | ตอบผิด intent          | allowlist เท่านั้น; ไม่ใช้ fuzzy distance              |
| คำกำกวมถูกตีความเป็น order/price        | ลูกค้าเข้าใจผิด        | standalone ambiguous phrases fail closed + handoff     |
| dynamic data ถูกตอบเป็น current fact    | stock/promo ผิด        | precedence ไป approved guidance + staff review         |
| classifier ระหว่าง local/Worker ต่างกัน | UAT กับ runtime ไม่ตรง | shared `conversation-intents.ts`                       |
| bot แทรกระหว่างพนักงานตอบ               | UX เสีย/ตอบซ้ำ         | Durable Object handoff silence regression              |
| กระทบ Production                        | เหตุการณ์ใช้งานจริง    | TEST-only namespace/account guard; ไม่มี deploy รอบนี้ |

## Rollback สำหรับ TEST deployment ในอนาคต

รอบนี้ไม่มี deployment จึงไม่มี live rollback หาก Owner อนุมัติ deploy TEST ภายหลัง ต้อง freeze commit, เก็บ Worker version ปัจจุบัน และ rollback ด้วย version เดิมทันทีหาก top intent, handoff silence, duplicate protection หรือ account guard ไม่ผ่าน ห้ามเปลี่ยน Production เพื่อชดเชย

## Local validation evidence

ผลวันที่ 31 สิงหาคม 2026:

- Node tests `246/246` ผ่าน
- Worker/Durable Object tests `24/24` ผ่าน
- รวม `270/270` tests ผ่าน
- formatting, ESLint, TypeScript และ build ผ่าน
- Flex, Rich Menu, Approved Knowledge Base และ Production-readiness validators ผ่าน โดย Production readiness ยังคง expected `NO_GO`
- Worker dry-run ผ่านและยืนยัน bindings เป็น `ENVIRONMENT=TEST`, `LINE_OA_ACCOUNT_NAME=มะลิปัง TEST`
- secret scan ผ่าน `123` ไฟล์
- dependency audit ระดับ high: ไม่พบช่องโหว่
- `git diff --check` ผ่าน

คำเตือน missing secrets ระหว่าง Worker tests เป็น expected local test isolation; ไม่มีการอ่าน เพิ่ม หรือเปลี่ยน secret และ tests ผ่านทั้งหมด

## งานค้างก่อนปิด Issue #6

1. Owner อนุมัติ frozen commit สำหรับ deploy เฉพาะ `malispang-lineoa-test`
2. deploy และตรวจ health/signature/account guard โดย approval แยก
3. Owner live UAT ตาม `UAT_PHASE_1C_REQUIRED_TH.md`
4. บันทึก PASS และปิด Issue #6 เมื่อ acceptance criteria ผ่านครบเท่านั้น
