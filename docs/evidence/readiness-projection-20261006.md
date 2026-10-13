# Readiness projection — 2026-10-06 candidate

## Product gap

Published baseline: PR #26 head `2abf24fe02ac748e76c46e650b341772f30011d9`. Two preview surfaces could disagree with the current readiness result:

1. The per-item `검토 상태` cell read `입력됨` whenever the processing purpose was non-blank. Collection mode or collection path could still be open, and the matching warnings and blocking count still reported them.
2. After `공개 준비 확인` showed the readiness confirmation, a later authoring edit could reopen a blocker or change a confirmed fact. The confirmation stayed visible next to the changed facts.

Both are projection defects. The readiness engine (`getReview`), findings, blocking count, step completion, JSON/TXT bytes and strict restore were already correct and are not changed.

## Selected change

- `src/App.tsx` derives the item state from the existing `getReview` lists. An item reads `입력됨` only when it is absent from the purpose, mode and path blocking lists and no collection contradiction exists. No predicate is reimplemented. The purpose cell text and its `missing` class are unchanged.
- `publish()` records the exact `items`, `noCollectionAttested` and `facts` references it confirmed. The confirmation is shown only while those references are still current and the blocking count is zero. Every real authoring setter creates a new reference, so any later edit retracts the confirmation, including an edit that restores the same value. Pressing the button again shows it again. Other export/import outcome messages are not hidden by this rule.
- No new live region, focus owner, timer, storage, schema, dependency or legal rule is added.

## Repository RED/GREEN

New regression `src/readiness-projection.test.tsx` uses only public controls (rail buttons, checkboxes, selects, inputs, `.publish`, `.review-download`).

- First RED: 14 cases with test SHA-256 `9cab42ac…`, against published `HEAD:src/App.tsx` SHA-256 `d846002a…`. 9 cases failed on the intended assertions (`입력됨` instead of `확인 필요`, and the confirmation still present after an edit). 5 preservation controls passed.
- The first GREEN (14/14) used App SHA-256 `bc4747c3…`.
- An independent review found no blocking product-logic defect. It reported one documentation blocker: this evidence record did not exist. It also reported non-blocking items: a misleading test name, no direct no-collection attestation test, CHANGELOG wording narrower than the contract, retraction not announced to assistive technology, and a shell that had inherited `NODE_ENV=production`, which breaks React test utilities. The test name was corrected, and a no-collection attestation retraction case was added. The final test file has 15 cases, SHA-256 `279b9340…`.
- Second RED: the final 15-case test against published App `d846002a…` ran in a separate checkout. 10 cases failed, including the new attestation case, and the exit code was 1.
- Second GREEN: the final test with App `bc4747c3…` and `App.test.tsx` passed 32/32 with exit code 0. The command set `NODE_ENV=test` explicitly; `green2.log` itself does not record the environment. A second independent reviewer reproduced 32/32 with the same command.
- The test named `retracts after a item selection change` also reopens blockers, so it does not isolate the reference check on its own. The non-blocking purpose, path, mode and service-name cases do isolate it. The attestation case likewise reopens a blocker, so the `noCollectionAttested` identity term remains a redundant guard, not a separately proven one. The test name was not edited, because that would change the bytes bound to RED/GREEN.

## Final local gate (2026-10-06 22:47–22:51 KST)

On the final App and test bytes listed in the report directory's `final-20261006/inputs.sha256`, `git diff --check`, `npm run lint`, `npm test` (6 pretests plus 245 Vitest cases in 20 files, `NODE_ENV=test`) and `npm run build` all exited 0. Later edits touched documentation only.

## Browser regression history (retained, not acceptance)

The affected configured browser selection ran with the earlier 14-case test bytes. It collected 114 cases: 94 passed, 12 existing profile-scoped skips, and 8 failed with exit 1. The log does not record host load. All 8 failures were 30-second timeouts in `preview-text-reflow` paired receipts and `url-portability` native journeys. Several timed-out bodies reported an inactive observer after cleanup. None of the failures asserted the changed item state or confirmation text. A serial rerun of those 12 cases is incomplete: its log stops at case 7 of 12 with timeouts and has no summary or exit line. A later rerun of the 12 cases recorded a load average near 260 and passed 12/12 with exit 0. Its exact command was not retained, and its file name indicates a longer timeout. It is therefore not counted as passing under the original budget. These timeout failures match the load sensitivity already recorded for the predecessor, but that similarity does not prove their cause.

## Current-lineage integration and stream-observer successor — 2026-10-07

The dated 2026-10-06 executions above used the previous published App. The current remote PR #26 advanced to `95e2388e61055e7c26946a235f9b0fee23ced209`, stacked on PR #25's import-cancellation branch. A separately frozen candidate composes that source with the readiness projection changes while preserving its abortable stream reader, fatal UTF-8 decoding, attempt ownership and cancellation controls. The original dirty checkout is preserved; this candidate has not been adopted or published.

On the known personal MacBook Pro diagnostic host, locked installation, lint, six pretests plus 253 unit/UI tests, production build and Chromium preparation exited zero. This is a local diagnostic run, not a self-hosted Actions runner registration or hosted approval. A selected existing desktop summary-boundary case then failed because its `File.text` interception could not hold the production `File.stream` read: the summary button was enabled instead of disabled. Selected existing import-feedback and URL-portability cases also failed on unchanged source. The native trace for import-feedback retains its primary `nativeContents=null` assertion failure and the later cleanup `settled=false` failure; the cleanup error does not replace the primary finding. Those selected failures establish the obsolete test seam, not a cause for every historical timeout.

