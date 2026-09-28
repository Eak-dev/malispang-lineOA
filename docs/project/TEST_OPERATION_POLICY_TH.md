# MaliPang TEST — นโยบายการทำงาน ฉบับ 3

สถานะ: **OWNER_APPROVED / LOCAL_IMPLEMENTATION_ONLY — ไม่ใช่ remote execution authority**

- วันที่/Owner decision: 28 กันยายน 2026 / `MP-OD-2026-09-28-V40`
- Local control version: `2026.09.28-v40`; MP-06 / GitHub Issue #12 ยังคง CURRENT และ Roadmap Issue #9 คงเดิม
- คำอนุมัติที่ใช้: “อนุมัติที่คุณร่างและปรับแก้ได้เลย เพื่อสามารถทำงานต่อได้” หลัง Owner ได้อ่านร่างฉบับ 3
- Published MP-06 baseline ที่ตรวจ: `35b67ab87ecd052ab80f450d766c9eabd2991861` / `2026.09.24-v37`
- Inherited local policy/control baseline: `07ce10f641ebaa74ceab83c98e8f5fdc40d6858b` / `2026.09.24-v39`; การมีประวัติ v38/v39 ใน checkout นี้ไม่ใช่หลักฐานว่าเผยแพร่หรือมีผลบน MP-06 branch แล้ว
- รอบนี้อนุญาตเฉพาะ local policy/control/schema/validator/tests/docs ตาม exact allowlist ของ v40 **ไม่ให้สิทธิ์ commit, push, PR, merge, external publication, deploy, activation, remote TEST/Storage, LINE/provider call, Production หรือปิด Issue** ไม่เปลี่ยน runtime, LINE bot model หรือ approval configuration
- การอนุมัติ local implementation มีแล้ว; ผล validation/independent review/published integration ต้องรายงานแยกตามหลักฐานจริง ไม่รับรองจากสถานะเอกสารนี้

Effective local overlay คือ `localControlRepairV40` การกระทำที่อนุญาตเฉพาะชุดงานนี้คือ `LOCAL_IMPLEMENTATION`, `LOCAL_VALIDATION` และ `LOCAL_ANALYSIS`; `COMMIT` และ publication ทุกชนิดเป็น false ในรอบนี้ ไม่ใช้ historical flags เป็น fallback

การเปลี่ยนแปลงรายข้อและเงื่อนไขนำไปใช้ดู [แผนรับนโยบายและซ่อม control v40](CONTROL_REPAIR_V40_TH.md) เนื้อหาฉบับ 2 ด้านท้ายเก็บ byte-for-byte เป็นประวัติ ไม่ใช่ทางเลือกให้หยิบสิทธิ์เก่าที่กว้างกว่า

## 1. แยกสิทธิ์และความพร้อมสี่เรื่อง

ก่อนทำ action ให้ตรวจแยก Owner authorization, effective Project Control, สิทธิ์เครื่องมือ/บัญชีบริการ และหลักฐานความพร้อมทางเทคนิค ต้องครบเงื่อนไขที่เกี่ยวข้อง Full Access, local tests PASS, อีเมล Support และนโยบายโครงการใช้แทนเงื่อนไขที่ขาดไม่ได้

AI เสนอและอธิบายกฎได้ แต่ห้ามเขียนข้อเสนอของตนเป็นคำอนุมัติของ Owner การเปลี่ยนขอบเขตต้องแสดงกฎเดิม กฎใหม่ สิ่งที่ยังคงเดิม ความเสี่ยง และวิธีรับมือผลล้มเหลว ไม่ลด acceptance criteria หรือใช้ความกำกวมของเอกสารสร้างสิทธิ์ให้ตนเอง

## 2. ยืนยัน TEST ด้วยตัวตนระบบ ไม่ใช่ชื่อแสดงผล

ขอบเขตคือ LINE OA “มะลิปัง TEST” และทรัพยากร TEST ในชุดงานที่อนุมัติ “มะลิปัง” Production อยู่นอกขอบเขตทั้งหมด ไม่เปิดข้อมูล ส่งข้อความ เปลี่ยนค่า หรือ deploy

Remote action ในอนาคตต้องมีสิทธิ์แยกและ target manifest ที่ตรวจ account, channel/Worker, environment, namespace/object ตามความจำเป็น พร้อม source/deployed version, approved testers/ข้อมูล, งบ, วิธีหยุดและกู้คืน หาก target ไม่ชัด ให้หยุด action นั้น ไม่เดาหรือสำรวจทรัพยากรอื่นเพื่อหาตัวคล้ายกัน งาน local ในรอบนี้ไม่ต้องเข้าถึง remote เพื่อพิสูจน์ target

