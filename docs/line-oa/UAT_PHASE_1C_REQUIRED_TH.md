# Owner UAT — Phase 1C Conversation UX (`Issue #6`)

สถานะ: `NOT DEPLOYED / OWNER TEST DEPLOY APPROVAL REQUIRED`

ทดสอบเฉพาะ `มะลิปัง TEST` หลัง automated gates ผ่านและ Owner อนุมัติ deploy frozen commit แยก ห้ามทดสอบ Production `มะลิปัง`

## UAT cases

| ID  | Input/Action                                             | ผลที่ต้องได้                                                                 |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| C01 | `เมนู`                                                   | รูปเมนู 2 รูป + exact approved notice; ไม่เข้า handoff                       |
| C02 | `ขอเมณูหน่อยค่ะ`                                         | เหมือน C01                                                                   |
| C03 | `ราคา`                                                   | approved price/menu content; ไม่เดาราคาอื่น                                  |
| C04 | `ร้านอยุ่ไหนคะ`                                          | approved location                                                            |
| C05 | `เวลา`                                                   | approved opening hours; ไม่ตอบว่าเปิดอยู่ตอนนี้                              |
| C06 | `โปร`                                                    | approved promotion guidance + acknowledgement หนึ่งครั้ง                     |
| C07 | ปิด handoff ด้วย authorized TEST staff แล้วพิมพ์ `สต๊อค` | approved stock disclaimer + acknowledgement หนึ่งครั้ง; ไม่ยืนยันว่ามีสินค้า |
| C08 | ปิด handoff แล้วพิมพ์ `พรีออเดอได้ไหม`                   | approved preorder guidance + handoff; ไม่สร้าง order                         |
| C09 | ปิด handoff แล้วพิมพ์ `ขายสงมีเงื่อนไขอย่างไร`           | approved wholesale guidance + handoff                                        |
| C10 | ปิด handoff แล้วพิมพ์ `เก็บยังงัย`                       | approved storage answer                                                      |
| C11 | `แต้ม`                                                   | approved general loyalty rules; ไม่อ่าน/แก้คะแนน                             |
| C12 | `เดลิเวอรี่`                                             | approved Delivery unavailable answer                                         |
| C13 | `พนักงาน`                                                | exact acknowledgement หนึ่งครั้ง                                             |
| C14 | พิมพ์ข้อความเพิ่มระหว่าง handoff                         | bot silent                                                                   |
| C15 | กด approved static Rich Menu postback ระหว่าง handoff    | ตอบ approved content; ไม่ acknowledgement ซ้ำและไม่ reset handoff            |
| C16 | ปิด handoff แล้วพิมพ์ `เท่าไหร่คะ`                       | exact fallback + acknowledgement; ไม่เดาราคา/ไม่สร้าง order                  |
| C17 | duplicate webhook fixture                                | ไม่มี reply/state change ซ้ำ                                                 |
| C18 | unauthorized staff-close fixture                         | ปฏิเสธและคง handoff                                                          |
| C19 | authorized staff-close                                   | กลับ `BOT_ACTIVE`                                                            |
| C20 | `แพ้กลูเตนค่ะ`                                           | approved allergen warning + handoff; ไม่รับประกัน allergen-free              |

## Pass criteria

- top intents และ typo/short/polite cases ถูกต้องทั้งหมด
- ไม่มี order, payment, stock หรือ promotion confirmation ที่ระบบสร้างเอง
- fallback/acknowledgement ไม่ซ้ำ และ typed message เงียบระหว่าง handoff
- Quick Reply/Flex ยังเป็น TEST-only และใช้งานได้
- ไม่มี response collision จาก LINE OA native auto-response
- Production ไม่ถูกเปิดหรือเปลี่ยนแปลง

Issue #6 ต้องคง `OPEN` จน Owner ยืนยัน UAT `PASS`
