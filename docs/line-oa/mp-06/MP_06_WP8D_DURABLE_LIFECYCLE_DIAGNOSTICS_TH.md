# MP-06 WP8D — Durable lifecycle diagnostics remediation

## วัตถุประสงค์และขอบเขต

WP8D ทำงานแบบ local-only ภายใต้ Roadmap `2026.09.08-v10` เพื่อเพิ่มหลักฐาน durable ระหว่าง webhook, outbound provider request และ settlement ก่อน controlled live retest ครั้งถัดไป งานนี้ไม่ deploy, ไม่ reconcile remote attempt, ไม่เปิด pilot, ไม่เรียก OpenAI, ไม่ส่ง LINE และไม่แตะ Production

- verified baseline: `337fcf5c660867b31ffc2a0b56d0a32d99504821`
- control authorization: `d0363d1ba5381e7180b5f40aaeb9f22610856869`
- pre-fetch checkpoint control refinement: `d13e4b96e5f0e7ea3bdb8a57ab70c7525a13fdad`
- local implementation candidate: `815b1fcb7c74ecba8f4b2b402b0bbd56426dc513`
- TEST state ที่ freeze ไว้: AI off, pilot `STOPPED`, events/attempts `2/2`, consumed/reserved `12,932/12,932` micro-USD, `inFlight=1`, actual usage `UNKNOWN`

## ข้อเท็จจริง สมมติฐาน และข้อจำกัดของหลักฐานเดิม

### พิสูจน์แล้ว

- WP8C attempt ที่สองผ่าน admission, reservation และ `DISPATCH_AUTHORIZED`
- session หยุดแบบ fail closed ด้วย `IN_FLIGHT_USAGE_UNKNOWN`
- ไม่มี authorized AI reply และไม่ทำ retry
- ไม่มี persisted lifecycle diagnostic สำหรับ attempt นั้น จึงไม่มี HTTP status, OpenAI request ID, error type/code, rate-limit header, phase timing หรือ actual usage
- WP8B แก้ defect ระดับ application ที่การรอ `fetch` หรือ response body อาจไม่ settle หลัง abort โดยใช้ deadline เดิม, suppress late completion, จำกัดเวลารอ settlement และคง conservative accounting

### ยังไม่ทราบ

- native `fetch` เริ่มจริงหรือไม่
- OpenAI ได้รับ request หรือไม่
- มี response headers/body/error หรือไม่
- settlement RPC เริ่มหรือเสร็จหรือไม่
- root cause ของ remote attempt เป็น client disconnect, Worker lifecycle cancellation, transport, provider, Durable Object RPC หรือสาเหตุอื่น

ดังนั้น `DISPATCH_AUTHORIZED` ไม่เท่ากับ native fetch เริ่ม, `OUTBOUND_FETCH_STARTING` เป็นเพียง durable acknowledgement ก่อนเรียก fetch และไม่เท่ากับ provider receipt ส่วน `FETCH_PROMISE_CREATED` พิสูจน์เพียงว่า fetch call คืน Promise ให้ application แล้ว ไม่พิสูจน์ว่า OpenAI รับ request ข้อสรุปว่า remote root cause ถูกแก้แล้วจาก local tests เพียงอย่างเดียวจึงไม่ถูกต้อง

## Lifecycle design

Webhook ตรวจ signature, destination และ schema ก่อน จากนั้นตอบรับ LINE และลงทะเบียน Promise ของ event processing กับ `ExecutionContext.waitUntil()` งานภายในยัง await ตามลำดับ; ไม่มี floating Durable Object RPC การใช้ `waitUntil()` รองรับงานหลัง response ภายในขอบเขต runtime แต่ไม่ใช่ durability guarantee และมีเพดาน 30 วินาทีหลัง invocation จบตาม Cloudflare documentation

Durable Object ใช้ SQLite table แยกสำหรับ content-free lifecycle checkpoints โดยบันทึก correlation ID และ safe metadata เท่านั้น ห้าม customer text, LINE user ID, secret หรือ raw provider body ทุก RPC ต้องได้รับ acknowledgement ก่อนเดินไป phase ถัดไป