## 3. อนุมัติเป็นชุดงาน และทำงานประจำต่อในขอบเขต

ชุดงานระบุเป้าหมาย exact paths/ระบบ/ข้อมูลที่แตะได้ ผลข้างเคียงที่ยอมรับ งบ/ระยะเวลา เกณฑ์ผ่าน ข้อห้ามและผู้รับช่วง งานย่อยที่อยู่ในขอบเขตและผ่านสิทธิ์เครื่องมือไม่ต้องขอ Owner อนุมัติซ้ำทุกคลิก การอ่านไฟล์ วิเคราะห์ และ local tests ด้วยข้อมูลจำลองที่ไม่ติดต่อระบบจริงไม่ใช้ remote retry quota

ต้องขอการตัดสินใจเพิ่มเมื่อ target, ชนิดข้อมูล, งบ, business behavior, credentials/roles หรือสิทธิ์สำคัญ เช่น destructive action, commit/publication, merge/deploy เปลี่ยนจากชุดงานที่มีผล การอนุมัติรุ่นโมเดล Codex ไม่เปลี่ยนโมเดล LINE bot อัตโนมัติ คำว่า read-only ไม่ให้สิทธิ์ remote ตามชื่อหมวดโดยปริยาย

MP-07 local package ที่ได้รับอนุมัติไว้ไม่ถูกยกเลิกหรือถือว่ายังไม่เคยอนุมัติจากนโยบายนี้ ให้ตรวจ baseline/control/Owner decision และขอบเขตเดิมของ checkout นั้นก่อนดำเนินต่อ ไม่ขออนุมัติ scope เดิมซ้ำ ไม่เริ่มหรือขยาย MP-07 ใน checkout v40 และไม่เพิ่ม CURRENT item เพราะ MP-06 ติดขัด

## 4. แยกการเตรียมหน้าจอจาก target/data access

การจัดหน้าต่างหรือเลือกเครื่องมือโดยไม่ส่งคำขอไป target และไม่อ่านข้อมูลนอกขอบเขต ไม่ใช่ SQL/deployment operation แต่ navigation, reload, search, selector, DOM snapshot หรือเปิด editor อาจส่งคำขอหรืออ่านข้อมูล ต้องจัดประเภทจากพฤติกรรมและผลจริง ไม่ใช้ “ยังไม่กด Run” เป็นหลักฐานว่าปลอดผลข้างเคียง

กำหนด target, selectors/fields และขอบเขตผลลัพธ์ก่อนอ่าน ไม่อ่าน DOM/tab list/object tree ทั้งหมดแล้วค่อยกรอง หากจำเป็นต้องค้นหาภายใน TEST เพื่อยืนยัน target ต้องมี discovery scope ที่กำหนดข้อมูลและจำนวนผลลัพธ์แยก ไม่ใช้ discovery เป็นชื่อใหม่ของ action ที่ถูกปฏิเสธ นโยบายนี้ไม่อนุญาต remote discovery

## 5. ตัดสิน retry จากผลและประวัติ ก่อนนับครั้ง

| ผลก่อนหน้า                           | การปฏิบัติภายในสิทธิ์ที่มีผล                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| SUCCEEDED                            | ไปขั้นถัดไป ไม่ replay เพื่อสร้างผลเดิมอีกครั้ง                                              |
| NOT_STARTED และมีหลักฐานว่าไม่เกิดผล | แก้สาเหตุแล้วลองได้เฉพาะสิทธิ์และเพดานที่อนุมัติ และเมื่อไม่มี unresolved history ที่ห้ามไว้ |
| FAILED_WITH_KNOWN_EFFECTS            | ตรวจและจัดการผลบางส่วนก่อน; error ไม่ยืนยันว่าไม่มีผล                                        |
| UNKNOWN                              | ห้ามส่งซ้ำ; reconcile เฉพาะวิธีที่มีสิทธิ์อยู่จริง ไม่แทน UNKNOWN ด้วยศูนย์/PASS             |
| IN_FLIGHT                            | ห้ามส่งซ้อน; รอหรือตรวจสถานะผ่านกลไกที่อนุญาต                                                |
| SAFETY_DENIED                        | หยุด action นั้น ไม่ใช้โควตา technical retry และไม่เปลี่ยนวิธีหรือผู้ช่วยเพื่อหลบ            |

