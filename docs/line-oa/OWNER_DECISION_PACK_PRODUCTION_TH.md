# Owner Decision Pack — Production `มะลิปัง`

จัดทำ: 28 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `OWNER_BASELINE_RECORDED / FINAL_PLAN_APPROVAL_REQUIRED / PRODUCTION_NO-GO`

ขอบเขต: เอกสารประกอบการตัดสินใจเท่านั้น การเลือกในเอกสารนี้ยังไม่อนุญาตให้เปิดหรือเปลี่ยน Production, deploy, สร้าง credential/secret/Reward Card, เปลี่ยน Rich Menu/Webhook หรือส่งข้อความ ต้องมี implementation plan และ action-time approval แยกภายหลัง

## Owner baseline ที่บันทึกแล้ว — 28 สิงหาคม 2026

ตารางนี้เป็นสถานะ authoritative ของการเลือกใน Pack; ช่องตัวเลือกในหัวข้อถัดไปคงไว้เพื่ออธิบาย trade-off เท่านั้น หากขัดกันให้ยึดตารางนี้และ decision record `PRODUCTION_OWNER_DECISION_RECORD_2026-08-28_TH.md`

| Decision | ค่าที่ Owner เลือก                                                                                                                                                   | สถานะ/ช่องว่างที่ยังเหลือ                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OD-01    | A — ทุก 50 บาทจากยอดสุทธิหลังส่วนลด = 1 แต้ม; ปัด `floor(ยอดสุทธิ/50)`                                                                                               | `APPROVED_BASELINE`                                                                                                     |
| OD-02    | C — 50 แต้ม; ยอดซื้อสะสม 2,500 บาท                                                                                                                                   | `APPROVED_BASELINE`                                                                                                     |
| OD-03A   | A — ต้นทุนจริงรางวัลไม่เกิน 25 บาท หรือไม่เกิน 1% ของ 2,500 บาท                                                                                                      | `PASS_BY_OWNER_ATTESTATION`; ไม่บันทึกตัวเลขต้นทุนจริง                                                                  |
| OD-03B   | CUSTOM — `ตุ๊กตามะลิจัง 1 ตัว` เท่านั้น; รางวัลแทนต้องเป็นชื่อที่ Owner อนุมัติใน manifest version ใหม่                                                              | `APPROVED_BASELINE`; ปฏิเสธถ้อยคำกว้าง เช่น “สินค้าไม่เกิน 39 บาท”                                                      |
| OD-03C   | ยอดสุทธิหลังส่วนลด; 1 Voucher/ใบเสร็จ, ไม่แลกเงินสด/ไม่ stacking/ไม่รับแต้มส่วน Voucher, mark used หลังส่งมอบ; refund ให้ Owner reconcile                            | `APPROVED_SAFE_DEFAULT`                                                                                                 |
| OD-04A   | CUSTOM — อายุบัตร 12 เดือนนับจากวันที่ลูกค้ารับบัตร                                                                                                                  | `NOT_VERIFIED`; UI ใช้ first use แต่ยังไม่ยืนยันว่าเท่ากับวันที่รับบัตร                                                 |
| OD-04B   | B — Voucher ใช้ได้ 60 วันหลังได้รับ                                                                                                                                  | `APPROVED_BASELINE`                                                                                                     |
| OD-05A   | A — Welcome bonus 0 แต้ม                                                                                                                                             | `APPROVED_BASELINE`                                                                                                     |
| OD-05B   | A — ไม่มี reminder ในรอบแรก                                                                                                                                          | `APPROVED_BASELINE`                                                                                                     |
| OD-05C   | B — ไม่มี daily cooldown; ทุกใบเสร็จที่เข้าเกณฑ์ได้แต้ม                                                                                                              | `APPROVED_POLICY / TECHNICAL_FEASIBILITY_PENDING`                                                                       |
| OD-06A   | A-CUSTOM — One Time QR ต่อ 1 ใบเสร็จ อายุ 10 นาที                                                                                                                    | `APPROVED_POLICY / TECHNICAL_FEASIBILITY_PENDING`; LINE ยืนยัน one-time แต่ยังต้องพิสูจน์ค่าอายุ 10 นาที/จำนวนแต้มใน UI |
| OD-06B   | CUSTOM — Owner หรือ Shift lead เท่านั้น; หลังวันที่ 30 คงสิทธิ์เดิมจนมี policy version ใหม่                                                                          | `APPROVED_SAFE_DEFAULT`                                                                                                 |
| OD-06C   | paid receipt เท่านั้น, net-after-discount, floor, 1 transaction/QR ครั้งเดียว, unpaid/cancelled/refunded/reused QR ไม่มีแต้ม; refund หลังให้แต้มต้อง Owner reconcile | `APPROVED_SAFE_DEFAULT`                                                                                                 |
| OD-07A   | A — versioned manifest ใน repository เป็นแหล่งเดียว                                                                                                                  | `APPROVED_BASELINE`                                                                                                     |
| OD-07B   | ทุกหมวดอยู่ใน manifest และหมวดไม่มีหลักฐานถูกตั้ง `BLOCKED`                                                                                                          | `EVIDENCE_BLOCKER`; ไม่มี customer-facing value จน record เป็น `APPROVED`                                               |
| OD-08    | CUSTOM — Owner ตัดสินใจหยุด/อนุมัติ reconciliation; Technical operator แก้/rollback; Shift lead ตรวจยอดและออก QR                                                     | `APPROVED_ROLE_DEFAULT`; named allowlist/backup/auditor ยังเป็น execution blocker                                       |
| OD-09    | B — Worker logs 7 วัน, reconciliation 90 วัน, config/incident 365 วัน                                                                                                | `APPROVED_BASELINE`; storage/export สำหรับ 90/365 วันต้องออกแบบและอนุมัติต้นทุนก่อนใช้                                  |
| OD-10    | Structured redacted monitoring ตาม thresholds ใน manifest; duplicate/account/PII/QR variance 1 ครั้งให้ rollback; persistence/LINE 3 ครั้งติด; disable target 5 นาที | `APPROVED_SAFE_DEFAULT`; platform plan/recipients ยังเป็น execution blocker                                             |
| OD-11    | event-based 30 นาทีช่วงลูกค้าน้อย, Owner หน้างาน, Technical operator execute, Shift lead คุม QR, observe 120 นาที, rollback ภายใน 5 นาที                             | `APPROVED_SAFE_DEFAULT`; stable targets/rehearsal ยังเป็น evidence blocker                                              |
| OD-12    | Owner อนุมัติ conditional execution จาก frozen commit แล้ว แต่ต้องหยุดเมื่อ mandatory gate fail                                                                      | `APPROVAL_RECORDED / EXECUTION_GATE_NO_GO`                                                                              |

