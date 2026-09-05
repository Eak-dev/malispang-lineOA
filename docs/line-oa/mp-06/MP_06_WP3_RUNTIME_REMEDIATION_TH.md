# MP-06 WP3 — Runtime Safety Remediation

สถานะเอกสาร: implementation เฉพาะ local ภายใต้ Roadmap `2026.09.05-v4`, current work `MP-06` (GitHub #12), phase `WP3_RUNTIME_REMEDIATION` และ action `RUNTIME_REMEDIATION_WP3` เท่านั้น ไม่มี TEST/Production deployment และ Production ยังคง `NO_GO`

## Issue / acceptance criteria / Definition of Done

- เป้าหมาย: แก้สามช่องว่างของ deterministic runtime ที่ WP2 benchmark ตรวจพบ โดยใช้ risk/protected-state overlay ที่ใช้ซ้ำได้และทำงานก่อน generic AUTO resolution
- Acceptance: dataset เดิม 5,000 cases และ checksum `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`; policy read-only checksum `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`; AUTO correctness >=98%; risky และ authority fail-closed 100%; unsupported claim และ PII/raw-chat leakage 0; failures ของทั้งสาม gap เป็น 0
- Definition of Done: targeted/WP1/WP2/full quality gates ผ่าน, diff อยู่ใน WP3 scope, commit/push เฉพาะ `codex/mp-06-guardrailed-ai`, ไม่แก้ policy/KB/catalog/control/oracle/harness และไม่ deploy

## Benchmark symptom และ root cause ก่อนแก้

ผลเดิม `WP2_BENCHMARK_FAILED` มี 5,000 cases และ result checksum `4ce92a2e78a4168b189a4912469c132b6710a049421614c3f905cae213fdc2e6`:

| Gap                          | Case IDs / scenario family                                             | Symptom                                    | Root cause                                                                                                                                   | Policy expectation                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A — delivery fee/area/rider  | `MP06-A-0594`–`MP06-A-0665`, `RISK_AND_POLICY_BYPASS_MATRIX`, 72 cases | expected `STAFF_ONLY` แต่ actual `AUTO`    | generic delivery/location matcher สร้าง approved static unit ก่อนมีตัวตรวจข้อมูลจัดส่งที่แปรผันหรือเฉพาะรายการ                               | ค่าส่ง พื้นที่/ระยะทาง rider เวลาถึง ความพร้อมรับงาน และใบเสนอราคาต้อง fail closed                         |
| B — individual loyalty state | `MP06-A-0910`–`MP06-A-0981`, `RISK_AND_POLICY_BYPASS_MATRIX`, 72 cases | expected `STAFF_ONLY` แต่ actual `AUTO`    | generic loyalty matcher ทับคำถามยอด/สิทธิ์/การเปลี่ยนแปลงแต้มรายบุคคล เพราะ primary single-intent classifier ไม่แยก protected personal state | ข้อมูลส่วนบุคคลเกี่ยวกับยอด ประวัติ เพิ่ม/หัก/แลก หรือสถานะสิทธิ์ต้อง fail closed; กติกาทั่วไปยัง AUTO ได้ |
| C — request to guess price   | `MP06-A-0020`, `REQUIRED_RISK_SENTINEL`, 1 case                        | expected `STAFF_ONLY` แต่ actual `CLARIFY` | PRICE resolver ใช้ T-C01 เมื่อหา approved row ไม่ได้ โดยยังไม่ตรวจคำสั่งให้เดา/คาดราคาที่ไม่มี authority                                     | explicit price speculation ต้อง fail closed; exact valid row ยัง AUTO และ ambiguity ปกติยัง T-C01          |

ผลรวมก่อนแก้: AUTO correctness 96.40% (3,856/4,000), false-AUTO 144, risky/fail-closed 85.34% (844/989), unsupported claims 144, leakage 0 และ authority fail-closed 100% (24/24)

## Affected decision path

เดิม `planMp06Wp1Text()` ตรวจ policy แล้วสร้าง AUTO match set ก่อนใช้ primary intent เพียงค่าเดียวเป็น STAFF_ONLY gate ทำให้ข้อความที่มีคำ AUTO ซ้อนกับ delivery/loyalty protected state หลุดไปสร้าง response unit ได้ ส่วนคำขอเดาราคาถูกส่งเข้า `resolvePriceRow()` และกลายเป็น T-C01

WP3 เพิ่ม protected-risk overlay หลังตรวจ policy integrity และก่อน AUTO matching, clarification หรือ catalog resolution หากพบ risk เพียงหนึ่งรายการ ระบบคืน `STAFF_ONLY` ทั้งข้อความทันทีโดยไม่มี response unit หรือ partial AUTO ส่วน handoff acknowledgement, duplicate/retry และ silence ยังคงถูกควบคุมโดย flow เดิม

## Remediation design และ safe/unsafe boundary

1. Delivery overlay แยกข้อมูลทั่วไปที่ approved เช่น “มี Delivery ไหม” ออกจากข้อมูลแปรผัน/เฉพาะรายการ เช่น ค่าส่ง พื้นที่/เขต/ระยะทาง rider เวลาถึง ความพร้อมส่ง และใบเสนอราคา
2. Loyalty overlay แยกกติกาทั่วไป เช่น “สะสมแต้มยังไง” ออกจากยอด/ประวัติ/สถานะ/สิทธิ์ หรือคำสั่งเพิ่ม หัก ใช้ แลก และตรวจแต้มรายบุคคล รวมรูปประโยคละประธาน
3. Price-speculation overlay ต้องมีทั้งบริบทราคาและคำสั่งให้เดา/คาด/กะราคา จึงไม่ block คำว่า “ประมาณ” แบบกว้าง และไม่เปลี่ยน unique Approved Catalog binding หรือ ambiguity policy เดิม
4. Overlay ใช้ normalized semantic markers และ static reason code เท่านั้น ไม่อ่าน case ID, benchmark checksum/expected result และไม่เก็บ raw input หรือ PII ใน fingerprint/audit/result
5. เมื่อข้อความมี risk ปน AUTO ตำแหน่งต้น กลาง หรือท้าย จะยกเลิกทั้งชุดก่อนสร้าง unit ตาม precedence `STAFF_ONLY > CLARIFY > AUTO_COMPOSITE > AUTO`

## Regression risks และ tests

- ระวัง over-block คำถาม Delivery และกติกาแต้มทั่วไป: เพิ่ม positive AUTO boundaries
- ระวัง under-block ภาษาพูด การละประธาน ไทย/อังกฤษ และหลาย intent: เพิ่ม holdout synthetic variations ที่ไม่คัดลอกจาก benchmark
- ระวัง guess-price block กว้างเกินไป: ทดสอบ exact valid price และ ambiguous price เดิมควบคู่ explicit speculation
- ตรวจ atomic cancellation/no partial AUTO, risk ที่ต้น/กลาง/ท้าย, duplicate/retry, acknowledgement ไม่เกินหนึ่งครั้ง และ fingerprint ไม่มี raw input/PII
- targeted tests ต้องเป็น sentinel ต่อ precedence: ข้อความ risk+AUTO ต้อง `STAFF_ONLY` และมี `responseUnits/messages` ว่าง หากย้าย risk gate ไว้หลัง unit planning tests จะล้มเหลว

## Benchmark before / after

| Metric                  |                    Before |         After remediation |
| ----------------------- | ------------------------: | ------------------------: |
| Dataset                 | 5,000 (3,000/1,000/1,000) | 5,000 (3,000/1,000/1,000) |
| AUTO correctness        |                    96.40% |                   100.00% |
| False-AUTO A/B          |                   72 / 72 |                     0 / 0 |
| Gap C misclassification |                         1 |                         0 |
| Risky/fail-closed       |                    85.34% |                   100.00% |
| Unsupported claims      |                       144 |                         0 |
| PII/raw-chat leakage    |                         0 |                         0 |
| Authority fail-closed   |                      100% |                      100% |

ผลหลังแก้สร้างจาก benchmark CLI โดย result checksum คือ `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6` และ confusion matrix ไม่มี off-diagonal: AUTO 140, AUTO_COMPOSITE 3,716, CLARIFY 3, STAFF_ONLY 1,141 ห้ามแก้ dataset, scenario/oracle, evaluator, safety checks หรือ threshold เพื่อทำให้ผลผ่าน

## Known limitations

- WP3 เป็น deterministic keyword/rule overlay ไม่ใช่ natural-language understanding และไม่เรียก AI provider/model/prompt
- ภาษาใหม่ที่อยู่นอก approved deterministic lexicon อาจยัง fail closed ผ่าน flow เดิม; งานนี้ไม่ขยาย policy หรือ taxonomy
- Benchmark เป็น synthetic, PII-free และ local-only จึงไม่ใช่หลักฐาน TEST live UAT หรือ Production readiness
- ไม่มีการเปลี่ยน LINE OA, Cloudflare, Webhook, Rich Menu, Reward Card, secrets หรือ Production `มะลิปัง`
