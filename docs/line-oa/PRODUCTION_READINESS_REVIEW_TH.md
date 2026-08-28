# Production-readiness review — มะลิปัง LINE OA

วันที่ตรวจ: 28 สิงหาคม 2026 (Asia/Bangkok)

โหมดการตรวจ: `READ_ONLY / REPOSITORY_AND_ISSUES_ONLY`

สถานะ: **NO-GO — ยังไม่พร้อมเปิดใช้กับ Production**

Owner บันทึก policy baseline แล้วใน `docs/line-oa/PRODUCTION_OWNER_DECISION_RECORD_2026-08-28_TH.md` และ map เข้ากับ OD-01 ถึง OD-12 ใน `docs/line-oa/OWNER_DECISION_PACK_PRODUCTION_TH.md` แผนที่ต้องอนุมัติรอบสุดท้ายอยู่ใน `docs/line-oa/PRODUCTION_IMPLEMENTATION_ROLLOUT_ROLLBACK_PLAN_TH.md` การอนุมัติ baseline ไม่ใช่สิทธิ์เปลี่ยน Production

## ขอบเขตและหลักฐาน

การตรวจครั้งนี้อ่านเฉพาะ repository, GitHub Issues และเอกสารสาธารณะของ LINE/Cloudflare ไม่ได้เปิดบัญชี Production `มะลิปัง`, LINE OA Manager, LINE Developers Console หรือ Cloudflare dashboard และไม่ได้ deploy, เพิ่ม secret, สร้าง Reward Card, เปลี่ยน Rich Menu/Webhook หรือส่งข้อความ

หลักฐานที่ใช้:

- Git HEAD ก่อนเริ่มตรวจ: `3c05a676663b7cc4a4096bad4de6449206f86b07`
- TEST Worker code deployment: commit `9dd3c88e2e3aeed7253ffb90501822f2f5f870b6`, version `59674297-4c83-4f8e-8460-dcd001c6f0c5`
- TEST configuration manifest: `docs/line-oa/production-mirror/test-configuration-manifest.json`
- TEST Reward Card UAT: `docs/line-oa/REWARD_CARD_TEST_UAT_TH.md`
- TEST Rich Menu manifest: `docs/line-oa/RICH_MENU_TEST_MANIFEST_TH.md`
- Deployment/rollback: `docs/line-oa/TEST_PHASE_1A_DEPLOYMENT_TH.md` และ `docs/line-oa/production-mirror/ROLLBACK_TEST_MIRROR_TH.md`
- GitHub Issues: #1 และ #3 ปิดเฉพาะงาน TEST; #4, #5, #8 และ roadmap #9 ยังเปิด

Production manifest ที่มีอยู่ถูก capture เมื่อ 14 สิงหาคม 2026 และใช้เป็น historical/redacted reference เท่านั้น ไม่ถือเป็นหลักฐานว่าสถานะ Production วันที่ตรวจนี้ยังเหมือนเดิม การยืนยัน live configuration ต้องเป็น read-only audit ที่ได้รับอนุมัติแยกต่างหาก

## สิ่งที่พร้อมจาก TEST

| หัวข้อ             | หลักฐาน                                                                                       | Readiness                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Signature boundary | HMAC-SHA256 และ constant-time comparison ใน `worker/security.ts`; invalid signature test      | พร้อมเป็น pattern แต่ยังผูกกับ TEST guard                  |
| Account safety     | ปฏิเสธ environment ที่ไม่ใช่ `TEST`, ชื่อบัญชีไม่ใช่ `มะลิปัง TEST` หรือมี Production binding | PASS สำหรับ TEST; ตั้งใจใช้กับ Production ไม่ได้           |
| Duplicate event    | Durable Object เก็บ processed event 24 ชั่วโมงและไม่ตอบซ้ำหลังส่งสำเร็จ                       | PASS สำหรับ TEST                                           |
| Human handoff      | acknowledgement ครั้งเดียว, bot silence, authenticated staff-close                            | PASS ใน TEST; role/lifecycle ของ Production ยังไม่อนุมัติ  |
| Fail closed        | ข้อมูลเสี่ยง/ไม่ทราบส่ง handoff/fallback; storage/secret/config ผิดหยุดตอบ                    | PASS สำหรับ TEST                                           |
| Redacted audit     | เก็บ hash reference, outcome/reason code; ไม่เก็บ raw message/slip/token                      | PASS ระดับ Phase 1A TEST                                   |
| Persistence        | Durable Objects with SQLite; event/audit retention 24 ชั่วโมง/7 วัน                           | PASS สำหรับ TEST; ห้าม reuse namespace/state ใน Production |
| Rich Menu/Flex     | bounds/action validators และ Owner live UAT ผ่าน                                              | PASS สำหรับ TEST เท่านั้น                                  |
| Reward Card        | บัตร TEST แยก, URL อยู่ encrypted secret, live UAT เพิ่ม 1 แต้มผ่าน                           | PASS สำหรับ TEST เท่านั้น                                  |