ค่าที่อนุมัติข้างต้นเป็น **policy baseline** ไม่ใช่สิทธิ์ implementation หรือ external Production action การสร้างบัตร, deploy, เพิ่ม secret, เชื่อม Rich Menu หรือเปิด Production ยังคง `NO-GO`

## แบบตอบอ้างอิงสำหรับช่องว่างที่ยังเหลือ

Owner ตอบเป็นรหัสได้ เช่น:

```text
OD-01: A
OD-02: C
OD-03A: A
OD-03B: A
OD-03C: APPROVE / MODIFY
OD-04A: A
OD-04B: B
OD-05A: A
OD-05B: A
OD-05C: A / B
OD-06A: A
OD-06B: B
OD-06C: APPROVE / MODIFY
OD-07A: A
OD-07B: แนบ source/approver ต่อหมวด
OD-08: B
OD-09: B
OD-10A: B
OD-10B: APPROVE / MODIFY
OD-10C: ระบุผู้รับผิดชอบ
OD-11: A พร้อมวัน/เวลา/ผู้ rollback
OD-12: APPROVE / MODIFY
Owner: [ชื่อ/บทบาท]
Approval date: YYYY-MM-DD
Effective date: YYYY-MM-DD หรือ PENDING
หมายเหตุ: ...
```

สำหรับช่องว่างที่ยังเหลือ หากเลือก `CUSTOM` ต้องระบุค่าตัวเลขและเงื่อนไขครบ ห้ามตีความจากคำว่า “ตามเดิม” หรือ “เหมือน TEST” เพราะ TEST decisions ไม่ใช่ Production approval

## สูตรกลางที่ใช้ใน Pack

เมื่อกำหนด `50 บาท = 1 แต้ม`:

- ยอดซื้อสะสมก่อนหัก welcome bonus = `เป้าหมายแต้ม × 50 บาท`
- ยอดซื้อที่ต้องจ่ายจริงหลัง welcome bonus = `(เป้าหมายแต้ม - welcome bonus) × 50 บาท`
- อัตราต้นทุนรางวัลสูงสุดต่อยอดขาย = `ต้นทุนจริงสูงสุดของรางวัล ÷ ยอดซื้อที่ต้องจ่ายจริง × 100`
- แต้มต่อใบเสร็จที่เสนอ = `floor(ยอดสุทธิที่มีสิทธิ์ ÷ 50)`

ยอดสุทธิที่มีสิทธิ์ยังต้องให้ Owner นิยามว่าจะหักส่วนลด, Voucher, ค่าจัดส่ง, สินค้าฝากขาย, ยอดคืนเงิน หรือรายการอื่นหรือไม่

---

## OD-01 — อัตราการสะสมแต้ม

| ตัวเลือก      | กติกา                            | ผลต่อต้นทุน                                                | ผลต่อหน้างาน                                        | ความเสี่ยงทุจริต                                 | Rollback                                                                                  |
| ------------- | -------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **A — แนะนำ** | 50 บาท = 1 แต้ม                  | สอดคล้องภาพ Rich Menu/TEST; ต้นทุนขึ้นกับเป้าหมายและรางวัล | ต้องคำนวณ `floor(ยอดสุทธิ/50)` ทุกใบเสร็จ           | ถ้าให้แต้มโดยไม่ตรวจยอด พนักงานสามารถออกเกินจริง | หยุดแจก URL/QR ก่อน; การเปลี่ยนกติกาบัตรที่ Publish แล้วอาจทำไม่ได้ ต้องตรวจ LINE UI ก่อน |
| B             | 100 บาท = 1 แต้ม                 | ลดต้นทุนและความเร็วการได้รางวัลประมาณครึ่งหนึ่ง            | คำนวณง่าย แต่ขัดกับ artwork/ข้อความที่ยืนยันใน TEST | ต่ำกว่า A เพราะออกแต้มน้อยลง                     | ต้องแก้ artwork/copy/config ใหม่ทั้งหมดก่อนเปิด                                           |
| C             | ยังไม่เปิด loyalty ใน Production | ไม่มีต้นทุนรางวัล                                          | ไม่มีงาน QR/reconciliation                          | ต่ำสุด                                           | ไม่เชื่อม Reward Card/Rich Menu; ระบบตอบ fail closed                                      |

**Owner selection OD-01:** `[ ] A` `[ ] B` `[ ] C` `[ ] CUSTOM: ________`

## OD-02 — เป้าหมายแต้มและยอดซื้อสะสม

ตารางนี้คำนวณด้วย OD-01=A และ welcome bonus 0:

| ตัวเลือก              |    เป้าหมาย |   ยอดซื้อสะสม | ความเร็วได้รางวัล | ผลต่อต้นทุน/retention                                         | หน้างานและ fraud                         | Rollback                             |
| --------------------- | ----------: | ------------: | ----------------- | ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| A                     |     20 แต้ม |     1,000 บาท | เร็ว              | ต้นทุนรางวัลต่อยอดขายสูงกว่าเป้าหมาย 50 แต้ม 2.5 เท่า         | ตรวจ fraud บ่อยขึ้นเพราะ Voucher ออกเร็ว | เปลี่ยนก่อน Publish เท่านั้นเป็นหลัก |
| B                     |     30 แต้ม |     1,500 บาท | ปานกลางค่อนเร็ว   | ต้นทุนต่อยอดขายสูงกว่า 50 แต้ม 1.67 เท่า                      | reconciliation ปานกลาง                   | เหมือน A                             |
| **C — แนะนำเริ่มต้น** | **50 แต้ม** | **2,500 บาท** | ปานกลาง           | สมดุลและตรง TEST evidence แต่ยังต้อง Owner อนุมัติ Production | รอบแลกไม่ถี่เกิน; ตัวเลขจำง่าย           | เหมือน A                             |
| D                     |    100 แต้ม |     5,000 บาท | ช้า               | อัตราต้นทุนต่อยอดขายต่ำ แต่ liability/แต้มค้างนาน             | ลูกค้าอาจเลิกใช้ก่อนถึงเป้า              | เหมือน A                             |