Technical failure ของ browser preparation/selection ความเสี่ยงต่ำที่พิสูจน์ว่าปลอดผลข้างเคียงคงเพดาน **รวมครั้งแรกไม่เกิน 3 ครั้งต่อเหตุขัดข้อง** เป็นเพดานบริหารงานของโครงการ ไม่ใช่ข้อจำกัดสากลและไม่แทน one-shot SQL/deploy/activation/LINE หรือ grant เดิม Timeout หลังเริ่มทำงานไม่พิสูจน์ว่า NOT_STARTED; แยก timeout ของการพิจารณาสิทธิ์ตามผลเครื่องมือจริง ไม่เดาว่าเป็น approval หรือ denial

Semantic action identity ผูกวัตถุประสงค์ target ข้อมูล/ผลที่ตั้งใจให้เกิด และประวัติ/สิทธิ์ ไม่ผูกชื่อ task/tool/URL/process/ผู้ช่วย/incident name การเปลี่ยนชื่อไม่เติม grant หรือเริ่ม counter ใหม่ ต้องตรวจประวัติทั้งหมด: unresolved denial, UNKNOWN, IN_FLIGHT และผลบางส่วนที่ยังไม่จัดการยังมีผล แม้ครั้งล่าสุดรายงาน NOT_STARTED หรือ SUCCEEDED

แยก technical-attempt count, logical-operation/grant usage และ effect receipts ไม่ใช้ข้อความที่ caller อ้างเองเป็น trusted history เมื่อครบเพดานหยุด retry อัตโนมัติและทำงานอิสระที่อนุญาตต่อได้ การเปิดรอบใหม่ต้องมีหลักฐานเหตุหรือเงื่อนไขเปลี่ยนจริงพร้อมสิทธิ์ครบ ไม่จำเป็นต้องพิสูจน์ root cause ทุกชั้นก่อนแก้ technical failure ที่ปลอดภัย แต่ต้องไม่กลบ side effects, เพิ่ม timeout/retry เพื่อให้ผ่าน หรือปลด denial ผ่านการแก้ต้นเหตุ

## 6. การอ่านข้อมูลต้องประเมินผลทั้งเส้นทาง

พิจารณา UI auto-load/refresh, authentication, route/GET/RPC, deployed source, DO wakeup/constructor/initialization/migration, การตั้งหรือกระตุ้น alarm/งานเบื้องหลัง, SQL และผล audit/billing ร่วมกัน HTTP GET หรือ SQL SELECT ไม่พิสูจน์ว่า request ทั้งหมดไม่เปลี่ยน business state หากยังไม่ทราบให้จัด potentially state-changing และไม่ execute จากสิทธิ์อ่าน

จำกัด Object/ข้อมูล/query/fields จำนวนแถว/ขนาดผล/ครั้ง/ค่าใช้จ่ายและหลักฐานก่อนอ่าน ไม่ enumerate หรืออ่าน secret/raw customer chat/ข้อมูลลูกค้าอื่นเพื่อความสะดวก แยก expected audit metadata/ค่าบริการจากการเปลี่ยนออเดอร์ แต้ม เงิน หรือ conversation state ไม่ตั้งเงื่อนไขที่เป็นไปไม่ได้ว่าห้ามมี audit metadata ทุกชนิด

ตรวจผลคำสั่งทีละรายการ ไม่ใช้ run-all กลบ partial/unknown outcome ไม่ reset หรือแก้ pendingTemplate เพื่อผลิต PASS การวิเคราะห์แผนอ่านทำได้ใน local scope แต่รอบ v40 นี้ **ไม่มี remote query หรือ observation authority ใด** และไม่เปลี่ยน freshness gate เดิม

## 7. Legacy MP-06 denials แยกเป็นข้อจำกัดที่ยังไม่ยุติ

คงสามเหตุการณ์ Data Studio วันที่ 13 กันยายน 2026 โดยไม่เปลี่ยนคำอธิบายหรือเวลา:

| เวลา UTC | Action ที่ถูกปฏิเสธ                                |
| -------- | -------------------------------------------------- |
| 06:58:25 | DOM snapshot ที่อาจเปิด schema/object tree         |
| 07:01:13 | อ่าน option metadata หลัง exact-name check ไม่ผ่าน |
| 10:40:30 | browser bootstrap ซ้ำภายใต้ข้อห้ามลองซ้ำเดิม       |

สถานะยัง **UNRESOLVED** อีเมล Support Case 15724958 ที่ Owner นำมาระบุว่าไม่มีวิธีเปิดรายการ review เก่าที่แนะนำได้ นี่ไม่ใช่ ALLOWED, การยกเลิกข้อห้าม, successor remote grant หรือหลักฐานว่ากำลังรอคำอนุมัติแน่นอน ไม่สร้าง denial ใหม่ ไม่รัน SQL ไม่เปลี่ยน permissions และไม่แตะ Production จากเคสนี้

