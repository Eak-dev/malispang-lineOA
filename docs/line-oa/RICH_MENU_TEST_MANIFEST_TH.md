# Rich Menu Manifest — มะลิปัง TEST

อัปเดตล่าสุด: 31 สิงหาคม 2026

สถานะ: `V2 POSTBACK PUBLISHED AND DEFAULT ON TEST / OWNER RE-UAT PASS`

## ขอบเขตและไฟล์

- บัญชีปลายทาง: `มะลิปัง TEST` เท่านั้น
- Rich Menu default ปัจจุบัน: `MalisPang TEST RM 39-50 postback v2`
- Rich Menu rollback ที่เก็บไว้: `MalisPang TEST RM 39-50 v1` — ไม่ถูกลบหรือแก้ไข
- Menu bar label: `รู้จักมะลิปัง`
- Default behavior: `Shown`
- LINE OA Manager Rich Menu ID: `20032979`
- Display period: `21 สิงหาคม 2026 00:00` ถึง `20 สิงหาคม 2027 23:59`
- Source artwork: `assets/test/malispang-test-rich-menu-original.png`
- Editable overlay: `assets/test/malispang-test-rich-menu-overlay.svg`
- Publishable image: `assets/test/malispang-test-rich-menu-publishable.jpeg`
- Public Worker asset: `public/rich-menu/malispang-test-rich-menu.jpeg`
- API-ready TEST payload: `config/rich-menu/malispang-test-rich-menu-postback-v2.json`
- Renderer source: `scripts/render-rich-menu.ts` (`pnpm render:rich-menu`)
- Local action preview: `artifacts/rich-menu-preview.html`

## ข้อกำหนดไฟล์

- ขนาด: `2500 × 1686` pixels
- MIME: `image/jpeg`
- ขนาดสูงสุดที่ validator ยอมรับ: `1,048,576` bytes
- SHA-256: `56668eec5b069763e0d974c90335e79eeed5e2fd31fe86c16dfeab42712cd392`

ภาพคงงานต้นฉบับไว้และแก้เฉพาะข้อความที่ Owner อนุมัติ:

- `เริ่มต้น 59 บาท` → `เริ่มต้น 39 บาท`
- `ทุกๆ 100 บาท รับ 1 แต้ม` → `ทุกๆ 50 บาท รับ 1 แต้ม`

## พื้นที่กด

| พื้นที่                | Bounds `(x,y,w,h)` | v2 action                                                 | ผลลัพธ์ TEST                                                          |
| ---------------------- | ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------- |
| A สะสมแต้มและโปรโมชั่น | `0,0,833,843`      | Postback `test:show_rewards`                              | Worker ตอบกติกา 50 บาท = 1 แต้ม พร้อมปุ่ม `เปิดบัตรสะสมแต้ม` ของ TEST |
| B ที่อยู่ร้าน          | `833,0,834,843`    | URI Google Maps                                           | Google Maps URL ที่ Owner ระบุ                                        |
| C Delivery             | `1667,0,833,843`   | Postback `test:show_delivery`                             | แจ้งว่ายังไม่มีบริการ Delivery                                        |
| D พื้นที่ตกแต่ง        | `0,843,833,843`    | No action; ไม่ส่งพื้นที่นี้ใน Messaging API areas payload | ไม่มี action                                                          |
| E เมนูของเรา           | `833,843,834,843`  | Postback `test:show_menu`                                 | รูปเมนู 1 → รูปเมนู 2 → ข้อความสั้น + Quick Reply คุยกับพนักงาน       |
| F Facebook             | `1667,843,833,843` | URI Facebook                                              | Facebook URL ที่ Owner ระบุ                                           |

พื้นที่ทั้งหกครอบคลุมภาพเต็มพอดี ไม่มีช่องว่าง ไม่มีพื้นที่ซ้อน และไม่เกินขอบภาพ

## Live UAT failure หลัง Phase 1B deploy — 31 สิงหาคม 2026

ภาพ Owner UAT แสดงว่าการกด Rich Menu ส่ง bubble `Delivery` และ `เมนูขนมปัง` แบบ customer text event Rich Menu v1 จึงไม่สามารถแยกการกดปุ่มออกจาก typed message ได้ เมื่อ conversation อยู่ใน `HUMAN_HANDOFF` Worker ต้องรักษา bot silence และไม่ตอบ event เหล่านี้ตาม Owner rule

ผลตรวจ read-only หลัง failure พบ active TEST handoff `1` รายการ การแก้ที่ปลอดภัยคือเปลี่ยนเฉพาะสาม action เป็น TEST postback v2 ข้างต้น ห้ามแก้ด้วยการยกเลิก typed-message silence หรือ auto-close handoff

Owner อนุมัติ external changes ทั้งสองรายการ และเมื่อ 31 สิงหาคม 2026 เวลา 07:31 น. (Asia/Bangkok) ได้ยืนยันบัญชีผ่าน Messaging API ว่าเป็น `มะลิปัง TEST`, validate payload, สร้าง v2, อัปโหลดรูป, ตั้ง v2 เป็น default และตรวจ config/hash รูปสำเร็จครบทุก gate ส่วน v1 ยังคงอยู่โดยไม่ถูกลบหรือแก้ไข

