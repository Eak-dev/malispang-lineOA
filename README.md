# MalisPang LINE OA

ระบบ LINE Official Account ของร้านมะลิปังสำหรับบริการลูกค้าแบบ TEST-first โดยใช้ deterministic policy เป็นผู้ตัดสินสุดท้าย และใช้ AI/NLU เป็นเพียงตัวช่วยตีความข้อความภาษาไทย

> **สถานะสำคัญ:** โครงการยังอยู่ใน TEST, Issue #12 ยัง OPEN และ Production ยังเป็น **NO_GO — NOT TOUCHED**  
> README นี้เป็นเอกสารสรุปเพื่อการเริ่มงานเท่านั้น ไม่ใช่แหล่งให้สิทธิ์แก้โค้ด, deploy, เปิด session, rollback, merge หรือใช้งาน Production

## Source of truth

ก่อนเริ่มงานทุกครั้งต้องอ่านและตรวจข้อมูลจากแหล่งต่อไปนี้ตามลำดับ:

1. [AGENTS.md](AGENTS.md) — กฎความปลอดภัยและ Roadmap discipline
2. [PROJECT_CONTROL.md](PROJECT_CONTROL.md) — control version และข้อจำกัดปัจจุบัน
3. [config/project/roadmap.json](config/project/roadmap.json) — Roadmap แบบ machine-readable
4. [config/project/current-work.json](config/project/current-work.json) — work package และ authorization ปัจจุบัน
5. [Roadmap #9](https://github.com/Eak-dev/malispang-lineOA/issues/9)
6. [MP-06 / Issue #12](https://github.com/Eak-dev/malispang-lineOA/issues/12)

หาก README ขัดกับแหล่งข้างต้น ให้ยึด project control และหยุดตรวจสอบความขัดแย้ง ห้ามใช้ README เพื่อ self-authorize งาน

## สถานะโครงการล่าสุด

Snapshot นี้อ้างอิงข้อมูลที่ commit แล้วบน branch `codex/mp-06-guardrailed-ai` ณ 9 กันยายน 2026

| รายการ                               | สถานะ                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| Current work                         | MP-06 / Issue #12 / WP8F TEST acceptance completion                |
| Committed control                    | `2026.09.09-v18`                                                   |
| Evidence anchor ก่อนการอัปเดต README | `42026b22069e4299dfc8ff5f73b5077e3b0856fb`                         |
| Runtime candidate                    | `c59eb5e12bb96a34da38759a5585be67d8c2ab6e`                         |
| Candidate artifact SHA-256           | `2203b6459174b54064142a391e778624c650b3d01e7e48f0a0d46df702c38308` |
| Candidate TEST deployment            | **NOT PERFORMED — 0/1**                                            |
| Persistent deployment control        | v19 ยังต้องสร้าง, validate, commit และ push ก่อน deploy            |
| Issue #12                            | **OPEN**                                                           |
| PR / merge                           | ยังไม่มีและยังไม่ได้รับอนุญาต                                      |
| Production                           | **NO_GO — NOT TOUCHED**                                            |

การอัปเดต README เป็น documentation-only commit ไม่เปลี่ยน runtime candidate หรือ artifact ข้างต้น และไม่ทำให้ v19 มีผลโดยอัตโนมัติ

### TEST ที่ใช้งานอยู่ก่อน candidate deployment

Fresh read-only observation ล่าสุดที่บันทึกไว้: 9 กันยายน 2026 เวลา 08:01:36 น. (Asia/Bangkok)

| รายการ                       | ค่าที่ตรวจพบ                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| Worker                       | `malispang-lineoa-test`                                            |
| Active version               | `8486019d-9b62-4de9-ae15-6299909a23d9`                             |
| Deployed source              | `8a5b6547b4713ff50ad6b08ee58682e129641b6a`                         |
| Deployed artifact            | `15680c5cecc85203ef9adcc4e8c519a5c22b0d50e83e451ffc4e0133a6574c64` |
| Traffic                      | 100%                                                               |
| Bot model                    | `gpt-5.6-terra`                                                    |
| AI admission / pilot         | OFF / STOPPED                                                      |
| Events / provider attempts   | 6 / 6                                                              |
| Consumed / reserved          | 34,082 / 0 micro-USD                                               |
| In-flight / pending attempts | 0 / 0                                                              |
| Owner conversation           | HUMAN_HANDOFF                                                      |
| Draft                        | EXPIRED_PURGED, non-blocking                                       |
| Historical provider billing  | UNKNOWN                                                            |

Snapshot เป็นหลักฐาน ณ เวลาที่ระบุ ไม่ใช่ continuous monitoring และต้องตรวจ fresh state ใหม่ก่อน remote action ทุกครั้ง

## ภาพรวมระบบ

```text
LINE webhook
  → ตรวจลายเซ็นและ canonical webhookEventId
  → deterministic intent/policy guard
  → AI/NLU advisory เฉพาะเส้นทางที่อนุญาต
  → deterministic final route และ approved response
  → atomic delivery claim
  → LINE reply
  → fenced acknowledgement
```

องค์ประกอบหลัก:

| ส่วน                        | หน้าที่                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `worker/index.ts`           | รับ webhook, บังคับ delivery ownership และเชื่อม acknowledgement         |
| `worker/mp-06-wp1.ts`       | deterministic routing, mixed-intent precedence และ response plan         |
| `worker/durable-objects.ts` | conversation/session/accounting state, atomic delivery claim และ fencing |
| `config/`                   | policy, approved knowledge, product catalog และ project control          |
| `benchmark/mp-06/`          | benchmark generator, oracle, evaluator และ safety checks                 |
| `tests/`, `worker-tests/`   | Node, webhook, Worker, Durable Objects และ SQLite regressions            |
| `docs/line-oa/mp-06/`       | specification, runbook, acceptance และ evidence แบบละเอียด               |

Durable Object bindings ที่ใช้ใน TEST:

- `CONVERSATION_STATE` → `ConversationStateDO`
- `DRAFT_ORDER` → `DraftOrderDO`
- `HANDOFF_REGISTRY` → `HandoffRegistryDO`
- `PROMOTION_CONTROL` → `PromotionControlDO`

## Guardrails ที่ห้ามลดระดับ

- Deterministic policy เป็น final authority เสมอ
- AI ทำหน้าที่ parser/classifier แบบ advisory และห้ามส่งข้อความที่โมเดลสร้างให้ลูกค้าโดยตรง
- Feature flag ของ AI ต้อง default OFF
- ข้อมูลธุรกิจต้องมาจาก approved knowledge base และ product catalog เท่านั้น
- ประวัติแชตไม่ใช่ business truth source
- Stock, promotion ปัจจุบัน, pickup confirmation, delivery fee, payment, slip, refund, personal points, order changes, complaints และ allergen ต้องส่งพนักงานหรือ fail closed
- Mixed intent ที่มี explicit staff request หรือ reward redemption ต้องได้ HUMAN_HANDOFF ก่อน preorder/draft และห้ามแก้ draft
- AI ห้าม downgrade mandatory handoff
- Duplicate webhook ต้องไม่สร้าง provider/accounting increment หรือ outbound ownership ใหม่
- Delivery contract รับประกันเฉพาะ **at-most-one outbound dispatch attempt** พร้อม fenced acknowledgement ไม่รับประกัน exactly-once external delivery
- Timeout, network error, non-2xx หรือผลลัพธ์ไม่แน่นอนต้องรักษา claim และห้าม retry/reassign อัตโนมัติ
- ห้ามบันทึก raw reply token, secret, raw customer chat หรือ PII ที่ไม่จำเป็น
- Accounting, history และ session counters ห้าม reset เพื่อให้ acceptance ผ่าน
- TEST และ Production ต้องแยกกัน Production ห้าม query หรือแก้ไขโดยไม่มี Owner approval เฉพาะ action

## Local candidate verification

Candidate `c59eb5e…` ผ่าน local gates ที่ commit evidence แล้ว:

| Gate                                                        | ผล                                               |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Full suite                                                  | **733/733 ผ่าน**, ไม่มี failed/skipped/cancelled |
| Node unit                                                   | 500                                              |
| Benchmark test inventory                                    | 14                                               |
| Worker/SQLite                                               | 219                                              |
| MP-06 benchmark                                             | 5,000 PII-free cases                             |
| AUTO correctness                                            | 100%                                             |
| Risky fail-closed                                           | 100%                                             |
| False AUTO / unsupported claim / PII leakage                | 0                                                |
| Control tests                                               | 70/70                                            |
| Formatting, lint, typecheck, build, validators, secret scan | PASS                                             |
| Empty-store frozen-lockfile clean install                   | PASS                                             |
| Reproducible artifact                                       | checksum ตรงกันสาม build                         |
| Dependency audit                                            | 0 ทุกระดับใน scoped remediation                  |

Dependency remediation ที่รวมอยู่ใน candidate:

| Dependency              |   ก่อน |   หลัง |
| ----------------------- | -----: | -----: |
| Sharp                   | 0.35.2 | 0.35.4 |
| js-yaml                 |  4.3.1 |  4.3.2 |
| Vitest / @vitest/mocker | 4.1.10 | 4.1.11 |

Wrangler/Miniflare ไม่ได้เปลี่ยน และ native Sharp กับ Worker/SQLite ถูกทดสอบจริง

หลักฐานฉบับเต็ม: [MP-06 v16–v19 remediation and deployment gate](docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md)

## Acceptance และสิ่งที่ยังไม่ผ่าน

| Gate                                                        | สถานะ               |
| ----------------------------------------------------------- | ------------------- |
| Local safety, precedence, delivery fencing และ dependencies | PASS                |
| Exact candidate artifact reproduction                       | PASS                |
| v19 persistent deployment authorization                     | PENDING             |
| Candidate deployment ไป TEST                                | NOT PERFORMED       |
| Post-deploy schema/claim/egress verification                | NOT PERFORMED       |
| Remaining controlled Owner UAT                              | BLOCKED             |
| New-session kill-switch acceptance                          | GAP                 |
| Rollback/redeploy acceptance                                | GAP                 |
| Final security/release review                               | BLOCKED             |
| PR/default-branch integration                               | BLOCKED             |
| Production                                                  | NO_GO — NOT TOUCHED |

Schema ของ candidate เป็น additive แต่ schema compatibility ไม่เท่ากับ rollback safety รุ่นเก่าไม่มี delivery fencing จึงห้าม automatic rollback และต้องมี independent containment/fix-forward plan

## ลำดับงานถัดไป

1. สร้างและ validate control transition `2026.09.09-v19`
2. Commit/push v19 โดยไม่เปลี่ยน runtime candidate/artifact
3. ตรวจ branch, ancestry, artifact และ fresh TEST state
4. เตรียม exact TEST deployment operation โดยให้ counter ยังคง 0/1 จน remote mutation เริ่ม
5. เมื่อได้รับ authorization ที่ control ยอมรับ จึง deploy exact candidate ไป `malispang-lineoa-test` หนึ่ง operation
6. ตรวจ active version/source/artifact, schema, claim, ledger และ outbound deltas โดยคง AI OFF / pilot STOPPED
7. ขออนุมัติ continuation/UAT, kill-switch และ rollback rehearsal แยกตามหลักฐานจริง
8. ทำ final security/release review ก่อนสร้าง PR
9. Production ต้องมี Owner approval เฉพาะขั้นต่างหากเสมอ

## Toolchain

ใช้เวอร์ชัน exact ตาม `package.json`:

- Node.js `24.19.0`
- pnpm `11.19.0`

เริ่มต้น:

```bash
pnpm validate:toolchain
pnpm install --frozen-lockfile
pnpm check
```

คำสั่งสำคัญ:

```bash
pnpm test
pnpm benchmark:mp-06:check
pnpm ai-nlu:mp-06:check
pnpm audit:dependencies
pnpm worker:dry-run
pnpm validate:project-control
pnpm secret:scan
```

ข้อควรระวัง:

- `pnpm ai-nlu:mp-06:live` เป็น explicit local-only evaluation และต้องใช้ budget/cap ตาม control
- `pnpm deploy:test` เป็น remote mutation ห้ามรันเพียงเพราะ local tests ผ่าน
- เก็บ local secret ไว้ใน `.dev.vars` ซึ่งถูก ignore ห้าม commit credential
- ตรวจ secret ได้เฉพาะชื่อ/presence ห้ามอ่านหรือรายงานค่า

รายละเอียด bootstrap และ clean checkout: [MP-06 WP5 Toolchain Remediation](docs/line-oa/mp-06/MP_06_WP5_TOOLCHAIN_REMEDIATION_TH.md)

## เอกสารสำคัญ

- [WP1 Runtime implementation](docs/line-oa/mp-06/MP_06_WP1_RUNTIME_IMPLEMENTATION_TH.md)
- [WP2 Benchmark specification](docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_SPEC_TH.md)
- [WP2 Benchmark report](docs/line-oa/mp-06/MP_06_WP2_BENCHMARK_REPORT.md)
- [WP3 Runtime remediation](docs/line-oa/mp-06/MP_06_WP3_RUNTIME_REMEDIATION_TH.md)
- [WP6 TEST readiness assessment](docs/line-oa/mp-06/MP_06_WP6_TEST_READINESS_ASSESSMENT_TH.md)
- [WP7 AI/NLU implementation](docs/line-oa/mp-06/MP_06_WP7_AI_NLU_IMPLEMENTATION_TH.md)
- [WP8A Pilot controls](docs/line-oa/mp-06/MP_06_WP8A_RUNTIME_PILOT_CONTROL_REMEDIATION_TH.md)
- [WP8B Provider settlement](docs/line-oa/mp-06/MP_06_WP8B_PROVIDER_ATTEMPT_SETTLEMENT_REMEDIATION_TH.md)
- [WP8C Controlled retest](docs/line-oa/mp-06/MP_06_WP8C_CONTROLLED_RETEST_TH.md)
- [WP8D Durable lifecycle diagnostics](docs/line-oa/mp-06/MP_06_WP8D_DURABLE_LIFECYCLE_DIAGNOSTICS_TH.md)
- [WP8E Exact reconciliation retest](docs/line-oa/mp-06/MP_06_WP8E_EXACT_RECONCILIATION_CONTROLLED_RETEST_TH.md)
- [WP8F TEST acceptance](docs/line-oa/mp-06/MP_06_WP8F_TEST_ACCEPTANCE_TH.md)
- [Current security remediation and deployment gate](docs/line-oa/mp-06/MP_06_V16_DETERMINISTIC_PRECEDENCE_REMEDIATION_TH.md)

## Definition of Done สำหรับ MP-06

MP-06 จะปิดได้เมื่อ:

- TEST acceptance ผ่านครบด้วย backend evidence
- Owner UAT และ kill switch ผ่าน
- ไม่มี unsafe AUTO, duplicate outbound, unsettled attempt หรือ accounting inconsistency
- Rollback/recovery acceptance ผ่านโดยไม่ลด delivery safety
- Final security/release และ integration checks ผ่าน
- Owner อนุมัติ PR/merge/Issue closure ตามขั้นตอน

จนกว่าจะครบทุกข้อ Issue #12 ต้องคง OPEN และ Production ต้องคง **NO_GO — NOT TOUCHED**
