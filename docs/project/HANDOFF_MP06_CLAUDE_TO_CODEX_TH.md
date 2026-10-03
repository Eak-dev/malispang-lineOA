# MP-06 — ไฟล์ส่งต่องาน Claude Code → Codex (v53)

> สถานะ: control ปัจจุบัน **2026.10.02-v53** (`MP-OD-2026-10-02-V53`) บน branch `codex/mp06-harness-v43` (PR #20, Draft)
> ไฟล์นี้เป็นจุดรับงานต่อ ไม่ให้สิทธิ์ใด ๆ เพิ่มจาก control
> Production "มะลิปัง": **NO_GO — NOT TOUCHED**

## 1. ก่อนเริ่ม (ตาม AGENTS.md)

1. อ่าน `config/project/roadmap.json`, `config/project/current-work.json`, GitHub #9 และ #12
2. รัน `pnpm validate:project-control` ต้องได้ `2026.10.02-v53`
3. คอมเมนต์ใน #12 ว่า **"รับงานขั้น … บน branch …"** ก่อนแก้ไฟล์ และเมื่อหยุดให้คอมเมนต์ **"ส่งต่อ: ทำถึง … / เหลือ …"**
   - ทำงานทีละคนต่อ branch เพื่อไม่ให้ชนกัน

## 2. ทำไมมี v53

| Version | สาย                                                                | สถานะ                                                                                                                        |
| ------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| v50     | PR #20: harness repair + undici patch + Node timeout 7000ms        | เผยแพร่แล้ว CI ผ่าน (`0774131`)                                                                                              |
| v51–v52 | UAT รอบ 2 บน Worker แยก `malispang-lineoa-test-uat2` (Claude Code) | **พักไว้ (PAUSED)** ที่ `codex/mp06-uat-round2-prep` @ `d63d620820a4f1ea6f452e553724d34d16535a90` ห้าม deploy ห้ามลบ ห้ามแก้ |
| **v53** | กลับมาใช้แผน 5 ขั้นของ Codex บน PR #20                             | **ปัจจุบัน**                                                                                                                 |

Owner สั่งเมื่อ 2026-10-02 ให้พักงาน v51/v52 และทำต่อจากงานของ Codex ("อนุมัติ v53")
ฐานโค้ดของ v53 จึงต่อจาก v50 ส่วนบันทึก decision ของ v51/v52 อยู่บน branch ที่พักไว้ และอ้างอิงจาก v53

## 3. แผน 5 ขั้นของ Codex และสถานะ

| ขั้น | งาน                                                    | สถานะ v53                                                                                    |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| A    | หาหลักฐานแบบไม่แตะ storage                             | **ขั้นปัจจุบัน** รอหลักฐานจาก Owner (ข้อ 4)                                                  |
| B    | ชุดตรวจ storage แบบเจาะจงผ่านช่องทางที่รองรับ          | ทำได้แค่**ร่างเอกสาร**; ห้ามอ่าน storage จนมีผลทบทวนการเข้าถึงที่รองรับ + Owner decision แยก |
| C    | แก้เฉพาะสาเหตุที่พิสูจน์ได้ + regression/CI + rollback | ยังไม่อนุญาต                                                                                 |
| D    | UAT บน "มะลิปัง TEST"                                  | ยังไม่อนุญาต                                                                                 |
| E    | merge PR #20                                           | ยังไม่อนุญาต ห้ามปิด #12                                                                     |

## 4. ขั้น A — หลักฐานที่ไม่ต้องแตะ storage

| แหล่ง                                                                         | ผู้ดู                             | ตอบคำถาม                                                           | สถานะ |
| ----------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ | ----- |
| ประวัติแชต LINE ของ Owner กับ "มะลิปัง TEST" ตั้งแต่หลัง T-C01 ถึง 2026-09-20 | Owner (screenshot)                | มีข้อความเพิ่มที่บอทตอบไปหรือไม่ เช่น "แฮมชีส … 39 บาท" หลัง T-C01 | รอ    |
| Cloudflare Audit Log ของ account                                              | Owner (dashboard, อ่านอย่างเดียว) | เคยมีการเขียนผ่าน Data Studio/SQL หรือ deploy ในช่วงนั้นหรือไม่    | รอ    |
| Workers metrics ของ `malispang-lineoa-test`                                   | Owner (dashboard, อ่านอย่างเดียว) | มี request ในช่วงที่ไม่ควรมีหรือไม่                                | รอ    |

- screenshot มีข้อมูลส่วนตัว **ห้าม commit** ให้บันทึกเป็นสรุปเท่านั้น เช่น วันเวลา ข้อความที่ส่ง และประเภทคำตอบ
- ห้ามใช้ Data Studio ห้ามย้อนทำคำสั่งที่เคยถูกปฏิเสธ และห้ามเปลี่ยนเครื่องมือเพื่อเลี่ยงคำปฏิเสธ

## 5. ผลวิเคราะห์ที่ได้แล้ว (local only สาเหตุยังเป็น UNKNOWN)

ค่าที่สังเกตได้เมื่อ 2026-09-20 (`ROADMAP_CHANGELOG.md`, receipt `c6ec07be…`):

- AI OFF/STOPPED, accounting 6/6/34082
- `BOT_ACTIVE`, `clarificationUsed=true`, handoff close COMPLETE gen1
- **`pendingTemplate=null`** (gate ต้องการ T-C01)
- processed events / plans / claims = NOT_OBSERVED

เส้นทางเขียน `mp06_conversation_state` ในโค้ดที่ deploy (`bfff1a55`) มีเพียง 5 แบบ:

| เส้นทาง                           | ผล                                                  | เข้ากับค่าที่สังเกต |
| --------------------------------- | --------------------------------------------------- | ------------------- |
| constructor `INSERT OR IGNORE`    | ไม่เขียนทับ                                         | ✗                   |
| clarification ครั้งที่ 2          | null + HUMAN_HANDOFF                                | ✗                   |
| decision แบบ handoff              | null + HUMAN_HANDOFF                                | ✗                   |
| staff close                       | used=0                                              | ✗                   |
| **ข้อความใหม่ที่ได้คำตอบอนุมัติ** | null, used คงเดิม, mode คงเดิม, processed_events +1 | **✓**               |

ผลทดลองใน emulator บน source `bfff1a55` (scratch test ไม่ได้ commit):

- เปิด pilot → "ราคาเท่าไหร่" → T-C01 → **STOP pilot** → "แฮมชีส ปกติ" → ได้ `BOT_ACTIVE / true / null`, processed 1→2, ตอบราคา 39 บาท, **AI accounting ไม่เปลี่ยน** ตรงกับค่าที่สังเกตทุกช่อง
- ถ้าข้อความหลัง STOP เป็น "ร้านอยู่ที่ไหน" จะได้ `HUMAN_HANDOFF` ซึ่งไม่ตรงกับค่าที่สังเกต
- กลไก: pilot STOPPED → admission ตอบ `PILOT_INACTIVE` โดยไม่เขียน accounting → `AI_BYPASSED` → deterministic plan ยังทำงาน (`worker/index.ts` ~L291–336)

สมมติฐานที่ทดสอบได้:

- ถ้าตัวนับ processed / plans / claims ของ Owner conversation เป็น **7/5/7** แปลว่ามีข้อความ follow-up ประเภท catalog เข้ามาขณะ STOPPED
- ถ้าเป็น **6/4/6** โค้ดอธิบายไม่ได้ ต้องสงสัยการเขียนจากภายนอก
- endpoint ของ `bfff1a55` ไม่คืนตัวนับชุดนี้

ผลต่อ UAT ถ้าสาเหตุคือข้อความแทรก:

- สถานะ T-C01 ที่ gate U2 (`src/project-control.ts` ~L7690) ต้องการหายถาวร **ห้ามเติมกลับ**
- ต้องมีสถานะตั้งต้นใหม่ที่ Owner อนุมัติ งานที่พักไว้ใน v51/v52 (Worker แยก + per-case gate + runbook) ใช้ต่อได้
- ช่องว่าง "STOPPED ไม่ตรึง conversation state" ควรแก้ก่อน MP-12

## 6. ข้อจำกัดของโค้ดที่พบ (เผื่อขั้น C/D)

- `validatedTestAssetBaseUrl` (`worker/routing.ts`) รับเฉพาะ host `malispang-lineoa-test.eakkachai-dev.workers.dev`
- readiness, continue-acceptance v16/v22 และ `/admin/handoff/close` ผูก origin ของ host เดิม
- `assertRequiredSecrets` ตอบ 503 ทุก route ยกเว้น `/health` เมื่อขาด secret ใดก็ตามใน 5 ตัว (ปลอดภัย)
- Wrangler 4.122 ไม่ยอม deploy Worker ใหม่ครั้งแรกถ้ายังไม่ได้ตั้ง `secrets.required` ยกเว้นใช้ `--secrets-file`
- Cloudflare Preview ไม่ได้เตรียมไว้ใน config และไม่จำเป็นถ้าใช้ Worker แยก

## 7. ห้ามใน v53

deploy (ทั้ง Worker เดิมและ `uat2`), secret, LINE webhook, pilot, อ่านหรือ query storage TEST, Data Studio/SQL, เรียก provider จริง, PR ใหม่, Ready, merge, ส่ง U2, ปิด Issue, แก้ runtime/policy/KB/catalog/dependencies และแตะ Production

## 8. จุดเริ่มงานของ Codex

1. ทำตามข้อ 1
2. commit แพ็กเกจ `MP06_UAT_UNBLOCK_WORK_PACKAGE_2026-10-01_TH.md` จาก Mac เข้า repo ถ้า Owner อนุญาต (ต้องมี control รุ่นถัดไป เพราะไม่อยู่ใน path ที่ v53 อนุญาต)
3. ดูสถานะขั้น A ใน #12:
   - **ถ้ายังไม่มีหลักฐาน:** ร่างชุดตรวจขั้น B เป็นเอกสาร (เป้าหมาย, ตัวนับที่อ่าน, เงื่อนไขหยุด, ช่องทางที่ต้องขอผลทบทวน) **ห้ามรัน**
   - **ถ้ามีหลักฐานแล้ว:** สรุปผลเทียบกับข้อ 5 แล้วเสนอ Owner decision สำหรับขั้น C
