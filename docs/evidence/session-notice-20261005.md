# Memory-only editing notice — US-SESSION-01 evidence

Date: 2026-10-05 (KST). Repository: PolicyWeave. Source base: `ee12e3fddefec1c4038e6da333019e3455e6a50f`; parent identifies this as Draft consumer PR #26. This record documents an uncommitted session-notice candidate, not release, current-head CI success or qualifying approval. This documentation owner edits only the seven assigned existing documents and this new record; no production change, commit, push or workflow operation is performed here.

## Decision and acceptance boundary

The existing workspace uses React memory, while the predecessor header claimed `버전 0.1.0 (임시저장)`. Existing mobile CSS hides `.version` and `.save-state`, so changing header copy alone cannot deliver the loss warning. PRD [US-SESSION-01](../PRD.md) selects a shared static paragraph in `FactStep`, `CollectionForm` and `PurposeForm`, after `.section-head` and before the first input, exactly once per active editor across all seven steps:

> 자동 저장되지 않습니다. 새로고침하거나 탭을 닫으면 작성 내용이 사라집니다. 보관하려면 JSON 내보내기를 사용하세요.

Header and preview identify `앱 버전 0.1.0`, separate from JSON `schema_version: 1`, TXT `report_format: v1` and future publication revisions. The paragraph owns no state, live announcement, alert/status role or focus target. Existing import's native fieldset/input lock and polite `JSON 초안 확인 중` / `브라우저 작업 중` remain under `isImporting`. It does not add a global row or alter workspace height arithmetic, browser storage, autosave, beforeunload, network, dependencies, schema or legal rules.

Notice persistence is required during editing, navigation, import pending/success/failure and JSON/TXT export success/failure. Its presence must not change facts, selected items, attestations, completion/readiness or exported bytes. Accepted import still performs its existing validated state replacement and step-1 navigation. Native valid-JSON download → reload-empty → explicit restore characterizes existing memory/portability behavior, not new automatic recovery. JSON is admitted normalized facts, not every rejected/inactive/discarded raw value's backup; TXT is not a restore file. Download initiation is not storage completion. Mobile 320 px readable normal-flow placement and actual browser outcomes require runner evidence, not jsdom or copy inspection alone.

## Methodology source and actual layered provenance

Wang, J., Wang, J., Athiwaratkun, B., Zhang, C., & Zou, J. (2024, June 7), *Mixture-of-Agents Enhances Large Language Model Capabilities*, arXiv:2406.04692v1, DOI `10.48550/arXiv.2406.04692`, is the primary methodology source. Version-v1 metadata and abstract were retrieved on 2026-10-05; the abstract specifies prior-layer outputs as auxiliary inputs for each next-layer agent.[1] Only that development pattern is adopted; no benchmark score, speed/quality improvement, runtime product AI or paper reproduction is claimed.

The documentation owner directly read both local manifests and their four task logs. Raw transcripts are not copied into this repository: local receipts are provenance pointers, not portable CI artifacts or GitHub approvals.

| Stage | Local receipt | Directly observed scope |
| --- | --- | --- |
| Layer 1, independent whole proposals | `~/.hermes/cache/delegation/live/deleg_3fdbd3a9/manifest.json`, `task-0.log`, `task-1.log`; two tasks completed, 2026-10-05 01:20:33–01:26:07 KST | Product A and Technical B independently chose truthful session/save wording and existing JSON portability. Both identified the hidden mobile metadata gap; neither implemented production changes. |
| Layer 2, cross-review | `~/.hermes/cache/delegation/live/deleg_77762cef/manifest.json`, `task-0.log`, `task-1.log`; two tasks completed, 01:29:53–01:35:21 KST | Kickoffs supplied summaries of both Layer-1 plans and the parent aggregate. Reviewers conditionally retained shared editor-local placement, static semantics, import feedback, version separation and native restore/preservation checks. One reviewer explicitly reported not finding full proposal text. Full verbatim prior-output transfer is therefore not established. |
| Parent synthesis | Parent handoff and current source, traced in PRD/TRD/architecture | Retain warning before inputs in the three editor types, reject header-only/global-banner fixes, retain failure/data/mobile acceptance and no new storage. This is synthesis, not an additional independent approval. |

