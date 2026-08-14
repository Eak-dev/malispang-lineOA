# Production mirror — redacted, reusable configuration only

โฟลเดอร์นี้เป็นหลักฐาน local ของการตรวจแบบ read-only และ safe Test mirror วันที่ 14 สิงหาคม
2026 ไม่ใช่ไฟล์สำหรับ deploy อัตโนมัติ

- `production-manifest.redacted.json`: สถานะ Production ที่ไม่เก็บ internal ID, credential หรือข้อมูลลูกค้า
- `test-configuration-manifest.json`: สถานะ TEST หลังการเปลี่ยนที่ได้รับอนุญาต
- `test-rich-menu-action-map.json`: geometry/action ของ local draft; `publishable` ต้องเป็น `false` จน owner decisions ครบ
- `CLASSIFICATION_AND_OWNER_DECISIONS_TH.md`: classification ทุกกลุ่มและ gate ที่ค้าง
- `ROLLBACK_TEST_MIRROR_TH.md`: วิธี rollback เฉพาะ TEST
- `HARMFUL_RULES_EVIDENCE_TH.md`: หลักฐานว่า global rule ที่เป็นอันตรายไม่ active

ไฟล์ใน `assets/` เป็น source evidence จาก Production OA:

- `source-menu-01..03.jpeg` มีรายการ ราคา และเบอร์ public ที่ยังไม่ผ่านการรับรอง ห้ามใช้เป็น current business data หรือ activate ใน TEST
- `source-rich-menu-rm-1.jpeg` มี reward/price/action ของ Production ใช้เป็น visual reference เท่านั้น

ไม่มีไฟล์ใดเก็บ token, secret, internal account ID, signed URL, customer identity, follower,
chat, order, slip, address หรือ payment data
