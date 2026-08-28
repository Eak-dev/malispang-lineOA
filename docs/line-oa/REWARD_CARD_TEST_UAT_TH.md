# Reward Card TEST — Configuration and live distribution UAT

ตรวจล่าสุด: 28 สิงหาคม 2026 เวลา 11:40 น. (Asia/Bangkok)

สถานะ: `REWARD_CARD_TEST_LIVE_UAT_PASS / OWNER_NO_EXPIRATION_APPROVED / MANUAL_CLOSE_REQUIRED / ISSUE_3_CLOSED`

## ขอบเขตและหลักฐาน

- ตรวจเฉพาะบัญชีที่ชื่อบนหน้าจอเป็น `มะลิปัง TEST` ตรงทุกตัวอักษร
- ตรวจผ่านหน้า Card settings, Distribute card, Reward card URL และหน้ารายละเอียด Voucher แบบ read-only
- Reward card URL ของ TEST ถูกส่งเข้า Cloudflare encrypted secret `TEST_REWARD_CARD_URL` โดยตรง ไม่แสดงค่าและไม่บันทึก URL จริงใน repository, log หรือรายงาน
- Rich Menu ยังคงใช้ native Text action เดิม แต่ Worker ตอบเป็นข้อความกติกาพร้อมปุ่ม `เปิดบัตรสะสมแต้ม`
- Owner ทดสอบผ่าน LINE ส่วนตัว: กด Rich Menu → เปิดบัตร → รับบัตร → สแกน QR เพิ่ม 1 แต้ม → ยืนยันว่าแต้มเป็น 1
- ไม่เปิด Users, Usage history หรือ customer chat และไม่เก็บ QR code, account/card ID หรือข้อมูลผู้ใช้ใน repository
- ไม่เปิดหรือแก้ไข Production `มะลิปัง`

## ผล UAT

| รายการ               | ผลที่ตรวจพบ                                                                                                        | สถานะ                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| บัญชี                | `มะลิปัง TEST`                                                                                                     | PASS                    |
| ชื่อบัตร             | `บัตรแต้ม TEST`                                                                                                    | PASS                    |
| แต้มเริ่มต้น         | Welcome bonus `0` แต้ม                                                                                             | PASS                    |
| เป้าหมาย             | `50` แต้ม                                                                                                          | PASS                    |
| กติกา                | `ซื้อครบ 50 บาท รับ 1 แต้ม` อยู่ใน Card guidelines พร้อมข้อความ `TEST ONLY`                                        | PASS                    |
| Cooldown             | รับแต้มได้วันละครั้งและรีเซ็ตเวลา 00:00                                                                            | PASS                    |
| Reminder             | `None`                                                                                                             | PASS                    |
| Voucher              | `รางวัล TEST ไม่มีมูลค่า` พร้อมข้อความว่าใช้ทดสอบเท่านั้นและไม่สามารถแลกสินค้า เงินสด ส่วนลด หรือสิทธิประโยชน์จริง | PASS                    |
| ภาพ Voucher          | แสดงโลโก้มะลิปังในภาพ Voucher                                                                                      | PASS                    |
| Voucher expiration   | `Non-expiring`                                                                                                     | PASS ตามค่าที่สร้างจริง |
| การแยกจาก Production | หน้า Account และ Distribution ผูกกับ `มะลิปัง TEST`; ไม่เลือก ไม่เปิด และไม่เชื่อม resource ของ Production         | PASS ตามหลักฐาน UI      |
| การรับบัตร           | Owner เปิดและรับ `บัตรแต้ม TEST` ผ่านปุ่มจาก Worker สำเร็จ                                                         | PASS                    |
| การออกแต้ม           | Owner สแกน QR TEST จำนวน 1 ครั้งและยืนยันว่าแต้มเพิ่มเป็น 1                                                        | PASS                    |

## Owner decision — No expiration