Both manifests contain `model: null` and `provider: null`; same/inherited configuration does not establish resolved heterogeneous identities. This is a **MoA-inspired, summary-fed development workflow**, not a verified heterogeneous ensemble or complete reproduction of the paper's all-output transfer. Conditional planning review does not approve the final implementation.

## Direct source inspection snapshot

At 2026-10-05 01:51:26 KST, the documentation owner recorded these SHA-256 hashes from actual local bytes. They identify inspection, not the execution bytes of earlier parent tests or a frozen final successor. Other owners are still adding tests.

| Source | SHA-256 | Observed trace |
| --- | --- | --- |
| `src/App.tsx` | `d846002aea63583d7bec553776ba293ebf843989eb0df4397af2eccd98295068` | Shared `SessionNotice`, three placements, header/preview app labels, unchanged pending-import feedback owner |
| `src/initial-workspace.test.tsx` | `4d0713d41e7f19d63009aa631d54762c415c0fd4db894503c2499f266d107bc2` | One notice across each of seven steps, input ordering, no live/alert/tabindex and unchanged initial zero completion; explicit header/preview labels |
| `src/styles.css` | `b8f434878d5a0b819196c837101a3faac628f2c94096f931b70466a8df955943` | Existing header mobile hiding, not modified by notice implementation |
| `src/policy.ts` | `e351c81b74d97c46f9179997b660dfaf7411c774b3aa1c56e4fbb2c707e7adfd` | Existing fact/readiness/export/restore authority; no notice-owned domain change |
| `src/policy-review-report.ts` | `0e22b3823c63b2c1f8287e7aa884436d76446882e906612ba4e0daf942488f1a` | Existing TXT projection/version, not a restore mechanism |

Assertion source is not execution evidence. Public control properties plus normalized exports can support observable preservation but cannot certify unmounted/discarded hidden raw facts. Existing unsafe-URL normalization/admission limits are not repaired or waived by the notice.

## Parent-reported bounded TDD observations

The parent handoff supplies the following local observations. This documentation owner did not independently re-execute them, inspect their full command logs, or bind their execution to the snapshot hashes above. They must not be promoted to CI/full-suite evidence or summed with later totals.

| Slice | Reported observation | Evidence boundary |
| --- | --- | --- |
| Temporary-save claim RED | One intended failure / three passes observed, then outer 60-second timeout; rerun completed exit 1 | Original timeout retained as incomplete execution, not PASS; completed rerun is intended RED only |
| Missing notice RED | Initial run reported two failures / three passes, exit 1; null-check improved to identify the intended missing step-1 notice | Harness/null access is not counted as an independent product defect; intended absence is the regression target |
| Header label GREEN | Focused one pass / four selection skips | Selected-case evidence, not four additional passes or full suite |
| Static notice GREEN | Focused five cases passed | Bounded local report only; not native mobile/layout acceptance |
| Preview label RED→GREEN | New intended one failure / four selection skips, then five cases passed and build passed | Version slice and bounded local build; no final-source full gate inferred |

New existing-behavior reload/restore and failure-preservation characterization may be first-GREEN. Do not manufacture behavioral RED from a locator/setup error, host contention, timeout or previously implemented restore behavior.

## Historic receipts retained, successor gates not inferred

[The original summary evidence](mixed-agents-review-summary.md) and [2026-10-04 successor](review-summary-successor-20261004.md) remain unchanged. Their completed 193 unit/UI and 51 browser passes with 12 scoped skips belong to predecessor work, not US-SESSION-01. Earlier harness failures, native-browser survey-budget disclosures, clean-install warning, screenshot limitations and unresolved integration obligations remain intact.

