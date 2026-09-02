# Changelog

All notable product changes are recorded here. PolicyWeave is pre-release; entries describe the active commercialization branch and do not imply a published compliance product.

## Unreleased

### Added
- Seven-step authoring workflow with distinct editing surfaces for service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact.
- Explicit `개인정보를 수집하지 않음` operator attestation so a genuine no-collection service can complete authoring without treating an empty item list as `none`.
- Warning-to-source navigation for missing collection selection/no-collection confirmation, collection mode, collection-path evidence, processing purposes, service identity, retention, transfer statuses/details, and privacy contact.
- Explicit unresolved/yes/no states for third-party provision and international transfer, with dependent detail capture only for confirmed `yes` cases.
- Regression coverage for all seven step routes, zero-inferred startup facts, first-responsibility startup state, explicit no-collection state and stale-item invalidation, collection-mode/path confirmation, seven-step readiness, explicit no-transfer attestations, transfer-dependent fact invalidation, whitespace normalization, service URL projection, warning navigation, collection-path/purpose separation, stale collection evidence invalidation, buyer-facing publication guidance, non-deceptive handling of unshipped affordances, authored focus-indicator contrast, and authoring-step focus transfer.
- Product/technical gap ledger, architecture, technical requirements, security baseline, and legal-source/accessibility traceability.

### Changed
- Fresh workspaces no longer preselect collection items or prefill collection modes/processing purposes; readiness fails closed until the operator establishes actual collection facts or explicitly attests that the service collects no personal data.
- Fresh workspaces now open at step 1, service information, rather than displaying step 2 while falsely rendering the untouched first responsibility as completed.
- Empty collection selection remains unresolved rather than being interpreted as `none`; no-collection and selected-item states are mutually exclusive and contradictory state fails closed.
- Turning on no-collection confirmation clears selected-item mode, purpose, and path evidence; later removing the confirmation does not silently restore stale customer facts.
- Every selected collection item requires explicit collection mode, processing purpose, and nonblank collection-path evidence before readiness can pass; collection-path findings navigate back to the collection step.
- Public-readiness includes product-defined service name/URL, retention, transfer-status/detail, and privacy-contact completeness rather than allowing the CTA to enable while those steps remain visibly unresolved.
- Service URL and privacy-contact email are shape-validated as usability contracts without claiming endpoint reachability or mailbox ownership.
- Blank transfer state is no longer treated as an implicit `none`; explicit `없음` confirmation is required, while `있음` requires dependent recipient/purpose or country/recipient facts.
- Changing a transfer status away from `있음` clears its dependent details so stale customer facts cannot silently revive.
- Disabling a collection item clears its collection mode, processing purpose, and collection-path evidence so re-enabling cannot silently revive stale customer facts.
- Service URL entered in the service-information step is projected into the review draft.
- Collection-path editing remains in the collection step while processing-purpose editing stays in its dedicated purpose step.
- Review preview applies the same whitespace-normalized purpose-completeness contract as the blocking review rule.
- Step-rail, previous/next, and review-warning navigation now transfers programmatic focus to the newly active step heading; ordinary form controls and the dedicated preview shortcut are excluded from that transfer.
- The publication-area CTA describes a readiness check and directs the operator to responsible review rather than exposing internal implementation boundaries.
- Unshipped JSON export is visibly disabled as `준비 중`, the redundant no-op `검토본 생성` control was removed, and the document title is non-interactive status text.
- Authored generic and custom-checkbox keyboard focus outlines now use the high-contrast `--green` token; a CSS regression test computes and enforces at least 3:1 contrast against white instead of relying on a low-contrast focus color.
- Responsive review behavior and mobile publication feedback were repaired during PR review.
- Responsive CSS contract tests use literal media-query regular expressions, removing the Semgrep dynamic-RegExp finding without suppressing or weakening the scanner gate.
- GitHub Actions checkout dependencies are SHA pinned and credentials are not persisted in the working tree.

### Not yet shipped
- Authoritative legal-rule snapshots that can determine legal sufficiency beyond product-defined fact completeness.
- Full browser-matrix/accessibility evidence and screenshot verification beyond CSS focus contrast and deterministic step-focus transition tests.
- Durable versioned policy persistence and audit history.
- Authenticated immutable publication revisions and public URL lifecycle.
- Hosted tenant/security/operability evidence and endpoint load testing.
