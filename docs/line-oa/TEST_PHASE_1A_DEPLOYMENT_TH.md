# มะลิปัง TEST — Phase 1A Deployment

อัปเดตล่าสุด: 21 สิงหาคม 2026

ขอบเขต: `มะลิปัง TEST` เท่านั้น

สถานะ: **TEST_WEBHOOK_LIVE / RICH_MENU_PUBLISHED / OWNER_RICH_MENU_UAT_PASS**

## สถานะภายนอกที่ยืนยันแล้ว

- LINE Provider: `MalisPang TEST Sandbox`
- LINE Messaging API Channel: สร้างและผูกกับ `มะลิปัง TEST` แล้ว
- Messaging API: Enabled
- Cloudflare Worker: `malispang-lineoa-test`
- Test endpoint: `https://malispang-lineoa-test.eakkachai-dev.workers.dev`
- Persistence: Durable Objects with SQLite
- Webhook: ตั้ง Test URL แล้ว, LINE Verify สำเร็จ และ `Use webhook` เปิดอยู่
- Cloudflare encrypted secrets: ตั้งครบ `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_BOT_USER_ID` และ `TEST_ADMIN_KEY` แล้ว (บันทึกเฉพาะชื่อ ไม่บันทึกค่า)
- Channel Access Token ผ่านการตรวจชื่อบอตเป็น `มะลิปัง TEST`
- Live safety checks: health `200`, invalid signature `401`, unauthenticated admin `401`, authenticated admin `200`, signed empty webhook `200`
- Production `มะลิปัง`: ไม่ได้เปิดและไม่ได้เปลี่ยนแปลง
- Owner live UAT วันที่ 20 สิงหาคม 2026: ผ่านทั้งการดูเมนู, เริ่ม handoff, acknowledgement ครั้งเดียว และ bot silence
- Menu image deployment วันที่ 21 สิงหาคม 2026:
  - deployed Git commit: `03b0de0187f5d5639eeba63ccc6c4d09143b7ad4`
  - Cloudflare version: `fae3bb7c-9951-4df1-a72a-abfe236918db`
  - deploy command: `pnpm exec wrangler deploy --minify --keep-vars`
  - automated tests: 85/85 ผ่าน (Node 77 + Worker runtime 8)
  - `/health`: `200`
  - `/menu/bread-menu.jpeg`: `200 image/jpeg`
  - `/menu/chiffon-cookie-menu.jpeg`: `200 image/jpeg`
  - SHA-256 ของรูป live ทั้งสองตรงกับไฟล์ใน repository
  - invalid webhook signature: `401`
- Owner menu UAT วันที่ 21 สิงหาคม 2026: **PASS**
  - ได้ภาพเมนูขนมปังและภาพเมนูชิฟฟ่อน/คุกกี้ครบ 2 ใบ
  - ได้ข้อความสั้นแจ้งว่าสินค้าอาจมีไม่ครบทุกวัน
  - แสดง Quick Reply `คุยกับพนักงาน`
  - กด Quick Reply แล้วได้รับ acknowledgement หนึ่งครั้งและเข้าสู่ handoff
  - การทดสอบครั้งแรกที่บอตเงียบเกิดจาก handoff เดิมค้างอยู่ ซึ่งตรงตาม bot-silence requirement
  - ปิด handoff หลัง UAT ด้วย authenticated `OWNER_TEST` แล้ว; active handoff คงเหลือ `0`