ผลของ welcome bonus เมื่อเป้าหมาย 50 แต้ม:

| Welcome bonus | ยอดซื้อที่ต้องจ่ายจริง | ส่วนลดจากยอดซื้อสะสมเดิม |
| ------------: | ---------------------: | -----------------------: |
|             0 |              2,500 บาท |                    0 บาท |
|             1 |              2,450 บาท |                   50 บาท |
|             2 |              2,400 บาท |                  100 บาท |
|             5 |              2,250 บาท |                  250 บาท |

**Owner selection OD-02:** `[ ] A` `[ ] B` `[ ] C` `[ ] D` `[ ] CUSTOM: ________`

## OD-03 — เพดานต้นทุนและรางวัลจริง

### OD-03A เพดานต้นทุนจริงสูงสุด

คำนวณจากยอดซื้อ 2,500 บาทตาม OD-02=C:

| ตัวเลือก              | ต้นทุนจริงสูงสุด/รางวัล | อัตราสูงสุดต่อยอดขาย | ผลต่อธุรกิจ          | ความเสี่ยง                                             | Rollback                                                     |
| --------------------- | ----------------------: | -------------------: | -------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **A — แนะนำเริ่มต้น** |          ไม่เกิน 25 บาท |        ไม่เกิน 1.00% | คุม margin ได้ง่าย   | ต้องมี COGS ที่ Owner/บัญชียืนยัน                      | ระงับการแจกบัตร/Voucher; ไม่ย้อน Voucher ที่ลูกค้าได้รับแล้ว |
| B                     |          ไม่เกิน 50 บาท |        ไม่เกิน 2.00% | ให้รางวัลน่าสนใจขึ้น | promotion stacking ทำให้ต้นทุนจริงเกินเพดานได้         | เหมือน A                                                     |
| C                     |          ไม่เกิน 75 บาท |        ไม่เกิน 3.00% | เชิงรุก              | กระทบ margin สูง โดยเฉพาะสินค้ากำไรต่ำ                 | เหมือน A                                                     |
| D                     |         ไม่เกิน 100 บาท |        ไม่เกิน 4.00% | รางวัลแรง            | เสี่ยงขาดทุน/abuse สูง ต้องมี minimum redemption spend | เหมือน A                                                     |

สำหรับรางวัลเป็นสินค้า ต้องใช้ **ต้นทุนจริง (COGS)** ไม่ใช่ราคาขายในการเทียบเพดาน ตัวอย่างสินค้า retail 39 บาท:

| COGS ที่ Owner ยืนยัน | ต้นทุนต่อยอดซื้อ 2,500 บาท | Customer-facing value จาก retail 39 บาท |
| --------------------: | -------------------------: | --------------------------------------: |
|                15 บาท |                      0.60% |                                   1.56% |
|                20 บาท |                      0.80% |                                   1.56% |
|                25 บาท |                      1.00% |                                   1.56% |

ถ้ายังไม่มี COGS ที่ยืนยัน ห้ามบันทึกว่ารางวัลผ่าน cost gate

**Owner selection OD-03A:** `[ ] A` `[ ] B` `[ ] C` `[ ] D` `[ ] CUSTOM: ________`

### OD-03B รูปแบบรางวัล

| ตัวเลือก         | รางวัล                                      |                  ต้นทุนสูงสุดต่อยอดขาย 2,500 บาท | หน้างาน                    | ความเสี่ยงทุจริต                     | Rollback                                      |
| ---------------- | ------------------------------------------- | -----------------------------------------------: | -------------------------- | ------------------------------------ | --------------------------------------------- |
| A — Owner ปฏิเสธ | รางวัลแบบกว้าง เช่นสินค้า/ขนมไม่เกิน 39 บาท |                   ไม่แน่นอนจนกว่าจะระบุ SKU/COGS | พนักงานตีความไม่ตรงกัน     | เปลี่ยนของรางวัลเองหรือจ่ายเกินเพดาน | **ห้ามใช้**; fail closed                      |
| B                | ส่วนลด 50 บาท                               |                                            2.00% | ลดจากบิลแลกทันที           | ใช้ซ้อนโปร/ใช้ซ้ำ/แลกกับบิลต่ำ       | ปิดการออกใหม่; Voucher ที่ออกแล้วคง liability |
| C                | ส่วนลด 100 บาท เมื่อซื้อขั้นต่ำ 500 บาท     | สูงสุด 4.00% ของยอดสะสมเดิม แต่ต้องมียอดแลกเพิ่ม | ต้องตรวจ minimum spend     | แบ่งบิล/คืนสินค้าหลังแลก             | ปิดการออกใหม่; ตรวจ refund abuse              |
| D                | ยังไม่กำหนดรางวัล                           |                                          ไม่ทราบ | เปิดบัตรไม่ได้อย่างปลอดภัย | สูงเพราะพนักงานตีความเอง             | Fail closed; ไม่ Publish                      |

**Owner decision OD-03B:** `CUSTOM — ตุ๊กตามะลิจัง 1 ตัว; COGS ≤25 บาท` รางวัลแทนใช้ได้เมื่อ Owner ประกาศชื่อชัดเจนและอนุมัติ manifest version ใหม่เท่านั้น

### OD-03C เงื่อนไขแลกขั้นต่ำ

ข้อเสนอที่ต้อง Owner เลือก/แก้:

- `[ ]` 1 Voucher ต่อ 1 ใบเสร็จ
- `[ ]` ห้ามแลกเป็นเงินสด/เงินทอน
- `[ ]` ห้ามใช้ร่วมกับ promotion/Voucher อื่น
- `[ ]` ไม่ได้แต้มจากมูลค่าที่ชำระด้วย Voucher
- `[ ]` สินค้ารางวัลขึ้นกับรายการที่ร่วมและ stock; ห้ามบอตยืนยัน stock
- `[ ]` คืนเงิน/ยกเลิกรายการต้อง reverse แต้ม/สิทธิ์โดยผู้มีอำนาจพร้อม audit
- `[ ]` Voucher ต้องถูก mark used ต่อหน้าพนักงานหลังส่งมอบรางวัลเท่านั้น
- `[ ]` เงื่อนไขอื่น: `________________________`

