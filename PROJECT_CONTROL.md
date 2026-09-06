# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยบันทึกว่า WP5 local deterministic acceptance ผ่านแบบมีข้อจำกัด และอนุญาตเฉพาะ WP6 TEST-readiness assessment แบบไม่ deploy ในรอบถัดไป

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.06-v3`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current phase         | `WP6_TEST_READINESS_ASSESSMENT`                        |
| Current authorization | `AUTHORIZED_TEST_READINESS_ASSESSMENT_WP6_ONLY`        |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น สถานะนี้อนุญาตเฉพาะ action `TEST_READINESS_ASSESSMENT_WP6` และ allowed scopes ที่ระบุ Generic local implementation กับ actions ของ WP1–WP5 ถูกปฏิเสธ Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, runtime, dataset, independent oracle, benchmark semantics, acceptance thresholds, toolchain, dependency graph, KB และ catalog เป็น read-only

WP1–WP4 ผ่าน local deterministic validation แล้ว และ WP2 artifacts ถูก commit ที่ `12e0d27dc06052f5f9a2075aff8f12c90bf5852e` Dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` และ remediated PASS result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` ถูกตรึงไว้ WP5 แก้ timeout แบบ non-semantic ที่ `98f6bc0843e376de9932acad767fb463932514cc` และ pin/enforce Node.js `24.19.0` กับ pnpm `11.19.0` ที่ `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`; clean-checkout reproducibility ผ่าน จึงบันทึก local verdict เป็น `PASS_WITH_LIMITATIONS`

ข้อจำกัดที่ยังเหลือคือ AI/NLU ยังไม่ implement, TEST readiness ยังไม่ประเมิน, TEST ยังไม่ deploy, Owner TEST UAT ยังไม่ทำ และ Production ยังเป็น `NO_GO` Issue #12 จึงต้องเปิดอยู่

WP6 เป็น assessment เท่านั้นและยังไม่เริ่ม รอบ implementation ถัดไปตรวจได้เฉพาะ repository deployment configuration แบบ read-only และ TEST metadata ที่ระบุ เช่น Worker/resource/binding names, route/domain, deployment history และชื่อ/presence ของ TEST secrets ห้ามอ่าน secret values และห้าม query/open Production remote state ค่าที่พิสูจน์ไม่ได้ต้องเป็น `UNKNOWN`; component ที่ไม่ใช้ต้องเป็น `NOT_APPLICABLE` พร้อมเหตุผล ห้ามถือว่า PASS อัตโนมัติ

Assessment ต้องตรวจ TEST/Production isolation, deployment target ที่ fail closed, TEST channel/webhook boundary, logs/PII redaction, authentication/authorization, idempotency/retry, rollback, kill switch, smoke/UAT/monitoring plans, rate/cost/abuse limits และ PR/default-branch readiness โดยยังไม่มีสิทธิ์แก้ Worker/Wrangler configuration, remote resource, secret, LINE OA/Webhook/Rich Menu/Reward Card, runtime หรือ AI/NLU และไม่มีสิทธิ์ deploy

WP6 verdict ที่อนุญาตมีเพียง `TEST_READINESS_ASSESSMENT_PASS`, `TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS` และ `TEST_READINESS_BLOCKED` ห้ามใช้คำว่า TEST deployed, Production ready หรือ go-live และ control transition นี้ยังไม่สร้าง assessment document

GitHub default branch ยังชี้ฐาน Phase 1A ซึ่งล้าหลังกว่า verified latest baseline ข้อนี้ถูกบันทึกเป็น `DEFAULT_BRANCH_DRIFT` แบบ known/non-blocking เพราะใช้ dedicated MP-06 branch จาก transition commit ที่ Owner อนุมัติแล้ว ห้ามตีความว่า default branch เป็นฐานล่าสุด

## Machine-readable controls

- `config/project/roadmap.json`: version, canonical `MP-01`–`MP-12` mapping, current/next state, deployment posture และ verified baseline
- `config/project/current-work.json`: ขอบเขตและ authorization ของงานเดียวที่ทำได้ในขณะนี้
- JSON Schemas: ปิด unknown root fields และกำหนดรูปแบบเอกสาร
- `scripts/validate-project-control.mjs`: ตรวจ cross-file invariants และ fail closed
- `tests/project-control.test.ts`: regression สำหรับ stale/missing/conflicting state, immutable GitHub mapping และ authorization drift

## Source-of-truth precedence

1. Owner decision ที่บันทึกแบบ append-only ใน repository
2. machine-readable Roadmap version ล่าสุด
3. current-work manifest
4. MP-ROADMAP (GitHub #9) และ authorized Issue
5. Phase documents/manifests
6. chat/memory ใช้เป็น context เท่านั้น

ข้อมูลขัดกันหรือพิสูจน์ latest version ไม่ได้ = `ROADMAP_UNVERIFIED` และห้ามแก้ไฟล์, deploy หรือเปลี่ยน external system

## Roadmap change protocol

1. Owner/PO อนุมัติการเปลี่ยนแปลงโดยระบุ canonical ID, GitHub Issue และ scope
2. append decision ใน `docs/project/OWNER_DECISION_LOG.md`; ห้ามแก้หรือลบรายการเดิม
3. bump Roadmap version และระบุ `supersedes`
4. อัปเดต Roadmap/current-work พร้อมกัน โดยคง GitHub Issue mapping เดิม
5. reconcile เนื้อหาควบคุมกับ GitHub #9 และ Issue ปัจจุบัน
6. รัน validator, regression suite, secret scan และ `git diff --check`
7. commit/push dedicated branch และให้ Owner/PO review
8. ห้ามเริ่ม next work หรือ deploy จนมี authorization แยก

Control transition `2026.09.06-v3` ไม่ได้เริ่ม WP6 assessment และไม่ได้แก้ runtime, Worker/Wrangler deployment configuration, benchmark artifacts/semantics, toolchain, dependency graph, policy, KB หรือ catalog การเริ่ม assessment ต้องเกิดในรอบถัดไปหลัง Owner/PO review transition commit นี้

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
