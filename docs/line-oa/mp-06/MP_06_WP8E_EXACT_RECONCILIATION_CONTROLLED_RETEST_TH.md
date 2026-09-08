# MP-06 WP8E — Exact-state reconciliation และ controlled retest evidence

## ขอบเขตและผลสรุป

WP8E ดำเนินการเฉพาะ Worker `malispang-lineoa-test` บน workers.dev TEST domain ภายใต้ Roadmap `2026.09.08-v11` Production, model, prompt, schema, deterministic policy, KB/catalog, benchmark และ LINE channel configuration ไม่ถูกแก้ไข

- control authorization commit: `4badfebc863a9ff17139641300a36a7d55c02adc`
- exact-state reconciliation candidate commit: `c8b0d8246058c5de4991bec369e91cfe2a609a4d`
- deployed TEST version: `5835b91b-7b0d-4708-a71b-6c31473adcae` at 100%
- candidate dry-run bundle SHA-256: `c38d2f8709be2b65b6916869fec02a0b75e0b35f0dbc1afe587942ec31731445`
- deploy annotation ผูกกับ candidate `c8b0d82`; evidence commit นี้ไม่ใช่ deployed source
- TEST deployment occurred: `true`
- final pilot state: `STOPPED`; AI admission off; budget reserved `0`; in-flight `0`
- Issue #12: `OPEN`
- Production: `NO_GO — NOT TOUCHED`

## Local และ clean-checkout gates

Candidate ผ่าน local validation และ detached clean checkout ที่ใช้ Node `24.19.0`, pnpm `11.19.0`, isolated empty pnpm store และ frozen lockfile โดยไม่คัดลอก API key:

- Node unit `457/457`, dedicated deterministic benchmark `14/14`, Worker `74/74`; unique total `545`, failed/skipped/cancelled `0`
- focused exact-state Worker tests `29/29` และ provider-settlement tests `16/16`
- deterministic benchmark `5,000` cases และ report byte-identical
- `pnpm check` สองรอบ, format, lint, typecheck, build, validators, TEST-targeted dry-run, secret scan และ dependency audit ผ่าน
- dependency graph และ lockfile ไม่เปลี่ยน; clean checkout จบโดยไม่มี tracked diff

Checksums คงเดิม:

- policy: `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`
- deterministic dataset: `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`
- deterministic semantic result: `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`
- WP7 AI/NLU semantic result: `7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55`

Normal/clean-checkout suites ใช้ mock provider และไม่มี OpenAI หรือ LINE call

## Remote no-network lifecycle self-test

หลัง deploy candidate ขณะ pilot `STOPPED` route ที่ authenticated และ TEST-only รัน isolated Durable Object self-test โดยไม่เรียก OpenAI และไม่ส่ง LINE:

- first outcome: `SELF_TEST_PASSED`
- immediate repeat: `SELF_TEST_IDEMPOTENT`
- durable checkpoints ครบ 8 phases ตั้งแต่ dispatch authorization ถึง settlement success
- pilot accounting จริงไม่เปลี่ยน

Self-test ครอบคลุม Durable Object, checkpoint RPC และ settlement RPC ด้วย simulated transport แต่ไม่ครอบคลุม native provider fetch, actual LINE delivery หรือ webhook `waitUntil` บน remote invocation จึงไม่ถูกใช้แทน live evidence

## Exact conservative reconciliation

ก่อน mutation target route ยืนยัน exact session reference และ hashed exact attempt reference พร้อม preconditions ทั้งหมด ไม่อาศัย counters `2/2` เพียงอย่างเดียว Mutation ทำใน atomic Durable Object transaction และเรียกซ้ำได้แบบ idempotent:

| Field              |     Before |         After |
| ------------------ | ---------: | ------------: |
| admitted events    |          2 |             2 |
| provider attempts  |          2 |             2 |
| consumed micro-USD |     12,932 |        25,864 |
| reserved micro-USD |     12,932 |             0 |
| in-flight          |          1 |             0 |
| session            |    STOPPED |       STOPPED |
| unresolved attempt | DISPATCHED | USAGE_UNKNOWN |

- first outcome: `RECONCILED_EXACT_USAGE_UNKNOWN`
- repeat outcome: `RECONCILED_EXACT_IDEMPOTENT`
- actual provider usage ของ attempt เก่ายังคง `UNKNOWN`; `25,864` เป็น conservative accounting ไม่ใช่หลักฐานยอดเรียกเก็บจริง
- terminal attempt และ old session reference ไม่สามารถ reserve, dispatch, retry หรือ authorize result ของ session ใหม่; late settlement เป็น terminal idempotent no-op และไม่เปลี่ยน accounting/audit/checkpoints
- ไม่มี refund, deletion หรือการล้าง historical failure evidence

## Controlled Owner LINE event