- Rich Menu deployment วันที่ 21 สิงหาคม 2026:
  - Worker source commit: `47bc0a87d10aaaa0cfd34cad00e6998cdf3fa946`
  - Cloudflare version: `0d492401-c76f-4f76-aea8-7cf9d0e5a3ba`
  - Rich Menu ID/name: `20032979` / `MalisPang TEST RM 39-50 v1`
  - LINE OA Manager แสดงเป็น `Current menu` และ `This menu is shown to users.`
  - Display period: 21 สิงหาคม 2026 00:00 ถึง 20 สิงหาคม 2027 23:59
  - `/health`, รูปเมนูสองใบ และภาพ Rich Menu: `200` พร้อม MIME ถูกต้อง
  - SHA-256 ของภาพ Rich Menu live ตรง repository: `56668eec5b069763e0d974c90335e79eeed5e2fd31fe86c16dfeab42712cd392`
  - invalid webhook signature: `401`
  - Owner live UAT Rich Menu: **PASS — 21 สิงหาคม 2026 เวลา 11:31 น. (Asia/Bangkok)**
  - Owner ยืนยันครบ 8 ข้อ: Rich Menu แสดงอัตโนมัติพร้อมแถบ `รู้จักมะลิปัง`, กติกาแต้มแบบ fail closed, Maps, Delivery, รูปเมนูสองใบ, Facebook, acknowledgement ครั้งเดียว และ bot silence
  - หลัง Owner อนุมัติ ได้หมุน `TEST_ADMIN_KEY` เฉพาะ Worker TEST เมื่อ 21 สิงหาคม 2026 เวลา 11:41 น. เก็บค่าใหม่ใน macOS Keychain และ Cloudflare encrypted secret โดยไม่แสดงค่า
  - ใช้ authenticated `OWNER_TEST` ปิด handoff ของผู้ทดสอบ `1` รายการ และตรวจยืนยัน active handoff จาก `1` เหลือ `0`
  - Secret-only Worker version: `9ef906f6-ae5f-4bc5-b21c-b40369c2a9ab`; code deployment version ยังคง `0d492401-c76f-4f76-aea8-7cf9d0e5a3ba`

## Response settings — ก่อน/หลังเปิด Webhook

| รายการ                 | ก่อน                   | หลัง                   | หมายเหตุ                               |
| ---------------------- | ---------------------- | ---------------------- | -------------------------------------- |
| Chat                   | ON                     | ON                     | คงไว้สำหรับพนักงาน                     |
| Greeting message       | ON                     | ON                     | ทำงานเมื่อเพิ่มเพื่อน ไม่ใช่ทุกข้อความ |
| Response hours         | ON                     | ON                     | ไม่เปลี่ยน                             |
| ระหว่าง response hours | Manual chat            | Manual chat            | ไม่เปลี่ยน                             |
| นอก response hours     | Auto-response messages | Auto-response messages | ไม่มี active rule จึงไม่ตอบซ้ำ         |
| `Default`              | OFF                    | OFF                    | ข้อความ misleading ไม่ทำงาน            |
| `Add Friend`           | ไม่พบ                  | ไม่พบ                  | ไม่ได้สร้าง                            |
| Webhook                | OFF/ยังไม่ตั้ง URL     | ON/Verified            | เปลี่ยนเฉพาะบัญชี TEST                 |

Collision check ยืนยันว่า active global Auto-response rules = 0 จึงไม่มี native global reply ชนกับ Worker; Rich Menu ถูก Publish เฉพาะ TEST แล้ว ส่วน Flex Menu ไม่ได้ส่งเป็น global response

## พฤติกรรมตอบลูกค้า

ลำดับการทำงาน:

`signature verification → Test account guard → idempotency → handoff state → approved FAQ/Test seed → safe fallback → redacted audit`

- คำตอบ FAQ, fallback และ Flex Menu แนบ LINE Quick Reply เพียงปุ่มเดียว: `คุยกับพนักงาน`
- Quick Reply ใช้ postback `test:human_handoff`
- เมื่อกดแล้ว LINE จะซ่อน Quick Reply และระบบเข้าสู่ human handoff
- ระบบส่ง acknowledgement หนึ่งครั้ง แล้วบอตเงียบข้าม request จน staff ที่อยู่ใน Test allowlist ปิด handoff
- acknowledgement และข้อความรับรูปไม่มี Quick Reply จึงไม่เกิดปุ่มซ้ำระหว่าง handoff
- duplicate event ที่ส่งสำเร็จแล้วไม่ตอบซ้ำ
- persistence error, signature ผิด หรือ destination ไม่ตรง Test จะ fail closed

## เมนูรูปภาพฉบับ Owner — 21 สิงหาคม 2026

- Owner อนุมัติให้ใช้ภาพเมนูใหม่สองใบกับบัญชี `มะลิปัง TEST`:
  - `public/menu/bread-menu.jpeg` — เมนูขนมปัง 22 รายการ
  - `public/menu/chiffon-cookie-menu.jpeg` — เมนูชิฟฟ่อนและคุกกี้
