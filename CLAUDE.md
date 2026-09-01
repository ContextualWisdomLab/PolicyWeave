# CLAUDE.md

Follow `AGENTS.md` as the repository-wide operating contract.

Before changing code, read `docs/PRD.md`, `ARCHITECTURE.md`, the applicable ADRs, `docs/TRD.md`, `docs/research-traceability.md`, and `docs/product-technical-gap-baseline.md`. Preserve PolicyWeave's boundary: verified operator facts in, deterministic reviewable policy projection out; no legal-advice or compliance-guarantee claims.

For behavior changes, add or strengthen tests before production code. Reconcile documentation and the product-gap ledger on the same branch. Use the exact current PR head for reviews, checks, and merge decisions, and never bypass governance to compensate for a failing or unassigned check.