| Gate | State at this documentation handoff | Required before broader acceptance |
| --- | --- | --- |
| Current full unit/UI, lint and build | Pending here; parent-reported focused/build observations above only | Completed canonical commands with source/test identities and exit status; no stale totals |
| Session native-browser/mobile successor | Underway in another owner lane; no completed result claimed here | 320 px readable/non-hidden notice, edit/import/export persistence, public-state/version preservation, valid native download/reload/restore, actual downloads/failure cleanup and final build identity |
| Visual/assistive-technology acceptance | Not established | Inspect current rendered screenshots separately from no-overflow assertions; native zoom/screen-reader evidence remains separate |
| Exact-head hosted required checks | Unverified here | Fresh repository/PR/source head/base/checkout/run/job/artifact identity and terminal live required workflows |
| Qualifying independent approval and threads | Unresolved here | Final whole-candidate review, current qualifying approval and resolved required threads; no bypass |
| Protected integration/publication/release | Not performed or claimed | Ordinary governed integration and independent hosted/publication/security contracts |

Parent reports Draft PR #26 as consumer, separate Draft PR #25 owning import-stream/cancellation, and central `.github` migration work (PR #2565, Draft `ab0c8659`) with an older consumer billing failure. These are attributed handoff observations, not remote re-fetches or integrated-ready evidence. No workflow edit/rerun/cancellation, gate relaxation, PR #25 modification or legal-source refresh belongs to this notice/documentation slice. Work can proceed locally while owner-side CI gates remain unresolved.

## Documentation-slice verification

Direct execution in this slice: `git diff --check` completed exit 0; `node --test tests/local_preview_contract.mjs` completed six passes, zero failures/skips, exit 0; relative-link checking found zero missing targets in the eight owned documents. Strict citation-ledger verification with evidence passed for the one external methodology reference. Every pre-existing line in the seven edited documents remains present, and the three historical evidence files linked above (including the archived product-gap ledger) are byte-equal to HEAD. These are documentation/configuration and preservation checks, not feature-suite, browser, hosted CI or approval evidence.

The first arXiv `web_extract` attempt timed out after 120 seconds with no content. A real `web.run` open of the exact v1 page then returned its metadata/abstract, supporting the bounded methodology attribution; no result was inferred from the failed extraction. A broad scratch-file listing also encountered a dangling symlink after the local delegation receipts had been read; narrowing to relevant top-level directories completed. Neither retrieval/listing error is a product-test outcome.

## Parent-executed successor receipts — 2026-10-05

The documentation handoff table above records an earlier state. The parent subsequently verified all 290 retained browser-artifact hashes and the browser owner's end-source hashes against the current candidate. The new spec's completed desktop run passed six cases; its three-profile run passed 18 cases, zero skips/flakes/failures, on the ordinary 30-second case budget. Two earlier 2-pass/4-fail locator-timeout runs remain excluded harness evidence, not product RED. Current 320 px step-1 screenshot inspection found the notice fully readable across three lines without clipping or overlap; that bounded image observation does not establish whole-product visual/AT acceptance.

Parent final unit/config gate `proc_bdc56c716167` completed exit 0: six pretests, 195 unit/UI cases across 18 files, lint, build and independent handler-guard contract (enabled-button positive exit 0, guard-removal intended assertion exit 1). Parent production/test bytes were frozen before that run. Full accumulated browser suite `proc_2e469ba14328` completed exit 0 against rebuilt bytes and a new owned server (`CI=1`): 81 collected, 69 passed, 12 existing profile-scoped skips. The new session cases are included, not added a second time to this total. The subsequent whole-candidate source review (`deleg_70f729f1`) found no blocking security or logic defect across the complete develop-to-candidate union: 24 paths including both new files. Its evidence snapshot preceded this terminal-browser receipt append; production/test hashes are unchanged, and the append reports only parent-executed results. This local source verdict does not replace runtime gates, hosted checks, qualifying GitHub approval or release.

## Sources

[1] https://arxiv.org/abs/2406.04692v1 — *Mixture-of-Agents Enhances Large Language Model Capabilities*; primary version-v1 metadata/abstract, retrieved 2026-10-05.
