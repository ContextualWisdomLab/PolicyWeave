# ADR-0002: Seven-step authoring is an explicit domain workflow

Status: Accepted
Date: 2026-09-01

## Context
The PRD defines seven authoring stages, but an early implementation changed only the step rail while always rendering the collection-item editor. This made the buyer-facing workflow appear complete while most facts were not editable and review findings could not lead the operator to the responsible input.

A later commercialization pass found a second workflow-integrity defect: the fresh workspace preselected collection items and prefilled service-specific collection modes and processing purposes. Those values looked like customer facts even though the operator had never established them, contradicting PolicyWeave's fact-authoring boundary and its prohibition on synthetic production data.

A subsequent exact-head pass found that even after collection facts were repaired, the readiness CTA could enable while service identity, retention, transfer statuses, and privacy contact were still visibly unresolved in the review draft. Blank transfer fields were also ambiguous between `none` and `not yet checked`.

## Decision
Each PRD stage is an explicit editable state of the Policy Fact Authoring context: service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact. The UI router must render a corresponding editor for the selected stage. Review findings carry enough domain context to navigate to the responsible stage.

The collection catalog is metadata, not an assertion about a customer's service. A fresh workspace therefore starts with every collection item unselected and with collection mode and processing purpose unresolved. Selecting an item requires the operator to establish its collection mode and purpose before readiness can clear. An empty selection is treated as unresolved, not as an inferred assertion that the service collects no personal data. Disabling an item invalidates its mode, purpose, and collection-path evidence so re-enabling cannot silently restore stale facts.

Readiness also requires the product-defined facts owned by the other authoring stages: service name and URL, retention period, third-party provision status, international-transfer status, and privacy-contact owner/email. Third-party provision and international transfer use explicit unresolved/yes/no states. `no` is an operator attestation, not an inference from a blank field. `yes` requires its dependent recipient/purpose or country/recipient facts. A transition away from `yes` clears those dependent values so stale operational facts do not silently revive.

These readiness rules are authoring-completeness rules, not a legal state machine. Completion of a UI step or zero product-defined blockers does not mean legal sufficiency. Legal/rule completeness is determined separately by deterministic rules bound to versioned authoritative source evidence.

## Consequences
- Navigation and review-to-source behavior are regression-tested.
- Production startup state contains taxonomy metadata only, not inferred customer operational facts.
- Selection, collection mode, processing purpose, service identity, retention, transfer status/detail, and privacy contact findings fail closed and navigate to their owning step.
- Blank transfer state can no longer masquerade as an explicit `none` attestation.
- Stale collection and transfer-dependent facts are invalidated when their owning status changes.
- The preview remains a projection over structured facts and cannot become an independent source of truth.
- Future persistence stores facts and revision/review state rather than serialized page prose.
- Additional legal validations can grow without redefining the seven buyer-facing authoring responsibilities.
