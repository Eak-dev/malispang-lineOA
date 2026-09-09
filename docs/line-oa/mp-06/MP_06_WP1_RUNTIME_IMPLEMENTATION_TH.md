# MP-06 WP1 — Deterministic Runtime Safety Gate

สถานะเอกสาร: local implementation สำหรับ GitHub Issue #12 ภายใต้ Roadmap `2026.09.05-v2` และ current-work `AUTHORIZED_RUNTIME_WP1_ONLY` เท่านั้น ยังไม่ deploy ไป TEST และ Production ยังคง `NO_GO`

## Issue / acceptance criteria / Definition of Done

- Current: `MP-06` (GitHub #12), WP1 เท่านั้น
- Acceptance: หา intent ได้หลายรายการแบบ deterministic; บังคับ `STAFF_ONLY > CLARIFY > AUTO_COMPOSITE > AUTO`; ส่ง AUTO 2–3 units ตาม policy order; validate authority/binding ทุก unit ก่อนส่ง; ไม่ส่ง partial AUTO; T-C01/T-C04 ใช้ budget ร่วมกันครั้งเดียว; retry ใช้ fingerprint ที่ไม่มี raw text/PII
- Definition of Done: targeted และ full quality gates ผ่าน, diff อยู่ใน WP1, commit/push เฉพาะ branch `codex/mp-06-guardrailed-ai`, ไม่มี deploy/AI provider/benchmark/Production action

Policy source เป็น read-only ที่ `config/mp-06/policy-snapshot.json` version `2026.09.05-policy-v1`, checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` Runtime จะตรวจ checksum นี้ก่อนสร้าง response plan ทุกครั้ง ถ้าไม่ตรงจะ `STAFF_ONLY`

## Deterministic data flow

1. Draft Order flow เดิมได้สิทธิ์ประมวลผลก่อนตาม Issue #2; WP1 ไม่เปลี่ยน state machine หรือข้อมูลร่าง
2. WP1 normalize ข้อความด้วยกติกาเดิม แล้วสร้าง unique match set เฉพาะ AUTO allowlist
3. ถ้าตัวจำแนกความเสี่ยงเดิมพบ STAFF_ONLY ร่วมกับ AUTO อย่างน้อยหนึ่ง intent ระบบยกเลิก AUTO ทั้งหมดและเปิด handoff
4. PRICE ต้อง resolve ไปยัง Approved Catalog หนึ่ง row เท่านั้น พร้อมตรวจ catalog checksum/effective window/status/ราคาเต็มบาทบวก/size mapping
5. Static unit ต้องผ่าน Approved Knowledge Base effective/freshness/conflict gate และ SHA-256 ของ exact answer ต้องตรง manifest checksum
6. ระบบสร้าง response-unit fingerprint, deduplicate และเรียง `MENU → PRICE → LOCATION → OPENING_HOURS → PICKUP → STORAGE → DELIVERY → LOYALTY → CONTACT`
7. 2–3 units เป็น `AUTO_COMPOSITE`; มากกว่า 3 ยกเลิกทั้งชุดและเลือก T-C04; unit ใด invalid ยกเลิกทั้งชุดและ `STAFF_ONLY`
8. Durable Object ทำ event idempotency, ตรวจ retry plan fingerprint และใช้ shared clarification budget แบบ atomic ก่อนอนุญาตให้ส่ง
9. Worker ส่งเฉพาะข้อความเดิมจาก KB หรือ exact frozen template; ไม่มีขั้น AI merge/summarize/bridge

## Response-unit fingerprint

- static: canonical JSON ของ `templateId + checksum` แล้ว SHA-256
- dynamic PRICE: canonical JSON ของ `templateId + approvedRecordId + boundFieldValues + SKU + catalogVersion/checksum` แล้ว SHA-256
- plan: canonical JSON ของ policy checksum และ ordered response-unit fingerprints แล้ว SHA-256
- Durable Object ผูก plan fingerprint กับ `eventRef`; retry ที่ยังไม่ delivered แต่ plan เปลี่ยนจะ fail closed เป็น handoff ส่วน delivered event จะถูก deduplicate
- ไม่มี raw customer text, ชื่อ, เบอร์โทร หรือ PII ใน fingerprint/audit ที่เพิ่มใน WP1

## Clarification และ conversation window

T-C01 และ T-C04 ใช้ counter เดียวใน `ConversationStateDO` ครั้งแรกส่ง exact template ได้ T-C01 เก็บเฉพาะ template ID เป็น pending context เพื่อให้ข้อความถัดไปที่มีชื่อสินค้า/ขนาด resolve PRICE ได้โดยไม่ต้องมีคำว่า “ราคา” ซ้ำ และล้าง pending context เมื่อสร้าง authoritative response plan สำเร็จ หากต้อง clarify อีกก่อนจบ window จะเป็น I-22 / `STAFF_ONLY` และ acknowledgement เพียงครั้งเดียว Counter ถูก reset เฉพาะหลัง authorized staff close ซึ่งเป็นขอบเขต conversation window ที่ระบบ persistence เดิมรองรับอยู่ โดยไม่เก็บ raw text หรือ PII เพิ่ม

T-C03 ไม่ถูกอ้างใน runtime path และมี regression test ป้องกันการส่งข้อความนี้

## Files และขอบเขต

- `worker/mp-06-wp1.ts`: matcher, policy gate, PRICE binding, unit plan และ fingerprints
- `worker/mp-06-crypto.ts`: Web Crypto SHA-256 และ canonical JSON สำหรับข้อมูลที่ไม่ใช่ PII
- `worker/knowledge.ts`: runtime KB answer checksum/provenance gate
- `worker/durable-objects.ts`: atomic clarification budget และ retry-plan persistence ใน Durable Object เดิม
- `worker/index.ts`: เรียก WP1 หลัง Draft flow และก่อน single-intent fallback เดิม
- `tests/mp-06-wp1.test.ts`, `worker-tests/durable-state.test.ts`: policy/runtime/persistence regressions

ไม่ได้เปลี่ยน policy snapshot, exact templates, Approved Knowledge Base, Product Catalog, wrangler bindings, LINE OA, Cloudflare resource, Rich Menu, Reward Card หรือ secrets

## Known boundaries

- WP1 ไม่ใช่ AI integration และไม่เรียก provider/model/prompt ใด ๆ
- benchmark 5,000 cases ยังไม่เริ่ม
- ยังไม่มี TEST deployment หรือ live UAT สำหรับ commit นี้
- Static intent เดี่ยวและ composite ใช้ข้อมูลที่มี effective/freshness window เดิม; เมื่อ record หมดอายุจะ fail closed
- การ deploy ต้องมี Owner approval แยกเฉพาะ TEST หลัง Owner/PO review commit นี้
