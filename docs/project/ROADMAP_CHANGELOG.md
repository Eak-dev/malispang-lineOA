# Roadmap Changelog

## 2026.09.02-v4 — current

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

Any later GitHub edit that changes those control fields requires a new Owner decision and Roadmap version before implementation. The validator cannot treat chat history or an unversioned Issue edit as authorization.