- ข้อกำหนดเดิม: บัตรหมดอายุวันที่ `31 ธันวาคม 2026`
- ค่าที่ Publish จริง: `No expiration` (`Not set`)
- LINE OA Manager แสดงว่าค่า Expiration เปลี่ยนไม่ได้หลัง Publish
- Owner อนุมัติเมื่อ 28 สิงหาคม 2026 ให้ใช้ `No expiration` สำหรับ `มะลิปัง TEST`
- Owner action: ต้องปิดบัตรด้วยตนเองภายในวันที่ `31 ธันวาคม 2026`
- ไม่มีการแก้ไขหรือ Suspend บัตรในการบันทึก decision นี้
- GitHub Issue #3 ปิดได้เมื่อเอกสารและ acceptance criteria สะท้อน decision นี้แล้ว

การปิดบัตรในอนาคตเป็น external action แยกต่างหาก ผู้ดำเนินการต้องยืนยันว่าบัญชีเป็น `มะลิปัง TEST`, ตรวจคำเตือนและผลกระทบของ LINE และขอ action-time confirmation ก่อนกดปุ่มสุดท้าย ห้ามทำกับ Production

## Issue #3 acceptance criteria

- [x] Reward Card และ Voucher เป็น TEST-only และไม่มีมูลค่า
- [x] กติกา 50 บาท = 1 แต้ม, เป้าหมาย 50 แต้ม, Welcome bonus 0, Reminder None และ cooldown วันละครั้งได้รับการยืนยัน
- [x] Reward Card TEST แยกจาก Production ตามหลักฐาน UI ที่ตรวจได้
- [x] Owner live UAT รับบัตรและเพิ่มแต้ม 1 ครั้งสำเร็จ โดยไม่เปิด Users, Usage history หรือข้อมูลผู้ใช้
- [x] Owner อนุมัติ `No expiration` พร้อม manual-close action ภายใน 31 ธันวาคม 2026
- [x] Owner อนุมัติการแจก Reward Card TEST ผ่าน Worker และ live UAT ผ่านครบ flow
- [x] Production `มะลิปัง` ยังคงอยู่นอกขอบเขต

## สถานะการเผยแพร่และการเชื่อม Rich Menu

- Reward Card TEST ถูก Publish แล้วและแยกอยู่ใต้บัญชี `มะลิปัง TEST`
- Rich Menu action เดิมส่งข้อความ `สะสมแต้มและโปรโมชั่น` ไปยัง Worker ซึ่งตอบข้อความ TEST พร้อมปุ่ม `เปิดบัตรสะสมแต้ม`
- URL จริงอยู่เฉพาะ Cloudflare encrypted secret `TEST_REWARD_CARD_URL`; ไม่เก็บใน Git และไม่ใช้ URL ของ Production
- Worker version `59674297-4c83-4f8e-8460-dcd001c6f0c5` deploy จาก commit `9dd3c88`
- QR สำหรับ UAT ชื่อ `TEST UAT 1 point 2026-08-28`, ให้ 1 แต้ม, ไม่จำกัดตำแหน่ง และหมดอายุ 29 สิงหาคม 2026
- Webhook, Token และ Channel credentials เดิมไม่ถูกหมุนหรือเปลี่ยน และไม่แตะ Production

## ข้อสรุป

Reward Card TEST ผ่านทั้ง configuration UAT และ live distribution UAT แล้ว การอนุมัตินี้ครอบคลุมเฉพาะ `มะลิปัง TEST`; การใช้กับ Production ยังไม่ได้รับอนุมัติ

## Rollback การแจกบัตร

1. Rollback Worker `malispang-lineoa-test` ไปยัง code version ก่อนเปิดปุ่ม Reward Card เพื่อกลับสู่ข้อความ fail closed
2. QR UAT หมดอายุอัตโนมัติวันที่ 29 สิงหาคม 2026; หากต้องยกเลิกก่อนกำหนดให้ดำเนินการเฉพาะบัญชี `มะลิปัง TEST`
3. การ Suspend Reward Card เป็นการกระทำแยก ต้องยืนยันบัญชี TEST และขอ action-time confirmation ก่อนปุ่มสุดท้าย
4. ห้ามลบ เชื่อม หรือแก้ Reward Card ของ Production `มะลิปัง`
