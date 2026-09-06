# MalisPang LINE OA

ทุกงานต้องยึด Roadmap #9 และ AGENTS.md เป็นข้อกำหนดหลัก ห้ามขยายหรือเปลี่ยนลำดับโครงการเอง

Project control ปัจจุบันอยู่ที่ [PROJECT_CONTROL.md](PROJECT_CONTROL.md), `config/project/roadmap.json` และ `config/project/current-work.json` ทุกงานต้องผ่าน `pnpm validate:project-control` ก่อนเริ่มแก้ไข

## Toolchain

Repository นี้ใช้ Node.js `24.19.0` และ pnpm `11.19.0` แบบ exact เท่านั้น โดย `package.json` เป็น source of truth และ `.node-version` เป็น version-manager hint ทุกการ install/check ต้องผ่าน `pnpm validate:toolchain`

วิธี bootstrap, frozen-lockfile install, การทดสอบ fail-fast และข้อจำกัดอยู่ใน [MP-06 WP5 Toolchain Remediation](docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md)
