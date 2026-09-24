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