## เหตุผลที่ยังเป็น NO-GO

1. โค้ดปัจจุบัน hard-fail เมื่อ environment ไม่ใช่ TEST และใช้ชื่อ secret/action/copy ที่เป็น TEST โดยตรง จึงห้าม deploy ชุด config นี้เป็น Production
2. FAQ ราคา 39 บาท, ที่ตั้ง, เวลา และการเก็บรักษายังติด `TEST_SEED`; Issue #8 ยังเปิดและยังไม่มี authoritative source พร้อม owner/effective/review dates
3. Preconditions ของ Issue #5 ยังไม่ครบ: Issue #4, #6, #7, #8 และ roadmap phases ที่เกี่ยวข้องยังเปิด
4. ยังไม่มี Production Reward Card ที่แยกจาก TEST ซึ่งถูกต้องตาม safety boundary แต่ยังไม่มี Owner approval ครบทุกค่าก่อน Publish
5. ยังไม่มี Production Worker/config/secrets/Durable Object namespaces/Channel binding ที่แยกเด็ดขาด และยังไม่มี production-specific threat model/data-flow/privacy approval
6. Rollback ที่มีเป็น TEST runbook; ยังไม่มีหมายเลข stable Production Worker version, current Production Rich Menu snapshot, rollback owner หรือเวลาตัดสินใจ
7. Worker audit log ไม่เห็นการสแกน Reward Card QR เพราะเป็น native LINE flow จึงต้องกำหนดแหล่ง audit, ผู้ตรวจ และ retention แยก
8. การเปิด Production webhook หรือ default Rich Menu มีโอกาสกระทบผู้ใช้ทุกคน ไม่สามารถอ้างว่าเป็น owner-only UAT ได้โดยไม่มี canary/allowlist และ privacy approval

## แผนแยก Production อย่างเด็ดขาด

ต้องสร้างภายหลังเฉพาะเมื่อ Owner อนุมัติเป็นรายขั้น:

- Reward Card ใหม่ใต้บัญชี `มะลิปัง` เท่านั้น ห้าม copy card, member, points, QR, voucher หรือ URL จาก TEST
- Worker ชื่อ Production ที่ Owner อนุมัติ แยกจาก `malispang-lineoa-test`; ห้าม rename/reuse Worker TEST
- LINE Provider/Channel credential ของ Production แยกจาก TEST และตรวจ destination/account binding ก่อน outbound ทุกครั้ง
- Durable Object namespaces และ admin credential แยก ไม่ transfer/reuse TEST state
- Production config ต้องใช้ authoritative business data เท่านั้นและไม่มี `TEST_SEED`, `test:` action หรือข้อความ `บัตรแต้ม TEST`
- Rich Menu Production ใหม่หรือ versioned draft ต้องมี manifest/hash/action map ของตัวเอง ห้ามสลับ default จน UAT gate ผ่าน
- Reward Card URL ใช้ secret ชื่อที่แยกชัดเจน เช่น `PRODUCTION_REWARD_CARD_URL` ใน Production Worker เท่านั้น ห้ามเก็บใน Git, `.env`, log, screenshot หรือเอกสาร และห้ามใช้ `TEST_REWARD_CARD_URL`

