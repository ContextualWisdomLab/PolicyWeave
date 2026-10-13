# ADR-0005: Fail-closed local schema-v1 draft restore

- Status: Proposed
- Date: 2026-09-26
- Owner: Policy Fact Authoring
- Scope: `src/policy.ts`, `src/App.tsx`, schema-v1 local portability
- Evidence: RED commits `86d370b1`, `0088d686`, `8be9e8dc`, and `7bedeca1`; implementation commits `d5ab6bd2`, `768e1c85`, and `50afb82b`; browser contract commit `95b34a18`

## Problem

PolicyWeave could export a deterministic schema-v1 draft but could not reopen it. An operator therefore had a portability artifact without a product-owned return path. Adding an unchecked JSON loader would be worse than leaving the gap open: a file could claim `review_ready`, introduce an unknown collection identity, coerce an unsupported status, or combine a no-collection attestation with active collection items.

This decision does not introduce hosted persistence, publication, legal approval, a general migration framework, or an external interoperability contract. It restores only the exact local schema version already emitted by PolicyWeave.

## Constraints

- Structured operator facts remain authoritative; exported readiness and finding fields are derived evidence.
- Unknown properties, missing properties, unsupported versions, wrong runtime types, non-canonical strings/URLs, duplicate/unknown collection keys, catalog-label mismatches, and contradictory facts fail closed.
- Collection, retention, and transfer statuses use exact existing vocabulary without case, whitespace, or type coercion.
- The browser must not replace current work until the complete file has passed validation, and authoring controls must remain locked while that validation is pending so accepted state cannot overwrite concurrent edits.
- Import remains local and bounded to 1 MiB; it performs no network request and adds no dependency.
- Current Korean catalog labels are identity-checked for schema-v1. Future localized resource releases require a new reviewed compatibility decision rather than weakening this check.

## Alternatives

1. Trust the TypeScript type after `JSON.parse`. Rejected because type assertions do not validate hostile runtime values.
2. Trust `document_state` and `review_finding_codes` from the file. Rejected because those fields can fabricate readiness.
3. Add a general JSON Schema dependency and migration registry. Rejected because one closed schema version does not justify a new runtime dependency or speculative abstraction.
4. Persist the draft in a backend. Rejected because tenant authorization, audit, encryption, deletion, and hosted recovery entry criteria are not yet satisfied.
5. Validate schema-v1 directly and recompute derived evidence. Selected as the smallest complete return path.

## Decision

`restorePolicyExport(unknown)` validates the exact schema-v1 object graph and reconstructs browser workspace state only from admitted facts. The canonical built-in collection catalog supplies label and description authority; the file may select catalog keys and supply their operator-authored mode, path, and purpose, but may not define new items or rename existing ones.

After reconstruction, PolicyWeave runs `createPolicyExport` again. Imported `document_state` and ordered `review_finding_codes` must match the recomputed result. The UI reads at most one 1 MiB local file through its browser `ReadableStream` and one incremental `TextDecoder('utf-8', { fatal: true })`, so valid multibyte characters may cross chunks while malformed bytes reject the attempt. It disables the import input and authoring fieldset while reading and validating and exposes a keyboard-operable cancel action outside that fieldset. Each attempt owns an `AbortController` and a monotonically invalidated token: cancellation reaches the active reader through `cancel()`, and success, error, and cleanup effects run only for the current token. This immediately unlocks the unchanged workspace, restores focus to the current step's first enabled authoring control, releases the reader lock, and prevents a late result from applying. The contract proves browser stream cancellation, not operating-system interruption beyond the browser API.

## User, operations, and failure scenes

