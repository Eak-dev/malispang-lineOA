# Reward Card TEST — Read-only UAT

ตรวจล่าสุด: 28 สิงหาคม 2026 เวลา 01:35 น. (Asia/Bangkok)

สถานะ: `REWARD_CARD_TEST_UAT_PASS / OWNER_NO_EXPIRATION_APPROVED / MANUAL_CLOSE_REQUIRED / ISSUE_3_CLOSED`

## ขอบเขตและหลักฐาน

- ตรวจเฉพาะบัญชีที่ชื่อบนหน้าจอเป็น `มะลิปัง TEST` ตรงทุกตัวอักษร
- ตรวจผ่านหน้า Card settings, Distribute card, Reward card URL และหน้ารายละเอียด Voucher แบบ read-only
- Reward card URL เปิดไปยังหน้า LINE Reward Cards อย่างเป็นทางการ แต่บนเดสก์ท็อปแสดงคำแนะนำให้เปิดผ่าน LINE บนสมาร์ตโฟน จึงไม่ได้สแกน QR, รับบัตร หรือเพิ่มแต้ม
- ไม่เปิด Users, Usage history หรือ customer chat และไม่เก็บ Reward card URL, QR code, account/card ID หรือข้อมูลผู้ใช้ใน repository
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
| การออกแต้ม           | ไม่สแกน QR, ไม่รับบัตร และไม่เพิ่มแต้ม                                                                             | PASS                    |

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
- [x] UAT ไม่สแกน QR, ไม่ออกแต้ม และไม่เข้าถึงข้อมูลผู้ใช้
- [x] Owner อนุมัติ `No expiration` พร้อม manual-close action ภายใน 31 ธันวาคม 2026
- [x] Reward Card URL ยังคงไม่เชื่อม Rich Menu และต้องมี Owner approval แยกก่อนแจก
- [x] Production `มะลิปัง` ยังคงอยู่นอกขอบเขต

## สถานะการเผยแพร่และการเชื่อม Rich Menu

- Reward Card TEST ถูก Publish แล้วและแยกอยู่ใต้บัญชี `มะลิปัง TEST`
- Rich Menu action เดิมยังคงตอบแบบ fail closed และยังไม่เชื่อม Reward card URL จนกว่าจะได้รับอนุมัติการแจกบัตรแยกต่างหาก
- ไม่มีการเปลี่ยน Worker, Webhook, Token, Secret หรือ Production ในการตรวจครั้งนี้

## ข้อสรุป

Reward Card TEST ผ่าน read-only configuration UAT และ Owner อนุมัติ `No expiration` สำหรับ TEST พร้อม manual-close action แล้ว จึงปิด Issue #3 ได้ การเชื่อม Rich Menu และการใช้กับ Production ยังไม่อยู่ในการอนุมัตินี้
