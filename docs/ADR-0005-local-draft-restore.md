# ADR-0005: Fail-closed local schema-v1 draft restore

- Status: Proposed
- Date: 2026-09-26
- Owner: Policy Fact Authoring
- Scope: `src/policy.ts`, `src/App.tsx`, schema-v1 local portability
- Evidence: RED commits `e1150b2`, `562ccc1`, `20ba914`, and `20820c4`; implementation commits `b691cf3`, `696a1ce`, and `a28aea2`; browser contract commit `a94dbfc`

## Problem

PolicyWeave could export a deterministic schema-v1 draft but could not reopen it. An operator therefore had a portability artifact without a product-owned return path. Adding an unchecked JSON loader would be worse than leaving the gap open: a file could claim `review_ready`, introduce an unknown collection identity, coerce an unsupported status, or combine a no-collection attestation with active collection items.

This decision does not introduce hosted persistence, publication, legal approval, a general migration framework, or an external interoperability contract. It restores only the exact local schema version already emitted by PolicyWeave.

## Constraints

- Structured operator facts remain authoritative; exported readiness and finding fields are derived evidence.
- Unknown properties, missing properties, unsupported versions, wrong runtime types, non-canonical strings/URLs, duplicate/unknown collection keys, catalog-label mismatches, and contradictory facts fail closed.
- Collection, retention, and transfer statuses use exact existing vocabulary without case, whitespace, or type coercion.
- The browser must not replace current work until the complete file has passed validation.
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

After reconstruction, PolicyWeave runs `createPolicyExport` again. Imported `document_state` and ordered `review_finding_codes` must match the recomputed result. The UI reads at most one 1 MiB local file, applies all state setters only after validation succeeds, returns to the first authoring step, and reports success or a retry action through the existing live status output.

## User, operations, and failure scenes

- An operator exports an incomplete draft, later selects that file, and resumes with the same unresolved findings. Blank values do not become negative attestations.
- A complete no-collection draft restores with zero blockers only when every independent retention, transfer, service, and contact fact still satisfies current rules.
- A manipulated file that changes only `document_state` to `review_ready` is rejected and the current workspace remains unchanged.
- A file with an unknown collection key, duplicate key, mismatched label, non-canonical string/URL, uppercase status, extra property, or contradictory no-collection state is rejected with bounded user guidance rather than partially applied.
- A file larger than 1 MiB is rejected before JSON parsing. The limit bounds local memory/parse work; it is not a general upload or denial-of-service guarantee.

## Evidence

Test-only commit `e1150b2` produced five intended failures while seven existing export tests remained green because the restore function did not exist. Test-only commit `562ccc1` produced three intended UI failures because no import control existed. Implementation `b691cf3` made the focused 15-case domain/UI matrix pass and passed ESLint plus the TypeScript/Vite production build locally. Test-only commit `20ba914` then reproduced silent acceptance of non-canonical strings; implementation `696a1ce` requires exact normalized strings and URL representation. Test-only commit `20820c4` bound visible focus and a 44 px interaction target for the visually hidden file input; `a28aea2` applies the existing high-contrast focus token to its visible label.

Browser contract `a94dbfc` exercises a real download/restore round trip, visible focus, and invalid-file state preservation. Hosted exact-head CI execution of that contract, security workflows, and independent review remain required after the final integrated head is pushed. Local results do not authorize merge or publication.

## Consequences and follow-up

PolicyWeave now owns a deterministic local export/restore round trip for schema-v1. This closes the missing current-version return path, not version migration. Any schema-v2 work must define explicit migration, loss reporting, compatibility fixtures, and rollback behavior. DB-backed versioned ko/en/ja/zh/vi/es/de/fr resources remain a separate owner contract; schema-v1 catalog-label identity must not be relaxed by embedding a full translation catalog in the browser.
