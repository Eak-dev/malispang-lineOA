# Rollback — Safe Test Mirror

Rollback นี้ใช้เฉพาะ `มะลิปัง TEST` และต้องตรวจชื่อบัญชีก่อนทุกขั้นตอน ห้ามใช้กับ Production
`มะลิปัง`

## สิ่งที่เปลี่ยนจริงใน LINE OA TEST

1. Greeting message ถูกแทนด้วยข้อความ TEST-safe
2. Auto-response `Default` ถูกปิด
3. Profile image ถูกเผยแพร่ด้วยโลโก้ Production ที่เก็บใน `assets/brand/malispang-logo.jpeg`
4. Status message ถูกเผยแพร่เป็น `TEST—ไม่รับเงินจริง`

Messaging API และ Webhook ของ TEST เปิดใช้งานแล้วตาม Phase 1A; Rich Menu `MalisPang TEST RM 39-50 v1` ถูก Publish เป็น Current menu แล้ว และ Reward Card ยังไม่ถูกสร้าง

## วิธี rollback

1. ยืนยัน visible account name เป็น `มะลิปัง TEST` เท่านั้น
2. Greeting: ใช้ `previousTextNormalized` ใน `test-configuration-manifest.json` เป็น reference; LINE emoji token ต้องเลือกใหม่ผ่าน UI จึงต้องให้เจ้าของตรวจ preview ก่อน Save
3. `Default`: **ไม่แนะนำให้เปิดกลับ** เพราะเป็น Fixed response ตอบทุกข้อความ; หากจำเป็นต้องเปิด ต้องมี owner approval แยกและ UAT ที่ชัดเจน
4. Status message: เปลี่ยนได้หลังพ้นข้อจำกัด 1 ชั่วโมงของ LINE; หากต้องการย้อนเป็นค่าว่างให้เจ้าของอนุมัติก่อน
5. Profile image: LINE จำกัดการเปลี่ยนซ้ำ 1 ชั่วโมง และเราไม่ได้เก็บ previous TEST avatar แยกไว้; ต้องให้เจ้าของส่งไฟล์เดิมก่อน rollback รูป

## Rich Menu และ local rollback

1. ยืนยัน visible account name เป็น `มะลิปัง TEST`
2. Unset/หยุดแสดง Rich Menu TEST เป็นค่า default
3. ตรวจว่า Rich Menu ไม่แสดงกับผู้ทดสอบ
4. ลบเฉพาะ Rich Menu TEST เมื่อได้รับอนุมัติการลบแยกต่างหาก
5. หาก Worker ถูก deploy พร้อม action ชุดนี้ ให้ rollback เฉพาะ `malispang-lineoa-test` ไป Version ก่อนหน้า
6. ไฟล์ local และ manifest ย้อนด้วย Git revert ได้

Reward Card ยังไม่ถูกสร้างหรือ Publish จึงไม่มี live card ให้ rollback และห้ามเชื่อม/เปลี่ยน Production Reward Card
