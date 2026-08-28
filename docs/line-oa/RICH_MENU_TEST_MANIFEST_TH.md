# Rich Menu Manifest — มะลิปัง TEST

อัปเดตล่าสุด: 28 สิงหาคม 2026

สถานะ: `PUBLISHED_CURRENT_MENU / OWNER_UAT_PASS / REWARD_FAIL_CLOSED`

## ขอบเขตและไฟล์

- บัญชีปลายทาง: `มะลิปัง TEST` เท่านั้น
- ชื่อ Rich Menu: `MalisPang TEST RM 39-50 v1`
- Menu bar label: `รู้จักมะลิปัง`
- Default behavior: `Shown`
- LINE OA Manager Rich Menu ID: `20032979`
- Display period: `21 สิงหาคม 2026 00:00` ถึง `20 สิงหาคม 2027 23:59`
- Source artwork: `assets/test/malispang-test-rich-menu-original.png`
- Editable overlay: `assets/test/malispang-test-rich-menu-overlay.svg`
- Publishable image: `assets/test/malispang-test-rich-menu-publishable.jpeg`
- Public Worker asset: `public/rich-menu/malispang-test-rich-menu.jpeg`
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

| พื้นที่                | Bounds `(x,y,w,h)` | Native action               | ผลลัพธ์ TEST                                                                              |
| ---------------------- | ------------------ | --------------------------- | ----------------------------------------------------------------------------------------- |
| A สะสมแต้มและโปรโมชั่น | `0,0,833,843`      | Text `สะสมแต้มและโปรโมชั่น` | ยังตอบแบบ fail closed และห้ามแจก Reward Card URL จนกว่าจะได้รับ Owner approval แยกต่างหาก |
| B ที่อยู่ร้าน          | `833,0,834,843`    | Link                        | Google Maps URL ที่ Owner ระบุ                                                            |
| C Delivery             | `1667,0,833,843`   | Text `Delivery`             | แจ้งว่ายังไม่มีบริการ Delivery                                                            |
| D พื้นที่ตกแต่ง        | `0,843,833,843`    | No action                   | ไม่มี action                                                                              |
| E เมนูของเรา           | `833,843,834,843`  | Text `เมนูขนมปัง`           | รูปเมนู 1 → รูปเมนู 2 → ข้อความสั้น + Quick Reply คุยกับพนักงาน                           |
| F Facebook             | `1667,843,833,843` | Link                        | Facebook URL ที่ Owner ระบุ                                                               |

พื้นที่ทั้งหกครอบคลุมภาพเต็มพอดี ไม่มีช่องว่าง ไม่มีพื้นที่ซ้อน และไม่เกินขอบภาพ

## Owner live UAT

Owner ยืนยัน `PASS` ครบ 8 ข้อเมื่อ 21 สิงหาคม 2026 เวลา 11:31 น. (Asia/Bangkok): Rich Menu แสดงอัตโนมัติ, chat bar ถูกต้อง, reward fail closed แสดงกติกา 50 บาทต่อ 1 แต้ม, Maps/Delivery/Menu/Facebook ถูกต้อง, acknowledgement ส่งครั้งเดียว และบอตเงียบหลัง handoff

หลัง UAT ได้หมุน `TEST_ADMIN_KEY` ตาม Owner approval และใช้ authenticated `OWNER_TEST` ปิด handoff ของผู้ทดสอบ 1 รายการแล้ว โดยตรวจยืนยัน active handoff เหลือ `0` เมื่อ 21 สิงหาคม 2026 เวลา 11:41 น. (Asia/Bangkok)

## Reward Card TEST และ fail-closed action

Reward Card `บัตรแต้ม TEST` ถูก Publish แยกใต้บัญชี `มะลิปัง TEST` แล้ว โดยมีเป้าหมาย 50 แต้ม, Welcome bonus 0, Reminder None, cooldown วันละครั้ง และ Voucher `รางวัล TEST ไม่มีมูลค่า` พร้อมโลโก้มะลิปัง ผล read-only configuration UAT เมื่อ 28 สิงหาคม 2026 เวลา 01:35 น. เป็น `PASS` และไม่พบการเชื่อม Production ตามหลักฐาน UI ที่ตรวจได้

Owner อนุมัติเมื่อ 28 สิงหาคม 2026 ให้ใช้ `No expiration` สำหรับ TEST และกำหนด action ให้ปิดบัตรด้วยตนเองภายใน 31 ธันวาคม 2026 จึงปิด Issue #3 ได้ อย่างไรก็ตาม Text action ยังคง fail closed และห้ามแจก Reward card URL ผ่าน Rich Menu จนกว่าจะมี Owner approval แยก รายละเอียดอยู่ใน `docs/line-oa/REWARD_CARD_TEST_UAT_TH.md`

## Rollback

1. ยืนยันหน้าจอเป็น `มะลิปัง TEST`
2. Unset/หยุดแสดง Rich Menu นี้เป็นค่า default
3. หากต้องลบ Rich Menu ให้ขออนุมัติการลบแยกต่างหาก
4. Worker rollback ใช้ Cloudflare Version ของ `malispang-lineoa-test` ก่อน deployment ครั้งนี้
5. ห้ามแก้ Rich Menu หรือ Reward Card ของ Production `มะลิปัง`
