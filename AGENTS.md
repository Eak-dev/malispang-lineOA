# Production Safety

Production `มะลิปัง` เป็นระบบใช้งานจริง ห้ามแก้ไข เปิด API, Publish Rich Menu, Deploy, ส่งข้อความ หรือเปลี่ยน configuration โดยไม่มี Owner approval แยกเฉพาะขั้น Production

# Roadmap Discipline

`GitHub Issue #9 — Roadmap: MalisPang LINE OA — TEST-first customer service`
และ Issues ที่เชื่อมโยง คือแผนงานหลักของโครงการ

- ต้องทำงานตามลำดับ Phase และขอบเขตที่ระบุใน Roadmap เป็นหลัก
- ห้ามเพิ่ม Phase, เปลี่ยนลำดับงาน, ขยายขอบเขต, เปลี่ยนกติกาธุรกิจ, หรือเริ่มงานจาก Issue อื่นเอง เพียงเพราะเห็นว่า “น่าจะดีกว่า”
- งานนอก Roadmap ทำได้เฉพาะเมื่อจำเป็นต่อความปลอดภัย, แก้บั๊ก, ป้องกันข้อมูลสูญหาย, หรือเป็น blocker โดยตรงของ Issue ปัจจุบัน
- หากพบว่า Roadmap ขัดกับสถานะจริงหรือมีข้อมูลล้าสมัย ให้บันทึกความขัดแย้งและรายงาน Owner ก่อน; ห้ามตีความใหม่หรือแก้ Roadmap เอง
- ก่อนเริ่มงานทุกครั้ง ต้องระบุ Issue/Phase ปัจจุบัน, acceptance criteria และ Definition of Done ที่กำลังทำ
- ปิด Issue ได้ต่อเมื่อ acceptance criteria ผ่านครบและมีหลักฐาน test/UAT จริงเท่านั้น
- หากงานผ่านแล้ว ให้เริ่มได้เฉพาะ Issue ถัดไปตามลำดับใน Roadmap
- Production `มะลิปัง` ยังคงอยู่ภายใต้กฎ Production Safety เสมอ แม้ Roadmap จะระบุงาน Production ในอนาคต

# Versioned Project Control

ก่อนเริ่มหรือทำงานต่อทุกครั้ง ต้องอ่านและตรวจให้ตรงกัน:

1. `config/project/roadmap.json`
2. `config/project/current-work.json`
3. MP-ROADMAP (GitHub #9)
4. GitHub Issue ของ `workId` ปัจจุบัน

ต้องรัน `pnpm validate:project-control` และรายงาน Roadmap version, canonical work ID, GitHub Issue, base commit, scope, target environment, deploy/Production authorization, conflicts และ working-tree status ก่อนแก้ไฟล์

- ใช้ `MP-01`–`MP-12` เป็น canonical IDs และเก็บหมายเลข GitHub Issue เป็น immutable external reference
- ต้องมี `CURRENT` เพียงหนึ่งรายการ และต้องตรงกับ `current-work.json`
- Roadmap/current-work หาย ล้าสมัย หรือขัดกับ GitHub/Owner decision ให้หยุดด้วย `ROADMAP_UNVERIFIED`
- deployment ต้องเป็น `false` โดยปริยายจนมี Owner approval แยกเฉพาะขั้น
- Production ต้องเป็น `NO_GO` จนมี Owner approval แยกเฉพาะ action และ safety gates ผ่าน
- ห้ามเริ่ม `nextWork` อัตโนมัติหลังงานปัจจุบันเสร็จ ต้องรอ Owner/PO review และ Roadmap version ใหม่
- การเปลี่ยน Roadmap ต้อง append Owner decision, ระบุ `supersedes`, bump version, reconcile GitHub #9 และผ่าน validator/tests ก่อนใช้เป็นฐานงานใหม่
- สถานะ `CURRENT` ระบุลำดับ Roadmap แต่ไม่ให้สิทธิ์ implementation โดยอัตโนมัติ ต้องมี `localImplementation: true` และ Owner authorization แยกชัดเจนก่อนแก้ implementation
- สถานะ `AUTHORIZED_POLICY_SNAPSHOT_ONLY` อนุญาตเฉพาะ specification/schema/validator/tests ที่ current-work ระบุ และไม่อนุญาต runtime, AI integration, provider call หรือ deployment
