# LINE Reward Card capability evidence — Production readiness

ตรวจเมื่อ: 28 สิงหาคม 2026 (Asia/Bangkok)

สถานะ: `READ_ONLY_EVIDENCE_REVIEW / LOYALTY_PARTIAL_NO-GO`

การตรวจนี้ใช้เอกสารทางการ LINE และหลักฐาน TEST ใน repository เท่านั้น ไม่ได้เปิดบัญชี Production `มะลิปัง`

## ผลตรวจ

| ความสามารถที่ต้องใช้                  | เอกสารทางการ                                                                                                            | หลักฐาน `มะลิปัง TEST`                            | ผลตัดสิน Production                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| One Time QR                           | LINE ระบุว่าแสดง One Time QR ผ่านแอป Manager และ QR ชนิดนี้พิมพ์ไม่ได้                                                  | Owner สแกน QR TEST และแต้มเพิ่ม 1 สำเร็จ          | `SUPPORTED` เฉพาะการมี One Time QR           |
| QR อายุ 10 นาที                       | หน้าช่วยเหลือที่ตรวจไม่ระบุการตั้ง TTL ระดับนาที                                                                        | QR UAT ที่บันทึกมี expiry วันถัดไป ไม่ใช่ 10 นาที | `NOT_VERIFIED / LINE_QR_TTL_BLOCKER`         |
| หลายแต้มใน One Time QR เดียว          | หน้าช่วยเหลือที่ตรวจไม่ระบุ point value ต่อ One Time QR                                                                 | TEST พิสูจน์เพียง 1 แต้ม                          | `NOT_VERIFIED / LINE_MULTI_POINT_QR_BLOCKER` |
| อายุบัตร 12 เดือนนับจากวันรับรายบุคคล | LINE ระบุเพียงว่าบัตรมีแบบหมดอายุ/ไม่หมดอายุ และการแก้บัตรที่ผู้ใช้รับแล้วมีข้อจำกัด ไม่ยืนยัน rolling expiry ต่อผู้รับ | TEST ใช้ `No expiration`                          | `NOT_VERIFIED / LINE_ROLLING_EXPIRY_BLOCKER` |
| Voucher อายุ 60 วันหลังได้รับ         | เอกสารที่ตรวจไม่ยืนยันวิธีตั้ง rolling Voucher expiry                                                                   | TEST Voucher ไม่หมดอายุ                           | `NOT_VERIFIED / LINE_VOUCHER_EXPIRY_BLOCKER` |

แหล่งหลัก:

- LINE Official Account Help — หมวดบัตรสะสมแต้ม (ตรวจ 28 สิงหาคม 2026)
- TEST evidence: `docs/line-oa/REWARD_CARD_TEST_UAT_TH.md`
- TEST manifest: `docs/line-oa/production-mirror/test-configuration-manifest.json`

## Fallback ที่เลือก

1. ใช้เฉพาะ native One Time QR; printable/static QR ถูกปฏิเสธเพราะขัดนโยบายหนึ่งใบเสร็จ/ใช้ครั้งเดียวและเสี่ยงแชร์
2. ระบบ local บังคับ target 10 นาทีและ receipt dedupe ได้ แต่ไม่อ้างว่าสามารถทำให้ native LINE QR หมดอายุใน 10 นาทีจริง
3. ห้ามแก้ด้วยการออก One Time QR หลายใบต่อหนึ่งใบเสร็จ เพราะขัด policy และเพิ่ม fraud/operational risk
4. ห้ามแปลง rolling 12 เดือนเป็นวันหมดอายุคงที่หรือ `No expiration` โดยพลการ
5. ห้าม Publish Production Reward Card จน read-only Production UI review ยืนยันทั้ง rolling card expiry, 10-minute QR, multi-point QR และ 60-day Voucher expiry
6. หาก LINE ไม่รองรับข้อใดจริง ให้คง Loyalty `NO-GO` และนำตัวเลือกที่เปลี่ยน customer terms กลับให้ Owner อนุมัติ; ระบบตอบข้อความส่วนที่ไม่ใช่ loyalty สามารถพิจารณาแยกได้เมื่อผ่าน gate ของตน

## ข้อจำกัดการ rollback ของ LINE

LINE ระบุว่าการระงับบัตรไม่สามารถยกเลิก, แต้ม/การตั้งค่าถูกรีเซ็ต และกู้คืนไม่ได้ ดังนั้น `Suspend card` ไม่ใช่ rollback ปกติและต้องเป็น emergency action ที่ Owner ยืนยันแยก ณ เวลาดำเนินการ ห้ามใช้เป็นขั้นทดลอง
