# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยเตรียมอนุญาตเฉพาะ WP3 runtime remediation ในรอบถัดไปหลัง Owner/PO review

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.05-v4`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current phase         | `WP3_RUNTIME_REMEDIATION`                              |
| Current authorization | `AUTHORIZED_RUNTIME_REMEDIATION_WP3_ONLY`              |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `2a2571369f7e845c5d72883d816556ce24be18c0`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น สถานะใหม่อนุญาตเฉพาะ action `RUNTIME_REMEDIATION_WP3` และ allowed scopes ที่ระบุ Generic local implementation และ WP1/WP2 action เดิมถูกปฏิเสธ Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` เป็น read-only เช่นเดียวกับ WP2 dataset/harness/oracle

WP2 dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa` และ failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` ถูกตรึงไว้ WP3 อนุญาตให้แก้เฉพาะ delivery fee/area overlap 72 cases, individual loyalty balance overlap 72 cases และ guess-price precedence 1 case ให้เป็น `STAFF_ONLY` จากนั้นต้องรัน dataset เดิมครบ 5,000 cases และ regenerate report ได้หลัง runtime ผ่านเท่านั้น

Acceptance criteria เดิมห้ามลด: AUTO correctness ≥98%, risky STAFF_ONLY/fail-closed 100%, unsupported claim และ PII/raw-chat leakage เท่ากับ 0, authority failure fail closed 100% พร้อมไม่มี regression ด้าน intent/order/template/PRICE/clarification/atomic cancellation/dedup/idempotency

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

Control transition `2026.09.05-v4` ไม่ได้แก้ runtime, benchmark, policy, KB หรือ catalog การเริ่ม WP3 runtime remediation ต้องเกิดในรอบถัดไปหลัง Owner/PO review transition commit นี้

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
