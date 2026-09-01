# Product and technical gap baseline

Last reconciled: 2026-09-01

This ledger records PolicyWeave's current commercialization gap from the active PR, product requirements, ADRs, implementation, review findings, and exact-head GitHub evidence. It separates implemented behavior from planned backend, legal-research, security, and release work. Live GitHub Check state is intentionally not persisted as `queued`/`running`/`passed` because it changes outside the repository; merge decisions must re-fetch the current PR head and required Checks.

## Product responsibility

PolicyWeave is a local-first policy-data workspace that helps a service operator structure actual personal-data processing facts, detect omissions or contradictions, and render a reviewable privacy-policy draft. It is not legal advice and does not claim compliance or certification. The structured policy model is the source of truth; rendered prose is a deterministic view over reviewed facts and rule/template versions.

## Current baseline

| Area | Evidence | Status | Commercialization gap | Next verification |
| --- | --- | --- | --- | --- |
| Guided authoring | Seven-step React workflow and PRD | MVP implemented | Several steps remain thin compared with a complete operational privacy inventory | Add validated retention, third-party transfer, international transfer, controller/contact, legal-basis and review-state contracts |
| Review workspace | Live preview, warning navigation, responsive review pane | Implemented on active PR branch | No screenshot/browser matrix evidence yet | Add Playwright visual/interaction tests at desktop, tablet and mobile breakpoints |
| Accessibility | Keyboard focus and semantic controls are present | Partial | No automated WCAG 2.2 audit or screen-reader interaction evidence | Add axe/Playwright accessibility checks and manual keyboard/focus-order evidence |
| Policy model | Structured source-of-truth decision in ADR 0001 | Partial | No versioned persisted policy schema, migration contract or audit history | Define two-or-more-word persistence object names, revision model, UPSERT/idempotency and 3NF backend boundary before storage lands |
| Publication | UI exposes publication contract only | Planned | No authenticated immutable publication/version workflow | Implement review approval, immutable published revision, rollback/supersession and public URL lifecycle without implying legal approval |
| Legal/rule traceability | Product copy avoids compliance guarantee | Partial | Rules/templates are not yet pinned to requirement-level authoritative sources and effective dates | Add research/doctoring ledger and version every rule/template source separately from policy data |
| Security/privacy | Local-first reduces unnecessary transfer | Partial | Threat model, tenant/account model, secrets boundary, audit log and non-masking PII protection are absent | Define threat model and security baseline before any hosted persistence/publication feature |
| Tests | Workflow tests plus responsive CSS regression contract | Partial | Critical domain validation, edge cases, accessibility, browser and E2E coverage remain incomplete | Expand tests before backend/publication implementation; do not suppress warnings |
| Performance | Static Vite application | Unevidenced | No realistic browser/load baseline | Add browser performance budget; add k6 only when network/backend endpoints exist |
| CI/security merge gate | lint/test/build plus security/SAST workflows | Live external gate | A committed CI status would become stale immediately; predecessor-head success is never merge evidence | At merge time, re-fetch the exact current head and require all protected checks/reviews to be successful |

## DDD/context map

The core bounded context is **Policy Fact Authoring**. Ubiquitous language should distinguish `policy_revision`, `processing_purpose`, `collection_item`, `retention_rule`, `third_party_transfer`, `international_transfer`, `review_finding`, and `publication_revision`. Avoid generic one-word persistence object names.

The aggregate root should be a minimal `policy_revision` transaction boundary rather than a monolithic account/service aggregate. Rendered policy text is a projection, not an authoritative entity. External legal/rule sources belong behind an anti-corruption boundary so a source update cannot silently reinterpret a previously published revision.

## Buyer-visible release gates

A publishable PolicyWeave release requires: complete input-to-warning navigation, deterministic rendering, explicit unresolved-review blocking, immutable reviewed publication revisions, accessible responsive interaction, authoritative source/version traceability, security/privacy threat-model evidence, and exact-head CI/security review. Marketing copy must describe assistance and reviewability rather than legal compliance guarantees.

## Active gap order

1. Merge PR #1 only after its live current-head CI/security/SAST checks and review gates succeed.
2. Add browser-level responsive/accessibility screenshot evidence for the repaired tablet/mobile review workspace.
3. Define the versioned policy-data schema and audit/publication revision boundary before adding persistence.
4. Add authoritative legal/rule-source doctoring with effective-date/version traceability.
5. Implement secure publication/review workflow with immutable releases and explicit supersession.
6. Add hosted-service threat model, tenant isolation, audit evidence and realistic performance/load tests when network services exist.