หลังผ่าน old-attempt isolation gate ระบบเปิด session ใหม่หนึ่งครั้งโดย reuse เฉพาะ verified hashed tester allowlist เดิม Counters และ budget สะสมไม่ถูก reset Owner ส่ง synthetic LINE messageหนึ่งข้อความตาม runbook ไม่มี probe หรือ retry เพิ่ม

หลักฐาน durable ของ event นี้:

| Evidence                                                         | Result                           |
| ---------------------------------------------------------------- | -------------------------------- |
| cumulative events / provider attempts                            | `3 / 3`                          |
| provider HTTP status                                             | `200`                            |
| provider request ID                                              | present; value not recorded here |
| rate-limit remaining requests                                    | `499`                            |
| dispatch / headers / body / parse                                | `72 / 3,208 / 71 / 0` ms         |
| lifecycle checkpoints                                            | all 8 phases                     |
| checkpoint elapsed, dispatch authorization to settlement success | `3,566` ms                       |
| latest outcome                                                   | `PROVIDER_RESPONSE`              |
| successful settled attempts                                      | `1`                              |
| previous conservative usage-unknown attempts                     | `2`                              |
| consumed / reserved micro-USD                                    | `27,824 / 0`                     |
| in-flight / stale dispatched                                     | `0 / 0`                          |
| active handoffs                                                  | `0`                              |
| retry / second LINE event                                        | not performed                    |

Checkpoint sequence คือ `DISPATCH_AUTHORIZED`, `OUTBOUND_FETCH_STARTING`, `FETCH_PROMISE_CREATED`, `RESPONSE_HEADERS_RECEIVED`, `RESPONSE_BODY_READ`, `RESPONSE_PARSED`, `SETTLEMENT_STARTED`, `SETTLEMENT_SUCCEEDED` หลักฐาน HTTP 200 เริ่มที่ response-headers checkpoint; checkpoints ก่อนหน้านั้นไม่ถูกอ้างว่า OpenAI ได้รับ request

Configured model คือ `gpt-5.6-terra` ตาม committed exact TEST configuration แต่ durable snapshot นี้ไม่ได้เก็บ returned model ID จึงระบุ returned model เป็น `UNKNOWN` ไม่อนุมานจาก config

Provider response และ settlement ผ่าน แต่ durable provider checkpoints ไม่ได้พิสูจน์ actual LINE delivery โดยลำพัง หลักฐานแยกฝั่ง LINE มาจากภาพหน้าจอที่ Owner ส่งภายหลัง ซึ่งแสดง exact chat `มะลิปัง TEST`, ข้อความทดสอบและคำตอบเรื่องสาขา/เส้นทางที่เวลา `08:39` ภาพต้นทางไม่ถูกเพิ่มเข้า repository; SHA-256 สำหรับ traceability คือ `3082aa676914ef92dcb9e6cc6c36237941979e2e844ef6c3675c15f20f0f1d15` จึงยืนยัน actual LINE delivery ของ event นี้เป็น `PASS`

การยืนยันนี้เป็น delegated single-case UAT ที่ agent ตรวจเทียบกับ acceptance path หลัง Owner เป็นผู้ส่งข้อความและส่งภาพหลักฐาน ไม่ใช่ full Owner UAT และไม่ขยายผลไปยังข้อความลูกค้าจริง

## Safe shutdown

หลัง event settle สำเร็จ authenticated TEST-only stop route คืน `STOPPED` และตรวจซ้ำหลังช่วงสั้นโดย counters ไม่เปลี่ยน:

- final state `STOPPED`
- events / attempts `3 / 3`
- consumed / reserved `27,824 / 0` micro-USD
- in-flight `0`
- settled / usage-unknown `1 / 2`
- active handoffs `0`
- no new provider attempt after stop

การปิด admission ไม่อ้างว่าย้อนกลับ request ที่ provider รับไปแล้วได้ แต่ event นี้ settlement จบก่อน stop และไม่มี in-flight เหลือ

## Verdict และ remaining gates

Operational verdict ขณะบันทึก: `WP8E_CONTROLLED_RETEST_PASS_WITH_REMAINING_GATES`

WP8E พิสูจน์ native provider response, durable settlement และ actual LINE delivery ของหนึ่ง controlled event แล้ว แต่หนึ่งข้อความไม่เท่ากับ full Owner UAT Issue #12 ต้องคงเปิด Remaining gates ได้แก่:

- Owner UAT cases ที่เหลือตาม committed checklist
- rollback rehearsal / smoke coverage ที่ Issue กำหนด
- PR review และ default-branch integration หาก Issue acceptance criteria ยังคงกำหนด

TEST candidate ถูก deploy แล้ว แต่จบรอบด้วย AI off / pilot closed Production ไม่ถูก query, deploy หรือแก้ไข