Cloudflare ระบุว่า secrets เป็น encrypted bindings และไม่ควรใช้ plaintext vars/source สำหรับข้อมูลลับ ทั้งนี้ `wrangler secret put` จะสร้างและ deploy Worker version ทันที ดังนั้นการเพิ่ม Production URL ต้องอยู่ใน approved change window และถือเป็น external deployment ไม่ใช่ขั้นเตรียมแบบ read-only:

- <https://developers.cloudflare.com/workers/configuration/secrets/>

## Production Reward Card approval gate

Owner อนุมัติ policy baseline แล้ว แต่ยังไม่อนุญาต implementation และยังต้องผ่าน technical feasibility/final action-time approval:

| Decision           | TEST evidence                          | Production status                                                               |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------- |
| อัตราแต้ม          | 50 บาท = 1 แต้ม                        | `APPROVED_BASELINE` — net after discount, floor                                 |
| เป้าหมาย           | 50 แต้ม                                | `APPROVED_BASELINE` — ยอดซื้อสะสม 2,500 บาท                                     |
| รางวัล/Voucher     | TEST ไม่มีมูลค่า                       | `APPROVED_BASELINE` — `ตุ๊กตามะลิจัง 1 ตัว`, COGS ≤25 บาท; terms บางข้อรอ Owner |
| Welcome bonus      | 0                                      | `APPROVED_BASELINE` — 0                                                         |
| Reminder           | None                                   | `APPROVED_BASELINE` — None ในรอบแรก                                             |
| Cooldown           | วันละครั้ง reset 00:00                 | `APPROVED_POLICY` — Production ไม่มี daily cooldown; รอตรวจ LINE feasibility    |
| วันหมดอายุบัตร     | TEST เป็น No expiration + manual close | `APPROVED_POLICY` — 12 เดือนนับจากวันรับ; รอตรวจ rolling-expiry feasibility     |
| วันหมดอายุ Voucher | TEST non-expiring                      | `APPROVED_BASELINE` — 60 วันหลังได้รับ                                          |
| การปิด/ระงับบัตร   | TEST ต้องปิดภายใน 31 ธ.ค. 2026         | `PENDING` — ต้องมี exact reversible/irreversible runbook ก่อนสร้างจริง          |

ก่อน Publish ต้องตรวจ preview/terms รอบสุดท้าย เพราะ LINE ระบุว่าบัตร/บัตรรางวัลที่ผู้ใช้รับแล้วและ Voucher ที่ตั้งค่าหรือรับแล้วมีข้อจำกัดการแก้ไข:

- <https://help2.line.me/official_account_th/ios/categoryId/20006372/pc?lang=th>

## QR ให้แต้มและ audit

แผนขั้นต่ำที่แนะนำสำหรับ Production:

1. Owner อนุมัติผู้มีสิทธิ์สร้าง/แสดง QR และผู้ตรวจ audit; ใช้ least privilege และห้ามแชร์ account
2. ใช้ **One Time QR Code** จาก LINE OA Manager app สำหรับการให้แต้มแบบพนักงานต่อรายการเมื่อทำได้ เพราะ LINE ระบุว่าเป็น QR ใช้ครั้งเดียว; ห้ามพิมพ์หรือส่ง screenshot
3. หากจำเป็นต้องใช้ printable QR ต้องขอ Owner approval แยก กำหนด point value, ชื่อ QR, สาขา/จุดใช้งาน, activation/expiration สั้นที่สุดที่ธุรกิจรองรับ และเลิกใช้ทันทีเมื่อจบรอบ ห้ามถือว่า cooldown เท่ากับ one-time protection
4. Production policy คือ One Time QR ต่อใบเสร็จ อายุ 10 นาที และจำนวนแต้มตาม `floor(ยอดสุทธิ/50)`; ต้องพิสูจน์ว่า LINE UI รองรับก่อนสร้าง ห้ามลดเหลือ 1 แต้มเอง
5. Production ไม่มี daily cooldown; ต้องตรวจข้อจำกัด native และ timezone แบบ read-only ก่อนเปิดใช้ ห้ามยึดค่าของ TEST
6. บันทึกเฉพาะ QR reference/name, point value, operator role, created/expires/disabled timestamps และผลรวม ไม่บันทึก QR image/value, customer ID, ชื่อ, เบอร์ หรือข้อความ
7. Native scan/point history ต้องตรวจผ่าน LINE OA Insights/Reward Card ด้วยผู้มีสิทธิ์เท่านั้น; Worker audit ไม่สามารถใช้แทน native loyalty audit
8. Retention baseline คือ Worker logs 7 วัน, reconciliation 90 วัน และ config/incident 365 วัน; storage/export, reviewer และ access lifecycle ยังต้องอนุมัติก่อน implementation