| Sequence | Checkpoint                  | สิ่งที่พิสูจน์ได้                                                         |
| -------: | --------------------------- | ------------------------------------------------------------------------- |
|        1 | `DISPATCH_AUTHORIZED`       | reservation เปลี่ยนเป็น dispatched และ correlation ถูก persist atomically |
|        2 | `OUTBOUND_FETCH_STARTING`   | application ได้ durable acknowledgement ก่อนเรียก native fetch            |
|        3 | `FETCH_PROMISE_CREATED`     | native fetch call คืน Promise แล้ว; ยังไม่ใช่ provider receipt            |
|        4 | `RESPONSE_HEADERS_RECEIVED` | application ได้ Response headers พร้อม safe HTTP/header metadata          |
|        5 | `RESPONSE_BODY_READ`        | อ่าน body จบแล้ว แต่ยังไม่อ้าง semantic validity                          |
|        6 | `RESPONSE_PARSED`           | JSON parse จบ; application schema validation ยังเป็น gate ถัดไป           |
|        7 | `SETTLEMENT_STARTED`        | settlement RPC เข้า Durable Object และ persist start checkpoint แล้ว      |
|        8 | `SETTLEMENT_SUCCEEDED`      | accounting transaction จบและ durable                                      |

Settlement start ถูกบันทึกภายใน settlement RPC ก่อน accounting transaction ไม่พึ่ง client-side checkpoint RPC แยก จึงไม่ย้ายจุดค้างไปอยู่ระหว่าง checkpoint กับ settlement หาก caller หมดเวลารอ settlement เดิมที่ 2,000 ms ผลลัพธ์ AI ยังคงถูกปฏิเสธ; late completion ทำได้เพียง idempotent settlement และไม่ authorize reply

Cloudflare ระบุว่า unawaited work อาจถูกยกเลิกหลัง invocation, Durable Object RPC ควรถูก await เสมอ, storage ที่ต้องรอดจาก eviction/restart ต้องเขียนลง storage และ output gate ทำให้ outgoing message รอ pending storage write แต่คุณสมบัติเหล่านี้ไม่ใช่หลักฐานว่า third-party provider ได้รับ request:

- <https://developers.cloudflare.com/workers/runtime-apis/context/>
- <https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/>
- <https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/>
- <https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/>

## Regression evidence

Regression ใช้ mock provider และ Workers runtime เท่านั้น ไม่มี network จริง:

- webhook entry point ตอบ HTTP 200 ก่อน provider Promise จบ และงานถูกผูกกับ `waitUntil`
- provider/fetch hang ผ่าน webhook สร้าง durable phases `DISPATCH_AUTHORIZED` → `OUTBOUND_FETCH_STARTING` → `FETCH_PROMISE_CREATED` → `SETTLEMENT_STARTED` → `SETTLEMENT_SUCCEEDED`, consume reservation แบบ conservative, stop session และไม่เรียก LINE
- response body hang อยู่ใต้ application deadline เดิม
- settlement RPC hang อยู่ใต้ settlement deadline เดิมและไม่ authorize AI output
- stop ระหว่าง in-flight แล้ว late provider response ไม่ส่ง LINE reply
- eviction/restart หลัง checkpoint ยังอ่าน state เดิมและทำ settlement ต่อแบบ deterministic
- settlement และ checkpoint ซ้ำเป็น idempotent ไม่คืนเงินหรือ slot ซ้ำ
- pre-fetch checkpoint ไม่ได้ acknowledgement ทำให้ native fetch ไม่ถูกเรียกและ fail closed
- sanitized snapshots ไม่มี session/event/attempt/tester reference หรือข้อความ

## TEST-only no-network verification preparation

Candidate เพิ่ม authenticated routes เฉพาะ exact TEST environment:

- `GET /admin/mp06-pilot/lifecycle-checkpoints` อ่าน content-free checkpoint snapshot ของ pilot coordinator
- `POST /admin/mp06-pilot/lifecycle-self-test` รับ body ที่มีเพียง random 64-hex `runRef` และใช้ Durable Object name แยก `mp06-pilot-lifecycle-self-test-v1:<runRef>`

