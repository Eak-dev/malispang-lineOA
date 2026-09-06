# MP-06 WP6 — TEST Readiness Assessment

วันที่ประเมิน: 6 กันยายน 2026

Verdict: **TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS**

## 1. วัตถุประสงค์

ประเมินว่า environment `มะลิปัง TEST` มี boundary เพียงพอสำหรับการขออนุมัติรอบถัดไปหรือไม่ โดยตรวจ configuration, remote TEST metadata และหลักฐานใน repository แบบ read-only เท่านั้น WP6 ไม่ใช่การ deploy, live smoke test, Owner UAT หรือการรับรอง Production

## 2. ขอบเขตและข้อห้าม

- อ่าน repository deployment configuration, TEST metadata, deployment history และชื่อ/presence ของ TEST secrets
- รัน local validators, benchmark และ Worker dry-run ได้ แต่ห้าม deploy
- ห้ามอ่าน secret values, query Production remote state, เปิด Production dashboard/logs/webhook หรือใช้ข้อมูลลูกค้าจริง
- runtime, policy, templates, KB/catalog, dataset/oracle, benchmark semantics, toolchain และ dependency graph เป็น read-only
- ห้ามแก้ LINE OA, Webhook, Rich Menu, Reward Card, Cloudflare remote resource, secret หรือ route

## 3. Authoritative commits และ checksums

| หลักฐาน                         | ค่า                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Roadmap / control               | `2026.09.06-v3` / `e35e9ade546137b6ee93289caafb3d257bf008e4`                                |
| Benchmark development base      | `8117f7c0b7cb190af81ea8f9481bd257db8a5a51`                                                  |
| Runtime implementation          | `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`                                                  |
| WP2 artifact                    | `12e0d27dc06052f5f9a2075aff8f12c90bf5852e`                                                  |
| Toolchain completion            | `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`                                                  |
| Benchmark execution remediation | `b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a`                                                  |
| Policy                          | `2026.09.05-policy-v1` / `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` |
| Dataset                         | `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`                          |
| Semantic result                 | `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`                          |

## 4. TEST environment inventory

การตรวจ remote ใช้ชื่อ `malispang-lineoa-test` แบบ explicit และอ่านเฉพาะ metadata:

| รายการ               | หลักฐาน                                                                                                                    | สถานะ                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Worker               | `wrangler.jsonc` และ remote current version ใช้ `malispang-lineoa-test`                                                    | PASS                                  |
| Endpoint             | `https://malispang-lineoa-test.eakkachai-dev.workers.dev`; `/health` ตอบ 200 พร้อม `TEST` / `มะลิปัง TEST`                 | PASS                                  |
| Route                | `workers_dev=true`, `preview_urls=false`, ไม่มี custom route                                                               | PASS                                  |
| Runtime ปัจจุบัน     | remote version `3e02e79b-29c9-46cf-9218-ed2d0b7d7655` (v21); เป็น baseline ก่อน MP-06 และไม่ใช่หลักฐานว่า MP-06 ถูก deploy | PASS                                  |
| Rollback candidate   | retained version `b4e74202-ff31-4049-99d9-71e282f2e60b` (v20); ต้อง freeze ใหม่ ณ เวลา deploy                              | PASS                                  |
| Durable Objects      | `CONVERSATION_STATE`, `HANDOFF_REGISTRY`, `DRAFT_ORDER`, `PROMOTION_CONTROL`; SQLite                                       | PASS                                  |
| KV / D1 / R2 / Queue | ไม่มี binding ใน config หรือ current TEST version                                                                          | NOT_APPLICABLE — runtime นี้ไม่ได้ใช้ |
| Analytics binding    | ไม่มี                                                                                                                      | NOT_APPLICABLE — runtime นี้ไม่ได้ใช้ |

## 5. TEST/Production isolation matrix

| Component             | TEST requirement              | Evidence                                                                                                                                          | Status |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Worker                | ชื่อเฉพาะ TEST                | `malispang-lineoa-test` ทั้ง committed config และ remote metadata                                                                                 | PASS   |
| Route/domain          | ไม่ใช่ Production             | TEST workers.dev domain, ไม่มี custom route                                                                                                       | PASS   |
| Runtime guard         | ห้าม fallback เป็น Production | `assertTestEnvironment` บังคับ `TEST`, `มะลิปัง TEST`, `APPROVED_ONLY` และปฏิเสธ binding ชื่อ PROD/PRODUCTION                                     | PASS   |
| LINE channel          | test-only                     | `TEST_PHASE_1A_DEPLOYMENT_TH.md` บันทึก Provider/Channel `MalisPang TEST Sandbox` / `มะลิปัง TEST`; destination guard bind กับ `LINE_BOT_USER_ID` | PASS   |
| Webhook               | test-only                     | เอกสาร Phase 1A บันทึก TEST URL/verification; runtime ตรวจ HMAC และ destination                                                                   | PASS   |
| Durable Objects       | resource ของ TEST             | bindings อยู่ใต้ TEST Worker และ remote version เดียวกัน                                                                                          | PASS   |
| Secrets               | TEST names/presence           | remote names-only inventoryครบห้ารายการ; ไม่อ่านค่า                                                                                               | PASS   |
| Logs                  | ไม่มี raw PII                 | hashed event/conversation refs และ reason codes; benchmark leakage=0                                                                              | PASS   |
| Production comparison | ไม่ query Production          | ใช้ committed masked evidence ตาม Owner authorization; ไม่มี Production remote request                                                            | PASS   |

