# FAQ Knowledge Base Seed — รอเจ้าของอนุมัติ

เอกสารนี้เป็นโครงข้อความ ไม่ใช่ catalog ที่ publish ได้ ทุก record เริ่มสถานะ `DRAFT_OWNER_REVIEW` และห้ามส่งลูกค้าจน source fields ครบและอนุมัติ

| Intent              | ข้อความ seed สำหรับทบทวน                                                                        | แหล่งข้อมูลที่ต้องมี              |
| ------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- |
| menu                | `ดูเมนูที่อัปเดตได้จาก [ช่องทางที่อนุมัติ] ค่ะ หากสนใจรายการไหน บอกชื่อสินค้าได้เลยนะคะ`        | approved product catalog/menu URL |
| price               | `รบกวนแจ้งชื่อสินค้าและขนาดที่สนใจค่ะ จะได้ตรวจราคาปัจจุบันให้ถูกต้อง`                          | approved product catalog          |
| location            | `ร้านมะลิปังอยู่ที่ [สาขา/จุดสังเกตที่อนุมัติ] ค่ะ`                                             | approved branch catalog           |
| opening_pickup      | `สามารถรับสินค้าได้ช่วง [เวลาที่อนุมัติ] ที่ [สาขาที่อนุมัติ] ค่ะ`                              | branch hours/pickup policy        |
| storage_shelf_life  | `สำหรับ [สินค้า] แนะนำให้เก็บ [วิธีที่อนุมัติ] และรับประทานภายใน [ระยะเวลาที่อนุมัติ] ค่ะ`      | product safety owner              |
| wholesale           | `รับทราบค่ะ รบกวนแจ้งชนิดสินค้า จำนวน วันที่ต้องการ และช่องทางติดต่อ เพื่อให้พนักงานดูแลต่อค่ะ` | wholesale policy/owner            |
| promotion           | `[ข้อความโปรโมชั่นที่อนุมัติตรงตาม promotion catalog]`                                          | approved active promotion record  |
| loyalty             | `[ข้อความคะแนนสะสมที่ตรวจสอบและอนุมัติแล้ว]`                                                    | authoritative loyalty source      |
| availability_wait   | `[ข้อความรอที่เจ้าของอนุมัติ]`                                                                  | waiting/timeout policy            |
| availability_result | `ตรวจสอบเมื่อ [เวลา] แล้ว: [สินค้า] ที่ [สาขา] [สถานะ/จำนวนที่ยืนยัน] ค่ะ`                      | fresh staff confirmation          |
| handoff_ack         | `รับทราบค่ะ กำลังส่งเรื่องให้พนักงานดูแลนะคะ`                                                   | owner approval                    |
| clarification       | `ขอข้อมูลเพิ่มเติมอีกนิดได้ไหมคะ เช่น ชื่อสินค้าหรือวันที่ต้องการรับสินค้า`                     | owner approval                    |
| out_of_scope        | `เรื่องนี้ขอส่งให้พนักงานช่วยดูแลนะคะ`                                                          | escalation policy                 |
| payment_phase1      | `ตอนนี้ระบบยังไม่รับหรือยืนยันการชำระเงินอัตโนมัติค่ะ พนักงานจะเป็นผู้ตรวจสอบให้เท่านั้น`       | payment safety policy             |
| allergy             | `ข้อมูลสารก่อภูมิแพ้ต้องตรวจสอบตามสินค้านะคะ ขอส่งให้พนักงานยืนยันก่อนค่ะ`                      | approved allergen source          |

## Candidate intents จากหลักฐานรายงาน

Priority seed: menu, price, availability, location, opening/pickup, storage/shelf life, draft order, wholesale, promotion/loyalty และ human handoff คำถามเมนู/ราคาถูกจัดลำดับสูงเพราะ brief รายงานว่าพบประมาณ 30/40 conversations แต่ตัวเลขนี้ยังไม่ได้ตรวจจาก source document

## Review checklist ต่อ record

- intent และ branch/product scope ชัด
- ข้อความไทยพร้อมส่ง ไม่ใช้ศัพท์เทคนิค
- owner/source/effective period/review status ครบ
- ไม่มีราคาหรือข้อเสนอที่มาจากแชตเก่า
- ไม่มีการรับรอง stock/order/payment/allergy เกินหลักฐาน
- expired/unapproved record ไม่ถูกเลือก
