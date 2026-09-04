# PolicyWeave

PolicyWeave is a local-first privacy-policy fact-authoring workspace for web and app operators. It structures facts the operator has established, highlights missing or contradictory inputs, and renders a deterministic privacy-policy review draft without presenting that draft as legal advice or a compliance certification.

## Start here

- [README](../README.md) — local setup, current product scope, and validation commands.
- [Product requirements](PRD.md) — the seven-step authoring workflow and buyer-facing acceptance criteria.
- [Technical requirements](TRD.md) — implementation and quality requirements for the product boundary.
- [Architecture](../ARCHITECTURE.md) — system responsibilities, dependency direction, and trust boundaries.
- [ADR 0001](ADR-0001-policy-as-data.md) — the policy-as-data decision that makes structured operator facts authoritative over rendered prose.
- [Research and legal traceability](research-traceability.md) — authoritative-source, effective-date, and implementation/test traceability for legal and policy decisions.
- [Product and technical gap baseline](product-technical-gap-baseline.md) — current commercialization gaps and evidence status.
- [Security](../SECURITY.md) — security policy and reporting boundary.
- [Changelog](../CHANGELOG.md) — repository change history.
- [Repository releases](https://github.com/ContextualWisdomLab/PolicyWeave/releases) — published release records when they exist.
- [Ask DeepWiki](https://deepwiki.com/ContextualWisdomLab/PolicyWeave) — repository-oriented Q&A and navigation.

## Product boundary

PolicyWeave owns structured privacy-processing facts, completeness and contradiction review, and deterministic draft rendering. The operator remains responsible for establishing the underlying facts and obtaining the human or legal review appropriate to publication. The product must not infer unknown facts, turn template text into source-of-truth data, or represent generated prose as a compliance guarantee.

The repository distinguishes protected-main behavior from active pull-request work and planned commercialization gaps. This landing page does not promote branch-local work, a successful build, or an unpublished artifact to shipped or released status.

## Onboarding

Start with the README and PRD, then use the architecture and ADR to understand why structured facts remain authoritative. Contributors should follow `AGENTS.md` and keep product, technical, research-traceability, changelog, and gap-baseline documents aligned with implementation and exact-head evidence.

## Publication status

This file is the reviewed source for a future repository documentation landing page. GitHub Pages is not considered published until repository settings, deployment state, and the live HTTPS content are independently verified.
