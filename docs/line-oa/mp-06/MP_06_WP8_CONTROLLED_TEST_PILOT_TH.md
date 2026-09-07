# MP-06 WP8 — Controlled TEST Pilot Evidence

วันที่: 7 กันยายน 2026

Verdict: `WP8_TEST_PILOT_PARTIAL_AWAITING_LINE_TEST`

## ขอบเขตและ provenance

- Roadmap: `2026.09.07-v7`
- execution control/source commit: `98a3f46226acaaeeaffe5954e4f9d22fca05a622`
- runtime implementation commit: `d48c5066a4b92d4035bcf41076734199cc0fea4a`
- dry-run Worker bundle SHA-256: `810c6d51f4898076ce2d6c4f93666128370387e79263d695021c50cf250ed36b`
- exact Worker: `malispang-lineoa-test`
- endpoint: `https://malispang-lineoa-test.eakkachai-dev.workers.dev`
- configuration: `wrangler.jsonc`
- credential slot: `OPENAI_API_KEY`; presenceยืนยันแล้วโดยไม่อ่านหรือบันทึกค่า
- Production remote state: `NOT_QUERIED_OR_TOUCHED`

## Gates A/B/C

| Gate                 | Evidence                                                                                                                                                                                                                               | Result                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A — routing          | WP7 มี 60 unique cases / 100 attempts; mismatch 2 attempts คือ `WP7-01-02` expected AUTO แต่ final STAFF_ONLY และ `WP7-09-01` expected CLARIFY แต่ final STAFF_ONLY                                                                    | PASS — safe over-handoff only; unsafe AUTO/authority downgrade/business claim = 0 |
| B — runtime controls | shared SQLite Durable Object บังคับ signature/destination/direct-user/allowlist/session, rolling 20/60s + 200/60m, 200 events, 200 attempts, USD 5 integer-micro-USD budget, concurrency 1, duplicate/crash/kill/late-result semantics | PASS — local/Miniflare runtime-storage evidence                                   |
| C — rollback         | retained TEST v21 `3e02e79b-29c9-46cf-9218-ed2d0b7d7655`; DO namespaces/classesตรงกัน, ไม่มี AI integration และไม่มี authenticated pilot endpoint                                                                                      | PASS — exact TEST target with independent no-AI containment                       |

Synthetic evaluation เป็นหลักฐาน synthetic เท่านั้น ไม่รับประกันภาษาลูกค้าจริง

## Deployment chronology

| Event                   | UTC evidence          | Result                                                                                                                      |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| baseline active         | ก่อน remote write     | TEST v21 `3e02e79b-29c9-46cf-9218-ed2d0b7d7655`                                                                             |
| approved secret install | 2026-09-07            | `OPENAI_API_KEY` presence confirmed; Wrangler created intermediate version `f8e94c29-79b8-43d3-bd9d-134c99a4f851`           |
| candidate deploy AI-off | 2026-09-07 03:20 UTC  | version `98f34b79-6847-40e3-a1fb-f287a4f46916`, health PASS                                                                 |
| control rehearsal       | 2026-09-07 03:23 UTC  | synthetic non-user allowlist activation then authenticated stop; unsigned webhook 401; events/attempts/cost/in-flight all 0 |
| rollback                | 03:24:22–03:24:25 UTC | exact v21 restored 100%; health PASS; authenticated pilot endpoint 404; decision/recovery targets met                       |
| candidate redeploy once | 03:25:06–03:25:13 UTC | final version `509c3587-7ae9-41a8-8ba2-1082d03e138d`, health PASS                                                           |
| final containment       | หลัง redeploy         | pilot `STOPPED`, AI off, events 0, provider attempts 0, cost/reserved budget 0, in-flight 0                                 |

Rollback ไม่ย้อน Durable Object storageตาม Cloudflare contract Persistent STOPPED session จึงยังอยู่หลัง redeploy และป้องกัน automatic reactivation

## Smoke evidence แยกประเภท

- synthetic HTTP health: PASS (`TEST`, `มะลิปัง TEST`, SQLite persistence)
- unauthenticated admin request: 401
- unsigned synthetic webhook: 401 และ provider attemptsคง 0
- authenticated remote pilot activate/stop: PASS แต่ใช้ synthetic non-user reference และไม่ได้เรียก provider
- signed synthetic LINE webhook: `NOT_PERFORMED`
- live OpenAI call from TEST Worker: `NOT_PERFORMED`
- actual LINE test-channel end-to-end: `BLOCKED_TESTER_IDENTITY_NOT_PROVISIONED`
- Owner UAT: `PENDING`

HTTP/control evidenceข้างต้นห้ามนำไปอ้างแทน actual LINE end-to-end

## Budget และ security

- TEST events used: `0 / 200`
- provider attempts used: `0 / 200`
- OpenAI cost used: `USD 0 / USD 5`
- pilot session duration: ต่ำกว่า 60 นาทีและถูก stop แบบ authenticated
- secret values, tester identifiers, customer input และ provider outputไม่ถูกบันทึกใน Git/report/GitHub
- normal validation suitesใช้ mock providerและไม่เรียก live API
- LINE/Cloudflare Production, Rich Menu, Reward Card, webhook configuration และ remote resourcesไม่ถูกแก้

## Remaining human gate

ก่อน actual LINE smoke ต้อง provision TEST LINE user ID ของผู้ทดสอบผ่านช่องทาง private โดยไม่ส่ง raw identifierใน chat/GitHub วิธีที่รองรับโดยเครื่องนี้คือ Owner เก็บค่าไว้ใน macOS Keychain service `malispang-lineoa-test`, account `WP8_TESTER_LINE_USER_ID` แล้วแจ้งเพียงว่าเสร็จ จากนั้น operatorจะ hash ค่าใน process, activate allowlist, ให้ Owner ส่งข้อความ synthetic ผ่าน LINE TEST channel, ตรวจ route/provider/control evidence และ stop sessionทันที

ห้ามปิด Issue #12: actual LINE smoke, Owner UAT, PR/default-branch integration และ Production decisionยังไม่ครบ

TEST deployment occurred: `true`

Current TEST revision: `509c3587-7ae9-41a8-8ba2-1082d03e138d`

AI enabled: `false`

Pilot closed: `true`

Production: `NO_GO — NOT TOUCHED`
