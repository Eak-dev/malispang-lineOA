# Reward Card TEST — Read-only UAT

ตรวจล่าสุด: 28 สิงหาคม 2026 เวลา 01:35 น. (Asia/Bangkok)

สถานะ: `REWARD_CARD_TEST_UAT_PASS / EXPIRY_DEVIATION_OPEN / ISSUE_3_REMAINS_OPEN`

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

## Expiry deviation ที่ยังเปิดอยู่

- ข้อกำหนดเดิม: บัตรหมดอายุวันที่ `31 ธันวาคม 2026`
- ค่าที่ Publish จริง: `No expiration` (`Not set`)
- LINE OA Manager แสดงว่าค่า Expiration เปลี่ยนไม่ได้หลัง Publish
- ไม่มีการแก้ไขหรือ Suspend บัตรใน UAT นี้
- GitHub Issue #3 ต้องคงสถานะ `OPEN` จนกว่า Owner จะตัดสินใจอย่างใดอย่างหนึ่ง:
  1. ยอมรับ `No expiration` และอนุมัติแผนปิดบัตรด้วยตนเองวันที่ 31 ธันวาคม 2026 หรือ
  2. อนุมัติขั้นตอนแยกเพื่อหยุด/สร้างบัตร TEST ใหม่ที่มีวันหมดอายุตรงตามข้อกำหนด หลังตรวจผลกระทบและคำเตือนของ LINE แล้ว

ห้ามกด `Suspend card` หรือสร้างบัตรทดแทนโดยไม่มี Owner approval แบบเจาะจง เพราะอาจเป็นการกระทำที่ย้อนกลับไม่ได้และกระทบผู้ทดสอบที่ถือบัตรอยู่

## สถานะการเผยแพร่และการเชื่อม Rich Menu

- Reward Card TEST ถูก Publish แล้วและแยกอยู่ใต้บัญชี `มะลิปัง TEST`
- Rich Menu action เดิมยังคงตอบแบบ fail closed และยังไม่เชื่อม Reward card URL จนกว่าจะปิด expiry deviation และได้รับอนุมัติการแจกบัตรแยกต่างหาก
- ไม่มีการเปลี่ยน Worker, Webhook, Token, Secret หรือ Production ในการตรวจครั้งนี้

## ข้อสรุป

Reward Card TEST ผ่าน read-only configuration UAT ตามค่าที่ Publish จริง แต่ยังไม่ถือว่าปิดงานครบ Issue #3 เนื่องจากวันหมดอายุไม่ตรงข้อกำหนดเดิมและยังไม่มี Owner decision ขั้นสุดท้าย
