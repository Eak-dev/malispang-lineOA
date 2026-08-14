# การจำแนกสิ่งที่จะ Mirror และ Owner Decisions

วันที่ตรวจ: 14 สิงหาคม 2026

Source: `มะลิปัง` (read-only)

Destination: `มะลิปัง TEST`

| รายการ                                       | Classification          | ผลการดำเนินการ                                                              |
| -------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| ชื่อบัญชี TEST                               | COPY_WITH_TEST_WARNING  | คงชื่อ `มะลิปัง TEST`                                                       |
| โลโก้ Production                             | COPY_EXACTLY            | ใช้ไฟล์เดียวกันแบบ byte-for-byte                                            |
| Status message Production                    | COPY_WITH_TEST_WARNING  | ไม่ใช้ `อบ สด ใหม่`; ใช้ `TEST—ไม่รับเงินจริง` เพราะ LINE จำกัด 20 ตัวอักษร |
| Cover image                                  | OWNER_DECISION_REQUIRED | ไม่คัดลอกจนกว่าจะยืนยันว่าไม่มีข้อมูลราคา/โปรโมชันหมดอายุ                   |
| Response hours                               | COPY_EXACTLY            | คงสถานะ ON; ไม่แก้ตารางเวลาที่มองไม่เห็นใน capture                          |
| Chat                                         | COPY_EXACTLY            | ON                                                                          |
| Greeting                                     | COPY_WITH_TEST_WARNING  | บันทึกข้อความ TEST โดยไม่อ้างราคา/โปรโมชัน                                  |
| `Default`                                    | DO_NOT_COPY             | พบกฎเดิมใน TEST เปิดอยู่ จึงปิดเป็น OFF; ไม่ลบ                              |
| `Add Friend`                                 | DO_NOT_COPY             | ไม่พบ/ไม่สร้าง                                                              |
| `Menu`                                       | RECREATE_FOR_TEST       | ยังไม่สร้าง เพราะภาพ source มีราคา/รายการที่ยังไม่ยืนยัน                    |
| `Facebook อั่งเปา`                           | OWNER_DECISION_REQUIRED | ไม่สร้างและไม่เปิดใน TEST                                                   |
| Production reward card                       | DO_NOT_COPY             | ไม่เชื่อมลิงก์หรือ resource                                                 |
| Coupon/promotion                             | DO_NOT_COPY             | ไม่สร้าง fixture จนมีการอนุมัติชัดเจน                                       |
| Rich Menu visual                             | RECREATE_FOR_TEST       | สร้างภาพ local ที่มี TEST warning และ action map ปลอดภัย; ยังไม่ publish    |
| Public map URL candidate                     | OWNER_DECISION_REQUIRED | ไม่ใส่ใน TEST จนเจ้าของยืนยัน URL                                           |
| Customer/follower/chat/order/payment data    | DO_NOT_COPY             | ไม่เปิดดูและไม่คัดลอก                                                       |
| Production API/provider/token/secret/webhook | DO_NOT_COPY             | ไม่เปิดดู ไม่สร้าง และไม่เชื่อม                                             |

## Owner decisions ที่ยังต้องตอบ

1. ยืนยันว่าเมนู/ราคาใน `source-menu-01..03.jpeg` เป็นข้อมูลปัจจุบันหรือส่ง asset ใหม่ที่อนุมัติแล้ว
2. ยืนยันว่า campaign `Facebook อั่งเปา` ยังมีผลหรือให้ยกเลิกถาวร
3. ยืนยัน public location URL ที่อนุญาตให้ใช้ใน TEST; candidate จาก Production ยังไม่ถูกนำไปใช้
4. ยืนยันว่าจะใช้ cover image Production ใน TEST หรือส่ง cover แบบ TEST-specific
5. ยืนยันเวลาทำการและ response-hour schedule ที่ถูกต้อง
6. ตัดสินใจว่าจะเก็บ `Default` ที่ปิดอยู่เพื่อ audit หรือให้ลบภายหลัง (ครั้งนี้ไม่ลบ)
7. อนุมัติแยกสำหรับ `Enable Messaging API` และการสร้าง/เชื่อม Test-only channel

หากข้อ 1–5 ยังไม่ตอบ Rich Menu จะคง `publishable: false` และ local mock จะ fail closed
สำหรับ menu, stock และ location
