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

TEST candidate deployment และ live retest ยังไม่เกิดในเอกสารฉบับนี้ Issue #12 ต้อง OPEN และ Production `NO_GO — NOT TOUCHED`
