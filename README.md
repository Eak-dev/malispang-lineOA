# MalisPang LINE OA

ทุกงานต้องยึด Roadmap #9 และ AGENTS.md เป็นข้อกำหนดหลัก ห้ามขยายหรือเปลี่ยนลำดับโครงการเอง

Project control ปัจจุบันอยู่ที่ [PROJECT_CONTROL.md](PROJECT_CONTROL.md), `config/project/roadmap.json` และ `config/project/current-work.json` ทุกงานต้องผ่าน `pnpm validate:project-control` ก่อนเริ่มแก้ไข

## Toolchain

Repository นี้ใช้ Node.js `24.19.0` และ pnpm `11.19.0` แบบ exact เท่านั้น โดย `package.json` เป็น source of truth และ `.node-version` เป็น version-manager hint ทุกการ install/check ต้องผ่าน `pnpm validate:toolchain`

วิธี bootstrap, frozen-lockfile install, การทดสอบ fail-fast และข้อจำกัดอยู่ใน [MP-06 WP5 Toolchain Remediation](docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md)

## MP-06 guarded AI/NLU

WP7 เพิ่ม OpenAI Responses API เป็น advisory parser/classifier หลัง feature flag `MP06_AI_NLU_ENABLED` ซึ่ง default off เท่านั้น Existing deterministic policy/evaluator และ approved templates ยังเป็นผู้ตัดสิน final route และสร้างข้อความตอบ ลูกค้าจะไม่ได้รับข้อความที่โมเดลสร้างโดยตรง

คำสั่งปกติ `pnpm check` ใช้ mock และตรวจ synthetic dataset โดยไม่ต้องมี API key ส่วน `pnpm ai-nlu:mp-06:live` เป็น explicit local-only evaluation ซึ่งอ่าน `OPENAI_API_KEY` จาก `.dev.vars` ที่ถูก ignore และห้ามใช้เป็น deployment command รายละเอียดอยู่ใน [MP-06 WP7 AI/NLU Implementation](docs/line-oa/mp-06/MP_06_WP7_AI_NLU_IMPLEMENTATION_TH.md)
