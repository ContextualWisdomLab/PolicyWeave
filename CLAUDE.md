# CLAUDE.md

Follow `AGENTS.md` as the repository-wide operating contract.

Before changing code, read `docs/PRD.md`, `ARCHITECTURE.md`, the applicable ADRs, `docs/TRD.md`, `docs/research-traceability.md`, and `docs/product-technical-gap-baseline.md`. Preserve PolicyWeave's boundary: verified operator facts in, deterministic reviewable policy projection out; no legal-advice or compliance-guarantee claims.

For behavior changes, add or strengthen tests before production code. Reconcile documentation and the product-gap ledger on the same branch. Use the exact current PR head for reviews, checks, and merge decisions, and never bypass governance to compensate for a failing or unassigned check.

Deferred `policy_revision` fact triggers evaluate the final commit state. CI restore seeds `retention_status = applies` and `retention_rule` in one transaction; the owner runbook is `db/tests/policy_revision_restore.sh`.

## Know-how (2026-09-09, exact-head `e1c588f` verified)
- Draft PRs cannot merge through the API (`Pull Request is still a draft`): run `gh pr ready <n>` first, re-confirm CLEAN/MERGEABLE plus exact-head verify GREEN, then `gh pr merge <n> --merge`. Never delete stacked branches on merge; successors restack with ordinary non-force merge commits.
- Local Vitest defaults to a 5s per-test timeout and flakes on slow executors (full `App` workflow tests exceed it under load while CI verify stays GREEN). Use `npx vitest run --testTimeout=60000` for the local full-suite signal; do not retune production or timeouts to mask executor slowness. CI `verify` on the exact head remains the authoritative verdict.