## 6. Worker / route / domain separation

`wrangler.jsonc` มี Worker เดียวชื่อ `malispang-lineoa-test`, TEST public asset host แบบ exact, ไม่มี route หรือ environment ที่ชี้ Production และ `deploy:test` อ่าน config นี้จาก repository root ส่วน runtime fail closed ก่อน `/webhook` และ `/admin/*` เมื่อ account marker ไม่ตรง การ hard-code target TEST ลดความเสี่ยง fallback แต่ก่อน deploy จริงควร freeze command, cwd, config checksum และ Worker name ใน deployment manifest

## 7. Bindings และ resources separation

remote current version แสดง 17 binding records: Durable Objects 4, encrypted secret names 5 และ plain TEST configuration 8 รายการ ชื่อและชนิดตรงกับ committed config ไม่พบ KV/D1/R2/Queue/AI binding และไม่พบ Production-named binding การประเมินไม่อ่าน state ภายใน Durable Objects และไม่เปรียบเทียบ Production remote resources

## 8. Secret-name / presence matrix

| Secret name                 | Presence | Value inspected |
| --------------------------- | -------- | --------------- |
| `LINE_CHANNEL_SECRET`       | PASS     | NO              |
| `LINE_CHANNEL_ACCESS_TOKEN` | PASS     | NO              |
| `LINE_BOT_USER_ID`          | PASS     | NO              |
| `TEST_ADMIN_KEY`            | PASS     | NO              |
| `TEST_REWARD_CARD_URL`      | PASS     | NO              |

`assertRequiredSecrets` ยัง fail closed เมื่อ binding ขาดหรือสั้นผิดปกติ แต่ WP6 ไม่พิสูจน์ความถูกต้องของค่าจริงและไม่หมุน credential

## 9. Webhook / test-channel isolation

committed Phase 1A evidence ระบุ LINE Provider และ Messaging API Channel เฉพาะ TEST, URL TEST, LINE Verify และ Owner TEST UAT เดิม Runtime ตรวจ signature ก่อน parse, ตรวจ `destination` กับ secret-bound test bot ID และไม่ log raw payload อย่างไรก็ดี หลักฐานเดิมไม่ใช่ live smoke test ของ MP-06 commit; ต้องทดสอบอีกครั้งหลังได้รับ deployment authorization

## 10. Logging และ PII redaction

- request outcome log มีเฉพาะ level, hashed `eventRef`, outcome และ safe reason code
- error path แปลง code ที่ไม่อยู่ใน allowlisted shape เป็น `UNEXPECTED_ERROR`
- processed-event, handoff และ benchmark audit ใช้ fingerprint/reference แบบไม่เก็บ raw customer text
- benchmark 5,000 cases รายงาน PII/raw-chat leakage = 0
- observability เปิด logs sampling 1; invocation logs และ traces ปิด

สถานะ implementation เป็น PASS แต่ live-log sampling review ของ MP-06 หลัง deploy ยังไม่เกิดและต้องอยู่ใน smoke/UAT plan

## 11. Authentication / authorization boundary

webhook ใช้ HMAC signature และ destination guard; admin ใช้ constant-time bearer comparison กับ `TEST_ADMIN_KEY`; staff/owner actions ตรวจ allowlists เฉพาะ TEST; body size จำกัด 1 MiB สำหรับ webhook และ 8 KiB สำหรับ admin จุดที่ยังต้อง freeze ก่อน pilot คือรายชื่อผู้ทำ UAT/rollback และ session handling ระหว่าง change window โดยไม่บันทึก credential ลง evidence

## 12. Idempotency / retry readiness

Conversation Durable Object deduplicate ด้วย hashed event reference, บันทึก delivery state, จำกัด handoff acknowledgement หนึ่งครั้ง และ MP-06 fingerprint ไม่มี raw input Benchmark ครอบคลุม duplicate/retry, atomic cancellation และ 10,000 actual execution attempts จาก 5,000 cases สถานะ local เป็น PASS; live LINE retry หลัง MP-06 deploy ยังต้องอยู่ใน smoke test

