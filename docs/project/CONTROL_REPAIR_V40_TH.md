# v40 — แผนรับนโยบาย TEST ฉบับ 3 และขอบเขต local control repair

วันที่ 28 กันยายน 2026 — **OWNER_APPROVED / LOCAL_IMPLEMENTATION_ONLY / NOT_REMOTE_AUTHORITY**

- Owner decision: `MP-OD-2026-09-28-V40`; local version `2026.09.28-v40`
- คำอนุมัติ: “อนุมัติที่คุณร่างและปรับแก้ได้เลย เพื่อสามารถทำงานต่อได้” หลังทบทวนร่างนโยบายฉบับ 3 ทั้งสิบส่วน
- งานหลัก MP-06 / Issue #12 ยัง CURRENT; Roadmap Issue #9 ไม่เปลี่ยน DoD และไม่ปิด Issue
- เอกสารนี้ระบุขอบเขตการแก้ control ที่ Owner อนุมัติ ไม่ใช่ผล validation, publication หรือ tool disposition

## A. แยก baseline ที่เผยแพร่กับ baseline local

| บทบาท                                   | Exact reference                                                                                                 | การใช้                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Published MP-06 control                 | `35b67ab87ecd052ab80f450d766c9eabd2991861` / `2026.09.24-v37` / `codex/mp-06-guardrailed-ai`                    | ฐานที่เผยแพร่ซึ่งต้องเทียบก่อน future integration; ไม่ถูกแก้จากการสร้าง worktree นี้         |
| Selected inherited local policy/control | `07ce10f641ebaa74ceab83c98e8f5fdc40d6858b` / `2026.09.24-v39`                                                   | ฐาน local ที่มีฉบับ 2 และ v38/v39 qualification; ไม่อ้างว่า merge/push ไป MP-06 แล้ว         |
| Isolated v40 implementation             | `codex/test-policy-v40` ที่ `/Users/eak/Documents/ChatGPT/malispang-test-policy-v40` เริ่มจาก local v39 ข้างต้น | ใช้ทำ exact local transition และเปรียบเทียบ inherited bytes; ไม่สร้าง runtime candidate ใหม่ |

v40 เลือกใช้โครงสร้างนโยบายฉบับ 2, inherited-history verification และ local-only qualification จาก v39 เพื่อเพิ่ม approved revision 3 แต่ **ไม่รับช่วงสิทธิ์ local commit หรือ GitHub/Notion publication ของ v39** และไม่เปิด v38 runtime/remediation scope ขึ้นมาใหม่จากการมีไฟล์ใน ancestry งาน/สิทธิ์ v37 integration ที่ทำไปแล้วไม่เป็น grant ใหม่

การรวมไป published branch ในอนาคตต้องตรวจ diff/ancestry ของช่วง v37 → inherited local v39 → v40 จริง ระบุสิ่งที่นำเข้าและสิ่งที่ห้ามนำเข้าอย่างชัดเจน ไม่รวมทั้งประวัติหรือ runtime โดยเพียงกล่าวว่า supersedes v39; รอบนี้ยังไม่มี commit/push/PR/merge authority

## B. ความขัดแย้งที่อนุมัติให้ซ่อมแบบ local

1. Historical root status/flags และหลายหัวข้อ Current effective อาจอ่านเป็นสิทธิ์ deploy แม้ latest local overlay ห้าม: เพิ่ม effective authority entry point ที่ตรวจ latest validated overlay ก่อน ไม่ลบหรือเขียนทับ root history
2. Published v37 กับ approved local v39 เป็นคนละสถานะ: แสดง exact baseline, adoption stage และ source-of-authority ให้ตรวจได้ ไม่ประกาศว่า policy2 มีผลบน branch ที่ยังไม่มีมัน
3. นโยบายและ pure evaluator ต้องอธิบาย browser preparation, semantic identity, effect-aware retry และ legacy denials ตรงกัน: เพิ่ม local v40 schema/validator/authority integration/tests ตาม exact allowlist โดยคง pure retry evaluator และ frozen v38/v39 module logic/records เดิม ไม่เพิ่ม remote executor
4. คำสั่ง push checkpoint/อนุมัติทุกรอบ/หยุดเมื่อ error อาจถูกใช้กว้างเกิน action จริง: แยก publication authority และประเภท error/hold ไม่กล่าวว่าทั้งโครงการมีกฎ blanket stop และไม่ยกเลิก one-shot operation เดิม

