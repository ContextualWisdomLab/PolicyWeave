# Product and technical gap baseline

Last reconciled: 2026-09-01

This ledger records PolicyWeave's commercialization gap from PRD/ADR/TRD/architecture, implementation, authoritative legal-source evidence, review findings, and live GitHub state. Live Check conclusions are deliberately not committed because they change outside the repository; merge decisions must re-fetch the exact current PR head and live ruleset.

## Product responsibility
PolicyWeave is a local-first policy-fact workspace that helps a service operator structure actual personal-data processing facts, detect omissions or contradictions, and render a reviewable privacy-policy draft. It is not legal advice and does not claim compliance or certification. Structured facts are the source of truth; rendered prose is a deterministic projection over facts plus future versioned rule/template evidence.

## Exact-head implementation evidence
The seven-step routing defect and warning-navigation defect were reproduced on predecessor head `62b6f5ef9056a111c93a09ba40d205c98f42baef`: `App.tsx` always rendered the collection editor while regression tests expected all seven editors and a warning-navigation action. Tests were strengthened first at `4795f99beb51a95cbc7393a2bb0b9600389776d8`, then production routing/review behavior was repaired at `61f5bac24d0271f382668872140a7ef4a3463db4`. This documentation reconciliation changes no production behavior; live checks/reviews must be reacquired for the resulting current head.

## Current baseline

| Area | Evidence | Status | Commercialization gap | Owner/action | Next verification |
| --- | --- | --- | --- | --- | --- |
| Guided authoring | PRD, ADR-0002, seven routed editors in `src/App.tsx` | Functional foundation | Retention, third-party transfer, international transfer and contact steps currently capture thin facts rather than requirement-complete domain contracts | Policy Fact Authoring: add typed facts and deterministic validations from authoritative requirements | Unit/integration tests for valid, missing, contradictory and not-applicable cases |
| Processing-purpose review | `src/policy.ts`, `src/App.test.tsx` | Repaired | Current blocker covers missing purpose only | Review & Publication: extend evidence-bound review rule set without heuristic scoring | Exact-head tests plus rule/source traceability |
| Review workspace | Live preview, warning-to-source navigation, responsive CSS fixes | Implemented foundation | No browser screenshot matrix or realistic interaction evidence | UX: add Playwright + accessibility harness | Desktop/tablet/mobile screenshots, keyboard/focus and action-edge verification |
| Accessibility | Semantic controls, focus-visible behavior, keyboard-operable step navigation | Partial | No automated WCAG 2.2 evidence or screen-reader contract | UX: add axe/Playwright and manual interaction record | WCAG audit and browser matrix |
| Policy model | ADR-0001, ARCHITECTURE, TRD | Designed, browser-memory only | No versioned durable schema, migration, audit history, UPSERT/idempotency or 3NF implementation | Platform: define `policy_revision` schema and item-level conflict contracts before storage | Schema/contract tests and migration round trip |
| Publication | UI communicates backend requirement; architecture defines immutable `publication_revision` direction | Planned | No authenticated review approval, immutable publication, supersession or public URL lifecycle | Review & Publication: implement only after persistence/security entry criteria | Authorization, replay/digest, supersession and rollback tests |
| Legal/rule traceability | `docs/research-traceability.md`; official PIPA/PIPC source register | Source baseline established | No article/section-level requirement mapping or versioned legal-rule engine | Legal Source Registry: map each implemented rule to source/effective date/revision | Fixtures across current and future-effective rule-set snapshots |
| Security/privacy | `docs/SECURITY.md`; local-first current runtime | Baseline documented | Hosted tenant model, secrets boundary, encryption/key handling, audit and incident/retention evidence absent | Platform/Security: threat-model hosted boundary before backend | Security tests and exact-head org scans |
| Tests | Vitest workflow, routing/navigation/blocker regressions, responsive CSS regression | Improved | Browser E2E, accessibility and domain edge cases remain incomplete; 100% coverage not evidenced | Test Engineering: expand behavior-first tests | Exact-head coverage and browser evidence |
| Performance | Static Vite client | Unevidenced | No page performance or network/load evidence | Operability: baseline browser performance; add k6 only with backend | Realistic measurements before latency claims |
| CI/security merge gate | SHA-pinned checkout plus repo and central required workflows | External live gate | Current hosted Actions jobs have been observed queued; queue state is non-passing and may be a shared control-plane admission issue | Control plane: diagnose runner/admission policy without weakening rules | Exact-head assigned jobs must execute; independent approval and threads required |

## DDD/context map
Core subdomain: **Policy Fact Authoring**. Supporting: **Review & Publication**, **Legal Source Registry**. Generic infrastructure remains outside domain authority. `Policy Fact Authoring -> Review & Publication` supplies a versioned fact contract. `Legal Source Registry -> Review & Publication` supplies versioned source/rule evidence through an ACL. Customer/source-system integrations remain adapters and may not mutate foreign systems through hidden coupling.

Ubiquitous language: `policy_revision`, `service_profile`, `collection_item`, `processing_purpose`, `retention_rule`, `third_party_transfer`, `international_transfer`, `privacy_contact`, `review_finding`, `legal_source_revision`, `publication_revision`.

The future aggregate root is the minimal `policy_revision` boundary. Rendered prose is a read projection. `publication_revision` is immutable and explicitly superseded rather than updated. Relational persistence is 3NF by default; named persistence objects use at least two semantic words and `snake_case`, and item-level UPSERT/idempotency semantics must be explicit.

## Buyer-visible release gates
A publishable release requires complete fact-to-warning navigation, deterministic rendering, explicit unresolved-review blocking, immutable reviewed publication revisions, accessible responsive interaction, authoritative source/version traceability, hosted security/privacy evidence, and exact-head CI/security/independent review. Buyer-facing wording describes assistance and reviewability, never a compliance guarantee.

## Active commercialization order
1. Reacquire exact-current-head CI/security/SAST/central workflow execution and independent approval; merge PR #1 only through ordinary protection.
2. Add browser-level responsive/accessibility evidence for the repaired seven-step workflow.
3. Convert retention/transfer/contact placeholders into typed domain facts and source-backed deterministic validations.
4. Define and test the versioned `policy_revision` persistence/audit schema and explicit item-level UPSERT contracts.
5. Implement secure review/publication with immutable releases and explicit supersession.
6. Add hosted tenant isolation, audit/incident evidence, compose deployment, and realistic performance/load tests when network services exist.
