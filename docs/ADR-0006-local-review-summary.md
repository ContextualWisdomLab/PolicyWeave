# ADR-0006: Local minimal TXT review summary

- Status: Proposed
- Date: 2026-10-03
- Owner: Review & Publication / Policy Fact Authoring
- Scope: `src/policy-review-report.ts`, `src/App.tsx`, PRD `US-REVIEW-01`
- Candidate base: `60fd7fb`, branch `feat-mixed-agents-prd`; no implementation commit or exact-head hosted PASS receipt is asserted here.
- Evidence: [local layered proposal, cross-review and verification record](evidence/mixed-agents-review-summary.md)

## Problem and alternatives

Operators need a portable view of missing responsibilities and current product-defined readiness, but exporting another full-facts document expands disclosure and duplicates the existing JSON portability boundary. A summary must not invent facts, claim legal approval, or diverge from the existing domain findings.

1. **Full-facts Markdown**: the independent product proposal included normalized seven-step facts and findings. Deferred for this slice because it duplicates JSON, exposes contact and operational details, and adds Markdown/HTML output obligations.
2. **Minimal TXT**: the independent technical proposal limits output to canonical service identity, existing readiness/completion, blocker codes and recommendation labels. Selected after a second cross-review layer and parent aggregation, subject to all P1 controls below.
3. **PDF/HTML/hosted report or AI-generated assessment**: out of scope; no renderer dependency, new network surface, model runtime or legal rule is justified for a local deterministic summary.

## Decision

A separate pure `createPolicyReviewText` read projection consumes `createPolicyExport` for schema version, `document_state`, normalized service identity and ordered `review_finding_codes`; `getCompletedSteps` supplies seven-step completion and `getReview(...).recommended` supplies recommendation labels. No new readiness rule or source-of-truth store is introduced.

- Emit one blocker row for each exported code, in exact order, without deduplication or suppression. `formatReviewFinding` decorates known codes with existing owning-step/label semantics; an unknown code stays visible as a quoted `단계 미상` row.
- Preserve collection contradiction's incomplete steps 2 and 3 even when the selected item has otherwise complete details. Recommendations never become blockers or proof of legal sufficiency.
- Include canonical service name/allowed URL only as authored identity values. Do not expose raw rejected credential/query/fragment URLs. Exclude path/purpose values, retention periods, recipient/country values, contact values and full fact objects. Identity and catalog/finding labels can still disclose context; the result is not guaranteed anonymous.
- JSON quote every dynamic string and visibly escape C1 controls (`U+0080–U+009F`), `U+061C`, `U+200E–U+200F`, `U+2028–U+202E` and `U+2066–U+2069`. This is line/direction-control handling for TXT, not universal HTML/Markdown sanitization.
- Emit deterministic text without timestamps or nonces. `report_format: v1` is presentation format, `schema_version: 1` is the existing fact contract, and neither is a publication or approval version.

`DocumentPreview` exposes `검토 요약 다운로드`. Browser orchestration uses `policyweave-review.txt`, MIME `text/plain;charset=utf-8`, Blob and an object URL. The button is disabled during pending JSON import and `exportReview` independently guards that interval. Blob, URL allocation, anchor construction/configuration and click failures are contained with generic retry feedback, without exception text. An allocated URL is reclaimed on the next task after either success or activation failure, not synchronously before deferred browser consumption.

Success announces download initiation, not file storage completion. Success and failure may change feedback only; items, facts, attestations, active step, readiness and completion remain unchanged. Browser cancellation, persistence, publication and approval are not established by starting a download.

## Verification and acceptance

PRD `US-REVIEW-01` defines user acceptance. `src/policy-review-report.test.ts` traces initial/incomplete and complete projections, exact ordered finding identity/cardinality, owning labels, recommendation separation, contradictory completion, hostile string encoding, detail omission and unknown fallback. `src/policy-review-ui.test.tsx` traces browser-adapter behavior. Required domain cases also include unsupported categorical values and unsafe URL non-disclosure; required UI/browser cases include full workspace preservation, import lock, fixed filename/MIME, deterministic bytes, mouse/keyboard/touch activation, preparation/activation exceptions and delayed cleanup.

These are requirements/assertion traces, not blanket passing receipts. The evidence document preserves initial failures, bounded local successor passes and toolchain caveats separately. The parent completed local lint/tests/build and browser regressions; visual screenshot inspection remains unresolved. Exact-current-head organization workflows, resolved threads and qualifying independent approval remain unverified gates. No hosted release is claimed.

## Consequences

TXT aids review without duplicating the entire fact export; JSON remains the current-version restore artifact. Future summary format changes require reviewed presentation compatibility, while fact-schema migration remains ADR-0005's separate contract. Hosted review/publication still requires tenant authorization, immutable revision/audit, encryption and source/rule evidence. The MoA-inspired development workflow does not add product AI or satisfy GitHub independent approval.