- An operator exports an incomplete draft, later selects that file, and resumes with the same unresolved findings recomputed from admitted normalized facts, not every discarded raw diagnostic. Blank values do not become negative attestations.
- A complete no-collection draft restores with zero blockers only when every independent retention, transfer, service, and contact fact still satisfies current rules.
- A manipulated file that changes only `document_state` to `review_ready` is rejected and the current workspace remains unchanged.
- A file with an unknown collection key, duplicate key, mismatched label, non-canonical string/URL, uppercase status, extra property, or contradictory no-collection state is rejected with bounded user guidance rather than partially applied.
- A file larger than 1 MiB is rejected before JSON parsing. The limit bounds local memory/parse work; it is not a general upload or denial-of-service guarantee.
- While a selected file is still being read, authoring inputs cannot accept changes that a later successful restore would overwrite. A failed read or validation unlocks the unchanged workspace for correction and retry.
- An operator cancels a stalled read, hears the cancellation through the existing live output, resumes editing from the current step's first enabled control, and is not overwritten when the old browser promise later resolves.
- A valid UTF-8 character split across stream chunks is reconstructed by one incremental decoder. An ill-formed byte sequence fails the entire attempt instead of becoming replacement characters in customer facts; cancellation releases the underlying browser reader lock and rejects a non-conforming late chunk as an aborted attempt.

## Evidence

Test-only commit `86d370b1` produced five intended failures while seven existing export tests remained green because the restore function did not exist. Test-only commit `0088d686` produced three intended UI failures because no import control existed. Implementation `d5ab6bd2` made the focused 15-case domain/UI matrix pass and passed ESLint plus the TypeScript/Vite production build locally. Test-only commit `8be9e8dc` then reproduced silent acceptance of non-canonical strings; implementation `768e1c85` requires exact normalized strings and URL representation. Test-only commit `7bedeca1` bound visible focus and a 44 px interaction target for the visually hidden file input; `50afb82b` applies the existing high-contrast focus token to its visible label.

Browser contract `95b34a18` exercises a real download/restore round trip, visible focus, and invalid-file state preservation. Hosted exact-head CI execution of that contract, security workflows, and independent review remain required after the final integrated head is pushed. Local results do not authorize merge or publication.

Review repair test-only commit `15aec429c068c64af6c396f7a01f09875400017c` reproduced both later findings: the documentation-index contract failed on the nonexistent root Security target, and the pending-read UI contract failed because the import and service-name inputs remained enabled. Implementation/docs commit `f55f640091991d15718f7f9f92fb6b606b322177` uses the native disabled-fieldset contract and a disabled import input, releases both in `finally`, and corrects the relative link. Exact tree `cde2309b7810c76bca018d487520c34ac0717385` passed six Node documentation/configuration contracts, 174 Vitest cases in 16 files, ESLint, the TypeScript/Vite production build, and diff checking locally. Hosted current-head browser/security results and qualifying approval remain separate merge gates.

Pending-feedback test-only commit `3e2eba61e7e4f02c5ac8b3f9ee23895d515a37b3` then reproduced that the native lock was silent: the visible import label lacked `aria-disabled`, and the existing status region did not announce the pending file read. Implementation `fceddfe6f0e1c44d6d8a430509d751be9b65152b` reuses the same `isImporting` owner state to expose the disabled label, apply a token-aligned disabled appearance, and switch the polite live status between `JSON 초안 확인 중` and `브라우저 작업 중`. Follow-up RED `9542d9beb4036bed47d13041e7421481991c6d65` proved that placing `aria-busy` on the live region could defer the pending announcement; repair `85b194d46c7f5af334f3421df8e9ed5131a0064e` keeps busy ownership on the editing fieldset and leaves the status region immediately announceable. Focused UI validation passed 4/4 locally; hosted current-head results remain required.

Semantic-fieldset test-only commit `52d252a2c0c46b12c6cecdebd3dcc67940322bde` reproduced the remaining accessibility risk by failing while `.editing-lock` used `display: contents`. Implementation `9d540895569ab945a087bed99c7d4906b82ae532` keeps the native disabled/`aria-busy` fieldset as the middle grid item, resets only its user-agent box, and gives the contained editing panel the grid item's height so bounded scrolling remains available. Focused style/import validation passed 10/10 locally; hosted browser and assistive-technology evidence remain separate gates.

