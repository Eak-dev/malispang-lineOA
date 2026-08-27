# Rollback — Safe Test Mirror

Rollback นี้ใช้เฉพาะ `มะลิปัง TEST` และต้องตรวจชื่อบัญชีก่อนทุกขั้นตอน ห้ามใช้กับ Production
`มะลิปัง`

## สิ่งที่เปลี่ยนจริงใน LINE OA TEST

1. Greeting message ถูกแทนด้วยข้อความ TEST-safe
2. Auto-response `Default` ถูกปิด
3. Profile image ถูกเผยแพร่ด้วยโลโก้ Production ที่เก็บใน `assets/brand/malispang-logo.jpeg`
4. Status message ถูกเผยแพร่เป็น `TEST—ไม่รับเงินจริง`

Messaging API และ Webhook ของ TEST เปิดใช้งานแล้วตาม Phase 1A; Rich Menu `MalisPang TEST RM 39-50 v1` ถูก Publish เป็น Current menu แล้ว และ Reward Card `บัตรแต้ม TEST` ถูก Publish แยกใต้บัญชี TEST โดยยังไม่ได้แจก URL ผ่าน Rich Menu

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

## Reward Card TEST rollback gate

Reward Card TEST ถูก Publish แบบ `No expiration` แล้ว และ LINE ระบุว่าค่านี้เปลี่ยนไม่ได้หลัง Publish การ rollback จึงห้ามกด `Suspend card`, สร้างบัตรใหม่ หรือเปลี่ยนการแจกบัตรเอง ก่อนดำเนินการต้อง:

1. ยืนยัน visible account name เป็น `มะลิปัง TEST`
2. ขอ Owner approval แบบเจาะจงสำหรับผลลัพธ์ที่ต้องการและการกระทำที่อาจย้อนกลับไม่ได้
3. หาก Owner ยอมรับ `No expiration` ให้กำหนดผู้รับผิดชอบและขั้นตอนปิดด้วยตนเองวันที่ 31 ธันวาคม 2026
4. หาก Owner ต้องการวันหมดอายุแบบระบบ ให้ตรวจคำเตือนและผลกระทบของการหยุดบัตรเดิม/สร้างบัตร TEST ใหม่ก่อน final confirmation
5. ห้ามเชื่อม คัดลอก หรือเปลี่ยน Production Reward Card ทุกกรณี

## Admin handoff cleanup

การปิด handoff ต้องใช้ endpoint ผู้ดูแลพร้อม `TEST_ADMIN_KEY` ที่ถูกต้องเท่านั้น ห้ามข้าม authentication หรือแก้ Durable Object โดยตรง หาก local Keychain ไม่มีกุญแจเดิม ต้องขอ Owner อนุมัติการหมุนกุญแจเฉพาะ `malispang-lineoa-test` ก่อน แล้วจึงปิดเฉพาะ handoff ของ TEST และตรวจว่า active handoff เหลือ `0` การหมุนกุญแจนี้ไม่เกี่ยวกับ LINE Channel Secret, Channel Access Token หรือ Production

การหมุนกุญแจตาม Owner approval สำเร็จเมื่อ 21 สิงหาคม 2026 เวลา 11:41 น. ค่าปัจจุบันเก็บใน macOS Keychain service `malispang-lineoa-test` account `TEST_ADMIN_KEY` และ Cloudflare encrypted secret ชื่อเดียวกัน การ rollback กุญแจเดิมทำไม่ได้เพราะค่าเดิมไม่พร้อมใช้งาน; หากกุญแจใหม่สูญหายให้ขอ Owner อนุมัติ rotate ใหม่ ห้ามคัดลอกค่าลง repository