LINE ระบุช่องทางให้แต้มเป็น One Time QR บนแอปหรือ printable QR ที่ต้องเปิดใช้แยก:

- <https://help2.line.me/official_account_th/ios/categoryId/20006372/pc?lang=th>

## Deployment และ rollback gate

ลำดับที่ย้อนกลับได้มากที่สุด:

1. Freeze commit และบันทึก hash ของ code/assets/manifests
2. สร้าง Production config/Worker/storage แยกโดยยังไม่เชื่อม LINE webhook และไม่ตั้ง Rich Menu เป็น default
3. รัน local/integration/dry-run/security/dependency tests; Production guard ต้อง reject TEST channel และ TEST secrets
4. สร้าง Production Reward Card หลัง approval ครบ แต่ยังไม่แจก URL สาธารณะ
5. เก็บ URL ใน encrypted Production secret ภายใน approved change window
6. Verify endpoint และ signature โดยไม่ส่งข้อความลูกค้า จากนั้นตรวจ native auto-response collision แบบ read-only
7. ทำ controlled UAT ตามแผนด้านล่าง
8. เชื่อม Rich Menu/Webhook ทีละอย่าง มี observation window และ rollback owner พร้อม

Rollback order ที่ต้องอนุมัติก่อน rollout:

1. ปิด `Use webhook` ของ Production เพื่อหยุด event ใหม่
2. Unset/คืน Rich Menu default ไป version ที่บันทึกไว้
3. Rollback Worker ไป stable version ที่บันทึกและทดสอบแล้ว
4. ตรวจ native auto-response/manual chat หลัง rollback ว่าไม่ตอบซ้ำหรือเงียบผิดปกติ
5. Revoke/rotate token หรือ Reward URL เฉพาะเมื่อรั่ว/ผิด binding; การ rotate เป็น incident action แยก

Cloudflare rollback ทำให้ version เป้าหมาย active ทันที แต่ **ไม่ย้อน storage resources/state** และอาจ rollback ข้าม Durable Object lifecycle change ไม่ได้ จึงต้อง freeze schema, ทดสอบ backward compatibility และมี state-reconciliation plan:

- <https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>
- <https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/>

## Production UAT ที่ลดผลกระทบลูกค้าจริง

ยังไม่อนุญาตให้ทำตามแผนนี้; เป็น proposal รอ Owner approval:

1. **Offline gate:** fixtures, invalid/valid signature, destination guard, duplicate/retry, handoff silence, storage failure และ rollback rehearsal ผ่านทั้งหมด
2. **Reward Card private gate:** ยังไม่ผูก Rich Menu; ส่ง URL แบบ private ให้ owner tester เพียงรายเดียว รับบัตรและใช้ One Time QR 1 แต้ม แล้วตรวจ native audit โดยไม่เปิด customer list
3. **Webhook shadow/canary gate:** Production Worker ต้องมี hashed owner-tester allowlist จาก encrypted configuration; event นอก allowlist ไม่ตอบและไม่เขียน conversation state แต่การเปิด webhook ยังทำให้ระบบรับ identifier ของลูกค้าจริง จึงต้องมี privacy approval ก่อน
4. **Rich Menu gate:** สร้าง draft/preview ก่อน ห้ามตั้ง default จน owner tester ผ่านทุก action และตรวจว่าไม่มี Production-only/expired URL
5. **Controlled activation:** ระบุวันที่ เวลา ผู้กด ผู้เฝ้าระวัง success/error/duplicate metrics และ rollback owner; หลีกเลี่ยงช่วงลูกค้าใช้งานสูง
6. **Acceptance:** ไม่มี duplicate, handoff silence ถูกต้อง, native/manual response ไม่ชน, Reward Card/QR/audit ถูกต้อง และ rollback rehearsal ผ่าน

