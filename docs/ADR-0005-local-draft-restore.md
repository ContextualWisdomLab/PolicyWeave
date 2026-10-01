# ADR-0005: Fail-closed local schema-v1 draft restore

- Status: Proposed
- Date: 2026-09-26
- Owner: Policy Fact Authoring
- Scope: `src/policy.ts`, `src/local-draft-reader.ts`, `src/App.tsx`, schema-v1 local portability
- Evidence: RED commits `86d370b1`, `0088d686`, `8be9e8dc`, `7bedeca1`, and `80718969`; implementation commits `d5ab6bd2`, `768e1c85`, `50afb82b`, and `5e878b68`; browser contract commit `95b34a18`

## Problem

PolicyWeave could export a deterministic schema-v1 draft but could not reopen it. An operator therefore had a portability artifact without a product-owned return path. Adding an unchecked JSON loader would be worse than leaving the gap open: a file could claim `review_ready`, introduce an unknown collection identity, coerce an unsupported status, or combine a no-collection attestation with active collection items.

This decision does not introduce hosted persistence, publication, legal approval, a general migration framework, or an external interoperability contract. It restores only the exact local schema version already emitted by PolicyWeave.

## Constraints

- Structured operator facts remain authoritative; exported readiness and finding fields are derived evidence.
- Unknown properties, missing properties, unsupported versions, wrong runtime types, non-canonical strings/URLs, duplicate/unknown collection keys, catalog-label mismatches, and contradictory facts fail closed.
- Collection, retention, and transfer statuses use exact existing vocabulary without case, whitespace, or type coercion.
- File bytes must be well-formed UTF-8. Decoding must not replace malformed sequences with U+FFFD and then admit the altered value as an operator fact.
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

After reconstruction, PolicyWeave runs `createPolicyExport` again. Imported `document_state` and ordered `review_finding_codes` must match the recomputed result. The UI reads at most one 1 MiB local file through its browser `ReadableStream` and one incremental `TextDecoder('utf-8', { fatal: true })`, so valid multibyte characters may cross chunks while malformed byte sequences reject the attempt. It disables the import input and authoring fieldset while reading and validating, and exposes a keyboard-operable cancel action outside that fieldset. Each attempt owns both an `AbortController` and a monotonically invalidated token. Cancellation reaches the active stream reader through `cancel()`, while success, error, and cleanup effects run only for the current token. The two safeguards immediately unlock the unchanged workspace, move focus from the removed cancel button to the current step's first enabled authoring control, release the browser reader lock, and prevent a late result from applying. This contract proves browser stream cancellation; it does not claim operating-system interruption beyond the browser API.

## User, operations, and failure scenes

- An operator exports an incomplete draft, later selects that file, and resumes with the same unresolved findings. Blank values do not become negative attestations.
- A complete no-collection draft restores with zero blockers only when every independent retention, transfer, service, and contact fact still satisfies current rules.
- A manipulated file that changes only `document_state` to `review_ready` is rejected and the current workspace remains unchanged.
- A file with an unknown collection key, duplicate key, mismatched label, non-canonical string/URL, uppercase status, extra property, or contradictory no-collection state is rejected with bounded user guidance rather than partially applied.
- A file larger than 1 MiB is rejected before JSON parsing. The limit bounds local memory/parse work; it is not a general upload or denial-of-service guarantee.
- While a selected file is still being read, authoring inputs cannot accept changes that a later successful restore would overwrite. A failed read or validation unlocks the unchanged workspace for correction and retry.
- An operator cancels a stalled read, hears the cancellation through the existing live output, resumes editing from the current step's first enabled control instead of losing focus to the document, and is not overwritten when the old browser promise later resolves.
- A valid UTF-8 character split across stream chunks is reconstructed by one incremental decoder rather than corrupted at chunk boundaries. An ill-formed byte sequence fails the entire attempt instead of becoming replacement characters in customer facts. Cancellation invokes the underlying browser reader, releases its lock, and still rejects a non-conforming late chunk as an aborted attempt.

