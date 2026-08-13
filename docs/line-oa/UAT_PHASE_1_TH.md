# UAT Phase 1 — Mock Data Only

หมายเหตุ: brief ระบุว่ามี UAT เดิม 16 กรณี แต่ไม่พบไฟล์ จึงไม่สามารถรักษาเลข/ถ้อยคำเดิมได้ ชุดนี้เป็น baseline รวม 34 กรณีและครอบคลุมพฤติกรรม Phase 1 ทั้งหมด ห้ามใช้ลูกค้า ออเดอร์ สต็อก การชำระ หรือ credential จริง

Precondition ร่วม: environment=`test`, mock adapters, approved fixture catalog/FAQ, Asia/Bangkok display time, audit redaction เปิดอยู่

| ID  | Increment | Scenario / Input                                      | Expected result                                                |
| --- | --------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| A01 | 1A        | ถามเมนู                                               | ส่งข้อความ menu version ที่อนุมัติ; ไม่ใช้ candidate โดยตรง    |
| A02 | 1A        | ถามราคาสินค้าที่ approved                             | ดึงราคาจาก catalog version; ไม่ให้ LLM สร้างราคา               |
| A03 | 1A        | ถามสินค้าที่ไม่รู้จัก                                 | ขอชื่อ/รายละเอียดเพิ่ม ไม่เดาสินค้า                            |
| A04 | 1A        | คำถามนอกขอบเขต                                        | safe out-of-scope/handoff; ไม่มีข้อมูลแต่ง                     |
| A05 | 1A        | โปรโมชั่น approved และอยู่ในช่วง                      | ส่ง exact approved text พร้อมเงื่อนไขที่กำหนด                  |
| A06 | 1A        | โปรโมชั่นหมดอายุ                                      | ไม่ส่ง promotion; safe fallback                                |
| A07 | 1A        | ถาม location/pickup                                   | ตอบเฉพาะ branch record approved                                |
| A08 | 1A        | ถาม opening                                           | ตอบเฉพาะ hours ที่มีผล                                         |
| A09 | 1A        | ถาม shelf life/storage                                | ใช้คำตอบเฉพาะสินค้าที่ approved; ไม่เดา                        |
| A10 | 1A        | ถาม wholesale                                         | เก็บเฉพาะข้อมูลขั้นต่ำและ route ตาม policy                     |
| A11 | 1A        | ถาม loyalty แต่ source ไม่ verified                   | ไม่แจ้งคะแนน/สิทธิ์; ส่งตรวจพนักงาน                            |
| A12 | 1A        | fallback ปกติ                                         | ไม่ส่งคำขอโทษที่ไม่จำเป็น                                      |
| A13 | 1A        | ขอคุยพนักงาน                                          | acknowledge ครั้งเดียวและตั้ง `HUMAN_HANDOFF`                  |
| A14 | 1A        | ส่งข้อความซ้ำระหว่าง handoff                          | บอตเงียบ ไม่มี acknowledgement/FAQ/fallback ซ้ำ                |
| A15 | 1A        | พนักงาน authorized ปิด handoff                        | state กลับ `BOT_ACTIVE`; audit actor/time                      |
| A16 | 1A        | greeting ระหว่าง handoff                              | บอตเงียบ                                                       |
| A17 | 1A        | duplicate webhook event ID                            | processed/reply ครั้งเดียว                                     |
| A18 | 1A        | customer message ซ้ำ event ID ต่างกันใน dedupe window | ไม่มี side effect/reply ซ้ำตาม approved policy                 |
| B01 | 1B        | stock record known และ fresh                          | ตอบ status/quantity เท่าที่ record ยืนยัน พร้อมเวลา            |
| B02 | 1B        | stock record stale                                    | ไม่ใช้ record; สร้าง request หนึ่งรายการ                       |
| B03 | 1B        | staff ยืนยัน AVAILABLE quantity=12                    | หลัง validation ส่งจำนวน 12 และ timestamp                      |
| B04 | 1B        | staff ยืนยัน LOW_STOCK quantity=2                     | ส่ง low stock/2 ตามข้อความ approved; ไม่สัญญาจอง               |
| B05 | 1B        | staff รายงาน SOLD_OUT                                 | ส่งหมด; ไม่แนะนำว่ามีวันอื่นโดยไม่มีข้อมูล                     |
| B06 | 1B        | staff ตอบ UNKNOWN/physical check                      | ไม่บอกว่ามีสินค้า; route/wait ตาม policy                       |
| B07 | 1B        | staff ไม่ตอบก่อน timeout                              | expire request; timeout reply ครั้งเดียว; ไม่เดาสต็อก          |
| B08 | 1B        | staff ตอบหลัง expiry                                  | เก็บ audit แต่ไม่ส่งอัตโนมัติ                                  |
| B09 | 1B        | duplicate stock question/event                        | request/outbox ไม่ซ้ำ                                          |
| C01 | 1C        | ลูกค้าเปลี่ยนจำนวน                                    | สร้าง revision ใหม่ คำนวณใหม่ แสดง DRAFT                       |
| C02 | 1C        | ขาด pickup date                                       | ถามวันที่; ยังไม่สรุปครบ/ยืนยัน                                |
| C03 | 1C        | ขาด pickup time                                       | ถามเวลา/ช่วงเวลา                                               |
| C04 | 1C        | ขาด branch                                            | ถามสาขา ไม่เลือกเอง                                            |
| C05 | 1C        | deterministic total: 3×3,900 satang + fee 500         | subtotal=11,700; fees=500; grand=12,200 satang                 |
| C06 | 1C        | catalog/fee unavailable                               | ไม่คำนวณด้วยค่าจำ; route review                                |
| C07 | Safety    | ส่งสลิปจริงใน Phase 1                                 | ไม่วิเคราะห์/ยืนยัน; แจ้ง manual staff review; ไม่ log รูป     |
| C08 | Safety    | pickup date ในอดีตจาก historical order                | ไม่สร้าง draft/stock request ปัจจุบัน; ขอ context หรือ handoff |
| S01 | Safety    | พยายามใช้ Production credential/channel               | fail closed ก่อน outbound; audit code โดยไม่ log secret        |
| S02 | Safety    | audit/outbox store unavailable                        | ไม่ส่ง best-effort; queue/fail closed ไม่มี reply ซ้ำ          |
| S03 | Safety    | allergen question ไม่มี approved source               | ไม่เดา; ส่งพนักงานยืนยัน                                       |
| S04 | Safety    | calculator overflow/invalid negative quantity         | reject structured input; ไม่แสดงยอด                            |

## Coverage/exit criteria

- Phase 1A: A01–A18 ผ่านทั้งหมด
- Phase 1B: B01–B09 ผ่านทั้งหมด รวม freshness/expiry/idempotency
- Phase 1C: C01–C08 และ S04 ผ่าน โดย summary fixture ตรวจว่ามี customer, items, quantity, pickup date/time/method/branch, packaging/sticker, subtotal/fees/grand total และ confirmation request
- Cross-cutting safety: S01–S03 ผ่าน; log inspection ยืนยันไม่มี raw PII, token, signature หรือ slip
- ห้ามผ่าน UAT ด้วยการเรียก LINE OA, database, Google Sheet หรือ employee system จริง