Cancellation test-only commit `88234a88a591ee2c6367dd6e7c198723423ec79d` reproduced the missing cancel action while a controlled `File.text()` promise remained pending and specified that current facts, live feedback, and unlocked controls survive a late valid result. Minimal implementation `84aa45a1f629a04986f2bfe31f0557ed04968fd6` gave each attempt a ref-backed token, gated success/error/finally effects on that token, and cleared the file input when cancellation invalidated it. The focused Vitest import matrix passed 5/5 locally; Chromium execution remained an exact-head hosted gate.

CodeRabbit exact-head finding `4111539873` identified that removing the focused cancel button left keyboard focus on the document. Test-only commit `e75f8b463b9781bc2defe0ba7f98e46ff1fb7afd` added jsdom and desktop Chromium assertions for returning focus to the active service-name input and failed 1/5 with `document.activeElement` equal to `body`. The minimal repair scoped a ref to the authoring fieldset and, after React unlocked it, focused its first enabled control. Local verification then passed documentation/configuration contracts 6/6, Vitest 176/176, ESLint, the TypeScript/Vite build, and diff checking; hosted browser evidence and independent approval remained separate.

Pending-state reflow RED `7ea567bdcacb7ab64d24711afc1ef812afecf8aa` showed that the 1300 px media block lacked topbar wrapping after cancellation added a transient control. Repair `9623449f35719c0e959f4cdbd8a881fdcf4ad97c` reused native flex wrapping and added a tablet overflow assertion. Long-name RED `66ae499b0105359c5bc0faecdd07209e1b2ad475` then proved that one unspaced service name could still widen the document; repair `803cd609203f3e01d5f4be16a653ef3671143a9a` added `min-width: 0` and `overflow-wrap: anywhere` to the document-name item at the existing tablet breakpoint. CSS contracts passed 8/8 and the production build succeeded; actual browser execution remained hosted because the local Chromium binary was unavailable.

Stream-source RED `807189694322a7620e8c42aa0799e9cfc4957226` failed at module resolution because no abortable reader existed. Minimal implementation `5e878b68824dac8f3be8b56048050a37d66f4734` added the dependency-free incremental reader, connected one `AbortController` to each UI attempt, and changed the browser contract to observe the underlying stream `cancel()` callback. Local verification passed preview contracts 6/6, Vitest 181/181 across 17 files, ESLint, the TypeScript/Vite build, Playwright discovery of 39 cases, and diff checking; hosted exact-head browser/security results and independent approval remained merge gates.

The UTF-8 regression contract was repaired again on current PR #25 at `82d1f0164a7c9ec5e13dc32e33ffb2a51b5d07c6` after direct mutation removed `{ stream: true }` and reproduced a 1/4 focused failure by splitting the final Korean character inside its three-byte sequence. Restoring the production decoder passed the focused 4/4 and full 183/183 Vitest suite, preview contracts 6/6, ESLint, the TypeScript/Vite build, and diff checking. The strict reader also rejects malformed `0xC3 0x28` instead of accepting replacement characters. These are local exact-tree results, not hosted acceptance or a release receipt.

## Session-boundary clarification — 2026-10-05

PRD `US-SESSION-01` adds truthful notice of this ADR's existing memory-only portability boundary; it does not revise schema admission, persistence or restore authority. The active editor shows one static paragraph after its heading and before inputs, explaining no automatic saving, reload/tab-close loss and existing JSON export. Header/preview `앱 버전 0.1.0` replaces the unsupported temporary-save label and is independent of JSON `schema_version: 1` and TXT `report_format: v1`. The notice does not replace the import live region, become a focus target, add beforeunload/browser storage or change the semantic input lock.

A valid native JSON download → reload-empty → explicit import journey characterizes existing behavior; it does not establish automatic recovery or a new feature. JSON carries only admitted normalized facts: rejected URLs, inactive/discarded details and every raw input are not guaranteed round-trip backup content. A failed import preserves current state; success retains validated replacement and step-1 navigation. Download initiation is not completed storage, and TXT is not a restore artifact. Existing cancellation/stream work remains separately owned, not implied by this clarification.

