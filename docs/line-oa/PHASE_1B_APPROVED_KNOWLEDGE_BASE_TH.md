# Phase 1B — Approved Knowledge Base (`Issue #8`)

เริ่ม implementation: 29 สิงหาคม 2026

Owner approval / effective date: `2026-08-30`

Review date: `2026-09-30`

สถานะ: `LIVE UAT FAILURE RECORDED / LOCAL FIX TEST PASS / THIS FIX NOT DEPLOYED / OWNER RE-UAT PENDING`

เอกสารนี้ทำตาม GitHub Issue #9 และ Issue #8 เท่านั้น งานรอบนี้ไม่อนุญาตให้ deploy เปลี่ยน LINE OA `มะลิปัง TEST` หรือเปิด/เปลี่ยน Production `มะลิปัง`

## Acceptance criteria และ Definition of Done

- schema มี source, owner, approvedAt, effectiveFrom/effectiveTo, reviewAt, maximumAgeDays, status, version และ checksum
- lookup ส่งเฉพาะ record `APPROVED` ที่อยู่ในช่วงมีผล ยังไม่ถึง review/maximum age และไม่มี active record ขัดกัน
- manifest exact answer ทั้ง 14 categories ตรง Owner approval และ SHA-256 checksum ของ UTF-8 answer
- ข้อมูล missing, future, expired, stale, malformed, checksum mismatch ระหว่าง validation หรือ active conflict ต้อง fail closed
- stock, daily promotion/filling, preorder, allergen, wholesale และ reward redemption ส่ง safe approved guidance แล้วเริ่ม handoff
- fallback ส่ง exact fallback แล้ว acknowledgement หนึ่งครั้ง จากนั้นบอตเงียบจน authorized staff close
- เมนูและราคาใช้รูป approved สองรูปตามลำดับ แล้วจึงส่งข้อความ stock disclaimer
- typed messages ทุกข้อความยัง silent ระหว่าง handoff; ห้ามใช้ text intent เป็นทางเลี่ยง bot silence
- เฉพาะ approved static TEST postback allowlist และ `test:show_wholesale` ตอบได้ระหว่าง handoff โดยไม่ acknowledgement ซ้ำและไม่เปลี่ยน handoff state
- static postback ต้องผ่าน Approved Knowledge Base; missing/stale/conflict ต้อง silent ระหว่าง handoff ส่วน unknown, `test:show_facebook` และ Production-like postback ต้อง fail closed
- แต้มตอบเฉพาะกติกาทั่วไป ไม่อ่าน/แก้ข้อมูลลูกค้า ไม่คำนวณแต้มรายบุคคล ไม่เรียก Reward Card URL และไม่แลกรางวัล
- Definition of Done ของ Issue #8 จะผ่านสมบูรณ์เมื่อ local checks ผ่าน, ได้ approval สำหรับ TEST deployment แยก และ Owner UAT จาก frozen deployed commit ผ่าน

## Implementation ที่เสร็จใน local branch

1. `config/approved-knowledge-base/test-knowledge-base.json` เป็น source of truth แบบ versioned สำหรับ `มะลิปัง TEST`
2. 14 categories เป็น `APPROVED`: Menu, Price, Location, Opening hours, Contact, Pickup, Storage, Allergen, Wholesale, Advance order, Delivery, Promotion, Loyalty และ Stock
3. ทุก record ใช้ Owner `MALISPANG_OWNER`, approval/effective `2026-08-30`, review/effective-to `2026-09-30`, version แยกตาม intent และ SHA-256 exact-answer checksum
4. validator ตรวจ schema และ checksum; lookup ปฏิเสธ stale/conflict และส่ง provenance เข้า redacted audit
5. Worker local routing ส่งรูปเมนูสองรูปจาก fixed TEST asset origin และไม่ใช้ภาพเป็นหลักฐาน stock
6. dynamic/high-risk intents ส่ง approved guidance พร้อม handoff acknowledgement หนึ่งครั้ง แล้ว Durable Object คง handoff silence
7. generic fallback เข้า handoff เช่นเดียวกัน; duplicate event ยังคงไม่ตอบซ้ำ
8. rich-menu reward route ใน local build ตอบกติกา `LOYALTY` จาก manifest โดยไม่สร้างปุ่ม/ใช้ Reward Card URL
9. กติกาพรีออเดอร์สำหรับพนักงานอยู่ใน `PREORDER_STAFF_POLICY_PHASE_1B_TH.md` แบบ reference-only; ไม่เริ่ม workflow Issue #2
10. `RouteDecision.allowDuringHandoff` เป็น capability ที่ตั้ง `true` ได้จาก static TEST postback allowlist เท่านั้น; typed classifier และ unsafe postback ตั้ง `false`
11. Durable Object ตอบ approved static postback ระหว่าง handoff โดยบันทึก processed event ตามเดิม, ส่ง `enteredHandoff=false` และคง state `HUMAN_HANDOFF`
12. menu lexicon version `2026-08-31-menu-v2` รองรับ `ขอเมนู`, `ขอเมนูหน่อย`, `เมนูขนมปัง`, `มีอะไรบ้าง`, `มีไรบ้าง` และ `ขอดูเมนู`