## 13. Rollback plan

มี manual TEST-only rollback path: ปิด `Use webhook` ของ `มะลิปัง TEST`, rollback Worker `malispang-lineoa-test` ไป retained version และตรวจ Durable Object state แยก เพราะ code rollback ไม่ย้อน storage ปัจจุบันมี v21 และ retained v20 แต่ต้อง capture current/stable version, config hash, rollback owner และ maximum decision time ใหม่ทันทีก่อน deployment ใด ๆ

## 14. Kill switch

kill path ที่มีคือปิด TEST webhook ซึ่งหยุด event ใหม่โดยไม่แตะ Production และ rollback Worker เฉพาะ TEST จึงเพียงพอในเชิงสถาปัตยกรรม แต่ยังไม่มี MP-06 deployment rehearsal และผู้กด/ผู้อนุมัติที่ freeze สำหรับ change window สถานะ: **PASS** สำหรับ design และ **FAIL** สำหรับ rehearsal ที่ยังไม่ทำ

## 15. Smoke-test plan

หลัง Owner อนุมัติ deploy แยก ให้รันตามลำดับและหยุดทันทีเมื่อข้อใดไม่ผ่าน:

1. freeze commit, Worker/config hash, current/rollback version และ operator
2. `/health` ต้องเป็น 200 และระบุ TEST เท่านั้น
3. invalid signature 401; wrong destination 403; unauthenticated admin 401
4. synthetic TEST-only cases: AUTO, CLARIFY, STAFF_ONLY, composite 2/3 units, overflow T-C04 และ risky atomic handoff
5. duplicate event ต้องไม่ตอบซ้ำ; handoff acknowledgementหนึ่งครั้งและ silence หลังจากนั้น
6. ตรวจ sampled TEST logs ว่าไม่มี raw message/user ID/credential
7. rollback rehearsal และ state reconciliation ก่อน Owner UAT

ยังไม่ได้รัน plan นี้กับ MP-06 เพราะ TEST deployment=false

## 16. Owner UAT plan

ใช้บัญชีผู้ทดสอบภายในกับข้อความสังเคราะห์เท่านั้น ตรวจ Thai variation, exact templates, catalog PRICE, multi-intent ordering, clarification budget, staff handoff, duplicate/retry และ no-partial-AUTO Owner ต้องบันทึกผลเองหลัง live TEST smoke ผ่าน Automated benchmark หรือ simulated UAT ไม่แทน Owner UAT ปัจจุบัน: **FAIL — ยังไม่ดำเนินการ**

## 17. Monitoring / alert plan

Cloudflare observability logs เปิดอยู่และ runtime มี structured redacted outcome/reason codes แต่ repository ยังไม่มี MP-06 TEST alert thresholds/recipient manifest ที่ freeze สำหรับ pilot ก่อน deploy ต้องกำหนดอย่างน้อย error/signature/destination/duplicate/handoff/unsupported-claim signals, observation window, owner/operator และ stop/rollback threshold โดยไม่เพิ่ม raw payload logging สถานะ: **FAIL — condition ยังเปิด**

## 18. Rate / cost / abuse limits

มี signature, destination, admin auth, request-size limit, event deduplication และ fail-closed policy; AI provider ยังไม่มีจึงไม่มี model cost ใน WP6 แต่ไม่มี explicit TEST pilot request-rate budget/circuit breaker หรือ alert threshold ก่อน deployment authorization ต้องกำหนด test-user scope, maximum pilot volume และ stop condition สถานะ: **FAIL — condition ยังเปิด**

## 19. Failure scenarios

| Scenario                       | Expected action                                                    |
| ------------------------------ | ------------------------------------------------------------------ |
| account/config marker ผิด      | fail closed ก่อน business route                                    |
| secret ขาด                     | 503 โดยไม่เปิดเผยค่า                                               |
| signature/destination ผิด      | 401/403; ไม่ประมวลผล event                                         |
| authority/checksum/binding ผิด | STAFF_ONLY แบบ atomic; no partial AUTO                             |
| duplicate/retry                | no duplicate reply/handoff                                         |
| persistence/LINE error         | fail closed; redacted outcome; stop pilot ตาม threshold            |
| PII/log anomaly                | ปิด TEST webhook, เก็บเฉพาะ redacted evidence, rollback            |
| unexpected response/regression | หยุด UATและ rollback TEST version; ห้ามชดเชยด้วย Production change |

## 20. PR / default-branch considerations