ใช้ authenticated TEST admin close เฉพาะ handoff ที่ Owner อนุมัติ โดยบังคับ precondition ว่าต้องมี active handoff เท่ากับ `1`; ผลหลัง close เหลือ `0` รายการ การดำเนินการนี้ไม่เปิด customer conversation และไม่ส่งข้อความ

Local validation ผ่านทั้ง exact TEST postback mapping, action bounds, URI allowlist, no-action omission, Production-like action rejection, secret scan และ full suite 218 tests

## Owner live UAT

Owner ยืนยัน Phase 1B corrective re-UAT เป็น `PASS` เมื่อ 31 สิงหาคม 2026 เวลา 09:36 น. (Asia/Bangkok): menu lexicon ตอบขณะ bot active, acknowledgement ส่งครั้งเดียว, Rich Menu static postback ตอบได้ระหว่าง handoff โดยไม่ reset state, typed messages ยังคงเงียบ และ Maps/Facebook เปิดถูกต้อง

Owner ยืนยัน `PASS` ครบ 8 ข้อเมื่อ 21 สิงหาคม 2026 เวลา 11:31 น. (Asia/Bangkok): Rich Menu แสดงอัตโนมัติ, chat bar ถูกต้อง, reward fail closed แสดงกติกา 50 บาทต่อ 1 แต้ม, Maps/Delivery/Menu/Facebook ถูกต้อง, acknowledgement ส่งครั้งเดียว และบอตเงียบหลัง handoff

หลัง UAT ได้หมุน `TEST_ADMIN_KEY` ตาม Owner approval และใช้ authenticated `OWNER_TEST` ปิด handoff ของผู้ทดสอบ 1 รายการแล้ว โดยตรวจยืนยัน active handoff เหลือ `0` เมื่อ 21 สิงหาคม 2026 เวลา 11:41 น. (Asia/Bangkok)

## Reward Card TEST และ Worker entry point

Reward Card `บัตรแต้ม TEST` ถูก Publish แยกใต้บัญชี `มะลิปัง TEST` แล้ว โดยมีเป้าหมาย 50 แต้ม, Welcome bonus 0, Reminder None, cooldown วันละครั้ง และ Voucher `รางวัล TEST ไม่มีมูลค่า` พร้อมโลโก้มะลิปัง ผล read-only configuration UAT เมื่อ 28 สิงหาคม 2026 เวลา 01:35 น. เป็น `PASS` และไม่พบการเชื่อม Production ตามหลักฐาน UI ที่ตรวจได้

Owner อนุมัติเมื่อ 28 สิงหาคม 2026 ให้ใช้ `No expiration` สำหรับ TEST และกำหนด action ให้ปิดบัตรด้วยตนเองภายใน 31 ธันวาคม 2026 จากนั้นอนุมัติให้แจกผ่าน Rich Menu ของ TEST โดย Worker เก็บ URL จริงใน encrypted secret และตอบด้วยปุ่ม `เปิดบัตรสะสมแต้ม`

Owner live UAT เมื่อ 28 สิงหาคม 2026 เวลา 11:40 น. ผ่าน flow กด Rich Menu → เปิดบัตร → รับบัตร → เพิ่ม 1 แต้ม และยืนยันว่าแต้มเป็น 1 โดยไม่เปิด Users/Usage history และไม่บันทึกข้อมูลผู้ใช้ รายละเอียดอยู่ใน `docs/line-oa/REWARD_CARD_TEST_UAT_TH.md`

## Rollback

1. ยืนยันบัญชี `มะลิปัง TEST` และ Rich Menu default ปัจจุบันเป็น `MalisPang TEST RM 39-50 postback v2`
2. หาก v2 UAT ไม่ผ่าน ให้ยกเลิก Messaging API default ของ v2 เพื่อให้ OA Manager v1 เดิมกลับมาควบคุม default; ห้ามลบ v1 ระหว่าง rollout
3. Unset/หยุดแสดง v2 ได้โดยไม่ลบ resource; การลบ v2 หรือ v1 ต้องขออนุมัติแยก
4. การเปลี่ยน action map ครั้งนี้ไม่ต้อง deploy Worker ใหม่ เพราะ Worker version ปัจจุบันรองรับ TEST postback แล้ว
5. QR UAT หมดอายุ 29 สิงหาคม 2026; หากต้องยกเลิกก่อนกำหนดให้ดำเนินการเฉพาะ TEST
6. ห้ามแก้ Rich Menu หรือ Reward Card ของ Production `มะลิปัง`

## Security follow-up

ระหว่างตรวจ LINE Developers Console ระบบอัตโนมัติอ่าน DOM ของหน้า TEST ซึ่งมี long-lived Channel Access Token แสดงอยู่ในหน้าโดยตรง ค่าดังกล่าวไม่ได้ถูกทำซ้ำในรายงาน, terminal, Git, เอกสาร หรือ GitHub Issue และไม่ได้ออก token ใหม่ การหมุน TEST token เป็นงาน security follow-up ที่ต้องขอ Owner approval แยกก่อนดำเนินการ
