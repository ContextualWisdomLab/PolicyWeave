# ADR-0003: PostgreSQL policy revision persistence foundation

Status: Proposed
Date: 2026-09-07

## Problem

The browser workspace holds an operator's draft only in memory. A hosted product needs durable version identity and item-level retry behavior without collapsing unresolved facts into negative facts, coupling PolicyWeave to another product's database, or treating an open PR as a released persistence service.

## Constraints

- `policy_revision` remains the smallest transaction aggregate.
- Tenant identity and revision number must form a unique version identity.
- Explicit no-collection confirmation and retention status remain independent facts.
- A no-collection revision cannot own collection items.
- `retention_status = applies` requires exactly one current `retention_rule`; other statuses cannot retain one.
- Organization-owned persistence identifiers use two or more semantic words and `snake_case`.
- Retries update one collection item through its declared natural key; they do not replace an entire revision.
- Hosted authorization, audit, encryption, publication, backup/restore, and runtime migration evidence remain mandatory before production use.

## Decision

Introduce a PostgreSQL migration contract with `policy_revision` as aggregate root. `service_profile`, `collection_item`, `processing_purpose`, and `retention_rule` are revision-owned normalized tables. The explicit no-collection boolean and the independent `retention_fact_status` live on the revision; absence of rows does not manufacture either fact.

Use `(tenant_account_id, revision_number)` as revision version identity and `(policy_revision_id, collection_item_key)` as collection-item identity. `upsert_collection_item` uses PostgreSQL `ON CONFLICT` on that item key, so an identical retry addresses the same item rather than duplicating it or rewriting the aggregate wholesale.

Deferred constraint triggers take a `FOR NO KEY UPDATE` lock on the owning revision row and evaluate the final transaction state. This mode serializes competing fact checks without conflicting with the `FOR KEY SHARE` lock used by foreign-key child writes. The triggers reject fact reparenting, a no-collection revision with collection items, an `applies` retention state without a rule, and a rule attached to any other retention state. A command may change a status and its dependent row in either statement order within one transaction while still failing closed at commit.

## Alternatives

### Store one JSON document per revision

Rejected for the hosted write model. It makes item-level conflict behavior and relational integrity implicit, encourages whole-document overwrites, and weakens 3NF evidence. JSON remains suitable for versioned export or event payloads after those contracts exist.

### Persist browser prose or component state

Rejected. Rendered prose is a projection, and component state is not the Policy Fact Authoring ubiquitous language. Either choice would make a presentation format authoritative over operator-established facts.

### Reuse another ContextualWisdomLab database or source branch

Rejected. No released owner contract currently supplies PolicyWeave's product-domain persistence. Cross-service SQL, source copying, and temporary-branch dependencies would violate the product ownership boundary.

## Evidence

`src/persistence-schema.test.ts` fixes the stable schema markers for revision identity, normalized ownership, deferred fact consistency, and natural-key UPSERT. `db/tests/policy_revision_runtime.sh` applies the migration to a digest-pinned PostgreSQL 18 service, exercises natural-key retry, requires each negative scene to emit its expected domain error, executes the down migration, verifies object removal, and repeats the apply/down cycle. `db/tests/policy_revision_concurrency.sh` coordinates two real sessions with FIFOs, observes PostgreSQL lock waits, and verifies conflicting fact writers fail closed while same-item UPSERT writers converge to one row carrying the second writer's label, mode, and path; nullable mode/path comparisons use `IS DISTINCT FROM` so missing values cannot satisfy the evidence assertion. This remains CI evidence rather than a deployed storage claim.

## Risks and effects

- The migration is not a production backend and grants no network access.
- Exact-head CI must prove PostgreSQL 18 execution for the covered single- and two-session cases; it does not prove restart safety, tenant authorization, backup/restore, or production-scale contention.
- The `tenant_account_id` is deliberately not linked to an identity table until a released Keyverse contract and PolicyWeave authorization design exist.
- Draft facts may remain nullable while unresolved; database constraints protect contradictions, while completeness remains the deterministic review responsibility.
- The collection mode enum uses locale-neutral values. UI labels are translated at the application boundary rather than stored as database truth.

## Operational and failure scenes

- A client repeats the same collection-item command after losing a response: the natural-key UPSERT addresses one row.
- A client tries to add an item to a revision confirmed as no-collection: commit fails with a constraint violation.
- A client changes retention from `applies` to `none` but forgets to remove the old rule: commit fails, so stale retention evidence cannot survive.
- A client attempts to move a retention rule between revisions: commit fails instead of leaving the original `applies` revision without its required rule.
- A no-collection writer holds the revision lock while a second client adds an item: the second client waits, observes the committed parent fact, and fails closed.
- Two clients UPSERT the same item key: the second waits for the first and updates the same row rather than creating a duplicate.
- Two clients claim the same tenant revision number: the unique constraint rejects one rather than creating ambiguous versions.

## Follow-up

Verify restart and backup/restore, add tenant-purpose authorization and immutable audit events, measure production-scale contention, and only then connect a hosted asynchronous API. Immutable publication and supersession remain a separate Review & Publication decision.