---

## OD-04 — อายุบัตรและ Voucher

### OD-04A อายุบัตร

ตัวเลือกต้องตรวจอีกครั้งกับ LINE UI ก่อนสร้าง เพราะค่าบางรายการของบัตรที่เปิดใช้แล้วแก้ไขได้จำกัด

| ตัวเลือก                       | Policy                                                                             | ต้นทุน/liability     | หน้างาน                                             | Fraud/ข้อพิพาท                                                | Rollback                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **A — Owner เลือกเป็น policy** | 12 เดือนนับจากวันที่ลูกค้ารับบัตร; ต้องตรวจว่า LINE รองรับ rolling expiration จริง | จำกัด liability      | ต้องแจ้งวันชัด; ไม่มี reminder รอบแรก               | ต่ำกว่า no-expiration; เสี่ยงข้อพิพาทหาก platform ใช้วันคงที่ | หยุดก่อน Publish หาก UI ไม่รองรับ; ห้ามแปลงเป็นวันคงที่เอง |
| B                              | No expiration + Owner review/ปิดด้วยตนเองรายปี                                     | liability ไม่สิ้นสุด | ภาระติดตามสูง                                       | แต้มเก่าค้าง/บัญชีร้าง                                        | การ suspend อาจกระทบผู้ถือทั้งหมดและอาจย้อนกลับไม่ได้      |
| C                              | 6 เดือน                                                                            | liability ต่ำ        | ลูกค้าต้องสะสมเร็ว                                  | ข้อร้องเรียน/ความรู้สึกไม่คุ้มสูง                             | เหมือน A                                                   |
| D                              | กำหนดวันสิ้นปี                                                                     | บริหารงบง่าย         | ลูกค้าที่สมัครปลายปีเสียเปรียบถ้าไม่มี grace period | dispute สูง                                                   | ต้องมี transition/grace policy                             |

**Owner selection OD-04A:** `[ ] A` `[ ] B` `[ ] C` `[ ] D` `[ ] CUSTOM DATE/POLICY: ________`

### OD-04B อายุ Voucher หลังได้รับ

| ตัวเลือก      |       อายุ | ต้นทุน/liability     | หน้างาน           | ความเสี่ยง          | Rollback                         |
| ------------- | ---------: | -------------------- | ----------------- | ------------------- | -------------------------------- |
| A             |     30 วัน | liability สั้น       | ลูกค้าต้องใช้เร็ว | complaint สูง       | เปลี่ยนเฉพาะ Voucher รุ่นใหม่    |
| **B — แนะนำ** |     60 วัน | สมดุล                | ตรวจวันที่ง่าย    | ปานกลาง             | เปลี่ยนเฉพาะรุ่นใหม่             |
| C             |     90 วัน | liability นานขึ้น    | ลูกค้ายืดหยุ่น    | Voucher ค้างมากขึ้น | เปลี่ยนเฉพาะรุ่นใหม่             |
| D             | ไม่หมดอายุ | liability ไม่สิ้นสุด | ง่ายต่อข้อความ    | fraud/บัญชีค้างสูง  | ปิดการออกใหม่แต่ของเดิมยังคงอยู่ |

**Owner selection OD-04B:** `[ ] A` `[ ] B` `[ ] C` `[ ] D` `[ ] CUSTOM: ________`

---

## OD-05 — Welcome bonus, reminder และ cooldown

### OD-05A Welcome bonus

| ตัวเลือก      | Bonus | ผลต่อยอดซื้อเป้าหมาย 50 แต้ม | ต้นทุน        | Fraud/หน้างาน                 | Rollback                     |
| ------------- | ----: | ---------------------------: | ------------- | ----------------------------- | ---------------------------- |
| **A — แนะนำ** |     0 |                    2,500 บาท | ต่ำสุด        | ไม่จูงใจสร้างบัญชี/รับบัตรซ้ำ | เปลี่ยนก่อน Publish เป็นหลัก |
| B             |     1 |                    2,450 บาท | เพิ่มเล็กน้อย | incentive ต่ำ                 | เหมือน A                     |
| C             |     2 |                    2,400 บาท | เพิ่ม         | อาจรับบัตรโดยไม่ซื้อ          | เหมือน A                     |
| D             |     5 |                    2,250 บาท | เพิ่มชัด      | เสี่ยง abuse สูง              | เหมือน A                     |

**Owner selection OD-05A:** `[ ] A` `[ ] B` `[ ] C` `[ ] D`

### OD-05B Reminder

| ตัวเลือก              | Policy                | ต้นทุน                                    | หน้างาน/ลูกค้า     | ความเสี่ยง                | Rollback                                      |
| --------------------- | --------------------- | ----------------------------------------- | ------------------ | ------------------------- | --------------------------------------------- |
| **A — แนะนำเริ่มต้น** | None                  | ไม่มี message cost เพิ่ม                  | ไม่รบกวนลูกค้า     | ลูกค้าลืมใช้แต้ม/Voucher  | เปิด reminder ภายหลังหลัง consent/copy review |
| B                     | 1 ครั้งก่อนหมด 30 วัน | มี message/operational cost ตาม LINE plan | ช่วยลดข้อร้องเรียน | copy ผิด/ส่งเกิน audience | ปิด reminder                                  |
| C                     | 1 ครั้งก่อนหมด 7 วัน  | เห็น urgency สูง                          | ลูกค้ามีเวลาน้อย   | complaint สูงกว่า B       | ปิด reminder                                  |

**Owner selection OD-05B:** `[ ] A` `[ ] B` `[ ] C` `[ ] CUSTOM: ________`

### OD-05C Cooldown และกติกาซื้อซ้ำ