Owner approval ของนโยบาย, Full Access, empty denial picker, ชื่อ task/tool ใหม่ หรือการเรียก “new scoped read-only observation” ไม่ปลดข้อจำกัดและไม่รับช่วง/แทนสิทธิ์ action เดิม ทางเลือกที่ปลอดภัยขึ้นเสนอเป็นแผนให้ประเมินได้ แต่ไม่ execute จากนโยบายนี้ ต้องพิสูจน์ความแตกต่างที่เกี่ยวข้องกับเหตุปฏิเสธจริง ไม่ใช่ทางอ้อมไปยัง action เดิม และมีสิทธิ์เครื่องมือ/authority ครบจริงก่อน

หยุดเฉพาะ action และงานที่พึ่งมัน ไม่ขยายเป็นการห้าม browser ทุกครั้งตลอดโปรเจกต์ งาน local/ข้อมูลจำลองอิสระที่มีสิทธิ์อยู่แล้วทำต่อได้ Storage hold, pending-template causality, U1 GAP, A1–A3 UNRESOLVED และ billing UNKNOWN คงเดิม ไม่ส่ง U2 จากผลนโยบายนี้

## 8. งานที่มีผลจริงและผู้ปฏิบัติใช้แผนเฉพาะ

LINE/provider request ที่มีค่าใช้จ่าย, data/config mutation, deploy/activation, merge และ recovery ต้องมี action-specific plan ระบุ source/target, operation identity, budget, expected effects, receipts และ STOP/rollback ที่อนุมัติแล้ว ผล timeout/คลุมเครือไม่ยืนยันว่าไม่ได้ใช้สิทธิ์ ห้ามเติม grants หรือ reset accounting/claims/journals/clarification budget/Owner/session เพื่อให้ผ่าน

มีผู้ปฏิบัติหลักคนเดียวต่อ checkout/shared remote target รวม potentially state-changing reads และงาน UNKNOWN/IN_FLIGHT; handoff ต้องระบุ holder, target, ผลที่ยังไม่ทราบและขั้นถัดไปก่อนเปลี่ยนผู้ปฏิบัติ งาน local ที่แยกผลและแบ่ง exact paths ชัดทำขนานได้ ไม่ให้สิทธิ์ผู้ช่วยมากกว่าชุดงานหลัก

## 9. หลักฐานพอดีกับความเสี่ยงและรายงานทางเดินต่อ

ใช้ focused tests ระหว่างพัฒนาและ required full gates เมื่อ candidate พร้อม ใช้ evidence เดิมเฉพาะ source/config/environment และ freshness ตรง ไม่รันซ้ำเพียงเพื่อให้เขียว ไม่ลด assertions/UAT/DoD หรืออ้างประหยัด token/เงินที่ไม่ได้วัด จัด local/CI ก่อน remote evidence ที่หมดอายุเร็ว ไม่เปลี่ยน freshness หรือให้ query ใหม่เพียงเพื่อแก้วงจรเอกสาร

รักษา dirty work และ local checkpoints ที่ตรวจย้อนหลังได้ แยกสิทธิ์แก้ไฟล์, commit, push, GitHub/Notion publication ไม่บังคับ push หลังถูกปฏิเสธหรือเสี่ยงเปิดข้อมูล v40 รอบนี้ไม่มีสิทธิ์ commit/publication; บันทึก local evidence ได้ใน exact paths ที่อนุมัติ ไม่ทำให้ประวัติหรือข้อมูลธุรกิจสูญหายเพื่อให้ tree สะอาด

ทุกจุดหยุดรายงาน: ทำสำเร็จอะไร → action ที่ติด → หลักฐาน/ประเภทปัญหา → ใครจัดการ → เงื่อนไขกลับมาทำ → งานอิสระที่เดินต่อได้ → Owner ต้องทำอะไรตอนนี้ ปัญหาเทคนิคใน scope ให้ Developer แก้ต่อ; ขอ Owner เฉพาะ scope/risk ที่เปลี่ยน; tool denial ใช้ทางที่รองรับจริง ไม่อ้างว่ามี review request pending โดยไม่มีหลักฐาน

Local PASS, CI PASS, deployment, UAT และ Issue DoD เป็นคนละสถานะ หลัง TEST session ที่ได้รับสิทธิ์ในอนาคตต้องตรวจ AI/pilot, in-flight, accounting, STOP/cleanup และ handoff ตาม control เดิม ไม่ประกาศพร้อม user-test จาก policy tests