ขอบเขต CONTROL_REPAIR_ONLY มีผลเฉพาะรอบ local adoption นี้ ตั้งแต่บันทึกคำอนุมัติจน qualification/handoff; ไม่ใช่สิทธิ์ซ่อม control ใดก็ได้ต่อเนื่อง Exact file allowlist ใน manifest/schema v40 เป็นแหล่งตัดสินไฟล์ที่แก้ได้ ไม่ขยายผ่านคำอธิบายเอกสารนี้

Effective local overlay ใช้ `localControlRepairV40` และอนุญาตเฉพาะ `LOCAL_IMPLEMENTATION`, `LOCAL_VALIDATION`, `LOCAL_ANALYSIS`; `COMMIT` และ publication ทุกชนิดเป็น false ไม่ใช้ inherited flags เป็น fallback

Exact v40 path set ที่อนุมัติให้แก้ มีเฉพาะ:

- `PROJECT_CONTROL.md`
- `config/project/roadmap.json`
- `config/project/current-work.json`
- `config/project/current-work.schema.json`
- `src/project-control-v40.ts`
- `src/project-control.ts`
- `src/project-control-cli.ts`
- `tests/project-control-v40.test.ts`
- `tests/project-control-v39.test.ts` เฉพาะ historical v39 fixture adapter โดยรักษา assertions เดิมทุกข้อ; ไม่เปลี่ยน expected behavior หรือลด legacy-denial/immutability assertions
- `docs/project/OWNER_DECISION_LOG.md`
- `docs/project/ROADMAP_CHANGELOG.md`
- `docs/project/EXECUTION_GATES.md`
- `docs/project/TEST_OPERATION_POLICY_TH.md`
- `docs/project/CONTROL_REPAIR_V40_TH.md`

ชุดงานนี้เป็น local authority/inspector/validator integration และ qualification เอกสาร/นโยบายเท่านั้น คง pure retry evaluator `src/test-operation-policy.ts` ไม่เปลี่ยน และคง frozen historical control modules `src/project-control-v38.ts`/`src/project-control-v39.ts` แยกต่างหาก ไม่อนุญาตแก้ runtime, credentials, approval settings, frozen helper/history หรือ data เพื่อให้ validation ผ่าน

## C. Change map ครบสิบส่วนที่ Owner อนุมัติ

ทุกแถวผูกกับ `MP-OD-2026-09-28-V40` และเปลี่ยนเฉพาะ local policy/control advice ไม่สร้าง remote authority

