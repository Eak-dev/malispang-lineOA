# Roadmap Changelog

## 2026.09.05-v1 — current

- supersedes `2026.09.04-v1`
- retains MP-06 (GitHub #12) as the only current Roadmap item
- changes current-work status to `AUTHORIZED_POLICY_SNAPSHOT_ONLY`
- authorizes a later policy-snapshot-only round covering specification, schema, validator, tests and governance evidence
- records the seven mandatory locked policy topics and policy snapshot `2026.09.05-policy-v1` as specification-only evidence
- keeps runtime implementation and AI/provider work unauthorized
- keeps TEST deployment false and Production `NO_GO`
- records transition baseline `5ddf9cc88d0bb868aadbc8f2a41860b56a5f2682`

## 2026.09.04-v1 — superseded

- supersedes `2026.09.02-v4`
- records Owner/PO approval of MP-05 commit `d036063a562a4fa780f162c69f7824ebcb9a250b` as the governance baseline
- marks MP-05 (GitHub #11) completed and MP-06 (GitHub #12) current
- explicitly keeps MP-06 implementation unauthorized; only the transition record, commit/push and GitHub #9 reconciliation are allowed
- keeps the MP-06 minimum 5,000-case PII-free benchmark composition unchanged
- keeps MP-07 (GitHub #7) blocked pending MP-06 completion and Owner/PO review
- keeps TEST deployment false and Production `NO_GO`

## 2026.09.02-v4 — superseded

- supersedes `2026.09.02-v3`
- introduces canonical work IDs `MP-01`–`MP-12` without replacing historical GitHub Issues
- makes MP-05 (GitHub #11) the only current implementation
- keeps MP-06 (GitHub #12) blocked pending MP-05 Owner/PO review
- records the MP-06 minimum 5,000-case PII-free benchmark composition
- defaults TEST deployment to false and Production to `NO_GO`
- records verified latest baseline `a0612489b4b5ce4394042891513371d5bf10fdb2`
- records GitHub default-branch drift; dedicated worktree from verified baseline is the approved mitigation

## Reconciliation with GitHub

At MP-05 preflight on 4 September 2026:

- MP-ROADMAP (GitHub #9) declared `2026.09.02-v4`
- MP-05 (GitHub #11) declared itself current and local-only
- MP-06 (GitHub #12) declared itself next/blocked with the same benchmark
- all three declared TEST deployment unauthorized and Production `NO-GO`

On 4 September 2026, Owner/PO approved MP-05 commit `d036063a562a4fa780f162c69f7824ebcb9a250b`, then authorized transition to `2026.09.04-v1`, with MP-06 current but implementation and deployment explicitly unauthorized. On 5 September 2026, Owner authorized the project-control transition to policy-snapshot-only status; GitHub #9 must be reconciled to `2026.09.05-v1`.

Any later GitHub edit that changes those control fields requires a new Owner decision and Roadmap version before implementation. The validator cannot treat `CURRENT`, chat history or an unversioned Issue edit as implementation authorization.
