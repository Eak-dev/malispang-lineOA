# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยอนุญาตเฉพาะ policy snapshot และยังไม่อนุญาต runtime implementation

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.05-v1`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current authorization | `AUTHORIZED_POLICY_SNAPSHOT_ONLY`                      |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `5ddf9cc88d0bb868aadbc8f2a41860b56a5f2682`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น รอบนี้ `policySnapshot=true` แต่ `localImplementation=false`: สร้าง specification/schema/validator/tests สำหรับ policy snapshot ได้ในรอบถัดไป แต่ห้ามแก้ runtime, เริ่ม AI integration หรือ deploy

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

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