Four browser specs are adapted only at the test observation boundary: `import-feedback`, `url-portability`, `session-notice` and `review-summary-boundaries`. Native streams and source bytes remain authoritative. Existing saved-file provenance, failure outcomes, pending-input locks, exact read counts, no-storage/URL-cleanup checks and active-observer admission remain required. Original per-case timeouts, retries and scoped skips remain unchanged. New lifecycle controls are first-GREEN characterization, not a claim of new production defects. Session-notice's old observer lacked stream-read audit evidence but had no demonstrated failing product-behavior assertion; its successor adds exact native-read filename/count checks.

The initial summary-boundaries successor passed five selected desktop cases in 13.7 seconds with actual exit zero and identical before/after source hashes: the three existing valid/invalid/read-rejection outcomes and two new cleanup/cancellation controls. Lint passed on all four adapted specs. These are historical selected-case receipts, not acceptance of later repaired observer bytes.

## Pagehide observer repair and current diagnostic gates — 2026-10-13

Independent reviews found two test-observer defects after the initial stream migration: held-name non-File receivers did not preserve the native synchronous TypeError, and summary/import cleanup did not settle stalled native reads. Receiver guards corrected the first defect. An inert Node probe of the exact helpers against a synthetic stalled source reproduced the lifecycle defect: summary restoration could acquire native bytes after pagehide; acquired summary/import reads remained pending without native cancellation. URL cleanup passed the same pre-/post-acquisition controls. These findings concern test observation, not a demonstrated production import defect.

Summary restoration now aborts owned reads before restoring descriptors: it prevents later native acquisition, cancels an acquired reader and closes the consumer stream. Import restoration cancels an in-progress native reader and closes its consumer; fully read native bytes retain the release path. The explicit import restoration test now waits for nativeContents before restoring. This is a narrower completed-source byte-preservation setup, not a stalled-read test; separate cancellation tests and the stalled-source probe remain required. Existing byte assertions, browser deadlines, retry policy and profile-scoped skips were not weakened.

The retained probe changed from exit 1 before repair to exit 0 after repair. All five final scenarios settled, no scenario acquired a native source after pagehide, and every acquired source was cancelled. The first harness attempt failed because it tried to restore an absent own descriptor; it is excluded from product RED evidence. Probe bindings in the private report directory are:

- `pagehide-probe/probe.cjs`: SHA-256 `f17295707848978a562c7b44af4ce8c01d3c14c2f281edcefdb0ddd3202ef8d1`.
- `pagehide-probe/red.json`: SHA-256 `f46d5e722c1ed9d173054c8dd7ff6760823f4d57d4f86546be7652466122deec`.
- `pagehide-probe/green.json`: SHA-256 `56693301f3e0c68085d58c2e63f3a9bf9f981d7acfd604aa55536c7a6b355216`.

The repaired 89-file source was bound by `final-source-manifest-pagehide-repair.json`, SHA-256 `0846dc0786f56a53429fd4d30135367713ed2b7391f389e182373ed1ee6b2a26`. On the personal MacBook Pro diagnostic host, the October 13 gate completed with all nine stage exits zero: environment, npm ci, Chromium preparation, lint, unit (253 tests in 21 files, NODE_ENV=test), production build, focused desktop browser selection (42/42), collection and full configured browser matrix (261 cases: 248 passed, 13 retained skips, zero failures, 4.7 minutes). Browser workers remained one; original per-case deadlines, retries and skips were unchanged. All source hashes matched after execution.

Stage commands, environments, actual exits, timeout flags and per-stage log hashes are retained in `pagehide-gate-20261013/stages.json`, SHA-256 `9ff99d84b93047bcdac3d66b2ea240a1deff88b52375ebbb27993f0728f93818`. The full browser log SHA-256 is `887b1048b575aff8f7e9a18b7622d860012cffdad39bd58dce3dc7a0ccf89a24`. An independent completion review verified these retained logs without rerunning gates and found no remaining source-behavior defect; its whole-candidate verdict remained NONPASS because this evidence document was stale. This documentation-only successor corrects that finding without changing executable bytes; the original gate manifest is preserved rather than regenerated retrospectively. Fresh whole-candidate documentation review remains required.

These receipts are personal-host diagnostic evidence, not hosted CI, qualifying approval, protected integration, deployment or release. The candidate has not yet been adopted or published.

## Historical full-browser failure — not the current gate

A second independent whole-candidate review found no product-logic defect. Its one blocking finding was a PRD sentence that cited proposal records that do not exist; the sentence was corrected. The configured full browser suite ran once under the original timeout and retry policy on the final source: 237 cases, 213 passed, 12 existing profile-scoped skips, 12 failed with exit 1 in 27.1 minutes. The end-of-run hashes still match the final App and test. Every failure was a 30-second timeout, and the host load average stayed near 220–350 for the whole run. The 12 failures are in import-feedback, preview-text-reflow, session-notice and URL-portability cases. None of them asserted the changed item state or readiness confirmation. Because the run did not pass, it is not acceptance. The command is not rerun while the machine stays this loaded. Assistive-technology announcement of the retraction is not measured. The polite `<output>` becomes empty, and removals are usually not announced. That is a product limit, not a regression: the predecessor kept the stale confirmation visible instead.
