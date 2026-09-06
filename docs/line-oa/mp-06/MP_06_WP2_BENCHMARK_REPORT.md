# MP-06 WP2 — Deterministic Benchmark Report

ผลรวม: **PASS**

- Run: `mp06-wp2-f1fd652a96092a1f`
- Evaluation timestamp (fixed): `2026-09-05T12:00:00+07:00`
- Benchmark development base commit: `8117f7c0b7cb190af81ea8f9481bd257db8a5a51`
- Runtime implementation commit under test: `d4dc0f24a64f29ea6d238ececfca6e57ed9433b5`
- WP4 execution control commit: `cc13fa95883d37b35d0e79cdcbfd7c2be823be61`
- Roadmaps (benchmark/runtime/WP4): `2026.09.05-v3` / `2026.09.05-v4` / `2026.09.05-v5`
- Policy: `2026.09.05-policy-v1`
- Policy checksum: `504a39b0879933658be35a5b6fb8bb92c8931d5ab473ee7b54f3112bbaa00bc0`
- Dataset checksum: `6d4b780a5b9e4b96f78737d869d42b600f8679934addcd25525dda4fdd59affa`
- Semantic result checksum: `f1fd652a96092a1f65a77f78d77877c3b2f1cccc61e09f794bc0055bd14707f6`
- Deployment: `NOT_DEPLOYED`; TEST deployment=`false`; Production=`NO_GO`

## จำนวนกรณี

รวม 5,000 กรณี: Functional 3,000, Thai variation 1,000, Adversarial/safety 1,000

## Metrics

- AUTO correctness: 100.00% (3856/3856)
- False-AUTO: 0
- Risky/fail-closed: 100.00% (989/989)
- Authority fail-closed: 100.00% (24/24)
- Unsupported claims: 0
- PII/raw-chat leakage: 0
- Duplicate normalized/semantic/anti-padding signatures: 0/0/0
- False-AUTO by risk: none
- Non-AUTO risk failures: 0

## Confusion matrix

| Expected \ Actual | AUTO | AUTO_COMPOSITE | CLARIFY | STAFF_ONLY |
| ----------------- | ---: | -------------: | ------: | ---------: |
| AUTO              |  140 |              0 |       0 |          0 |
| AUTO_COMPOSITE    |    0 |           3716 |       0 |          0 |
| CLARIFY           |    0 |              0 |       3 |          0 |
| STAFF_ONLY        |    0 |              0 |       0 |       1141 |

## Acceptance criteria

| Criterion                       | Result | Actual | Required |
| ------------------------------- | ------ | -----: | -------: |
| TOTAL_CASES                     | PASS   |   5000 |   >=5000 |
| FUNCTIONAL_CASES                | PASS   |   3000 |   >=3000 |
| THAI_VARIATION_CASES            | PASS   |   1000 |   >=1000 |
| ADVERSARIAL_CASES               | PASS   |   1000 |   >=1000 |
| DATASET_SCHEMA_DISTINCTNESS_PII | PASS   |      0 | 0 errors |
| AUTO_DENOMINATOR_NONZERO        | PASS   |   3856 |       >0 |
| AUTO_CORRECTNESS                | PASS   |      1 |   >=0.98 |
| RISKY_FAIL_CLOSED               | PASS   |      1 |      1.0 |
| AUTHORITY_FAIL_CLOSED           | PASS   |      1 |      1.0 |
| UNSUPPORTED_CLAIMS              | PASS   |      0 |        0 |
| PII_RAW_CHAT_LEAKAGE            | PASS   |      0 |        0 |
| FALSE_AUTO_DETAILS_COMPLETE     | PASS   |      0 |        0 |

## False-AUTO details

ไม่มี

## Known limitations

- Synthetic deterministic cases do not prove free-form natural-language understanding.
- No AI provider, model, prompt, live LINE event, Cloudflare deployment or Production data is used.
- Planner evaluation is complemented by existing Worker/Durable Object regression tests; it is not a live end-to-end persistence test.
- Approved KB and Product Catalog are evaluated as frozen repository dependencies only.

WP2 วัด WP1 deterministic runtime เท่านั้น ไม่ใช่หลักฐานว่า AI เข้าใจภาษาธรรมชาติ และไม่ใช่ TEST deployment/UAT หรือ Production readiness
