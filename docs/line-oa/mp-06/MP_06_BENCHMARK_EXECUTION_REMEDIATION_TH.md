# MP-06 Benchmark Execution-Performance Remediation

สถานะ: local-only test orchestration; ไม่มี runtime, policy, dataset, oracle, report, dependency, Worker configuration หรือ deployment change

## Root cause และขอบเขต

WP2 benchmark ประเมิน 5,000 cases แบบ deterministic และเรียก evaluator ตามลำดับทีละ case โดยแต่ละ case ตรวจ actual execution สองครั้งเพื่อยืนยัน retry/idempotency งาน normalization, hashing, allocation และ garbage collection จึงเป็น CPU-bound และไวต่อ resource contention เมื่อรันร่วมกับ Node test files อื่น แม้ผล benchmark, reports และ checksums จะถูกต้อง

ก่อน remediation `test:node` รัน Node tests 390 tests ใน process lane เดียว: unit tests 376 tests และ benchmark 14 tests ส่วน Worker suite มี 45 tests รวม 435 testsโดยไม่นับ `benchmark:mp-06:check` ซึ่งเป็น artifact-integrity gate คนละหน้าที่ การรันแบบเดิมเคยทำให้ benchmark hook ใช้ 202.84 วินาทีและชน execution watchdog รวมทั้งทำให้ integrity/reproducibility tests ชน default 5-second timeout ภายใต้ CPU contention

## Execution architecture

- `pnpm test:node:unit` ใช้ Vitest discovery เดิมทั้งหมดและ exclude เพียง `tests/mp-06-wp2-benchmark.test.ts`
- `pnpm test:node:benchmark` เปิด fresh Vitest process สำหรับ benchmark file เดียว
- `pnpm test:node` เรียก unit lane แล้ว dedicated benchmark lane ตามลำดับด้วย `&&`; lane ใดคืน non-zero จะหยุดและทำให้ full Node gate ล้มเหลว
- `pnpm test` ยังคงเรียก full Node gate และ Worker suite ตามลำดับ
- `pnpm check` ยังคงเรียก `pnpm test` และ `pnpm benchmark:mp-06:check`; รายการหลังตรวจ committed artifact แบบสร้างผลใหม่ ไม่ได้ใช้แทน test assertions

ไม่มี sampling, case deduplication, SUT-result cache, retry wrapper หรือ optional benchmark path เพิ่มขึ้น Dataset ยังคง 5,000 cases, `evaluateCase` ยังคงถูกเรียก 5,000 ครั้ง และ actual execution ยังคงสองครั้งต่อ case

## Watchdogs

Benchmark `beforeAll` มี explicit watchdog `300_000` มิลลิวินาที เป็น execution safety ceiling สำหรับ 5,000-case suite ไม่ใช่ product performance guarantee และไม่ใช้แทน correctness assertions

Roadmap `2026.09.06-v4` normalize active governance metadata ให้ตรงกับค่านี้และ test-specific watchdog `15_000` มิลลิวินาทีสองจุด Historical 60/120/180-second evidence ยังคงเป็นหลักฐานของ transition เดิมและถูก supersede โดย commit `b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a`

สอง test ที่เคยชน default 5 วินาทีมี explicit timeout `15_000` มิลลิวินาที:

- meaningful-distinctness/uniqueness validation
- reproducibility และ deterministic report rendering

ค่านี้ให้ headroom จากเวลาที่พบประมาณ 6–7 วินาทีโดยไม่เปลี่ยน assertion, error propagation หรือ global timeout

## Commands ที่ต้องผ่าน

```sh
pnpm test:node:unit
pnpm test:node:benchmark
pnpm test:node
pnpm test:worker
pnpm test
pnpm benchmark:mp-06
pnpm benchmark:mp-06:check
```

Dedicated benchmark lane ต้องผ่านต่อเนื่องห้ารอบใน fresh process โดยรอบที่ล้มเหลวต้องถูกรายงานและห้าม retry เพื่อคัดเฉพาะผลผ่าน Full Node gate ต้องผ่านสองรอบ และ benchmark duration ต้องไม่เกิน Owner-approved headroom

## Validation evidence

Test inventory หลังเพิ่ม execution-lane contract คือ unit lane 381 tests, dedicated benchmark lane 14 tests, full Node gate 395 tests และ Worker lane 45 tests รวม 440 testsโดยไม่นับซ้ำ ก่อน remediation มี unit 376 + benchmark 14 + Worker 45 รวม 435 tests ส่วนเพิ่ม 5 tests เป็น execution-lane contract ทั้งหมด

Dedicated benchmark lane ผ่านห้ารอบต่อเนื่องที่ Vitest durations `153.20`, `206.25`, `199.91`, `260.20`, `197.64` วินาที; minimum `153.20`, median `199.91`, maximum `260.20` วินาที ทุกครั้งต่ำกว่า acceptance ceiling 270 วินาทีและ watchdog 300 วินาที ผ่าน 14/14 tests โดยไม่มี failed, skipped, cancelled หรือ timeout

Full Node gate ผ่านสองรอบ: unit lane 381/381 ทั้งสองรอบ และ benchmark lane 14/14 ที่ `172.77` กับ `171.49` วินาที ไม่มี failed, skipped หรือ cancelled Evaluator ยังคงรับครบ 5,000 cases และทำ actual execution สองครั้งต่อ case รวม 10,000 execution attempts เพื่อยืนยัน retry/idempotency

## Immutable evidence

- Policy checksum: `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`
- Dataset checksum: `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`
- Semantic result checksum: `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`

การรันต้องไม่เปลี่ยน tracked dataset, human/machine report, lockfile หรือ dependency graph และทุก benchmark failure ยังคงคืน non-zero