Self-test จำลอง activate → admit → reserve → authorize → checkpoints → settle → stop ด้วย synthetic hashes ภายใน Worker ไม่มี provider call และไม่มี LINE reply การเรียกซ้ำจะคืน idempotent success เฉพาะเมื่อครบ 8 phases; partial state คืน non-success และไม่ถูกนับเป็น PASS Route อยู่หลัง TEST admin bearer authentication, exact `ENVIRONMENT=TEST`, account `มะลิปัง TEST` และ pilot-control flag เท่านั้น

ก่อน remote mutation รอบถัดไปต้อง commit/push candidate, deploy เฉพาะ exact TEST Worker ขณะ AI off/pilot stopped, ยืนยัน active version/source/artifact แล้วเรียก self-testหนึ่งครั้ง จากนั้นตรวจว่า checkpoint ครบและ provider/LINE counters ไม่เพิ่ม ห้ามอ้าง self-test นี้เป็น provider หรือ LINE evidence

## Accounting และ conservative reconciliation proposal

Attempt ที่สองต้องคง consumed/reserved `12,932/12,932` micro-USD, `inFlight=1` และ actual usage `UNKNOWN` ในรอบนี้ การหมด lease หรือเพิ่ม diagnostics ไม่ใช่หลักฐานว่า provider จบแล้ว จึงห้าม refund, clear หรือ set usage เป็นศูนย์

Proposal สำหรับ authorization รอบถัดไปต้องตรวจ exact preconditions พร้อมกัน:

| Field                               | Required before mutation              |
| ----------------------------------- | ------------------------------------- |
| session state / stop reason         | `STOPPED` / `IN_FLIGHT_USAGE_UNKNOWN` |
| admitted events / provider attempts | `2 / 2`                               |
| consumed / reserved micro-USD       | `12,932 / 12,932`                     |
| in-flight                           | `1`                                   |
| unresolved terminal usage           | `UNKNOWN`                             |
| disposition                         | consume full reservation, no refund   |

ผลที่อนุญาตได้เพียงแบบ conservative คือ consumed `25,864`, reserved `0`, `inFlight=0`, attempt เป็น terminal `USAGE_UNKNOWN`, session ยังคง `STOPPED` และหลักฐานเดิมไม่ถูกลบ การเรียกซ้ำต้องเป็น idempotent no-op Old attempt ต้องไม่สามารถ dispatch/retry/authorize reply ได้จาก terminal attempt state และ session reference เดิมก่อนอนุญาต session ใหม่ Existing reconciliation contract สำหรับ attempt แรกไม่รับ state `2/2`; จึงต้องมี transition และ reviewed exact-state implementation แยกก่อน remote reconciliation attempt ที่สอง

## สิ่งที่ยังเป็น gate

- full local/clean-checkout validation และ verified candidate commit
- TEST deployment authorization/mutation ในรอบถัดไป
- no-network lifecycle self-test บน exact TEST candidate
- separate exact conservative reconciliation implementation/authorization สำหรับ state `2/2`
- proof ว่า old attempt terminal และแยกจาก session ใหม่
- controlled provider retest หนึ่ง request และ actual LINE UAT หลังทุก gate ด้านบนผ่าน

Issue #12 ต้อง OPEN, Owner ยังไม่ต้องส่ง LINE เพิ่ม, TEST AI ต้องคง off / pilot stopped และ Production `NO_GO — NOT TOUCHED`

## Local validation evidence

- Node unit `455/455`, dedicated deterministic benchmark `14/14`, Worker `73/73`; unique total `542`, failed/skipped/cancelled `0`
- focused WP7/WP8D Node tests `48/48`; focused Worker lifecycle/coordinator tests `28/28`
- `pnpm check` ผ่านสองรอบต่อเนื่อง, formatting, ESLint, TypeScript, build, project/policy/readiness/content validators และ TEST-targeted Worker dry-run ผ่าน
- deterministic benchmark generation ผ่านสองรอบที่ 5,000 cases และ semantic checksum `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`; committed reports byte-identical
- policy checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0` และ dataset checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa` ไม่เปลี่ยน
- secret scan ผ่าน 204 files, dependency auditไม่มี known vulnerabilities, lockfile/dependency graph ไม่เปลี่ยน และ `git diff --check` ผ่าน
- normal testsใช้ mock providerเท่านั้น; ไม่มี OpenAI/LINE request, TEST deploy, remote reconciliation หรือ remote session activation
