# Dev Operations v33 — local-only evidence tooling

## v34 review-only successor

Owner decision `MP-OD-2026-09-23-V34` adds one Draft PR from `codex/dev-operations-v33` to `codex/mp-06-guardrailed-ai` at exact base `1508782a9cbf9412b3a6967264e9f4e8d6c19376`, for CI and Greptile findings-only review. Reuse the existing exact PR if present; never create a duplicate. This supersedes the historical no-PR statement below solely for that action. No Ready, merge, deploy, runtime, remote TEST, Production or issue closure. Workflow and credentials stay unchanged. Preflight recognizes v33 and its v34 review overlay but never replaces full control validation.

The PR adapter checks same-repository identities, open Draft status, exact branches/base, event/ref/merge SHA and ordered parents. With base pinned as an ancestor, the synthetic integration tree must equal the source tree. The real source checkout is independently validated; synthetic merge acceptance does not weaken source-history merge rejection or confer deployment provenance. A new base requires a new decision.

Owner decision `MP-OD-2026-09-23-V33` authorizes this tooling on the isolated `codex/dev-operations-v33` branch only. It does not change MP-06 runtime, TEST or Production permissions. Read `AGENTS.md`, `PROJECT_CONTROL.md`, current work and roadmap, then run `pnpm validate:project-control` before working. Stop on any mismatch. No reset, rebase, force-push, merge, deploy, Production access or Issue closure.

The 2026-09-23 Owner amendment permits `tsconfig.json` and `eslint.config.js` only to include the local `.mjs` scripts/tests in the existing typed lint checks. The global lint rules remain enabled.

Use Node 24.19.0. All commands require a full expected HEAD and exact branch; obtain them with read-only `git rev-parse HEAD` and `git branch --show-current`. Never paste secrets or customer data into arguments, logs or receipts.

```sh
node scripts/dev-operations/preflight.mjs --repo "$REPO" --expected-branch codex/dev-operations-v33 --expected-head "$HEAD"
```

Preflight verifies Git identity, v33 local-only control and Node version, then reports dirty-file counts. It does not authorize a new scope or replace the project-control validator.

For dirty work, first inspect every changed path and diff for sensitive material. Provide **every** staged, unstaged and untracked path once via repeated `--allow`; the destination must be a new directory outside the repository with an existing parent. The command refuses unsafe names, symlinks, obvious secret patterns, oversize files and an incomplete allowlist. It writes separate staged and unstaged binary patches, copies untracked file bytes, and hashes them in `manifest.json`. It never modifies the source repository. Its pattern screen is limited; human review remains required before sharing a checkpoint.

```sh
node scripts/dev-operations/checkpoint.mjs --repo "$REPO" --out "$CHECKPOINT" --expected-branch codex/dev-operations-v33 --expected-head "$HEAD" --allow PROJECT_CONTROL.md
```

Recovery is deliberate, not automatic: verify manifest hashes and branch/HEAD, inspect both patches and untracked copies, then apply only in a disposable clone after Owner review. Do not restore onto a dirty checkout. Never treat the checkpoint as a secret-safe archive.

After a validation command, record a local receipt in a new file outside the repository. Use a terse label, not raw command text or test output. The receipt includes Git identity and diff digests, pass/fail counts, model and effort; usage and billing remain `UNKNOWN` unless separately verified.

```sh
node scripts/dev-operations/receipt.mjs --repo "$REPO" --out "$RECEIPT" --command-label CONTROL_VALIDATION --exit-code 0 --tests-passed 1 --tests-failed 0 --model gpt-6-sol --effort high
```

Run `node --test tests/dev-operations/*.test.mjs` for synthetic positive/negative checks. Validate control again and inspect `git diff --check` plus the complete changed-path list before any local commit. No claimed efficiency saving is established by these tests; compare repeated real receipts only after an approved pilot.

## Full regression isolation and macOS Git startup

Run the complete existing `pnpm test` lanes (Node unit, dedicated benchmark, then local Worker tests) in a disposable full-history clone, with the exact reviewed dirty patch and untracked tooling copied into it. Historical control tests create and mutate synthetic Git fixtures; never use the operator checkout as the full-suite runner. Retain JSON reports outside the clone and verify the source patch/untracked digests before and after validation. A timeout or failed setup is not PASS, even if another run succeeds; retain the failed report.

The control inspector, CLI and control-test helpers use `projectControlGitExecutable()`. On macOS this avoids repeated developer-tool launcher startup using the fixed `/Library/Developer/CommandLineTools/usr/bin/git` only after checking root ownership, non-group/world-writable permissions, directory/file types and executable bits across the entire path. Symlink, missing or unsafe entries fall back to `/usr/bin/git`; other platforms retain `/usr/bin/git`. No caller override or PATH lookup selects the executable. Git arguments, history/digest checks, fresh HEAD/worktree/index inspection, timeouts and assertions are unchanged. This is local validation infrastructure, not a LINE bot model/runtime change or a historical CI failure waiver.

## Committed v33 qualification

A passing dirty patch is not proof that its committed checkout validates. First commit the exact reviewed files in a disposable clone and run the validator and full suite there. The v33 inspector verifies inherited seals against the immutable approved `baseHead`, separately checks every post-base committed path and the complete path history, rejects new merge ancestry, and checks inherited work/grants/journals/holds at every intermediate commit and in the current working file. A later restore cannot hide a protected-path edit, inherited-state mutation or control-version reset.

The returned local result identifies the actual HEAD and full actual path inventory, rechecks the actual HEAD and raw index, and is deliberately never registered as deployment provenance. Clean v33 checkouts need not invent a dirty path to pass the CLI. Dirty tooling remains limited to the sealed v33 allowlist regardless of a caller-supplied list. Commit/push authority does not include PR, merge, deploy or Production; clean local validation does not replace exact-SHA hosted CI or independent review.