default branch คือ `codex/phase-1a-foundation` ที่ commit `30b79f791e276fa5f420d08ffff208a231780281`; branch MP-06 อยู่ข้างหน้า 30 commitsและไม่อยู่ข้างหลัง (`0 behind / 30 ahead`) ณ control commit และข้างหน้า 31 commitsหลังเพิ่ม assessment artifact จึงไม่มี merge conflict จาก default-branch drift ณ เวลาประเมิน ไม่พบ PR สำหรับ branch นี้ และ default branch ไม่เปิด branch protection ที่ API มองเห็นได้ ต้องสร้าง PR/review ในรอบที่ได้รับอนุญาตและใช้ checklist ใน `.github/pull_request_template.md`; WP6 ห้ามสร้าง PR หรือ merge

Clean-checkout validation พบข้อจำกัดเดิมของ command ordering: `pnpm check` รัน `format:check` ก่อน `preview:rich-menu` และ preview generator สร้าง tracked HTML ที่ยังไม่ format จึงเกิด formatting diff ชั่วคราว การรัน committed formatter คืน artifact เป็น byte-identical และ checkout สุดท้ายสะอาด แต่ PR-readiness transition ต้องแก้ ordering หรือ generator ให้ validation chain จบแบบสะอาดเอง ห้ามถือขั้นตอนแก้ชั่วคราวนี้เป็น hermetic proof

## 21. Blockers / conditions

1. `current-work.json` ที่ freeze ก่อน remediation ยังคงบันทึก timeout contract 120 วินาที ขณะที่ Owner-authorized dedicated benchmark lane ใช้ 300 วินาที และยังบันทึก assessment status เป็น `NOT_STARTED` ต้อง normalize governance metadata/assessment evidence ก่อน deployment authorization
2. ต้อง freeze MP-06 TEST monitoring/alert thresholds, pilot volume/rate guard, recipients และ stop conditions
3. ต้อง freeze current/rollback Worker versions, rollback owner/operator และ runbook checklist ณ change window
4. ต้องเตรียม synthetic smoke/UAT fixtures และรายชื่อผู้ทดสอบ โดยห้ามใช้ Production chat
5. MP-06 code ยังไม่ deploy; live smoke, rollback rehearsal และ Owner UAT ยังไม่เกิด
6. AI/NLU semantic interpretation ตาม Issue #12 ยังไม่ได้ implement
7. ไม่มี PR/review/default-branch integration
8. `pnpm check` ยังต้องแก้ลำดับ format/preview หรือ generator เพื่อไม่ให้ tracked Rich Menu preview drift ชั่วคราว

## 22. Verdict

**TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS**

TEST/Production boundary, Worker/domain, bindings, secret presence, webhook/auth guard, redaction, idempotency และ rollback/kill path มีหลักฐานเพียงพอสำหรับการวางแผนขั้นถัดไป แต่ยังห้าม deploy จน conditions ในหัวข้อ 21 ปิดด้วย control transition และหลักฐานจริง Verdict นี้ไม่ใช่ `TEST_DEPLOYED`, ไม่ใช่ Production readiness และไม่ทำให้ Issue #12 เสร็จ

## 23. Exact next transition proposal

เสนอ Roadmap `2026.09.06-v4`, current `MP-06 (GitHub #12)` และ phase/status/action ใหม่ดังนี้:

- phase: `WP6_TEST_READINESS_CONDITION_CLOSURE`
- status: `AUTHORIZED_TEST_READINESS_CONDITION_CLOSURE_WP6_ONLY`
- action: `TEST_READINESS_CONDITION_CLOSURE_WP6`
- flag: `testReadinessConditionClosureWp6=true`

ชื่อเหล่านี้ **ยังไม่มีใน schema ปัจจุบัน** จึงต้องเพิ่มแบบแคบใน control transition ที่ Owner อนุมัติ ห้ามใช้ชื่อดังกล่าวเป็น authorization เอง

Allowed scope ที่เสนอ: normalize benchmark watchdog metadata/commit references และ assessment completion state; แก้ validation-chain ordering/preview formatting แบบไม่เปลี่ยน artifact semantics; เพิ่ม TEST-only monitoring/rate/stop manifest และ validators; freeze rollback/smoke/UAT runbook/fixtures แบบ synthetic; ทำ assessment ซ้ำ; commit/push/evidence เท่านั้น

Forbidden scope ที่เสนอ: AI/NLU/runtime/policy/KB/catalog/dataset/oracle mutation, remote resource/secret/LINE change, TEST/Production deploy, PR/merge/rebase, Production query/action และ MP-07 หลัง condition closure ผ่านแล้ว Owner ยังต้องอนุมัติ AI/NLU work package แยก จากนั้นจึงพิจารณา TEST deployment, smoke, rollback rehearsal และ Owner UAT แบบแยก gate

Issue #9 ควรคง MP-06 เป็น CURRENT และ Issue #12 ต้องเปิดต่อ

## 24. Deployment status

**NOT DEPLOYED**

TEST deployment: `false`

Production: `NO_GO`
