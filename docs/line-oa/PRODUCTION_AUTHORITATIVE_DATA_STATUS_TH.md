# Production authoritative data status — มะลิปัง

ตรวจเมื่อ: 28 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `CLASSIFIED / CUSTOMER_RESPONSE_FAIL-CLOSED / ISSUE_8_OPEN`

แหล่งจริงเพียงแหล่งเดียวตาม Owner decision คือ versioned repository manifest ที่ `config/production-readiness/production-business-manifest.json` ทุก record ที่จะตอบลูกค้าต้องมี Owner, source, approval/effective/review dates, version/checksum และสถานะ `APPROVED` ที่ยังมีผล

## สถานะต่อหมวด

| หมวด            | หลักฐานที่พบ                                                                                                 | สถานะ Production | พฤติกรรม local                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------- |
| เมนู            | รูป/รายการผ่าน UAT เฉพาะ TEST; source Production เดิมระบุว่ายังต้องตรวจราคา/รายการ                           | `BLOCKED`        | safe fallback; ไม่อ้าง stock        |
| ราคา            | ราคาเริ่มต้น 39 บาทผ่าน artwork/UAT เฉพาะ TEST แต่ไม่มี Production price record พร้อม effective/review dates | `BLOCKED`        | ไม่ตอบราคา                          |
| ที่อยู่         | มี historical candidate ใน redacted manifest แต่ไม่มี current Owner-approved Production record               | `BLOCKED`        | safe fallback                       |
| เวลาเปิด        | historical Production capture เป็น `08:00-07:00` และ TEST seed เป็น `08:00-19:00` จึงขัดกัน                  | `BLOCKED`        | human review                        |
| การเก็บรักษา    | “ประมาณ 2 วันนอกตู้เย็น” เป็น TEST seed ไม่มี product-specific safety approval                               | `BLOCKED`        | human review                        |
| ภูมิแพ้/ส่วนผสม | ไม่มี authoritative product/allergen source                                                                  | `BLOCKED`        | human review เท่านั้น; ห้ามวินิจฉัย |
| ราคาส่ง/MOQ     | ไม่มีตารางราคา, MOQ, lead time และ effective dates ที่อนุมัติ                                                | `BLOCKED`        | human review                        |
| สั่งล่วงหน้า    | ไม่มี cutoff/channel/required fields/confirmation terms ที่อนุมัติ                                           | `BLOCKED`        | human review; ไม่สร้าง order จริง   |
| Delivery/pickup | ข้อความ “ยังไม่มี Delivery” ผ่าน TEST UAT แต่ไม่มี Production effective record                               | `BLOCKED`        | human review                        |

ข้อมูล loyalty rules ที่ Owner อนุมัติถูกเก็บแยกใน `production-configuration-manifest.json` และยังไม่ทำให้หมวดข้างต้นกลายเป็น `APPROVED`

## COGS review

ค้นหา repository และเอกสารที่มีด้วยคำสำคัญเกี่ยวกับ `ตุ๊กตามะลิจัง`, landed cost, COGS, supplier, invoice และต้นทุน พบเพียง policy ceiling/decision documents ไม่พบ invoice, supplier quotation, landed-cost worksheet หรือ Owner/accounting attestation ที่ยืนยันต้นทุนรวมจริง

ผล: `COGS_BLOCKER`

- ไม่สร้างตัวเลขประมาณ
- โปรแกรมแต้มเปิดไม่ได้จนมีหลักฐานว่าต้นทุนรวมจริงของ `ตุ๊กตามะลิจัง 1 ตัว` ไม่เกิน 25 บาท
- หากหลักฐานเกิน 25 บาท ให้คง `NO-GO`; ห้ามเปลี่ยนรางวัลเอง
- หลักฐานในอนาคตต้องเก็บเฉพาะ reference/checksum/ผู้อนุมัติใน repository ไม่ commit เอกสารที่มีข้อมูล supplier/การเงินอ่อนไหวหากยังไม่ผ่านการ redaction

## วิธีเลื่อนสถานะเป็น APPROVED

1. Owner ลงนาม exact customer-facing value/source และวันที่มีผล
2. เพิ่ม record version ใหม่ใน manifest; ห้ามแก้ย้อนหลัง version ที่ใช้ไปแล้ว
3. validator และ tests ผ่าน รวม stale/conflict/TEST_SEED fail-closed
4. Owner UAT จาก frozen commit ผ่าน
5. Issue #8 ปิดได้เมื่อทุกหมวดที่ระบบจะตอบมีหลักฐานครบ หรือถูกถอดออกจาก customer-facing scope อย่างชัดเจน
