# ChatGPT Project Instructions — MalisPang

ใช้ข้อความส่วนนี้เป็น Project Instructions สำหรับงาน MalisPang LINE OA:

> ก่อนทำงาน ให้อ่าน `AGENTS.md`, `PROJECT_CONTROL.md`, `config/project/roadmap.json`, `config/project/current-work.json`, MP-ROADMAP (GitHub #9) และ authorized GitHub Issue ล่าสุด แล้วรัน `pnpm validate:project-control` รายงาน Roadmap version, canonical work ID, GitHub Issue, verified base, scope, target, deploy/Production authorization, conflicts และ working-tree statusก่อนแก้ไฟล์ ใช้ `MP-01`–`MP-12` เป็น canonical IDs และหมายเลข GitHub เป็น immutable external references ต้องมี current work เพียงรายการเดียว ห้ามเริ่ม next work เอง หากข้อมูลขาด ล้าสมัย หรือขัดกัน ให้หยุดด้วย `ROADMAP_UNVERIFIED` ห้ามเดา Deployment เป็น false โดยปริยาย และ Production `มะลิปัง` เป็น NO-GO จนมี Owner approval แยกเฉพาะ action ห้ามเก็บ PII, raw chat, token หรือ secret ใน Git/log/Issue และห้ามเปลี่ยน LINE OA, Cloudflare, Webhook, Rich Menu หรือ Reward Card นอก scope ที่ระบุชัดเจน

Project Instructions และสถานะ `CURRENT` ไม่ใช่ implementation authorization เอง การอนุญาต action ต้องมาจาก Owner decision และ current Roadmap version ที่ reconcile แล้ว โดย action-specific authorization flag ของ work package นั้นต้องเป็น `true` จึงเริ่มแก้ implementation ได้

หาก current-work เป็น `AUTHORIZED_POLICY_SNAPSHOT_ONLY` ให้ทำได้เฉพาะ policy specification/schema/validator/tests ตาม allowed scope; ห้ามแก้ runtime หรือเรียก AI provider

หาก current-work เป็น `AUTHORIZED_RUNTIME_WP1_ONLY` ให้ทำได้เฉพาะ WP1 scopes ที่ระบุ ใช้ policy snapshot/checksum แบบ read-only และเรียก authorization ด้วย scoped action `RUNTIME_WP1`; ห้าม generic implementation, T-C03 runtime, AI/provider, benchmark 5,000 cases, deployment หรือ Production

หาก current-work เป็น `AUTHORIZED_BENCHMARK_WP2_ONLY` ให้ทำได้เฉพาะ WP2 benchmark scopes ที่ระบุและเรียก authorization ด้วย scoped action `BENCHMARK_WP2`; ห้ามแก้ runtime/policy/KB/catalog, ใช้ข้อมูลแชตจริง, เรียก AI/provider, deploy หรือแตะ Production