## 10. Effective control จุดเดียวและการรับนโยบายอย่างมีขอบเขต

แยก Draft → Owner-approved implementation → Local control integrated/validated → Published integration → Remote execution eligible → UAT verified ไม่ใช้สถานะหนึ่งแทนอีกสถานะ การผ่าน local validation ไม่ทำให้ v40 เผยแพร่หรือใช้แทน v37 บน MP-06 branch และไม่ให้ remote execution

ใช้ change map ใน CONTROL_REPAIR_V40_TH.md เทียบ published v37 กับ selected inherited local v39 ไม่อ้างเพียง supersedes v39 เพื่อรวมงานอื่นโดยนัย Effective authority summary ต้องอ้าง control ที่ผ่าน validation รวม hold/ข้อยกเว้นและ exact paths ไม่ใช้ root flag เก่าหรือ historical heading เป็นสิทธิ์ปัจจุบัน; summary ไม่ใช่ permission broker

แยก runtime candidate, control baseline, evidence HEAD และ deployed version พร้อมเวลา observation ไม่เรียกทุกค่าเป็น HEAD ล่าสุด เก็บ frozen v38/v39 modules/records และ grants/journals/accounting ตาม baseline ไม่เขียนทับประวัติ

CONTROL_REPAIR_ONLY รอบนี้จำกัด local v40 policy/control/schema/validator/tests/docs ตาม approved allowlist จนมีผล qualification หรือรายงานข้อขัดแย้ง ไม่อนุญาต runtime/helper ใหม่, approval configuration หรือการข้าม validator ขณะรวมสิทธิ์ หากพบความขัดแย้งเพิ่มเติมให้หยุดเฉพาะ scope ใหม่ที่เกี่ยวข้องและบอก delta ที่ต้องตัดสินใจ ไม่ขออนุมัติ local scope เดิมซ้ำ

Pure retry evaluator เดิมคง logic ไม่แก้ frozen v38/v39 module; v40 เพิ่ม local authority/qualification integration เท่านั้น Evaluator เป็น local decision aid ไม่ execute browser/Storage ไม่รับรองข้อมูล caller ไม่เป็น persistent incident ledger และไม่สร้างสิทธิ์เครื่องมือ การนำไปผูก executor/remote stage ในอนาคตต้องมีงานและ authority แยก พร้อม trusted history/effects/target validation

---

## Historical policy revision 2 — exact retained suffix, not current v40 authority

เนื้อหาต่อจากบรรทัดนี้คงฉบับ 2 เดิมทุก byte เพื่อการตรวจย้อนหลังเท่านั้น โดยเฉพาะสิทธิ์ local commit/GitHub/Notion ใน v39 ไม่ได้รับช่วงมาใน v40 รอบนี้

# MaliPang TEST — กติกาการปฏิบัติงานและการลองซ้ำ ฉบับ 2

สถานะ: OWNER_APPROVED / LOCAL_IMPLEMENTATION_ONLY

- Owner decision: MP-OD-2026-09-24-V39, 24 กันยายน 2026
- Roadmap: 2026.09.24-v39; supersedes 2026.09.24-v38 เฉพาะขอบเขตนโยบาย/control นี้
- Work: MP-06 / GitHub Issue #12; Roadmap Issue #9
- Baseline: `7c9e08ade55494892af4ae2fd6708134f78329d5`
- คำอนุมัติ: “คุณแก้ไขตามที่คุณร่าง ร่างนโยบายและแก้ไขได้เลย อนุมัติ” หลังร่างฉบับทบทวน 2 ทั้งเก้าข้อ
- อนุมัตินโยบายไม่ใช่การปลด Storage hold ไม่ใช่ remote execution grant และไม่ใช่ผล UAT

## 1. ขอบเขตและอำนาจ

ใช้กับงานมะลิปัง TEST ภายใน work package ที่ได้รับอนุมัติและบันทึกใน Project Control แล้วเท่านั้น ลำดับหลักฐานตาม Project Control ยังคงเดิม เอกสารนี้ไม่แทนสิทธิ์ของเครื่องมือหรือระบบความปลอดภัย

v39 อนุญาตเฉพาะ local policy/control/schema/validator/tests และเอกสารที่ระบุใน exact path allowlist รวม local commit และการบันทึกสถานะใน GitHub/Notion ไม่ให้สิทธิ์ push, PR, merge, deploy, activation, LINE/provider call, remote Storage, Production, reset, rebase, force-push, ลบข้อมูล, ปิด Issue หรือเริ่ม MP-07 ไม่เปลี่ยน runtime หรือโมเดล LINE bot

