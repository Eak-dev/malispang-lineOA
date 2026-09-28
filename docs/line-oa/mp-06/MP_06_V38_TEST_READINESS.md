# MP06 v38 — TEST readiness

Owner has approved implementation through TEST readiness; scope is มะลิปัง TEST only. Current stage: local control/remediation. No Production, default merge or Issue closure.

## Evidence and causal limit

Baseline35b67ab, durable-state61/61 passed in the previous diagnostic execution. A fingerprinted authoritative response clears pendingTemplate while clarificationUsed remains true. Reads/restart preserve T-C01. The historic true/null observation therefore proves a frozen-UAT precondition mismatch, not necessarily a runtime bug. Historical event causality remains UNKNOWN. No data repair or acceptance relaxation is justified from that observation alone.

## Sequence

1. Validate v38 action/schema/path/history gates and negative regressions; reconcile GitHub9/12 with actual status. Preserve all v37-and-earlier records.
2. Reproduce relevant clarification/delivery/handoff paths locally. Only implement changes supported by a failing behavior test or a specified new acceptance contract.
3. Specify a successor UAT case only if its prerequisites can be observed and its relationship to original criteria is explicit. Keep the frozen case incomplete rather than converting it to PASS. Do not replace Owner identity, reset budget or create a live session as a probe.
4. Qualify final candidate with full checks; exact TEST account/channel/Worker identity, rollback compatibility, fresh no-in-flight accounting and supported storage permission are required before remote execution. This local stage deliberately issues no remote grant.
5. When all gates are satisfied, execute approved TEST setup and user UAT, verifying visible replies, duplicate handling, handoff, accounting, STOP and cleanup. Owner-visible instructions come only after readiness is proven.

## Outstanding external prerequisite

Complete storage/claims/Registry NOT_OBSERVED under historical tool-review hold. No supported release has been obtained; no appeal/support request is pending. Do not replay the rejected action or substitute a transport. The current implementation can progress locally without treating this prerequisite as satisfied.

## Acceptance

Original benchmark thresholds, policy, model, budget and historical UAT evidence remain unchanged. Local gate requires closed versioned controls, exact inherited-manifest preservation, append-only history, path inventory, negative unauthorized-action tests and clean validation. Tests passing does not close Issue12 or allow UAT by itself.