| ตัวเลือก                                 | Policy                                                               | ความถูกต้องต่อ 50 บาท=1 แต้ม                 | หน้างาน                  | Fraud risk                                     | Rollback                                                |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | ------------------------ | ---------------------------------------------- | ------------------------------------------------------- |
| A                                        | รับแต้มได้วันละครั้ง แต่ QR ครั้งเดียวให้ครบ `floor(ยอดสุทธิ/50)`    | ถูกต่อบิลแรก แต่ซื้อซ้ำวันเดียวกันไม่ได้แต้ม | ง่าย                     | ต่ำ                                            | เปลี่ยน policy เฉพาะถ้า LINE อนุญาต; ต้องแจ้ง terms ชัด |
| **B — แนะนำถ้าต้องการให้แต้มทุกใบเสร็จ** | ไม่มี daily cooldown; One Time QR ต่อใบเสร็จและ supervisor threshold | ตรงกติกาทุกใบเสร็จ                           | งานเพิ่ม; ต้อง reconcile | ปานกลางแต่ควบคุมได้ด้วย one-time/receipt/audit | หยุดสิทธิ์ออก QR หรือเปิด cooldown                      |
| C                                        | วันละครั้งและให้เพียง 1 แต้ม                                         | **ไม่ตรง** เมื่อยอด ≥100 บาท                 | ง่ายสุด                  | ต่ำ                                            | `NO-GO` เว้น Owner เปลี่ยนคำโฆษณา/กติกา                 |

ก่อนเลือก A/B ต้องยืนยันว่า LINE UI รองรับการกำหนดจำนวนแต้มใน One Time QR ตามยอดต่อใบเสร็จ หากไม่รองรับ ห้ามอ้าง `50 บาท = 1 แต้ม` แบบตามยอดจริง

**Owner selection OD-05C:** `[ ] A` `[ ] B` `[ ] C — ต้องแก้กติกา` `[ ] CUSTOM: ________`

---

## OD-06 — QR ให้แต้มและการตรวจยอด

### OD-06A ประเภทและอายุ QR

LINE ระบุว่า One Time QR แสดงผ่านแอปและใช้ครั้งเดียว ส่วน printable QR ต้องเปิดใช้แยกใน Manager:

- <https://help2.line.me/official_account_th/web/categoryId/20006372/3/pc?lang=th>

| ตัวเลือก      | อายุ/การแสดง                                                                    | ต้นทุนหน้างาน              | Fraud risk                   | Audit                                 | Rollback                                      |
| ------------- | ------------------------------------------------------------------------------- | -------------------------- | ---------------------------- | ------------------------------------- | --------------------------------------------- |
| **A — แนะนำ** | One Time QR แสดงต่อหน้าลูกค้าหลังตรวจใบเสร็จและสแกนทันที; ห้าม screenshot/print | สูงกว่า printable เล็กน้อย | ต่ำสุด                       | ผูกกับ shift/operator/receipt ref ได้ | QR ใช้ครั้งเดียว; revoke สิทธิ์ผู้ใช้ได้ทันที |
| B             | Printable QR ต่อกะ อายุไม่เกิน 8 ชั่วโมง แล้ว disable สิ้นกะ                    | กลาง                       | สูง: ถ่ายรูป/แชร์/ใช้ซ้ำในกะ | ต้อง reconcile ทุกกะ                  | disable QR สิ้นกะ/เมื่อยอดผิดปกติ             |
| C             | Printable QR ต่อวัน อายุไม่เกิน 24 ชั่วโมง                                      | ต่ำ                        | สูงกว่า B                    | reconcile รายวัน                      | disable ทันทีและสอบสวน variance               |
| D             | Printable/static เกิน 24 ชั่วโมง                                                | ต่ำสุด                     | สูงมาก                       | ตรวจย้อนหลังยาก                       | **ไม่แนะนำ/NO-GO**                            |

**Owner selection OD-06A:** `[ ] A` `[ ] B` `[ ] C` `[ ] D — NO-GO` `[ ] CUSTOM: ________`

### OD-06B ผู้มีสิทธิ์ออก QR

| ตัวเลือก      | สิทธิ์                                                                           | ต้นทุนหน้างาน        | Fraud risk                   | Rollback                                            |
| ------------- | -------------------------------------------------------------------------------- | -------------------- | ---------------------------- | --------------------------------------------------- |
| A             | Owner เท่านั้น                                                                   | คอขวดสูง             | ต่ำ                          | revoke session/access                               |
| **B — แนะนำ** | Shift lead ออก One Time QR; cashier ตรวจยอด/ร้องขอ; Owner สร้าง printable/config | ปานกลางและแยกหน้าที่ | ต่ำ-ปานกลาง                  | revoke shift lead, rotate admin session, disable QR |
| C             | Cashier ทุกคนออก QR ได้                                                          | เร็ว                 | สูง: self-award/collusion    | revoke รายคนแต่ investigation สูง                   |
| D             | ใช้ shared account                                                               | ต่ำ                  | สูงสุดและ audit actor ไม่ได้ | **NO-GO**                                           |

ห้ามบันทึกชื่อ/LINE ID จริงของพนักงานใน public docs; production allowlist ต้องอยู่ใน approved encrypted configuration และใช้ pseudonymous actor reference ใน audit

**Owner selection OD-06B:** `[ ] A` `[ ] B` `[ ] C` `[ ] D — NO-GO`

### OD-06C ขั้นตอนตรวจยอดก่อนให้แต้ม

Owner ต้องเลือก/แก้ทุกข้อ:

1. `[ ]` ใช้ใบเสร็จ/POS transaction ที่สถานะ paid เท่านั้น; รูปสลิปไม่ใช่หลักฐานยืนยันการชำระ
2. `[ ]` ยอดมีสิทธิ์ = ยอดสุทธิหลังส่วนลด ไม่รวมค่าจัดส่ง/Voucher/ยอดคืนเงิน
3. `[ ]` แต้ม = `floor(ยอดมีสิทธิ์ ÷ 50)`; เศษไม่สะสมข้ามใบเสร็จ
4. `[ ]` 1 transaction reference ใช้ออกแต้มได้ครั้งเดียว
5. `[ ]` มากกว่า 10 แต้ม/500 บาท ต้อง shift lead ยืนยัน
6. `[ ]` มากกว่า 20 แต้ม/1,000 บาท ต้อง Owner ยืนยัน
7. `[ ]` refund/cancel ต้องทำ point-adjustment ตาม runbook โดยสองบทบาทอนุมัติ
8. `[ ]` เก็บเฉพาะ hash/reference, จำนวนแต้ม, actor role, timestamp และ outcome; ไม่เก็บ QR image/value หรือข้อมูลลูกค้าเต็ม
9. `[ ]` threshold/custom rule: `________________________`

Reconciliation รายกะ/วัน:

- `แต้มที่ออกทั้งหมด ≤ floor(ยอดขายสุทธิที่มีสิทธิ์ทั้งหมด ÷ 50)`
- variance ที่ไม่ใช่ 0 ต้องมีเหตุผลและ approver
- หากพบ QR leak, duplicate transaction reference, actor anomaly หรือ variance เกิน threshold ให้ disable QR/สิทธิ์ทันทีและเปิด incident

---

## OD-07 — Authoritative business data สำหรับ Issue #8

### OD-07A รูปแบบ source of truth

| ตัวเลือก              | Source                                                                | ต้นทุน                               | หน้างาน                         | Fraud/data risk                     | Rollback                                                  |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------ | ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| **A — แนะนำ Phase 1** | Versioned JSON/YAML ใน repo + Owner approval record + effective dates | ต่ำ                                  | ต้องทำ PR/approval เมื่อเปลี่ยน | ต่ำ; diff/audit ชัด                 | Git revert + fail closed เมื่อ version หมดอายุ            |
| B                     | Owner-approved document/PDF แล้วแปลงเป็น manifest                     | ต่ำ-กลาง                             | มีงาน sync สองที่               | กลาง: document/manifest ไม่ตรงกัน   | กลับ manifest version ก่อนและหยุดตอบรายการขัดกัน          |
| C                     | Google Sheet/ฐานข้อมูล live                                           | กลาง-สูงและมี credential/integration | แก้หน้างานง่าย                  | permission/stale/injection risk     | disable binding และใช้ last approved snapshot/fail closed |
| D                     | ข้อความใน LINE/chat/ความจำพนักงาน                                     | ต่ำ                                  | ง่าย                            | สูงสุด ไม่มี version/effective date | **NO-GO**                                                 |

**Owner selection OD-07A:** `[ ] A` `[ ] B` `[ ] C — future approval required` `[ ] D — NO-GO`

### OD-07B รายการที่ต้องอนุมัติ

ทุก record ต้องมี `source`, `owner`, `approved_at`, `effective_from`, `effective_to`, `review_at`, `status`, `version/checksum` และส่งให้ลูกค้าเฉพาะสถานะ `APPROVED` ที่ยังไม่หมดอายุ

| หมวด      | ค่าที่ต้องแนบ/ยืนยัน                                          | Proposed owner      | Review/freshness                      | เมื่อไม่พร้อม                                    | Owner sign-off |
| --------- | ------------------------------------------------------------- | ------------------- | ------------------------------------- | ------------------------------------------------ | -------------- |
| เมนู      | รายการสินค้า/ไส้, รูป, SKU ที่ตอบได้; แยกจาก stock วันนี้     | Owner/ผู้จัดการร้าน | ทุกครั้งที่เปลี่ยน + monthly review   | แสดงเฉพาะภาพ approved และบอกให้พนักงานเช็ก stock | `[ ]`          |
| ราคา      | ราคาปัจจุบัน, หน่วย, VAT/ค่าบรรจุถ้ามี, effective date        | Owner + ผู้ดูแลราคา | ก่อนมีผลทุกครั้ง + monthly review     | ไม่ตอบราคา; handoff                              | `[ ]`          |
| ที่อยู่   | ข้อความที่อยู่, Maps URL, จุดรับสินค้า/สาขา                   | Owner               | quarterly หรือทันทีเมื่อเปลี่ยน       | handoff; ห้ามเดาพิกัด                            | `[ ]`          |
| เวลาเปิด  | เวลาปกติ, timezone, วันหยุด/เทศกาล, last-order/pickup cutoff  | ผู้จัดการร้าน       | weekly; วันหยุดอนุมัติล่วงหน้า        | บอกให้พนักงานยืนยัน                              | `[ ]`          |
| โปรโมชั่น | exact copy, eligibility, start/end, quota, stacking, approver | Owner               | ต้องมี end date; auto-retire เมื่อหมด | ไม่แสดง/ไม่ยืนยัน                                | `[ ]`          |
| Loyalty   | earning/reward/expiry/cooldown/terms จาก Pack นี้             | Owner               | ก่อน Publish และเมื่อ policy เปลี่ยน  | fail closed                                      | `[ ]`          |

เพื่อปิด acceptance criteria ของ Issue #8 ยังต้องแนบแหล่งที่อนุมัติสำหรับรายการที่ Issue ระบุแต่ไม่ได้อยู่ใน 5 หมวดหลักของคำขอนี้:

| รายการเพิ่ม             | Required decision/source                                               | เมื่อไม่พร้อม                             |
| ----------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| การเก็บรักษา/อายุสินค้า | ข้อความแยกตามสินค้าและผู้อนุมัติด้าน product safety                    | handoff; ห้ามใช้ TEST_SEED “ประมาณ 2 วัน” |
| ภูมิแพ้/ส่วนผสม         | approved safety wording และผู้รับผิดชอบ                                | human review เท่านั้น; ห้ามวินิจฉัย       |
| ราคาส่ง/MOQ             | ตารางราคา, MOQ, lead time, effective date                              | safe fallback/handoff                     |
| วิธีสั่งล่วงหน้า        | ช่องทาง, cutoff, ข้อมูลขั้นต่ำ, disclaimer ว่ายังไม่ยืนยัน order/stock | draft/fallback เท่านั้น                   |
| Delivery/pickup         | ช่องทางที่เปิดจริง, ค่าใช้จ่าย, พื้นที่, เวลารับ                       | ข้อความ “ยังไม่ยืนยัน”/handoff            |

**Owner selection OD-07B:** ระบุ source file/link และ approver ต่อแถว ห้ามตอบเพียง “ข้อมูลเดิม”

---

## OD-08 — บทบาทพนักงานและ separation of duties

| ตัวเลือก             | โครงบทบาท                                                                              | ต้นทุนหน้างาน | Fraud/security risk                                | Rollback                        |
| -------------------- | -------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------- | ------------------------------- |
| A                    | Owner ทำทุกอย่าง                                                                       | คอขวดสูง      | single-account compromise/ไม่มี independent review | revoke/rotate ได้แต่ธุรกิจหยุด  |
| **B — แนะนำขั้นต่ำ** | Owner approver + Technical operator + Shift lead/Customer operator + Read-only auditor | ปานกลาง       | ลด self-approval และตรวจย้อนหลังได้                | revoke รายบทบาท; backup รับช่วง |
| C                    | Owner + Staff shared account                                                           | ต่ำ           | actor ระบุไม่ได้; fraud สูง                        | **NO-GO**                       |