การอนุมัติของ Owner, สิทธิ์บัญชีบริการ, สิทธิ์เครื่องมือ และความพร้อมทางเทคนิค เป็นคนละเงื่อนไข ต้องผ่านเงื่อนไขที่เกี่ยวข้องครบ ไม่ใช้การอนุมัติข้อหนึ่งแทนอีกข้อหนึ่ง

## 2. Preflight ระดับชุดงาน

ก่อน remote operation ที่ได้รับสิทธิ์แยกในอนาคต ต้องยืนยัน environment/target ด้วยรหัสระบบที่ตรวจได้ ไม่อาศัยชื่อแสดงผลเพียงอย่างเดียว พร้อม branch/commit หรือ deployed version, ขอบเขต credentials โดยไม่เปิดเผยค่า, ผู้ทดสอบ/ข้อมูล, งบประมาณ, วิธีหยุดและกู้คืนตามความเสี่ยง

ใช้หลักฐานชุดเดียวกันต่อได้เฉพาะเมื่อยังผูกกับ target/version/scope ปัจจุบันและไม่เกิน freshness gate ที่มีอยู่ ตรวจใหม่เมื่อข้อมูลสำคัญเปลี่ยนหรือหมดความน่าเชื่อถือ ไม่สร้างอายุหลักฐานใหม่แทนข้อกำหนดเดิม และไม่ให้ Owner อนุมัติทุกคลิก

## 3. งานใหม่กับ retry

| ประเภท                                                                      | การปฏิบัติ                                                                                                              |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| อ่านไฟล์ วิเคราะห์ และ local tests ที่แยกจากระบบจริง                        | ทำต่อใน scope เดิมได้ รัน validation ใหม่หลังแก้จริงได้ ไม่ใช้ browser retry quota                                      |
| เปิดหรือเลือกหน้าเพื่ออ่านขั้นถัดไป                                         | เป็นงานใหม่เมื่อวัตถุประสงค์และขั้นตอนต่างจริง ไม่ใช่การส่งการกระทำเดิมซ้ำ; ต้องตรวจว่าไม่ได้กระตุ้นงานที่มีผลข้างเคียง |
| Browser preparation/selection ที่ล้มเหลวชั่วคราวและยืนยันว่าปลอดผลข้างเคียง | รวมครั้งแรกไม่เกิน 3 ครั้งต่อเหตุขัดข้องหนึ่งเหตุการณ์; ไม่ใช่โควตาตลอดโปรเจกต์                                         |
| Storage ระยะไกล                                                             | ใช้แผน target/query/result bound ที่ทบทวนแล้ว ไม่กดซ้ำโดยไม่รู้ผล และต้องมีสิทธิ์ remote แยก                            |
| LINE, AI มีค่าใช้จ่าย, config หรือข้อมูล                                    | ใช้แผนเฉพาะ ตรวจผล/การทำซ้ำ และรักษา original operation/grant/งบประมาณ                                                  |

หนึ่งเหตุขัดข้องผูกกับการกระทำเชิงความหมาย เป้าหมาย และงานที่ตั้งใจให้เกิด ไม่ผูกกับชื่อ task/tool/process/session ที่เปลี่ยนได้ การเปลี่ยน URL หรือผู้ช่วยเพื่อทำการกระทำเดิมไม่นับเป็นงานใหม่

ค่า 3 เป็นเพดานของโครงการ ไม่ใช่ข้อจำกัดสากลของ browser และไม่แทนข้อจำกัด one-shot เฉพาะ operation/grant ที่ยังมีผล การ reload อาจส่ง request อัตโนมัติ จึงไม่ถือว่าปลอดผลข้างเคียงโดยปริยาย

## 4. ตัดสินใจจากผลครั้งก่อน

- NOT_STARTED: มีหลักฐานว่ายังไม่เริ่มทำงาน แก้สาเหตุและลองได้ในสิทธิ์/เพดาน
- SUCCEEDED: เดินขั้นถัดไป ไม่ replay งานเดิม
- FAILED_WITH_KNOWN_EFFECTS: ตรวจและจัดการผลบางส่วนก่อน retry; การเห็น error ไม่ยืนยันว่าไม่มีผลข้างเคียง
- UNKNOWN: ไม่ทราบว่าทำงานหรือเกิดผลแล้วหรือไม่ หยุดคำสั่งซ้ำและ reconcile ด้วยวิธีที่ได้รับอนุญาต
- IN_FLIGHT: ยังไม่จบ ห้ามส่งซ้อน; รอ/ตรวจสถานะผ่านกลไกที่อนุญาต
- SAFETY_DENIED: หยุด action นั้น แม้ยังเหลือจำนวนครั้ง ไม่เปลี่ยนช่องทาง/ผู้ช่วย/identity เพื่อหลบคำปฏิเสธ

