# MalisPang Project Control

เอกสารนี้เป็นจุดเริ่มอ่าน Project Governance ของ MalisPang LINE OA ภายใต้ MP-06 (GitHub #12) โดยเตรียมอนุญาตเฉพาะ WP4 benchmark completion ในรอบถัดไปหลัง Owner/PO review

## Current control snapshot

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Roadmap               | `MP-ROADMAP` / GitHub #9                               |
| Version               | `2026.09.05-v5`                                        |
| Current               | `MP-06 (GitHub #12)`                                   |
| Current phase         | `WP4_WP2_BENCHMARK_COMPLETION`                         |
| Current authorization | `AUTHORIZED_BENCHMARK_COMPLETION_WP4_ONLY`             |
| Next                  | `MP-07 (GitHub #7)` — blocked pending MP-06 completion |
| Verified baseline     | `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`             |
| Implementation branch | `codex/mp-06-guardrailed-ai`                           |
| Target                | `LOCAL_ONLY`                                           |
| TEST deployment       | Not authorized                                         |
| Production            | `NO_GO`                                                |

คำว่า `CURRENT` ระบุลำดับ Roadmap เท่านั้น สถานะใหม่อนุญาตเฉพาะ action `BENCHMARK_COMPLETION_WP4` และ allowed scopes ที่ระบุ Generic local implementation, WP2 action เดิม และ WP3 runtime action ถูกปฏิเสธ Policy snapshot `2026.09.05-policy-v1` checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` เป็น read-only เช่นเดียวกับ runtime, dataset expected cases, independent oracle และ acceptance thresholds

WP2 dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`, failed-result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6` และ remediated PASS result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` ถูกตรึงไว้ WP4 อนุญาตให้ commit 18 benchmark artifacts เดิมและแก้ provenance schema/generator/tests เฉพาะเมื่อจำเป็น โดยห้ามเปลี่ยน dataset cases, expected outcomes, oracle, runtime decisions, metric calculation หรือ thresholds

รายงานสุดท้ายต้องแยก `benchmark implementation/dataset base` (`8117f7c0b7cb190af81ea8f9481bd257db8a5a51`) จาก `runtime under test` (`d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`) อย่างไม่กำกวม ห้ามใช้ commit field เดียวที่ตีความผิดได้ และห้ามบันทึก report artifact commit แบบ self-referential หากทำให้เกิดวงจร checksum

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

Control transition `2026.09.05-v5` ไม่ได้แก้หรือ commit runtime, benchmark artifacts, policy, KB หรือ catalog การเริ่ม WP4 benchmark completion ต้องเกิดในรอบถัดไปหลัง Owner/PO review transition commit นี้

## Safe commands

```sh
pnpm validate:project-control
pnpm test:node -- tests/project-control.test.ts
pnpm check
pnpm secret:scan
git diff --check
```

คำสั่ง validation ไม่ติดต่อ LINE OA, Cloudflare หรือ Production