## Evidence

Test-only commit `86d370b1` produced five intended failures while seven existing export tests remained green because the restore function did not exist. Test-only commit `0088d686` produced three intended UI failures because no import control existed. Implementation `d5ab6bd2` made the focused 15-case domain/UI matrix pass and passed ESLint plus the TypeScript/Vite production build locally. Test-only commit `8be9e8dc` then reproduced silent acceptance of non-canonical strings; implementation `768e1c85` requires exact normalized strings and URL representation. Test-only commit `7bedeca1` bound visible focus and a 44 px interaction target for the visually hidden file input; `50afb82b` applies the existing high-contrast focus token to its visible label.

Browser contract `95b34a18` exercises a real download/restore round trip, visible focus, and invalid-file state preservation. Hosted exact-head CI execution of that contract, security workflows, and independent review remain required after the final integrated head is pushed. Local results do not authorize merge or publication.

Review repair test-only commit `15aec429c068c64af6c396f7a01f09875400017c` reproduced both later findings: the documentation-index contract failed on the nonexistent root Security target, and the pending-read UI contract failed because the import and service-name inputs remained enabled. Implementation/docs commit `f55f640091991d15718f7f9f92fb6b606b322177` uses the native disabled-fieldset contract and a disabled import input, releases both in `finally`, and corrects the relative link. Exact tree `cde2309b7810c76bca018d487520c34ac0717385` passed six Node documentation/configuration contracts, 174 Vitest cases in 16 files, ESLint, the TypeScript/Vite production build, and diff checking locally. Hosted current-head browser/security results and qualifying approval remain separate merge gates.

Pending-feedback test-only commit `3e2eba61e7e4f02c5ac8b3f9ee23895d515a37b3` then reproduced that the native lock was silent: the visible import label lacked `aria-disabled`, and the existing status region did not announce the pending file read. Implementation `fceddfe6f0e1c44d6d8a430509d751be9b65152b` reuses the same `isImporting` owner state to expose the disabled label, apply a token-aligned disabled appearance, and switch the polite live status between `JSON 초안 확인 중` and `브라우저 작업 중`. Follow-up RED `9542d9beb4036bed47d13041e7421481991c6d65` proved that placing `aria-busy` on the live region could defer the pending announcement; repair `85b194d46c7f5af334f3421df8e9ed5131a0064e` keeps busy ownership on the editing fieldset and leaves the status region immediately announceable. Focused UI validation passed 4/4 locally; hosted current-head results remain required.

Semantic-fieldset test-only commit `52d252a2c0c46b12c6cecdebd3dcc67940322bde` reproduced the remaining accessibility risk by failing while `.editing-lock` used `display: contents`. Implementation `9d540895569ab945a087bed99c7d4906b82ae532` keeps the native disabled/`aria-busy` fieldset as the middle grid item, resets only its user-agent box, and gives the contained editing panel the grid item's height so bounded scrolling remains available. Focused style/import validation passed 10/10 locally; hosted browser and assistive-technology evidence remain separate gates.

Cancellation test-only commit `88234a88a591ee2c6367dd6e7c198723423ec79d` reproduces the missing cancel action while a controlled `File.text()` promise remains pending and specifies that the current facts, live message, and unlocked controls survive a late valid result. It also adds one desktop Chromium keyboard/live-region contract. Minimal implementation `84aa45a1f629a04986f2bfe31f0557ed04968fd6` gives each attempt a ref-backed token, gates success/error/finally effects on that token, and clears the file input when cancellation invalidates it. The focused Vitest import matrix passed 5/5 locally. Chromium execution remains a hosted exact-head gate because the local Playwright browser binary is unavailable.

