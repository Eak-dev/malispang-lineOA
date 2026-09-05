# MP-06 Guardrailed AI — Owner-approved Policy Snapshot

เอกสารนี้เป็น specification เท่านั้นสำหรับ MP-06 (GitHub #12) ภายใต้ Roadmap `2026.09.05-v1` ยังไม่ใช่ runtime implementation และไม่อนุญาต AI provider, TEST deployment หรือ Production

## การควบคุมเวอร์ชัน

| รายการ                  | ค่า                                                                |
| ----------------------- | ------------------------------------------------------------------ |
| Policy ID               | `MP-06-GUARDRAILED-AI-SAFETY-GATE`                                 |
| Policy version          | `2026.09.05-policy-v1`                                             |
| Owner decision          | `MP-06-POLICY-2026-09-05-V1`                                       |
| Machine-readable source | `config/mp-06/policy-snapshot.json`                                |
| SHA-256 policy checksum | `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` |
| Runtime implementation  | ไม่อนุญาต                                                          |
| TEST deployment         | ไม่อนุญาต                                                          |
| Production              | `NO_GO`                                                            |

## Safety classification

ลำดับความเสี่ยงตายตัว:

`STAFF_ONLY > CLARIFY > AUTO_COMPOSITE > AUTO`

I-13 `AUTO_COMPOSITE` ใช้เมื่อหลัง fingerprint dedup เหลือ 2–3 response units และทุก unit เป็น AUTO ที่ authoritative และ binding สมบูรณ์เท่านั้น ส่งตามลำดับ:

`MENU → PRICE → LOCATION → OPENING_HOURS → PICKUP → STORAGE → DELIVERY → LOYALTY → CONTACT`

- หลัง dedup เกิน 3 units: ยกเลิกทั้งชุด เป็น `CLARIFY` และส่ง T-C04 ครั้งเดียว ห้ามส่ง partial AUTO
- มี `STAFF_ONLY` อย่างน้อยหนึ่ง intent: ทั้งข้อความเป็น `STAFF_ONLY`
- required field ไม่ครบ: `CLARIFY`
- unit ใด missing, stale, conflict, checksum ผิด หรือ binding ไม่สมบูรณ์: ยกเลิกทั้ง composite และเป็น `STAFF_ONLY`
- T-C01 และ T-C04 ใช้ clarification budget ร่วมกันหนึ่งครั้งต่อ conversation หลัง budget ถูกใช้แล้วยัง resolve ไม่ได้ให้ I-22 / `STAFF_ONLY`
- AI ห้ามรวมความ สรุป เชื่อม หรือแก้ approved templates

## Response-unit fingerprint

- Dynamic unit ต้องอิง `templateId + approvedRecordId + boundFieldValues + SKU + catalogVersion/checksum`
- Static unit ใช้ `templateId + checksum`
- ห้าม dedup dynamic unit ด้วย template checksum อย่างเดียว
- ห้ามใส่ raw customer text หรือ PII ใน fingerprint/audit
- วิธี serialization/hash สำหรับ runtime ยังไม่ได้รับอนุญาตในรอบนี้

## PRICE binding

- T-A02 ใช้ได้เมื่อ resolve Approved Product Catalog ได้เพียงหนึ่ง row
- ชื่อ unique ใช้ได้; ชื่อซ้ำต้องมีขนาดที่ทำให้เหลือเพียงหนึ่ง row
- ไม่พบ, พบมากกว่าหนึ่ง row หรือข้อมูลไม่ครบ: `CLARIFY` ด้วย T-C01
- `unitPriceSatang` ต้องเป็นจำนวนเต็มบวกและหาร 100 ลงตัว
- `catalogPrice = unitPriceSatang ÷ 100` และแสดงเป็นจำนวนเต็มบาทเท่านั้น ห้ามปัดราคา
- ราคาเป็นเศษสตางค์หรือ row invalid: `STAFF_ONLY` และห้าม render T-A02
- `NORMAL` map เป็น ` ขนาดปกติ`; `SMALL` map เป็น ` ขนาดเล็ก` โดยมีช่องว่างนำหน้าอยู่ในค่าที่ bind แล้ว
- ขนาดค่าอื่น/ว่าง/schema ไม่ผ่าน: `STAFF_ONLY`
- AI ห้ามเดาชื่อมาตรฐาน ขนาด ราคา หรือ binding

## Exact approved templates

### T-A02

```text
{catalogDisplayName}{catalogDisplaySize} ราคา {catalogPrice} บาทค่ะ

ราคานี้เป็นราคาตามรายการที่ร้านอนุมัติ และไม่ใช่การยืนยันสต๊อก โปรโมชั่น คิวรับสินค้า หรือราคาส่งนะคะ หากต้องการตรวจสอบสินค้าวันนี้ กรุณากด “คุยกับพนักงาน” ได้เลยค่ะ 😊
```

### T-C01

```text
ต้องการสอบถามราคาสินค้าอะไรคะ หากสินค้ามีหลายขนาด กรุณาระบุขนาดด้วย เช่น “แฮมชีส ขนาดปกติ” ได้เลยค่ะ 😊
```

### T-C03

```text
เพื่อให้น้องมะลิตอบได้ตรงคำถาม รบกวนเลือกหัวข้อที่ต้องการสอบถามค่ะ: เมนูและราคา, ที่ตั้งร้าน, เวลาเปิด, การเก็บรักษา, Delivery หรือกติกาสะสมแต้ม 😊
```

### T-C04

```text
มีหลายหัวข้อที่ต้องการสอบถามค่ะ รบกวนเลือกหนึ่งหัวข้อก่อนนะคะ: เมนูและราคา, ที่ตั้งร้าน, เวลาเปิด, การเก็บรักษา, Delivery หรือกติกาสะสมแต้ม 😊
```

## Decision gap ที่คงไว้แบบ fail closed

Owner อนุมัติข้อความ T-C03 แล้ว แต่ยังไม่ได้อนุมัติ trigger และผลต่อ shared clarification budget จึงบันทึกเฉพาะ exact template และห้าม runtime นำไปใช้จนกว่าจะมี Owner decision แยก ข้อนี้ไม่เปลี่ยนกติกา T-C01/T-C04 ที่ได้รับอนุมัติแล้ว

## ขอบเขตที่ยังห้าม

ห้ามเชื่อม snapshot นี้เข้ากับ intent matcher, routing, Worker, Durable Object, LINE handler, KB/catalog runtime หรือ AI provider และห้าม deploy ทั้ง TEST/Production จนกว่าจะมี Roadmap transition และ Owner authorization แยก
