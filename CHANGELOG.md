# Changelog

All notable product changes are recorded here. PolicyWeave is pre-release; entries describe the active commercialization branch and do not imply a published compliance product.

## Unreleased

### Added
- Seven-step authoring workflow with distinct editing surfaces for service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact.
- Warning-to-source navigation for missing processing purposes.
- Regression coverage for all seven step routes, warning navigation, clearing the publication blocker after a missing purpose is supplied, whitespace-only purposes, collection-path/purpose step separation, disable/re-enable stale-evidence invalidation, preview/review whitespace consistency, and buyer-facing publication guidance that does not expose implementation boundaries.
- Product/technical gap ledger, architecture, technical requirements, security baseline, and legal-source traceability.

### Changed
- Collection-path editing now remains available for every selected item in the collection step, while processing-purpose editing stays in its dedicated purpose step.
- Disabling a collection item now clears its dependent processing-purpose and collection-path evidence so re-enabling it cannot silently revive stale policy facts.
- Review preview now applies the same whitespace-normalized purpose-completeness contract as the blocking review rule.
- The publication-area CTA now describes a readiness check and directs the operator to responsible review rather than exposing repository/backend implementation details for an unshipped capability.
- Review preview now reflects verified authoring facts instead of presenting the collection step as the entire workflow.
- Responsive review behavior and mobile publication feedback were repaired during PR review.
- Responsive CSS contract tests now use only literal media-query regular expressions, removing the Semgrep dynamic-RegExp SAST finding without suppressing or weakening the scanner gate.
- GitHub Actions checkout dependencies are SHA pinned and credentials are not persisted in the working tree.

### Not yet shipped
- Durable versioned policy persistence and audit history.
- Authenticated immutable publication revisions and public URL lifecycle.
- Browser-matrix/accessibility evidence and hosted endpoint load testing.
- Legal/rule engine backed by versioned authoritative requirements.
