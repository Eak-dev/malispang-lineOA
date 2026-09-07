# MP-06 WP8C — Provider reconciliation และ controlled LINE retest

## ขอบเขต

WP8C ใช้เฉพาะ Worker `malispang-lineoa-test` และ workers.dev domain ที่ตรึงใน project control เท่านั้น Production, LINE channel settings, model, prompt, policy และ benchmark semantics เป็น read-only

Historical Workers Observability query คืน HTTP 403 จึงไม่มีสิทธิ์อ่านย้อนหลังเพิ่ม และไม่ขยาย credential scope หลักฐานของ attempt เดิมจึงคง provider receipt, HTTP response และ actual usage เป็น `UNKNOWN`

## Candidate safeguards

- ส่ง `X-Client-Request-Id` แบบ random ที่ไม่ผูกกับข้อความหรือผู้ใช้ และเก็บเฉพาะ identifier ที่ผ่าน allowlist pattern
- เก็บเฉพาะ HTTP status, OpenAI request ID, safe error type/code, bounded rate-limit metadata และ phase duration; ไม่เก็บข้อความ, user ID, secret หรือ response body
- application deadline ครอบคลุม fetch และ body parsing ตาม WP8B
- settlement RPC มี deadline 2,000 ms แยกจาก provider deadline หากไม่ยืนยัน settlement ได้ต้อง fail closed และไม่อนุญาต AI result
- late settlement ยังคง idempotent และไม่สร้าง reply ครั้งที่สอง

## Exact conservative reconciliation

Route `POST /admin/mp06-pilot/reconcile-unknown-usage` อยู่หลัง bearer authentication เดียวกับ TEST admin endpoints และตรวจซ้ำว่า environment/account/control เป็น exact TEST ค่า Body ต้องมีแปด fields ตรงนี้ทุกค่า:

```json
{
  "expectedState": "STOPPED",
  "expectedStopReason": "IN_FLIGHT_USAGE_UNKNOWN",
  "expectedAdmittedEvents": 1,
  "expectedProviderAttempts": 1,
  "expectedBudgetConsumedMicroUsd": 0,
  "expectedBudgetReservedMicroUsd": 12932,
  "expectedInFlight": 1,
  "disposition": "CONSUME_FULL_RESERVATION_NO_REFUND"
}
```

หาก state ใดไม่ตรง route ต้องคืน non-success โดยไม่เปลี่ยนข้อมูล เมื่อผ่านจะย้าย reservation ทั้ง `12,932` micro-USD ไป consumed, เปลี่ยน attempt เป็น `USAGE_UNKNOWN`, คง session `STOPPED`, ไม่ authorize result, ไม่ refund และไม่ลบ event/attempt evidence การเรียกซ้ำทันทีต้อง idempotent

## New-session accounting

Activation หลัง reconcile อนุญาตได้เฉพาะเมื่อ `inFlight=0` และ reserved budget เป็นศูนย์ Counters เดิมต้อง carry forward ไป session ใหม่: 1 event, 1 provider attempt และ 12,932 consumed micro-USD ตาราง event/attempt เดิมไม่ถูกลบ ดังนั้น limit สะสม WP8 ยังคง 200 events, 200 provider attempts และ 5,000,000 micro-USD Session ใหม่มีอายุสูงสุด 60 นาทีและ WP8C รับข้อความ LINE ใหม่เพียงหนึ่งข้อความ; timeout ห้าม retry

หาก local Keychain ไม่มี raw LINE tester identifier ห้ามค้นจาก log หรือช่องทางอื่น Route `POST /admin/mp06-pilot/reactivate-reconciled-allowlist` สามารถ reuse เฉพาะ tester-reference hash ของ reconciled session เดิมโดยไม่เปิดเผยค่าได้ Body ต้องเป็น `{"reuseReconciledTesterAllowlist":true}` เพียง field เดียว และ runtime ต้องยืนยัน exact state `STOPPED` / `PROVIDER_USAGE_UNKNOWN_RECONCILED`, counters `1/1/12,932`, reserved/in-flight เป็นศูนย์ และ tester set เดิมมี 1–5 ค่า valid ก่อนสร้าง session ใหม่

Attempt เดิมไม่สามารถ dispatch ซ้ำได้เพราะ session reference ไม่ตรง active session, state เป็น `USAGE_UNKNOWN` และ result ของ old event ไม่เคยได้รับ authorization Late settlement ทำได้เพียง idempotent no-op

## Controlled execution order

1. commit/push candidate ที่ผ่าน full local และ clean-checkout validation
2. ยืนยัน AI off / pilot stopped และ exact TEST target/version ก่อน deploy
3. deploy candidate ไป exact TEST Worker โดยยังไม่ activate pilot
4. ตรวจ active version/source/artifact และ authenticated diagnostics
5. เรียก exact reconciliation ครั้งเดียว แล้วตรวจซ้ำแบบ idempotent
6. พิสูจน์ postconditions และ old-attempt isolation ก่อน activate
7. activate session เดียวด้วย private hashed Owner tester reference
8. ให้ Owner ส่งข้อความ synthetic หนึ่งข้อความตาม runbook; ไม่ส่งซ้ำเมื่อ timeout
9. ตรวจ admission → provider → parsing → settlement → authorization → LINE reply
10. stop pilot และยืนยัน AI off, no in-flight, accounting จริง