## พฤติกรรมตอบและ escalation

| กลุ่ม                                                | พฤติกรรม local ที่ตรวจ                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Menu / price                                         | รูป bread menu → รูป chiffon/cookie → exact reference/stock disclaimer  |
| Location / hours / contact / storage / Delivery      | exact approved answer จาก manifest; ไม่มี real-time claim               |
| Stock / daily promo-filling                          | ไม่ยืนยันค่าปัจจุบัน; ส่ง exact guidance → acknowledgement → silence    |
| Preorder / wholesale / allergen / reward redemption  | ส่ง exact limitations/requirements → acknowledgement → silence          |
| Payment / slip / refund / complaint / sensitive data | ไม่พยายามตอบ FAQ; เข้า handoff โดยตรง                                   |
| Unknown / unavailable / stale                        | exact fallback → acknowledgement หนึ่งครั้ง → silence                   |
| Loyalty rules                                        | ตอบกติกาทั่วไป; ไม่มี URL, customer lookup หรือ Reward Card operation   |
| Typed text ระหว่าง handoff                           | เงียบทั้งหมด แม้ข้อความจะตรง static FAQ                                 |
| Approved static TEST postback ระหว่าง handoff        | ตอบ approved content; ไม่ acknowledgement ซ้ำ; handoff state ไม่เปลี่ยน |
| Unknown / Production-like / Facebook postback        | Fail closed; ระหว่าง handoff ไม่ตอบข้อมูลใหม่                           |

## Live UAT failure และ corrective scope — 31 สิงหาคม 2026

Deployed commit `4fdd54d5f8d98ea977602b570ab9d6976009042f` ไม่รองรับข้อความ `ขอเมนูหน่อย` จึงส่ง fallback และเริ่ม handoff หลังจากนั้น `test:show_menu` ถูก Durable Object ตัดเป็น `HANDOFF_SILENCE` แม้เป็น Rich Menu postback ที่ Owner อนุมัติ การแก้ local รอบนี้แยก event capability ชัดเจน: typed text ไม่มีสิทธิ์ bypass silence ส่วน static TEST postback allowlist ตอบได้โดยไม่ปิด handoff

## Fail-closed date policy

record version นี้มีผลตั้งแต่ `2026-08-30T00:00:00+07:00` และ lookup ต้องปฏิเสธตั้งแต่ `2026-09-30T00:00:00+07:00` หากยังไม่มี Owner-reviewed version ใหม่ การทบทวนต้องสร้าง version/checksum ใหม่ ห้ามแก้ record ที่เคยใช้ย้อนหลัง

## Test evidence

- exact content/provenance/checksum ครบ 14 categories
- approved-only Thai lookup ครบทุก intent
- stale boundary `2026-09-30` และ conflict rejection
- daily stock/promotion/filling ไม่ถูกยืนยัน
- fallback/handoff acknowledgement ครั้งเดียว, duplicate protection และ bot silence
- expanded menu lexicon เข้า `MENU` โดยไม่เริ่ม handoff
- static allowlist ทั้งเจ็ดรายการและ wholesale guidance ตอบระหว่าง handoff โดย state ไม่เปลี่ยนและไม่มี acknowledgement ซ้ำ
- typed location/Delivery/loyalty wording, Facebook, unknown และ Production-like postback ยังคง silent/fail closed ระหว่าง handoff
- authorized/unauthorized staff close และ persistence fail-closed
- loyalty response ไม่มี customer/Reward Card operation
- Production credential/account safety guards
- full local suite: 193 Node tests + 24 Worker runtime tests = 217 ผ่าน
- formatting, ESLint, TypeScript, build, Flex/Rich Menu/manifest validation และ Worker dry-run ผ่าน

ผล command ชุดเต็มและ commit จะบันทึกใน GitHub Issue #8 หลัง final checks ผ่าน

## Rollback

รอบนี้ไม่มี external deployment จึงไม่มี live rollback หาก local regression ให้ revert commit ของ Phase 1B เท่านั้น ห้ามแก้ Worker/Webhook/LINE OA เพื่อชดเชย การ deploy ในอนาคตต้องมี approval แยก และต้องเก็บ stable TEST version สำหรับ rollback ก่อนเปลี่ยนระบบ

## งานค้างก่อนปิด Issue #8

1. Local full checks ผ่านและ freeze corrective commit ใหม่
2. Owner อนุมัติ TEST deployment ของ corrective commit แยกต่างหาก
3. Deploy เฉพาะ `มะลิปัง TEST` ตาม approval และตรวจ health/security gates
4. Owner re-UAT: `ขอเมนูหน่อย`, static Rich Menu postback ระหว่าง handoff, acknowledgement ครั้งเดียว และ typed silence
5. ปิด Issue #8 ได้เมื่อ acceptance criteria ผ่านครบพร้อมหลักฐานจริงเท่านั้น

ห้ามเริ่ม Issue #2, #4, #5 หรือ #6 และห้ามนำข้อมูล/credential/state ของ TEST ไป Production
