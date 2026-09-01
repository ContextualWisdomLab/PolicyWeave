# AGENTS.md

## Product responsibility
PolicyWeave is a local-first privacy-policy fact-authoring workspace. It structures facts supplied by a service operator, detects missing or contradictory inputs, and renders a review draft. It does not provide legal advice, certify compliance, or infer facts that the operator has not established.

## Development contract
- Treat structured policy facts as the source of truth; rendered policy prose is a deterministic projection.
- Preserve the seven authoring steps in `docs/PRD.md`: service information, collection items, purposes, retention, third-party transfer, international transfer, and privacy contact.
- Behavior changes require regression or edge-case tests first. Do not resolve a review finding until the exact current head proves the finding obsolete or fixed.
- Re-fetch the PR head before every commit/push. Never force-push or weaken branch/ruleset protections to merge.
- Keep `ARCHITECTURE.md`, `docs/TRD.md`, ADRs, `docs/research-traceability.md`, `CHANGELOG.md`, and `docs/product-technical-gap-baseline.md` aligned with implementation.
- Do not encode legal conclusions from memory. Every legal/rule/template decision needs an authoritative source, effective date, source revision, and implementation/test trace.
- Do not commit identifying customer, individual, or real operational-organization data in tests, examples, fixtures, or product documentation. Publicly documented legal authorities, official document titles, standards bodies, source publishers, and the repository owner may be named when required for accurate provenance and citation. Production must not consume synthetic demo data.
- Keep persistence objects semantically named with at least two words and `snake_case` unless a framework contract requires another convention. Avoid generic named persistence objects such as a standalone `id` table/collection.
- Hosted persistence/publication must be introduced only behind explicit tenant, authorization, audit, encryption, immutable revision, and supersession contracts.
- GitHub Actions dependencies stay SHA pinned and checkout credentials must not persist.

## Verification
The minimum exact-head gate is `npm run lint`, `npm test`, and `npm run build`, plus every live organization-required workflow, independent approval, and resolved review thread. Queued, skipped, predecessor-head, or stale results are not passing evidence.
