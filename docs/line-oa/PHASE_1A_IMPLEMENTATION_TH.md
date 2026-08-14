# Phase 1A — Local customer-response foundation

สถานะ: local/mock only — ยังไม่ deploy และไม่เชื่อม LINE API

## ลำดับการประมวลผล

1. รับ mock LINE event
2. ตรวจ mock signature boundary
3. ตรวจ target account/environment และปฏิเสธเมื่อพบ credential ที่ไม่ควรอยู่ใน local test
4. ตรวจ event ID ซ้ำก่อนสร้าง reply หรือเปลี่ยนสถานะ
5. ค้น FAQ ที่มี `APPROVED`, ผู้อนุมัติ, ช่วงเวลามีผล และยังไม่หมดอายุ
6. ถ้าไม่มี authoritative source ใช้ safe fallback โดยไม่เดาข้อมูล
7. หัวข้ออ่อนไหวหรือข้อมูลปัจจุบันที่ต้องตรวจจริงส่งต่อพนักงาน
8. ส่ง acknowledgement หนึ่งครั้งต่อ handoff window
9. ระหว่าง handoff บอตเงียบทั้งหมด
10. เฉพาะ staff ID ใน allowlist แบบ mock เท่านั้นที่ปิด handoff ได้
11. บันทึก audit เฉพาะ hash reference, outcome และ reason code

## พฤติกรรมที่รองรับ

- FAQ: เมนู ราคา เวลาทำการ ที่ตั้ง การเก็บรักษา และราคาส่ง
- คำตอบธุรกิจต้องมาจาก fixture ที่ผ่านสถานะอนุมัติเท่านั้น
- ข้อความกำกวม เช่น `สอบถามค่ะ` ได้ safe fallback และไม่เปิดแบบฟอร์มสั่งซื้อ
- สลิป/การชำระเงิน ข้อร้องเรียน อาการแพ้อาหาร ออเดอร์ซับซ้อน สต๊อกปัจจุบัน และโปรโมชันที่ยังไม่ยืนยัน เข้า human handoff
- duplicate event ไม่ตอบและไม่เปลี่ยน state ซ้ำ
- persistence unavailable ทำให้ pipeline ไม่ตอบและไม่เปลี่ยน state
- Flex Menu ใช้โทนครีม น้ำตาล ส้มอ่อน และมีปุ่ม 6 หัวข้อ

## สิ่งที่ตั้งใจไม่รองรับ

- ไม่มีการรับเงินจริง ยืนยันการชำระเงิน หรือสร้างออเดอร์จริง
- ไม่มีสต๊อก แต้ม คูปอง หรือโปรโมชันจริง
- ไม่มี AI free-form response
- ไม่มี Production customer data, credential, database หรือ employee system
- ไม่มี outbound LINE API, Webhook, deployment หรือข้อความจริง

## Audit privacy

Audit log ไม่เก็บ raw message, เนื้อหาสลิป, token/secret, เบอร์โทรเต็ม, ที่อยู่เต็ม, customer ID หรือ event ID แบบตรงตัว ใช้ reference ที่ hash แล้วและ reason code ที่กำหนดไว้เท่านั้น
