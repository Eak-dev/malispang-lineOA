# MP-06 WP8A — Runtime Pilot-Control Remediation

วันที่: 7 กันยายน 2026

สถานะ control: `AUTHORIZED_RUNTIME_PILOT_CONTROL_REMEDIATION_WP8A_ONLY`

ผล remediation: `PASS`

- control authorization commit: `4da15774c7d19027f48a443488f3db8a0c248f23`
- runtime implementation commit: `d48c5066a4b92d4035bcf41076734199cc0fea4a`
- remote mutation / TEST deployment จาก WP8A: `false`

## สาเหตุและขอบเขต

WP6 ปิดเงื่อนไขด้าน operator/readiness documents แต่ไม่ได้พิสูจน์ runtime enforcement สำหรับ WP8 gate B: manifest เดิมระบุ `runtimeRateLimiterPresent=false` และ AI path ไม่มี shared allowlist/session/rate/budget/concurrency coordinator ดังนั้น readiness เดิมไม่ใช่ deployment readiness และถูก block จนกว่า WP8A จะผ่าน

WP8A แก้เฉพาะ admission/control boundary ของ TEST pilot ไม่เปลี่ยน model, prompt, AI structured schema, deterministic policy/evaluator, approved templates, KB/catalog, benchmark dataset/oracle/thresholds หรือ Production runtime behavior เมื่อ pilot ไม่ active

## Architecture และ atomic boundary

- ใช้ binding `CONVERSATION_STATE` ที่เป็น SQLite Durable Object เดิม ไม่เพิ่ม binding, migration หรือ remote resource
- ใช้ singleton name `mp06-pilot-control-v1`; conversation objects ปกติใช้ SHA-256 reference 64 hex จึงไม่ชน namespace นี้
- ทุกการ activate, admit, reserve, authorize dispatch, settle, stop และ result recheck ทำใน Durable Object เดียวและใช้ synchronous SQLite transaction boundary
- session, allowlist references, events, attempts, budget และ in-flight state อยู่ใน persistent storage ไม่ใช่ in-memory isolate counter
- feature default off: static deployment configไม่มี `MP06_AI_NLU_ENABLED=true`; provider ถูกเปิดเฉพาะภายใน request ที่ผ่าน active authenticated session admission

## Admission order

ก่อน provider dispatch ต้องผ่านตามลำดับ:

1. LINE HMAC signature
2. exact TEST destination
3. exact TEST environment/config contract
4. active authenticated pilot session ที่ยังไม่หมดอายุ
5. direct-user source จาก signature-protected LINE event เท่านั้น; group/room/unknown ถูกปฏิเสธจาก AI pilot
6. private SHA-256 tester reference ใน allowlist ไม่เกิน 5 คน
7. atomic event/rate/session admission
8. atomic provider-attempt, budget และ concurrency reservation
9. dispatch authorization recheck

arbitrary body/header tester identity ไม่มีสิทธิ์ใช้เป็น admission identity Tester reference เป็น private configuration ไม่อยู่ใน committed fixture, log, GitHub หรือ provider request

## Frozen limits

| Control                                |                       Limit |
| -------------------------------------- | --------------------------: |
| testers                                |                           5 |
| admitted events / rolling 60 seconds   |                          20 |
| admitted events / rolling 60 minutes   |                         200 |
| admitted events / session              |                         200 |
| provider attempts / session รวม retry  |                         200 |
| session duration จาก server activation |                  60 minutes |
| OpenAI budget / session                | 5,000,000 micro-USD (USD 5) |
| concurrent provider requests           |                           1 |

request cost ถูก reserve ก่อน dispatch ด้วย integer micro-USD upper bound จาก encoded request/schema และ output-token cap ทุก retry ขอ reservation ใหม่ Known usage reconcile จาก token usage; timeout, network failure, 5xx หรือ missing usage ถือ billing ไม่แน่ชัด จึง consume reservation และ stop sessionโดยไม่ retry

## Duplicate, crash และ kill semantics

- duplicate event ถูกปฏิเสธก่อน provider reservation และไม่ตอบซ้ำ
- pre-dispatch reservation ที่หมด lease reclaim ได้เพราะพิสูจน์ว่าไม่เคย authorize dispatch
- dispatched attempt ที่หมด leaseไม่คืน capacityหรือเงินโดยเดา แต่ stop sessionและคง in-flight unresolved เพื่อกัน overlap หลัง restart
- settlement idempotent; การเรียกซ้ำไม่คืน slotหรือ budget ซ้ำ
- authenticated `POST /admin/mp06-pilot/stop` ปิด admission/attempt ใหม่ทันที
- provider response หลัง stop/expiry ต้องผ่าน active-session result recheck; ถ้าไม่ผ่านจะไม่ส่ง AI-derived result
- race boundary คือ atomic dispatch authorization: request ที่ผ่าน boundary แล้วอาจถึง providerแม้ operator กด stopต่อมา แต่ผลตอบกลับจะถูก suppress และ accountingยัง reconcile แบบ conservative
- busy ไม่มี queue สะสม; ใช้ deterministic safe fallback โดยไม่เรียก provider

## Runtime configuration

`wrangler.jsonc` ตรึงเฉพาะ TEST model identifier และ pilot limit/capability metadata ไม่มี static AI-enable flag และไม่มี secret value Credential ยังไม่ถูกติดตั้งจาก commit นี้ การ activate ต้องผ่าน `TEST_ADMIN_KEY` และตรวจ presence ของ `OPENAI_API_KEY` โดยไม่เปิดเผยค่า

## Test evidence contract

Node tests ตรวจ exact config/default-off, direct-user identity, reserve-before-dispatch, one safe 429 retry with a new reservation, no dispatch on control rejection, conservative unknown usage, integer cost guard และ safe output

Miniflare Worker testsใช้ SQLite Durable Object จริงและ controlled timestamps เพื่อตรวจ concurrent 20/21 burst, aggregate testers, rolling window, duplicate, allowlist, concurrency 1, attempt 200/201, budget race, idempotent settlement, pre/post-dispatch crash, stale lease, kill race, expiry persistence, admin auth/config fail-closed และ destination guard โดยไม่เรียก providerจริง

ผล validation บน runtime implementation commit:

- Node unit lane: `444/444`
- deterministic benchmark lane: `14/14`; `5,000` cases / `10,000` evaluator attempts
- Worker lane: `62/62`
- combined unique tests: `520/520`
- `pnpm check` สองรอบต่อเนื่องผ่านและไม่สร้าง tracked diff
- project-control, policy, readiness, Flex, Rich Menu, KB, catalog, draft, production-readiness, secret scan, high-severity audit และ Worker dry-run ผ่าน
- policy/dataset/semantic-result checksums คงเดิม และ report artifacts byte-identical

## Limitations และ gates ถัดไป

- tests พิสูจน์ local/Miniflare storage semantics; ยังไม่ใช่หลักฐานว่า candidate ถูก deploy
- remote TEST target, retained rollback revision และ independent containment ต้องตรวจใหม่กับ final candidate
- tester allowlistจริงต้อง provision ผ่าน authenticated TEST-only activation โดยไม่บันทึก identifier
- actual LINE smoke, kill-switch rehearsal, rollback rehearsal และ Owner UAT ยังไม่เกิด
- AI model/prompt semanticsยังคง WP7 evidence เดิมและไม่ได้ rerun live evalใน WP8A

`TEST deployment: false`

`Production: NO_GO — NOT TOUCHED`
