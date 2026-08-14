# UAT Phase 1A ที่ต้องผ่านก่อนเชื่อม Test webhook

ขอบเขต: mock events และ mock approved FAQ เท่านั้น ห้ามเรียก LINE API หรือใช้ข้อมูลลูกค้าจริง

| ID  | Input/เหตุการณ์                                       | ผลที่คาดหวัง                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------- |
| U01 | ลูกค้าพิมพ์ `สอบถามค่ะ`                               | ส่ง safe fallback หนึ่งครั้ง ไม่เดาข้อมูลและไม่เปิด order form |
| U02 | ลูกค้าถาม `มีเมนูอะไรบ้าง`                            | ตอบ exact approved menu fixture; ถ้าไม่มีให้ fail closed       |
| U03 | ลูกค้าถามราคา                                         | ตอบเฉพาะ approved price fixture; ไม่แต่งราคา                   |
| U04 | ลูกค้าถามที่ตั้ง                                      | ตอบเฉพาะ approved public location fixture                      |
| U05 | ลูกค้าถามเวลาทำการ                                    | ตอบเฉพาะ approved/effective hours fixture                      |
| U06 | ลูกค้ากด `คุยกับพนักงาน`                              | acknowledgement หนึ่งครั้งและเข้า `HUMAN_HANDOFF`              |
| U07 | ลูกค้าพิมพ์ซ้ำระหว่างรอพนักงาน                        | บอตเงียบ ไม่มี acknowledgement/Flex/fallback ซ้ำ               |
| U08 | ส่ง event ID เดิมซ้ำ                                  | ไม่มี reply หรือ state mutation ซ้ำ                            |
| U09 | ลูกค้าส่งรูปสลิปแบบ mock                              | ไม่อ่าน asset; ส่งต่อพนักงานและไม่ log เนื้อหา                 |
| U10 | ลูกค้าถามเรื่องแพ้อาหาร                               | ส่งต่อพนักงาน ไม่เดาส่วนผสมหรือความปลอดภัย                     |
| U11 | ลูกค้าร้องเรียนสินค้า                                 | ส่งต่อพนักงานและเข้าช่วง bot silence                           |
| U12 | staff ID ที่ไม่อนุญาตพยายามปิด handoff                | ปฏิเสธและคง `HUMAN_HANDOFF`                                    |
| U13 | staff ID ที่อนุญาตปิด handoff                         | กลับ `BOT_ACTIVE`; เปิด acknowledgement window ใหม่ได้         |
| U14 | ราคา/โปรโมชัน/สต๊อกไม่มี authoritative source         | ราคาใช้ safe fallback; โปรโมชัน/สต๊อกส่งพนักงาน; ไม่แต่งข้อมูล |
| U15 | persistence ล้มเหลว                                   | fail closed ไม่มี reply และไม่มี state/outbox mutation         |
| U16 | พบ Production credential-like variable ใน environment | ปฏิเสธตั้งแต่ safety boundary โดยไม่ log ค่า credential        |

## Exit criteria

- unit tests ของทั้ง 16 กรณีผ่าน
- Flex validation, TypeScript, ESLint, formatting และ build ผ่าน
- secret scan และ `git diff --check` ผ่าน
- preview เป็น local artifact เท่านั้น
- ยังไม่มี Token, Webhook, deployment หรือข้อความจริง