Timeout ระหว่าง execution ไม่ใช่หลักฐานว่าไม่ได้ส่งคำสั่ง ส่วน timeout ของการพิจารณาสิทธิ์ต้องพิจารณาจากผลเครื่องมือจริง ไม่ปะปนกับ safety denial

ปัญหาหน้าเว็บชั่วคราวที่เสี่ยงต่ำไม่จำเป็นต้องพิสูจน์ root cause ครบก่อน retry แต่ต้องมีเหตุผลและหลักฐานว่าปลอดภัย เมื่อครบเพดานให้หยุด retry อัตโนมัติ ทำ read-only diagnosis หรืองานอิสระต่อ การเปิดรอบใหม่ต้องมีหลักฐานการแก้ต้นเหตุหรือเงื่อนไขที่เปลี่ยนจริงและสิทธิ์ยังครบ ไม่ reset counter ด้วยชื่อ incident ใหม่ และไม่ลบประวัติรอบก่อน

คำปฏิเสธเดิมต้องมี supported disposition ที่ตรง action/context หรือทางเลือกที่ปลอดภัยขึ้นจริง ไม่ใช่เพียงเปลี่ยน transport การเปลี่ยนนโยบายโครงการไม่สร้าง disposition ดังกล่าว

## 5. Storage และผลข้างเคียง

ก่อนจัดเป็นการอ่านที่ไม่เปลี่ยนข้อมูลธุรกิจ ต้องพิจารณา route, authentication, constructor/initialization ของรุ่นที่ deploy และ SQL ร่วมกัน `SELECT` เพียงอย่างเดียวไม่พิสูจน์ความปลอดภัยทั้ง request

- จำกัด Object/ข้อมูล/query และจำนวนผลลัพธ์ตามความจำเป็น ไม่ enumerate ข้อมูลนอก scope
- แยกคำสั่งที่ต้องพิสูจน์ผลแต่ละรายการ ไม่ใช้ run-all เพื่อกลบ partial/unknown outcome
- แยก audit log/ค่าใช้บริการที่คาดหมายออกจากการเปลี่ยนออเดอร์ แต้ม การเงิน หรือ conversation state
- ถ้าผลต่อข้อมูลธุรกิจยังไม่ทราบ ให้จัดเป็น potentially state-changing และทบทวนก่อน ไม่สร้างข้อกำหนดว่าระบบต้องไม่มี audit metadata ใด ๆ
- ห้ามแก้ `pendingTemplate` หรือข้อมูลเพื่อผลิตผล PASS ต้องพิสูจน์เหตุและแก้ตาม acceptance contract
- ไม่มีการอนุญาต Storage query ใน v39; historical held operation และจำนวนครั้ง/grants เดิมไม่ถูกเติมหรือเริ่มใหม่

