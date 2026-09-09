# MP-06 WP2 — Deterministic Benchmark Specification

สถานะ: แหล่งอ้างอิงหลักของ WP2 ซึ่งเริ่มพัฒนาภายใต้ Roadmap `2026.09.05-v3` และบันทึกหลักฐานฉบับสมบูรณ์ภายใต้ Roadmap `2026.09.05-v5`, MP-06 (GitHub #12), `AUTHORIZED_BENCHMARK_COMPLETION_WP4_ONLY` เป้าหมายเป็น `LOCAL_ONLY`; TEST deployment เป็น `false` และ Production เป็น `NO_GO`

## 1. วัตถุประสงค์

Benchmark นี้วัด deterministic runtime หลัง WP3 remediation จาก commit `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5` ว่าเลือก `AUTO`, `AUTO_COMPOSITE`, `CLARIFY` หรือ `STAFF_ONLY` ตาม policy, สร้าง response units ตามลำดับ, bind PRICE อย่างถูกต้อง, fail closed เมื่อ authority/binding ไม่พร้อม และไม่รั่ว raw input/PII ไปยัง result/report/fingerprint

WP2 **ยังไม่พิสูจน์ว่า AI เข้าใจภาษาธรรมชาติ** เพราะไม่มี AI provider, model, prompt หรือ semantic model integration กรณีภาษาไทยวัดเพียงพฤติกรรมของ deterministic lexicon/policy gate ที่มีอยู่ ผลผ่านจึงไม่ใช่เหตุผลให้ deploy หรือประกาศพร้อม Production

## 2. Authoritative sources

- `config/mp-06/policy-snapshot.json` version `2026.09.05-policy-v1`, checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` — read-only
- `worker/mp-06-wp1.ts` ณ runtime implementation commit `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5` — System Under Test (SUT), read-only ใน WP4
- Approved Knowledge Base และ Approved Product Catalog — runtime dependencies แบบ read-only
- `config/project/roadmap.json` และ `config/project/current-work.json` — scope/acceptance control แบบ read-only ใน WP2
- `benchmark/mp-06/scenarios.ts` — independent expected-result oracle; ห้าม import SUT

ไม่ใช้แชต/เว็บฮุก/log ลูกค้าจริง ข้อมูล Production หรือข้อความที่คัดลอกจาก Production เป็น source ของ dataset

## 3. Dataset schema

`BenchmarkCase` มี `caseId`, primary bucket เดียว (`FUNCTIONAL`, `THAI_LANGUAGE_VARIATION`, `ADVERSARIAL_SAFETY`), `scenarioFamily`, `tags`, synthetic PII-free `input`, context, authority state, expected classification/intents/templates/unit count/clarification/fail-closed, rationale, `semanticSignature`, `normalizedCaseSignature` และ execution assertions เช่น retry/fingerprint

ทุก signature สร้างจากมิติที่มีผลต่อพฤติกรรม ได้แก่ intent composition, required-field/ambiguity/risk/context/authority/order/retry/linguistic construction/expected safety outcome ไม่มี raw input, ชื่อ, เบอร์โทร หรือ PII ใน signature

## 4. Case-generation methodology

- สร้าง deterministically จาก scenario definitions และ finite dimension matrices ไม่มี random, current time หรือ environment data
- primary bucket มีหนึ่งค่าเท่านั้นและสร้างจำนวนขั้นต่ำ Functional 3,000; Thai variation 1,000; Adversarial/safety 1,000
- Functional ครอบคลุม single/composite/overflow, ordering, PRICE/size/whole-baht, clarification, authority cancellation, retry/fingerprint และ runtime boundaries ที่มี regression แยก
- Thai variation ใช้ construction ที่แตกต่างด้านภาษาพูด, typo, spacing, word order, ellipsis, indirect wording, Thai-English, digit form, multi-intent และ negation ไม่ใช้การเปลี่ยนคำลงท้าย/emoji/วรรคตอนอย่างเดียว
- Adversarial ใช้ risk overlay, policy bypass/data disclosure requests และ authority/catalog failure states โดยคาดหวัง `STAFF_ONLY`/fail closed
- anti-padding signature ตัด surface-only dimensions ออก เพื่อปฏิเสธกรณีที่ต่างเพียงสินค้า คำลงท้าย emoji punctuation spacing เล็กน้อย หรือตัวเลขที่ไม่เปลี่ยนพฤติกรรม

ไฟล์ dataset ที่ commit คือ `artifacts/mp-06/benchmark-dataset.json`; builder และ validator เป็น source ที่สร้างซ้ำได้

## 5. Independent expected-result oracle

`scenarios.ts` กำหนด expected classification, intent order, template IDs, response-unit count และ fail-closed จาก scenario family โดยไม่ import `worker/mp-06-wp1.ts`, matcher, actual result หรือ runtime classification การตรวจ architecture จะอ่าน import graph ของ dataset layerและ fail หากพบ SUT import

เฉพาะ `evaluator.ts` เท่านั้นที่เรียก SUT หลังสร้าง expected case แล้ว สำหรับ planner ที่คืน `undefined` evaluator ใช้ production routing fallback เพื่อสะท้อน final deterministic `STAFF_ONLY` path โดยไม่แก้ expected ตาม actual

Mutation/sentinel tests จงใจสร้าง false AUTO, wrong order/template, partial AUTO, unsupported claim, raw-input leakage, authority failure และ threshold ต่ำกว่าเกณฑ์ เพื่อยืนยัน evaluator/report gate ตรวจพบจริง

## 6. Classification และ metrics

ลำดับ policy คือ `STAFF_ONLY > CLARIFY > AUTO_COMPOSITE > AUTO`

AUTO correctness denominator คือทุกกรณีที่ actual เป็น AUTO/AUTO_COMPOSITE Metric ถูกเมื่อ classification, intent set/order, template/approved record, PRICE SKU/size/price binding, unit count, fingerprint/provenance และ output integrity ถูกทั้งหมด และไม่มี unsupported/partial response หาก denominator เป็น 0 metric invalid และ benchmark fail เกณฑ์ ≥98%

False-AUTO คือ actual AUTO/AUTO_COMPOSITE เมื่อ expected ไม่ใช่ หรือ AUTO ที่ intent/order/template/binding/claim/fingerprint ผิด ส่ง partial หรือ authority fail แต่ยัง AUTO ต้องรายงานทุก case

Risky/fail-closed และ authority failure ต้องจบ `STAFF_ONLY`/fail closed 100%; unsupported claims = 0; PII/raw-chat leakage ใน plan/fingerprint/result/report/error/audit projection = 0

Confusion matrix ใช้ expected เป็นแถว actual เป็นคอลัมน์สำหรับ AUTO, AUTO_COMPOSITE, CLARIFY, STAFF_ONLY พร้อม count และ row rate

## 7. Coverage matrix

รายงานแยก count ตาม bucket, scenario family, expected/actual class, intent, risk tag, authority state, linguistic construction, composite 2/3/overflow, clarification/retry/fingerprint และ protected runtime boundary Tags เป็นส่วนหนึ่งของ case contract และ validator บังคับ required coverage

Stateful behavior เช่น shared clarification budget, duplicate/retry delivery, acknowledgement ครั้งเดียว, Draft protected flow และ handoff silence มีทั้ง dataset coverage tag และ regression ที่เรียก implementation boundary ที่เหมาะสม Benchmark planner ไม่อ้างว่าจำลอง Durable Object persistence ทั้งระบบ

## 8. PII และ safety constraints

- synthetic input ห้ามมีชื่อบุคคลจริง, เบอร์โทร, LINE user ID, ที่อยู่, order reference, URL/QR/token/secret/API key หรือ raw webhook
- placeholder ใช้เฉพาะคำประกาศ เช่น `[TEST_PRODUCT]` และห้ามมีรูปแบบ PII
- terminal แสดงเฉพาะ summary; รายละเอียดกรณีอยู่ใน report แบบ synthetic
- safety scanner ตรวจทั้ง dataset, actual plan projection, fingerprints, reports และ error projection
- benchmark ไม่อ่าน process environment ยกเว้น metadata ที่ไม่ใช่ secret และไม่พิมพ์ environment values

## 9. ไฟล์และหน้าที่

- `benchmark/mp-06/types.ts` — shared case/result/report contracts
- `benchmark/mp-06/scenarios.ts` — independent oracle/scenario definitions; ไม่ import SUT
- `benchmark/mp-06/case-builder.ts` — deterministic 5,000-case generation และ signatures
- `benchmark/mp-06/signatures.ts` — canonical normalized/semantic/anti-padding signatures และ integrity verification
- `benchmark/mp-06/dataset-validation.ts` — schema/count/distinctness/PII/coverage gates
- `benchmark/mp-06/evaluator.ts` — SUT adapter และ expected-vs-actual comparison
- `benchmark/mp-06/safety-checks.ts` — unsupported claim, leakage, output integrity และ authority checks
- `benchmark/mp-06/report.ts` — confusion matrix, coverage, false-AUTO, acceptance report, semantic checksum และ provenance validation
- `benchmark/mp-06/io.ts` — deterministic artifact serialization/check
- `benchmark/mp-06/runner.ts` — policy-integrity gate และ orchestration ที่ใช้ร่วมกันระหว่าง CLI/tests
- `scripts/run-mp-06-benchmark.ts` — CLI generate/check entrypoint
- `tests/mp-06-wp2-benchmark.test.ts` — dataset, evaluator mutation, thresholds, reproducibility และ import-boundary regressions
- `artifacts/mp-06/benchmark-dataset.json` — machine-readable committed cases
- `artifacts/mp-06/benchmark-report.json` — machine-readable committed result
- `docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_REPORT.md` — human-readable result

ไม่มีไฟล์ benchmark อยู่ใน `worker/` และ `tsconfig.worker.json` ไม่ include benchmark จึงไม่เข้า Worker runtime bundle

## 10. Function contracts

- `buildBenchmarkCases(): BenchmarkCase[]` — สร้าง cases ตามจำนวนคงที่; throw เมื่อ scenario definition invalid
- `validateBenchmarkDataset(cases): DatasetValidation` — คืน errors/coverage; ไม่แก้ cases; error ไม่มี raw input
- `evaluateBenchmark(cases): Promise<BenchmarkCaseResult[]>` — เรียก SUT เฉพาะ actual; authority mutation ผ่าน dependency boundary; exception กลายเป็น sanitized failure
- `evaluateCase(case): Promise<BenchmarkCaseResult>` — เปรียบเทียบ exact plan projection; ไม่คืน environment/secret
- `runSafetyChecks(case, actual): SafetyFinding[]` — ตรวจ claims/leakage/partial/authority; findings อ้าง caseId/code เท่านั้น
- `buildBenchmarkReport(cases, results, metadata): BenchmarkReport` — สร้าง matrix/coverage/metrics/criteria, provenance สามชั้น และ overall PASS/FAIL
- `calculateSemanticResultChecksum(report): string` — สร้าง checksum จากผลเชิง semantic โดยไม่รวม timestamp หรือ WP4 provenance metadata
- `validateBenchmarkReportEvidence(report): string[]` — fail closed เมื่อ provenance หาย/ผิด/กำกวม, checksum ไม่ตรง หรือมี artifact commit แบบ self-referential
- `serializeDeterministic(value): string` — stable key order/newline; timestamp ไม่อยู่ใน deterministic result checksum
- `writeBenchmarkArtifacts(...)` — ใช้เฉพาะ generate mode; check mode read-only และ fail เมื่อ checksum/content ต่าง
- CLI `generate|check` — exit non-zero เมื่อ dataset/report/acceptance ไม่ผ่าน; stdout เป็น summary สั้น

## 11. วิธีรันและตรวจ reports

```sh
pnpm benchmark:mp-06
pnpm benchmark:mp-06:check
pnpm test:node -- tests/mp-06-wp2-benchmark.test.ts
```

`benchmark:mp-06` สร้าง dataset, JSON report และ Markdown report `benchmark:mp-06:check` สร้างผลใน memory แล้วเทียบ deterministic checksum/content กับ committed artifacts โดยไม่เขียนไฟล์

Report มี run ID, evaluation timestamp, policy/checksum, counts, coverage, expected/actual distributions, confusion matrix, AUTO correctness, false-AUTO ทุกกรณี, risky/authority/unsupported/leakage results, distinctness และ pass/fail ราย criterion พร้อม provenance สามชั้นที่ไม่กำกวม: benchmark development base `8117f7c0b7cb190af81ea8f9481bd257db8a5a51`, runtime implementation `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5` และ WP4 execution control `cc13fa95883d37b35d0e79cdcbfd7c2be823be61` รายงานไม่ฝัง artifact commit SHA ของตัวเอง

`resultChecksum` คือ semantic result checksum ที่คง representation ของ WP2 v1 เพื่อให้ตรวจย้อนหลังได้ และไม่รวม evaluation timestamp หรือ provenance metadata ที่เพิ่มใน WP4 ดังนั้นการ regenerate จาก input เดิมต้องคงค่า `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`

## 12. Definition of Done

- cases ≥5,000 และ bucket minima ครบโดยไม่ซ้ำ
- meaningful-distinctness/PII/import-boundary/schema/coverage validators ผ่าน
- AUTO correctness ≥98%; risk/authority fail-closed 100%; unsupported/leakage 0
- confusion matrix และ false-AUTO details ครบ
- targeted/full tests, formatting, lint, typecheck, build, validators, Worker dry-run, secret scan, dependency audit และ diff check ผ่าน
- machine/human reports ระบุ provenance สามชั้นตรงกันและผ่าน evidence validator โดยไม่มี commit field กำกวมหรือ self-reference
- diff มีเฉพาะ WP2/WP4 benchmark completion; commit/push branch MP-06; ไม่ deploy และ Productionคง `NO_GO`

## 13. Failure behavior และ known limitations

หาก WP1 ไม่ผ่าน ให้คง case/expected/threshold และรายงาน `WP2_BENCHMARK_FAILED`; ห้ามแก้ runtime/policy/KB/catalog ใน WP2 ต้องขอ control transition ใหม่สำหรับ remediation

ข้อจำกัด: ไม่มี AI/semantic model; dataset เป็น synthetic; planner benchmark ไม่แทน live LINE/Cloudflare/Durable Object end-to-end; coverage ไม่พิสูจน์ข้อมูลธุรกิจสด; report จาก local fixed dependencies ไม่ใช่ TEST UAT หรือ Production readiness; ไม่มี deployment ใน WP2
