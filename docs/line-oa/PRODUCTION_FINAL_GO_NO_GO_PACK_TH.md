# Final Production Go/No-Go Pack — มะลิปัง

จัดทำ: 28 สิงหาคม 2026 (Asia/Bangkok)

## Final decision

**NO-GO สำหรับการแตะ Production ณ commit ของ package นี้**

Local implementation, tests, manifests และ runbooks พร้อมสำหรับ review แต่ Loyalty และ customer-response Production ยังเปิดไม่ได้เพราะมี blockers ที่ต้องใช้หลักฐานจริงหรือ read-only Production capture ซึ่ง Codex ห้ามเดาและงานรอบนี้ห้ามเปิด Production

## Conditional execution result — 28 สิงหาคม 2026

Owner อนุมัติ conditional execution จาก frozen commit นี้แล้ว การตรวจ Production แบบ read-only ผ่าน identity/COGS gates แต่พบ mandatory gate failures จึงหยุดก่อน external write และสถานะยัง **NO-GO** ดู `PRODUCTION_EXECUTION_GATE_RESULT_2026-08-28_TH.md`

- COGS: ปิดด้วย Owner attestation ว่าต้นทุนรวมไม่เกิน 25 บาท โดยไม่บันทึกค่าจริง
- Rolling expiry: UI แสดง 1 ปีจาก first use แต่ยังไม่ยืนยันว่าเท่ากับวันที่รับบัตรตาม policy
- ยัง block: native QR 10 นาที, multi-point One Time QR, Voucher 60 วัน
- บัตร Published เดิมขัด policy เพราะชื่อ main reward ไม่ตรง exact approved, มี additional reward ที่ 30 แต้มและ Reminder 2 สัปดาห์
- activation/deploy/live UAT/T+monitoring ไม่เริ่ม; before/after state ตรงกัน

## สิ่งที่พร้อม

- deterministic loyalty policy: 50 บาทสุทธิหลังส่วนลด = 1 แต้มแบบ floor, เป้าหมาย 50 แต้ม/2,500 บาท
- exact reward `ตุ๊กตามะลิจัง 1 ตัว`; validator ห้ามรางวัลกว้างและเพดาน COGS 25 บาท
- receipt/QR eligibility, 10-minute target model, duplicate prevention และ Owner-only refund reconciliation
- Owner/Shift lead QR allowlist แบบไม่ขยายหลังวัน 30 โดยอัตโนมัติ
- authoritative manifest schema/lookup ที่ตอบเฉพาะ `APPROVED` current version และ fail closed ต่อ TEST/stale/conflict/missing data
- Production configuration, secret inventory names-only, role matrix, monitoring thresholds, stable-version placeholder และ rollback/reconciliation runbook
- TEST Worker/code/config ไม่ถูกเปลี่ยน behavior และไม่มี Production path ถูกเปิด

## Blocking gates

| Blocker                                   | ผลกระทบ                                               | Fallback ที่เลือก                                |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| COGS                                      | `CLOSED_BY_OWNER_ATTESTATION`                         | ไม่บันทึกตัวเลขต้นทุนจริง                        |
| Rolling expiry                            | `NOT_VERIFIED` — first use อาจไม่เท่ากับวันที่รับบัตร | ไม่เปลี่ยน customer terms เอง                    |
| `LINE_QR_TTL_BLOCKER`                     | ไม่พิสูจน์ native QR 10 นาที                          | ไม่ใช้ printable/manual promise แทน; Loyalty OFF |
| `LINE_MULTI_POINT_QR_BLOCKER`             | TEST พิสูจน์เพียง 1 แต้ม                              | ไม่ออกหลาย QR ต่อบิล; Loyalty OFF                |
| `LINE_VOUCHER_EXPIRY_BLOCKER`             | ไม่พิสูจน์ Voucher 60 วัน                             | ไม่ Publish Voucher                              |
| Authoritative data 9 หมวด                 | ไม่มี current approved Production records ครบ         | ไม่ตอบหมวดนั้น; safe fallback/human review       |
| Production resource/stable target capture | ไม่ได้เปิด Production ตามข้อห้าม                      | ห้าม deploy/connect/rollout                      |
| Worker Logs 7 วัน                         | ยังไม่ยืนยัน Production plan/cost                     | ห้าม activation จน retention gate ผ่าน           |
| Rollback rehearsal                        | ยังไม่มี isolated Production-shaped resources         | ห้าม activation                                  |
| Final Owner GO                            | ยังไม่มี approval ต่อ frozen execution package        | ห้าม external action                             |

## Combined Owner approval inputs

Owner สามารถตัดสินครั้งเดียวหลังแนบ/ยืนยันครบ:

