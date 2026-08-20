# มะลิปัง TEST — Phase 1A Deployment

อัปเดตล่าสุด: 20 สิงหาคม 2026

ขอบเขต: `มะลิปัง TEST` เท่านั้น

สถานะ: **WORKER_DEPLOYED / LINE_WEBHOOK_NOT_YET_ENABLED**

## สถานะภายนอกที่ยืนยันแล้ว

- LINE Provider: `MalisPang TEST Sandbox`
- LINE Messaging API Channel: สร้างและผูกกับ `มะลิปัง TEST` แล้ว
- Messaging API: Enabled
- Cloudflare Worker: `malispang-lineoa-test`
- Test endpoint: `https://malispang-lineoa-test.eakkachai-dev.workers.dev`
- Persistence: Durable Objects with SQLite
- Webhook: ยังไม่ตั้ง URL, ยังไม่ Verify และยังไม่เปิด Use webhook
- Cloudflare encrypted secrets: มีเฉพาะ `TEST_ADMIN_KEY`; ยังไม่มี LINE secret/token/bot identifier
- Production `มะลิปัง`: ไม่ได้เปิดและไม่ได้เปลี่ยนแปลง

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

## Rich Menu ตามภาพ Owner

- ใช้ภาพ Owner เดิม 5 ส่วนโดยไม่เปลี่ยนเนื้อหา:
  - สะสมแต้มและโปรโมชัน
  - ที่อยู่ร้าน
  - Delivery
  - เมนูของเรา
  - Facebook
- ไฟล์ local: `assets/test/malispang-test-rich-menu-original.png`
- ปุ่ม `คุยกับพนักงาน` เพิ่มเป็น Quick Reply นอกภาพ เพื่อคงเมนูเดิมและให้ปุ่มหายหลังการกดตาม UX ที่ Owner ต้องการ
- ยังไม่ Publish Rich Menu เพราะภาพระบุราคาเริ่มต้น 59 บาท แต่ Test seed ในระบบระบุ 39 บาท และยังไม่ได้ยืนยันสถานะโปรโมชัน/แต้ม, Facebook URL และ Delivery destination

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

## ขั้นตอนคงเหลือหลัง Owner login LINE Developers

1. ยืนยัน Channel name `มะลิปัง TEST` และ Provider `MalisPang TEST Sandbox`
2. ออก/อ่าน Channel Secret และเก็บตรงเข้า Keychain + Cloudflare encrypted secret
3. ออก Test Channel Access Token, ตรวจ bot display name ว่าเป็น `มะลิปัง TEST`, แล้วเก็บตรงเข้า secret manager
4. เก็บ Test bot identifier แบบไม่แสดงค่า
5. Deploy final bundle ที่มี required-secret gate
6. ตั้ง Webhook URL เป็น Test endpoint `/webhook`, Verify และเปิด Use webhook
7. ตรวจ LINE OA Test response settings ไม่ให้ native auto-response ชนกับ webhook
8. ทำ live UAT เฉพาะบัญชี Test
9. Publish Rich Menu เฉพาะเมื่อ Owner ยืนยันข้อมูลที่ขัดแย้งครบ

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
