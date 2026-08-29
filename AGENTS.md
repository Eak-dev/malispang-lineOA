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
