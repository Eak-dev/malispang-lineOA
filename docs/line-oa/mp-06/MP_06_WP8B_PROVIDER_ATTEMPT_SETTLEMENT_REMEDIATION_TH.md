# MP-06 WP8B — Provider-attempt settlement remediation

## ขอบเขต

เอกสารนี้บันทึกการแก้ `IN_FLIGHT_USAGE_UNKNOWN` แบบ local-only ภายใต้ Roadmap `2026.09.07-v8` ไม่ได้อนุญาต TEST deployment, pilot session, live provider request หรือการแก้ attempt เดิมบน remote และไม่แตะ Production

- control authorization commit: `63bc6cc0ba2aff535c8b7d809232525c10259ed4`
- verified implementation candidate: `25b0bc9f726b05d80aeb586fd09290c43bc3ba35`

## หลักฐาน attempt เดิม

ข้อเท็จจริงที่ยืนยันได้จาก TEST control state:

- event ถูก admit 1 รายการ
- provider attempt ถูก reserve และ dispatch ได้รับ authorization 1 ครั้ง
- session หยุดแบบ fail closed ด้วย `IN_FLIGHT_USAGE_UNKNOWN`
- budget ที่ consume แล้วยังเป็น 0 และ reservation `12,932` micro-USD ยังคงถูกถือไว้
- `inFlight=1` และไม่มี AI reply ที่ได้รับ authorization

สิ่งที่หลักฐานปัจจุบันยืนยันไม่ได้:

- provider ได้รับ request จริงหรือไม่
- provider ตอบ success, refusal, HTTP error หรือ timeout หรือไม่
- usage จริงเท่าใด
- settlement RPC เริ่มหรือเสร็จหรือไม่

ดังนั้น counter ที่ค้างไม่ใช่หลักฐานว่า provider ล้มเหลว และห้ามคืน reservation หรือตั้ง usage เป็นศูนย์

## Root cause

ก่อน remediation deadline ใช้ `AbortController.abort()` แล้วรอ promise ของ `fetch` ต่อ หาก implementation ของ fetch หรือ connection ไม่ settle หลัง abort การทำงานจะไม่กลับเข้า catch/finally และไม่มี settlement call ช่องว่างที่พิสูจน์ได้จึงอยู่ระหว่าง `dispatch authorized` กับ `response/error/timeout -> settle`

## การแก้

- ใช้ application-level `Promise.race` ที่ยังคง deadline เดิม 8 วินาทีและ abort transport แบบ best effort
- เมื่อ deadline ชนะ จะ settle เป็น `USAGE_UNKNOWN`, consume reservation แบบ conservative และ fail closed
- late response/rejection ถูก consume แต่ไม่ประมวลผลซ้ำ ไม่ settle ซ้ำ และไม่สามารถสร้าง AI reply
- safe metadata เพิ่มเฉพาะ closed settlement code; ไม่บันทึก prompt, customer text, secret หรือ identifier
- authenticated read-only diagnostics แสดงเฉพาะ aggregate attempt state/accounting ไม่มี session/event/attempt/tester reference
- Durable Object มี conservative reconciliation primitive ที่รับได้เฉพาะ session `STOPPED` ด้วย `IN_FLIGHT_USAGE_UNKNOWN`, stale `DISPATCHED` attempt เพียงหนึ่งรายการ และทำแบบ idempotent โดยย้าย reservation เต็มจำนวนไป consumed พร้อมคง session `STOPPED`

Primitive reconciliation ยังไม่มี HTTP route สำหรับ mutation จึงไม่สามารถถูกเรียกผ่าน Worker candidate นี้ได้ การนำไปใช้กับ attempt เดิมต้องมี authorization แยก, เพิ่ม authenticated TEST-only route ใน commit/deploy ที่ตรวจแล้ว และเรียกหนึ่งครั้งบน exact TEST Worker เท่านั้น

## Failure semantics

| เหตุการณ์                        | ผลบังคับ                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| application deadline             | `USAGE_UNKNOWN`, full reservation consumed, session stopped, no AI reply                                          |
| settlement unavailable           | safe diagnostic `SETTLEMENT_UNAVAILABLE`; Durable Object lease detection คง reservation/in-flight และหยุด session |
| late response หลัง deadline/stop | ignore; no second settlement และ no reply                                                                         |
| duplicate settlement/reconcile   | idempotent; ไม่คืน slot/เงินซ้ำ                                                                                   |
| stop ระหว่าง in-flight           | settlement อาจปิด accounting แต่ result authorization ต้องล้มเหลว                                                 |
| attempt เดิม                     | คง reservation `12,932` micro-USD และ `inFlight=1` จนมี recovery action ที่อนุมัติแยก                             |

## แผน deploy/retest หลัง authorization รอบถัดไป

1. ตรวจ candidate SHA, bundle hash, TEST target และ AI/pilot OFF
2. deploy exact candidate ไป TEST โดยยังไม่เปิด pilot
3. ตรวจ read-only diagnostics และยืนยัน attempt เดิมตรงกับ frozen evidence
4. หาก Owner อนุมัติ recovery action ให้เปิด authenticated route แบบแคบและ reconcile full reservation หนึ่งครั้ง; session ต้องยัง STOPPED, result authorization false และการเรียกซ้ำต้อง idempotent
5. เปิด session ใหม่เฉพาะ authorization ใหม่ แล้วทดสอบหนึ่ง LINE event; ตรวจ reserve -> dispatch -> settle/result authorize ครบก่อน event ถัดไป
6. จบด้วย AI OFF / pilot CLOSED และบันทึก remote evidence

## ข้อจำกัด

Historical provider logs ของ invocation เดิมไม่พร้อมให้ตรวจ จึงไม่สามารถระบุผล provider หรือ actual usage ได้ Candidate นี้แก้ lifecycle และเพิ่มหลักฐานสำหรับ attempt ใหม่ แต่ไม่เปลี่ยนข้อเท็จจริงของ attempt เดิม

Validation: Node unit 450, dedicated deterministic benchmark 14, Worker 66, unique total 530; failed/skipped/cancelled = 0 สอง `pnpm check` runs ผ่าน, benchmark 5,000 cases และ reports byte-identical, secret scan 202 filesผ่าน และ dependency auditไม่มี known vulnerabilities

- TEST deployment: false สำหรับ candidate นี้
- Production: `NO_GO — NOT TOUCHED`
- Issue #12: OPEN
