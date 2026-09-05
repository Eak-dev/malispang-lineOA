# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยเตรียมอนุญาตเฉพาะ WP2 benchmark implementation ในรอบถัดไปหลัง Owner/PO review

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.05-v3`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current authorization | `AUTHORIZED_BENCHMARK_WP2_ONLY`                        |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `2a2571369f7e845c5d72883d816556ce24be18c0`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น สถานะใหม่อนุญาตเฉพาะ action `BENCHMARK_WP2` และ allowed scopes ที่ระบุ Generic local implementation และ WP1 runtime ถูกปฏิเสธ Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` เป็น read-only ห้ามแก้ runtime/policy/KB/catalog, ใช้ข้อมูลแชตจริง, เรียก AI/provider หรือ deploy

WP2 acceptance criteria ที่ตรึงไว้คืออย่างน้อย 5,000 กรณี PII-free และแตกต่างอย่างมีนัยสำคัญ (functional 3,000, Thai variation 1,000, adversarial/safety 1,000), AUTO correctness ≥98%, risky STAFF_ONLY/fail-closed 100%, unsupported claim และ PII/raw-chat leakage เท่ากับ 0, authority failure ต้อง fail closed 100% พร้อม confusion matrix และรายงาน false-AUTO ทุกกรณี

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

Control transition `2026.09.05-v3` ไม่ได้สร้าง harness, dataset หรือ benchmark จริง การเริ่ม WP2 ต้องเกิดในรอบถัดไปหลัง Owner/PO review transition commit นี้

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