CodeRabbit exact-head review finding `4111539873` identified that removing the focused cancel button left keyboard focus on the document. Test-only commit `e75f8b463b9781bc2defe0ba7f98e46ff1fb7afd` adds jsdom and desktop Chromium assertions for returning focus to the active service-name input; the focused Vitest matrix failed 1/5 with `document.activeElement` equal to `body`. The minimal repair scopes a ref to the authoring fieldset and, after React unlocks it, focuses its first enabled input, select, textarea, or button. Local verification on the final tree passed documentation/configuration contracts 6/6, Vitest 176/176, ESLint, TypeScript/Vite build, and diff checking. Hosted exact-head browser evidence and independent approval remain separate gates.

Pending-state reflow test-only commit `7ea567bdcacb7ab64d24711afc1ef812afecf8aa` exposed that only the <=720 px layout wrapped the topbar even though cancellation adds another transient control. The CSS contract failed 1/7 because the 1300 px media block had no topbar wrap rule. Minimal repair `9623449f35719c0e959f4cdbd8a881fdcf4ad97c` reuses native flex wrapping at that existing breakpoint and extends the real-browser cancellation case to the tablet profile with a document-width overflow assertion. The CSS contract passes 7/7 and the production build succeeds locally. Playwright test discovery reached the tablet case, but local Chromium launch stopped before page execution because the browser binary is unavailable; hosted exact-head execution remains authoritative.

Long-name reflow test-only commit `66ae499b0105359c5bc0faecdd07209e1b2ad475` narrows the preceding claim: flex wrapping alone cannot shrink an automatic-minimum flex item when `service_name` is one long unspaced token. It adds an exact CSS contract and changes the desktop/tablet browser case to a 320-character unbroken name; the CSS contract failed 1/8 before production changed. Minimal repair `803cd609203f3e01d5f4be16a653ef3671143a9a` applies `min-width: 0` and `overflow-wrap: anywhere` only to the document-name item at the existing tablet breakpoint. The CSS contract passes 8/8 and the production build succeeds locally. Actual browser execution remains a hosted exact-head gate because the local Chromium binary is unavailable.

Stream-source RED `807189694322a7620e8c42aa0799e9cfc4957226` failed at module resolution because no abortable reader existed. Minimal implementation `5e878b68824dac8f3be8b56048050a37d66f4734` adds the dependency-free incremental reader, connects one `AbortController` to each UI attempt, and changes the browser contract to observe the underlying stream `cancel()` callback. Local verification passed preview contracts 6/6, Vitest 181/181 across 17 files, ESLint, the TypeScript/Vite production build, Playwright discovery of 39 cases, and diff checking. Local execution of the changed Playwright case stopped before page execution because the Chromium binary is absent; hosted exact-head browser and security results plus independent approval remain merge gates.

CodeRabbit review found that the UTF-8 fixture split only the trailing ASCII quote and brace, so it could not detect removal of incremental decoder state. Test repair `234d7e9aa8a49cc1c90e6510275b564a12b04b20` moves the boundary inside the final three-byte Korean character. A local mutation that removed `{ stream: true }` then failed 1/3 focused reader cases with `정책` decoded as `정��`; restoring the production decoder passed the focused 3/3 and the full 181/181 Vitest suite, preview contracts 6/6, ESLint, the TypeScript/Vite production build, and diff checking.

The current repair adds an exact raw-byte regression in which `0xC3 0x28` previously decoded to `U+FFFD` plus `(` and returned successfully. Strict fatal decoding makes the focused reader suite reject that sequence while retaining split-character reconstruction and cancellation behavior. Hosted exact-head verification and independent review remain required.

## Consequences and follow-up

PolicyWeave now owns a deterministic local export/restore round trip for schema-v1, including browser stream cancellation and token-invalidated stale result effects. This closes the missing current-version return path and the bounded underlying browser-reader cancellation gap, not version migration or operating-system-level interruption beyond the browser API. Any schema-v2 work must define explicit migration, loss reporting, compatibility fixtures, and rollback behavior. DB-backed versioned ko/en/ja/zh/vi/es/de/fr resources remain a separate owner contract; schema-v1 catalog-label identity must not be relaxed by embedding a full translation catalog in the browser.