RACI ที่เสนอสำหรับ B:

| Action                           | Owner                      | Technical operator | Shift lead/Customer operator  | Auditor |
| -------------------------------- | -------------------------- | ------------------ | ----------------------------- | ------- |
| Approve business/reward policy   | A                          | C                  | C                             | I       |
| Deploy/rollback Worker           | A สำหรับ Production change | R                  | I                             | I       |
| Create/disable QR config         | A                          | I                  | R เฉพาะ One Time ตาม policy   | I       |
| Verify receipt/issue points      | I                          | I                  | R                             | I       |
| Close handoff                    | I                          | C                  | R ตาม allowlist               | I       |
| Review daily variance/logs       | A                          | C                  | C                             | R       |
| Declare incident/disable webhook | A                          | R                  | R เมื่อ emergency ตาม runbook | I       |

`A=Accountable`, `R=Responsible`, `C=Consulted`, `I=Informed`

**Owner selection OD-08:** `[ ] A` `[ ] B` `[ ] C — NO-GO` `[ ] CUSTOM: ________`

---

## OD-09 — Audit retention และ privacy

| ตัวเลือก      | Worker operational/audit | Loyalty reconciliation | Config/deploy/incident | ต้นทุน                                         | Investigative value | Rollback/deletion                      |
| ------------- | ------------------------ | ---------------------- | ---------------------- | ---------------------------------------------- | ------------------- | -------------------------------------- |
| A             | 7 วัน                    | 30 วัน                 | 180 วัน                | ต่ำ                                            | จำกัด               | expiry/delete ตาม schedule             |
| **B — แนะนำ** | 7 วัน                    | 90 วัน                 | 365 วัน                | กลาง; >7 วันอาจต้องระบบเก็บแยกที่ยังไม่อนุมัติ | สมดุล               | documented deletion + access review    |
| C             | 30 วัน                   | 365 วัน                | 2 ปี                   | สูงและ privacy exposure สูง                    | สูง                 | ต้องมี external log store/legal review |

Cloudflare Workers Logs ปัจจุบันเก็บได้สูงสุด 3 วันบน Free และ 7 วันบน Paid โดยเอกสาร ณ วันที่จัดทำระบุ Free 200,000 log events/วัน และ Paid รวม 20 ล้าน events/เดือนก่อนคิดเพิ่ม USD 0.60/ล้าน events; ต้องตรวจราคา/plan อีกครั้งก่อน Production retention ที่นานกว่านั้นต้องมีระบบส่งออก/เก็บแยก ซึ่งเป็น integration และต้นทุนใหม่ที่ต้องอนุมัติภายหลัง:

- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>

ไม่ว่าเลือกข้อใด ห้ามเก็บ raw customer message, slip image/content, QR image/value, token/secret, เบอร์/ที่อยู่เต็ม หรือ LINE user ID ตรง ๆ หากต้องอ้าง actor/event ให้ใช้ scoped pseudonymous hash

**Owner selection OD-09:** `[ ] A` `[ ] B` `[ ] C` `[ ] CUSTOM: ________`

---

## OD-10 — Monitoring, alert และ incident owner

### OD-10A ระดับ monitoring

| ตัวเลือก      | Monitoring                                                                                                                              | ต้นทุน                      | หน้างาน           | ความเสี่ยง                       | Rollback                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------- | -------------------------------- | ---------------------------------------------------------- |
| A             | Health check + manual log review                                                                                                        | ต่ำ                         | ตรวจเอง           | พบ incident ช้า                  | disable webhook/manual rollback                            |
| **B — แนะนำ** | Structured redacted logs 100% ช่วง canary/7 วันแรก + health/error/LINE reply/persistence/handoff alerts; ทบทวน sampling หลังเห็น volume | กลางและขึ้นกับ traffic/plan | ต้องมีคนรับ alert | ต่ำกว่า A; คุม PII ต้องเข้ม      | ลด sampling/ปิด export; ไม่ลบ evidence ที่อยู่ใน retention |
| C             | Full logs+traces+external export                                                                                                        | สูง                         | ต้องดูแลระบบเพิ่ม | data leakage/vendor risk สูงกว่า | disable export/rotate export credential                    |

Cloudflare แนะนำ structured JSON logs และ head sampling; ค่า sampling มีผลต่อ volume/cost จึงต้อง record ก่อน deploy:

- <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>
- <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>

**Owner selection OD-10A:** `[ ] A` `[ ] B` `[ ] C`

### OD-10B Proposed alert/go-to-rollback thresholds

| Signal                              | Alert                          | Immediate rollback/disable gate                                            |
| ----------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Confirmed duplicate customer reply  | ทันที                          | 1 confirmed case                                                           |
| Destination/account guard rejection | ทันที                          | 1 case หลัง activation เพราะอาจผูก Channel ผิด                             |
| Persistence unavailable/fail-closed | 1 case                         | ต่อเนื่อง 3 ครั้งหรือ >1% ใน 5 นาที                                        |
| LINE reply/API failures             | 1 case                         | 3 ครั้งติดหรือ >1% ใน 5 นาที                                               |
| Webhook 5xx                         | >0.5% ใน 5 นาที                | >1% ใน 5 นาที                                                              |
| Handoff                             | oldest >15 นาที หรือ active >5 | Owner/ผู้จัดการตัดสินใจปิด bot ถ้า staff capacity ไม่พอ                    |
| QR/point variance                   | variance ใด ๆ                  | >1 transaction หรือพบ QR leak/reuse                                        |
| Secret/PII in log                   | ทันที                          | disable affected path, preserve evidence, rotate/revoke ตาม incident owner |

**Owner selection OD-10B:** `[ ] APPROVE` `[ ] MODIFY: ________`

### OD-10C Incident ownership

- Primary business/rollback approver: `________________`
- Technical operator: `________________`
- Backup technical operator: `________________`
- Customer communication owner: `________________`
- Loyalty/QR reconciliation owner: `________________`
- Maximum acknowledgement time: `[ ] 5 นาที` `[ ] 15 นาที` `[ ] 30 นาที`
- Emergency authority to disable webhook without waiting: `________________`

---

## OD-11 — Production rollout window และ rollback ownership