## Stop conditions

หยุดทันทีเมื่อ target/state mismatch, reconcile precondition ไม่ตรง, settlement ยัง unresolved, old attempt อาจ authorize/retry, non-allowlisted traffic, budget/rate/session guard ผิด, duplicate reply, unsafe route หรือ diagnostics มีข้อมูลต้องห้าม

ข้อความนี้เป็น candidate-preparation status ที่บันทึกใน commit `80b95e3445f330af56d64300a0c33a70e2b23831`: ณ จุดนั้น TEST deployment และ live retest ยังไม่เกิด หลักฐาน operational ที่เกิดภายหลังอยู่ด้านล่าง

## Operational evidence — 8 กันยายน 2026

### Candidate และ reconciliation

- control authorization: `2b6970217fae02f53930c7a19e6251cae7ac66d8`
- control wording correction: `44374bc1694c7a34531118707f263ea61a49fe5c`
- provider diagnostics/reconciliation candidate: `80b95e3445f330af56d64300a0c33a70e2b23831`
- verified-allowlist reactivation follow-up: `a517e02aac6f1963fbd2df40046e5603f1dcbb01`
- first WP8C TEST deployment: version `139a0f2f-9351-443f-a7af-ec176d2c02fd`
- final WP8C TEST deployment: version `d1ad3c23-de9e-4807-a7b0-31eb6c782a02`
- old attempt reconciliation: `RECONCILED_USAGE_UNKNOWN`; immediate repeat `RECONCILED_IDEMPOTENT`
- old reservation `12,932` micro-USD moved to consumed without refund; actual provider usage remains `UNKNOWN`
- old attempt became terminal `USAGE_UNKNOWN`; dispatched/stale/in-flight counts became zero before reactivation
- local Keychain did not contain `WP8_TESTER_LINE_USER_ID`; no identifier was searched elsewhere. Authenticated TEST reactivation reused only the previously verified tester-reference hash under exact reconciled-state preconditions

### Validation

- Node unit `453/453`, dedicated deterministic benchmark `14/14`, Worker `69/69`; combined unique `536`, failed/skipped/cancelled `0`
- `pnpm check` passed twice in the main checkout and passed in detached clean checkouts with frozen lockfile and isolated empty stores
- deterministic benchmark remained 5,000 cases; policy checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`, dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa` and semantic result checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` did not change
- secret scan passed 203 files; dependency audit reported no known vulnerabilities; lockfile/dependency graph and committed benchmark reports did not change

### Single Owner-sent LINE retest

Owner sent exactly one synthetic message after authenticated activation. Remote evidence changed from cumulative 1 event / 1 attempt to 2 events / 2 attempts, proving admission and provider-dispatch authorization for the new event. The new attempt did not reach a verifiable settlement:

| Evidence                                       | Actual result               |
| ---------------------------------------------- | --------------------------- |
| session state                                  | `STOPPED`                   |
| stop reason                                    | `IN_FLIGHT_USAGE_UNKNOWN`   |
| cumulative events / provider attempts          | `2 / 2`                     |
| conservative consumed / reserved               | `12,932 / 12,932` micro-USD |
| in-flight / stale dispatched                   | `1 / 1`                     |
| prior terminal usage-unknown attempts          | `1`                         |
| persisted lifecycle diagnostic for new attempt | absent                      |
| active handoffs                                | `0`                         |
| retry or second LINE event                     | not performed               |
| authorized LINE reply evidence                 | absent                      |

ไม่มี persisted lifecycle diagnostic จึงไม่ทราบว่า provider ได้รับ request หรือไม่, ไม่มี HTTP status, OpenAI request ID, error type/code, rate-limit header, phase timing หรือ actual usage ที่ยืนยันได้ ห้ามอนุมานว่าเป็น 429, เครดิตหมด, transport failure หรือ provider failure จาก counter ที่ค้างเพียงอย่างเดียว

ข้อเท็จจริงที่พิสูจน์ได้คือ admission และ dispatch authorization เกิดขึ้น แต่ settlement RPC ไม่ได้ทิ้งหลักฐานที่อ่านได้ก่อน Worker execution สิ้นสุดหรือถูกยกเลิก สมมติฐานที่ต้องตรวจใน remediation ถัดไปคือ request-lifecycle cancellation ก่อน timeout/settlement completion; ยังไม่ใช่ root cause ที่ยืนยันแล้ว Candidate ถัดไปต้อง persist lifecycle checkpoint แบบ atomic ก่อน outbound dispatch และใช้ execution-lifecycle handling ที่รับประกัน settlement/containment แม้ webhook client disconnect โดยไม่เพิ่ม provider timeoutหรือ retry

Final TEST containment ณ เวลาบันทึก: AI admission ปิดเพราะ session `STOPPED`; pilot ปิด; unresolved attempt ใหม่ยังคง reservation แบบ conservative และ actual usage `UNKNOWN` ห้าม activate session ใหม่, refund, clear in-flight หรือลบ evidence โดยไม่มี control transition ใหม่

Issue #12 ต้อง OPEN และ Production `NO_GO — NOT TOUCHED`
