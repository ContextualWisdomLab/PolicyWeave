# ADR-0002: Seven-step authoring is an explicit domain workflow

Status: Accepted
Date: 2026-09-01

## Context
The PRD defines seven authoring stages, but an early implementation changed only the step rail while always rendering the collection-item editor. This made the buyer-facing workflow appear complete while most facts were not editable and review findings could not lead the operator to the responsible input.

## Decision
Each PRD stage is an explicit editable state of the Policy Fact Authoring context: service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact. The UI router must render a corresponding editor for the selected stage. Review findings carry enough domain context to navigate to the responsible stage.

The workflow is not a legal state machine. Completion of a UI step does not mean legal sufficiency. Legal/rule completeness is determined separately by deterministic review rules bound to versioned authoritative source evidence.

## Consequences
- Navigation and review-to-source behavior are regression-tested.
- The preview remains a projection over structured facts and cannot become an independent source of truth.
- Future persistence stores facts and revision/review state rather than serialized page prose.
- Additional legal validations can grow without redefining the seven buyer-facing authoring responsibilities.
