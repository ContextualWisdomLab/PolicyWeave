# Review summary verification and delivery successor — 2026-10-04

Repository: PolicyWeave. Source base: `60fd7fb5c3177984a993102742bb16e36a909e2d`. Branch: `feat-mixed-agents-prd`. This is a successor to [the original layered-agent evidence](mixed-agents-review-summary.md), not retrospective replacement of its failures or receipts.

## Existing work preserved and current authority

The parent verified that all 16 original candidate files still match the previous patch receipt. A fresh read on 2026-10-04 finds parent Draft PR #1 (`develop` → `main`) unchanged at the source base above, and separate Draft PR #25 (`agent/import-cancellation` → `develop`) at `af8c0da17cdfb4786867f4e85401dbbb811b581e`. The summary work does not duplicate import cancellation/stream ownership. Issue #12 is open; the root candidate's Dependency Review failure, missing OpenCode approval evidence and cancelled Noema verdict remain non-passing. No required workflow rerun, run cancellation, protection change, synthetic status or Issue closure was performed.

## Second layered development decision

The primary methodology reference remains Wang et al., *Mixture-of-Agents Enhances Large Language Model Capabilities*, arXiv:2406.04692 (2024-06-07). Its prior-layer-output pattern informed the development workflow; no benchmark benefit is claimed.

- Layer 1 (`deleg_773be568`): two independent whole plans proposed finishing `US-REVIEW-01` rather than inventing another feature. The product plan prioritized handler guard, native download boundaries, import recovery and observable state preservation. The technical plan distinguished immediately passing existing-behavior tests from production RED→GREEN and proposed isolated mutation evidence for the handler guard.
- Layer 2 (`deleg_7e249da4`): both reviewers received both plans and the parent aggregate. They retained the minimum scope, required original native-method calls and explicit fixture labels, rejected JSON-only claims of full raw-state preservation, and required fresh owned-server/build identity rather than stale preview reuse.
- Parent aggregate: add acceptance contracts and isolated guard controls, then exercise the final candidate and submit an ordinary Draft PR targeting `develop`. No new product API, React internal access, legal rule, hosted store, dependency or runtime model is authorized by this decision.

Delegated model/provider identities are not verified heterogeneous. Role separation and shared prior-layer proposals are development provenance, not GitHub approval.

## Clean installation recovery

A previously dependency-empty owned directory at `/Users/seonghobae/.hermes/cache/scratch/policyweave-clean-install-20261004` ran `NODE_ENV=development npm ci --include=dev --no-audit --no-fund --prefer-offline --fetch-retries=0 --fetch-timeout=20000`: exit 0, 243 packages added. Lock bytes match the candidate. npm reported an allow-scripts warning for `fsevents@2.3.3`; no install-script approval or policy change was performed. This is installed-toolchain evidence, not a fresh vulnerability scan or cross-platform guarantee.

The preserved candidate was materialized with its verified patch and exercised using those clean-installed dependencies: six pretests, 193 Vitest cases across 18 files, lint and production build completed with exit 0 (`proc_d1d5cc33cf18`). Those totals describe the predecessor source snapshot only; later contract additions require fresh final-candidate execution.

## Visual observation, not whole-product acceptance

The original mobile screenshot was successfully inspected on 2026-10-04 after the prior upstream-drop and quota-429 failures. The summary-download label/border is fully shown and readable without neighboring overlap. The header title and part of the horizontal step list are visually cut off at the right. This is a bounded historical screenshot observation, not a current-successor visual audit, full-screen completeness, native zoom, screen-reader or WCAG conformance. Those remaining visual conditions are not dismissed by document-level no-overflow assertions.

## Executed acceptance contracts — completed parent full gate

- `tests/e2e/review-summary-boundaries.spec.ts`: native Blob MIME, original URL allocation/activation/deferred-reclaim observation, real downloaded bytes, fixture-owned pending reads and read/validation failure recovery, plus observable state preservation. Positive/negative instrumentation is explicit; passing newly added assertions characterize existing behavior unless a genuine source defect is reproduced.
- `tests/review_summary_guard_contract.mjs`: isolated source copy with only button disabling removed must reject pending-import downloads through real React UI events; an additional guard-removal mutation must fail the intended allocation assertion. The live source remains unchanged. Fixture collection errors or timeouts are not accepted as mutation detection.

The browser-contract owner completed 24/24 cases across desktop/tablet/mobile, zero skips, failures, flakes or retries. The spec uses a disclosed 60-second local survey budget without changing global config/retries; earlier descriptor/locator errors and default-30-second survey failures are retained as harness observations, not product RED. Original browser primitives are called by the positive observers. The guard owner completed one outer Node contract: enabled-button positive exit 0 and guard-removal negative exit 1 specifically at `HANDLER_GUARD_PENDING_IMPORT_ALLOCATION`, with live hashes unchanged and owned groups settled. This standalone guard contract is not wired into npm test or CI. Parent final-candidate verification completed as `proc_b1bea28186dc`: six pretests; 193/193 Vitest cases across 18 files; lint and production build; the standalone guard contract (positive 0, intended mutation negative 1); and full Chromium suite 63 collected, 51 passed, 12 existing profile-scoped skips, exit 0. `CI=1` forbids reuse of a pre-existing preview server; rebuilt product bytes were exercised. The 24 new boundary cases retain their disclosed 60-second survey budget. Unmounted/discarded stale facts not exposed by public controls/export remain outside observable preservation proof. Shell initialization reported `can't change option: zle`; it did not prevent the commands, and the warning is not suppressed. A new Draft PR is delivery/review admission, not parent integration, current-head CI success, qualifying approval, publication or release. Issue #12 and PR #25 keep their own exit contracts.