| ตัวเลือก      | Rollout                                                                                                                            | ต้นทุนหน้างาน | Customer/privacy risk                                                                  | Rollback                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **A — แนะนำ** | 30 นาทีช่วงลูกค้าน้อย, owner tester allowlist, Reward Card private link ก่อน, Webhook แล้ว Rich Menu ทีละขั้น, เฝ้าดูต่อ 2 ชั่วโมง | สูงแต่สั้น    | ต่ำสุดที่ทำได้ แต่ webhook ยังอาจรับ identifier ของผู้ใช้อื่น จึงต้อง privacy approval | rollback owner อยู่หน้าจอ; disable webhook → restore Rich Menu → rollback Worker |
| B             | 2 ชั่วโมงช่วงลูกค้าน้อยแบบ full audience                                                                                           | ปานกลาง       | ปานกลาง-สูง                                                                            | rollback เมื่อ threshold ถึง                                                     |
| C             | เปิดเต็มทันทีช่วงปกติ                                                                                                              | ต่ำ           | สูงสุด                                                                                 | **NO-GO**                                                                        |

กำหนด:

- วันที่/เวลาและ timezone: `________________ (Asia/Bangkok)`
- ช่วงห้ามทำ: `________________`
- Rollout executor: `________________`
- Rollback approver: `________________`
- Rollback executor: `________________`
- Backup: `________________`
- Stable Worker version ก่อนเปลี่ยน: `PENDING — ห้ามกรอกเดา`
- Rich Menu rollback target/hash: `PENDING — ต้อง capture read-only หลังอนุมัติ audit`
- Maximum decision-to-rollback time: `[ ] 5 นาที` `[ ] 10 นาที` `[ ] 15 นาที`

Cloudflare rollback ทำให้ version เป้าหมาย active แต่ไม่ย้อน storage state และอาจย้อนข้าม Durable Object lifecycle change ไม่ได้ ดังนั้นต้อง freeze schema และซ้อม rollback ก่อน Production:

- <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>

**Owner selection OD-11:** `[ ] A` `[ ] B` `[ ] C — NO-GO` `[ ] CUSTOM: ________`

---

## OD-12 — Final go/no-go criteria

### GO ได้เมื่อครบทุกข้อ

- `[ ]` OD-01 ถึง OD-11 มี Owner, approval date, effective date และ exact values ครบ
- `[ ]` Issue #8 authoritative sources ครบและไม่มี customer-facing `TEST_SEED`
- `[ ]` Issue #4 role/allowlist lifecycle, authenticated actions, monitoring, alerts, retention, runbook และ failure/rollback tests ผ่าน
- `[ ]` Issue #5 threat model, privacy, separate Production configuration/resources, least privilege, load/retry/failure tests และ rollback rehearsal ผ่าน
- `[ ]` Production Reward Card preview ตรง decision pack และแยกจาก TEST; ยังไม่ Publish จน action-time approval
- `[ ]` Production Worker/Channel/secrets/Durable Object namespaces แยกจาก TEST และ guard ปฏิเสธ TEST binding
- `[ ]` read-only Production response collision audit ผ่าน
- `[ ]` stable Worker version, Rich Menu rollback target, rollback owner/executor ถูกบันทึก
- `[ ]` owner-only/private UAT plan และ privacy basis ได้รับอนุมัติ
- `[ ]` formatting/lint/TypeScript/tests/build/validators/secret/dependency/dry-run/diff checks ผ่านจาก frozen commit
- `[ ]` Owner ออก final written `GO` สำหรับ change window นั้นโดยเฉพาะ

### NO-GO ทันทีเมื่อพบข้อใด

- มี `TEST`, TEST credential/state/URL หรือชื่อ account ไม่ชัดใน Production package
- ไม่มี authoritative source หรือมีข้อมูลหมดอายุ/ขัดกัน
- Reward economics/terms/expiry/cooldown/QR policy ยังไม่ลงนาม
- ไม่มี rollback owner, stable version หรือ rollback rehearsal
- ต้องเปิดเผย/ย้าย secret หรือใช้ customer data จริงเพื่อทดสอบ
- collision audit พบ native auto-response/Webhook อาจตอบซ้ำและยังไม่มีแผนแก้ที่อนุมัติ
- monitoring/incident owner ไม่พร้อมใน change window
- test สำคัญไม่ผ่าน, diff ไม่สะอาด หรือพบ secret/PII

**Owner decision OD-12:** `FINAL PLAN APPROVAL PENDING` — ยังไม่อนุญาต implementation หรือ external Production action

---

## สถานะต่อ GitHub Issues

Decision Pack นี้ช่วยปิดเฉพาะ **decision-design blocker** แต่ยังไม่ทำให้ Issue ปิด:

- Issue #8 คงเปิดจน Owner แนบ authoritative values/sources และ approved-only implementation/tests/UAT ผ่าน
- Issue #4 คงเปิดจน role/auth/monitoring/runbook/retention ถูก implement และ failure/rollback tests ผ่าน
- Issue #5 คงเปิดจน prerequisites, separate Production design, threat/privacy review, rollback rehearsal และ final go/no-go evidence ครบ

Owner baseline ถูกบันทึกใน `PRODUCTION_OWNER_DECISION_RECORD_2026-08-28_TH.md` และแผนเสนออยู่ใน `PRODUCTION_IMPLEMENTATION_ROLLOUT_ROLLBACK_PLAN_TH.md` Issues #4/#5/#8 ยังคงเปิดจน acceptance criteria จริงผ่านครบ

## หลักฐานความปลอดภัยของงานจัดทำ Pack

- อ่านเฉพาะ repository, GitHub Issues และ official public documentation
- ไม่เปิด LINE OA Production `มะลิปัง`
- ไม่ deploy และไม่เปลี่ยน Worker/Webhook/Rich Menu
- ไม่สร้างหรืออ่าน credential/secret/Reward Card/QR
- ไม่เข้าถึง customer, member, point, order หรือ payment data

Local verification วันที่ 28 สิงหาคม 2026:

- Formatting: PASS
- Node tests: 110/110 PASS
- Worker runtime tests: 8/8 PASS โดยไม่โหลด secret จริง
- รวม automated tests: 118/118 PASS
- Production readiness validator: PASS — expected `NO-GO`, 18 blockers recorded
- Secret scan: PASS — 104 files
- Dependency audit: ไม่พบ known vulnerabilities
- `git diff --check`: PASS
