# MP-06 WP6 — TEST Readiness Assessment

วันที่ประเมิน: 6 กันยายน 2026

Original assessment verdict: **TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS**

Condition-closure reassessment: **WP6_TEST_READINESS_CONDITIONS_CLOSED**

Current TEST-readiness state: **READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION** — เป็น readiness evidence เท่านั้น ไม่ใช่ deployment authorization

## 1. วัตถุประสงค์

ประเมินว่า environment `มะลิปัง TEST` มี boundary เพียงพอสำหรับการขออนุมัติรอบถัดไปหรือไม่ โดยตรวจ configuration, remote TEST metadata และหลักฐานใน repository แบบ read-only เท่านั้น WP6 ไม่ใช่การ deploy, live smoke test, Owner UAT หรือการรับรอง Production

## 2. ขอบเขตและข้อห้าม

- อ่าน repository deployment configuration, TEST metadata, deployment history และชื่อ/presence ของ TEST secrets
- รัน local validators, benchmark และ Worker dry-run ได้ แต่ห้าม deploy
- ห้ามอ่าน secret values, query Production remote state, เปิด Production dashboard/logs/webhook หรือใช้ข้อมูลลูกค้าจริง
- runtime, policy, templates, KB/catalog, dataset/oracle, benchmark semantics, toolchain และ dependency graph เป็น read-only
- ห้ามแก้ LINE OA, Webhook, Rich Menu, Reward Card, Cloudflare remote resource, secret หรือ route

## 3. Authoritative commits และ checksums

| หลักฐาน                          | ค่า                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Roadmap / control                | `2026.09.06-v3` / `e35e9ade546137b6ee93289caafb3d257bf008e4`                                |
| Benchmark development base       | `8117f7c0b7cb190af81ea8f9481bd257db8a5a51`                                                  |
| Runtime implementation           | `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`                                                  |
| WP2 artifact                     | `12e0d27dc06052f5f9a2075aff8f12c90bf5852e`                                                  |
| Toolchain completion             | `9377e30faf0f63e506ba1eb1b88f7c2d7bbcd331`                                                  |
| Benchmark execution remediation  | `b6bc93db284ad5f43a60f7f3eb31f9b12319fa9a`                                                  |
| Roadmap v4 authorization         | `96a5a2271969b1cc1d23cdbf1afe457fa0f6808b`                                                  |
| Condition-closure implementation | `688c1fbd75358429b7161f41de3ef706696595e4`                                                  |
| Policy                           | `2026.09.05-policy-v1` / `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` |
| Dataset                          | `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`                          |
| Semantic result                  | `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`                          |

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

TEST-only rollback plan ถูก freeze ใน `config/mp-06/test-readiness-controls.json`: decision owner คือ role `OWNER_PO`, executor คือ `TEST_DEPLOYMENT_OPERATOR`, pre-MP-06 target คือ version 21 / `3e02e79b-29c9-46cf-9218-ed2d0b7d7655`, decision target 5 นาที และ recovery target 15 นาที หาก target/operator/environment identity ไม่พร้อม ให้ปิด TEST webhook และ abort โดยห้าม fallback ไป Production Code rollback ไม่ย้อน Durable Object storage จึงต้องตรวจ state แยกตาม runbook

สถานะ plan: **PASS**; rollback rehearsal: **NOT_PERFORMED** และยังเป็น gate ก่อน Issue closure

## 14. Kill switch

kill switch ถูก freeze เป็นการปิด `Use webhook` ของ TEST channel เท่านั้น ผู้ตัดสินใจคือ `OWNER_PO`, ผู้ดำเนินการคือ `TEST_DEPLOYMENT_OPERATOR`, Production impact ต้องเป็น `NONE` และ missing/malformed controls ทำให้ validator fail closed สถานะ design/ownership: **PASS**; rehearsal: **NOT_PERFORMED**

## 15. Smoke-test plan

fixtures สังเคราะห์ 8 รายการใน `config/mp-06/test-readiness-fixtures.json` ถูก freeze และผ่าน PII/Production-target validator ครอบคลุม AUTO, CLARIFY, STAFF_ONLY, authority fail closed, invalid signature, duplicate, idempotency และ kill-switch หลัง Owner อนุมัติ deploy แยก ให้รันตามลำดับและหยุดทันทีเมื่อข้อใดไม่ผ่าน:

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

