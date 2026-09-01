# Changelog

All notable product changes are recorded here. PolicyWeave is pre-release; entries describe the active commercialization branch and do not imply a published compliance product.

## Unreleased

### Added
- Seven-step authoring workflow with distinct editing surfaces for service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact.
- Warning-to-source navigation for missing processing purposes.
- Regression coverage for all seven step routes, warning navigation, and clearing the publication blocker after a missing purpose is supplied.
- Product/technical gap ledger, architecture, technical requirements, security baseline, and legal-source traceability.

### Changed
- Review preview now reflects verified authoring facts instead of presenting the collection step as the entire workflow.
- Responsive review behavior and mobile publication feedback were repaired during PR review.
- GitHub Actions checkout dependencies are SHA pinned and credentials are not persisted in the working tree.

### Not yet shipped
- Durable versioned policy persistence and audit history.
- Authenticated immutable publication revisions and public URL lifecycle.
- Browser-matrix/accessibility evidence and hosted endpoint load testing.
- Legal/rule engine backed by versioned authoritative requirements.
