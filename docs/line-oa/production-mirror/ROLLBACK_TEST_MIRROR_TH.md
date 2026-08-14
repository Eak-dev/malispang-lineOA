# Rollback — Safe Test Mirror

Rollback นี้ใช้เฉพาะ `มะลิปัง TEST` และต้องตรวจชื่อบัญชีก่อนทุกขั้นตอน ห้ามใช้กับ Production
`มะลิปัง`

## สิ่งที่เปลี่ยนจริงใน LINE OA TEST

1. Greeting message ถูกแทนด้วยข้อความ TEST-safe
2. Auto-response `Default` ถูกปิด
3. Profile image ถูกเผยแพร่ด้วยโลโก้ Production ที่เก็บใน `assets/brand/malispang-logo.jpeg`
4. Status message ถูกเผยแพร่เป็น `TEST—ไม่รับเงินจริง`

ไม่มี Rich Menu, Messaging API, Webhook, credential หรือข้อความจริงถูกสร้าง/ส่ง

## วิธี rollback

1. ยืนยัน visible account name เป็น `มะลิปัง TEST` เท่านั้น
2. Greeting: ใช้ `previousTextNormalized` ใน `test-configuration-manifest.json` เป็น reference; LINE emoji token ต้องเลือกใหม่ผ่าน UI จึงต้องให้เจ้าของตรวจ preview ก่อน Save
3. `Default`: **ไม่แนะนำให้เปิดกลับ** เพราะเป็น Fixed response ตอบทุกข้อความ; หากจำเป็นต้องเปิด ต้องมี owner approval แยกและ UAT ที่ชัดเจน
4. Status message: เปลี่ยนได้หลังพ้นข้อจำกัด 1 ชั่วโมงของ LINE; หากต้องการย้อนเป็นค่าว่างให้เจ้าของอนุมัติก่อน
5. Profile image: LINE จำกัดการเปลี่ยนซ้ำ 1 ชั่วโมง และเราไม่ได้เก็บ previous TEST avatar แยกไว้; ต้องให้เจ้าของส่งไฟล์เดิมก่อน rollback รูป

## Local-only rollback

- ลบ/ย้อน `assets/test/malispang-test-rich-menu.png`, action map และ Flex fixture ผ่าน Git revert ได้
- ไม่มีการ rollback ฝั่ง LINE สำหรับ Rich Menu/Flex เพราะไม่เคย publish หรือส่ง
- ห้ามใช้ `source-rich-menu-rm-1.jpeg` โดยตรง เนื่องจากมี reward/ราคา/action ของ Production
