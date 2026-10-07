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

- Emit one blocker row for each exported code, in exact order, without deduplication or suppression. `formatReviewFinding` decorates codes resolvable against its supplied facts with existing owning-step/label semantics; an unresolved code stays visible as a quoted `단계 미상` row. The report must supply canonical URL facts so its canonical URL code is resolvable.
- Preserve collection contradiction's incomplete steps 2 and 3 even when the selected item has otherwise complete details. Recommendations never become blockers or proof of legal sufficiency.
- Include canonical service name/allowed URL only as authored identity values. Do not expose raw rejected credential/query/fragment URLs. Exclude path/purpose values, retention periods, recipient/country values, contact values and full fact objects. Identity and catalog/finding labels can still disclose context; the result is not guaranteed anonymous.
- JSON quote every dynamic string and visibly escape C1 controls (`U+0080–U+009F`), `U+061C`, `U+200E–U+200F`, `U+2028–U+202E` and `U+2066–U+2069`. This is line/direction-control handling for TXT, not universal HTML/Markdown sanitization.
- Emit deterministic text without timestamps or nonces. `report_format: v1` is presentation format, `schema_version: 1` is the existing fact contract, and neither is a publication or approval version.

`DocumentPreview` exposes `검토 요약 다운로드`. Browser orchestration uses `policyweave-review.txt`, MIME `text/plain;charset=utf-8`, Blob and an object URL. The button is disabled during pending JSON import and `exportReview` independently guards that interval. Blob, URL allocation, anchor construction/configuration and click failures are contained with generic retry feedback, without exception text. An allocated URL is reclaimed on the next task after either success or activation failure, not synchronously before deferred browser consumption.

Success announces download initiation, not file storage completion. Success and failure may change feedback only; items, facts, attestations, active step, readiness and completion remain unchanged. Browser cancellation, persistence, publication and approval are not established by starting a download.

## Verification and acceptance

PRD `US-REVIEW-01` defines user acceptance. `src/policy-review-report.test.ts` traces initial/incomplete and complete projections, exact ordered finding identity/cardinality, owning labels, recommendation separation, contradictory completion, hostile string encoding, detail omission and unknown fallback. `src/policy-review-ui.test.tsx` traces browser-adapter behavior. Required domain cases also include unsupported categorical values and unsafe URL non-disclosure; required UI/browser cases include full workspace preservation, import lock, fixed filename/MIME, deterministic bytes, mouse/keyboard/touch activation, preparation/activation exceptions and delayed cleanup.

These are requirements/assertion traces, not blanket passing receipts. The evidence document preserves initial failures, bounded local successor passes and toolchain caveats separately. The parent completed local lint/tests/build and browser regressions; visual screenshot inspection remains unresolved. Exact-current-head organization workflows, resolved threads and qualifying independent approval remain unverified gates. No hosted release is claimed.

## Canonical URL composition clarification — 2026-10-05 successor candidate

Historical checkpoint note: the frozen-TXT/pending clauses below describe the 03:18 KST handoff. A separate 03:30 KST retained predecessor/candidate compilation confirmed eight previously admissible TXT cases with exact byte equality; intentionally changed rejected-URL output is excluded. Later [URL evidence](evidence/url-portability-20261005.md) records the completed local source/runtime gates associated with published PR #26 head `1e662c2f08d4e156b9280ef434bc876c0c77b283`, not protected integration or release. This ADR stays Proposed. The [mobile-title successor evidence](evidence/mobile-document-title-20261005.md) separately retains its later fullgate NONPASS and observer-repair requirements; that candidate does not inherit the earlier runtime PASS.

The report is a canonical export projection, not a record of every raw editor diagnostic. After a rejected URL is withheld as `null`, JSON/TXT use `service_url` and the step-1 `서비스 URL` label; live raw `getDraftReview` still uses `service_url_format` and `서비스 URL 형식`. `createPolicyReviewText` supplies the exported URL (or empty sentinel) to `formatReviewFinding`. The public helper itself is unchanged: a raw format-code/raw-invalid-fact call still has format ownership; a code not resolvable against supplied facts stays visible via fallback. Canonical `service_url` must not misleadingly fall back to `단계 미상`. Other ordered codes, one-row cardinality, seven-step completion, recommendations and text escaping remain unchanged.

Fact `schema_version: 1` and presentation `report_format: v1` are unchanged. Strict JSON restore recomputation remains exact and historical null+format exports stay rejected, without compatibility exception or migration. Blank/valid prior JSON/TXT bytes must be unchanged; frozen predecessor-fixture byte verification was initially pending, distinct from current-function deterministic output. Parent 03:18 KST confirms retained-source blank/valid JSON direct-export and restore/re-export equality and withheld strict denial; frozen TXT comparison remains unverified. No raw backup, UI/autosave/network/legal-rule change is introduced.

[The successor evidence](evidence/url-portability-20261005.md) binds the Layer1 runtime/contract proposals, summary-fed Layer2 conditional reviews and parent synthesis separately from intermediate parent native 2 RED + 3 controls then 5 GREEN and related 35-case/lint/build reports. Earlier local full/browser receipts above remain historical; current successor full/browser/whole prior-PR union review/hosted/qualifying approval gates remain pending. Parent 03:18 KST successor reports 65 focused cases plus lint/build against the owned source/test freeze, still not full-suite acceptance. This Proposed ADR and planning agreement are not final implementation or release approval.

## Screen presentation clarification — 2026-10-05 candidate

PRD `US-PREVIEW-REFLOW-01` selects screen-only wrapping of existing paper fact text as a bounded reading-width convenience contract. It does not broaden this ADR's minimal TXT contents or change `createPolicyReviewText`, escaping, code ordering, report v1, fixed filename/MIME or pending handler guard. Same-state native JSON/TXT byte preservation remains required; diagnostic before/after pairs are not production-successor acceptance. The candidate leaves warning buttons and print media outside its new rule and does not claim physical printing or AT acceptance. [Dated evidence](evidence/preview-text-reflow-20261005.md) keeps current repository/final gates pending separately from historical receipts. This ADR remains Proposed; no new legal, schema or publication authority is introduced.

## Consequences

TXT aids review without duplicating the entire fact export; JSON remains the current-version restore artifact. Future summary format changes require reviewed presentation compatibility, while fact-schema migration remains ADR-0005's separate contract. Hosted review/publication still requires tenant authorization, immutable revision/audit, encryption and source/rule evidence. The MoA-inspired development workflow does not add product AI or satisfy GitHub independent approval.
