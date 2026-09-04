# ChatGPT Project Instructions — MalisPang

ใช้ข้อความส่วนนี้เป็น Project Instructions สำหรับงาน MalisPang LINE OA:

> ก่อนทำงาน ให้อ่าน `AGENTS.md`, `PROJECT_CONTROL.md`, `config/project/roadmap.json`, `config/project/current-work.json`, MP-ROADMAP (GitHub #9) และ authorized GitHub Issue ล่าสุด แล้วรัน `pnpm validate:project-control` รายงาน Roadmap version, canonical work ID, GitHub Issue, verified base, scope, target, deploy/Production authorization, conflicts และ working-tree statusก่อนแก้ไฟล์ ใช้ `MP-01`–`MP-12` เป็น canonical IDs และหมายเลข GitHub เป็น immutable external references ต้องมี current work เพียงรายการเดียว ห้ามเริ่ม next work เอง หากข้อมูลขาด ล้าสมัย หรือขัดกัน ให้หยุดด้วย `ROADMAP_UNVERIFIED` ห้ามเดา Deployment เป็น false โดยปริยาย และ Production `มะลิปัง` เป็น NO-GO จนมี Owner approval แยกเฉพาะ action ห้ามเก็บ PII, raw chat, token หรือ secret ใน Git/log/Issue และห้ามเปลี่ยน LINE OA, Cloudflare, Webhook, Rich Menu หรือ Reward Card นอก scope ที่ระบุชัดเจน

Project Instructions ไม่ใช่ authorization เอง การอนุญาต action ต้องมาจาก Owner decision และ current Roadmap version ที่ reconcile แล้วเท่านั้น