[The session evidence record](evidence/session-notice-20261005.md) retains parent-reported focused TDD/build observations separately from direct source inspection, all historic receipts above and unfinished current full/browser/hosted/independent-approval gates. This ADR remains Proposed; no new CI pass, protected integration, release or legal conclusion is asserted.

## Canonical URL evidence clarification — 2026-10-05 successor candidate

"Same unresolved findings" applies to admitted normalized facts and their exact recomputed evidence. It does not promise a full raw-input backup or recovery of discarded diagnostics. The live editor keeps `service_url_format` for nonblank rejected URL correction; JSON withholds the rejected URL as `null` and derives canonical `service_url`. Restore reconstructs the empty sentinel, remains incomplete and retains service-information step-1 ownership. The canonical TXT projection uses the same URL/code boundary; TXT is still not a restore artifact.

`schema_version: 1`, exact object/catalog/status validation, reconstruction and ordered finding/readiness equality remain unchanged. Historical producer-inconsistent `null` + `service_url_format` files remain rejected, with no grandfathering, dual-code exception, trusted file evidence, automatic repair or migration. Existing blank/valid JSON/TXT bytes must be preserved, but frozen predecessor-fixture verification was pending at the initial checkpoint. Parent 03:18 KST successor confirms retained-source blank/valid JSON direct-export and restore/re-export byte equality plus withheld strict denial; frozen TXT comparison remains unverified. The producer repair is not a schema revision; any future schema revision still requires explicit migration/loss/compatibility treatment.

[The successor evidence](evidence/url-portability-20261005.md) preserves independent Layer1 proposals and frozen native RED, summary-fed Layer2 conditional reviews, parent synthesis and intermediate native 2-RED/3-control → 5-GREEN plus related 35-pass/lint/build observations. Current full/browser, whole prior-PR union independent review and hosted/qualifying-approval gates are pending. Parent 03:18 KST successor reports 65 focused cases plus lint/build against the owned source/test freeze, still not full-suite acceptance. This ADR remains Proposed; no protected shipment or legal conclusion is asserted, and separate PR #25 cancellation/stream ownership is unchanged.

## Mobile pending-feedback clarification — 2026-10-05 candidate

PRD `US-IMPORT-FEEDBACK-01` selects a CSS-only mobile exposure repair for this ADR's existing polite status. Pending `JSON 초안 확인 중` and idle `브라우저 작업 중` reuse the same region and App state; idle is not saved work or continuing validation. Fieldset busy remains separate from the live region and its ancestors. No duplicate live output, static-notice promotion, new lock/cancellation, schema change, raw-backup promise or persistence authority is introduced.

[The dated evidence](evidence/mobile-import-feedback-20261005.md) records actual mobile invisibility despite working native lock/release, conditional full-proposal cross-reviews and required repository TDD/final gates. Valid replacement/step-1 behavior, invalid/read-failure preservation, oversize rejection before read and exact file bytes remain acceptance boundaries. AX exposure is not actual AT speech. This clarification does not complete current hosted/approval gates or alter Proposed status and separate PR #25 ownership.

## Consequences and follow-up

PolicyWeave owns a deterministic local export/restore round trip for admitted normalized schema-v1 facts with consistent recomputed evidence, including browser stream cancellation, token-invalidated stale-result effects, incremental UTF-8 reconstruction, and fail-closed malformed-byte handling. It does not preserve every historical producer-inconsistent file or discarded raw value and does not claim operating-system interruption beyond the browser API. This closes the missing current-version return path, not version migration. Any schema-v2 work must define explicit migration, loss reporting, compatibility fixtures, and rollback behavior. DB-backed versioned ko/en/ja/zh/vi/es/de/fr resources remain a separate owner contract; schema-v1 catalog-label identity must not be relaxed by embedding a full translation catalog in the browser.