| ฉบับ 3                        | จุดเดิมที่อ้างอิงจากฉบับ 2/local v39 และ published v37 | สิ่งที่รับ/ปรับ                                                                                               | สิ่งที่ต้องคงและผลต่อ validator/grants/ข้อมูล                                                               |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1 สิทธิ์สี่ส่วน               | v39 §1; v37 exact-action scope                         | แสดง Owner, effective control, tool/service และ readiness แยกกัน                                              | ขาดเงื่อนไขใดต้องไม่ให้สิทธิ์ action; Full Access/ข้อความ caller ไม่เป็น authority                          |
| 2 TEST identity               | v39 §2/§5; v37 TEST_ONLY                               | ยืนยัน stable target identity ก่อน remote stage ในอนาคต                                                       | Production denied; unknown/mismatched target ไม่ใช้ชื่อ TEST แทน และรอบนี้ no remote                        |
| 3 ชุดงาน                      | v39 §1/§6/§8; v37 feature-transition boundary          | ทำ routine local work ใน exact scope ไม่ถามซ้ำ; ขอเฉพาะ delta                                                 | ไม่ขยาย runtime/bot model/MP-07; local scope ไม่ต้องมี remote freshness เพื่อเริ่มวิเคราะห์                 |
| 4 Browser preparation         | v39 §3/§5                                              | แยก no-request UI prep จาก navigation/selection/DOM/data discovery                                            | ไม่มี remote grant ตามหมวด; ไม่ enumerate ก่อนกรอง; legacy action ไม่เปลี่ยนชื่อหนี hold                    |
| 5 Retry                       | v39 §3–4                                               | สาม total technical attempts สำหรับ harmless incident; ตรวจประวัติทั้งหมดและแยก logical usage/effect receipts | unresolved denial/UNKNOWN/in-flight/partial effects มีผลค้าง; ไม่ reset quota หรือ one-shot journals        |
| 6 End-to-end read             | v39 §5                                                 | ประเมิน UI/auth/GET/RPC/DO initialization/alarms/query/audit/billing                                          | unknown business effect ไม่ผ่าน read-only; ไม่มี SQL/observation authority; ไม่แก้ pendingTemplate ให้ PASS |
| 7 Legacy MP-06                | v39 §4/§6/§9; inherited hold                           | แยกสาม denial และ Support disposition เป็น UNRESOLVED โดยไม่สมมติว่ามี review pending                         | ไม่ release, replay, create fresh denial หรือ substitute new read; grants/journals คงเดิม                   |
| 8 Effectful actions/operator  | v39 §7/§8; v37 exact merge plan                        | action-specific plan และ primary operator รวม potentially-mutating reads                                      | ไม่มี commit/push/merge/deploy/LINE/provider/recovery ในรอบนี้; dirty work/accounting ไม่เปลี่ยน            |
| 9 Evidence/continuation       | v39 §6–8; v37 publication restrictions                 | focused→required full gates; checkpoint/evidence ต่างจาก publication; blocker มี owner/next action            | UNKNOWN ไม่กลาย PASS, assertions/DoD/freshness คงเดิม; local PASS ไม่เป็น UAT                               |
| 10 Adoption/effective summary | v39 §9; v37 vs local v38/v39 distinction               | latest validated summary และ stage model + baseline map                                                       | summary/evaluator ไม่เป็น permission broker; old modules/manifests/historical evidence คงตาม baseline       |

MP-07 local package ที่ Owner อนุมัติไว้ **ไม่ถูกยกเลิก ไม่ถูกกล่าวว่าไม่เคยอนุมัติ และไม่ต้องขอ scope เดิมซ้ำ** แต่ต้องตรวจ control/baseline/allowed scope ของชุดงานนั้นเองก่อนทำต่อ v40 ไม่เพิ่มสิทธิ์ MP-07 หรือ remote และไม่เพิ่ม CURRENT หลักอีกตัว

## D. Stage และการอนุญาตที่ต้องไม่ปะปน

| Stage                               | สิ่งที่ยืนยันได้                                                                                  | สิ่งที่ยังยืนยันไม่ได้/ไม่มีสิทธิ์                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Owner-approved local implementation | Owner อนุมัติร่างฉบับ 3 ให้แก้ local policy/control ใน scope นี้แล้ว                              | ไม่ต้องขอ broad approval เดิมซ้ำ แต่ยังไม่ใช่ผล qualification     |
| Local integrated/validated          | บันทึกได้เมื่อ actual targeted/required validation และ independent review ผ่านบน exact local diff | ไม่ใช่ commit, hosted CI, published branch หรือ remote permission |
| Published integration               | ยังไม่อนุญาตในรอบนี้ ต้องมี exact publication/integration scope และหลักฐานก่อน                    | Local v40 ไม่แทน published v37 ด้วยการเปลี่ยนชื่อเอกสาร           |
| Remote execution eligible           | ยังไม่อนุญาต ต้องมี target/data/effects/control/tool/readiness ครบแยกในอนาคต                      | ไม่สามารถรับช่วงสิทธิ์ legacy denied operation จาก stage ใด       |
| UAT verified / Issue DoD            | ต้องมี actual TEST evidence ตามเกณฑ์จริง                                                          | Policy tests/local PASS ไม่อนุญาต U2 หรือ Issue closure           |

