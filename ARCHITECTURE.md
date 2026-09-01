# Architecture

## Product boundary
PolicyWeave owns the authoring and review of structured privacy-processing facts and the deterministic generation of a review draft. It does not own legal advice, identity-provider data, payment processing, or a customer's source systems. Hosted publication and durable storage are future supporting capabilities, not authority to invent or reinterpret processing facts.

## Domain-driven design
The core subdomain is **Policy Fact Authoring**. Supporting subdomains are **Review & Publication** and **Legal Source Registry**. Browser/storage frameworks, authentication infrastructure, observability, and deployment are generic subdomains.

### Bounded contexts
- **Policy Fact Authoring**: captures `service_profile`, `collection_item`, `processing_purpose`, `retention_rule`, `third_party_transfer`, `international_transfer`, and `privacy_contact` facts.
- **Review & Publication**: derives `review_finding`, controls `policy_revision` review state, and will create immutable `publication_revision` artifacts only after explicit authorization.
- **Legal Source Registry**: versions authoritative sources, effective dates, rule/template revisions, and citations. It is an anti-corruption layer between changing external law/guidance and already-published revisions.

### Context map
`Policy Fact Authoring -> Review & Publication` is a customer/supplier relationship through a versioned policy-fact contract. `Legal Source Registry -> Review & Publication` supplies versioned rule evidence; source updates cannot silently mutate historical policy revisions. External customer systems remain behind adapters and must not be queried or mutated through hidden coupling.

## Ubiquitous language and model
A future `policy_revision` is the minimal aggregate root and transaction boundary. `collection_item`, `processing_purpose`, `retention_rule`, `third_party_transfer`, `international_transfer`, and `privacy_contact` are revision-owned facts/value objects unless later evidence requires independent lifecycles. `review_finding` is derived evidence. `publication_revision` is an immutable release receipt, not a mutable policy row. Rendered prose is a projection and never the source of truth.

Core invariants:
1. A selected collection item cannot pass review without a non-empty processing purpose.
2. Review findings navigate to the fact that caused them.
3. Publication must never upgrade an unreviewed or incomplete draft to a reviewed/authoritative state.
4. A published revision remains reproducible from its policy facts plus rule/template/source versions.
5. External legal-source updates produce explicit re-evaluation, not silent rewriting.

## Current implementation
The active MVP is a React/Vite browser workspace. State is in memory and there is no production persistence or publication backend. The seven PRD steps are routed to distinct editing surfaces. `src/policy.ts` owns the current collection-item review rule; `src/App.tsx` owns browser orchestration and deterministic preview rendering.

## Persistence boundary (planned, not implemented)
Use relational 3NF by default. Named database/schema/persistence objects use at least two semantic words and `snake_case`, for example `policy_revision`, `collection_item`, `processing_purpose`, `review_finding`, `publication_revision`, and `legal_source_revision`. Item-level UPSERTs must declare their natural/idempotency key and conflict behavior. Publication is append-only/immutable with explicit supersession; writes across unrelated aggregates must not share a transaction merely for convenience.

Separate write-side draft commands from read-side rendered/review projections once hosted traffic justifies it. Account for revision hot spots and optimistic/constrained writes before adding collaborative editing. Keep source/customer integrations behind ACLs; do not form a shared kernel with unrelated ContextualWisdomLab products without demonstrated reuse.

## Deployment and operability direction
The browser-only MVP needs no service mesh. A hosted backend should be compose-deployable across Docker/Podman/Colima before Kubernetes migration, expose asynchronous/non-blocking request handling, and add realistic k6 evidence for network surfaces before latency claims. No code may depend on an optional `close_connection` instance attribute existing unless the adapter contract guarantees it.
