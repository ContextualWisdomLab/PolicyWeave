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
- The browser must not replace current work until the complete file has passed validation. Authoring controls remain locked while validation is pending, but the operator can cancel that attempt; a late success or failure from the invalidated attempt must not replace facts, overwrite the cancellation message, or relock/unlock a newer attempt.
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

After reconstruction, PolicyWeave runs `createPolicyExport` again. Imported `document_state` and ordered `review_finding_codes` must match the recomputed result. The UI reads at most one 1 MiB local file, disables the import input and authoring fieldset while reading and validating, and exposes a keyboard-operable cancel action outside that fieldset. Each attempt owns a monotonically invalidated token. Success, error, and cleanup effects run only for the current token, so cancellation immediately unlocks the unchanged workspace, moves focus from the removed cancel button to the current step's first enabled authoring control, and prevents a late result from applying. This logical cancellation does not claim that the browser stopped the underlying file read.

## User, operations, and failure scenes

- An operator exports an incomplete draft, later selects that file, and resumes with the same unresolved findings. Blank values do not become negative attestations.
- A complete no-collection draft restores with zero blockers only when every independent retention, transfer, service, and contact fact still satisfies current rules.
- A manipulated file that changes only `document_state` to `review_ready` is rejected and the current workspace remains unchanged.
- A file with an unknown collection key, duplicate key, mismatched label, non-canonical string/URL, uppercase status, extra property, or contradictory no-collection state is rejected with bounded user guidance rather than partially applied.
- A file larger than 1 MiB is rejected before JSON parsing. The limit bounds local memory/parse work; it is not a general upload or denial-of-service guarantee.
- While a selected file is still being read, authoring inputs cannot accept changes that a later successful restore would overwrite. A failed read or validation unlocks the unchanged workspace for correction and retry.
- An operator cancels a stalled read, hears the cancellation through the existing live output, resumes editing from the current step's first enabled control instead of losing focus to the document, and is not overwritten when the old browser promise later resolves.

## Evidence

Test-only commit `86d370b1` produced five intended failures while seven existing export tests remained green because the restore function did not exist. Test-only commit `0088d686` produced three intended UI failures because no import control existed. Implementation `d5ab6bd2` made the focused 15-case domain/UI matrix pass and passed ESLint plus the TypeScript/Vite production build locally. Test-only commit `8be9e8dc` then reproduced silent acceptance of non-canonical strings; implementation `768e1c85` requires exact normalized strings and URL representation. Test-only commit `7bedeca1` bound visible focus and a 44 px interaction target for the visually hidden file input; `50afb82b` applies the existing high-contrast focus token to its visible label.

Browser contract `95b34a18` exercises a real download/restore round trip, visible focus, and invalid-file state preservation. Hosted exact-head CI execution of that contract, security workflows, and independent review remain required after the final integrated head is pushed. Local results do not authorize merge or publication.

Review repair test-only commit `15aec429c068c64af6c396f7a01f09875400017c` reproduced both later findings: the documentation-index contract failed on the nonexistent root Security target, and the pending-read UI contract failed because the import and service-name inputs remained enabled. Implementation/docs commit `f55f640091991d15718f7f9f92fb6b606b322177` uses the native disabled-fieldset contract and a disabled import input, releases both in `finally`, and corrects the relative link. Exact tree `cde2309b7810c76bca018d487520c34ac0717385` passed six Node documentation/configuration contracts, 174 Vitest cases in 16 files, ESLint, the TypeScript/Vite production build, and diff checking locally. Hosted current-head browser/security results and qualifying approval remain separate merge gates.

Pending-feedback test-only commit `3e2eba61e7e4f02c5ac8b3f9ee23895d515a37b3` then reproduced that the native lock was silent: the visible import label lacked `aria-disabled`, and the existing status region did not announce the pending file read. Implementation `fceddfe6f0e1c44d6d8a430509d751be9b65152b` reuses the same `isImporting` owner state to expose the disabled label, apply a token-aligned disabled appearance, and switch the polite live status between `JSON 초안 확인 중` and `브라우저 작업 중`. Follow-up RED `9542d9beb4036bed47d13041e7421481991c6d65` proved that placing `aria-busy` on the live region could defer the pending announcement; repair `85b194d46c7f5af334f3421df8e9ed5131a0064e` keeps busy ownership on the editing fieldset and leaves the status region immediately announceable. Focused UI validation passed 4/4 locally; hosted current-head results remain required.

Semantic-fieldset test-only commit `52d252a2c0c46b12c6cecdebd3dcc67940322bde` reproduced the remaining accessibility risk by failing while `.editing-lock` used `display: contents`. Implementation `9d540895569ab945a087bed99c7d4906b82ae532` keeps the native disabled/`aria-busy` fieldset as the middle grid item, resets only its user-agent box, and gives the contained editing panel the grid item's height so bounded scrolling remains available. Focused style/import validation passed 10/10 locally; hosted browser and assistive-technology evidence remain separate gates.

Cancellation test-only commit `d442ebd` reproduces the missing cancel action while a controlled `File.text()` promise remains pending and specifies that the current facts, live message, and unlocked controls survive a late valid result. It also adds one desktop Chromium keyboard/live-region contract. Minimal implementation `7684c0e` gives each attempt a ref-backed token, gates success/error/finally effects on that token, and clears the file input when cancellation invalidates it. The focused Vitest import matrix passed 5/5 locally. Chromium execution remains a hosted exact-head gate because the local Playwright browser binary is unavailable.

CodeRabbit exact-head review finding `4111539873` identified that removing the focused cancel button left keyboard focus on the document. Test-only commit `e75f8b463b9781bc2defe0ba7f98e46ff1fb7afd` adds jsdom and desktop Chromium assertions for returning focus to the active service-name input; the focused Vitest matrix failed 1/5 with `document.activeElement` equal to `body`. The minimal repair scopes a ref to the authoring fieldset and, after React unlocks it, focuses its first enabled input, select, textarea, or button. Local verification on the final tree passed documentation/configuration contracts 6/6, Vitest 176/176, ESLint, TypeScript/Vite build, and diff checking. Hosted exact-head browser evidence and independent approval remain separate gates.

## Consequences and follow-up

PolicyWeave now owns a deterministic local export/restore round trip for schema-v1, including cancellation that invalidates stale result effects. This closes the missing current-version return path, not version migration or operating-system-level file-read abortion. Any schema-v2 work must define explicit migration, loss reporting, compatibility fixtures, and rollback behavior. DB-backed versioned ko/en/ja/zh/vi/es/de/fr resources remain a separate owner contract; schema-v1 catalog-label identity must not be relaxed by embedding a full translation catalog in the browser.
