# UAT Phase 1A สำหรับ Test webhook

ขอบเขต: mock events และ mock approved FAQ เท่านั้น ห้ามเรียก LINE API หรือใช้ข้อมูลลูกค้าจริง

| ID  | Input/เหตุการณ์                                       | ผลที่คาดหวัง                                                              |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| U01 | ลูกค้าพิมพ์ `สอบถามค่ะ`                               | ส่ง safe fallback หนึ่งครั้ง ไม่เดาข้อมูลและไม่เปิด order form            |
| U02 | ลูกค้าพิมพ์ `เมนู` หรือ `มีเมนูอะไรบ้าง`              | ส่งภาพเมนู Owner 2 ใบ ตามลำดับ พร้อมข้อความเตือนสต๊อกและปุ่มคุยกับพนักงาน |
| U03 | ลูกค้าถามราคา                                         | ตอบเฉพาะ approved price fixture; ไม่แต่งราคา                              |
| U04 | ลูกค้าถามที่ตั้ง                                      | ตอบเฉพาะ approved public location fixture                                 |
| U05 | ลูกค้าถามเวลาทำการ                                    | ตอบเฉพาะ approved/effective hours fixture                                 |
| U06 | ลูกค้ากด `คุยกับพนักงาน`                              | acknowledgement หนึ่งครั้งและเข้า `HUMAN_HANDOFF`                         |
| U07 | ลูกค้าพิมพ์ซ้ำระหว่างรอพนักงาน                        | บอตเงียบ ไม่มี acknowledgement/Flex/fallback ซ้ำ                          |
| U08 | ส่ง event ID เดิมซ้ำ                                  | ไม่มี reply หรือ state mutation ซ้ำ                                       |
| U09 | ลูกค้าส่งรูปสลิปแบบ mock                              | ไม่อ่าน asset; ส่งต่อพนักงานและไม่ log เนื้อหา                            |
| U10 | ลูกค้าถามเรื่องแพ้อาหาร                               | ส่งต่อพนักงาน ไม่เดาส่วนผสมหรือความปลอดภัย                                |
| U11 | ลูกค้าร้องเรียนสินค้า                                 | ส่งต่อพนักงานและเข้าช่วง bot silence                                      |
| U12 | staff ID ที่ไม่อนุญาตพยายามปิด handoff                | ปฏิเสธและคง `HUMAN_HANDOFF`                                               |
| U13 | staff ID ที่อนุญาตปิด handoff                         | กลับ `BOT_ACTIVE`; เปิด acknowledgement window ใหม่ได้                    |
| U14 | ราคา/โปรโมชัน/สต๊อกไม่มี authoritative source         | ราคาใช้ safe fallback; โปรโมชัน/สต๊อกส่งพนักงาน; ไม่แต่งข้อมูล            |
| U15 | persistence ล้มเหลว                                   | fail closed ไม่มี reply และไม่มี state/outbox mutation                    |
| U16 | พบ Production credential-like variable ใน environment | ปฏิเสธตั้งแต่ safety boundary โดยไม่ log ค่า credential                   |
| U17 | ลูกค้ากด postback `test:show_menu`                    | ส่งภาพชุดเดียวกับ U02 ไม่ส่งรายการ TEST_SEED แบบข้อความยาว                |
| U18 | ตั้ง asset base URL เป็น host อื่น                    | fail closed ด้วย `INVALID_TEST_ASSET_BASE_URL`                            |

## Exit criteria

- automated routing/state/security cases ผ่านทั้งหมด รวม U01–U18
- Flex validation, TypeScript, ESLint, formatting และ build ผ่าน
- secret scan และ `git diff --check` ผ่าน
- preview เป็น local artifact เท่านั้น
- ชุดนี้ใช้ mock/fixture เท่านั้น; ผล deployment และ Owner live UAT บันทึกแยกใน `TEST_PHASE_1A_DEPLOYMENT_TH.md`

## Owner live UAT — Rich Menu รอบเดียว

สถานะ: `PASS` — Owner ยืนยันวันที่ 21 สิงหาคม 2026 เวลา 11:31 น. (Asia/Bangkok)

1. Rich Menu แสดงอัตโนมัติและ chat bar เขียนว่า `รู้จักมะลิปัง`
2. กดสะสมแต้ม ได้ข้อความ fail closed ที่ระบุ 50 บาท = 1 แต้ม โดยไม่เปิด Production Reward Card
3. กดที่อยู่ร้าน เปิด Google Maps URL ที่อนุมัติ
4. กด Delivery ได้ข้อความว่ายังไม่มีบริการ
5. กดเมนู ได้รูปเมนูใหม่สองรูปตามลำดับ พร้อมปุ่ม `คุยกับพนักงาน`
6. กด Facebook เปิด URL ที่อนุมัติ
7. กด `คุยกับพนักงาน` ได้ acknowledgement หนึ่งครั้ง
8. ส่งข้อความเพิ่มระหว่าง handoff แล้วบอตเงียบ

หลังข้อ 8 ต้องปิด handoff ด้วย authenticated `OWNER_TEST` เพื่อให้พร้อมทดสอบรอบถัดไป

ผลจริง: ผ่านครบทั้ง 8 ข้อ โดยไม่พบ response ซ้ำหรือบอตแทรกระหว่าง handoff การ cleanup หลัง UAT ยังไม่เสร็จ เพราะ local Keychain ไม่มีกุญแจ `TEST_ADMIN_KEY` เดิม ระบบจึงไม่ยอมให้ปิด handoff หรืออ่านจำนวน active handoff โดยไม่มี authentication การหมุนกุญแจ TEST ต้องได้รับอนุมัติแยกก่อนดำเนินการ