หาก LINE OA ไม่สามารถจำกัด webhook/Rich Menu ให้ owner tester เท่านั้น การ live UAT บน Production จะไม่ใช่ zero-customer-impact และต้องหยุดรอ Owner ยอมรับความเสี่ยงพร้อม maintenance window แยก ห้ามอ้างผล TEST แทน

## Owner decisions/หลักฐานที่ยังต้องปิดก่อนเริ่ม Production

1. Voucher redemption/stacking/refund terms และยืนยัน COGS `ตุ๊กตามะลิจัง 1 ตัว` ไม่เกิน 25 บาท
2. Authoritative values/sources ของ location, storage, allergen, wholesale, advance order และ Delivery/pickup พร้อม owner/review dates
3. ชื่อ Production Worker/config, LINE Channel binding และการแยก Durable Object namespaces/secrets
4. Production Rich Menu image/actions/display period/chat-bar label และ current-menu rollback target
5. หลักฐานว่า LINE รองรับ rolling card expiry, One Time QR 10 นาที, multi-point QR และ native adjustment/audit ตาม policy
6. Native loyalty audit owner, retention, access review และ incident escalation
7. Staff allowlist/admin auth lifecycle, rotation/revocation และ authorized close roles
8. Monitoring/sampling thresholds, acknowledgement time, backup operator และ rollback execution authority
9. Production tester allowlist/privacy basis และ controlled activation window
10. Exact response-mode/auto-response changes ที่อนุญาต เพื่อป้องกัน native/Webhook collision
11. Token type/least privilege, secret custody และ rotation/revocation owner
12. Exact rollout date/time/executors/stable targets/maximum rollback time และ final go/no-go หลัง Issue #4/#5/#8 ผ่านครบ

## Read-only review conclusion

TEST Rich Menu, customer-response, handoff และ Reward Card flow มีหลักฐาน UAT ที่ดี และ Production policy baseline ได้รับอนุมัติแล้ว แต่สถานะ Production ณ 28 สิงหาคม 2026 ยังเป็น **NO-GO** จน technical feasibility, authoritative data, separate Production architecture/configuration, operations/audit details, tested rollback และ final Owner approval ผ่านครบ

## ผลการตรวจแบบไม่เปลี่ยนระบบภายนอก

รันจาก branch `codex/phase-1a-foundation` วันที่ 28 สิงหาคม 2026:

- Prettier formatting: PASS
- ESLint: PASS
- TypeScript (application + Worker): PASS
- Node tests: 85/85 PASS
- Worker runtime tests: 8/8 PASS
- รวม automated tests: 93/93 PASS
- Build: PASS
- Flex validation: PASS
- Rich Menu validation: PASS — 6 areas, `2500 × 1686`, 421,467 bytes, ไม่มี gap/overlap/out-of-bounds
- Local Flex/Rich Menu previews: generated successfully
- Wrangler deployment dry-run: PASS; แสดงเฉพาะ Worker `malispang-lineoa-test` และ TEST bindings; **ไม่มี deploy**
- Secret scan: PASS — 87 files, ไม่พบค่าความลับจาก pattern ที่กำหนด
- Dependency audit: PASS — ไม่พบ known vulnerability ระดับที่ตรวจ
- `git diff --check`: PASS

คำเตือนจาก Worker test เรื่อง required secrets ที่ไม่มีใน local test process เป็น expected fail-closed configuration; tests ผ่านโดยไม่โหลดค่าจริงจาก Keychain/Cloudflare และไม่มีค่า secret ถูกอ่านหรือแสดง
