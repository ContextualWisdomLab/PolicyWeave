# Changelog

All notable product changes are recorded here. PolicyWeave is pre-release; entries describe the active commercialization branch and do not imply a published compliance product.

## Unreleased

### Added
- Seven-step authoring workflow with distinct editing surfaces for service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact.
- Warning-to-source navigation for missing collection selection, collection mode, and processing purposes.
- Regression coverage for all seven step routes, zero-inferred startup facts, collection-mode confirmation, selection/mode warning navigation, service URL projection into the review draft, warning navigation, clearing publication blockers, whitespace-only purposes, collection-path/purpose step separation, disable/re-enable stale-evidence invalidation, preview/review whitespace consistency, buyer-facing publication guidance, and non-deceptive handling of unshipped export/generation/document-selection affordances.
- Product/technical gap ledger, architecture, technical requirements, security baseline, and legal-source traceability.

### Changed
- Fresh workspaces no longer preselect collection items or prefill collection modes/processing purposes; readiness now fails closed until the operator establishes actual collection facts.
- Disabling a collection item now clears its collection mode, processing purpose, and collection-path evidence so re-enabling it cannot silently revive stale customer facts.
- Service URL entered in the service-information step is now projected into the review draft instead of being silently omitted.
- Collection-path editing now remains available for every selected item in the collection step, while processing-purpose editing stays in its dedicated purpose step.
- Review preview now applies the same whitespace-normalized purpose-completeness contract as the blocking review rule.
- The publication-area CTA now describes a readiness check and directs the operator to responsible review rather than exposing repository/backend implementation details for an unshipped capability.
- Unshipped JSON export is visibly disabled as `준비 중`, the redundant no-op `검토본 생성` control was removed because the review draft already updates live, and the document title is rendered as status text rather than an inert dropdown-like button.
- Review preview now reflects verified authoring facts instead of presenting the collection step as the entire workflow.
- Responsive review behavior and mobile publication feedback were repaired during PR review.
- Responsive CSS contract tests now use only literal media-query regular expressions, removing the Semgrep dynamic-RegExp SAST finding without suppressing or weakening the scanner gate.
- GitHub Actions checkout dependencies are SHA pinned and credentials are not persisted in the working tree.

### Not yet shipped
- Requirement-complete typed validation for service identity, retention, transfers, privacy contact, and collection-path evidence.
- Durable versioned policy persistence and audit history.
- Authenticated immutable publication revisions and public URL lifecycle.
- Browser-matrix/accessibility evidence and hosted endpoint load testing.
- Legal/rule engine backed by versioned authoritative requirements.