Cloudflare observability logs เปิดอยู่และ runtime มี structured redacted outcome/reason codes TEST-only manifest ตรึง alert/stop signals สำหรับ environment/destination mismatch, PII/raw-text, unsupported/partial response, authority failure, duplicate และ rate budget พร้อม roles `OWNER_PO`, `TEST_DEPLOYMENT_OPERATOR`, `TEST_MONITOR`; webhook errors หยุด pilotที่ 3 ครั้งใน 5 นาที ส่วน safety signals หยุดตั้งแต่ occurrence แรก ไม่มี raw payload หรือ secret value ใน manifest สถานะ configuration: **PASS**; live alert observation ยังไม่เกิดเพราะยังไม่ deploy

## 18. Rate / cost / abuse limits

มี signature, destination, admin auth, request-size limit, event deduplication และ fail-closed policy TEST-only pilot ถูกจำกัดไม่เกิน 5 internal testers, 20 accepted webhook events/นาที, 200/ชั่วโมง และ 60 นาทีต่อ session ค่า missing/malformed หรือ namespace ที่ชน Production ทำให้ readiness validator fail closed Repository ยังไม่มี runtime rate-limiter primitiveและรอบนี้ห้ามแก้ runtime จึงเป็น pre-deployment/operator gate ไม่ใช่คำกล่าวว่ามี product-side throttling สถานะ readiness control: **PASS**; live enforcement verification ต้องอยู่ใน separate deployment gate

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

Condition closure ย้าย preview generation ก่อน `format:check` และทำ generator ให้ emit canonical Prettier output โดยตรง สอง consecutive `pnpm check` runs จบด้วย preview byte-identical และไม่มี tracked drift Rich Menu content/dimensions/actions/labels/design ไม่เปลี่ยน สถานะ validation-chain idempotence: **PASS**

## 21. Blockers / conditions

Conditions 1–4 จาก original assessment ปิดแล้วด้วย implementation commit `688c1fbd75358429b7161f41de3ef706696595e4`:

1. active timeout metadata ตรง dedicated hook `300_000` ms และ two test-specific `15_000` ms limits
2. TEST alert/rate/stop controls และ responsible roles ถูก freeze แบบ non-secret/fail-closed
3. rollback target/owner/runbook และ 8 synthetic smoke/UAT fixtures ถูก freeze
4. `pnpm check` สองรอบจบ clean และ preview byte-stable

Remaining gates ที่ไม่ได้ถูกอ้างว่าปิด:

5. MP-06 code ยังไม่ deploy; live smoke, rollback rehearsal และ Owner UAT ยังไม่เกิด
6. AI/NLU semantic interpretation ตาม Issue #12 ยังไม่ได้ implement
7. ไม่มี PR/review/default-branch integration
8. Production ยังคง `NO_GO`

## 22. Verdict

Original verdict คงเป็น **TEST_READINESS_ASSESSMENT_PASS_WITH_CONDITIONS** เพื่อรักษาประวัติ ณ assessment commit

Reassessment verdict: **WP6_TEST_READINESS_CONDITIONS_CLOSED**

TEST/Production boundary, Worker/domain, bindings, secret presence, webhook/auth guard, redaction, idempotency, TEST controls, rollback/runbook, fixtures และ validation-chain idempotence มีหลักฐานครบสำหรับสถานะ `READY_FOR_SEPARATE_DEPLOYMENT_AUTHORIZATION` แต่ action ปัจจุบันคือ `NONE` Verdict นี้ไม่ใช่ deployment approval, `TEST_DEPLOYED`, Production readiness หรือ Issue #12 completion

## 23. Exact next transition proposal

Roadmap `2026.09.06-v4` บันทึก phase/status/action เป็น `WP6_TEST_READINESS_CONDITIONS_CLOSED` / `AWAITING_OWNER_NEXT_WORK_PACKAGE_AUTHORIZATION` / `NONE` โดย closure authorization flag เป็น false และ evidence flag เป็น true

Owner/PO ต้องเลือกเพียงหนึ่ง next work package และทำ control transition ใหม่:

- AI/NLU work package โดยยังห้าม deploy; หรือ
- separate TEST deployment authorization พร้อม change-window roles, live smoke, rollback rehearsal และ Owner UAT gates

ห้ามเริ่มสองทางนี้จาก readiness evidence เอง PR/merge/rebase, Production query/action และ MP-07 ยังถูก block Issue #9 คง MP-06 เป็น CURRENT และ Issue #12 ต้องเปิดต่อ

Issue #9 ควรคง MP-06 เป็น CURRENT และ Issue #12 ต้องเปิดต่อ

## 24. Deployment status

**NOT DEPLOYED**

TEST deployment: `false`

Production: `NO_GO`