- เมื่อผู้ใช้พิมพ์ `เมนู`, `มีเมนูอะไรบ้าง`, `เมนูขนมปัง`, `รายการขนม` หรือ `ดูเมนู` ระบบตอบรูปทั้งสองใบแทนข้อความรายการยาว
- postback `test:show_menu` จาก Flex Menu ใช้คำตอบรูปชุดเดียวกัน
- ข้อความสุดท้ายแจ้งว่าสินค้าอาจมีไม่ครบทุกวันและมี Quick Reply `คุยกับพนักงาน`
- URL รูปถูกจำกัดแบบ fail closed ให้ใช้เฉพาะ `https://malispang-lineoa-test.eakkachai-dev.workers.dev` ไม่อนุญาต host อื่น
- การเปลี่ยนแปลงนี้ไม่ Publish Rich Menu และไม่แตะ Production `มะลิปัง`

## Rich Menu ตามภาพ Owner — 21 สิงหาคม 2026

- ใช้ภาพ Owner เดิมและโครง 6 พื้นที่:
  - สะสมแต้มและโปรโมชัน
  - ที่อยู่ร้าน
  - Delivery
  - เมนูของเรา
  - Facebook
- แก้ข้อความตาม Owner: `เริ่มต้น 39 บาท` และ `ซื้อครบ 50 บาท รับ 1 แต้ม`
- ไฟล์ publishable: `assets/test/malispang-test-rich-menu-publishable.jpeg` (`2500 × 1686`, JPEG, ไม่เกิน 1 MB)
- Action map: `docs/line-oa/production-mirror/test-rich-menu-action-map.json`
- ปุ่ม `คุยกับพนักงาน` เพิ่มเป็น Quick Reply นอกภาพ เพื่อคงเมนูเดิมและให้ปุ่มหายหลังการกดตาม UX ที่ Owner ต้องการ
- Owner ยืนยัน Maps URL, Facebook URL, ข้อความ Delivery และกติกาสะสมแต้มแล้ว
- Reward Card ยังไม่ Publish เพราะยังขาด Main reward/voucher, points till goal, expiration และ cooldown; ปุ่มสะสมแต้มจึงตอบแบบ fail closed และไม่เชื่อม Production
- Rich Menu ถูก Publish เป็น Current menu เฉพาะ `มะลิปัง TEST` แล้ว และ Owner live UAT ผ่านครบ 8 ข้อเมื่อ 21 สิงหาคม 2026 เวลา 11:31 น. (Asia/Bangkok)

## Persistence และ retention

- processed event ID: 24 ชั่วโมง
- redacted audit event: 7 วัน
- handoff state: คงอยู่จน authorized staff-close
- ไม่เก็บข้อความลูกค้าเต็ม, รูปสลิป, token, secret, เบอร์โทรเต็ม หรือที่อยู่เต็ม

## Secrets

ค่าจริงต้องอยู่ใน Cloudflare encrypted secrets และ local Keychain เท่านั้น:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_BOT_USER_ID`
- `TEST_ADMIN_KEY`

ห้ามบันทึกค่าจริงใน `.dev.vars`, `.env`, log, screenshot, Git หรือเอกสาร

## ขั้นตอนคงเหลือ

1. Owner ยืนยันว่า TEST_SEED ที่ตั้ง, เวลาร้าน และการเก็บรักษาถูกต้องก่อนนำไปใช้เป็น authoritative source
2. Owner กำหนด Main reward/voucher, points till goal, expiration, reminder, welcome bonus และ cooldown ก่อนสร้าง Reward Card TEST
3. กำหนด Owner และรอบเวลาสำหรับการ rotate/recover `TEST_ADMIN_KEY` ครั้งถัดไป โดยห้ามบันทึกค่าจริงใน Git หรือเอกสาร

## Rollback

### ปิด Webhook ทันที

1. เข้า Messaging API ของ `มะลิปัง TEST`
2. ปิด `Use webhook`
3. ตรวจว่า webhook ไม่ได้รับ event ใหม่

### ย้อน Worker

ใช้ Cloudflare Versions/Rollback กับ `malispang-lineoa-test` เท่านั้น ห้ามเลือก resource ที่ไม่มีคำว่า Test

### ถอน Credential

1. Revoke Channel Access Token ของ Test ใน LINE Developers
2. Rotate Channel Secret ของ Test
3. ลบ/แทนที่ Cloudflare secrets ที่เกี่ยวข้อง

### ย้อน Rich Menu

Unset default Rich Menu ของ `มะลิปัง TEST` ก่อน จากนั้นจึงลบ Test Rich Menu เมื่อ Owner อนุมัติการลบแยกต่างหาก