เหตุผลเชิงเทคนิค: [Data Studio](https://developers.cloudflare.com/durable-objects/observability/data-studio/) ส่งคำขอไปยัง deployed object และมีค่าใช้งาน; [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/) อธิบายการเรียก constructor เมื่อเริ่ม/ปลุก instance จึงต้องประเมิน initialization side effects ตามโค้ดจริง

## 6. Blocker ที่ระบุเจ้าของและทางออก

รายงานด้วยรูปแบบ: action ที่ติด → หลักฐาน/เหตุผล → ผู้จัดการต่อ → เงื่อนไขกลับมาทำต่อ → งานที่ยังทำได้ ไม่เขียนเพียง “รออนุมัติ”

- เทคนิคใน scope: Developer วิเคราะห์/แก้/ทดสอบต่อ
- scope, งบ, merge/deploy: Owner ตัดสินใจเฉพาะสิ่งที่เพิ่มหรือเปลี่ยน
- service access/credentials: ผู้ดูแลบัญชีดำเนินการผ่านช่องทางปลอดภัย ไม่ส่ง secret ในแชต
- tool safety denial: ใช้ช่องทางที่ระบบรองรับ; ไม่สมมติว่ามีผู้รับเรื่อง/คำร้อง pending หรือผลอนุมัติแล้ว

หยุดเฉพาะ action และงานที่ขึ้นต่อมัน งานอิสระที่ได้รับอนุญาตยังเดินต่อได้ แต่ห้ามใช้เป็นทางอ้อมของ action ที่ถูกปฏิเสธ ขอบเขต hold ต้องอิงเหตุการณ์และคำปฏิเสธจริง ไม่ขยายเป็นการห้าม browser ทุกครั้งตลอดโปรเจกต์

## 7. ข้อมูล ผู้ปฏิบัติ และหลักฐาน

รักษา dirty work, historical records, journals, grants และ accounting ไม่ทับ/ล้าง/แทนที่ ใช้ approved testers และ synthetic data ตาม control ไม่เปิดเผย secret/PII ใน chat/log/GitHub/Notion การล้างข้อมูลและ Storage recovery ต้องมีแผนและอนุมัติเฉพาะ ไม่ใช่ cleanup ทั่วไป

การกระทำที่เปลี่ยนสถานะ remote target เดียวกันให้มีผู้ปฏิบัติหลักคนเดียว งานวิเคราะห์ local แยกส่วนอาจทำพร้อมกันได้โดยไม่ส่งคำสั่งซ้อน

หลักฐานต้องพอดีกับความเสี่ยง: browser prep เก็บ action/error/count/สถานะถัดไป; remote action ต้องผูก target/version/operation/ผลลัพธ์และผลข้างเคียง ไม่เก็บ secret/raw customer data ไม่ใช้ข้อความที่ผู้เรียกอ้างเองแทนหลักฐานบริการหรือสิทธิ์เครื่องมือ

## 8. เวลา Token และเกณฑ์ผ่าน

อ่าน current control และส่วนที่เกี่ยวข้อง ไม่โหลดทั้งประวัติซ้ำ ใช้ focused tests ระหว่างแก้และ required full gates เมื่อ candidate พร้อม ใช้หลักฐานเดิมเฉพาะเมื่อ source/config/environment ตรงและเงื่อนไข freshness ยังครบ ไม่เพิ่ม timeout/retry หรือผ่อน assertions เพื่อซ่อน root cause

เก็บ baseline/final counts และข้อจำกัดอย่างตรงไปตรงมา ไม่อ้างลด Token/ค่าเงินจากเพียงจำนวนคำสั่งที่ลดลง หลัง TEST session ที่ได้รับอนุญาตต้องตรวจ AI/pilot, in-flight, accounting, STOP/cleanup และ handoff ตาม control เดิม

Local PASS ไม่เท่ากับ hosted CI, live UAT หรือ Issue DoD; UNKNOWN คงเป็น UNKNOWN และไม่ลด acceptance criteria

## 9. การนำไปใช้และรายการที่ไม่เปลี่ยน

นโยบายนี้แทนการตีความ generic browser retry เป็นโควตาตลอด task และแทนแนวทางขออนุมัติซ้ำทุกขั้นด้วย risk-based work-package handling ไม่เขียนทับ historical PO-BROWSER-PREP-03, one-use grants, operation journals, historical SQL/Owner-resolution budget หรือบันทึกคำปฏิเสธเดิม

v39 เป็น successor overlay ที่ตรวจ inherited v38 เทียบ Git baseline; ไม่แก้ frozen v38 module หรือประวัติ บันทึกคำอนุมัติใน Owner decision, bump roadmap/schema/current-work พร้อมกัน, ตรวจ positive/negative regressions และ reconcile GitHub #9/#12 กับ Notion ตามผลจริง

Pure policy evaluator เป็น local decision aid: ไม่ execute browser/Storage, ไม่ใช่ permission broker, ไม่รับรองความจริงของหลักฐานที่ caller ส่งมา และไม่เก็บ persistent incident ledger จึงใช้ผลเพื่ออ้างว่า remote execution ได้รับอนุญาตไม่ได้ การเชื่อม executor ในอนาคตต้องตรวจ trusted history, action identity และ tool permission จริงก่อน

Storage hold ไม่ถูกปลด; pending-template causality, U1 GAP, A1–A3 UNRESOLVED และ billing UNKNOWN ยังคงเดิม ห้ามส่ง U2 จากผลนโยบายนี้ นโยบายและ local tests ผ่านไม่ทำให้ user UAT พร้อมโดยอัตโนมัติ

อ้างอิงขอบเขตเครื่องมือ: [OpenAI Auto-review](https://learn.chatgpt.com/docs/sandboxing/auto-review) แยก explicit denial จาก technical failure และกำหนดให้ใช้ทางเลือกที่ปลอดภัยขึ้นจริงหรือขอการตัดสินใจผ่านช่องทางที่รองรับ