1. landed-cost evidence หรือ accounting attestation ว่าตุ๊กตามะลิจังรวมต้นทุนจริงไม่เกิน 25 บาท
2. read-only LINE capability evidence ว่ารองรับ rolling 12 เดือน, Voucher 60 วัน, One Time QR 10 นาทีและจำนวนแต้มตามยอดใน QR เดียว
3. business manifest version ที่ทุกหมวดใน customer-facing scope เป็น `APPROVED`; หมวดที่ไม่อนุมัติต้องถูกตัดออกและ fail closed
4. exact Production account/channel/resource identities และ stable Worker/Rich Menu/response snapshots โดยไม่เปิดเผย secret
5. Cloudflare plan/storage design ที่ทำ retention 7/90/365 วันได้โดยไม่มีค่าใช้จ่ายใหม่ที่ไม่ได้อนุมัติ
6. named individual allowlists สำหรับ Owner, Technical operator, Shift lead, backup และ auditor ใน encrypted configuration
7. frozen commit/hashes, rollback rehearsal result และ event-based 30-minute window

## Exact combined approval wording

```text
Owner ตรวจ Final Production Go/No-Go Pack ของมะลิปังจาก commit <FROZEN_COMMIT> แล้ว
ยืนยันว่า COGS, LINE capability, authoritative manifest, resource identities, retention และ rollback evidence ที่แนบผ่านทุก gate
อนุมัติให้ Technical operator ดำเนิน Production execution ตามลำดับใน Pack นี้เฉพาะบัญชี “มะลิปัง”
ภายใน event-based 30-minute low-traffic window โดย Owner อยู่หน้างาน, Shift lead คุม QR/reconciliation,
ใช้ frozen commit/targets ที่ระบุ และ rollback ภายใน 5 นาทีเมื่อ threshold ใดถึง
ห้าม reuse TEST credential/state/card/QR/customer data และห้ามขยาย scope นอก change package
```

หากหลักฐานข้อใดไม่ครบ ข้อความอนุมัตินี้ไม่มีผลและสถานะคง `NO-GO`

## Production execution plan หลัง GO เท่านั้น

1. ยืนยันชื่อ account/resource และ capture before-state/read-only stable targets
2. ตรวจ frozen hashes, all gates, allowlists, dashboards และ rollback readiness ที่ T-30
3. สร้าง/ตั้งค่า Production resources แยกจาก TEST ตาม exact approved change package
4. ตั้ง encrypted bindings โดยไม่แสดงค่า; verify signature/destination แบบไม่ส่งข้อความลูกค้าก่อน
5. สร้าง Reward Card draft ให้ตรง capability/COGS/business terms; Owner ตรวจ preview ก่อน Publish ตาม scope ที่อนุมัติ
6. ทดสอบ owner-controlled path; เปิด webhook/Rich Menu ทีละรายการและตรวจ collision
7. Checkpoints T+5/T+15/T+30; Owner GO/rollback; observation 120 นาที
8. Reconcile QR/points และบันทึก redacted evidence

## Rollback summary

1. Shift lead หยุด QR; Owner ประกาศ STOP
2. Technical operator disable automation ภายใน 5 นาที
3. restore Rich Menu/response targets และ stable Worker
4. ตรวจ manual customer-service path และไม่มี duplicate
5. reconcile storage/points แยก; code rollback ไม่ย้อน storage
6. Reward Card suspension เป็น irreversible emergency action และต้อง Owner ยืนยัน ณ เวลานั้น

## Issue status

- #4 `OPEN`: local roles/thresholds/runbook พร้อม แต่ identities, platform retention และ failure rehearsal ยังขาด
- #5 `OPEN`: package พร้อมแต่ current decision คือ NO-GO
- #8 `OPEN`: manifest/fail-closed implementation พร้อม แต่ authoritative values ทั้ง customer-facing scope ยังขาด
- #9 `OPEN`: Roadmap ยังไม่อนุมัติ Production และ phases ที่เกี่ยวข้องยังเปิด

## Automated and security evidence

- Formatting/Prettier: PASS
- ESLint: PASS
- TypeScript application + Worker: PASS
- Node unit/integration/regression tests: 110/110 PASS
- Worker runtime/Durable Object tests: 8/8 PASS
- รวม: 118/118 PASS, 0 fail
- Build, Flex validation และ Rich Menu validation: PASS
- Production readiness validator: PASS — current expected `NO-GO`, 18 evidence blockers recorded
- Wrangler types: current; deployment dry-run: PASS เฉพาะ Worker TEST, ไม่มี deploy
- Secret scan: PASS — 104 files
- Dependency audit: ไม่พบ known vulnerability ระดับที่ตรวจ
- `git diff --check`: PASS

## Safety attestation

- Production `มะลิปัง` ไม่ถูกเปิด ตรวจ live หรือเปลี่ยน
- ไม่มี deploy, Reward Card, QR, Worker/Webhook/Rich Menu หรือ secret action
- ไม่มี Users, customer chat, usage history หรือข้อมูลลูกค้า Production ถูกเข้าถึง
- ไม่มี URL, QR, token, credential หรือ secret value ใหม่ถูกเพิ่มใน repository; แหล่งเอกสารสาธารณะระบุด้วยชื่อเอกสารและวันที่ตรวจเท่านั้น
