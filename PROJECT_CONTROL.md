# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยเตรียมอนุญาตเฉพาะ WP5 local closure remediation ในรอบถัดไปหลัง Owner/PO review

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.06-v1`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current phase         | `WP5_LOCAL_CLOSURE_REMEDIATION`                        |
| Current authorization | `AUTHORIZED_LOCAL_CLOSURE_REMEDIATION_WP5_ONLY`        |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `12e0d27dc06052f5f9a2075aff8f12c90bf5852e`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น สถานะใหม่อนุญาตเฉพาะ action `LOCAL_CLOSURE_REMEDIATION_WP5` และ allowed scopes ที่ระบุ Generic local implementation กับ actions ของ WP1–WP4 ถูกปฏิเสธ Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, runtime, dataset, independent oracle, benchmark semantics, acceptance thresholds, KB และ catalog เป็น read-only

WP1–WP4 ผ่าน local deterministic validation แล้ว และ WP2 artifacts ถูก commit ที่ `12e0d27dc06052f5f9a2075aff8f12c90bf5852e` Dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` และ remediated PASS result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` ถูกตรึงไว้ รายงาน clean-checkout functional audit ผ่าน แต่ local acceptance ยัง block เฉพาะ repository ไม่ได้ประกาศและบังคับ Node.js `24.19.0` กับ pnpm `11.19.0`

WP5 รอบถัดไปต้องใช้ `package.json` เป็น authoritative toolchain source, pin exact versions, มี Node version file และ machine-readable validator ที่ตรวจ declaration drift และ fail fast เมื่อ Node/pnpm ไม่ตรง Existing CI ต้องใช้ค่าเดียวกันหากพบ; ณ transition นี้ไม่มี CI workflow และไม่อนุญาตสร้างใหม่ การดาวน์โหลด dependencies ที่ประกาศและมี lockfile integrity ด้วย `--frozen-lockfile` อนุญาต โดยไม่ขยายเป็น offline build, vendoring หรือ supply-chain redesign

WP5 implementation ยังไม่เริ่ม และ Issue #12 ยังเปิดเพราะ AI/NLU semantic interpretation, TEST readiness/deployment, Owner TEST UAT และ Production readiness decision ยังไม่เสร็จ การ transition นี้ไม่เลือก AI/NLU หรือ TEST-readiness path

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

Control transition `2026.09.06-v1` ไม่ได้แก้ toolchain declarations, package manifest, lockfile, runtime, benchmark, policy, KB หรือ catalog การเริ่ม WP5 toolchain implementation ต้องเกิดในรอบถัดไปหลัง Owner/PO review transition commit นี้

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
