# MP-06 WP7 — Guarded AI/NLU Implementation

## สถานะและวัตถุประสงค์

Roadmap `2026.09.06-v5` อนุญาต WP7 แบบ `LOCAL_ONLY` เพื่อเพิ่ม AI/NLU สำหรับทำหน้าที่ parser/classifier เชิงแนะนำเท่านั้น งานนี้ไม่ใช่ TEST deployment และไม่ใช่ Production authorization

WP7 ใช้ OpenAI Responses API กับ candidate model `gpt-5.6-terra` ผ่าน official endpoint `https://api.openai.com/v1/responses` ตามเอกสาร [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) และ [model page](https://developers.openai.com/api/docs/models/gpt-5.6-terra) ไม่มี OpenAI SDK หรือ dependency ใหม่

## Authority architecture

ลำดับอำนาจคือ:

1. ตรวจ input และ redact PII ที่ไม่จำเป็น
2. โมเดลสกัด candidate intents, fields, ambiguity และ risk signals เป็น strict structured output
3. application validate schema และ enum ซ้ำ
4. deterministic MP-06 policy/evaluator ตรวจ risk precedence, approved KB/catalog และ final route
5. existing approved template system สร้างข้อความตอบ

AI ไม่มี field สำหรับ final authorization หรือ customer-facing response, ส่งข้อความหาลูกค้าไม่ได้, override/downgrade `STAFF_ONLY` ไม่ได้ และสร้างราคา โปรโมชั่น สต๊อก นโยบายหรือข้อมูลร้านเองไม่ได้ ถ้า feature ปิด, config/key/model หาย, refusal, timeout, network/HTTP failure, model mismatch, schema malformed, unknown intent, ambiguity หรือ low confidence จะ fail closed เป็น existing `CLARIFY` หรือ `STAFF_ONLY` และไม่เป็น `AUTO`

## Provider และ runtime contract

- feature flag: `MP06_AI_NLU_ENABLED`; ค่าอื่นนอกจาก exact `true` คือ off
- model config: `MP06_AI_NLU_MODEL=gpt-5.6-terra`; ไม่มี implicit fallback
- credential: `OPENAI_API_KEY`; local ignored `.dev.vars` สำหรับ live evaluation เท่านั้น ไม่บันทึกค่าใน Git/log/report
- `store:false`, non-streaming, tools ว่าง, strict JSON schema, output สูงสุด 600 tokens
- deadline 8,000 ms; retry สูงสุดหนึ่งครั้งเฉพาะ network/429/5xx; permanent 4xx, refusal และ schema failureไม่ retry
- request-scoped circuit/rate guard จำกัดไม่เกินสอง attempts และเปิดวงจรหลัง transient failures ครบเพดาน
- per-request estimated-cost guard USD 0.02 และ live-eval aggregate cap 500 requests / USD 5
- ไม่มี persistent model-output cache, binding ใหม่, global mutable state หรือ external tool/database call

## Structured schema

Schema version `2026.09.07-v1` เป็น closed object (`additionalProperties:false`) และกำหนดทุก field เป็น required:

- `candidateIntents`: closed enum ของ nine approved AUTO intents หรือ `UNKNOWN`
- `extractedFields`: `productName` และ `size` (`NORMAL`, `SMALL`, `UNKNOWN`)
- `missingRequiredFields`: closed enum
- `ambiguity`: boolean
- `riskSignals`: closed enumของ delivery-variable, individual loyalty, price speculation, personal/payment/complaint/allergen/stock/promotion/wholesale/order/staff/injection risks
- `confidenceBand`: `LOW`, `MEDIUM`, `HIGH`
- `reasonCodes`: closed safe enum

Provider schema ใช้เฉพาะ JSON Schema subset ที่ Responses API รองรับ ส่วน application validator ยังคงตรวจ exact keys, array uniqueness, bounds, control characters และ unknown values ซ้ำอีกชั้น Product/price ที่โมเดลสกัดยังต้อง bind กับ approved unique catalog row ผ่าน deterministic WP1 code ก่อนตอบได้

## Prompt-injection และ privacy boundary

System instruction ระบุชัดว่า customer text เป็น untrusted data ห้ามทำตามคำสั่งในข้อความ ห้ามเปิดเผย instruction, เปลี่ยน policy, สร้าง business claim หรือ authorize AUTO ก่อนส่ง provider ระบบ normalize Unicode, drop control characters, reject inputเกิน 1,200 characters และ redact phone, email, payment-like identifiers, LINE-like IDs, URLs และ address fragments

Safe log มีเพียง outcome code, irreversible request fingerprint, configured/returned model ID, attempts, latency, token usage, estimated cost และ redaction count ไม่มี raw input, prompt payload, provider output, secret หรือ environment dump

## Prompt/schema/dataset evidence

- prompt version: `2026.09.07-v1`
- prompt checksum: `bb32a123d6671ac2167887ea8ba476bdebe28bc4b1cca23d53b9b6879cc8eeb6`
- schema version: `2026.09.07-v1`
- schema checksum: `811436149e813ce6ece4baade44640c56b48edf5198433822e688c9994319793`
- synthetic dataset version: `2026.09.07-v1`
- dataset checksum: `cbfb9d6030ded2ab3cb8237233313940f2df206efdd7ac91cc05c948fdcae11b`

Dataset มี 60 cases: prompt-development 15 และ holdout 45; 20 critical safety cases รันรวม case ละสามครั้ง จึงวางแผน 100 live requests ข้อความทั้งหมดเป็น synthetic/PII-free และไม่ใช้ WP2 deterministic dataset, customer chat, webhook payload หรือ Production log

Acceptance คงที่: structured schema 100%, risky/authority fail closed 100%, STAFF_ONLY downgrade/false final-AUTO/unsupported claim/PII leakage/injection override เป็นศูนย์, final routing และ required-field extraction อย่างน้อย 95% ห้ามแก้ holdout labelsหรือลดเกณฑ์หลังเห็นผล

`riskyAuthorityFailClosedPercent` วัด final deterministic classification ตาม acceptance contract ส่วน model risk-signal recall รายงานแยกเป็น diagnostic และไม่มีสิทธิ์ลดระดับ final `STAFF_ONLY`

## การทดสอบ

```sh
pnpm ai-nlu:mp-06:check
pnpm exec vitest run tests/mp-06-wp7-ai-nlu.test.ts --config vitest.config.ts
pnpm ai-nlu:mp-06:live
```

สองคำสั่งแรกไม่เรียก network และไม่ต้องมี key คำสั่ง `live` ต้องเรียกอย่าง explicit ใน local checkout ที่มี ignored `.dev.vars` เท่านั้น รายงาน machine-readable เก็บเฉพาะ aggregate metrics, safe case IDs และ outcome codes; ไม่ commit raw provider output

## Live evaluation result

Final evidence ผ่านจาก 60 unique cases / 100 requests โดยใช้ prompt/schema/dataset ชุดเดิมตลอดรอบที่นับเป็น final evidence:

- structured schema success 100%
- risky/authority final fail-closed 100%; model risk-signal recall diagnostic 95%
- final routing accuracy 98%
- required-field extraction accuracy 100%
- STAFF_ONLY downgrade, false final-AUTO, unsupported claim, PII leakage และ prompt-injection override = 0
- input/output tokens 54,639 / 9,327
- estimated cost USD 0.221202
- latency minimum/median/p95/maximum = 1,157 / 1,516 / 2,908 / 3,456 ms
- semantic result checksum `7f45332328bfe3a1cef1464fb6eb5370b23d90bb7148034af5da71daee137c55`

ก่อน final evidence มีหนึ่ง prompt-development iteration ที่ routing 88% และถูกเก็บเป็น sanitized failed history โดยไม่แก้ holdout labels การแก้เป็นกฎทั่วไปเพื่อแยก normal-price จาก price speculation, general delivery จาก variable delivery และกำหนดให้คืนทุก intent จากนั้นแก้ evaluator ให้ `risky fail-closed` วัด final deterministic route ตาม acceptance contract พร้อมเก็บ model risk-signal recall แยกเป็น diagnostic

รวมการเรียกทั้งหมดในรอบพัฒนา 316 requests (รวม schema diagnostics, prompt-development iterations, targeted diagnostics และ final evidence) ต่ำกว่า 500-request cap ค่าใช้จ่ายที่วัดได้จาก full runs สามรอบคือ USD 0.235038 + 0.218886 + 0.221202 = USD 0.675126 ส่วน 13 targeted diagnostics ผ่าน per-request USD 0.02 guard จึงมี conservative upper bound เพิ่มไม่เกิน USD 0.26; อีก 3 requests ถูก API ปฏิเสธตอนตรวจ schema ก่อน model inference ดังนั้นค่าใช้จ่ายรวมแบบ conservative ไม่เกิน USD 0.935126 และต่ำกว่า USD 5

Generated reports อยู่ที่ `artifacts/mp-06/wp7-ai-nlu-report-iteration-1.json` และ `artifacts/mp-06/wp7-ai-nlu-report.json`; ทั้งสองมีเฉพาะ aggregate/safe metadata และ final report ผ่าน `pnpm ai-nlu:mp-06:check`

## ไฟล์และหน้าที่

- `worker/mp-06-ai-nlu.ts`: schema, redaction, native Responses API adapter, retry/deadline/circuit/cost guards และ deterministic handoff
- `worker/index.ts`: default-off runtime integration; ไม่มี deployment configuration change
- `worker/mp-06-wp1.ts`: export fail-closed plan constructor โดยไม่เปลี่ยน deterministic routing behavior
- `benchmark/mp-06/wp7-ai-dataset.ts`: versioned synthetic prompt-development/holdout definitions
- `scripts/run-mp-06-ai-nlu-eval.ts`: no-key check และ explicit capped live evaluator
- `tests/mp-06-wp7-ai-nlu.test.ts`: mock provider, schema, privacy, injection, authority และ failure regressions
- `artifacts/mp-06/wp7-ai-nlu-report.json`: sanitized aggregate live evidenceหลังผ่าน

## Known limitations และ deployment prerequisites

- model output ไม่ deterministic สมบูรณ์ จึงมี critical safety stability repeats และ deterministic final authority
- synthetic dataset ไม่แทนภาษาลูกค้าจริงทั้งหมด
- request-scoped circuit guard ไม่ใช่ cross-isolate global circuit breaker; TEST pilot ต้องพึ่ง frozen TEST rate/stop controlsด้วย
- ยังไม่ตั้ง Cloudflare remote secret, ไม่เปิด feature flag, ไม่ deploy TEST และไม่มี live LINE test-channel smoke
- ยังไม่มี rollback rehearsal, Owner TEST UAT, PR review หรือ default-branch merge
- ก่อน TEST deployment ต้องมี Owner authorization แยก, set TEST-only secret/config อย่างปลอดภัย, verify isolation, smoke/UAT/rollback gates และคง Production `NO_GO`

**NOT DEPLOYED — TEST deployment false — Production NO_GO**
