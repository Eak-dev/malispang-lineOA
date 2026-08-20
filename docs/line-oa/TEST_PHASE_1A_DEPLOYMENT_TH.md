# มะลิปัง TEST — Phase 1A Deployment

อัปเดตล่าสุด: 20 สิงหาคม 2026

ขอบเขต: `มะลิปัง TEST` เท่านั้น

สถานะ: **TEST_WEBHOOK_LIVE / OWNER_LIVE_UAT_PENDING**

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

Collision check ยืนยันว่า active global Auto-response rules = 0 จึงไม่มี native global reply ชนกับ Worker; Rich Menu และ Flex Menu ยังไม่ถูก Publish/ส่งจริง

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

## ขั้นตอนคงเหลือ

1. Owner ส่ง UAT messages จาก LINE ส่วนตัวเข้าบัญชี `มะลิปัง TEST` เพื่อทดสอบ reply token จริง, Quick Reply, handoff silence และ authorized staff-close
2. Owner ยืนยันว่า TEST_SEED ราคา 39 บาท, ที่ตั้ง, เวลาร้าน และการเก็บรักษาถูกต้องก่อนนำไปใช้เป็น authoritative source
3. Owner ตัดสินใจข้อมูลที่ขัดแย้งในภาพ Rich Menu (ภาพระบุ 59 บาท) รวมถึงโปรโมชัน/แต้ม, Facebook URL และ Delivery destination
4. Publish Rich Menu ได้เฉพาะเมื่อข้อ 3 ผ่านครบ; ขณะนี้ `publishable=false`

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