ไม่มีสิทธิ์ใหม่สำหรับ commit/push/PR/merge/GitHub/Notion publication, deploy/activation/remote Storage/SQL, LINE/provider call, credential/permission changes, Production, reset/rebase/force-push/delete หรือ Issue closure จากการอนุมัติ adoption นี้ สิทธิ์เก่าหรือคำกว้างกว่าท้าย policy2 ไม่เป็น fallback ของ v40

## E. Legacy barrier และข้อเท็จจริงที่ยังไม่เปลี่ยน

- สาม Data Studio denials ของ V1 วันที่ 13 กันยายน 2026: 06:58:25 UTC DOM/schema-object exposure; 07:01:13 UTC option metadata หลัง name-check failure; 10:40:30 UTC browser bootstrap ภายใต้ no-retry rule เดิม
- Support Case 15724958 ตามอีเมลที่ Owner ส่งมา: ไม่มีขั้นตอนเปิด review เก่าที่แนะนำได้ ไม่ได้มีผล allowed/hold-release และ new scoped read ไม่รับช่วงหรือแทน action เดิม ไม่สร้าง denial ใหม่ ไม่รัน SQL ไม่เปลี่ยน permissions และไม่แตะ Production จากเคสนี้
- คง original/consumed grants, counters, operation journals, accounting และ frozen candidate/artifact ทุกค่า ไม่เติม grant เพราะเปลี่ยน task/tool/URL/actor/transport หรือเพราะแก้ policy สำเร็จ
- คง Storage hold, pendingTemplate causality UNKNOWN, U1 GAP, A1–A3 UNRESOLVED และ historical billing UNKNOWN; Issue #12 OPEN และ Owner ยังไม่ส่ง U2 จากผล adoption นี้

## F. หลักฐานการนำไปใช้และเงื่อนไขหยุด

1. ตรวจ pre-repair baseline/control กับ actual checkout ก่อนแก้ เก็บผลจริงหรือข้อขัดแย้ง ไม่อ้างผ่านจากเอกสารฉบับนี้ Main coordinator เก็บ qualification evidence; เอกสารนี้ไม่ทำหน้าที่เป็น test receipt
2. ทำเฉพาะ exact allowlist ใน isolated checkout รักษาฉบับ 2 ทั้งไฟล์เดิมเป็น suffix ไม่แก้ frozen v38/v39 หรือ inherited manifests/journals/accounting เพื่อทำให้ validator ผ่าน
3. ทดสอบ positive local work และ negative Production/remote/historical-denial/UNKNOWN/in-flight/partial-effect/quota-reset cases รวม baseline immutability และ effective-summary precedence โดยไม่ติดต่อระบบจริง
4. ให้ independent review ตรวจ actual diff และผลที่กำหนดก่อนสรุป LOCAL_QUALIFIED; ไม่ข้าม validator หรือเขียน tests ให้ยอมรับสิทธิ์กว้างกว่า Owner อนุมัติ หากพบปัญหาเทคนิคใน scope ให้แก้/ทดสอบต่อ ไม่ขอ broad approval ซ้ำ
5. หากความขัดแย้งต้องแก้ไฟล์/behavior นอก allowlist หยุดเฉพาะส่วนนั้นและรายงาน exact delta ให้ Owner ไม่ใช้ conflict เป็นสิทธิ์ self-authorize และไม่หยุดงาน local อิสระที่ทำได้
6. Handoff ระบุ actual local qualification, files/diff, publication NOT_AUTHORIZED/NOT_PERFORMED, remote NOT_AUTHORIZED/NOT_PERFORMED และ next actionable step ไม่ประกาศ UAT พร้อมหรือสั่ง Owner ส่ง U2

ภาคผนวกนี้เป็น adoption map และข้อจำกัดของ implementation ไม่ใช่ executor, trusted runtime ledger หรือผลทบทวนจากแพลตฟอร์ม
