# Technical Requirements Document

## Scope
This TRD covers the pre-release PolicyWeave browser workspace and the contracts that must exist before hosted persistence/publication is added.

## Current runtime
- React + TypeScript + Vite browser application.
- Structured authoring state is in browser memory; no production database or backend exists.
- `src/policy.ts` contains deterministic review logic for whether collection selection has been established, whether selected items have an explicit collection mode, and whether selected items have a processing purpose.
- `src/App.tsx` provides the seven-step authoring flow, review navigation, and deterministic preview projection.
- The current CI contract is lint, Vitest, and TypeScript/Vite build plus live organization-required security/review workflows.

## Functional contracts
1. Every PRD step must route to an editable surface; selecting a step cannot change only the rail indicator.
2. A fresh workspace contains no inferred customer operational facts: collection selection, collection mode, and processing purpose start unresolved.
3. Until at least one actual collection item is selected, readiness produces a blocking selection-not-established finding that navigates to the collection step.
4. Every selected collection item requires an explicit collection mode; a missing mode is blocking and navigates to the collection step.
5. A selected item with blank/whitespace purpose produces a blocking review finding, and the preview must apply the same blank/whitespace normalization when it renders purpose completeness.
6. Disabling a collection item invalidates dependent collection-mode, processing-purpose, and collection-path evidence; re-enabling the item requires those facts to be captured and reviewed again.
7. Every blocking finding links to the responsible editing step.
8. Preview text is derived from current structured facts; it does not become an independently editable authority.
9. UI copy distinguishes a review draft from legal advice, certification, or a compliance guarantee.

## Quality contracts
- Touched production behavior requires regression and edge-case tests first.
- Touched production functions carry descriptive JSDoc rather than relying on implicit behavior.
- Do not suppress deprecation warnings to pass CI.
- Browser/accessibility validation must eventually include keyboard/focus order, WCAG 2.2 automated checks, responsive desktop/tablet/mobile interactions, and screenshot evidence.
- Hosted web endpoints, when introduced, use non-blocking/asynchronous handling and require realistic k6 tests before a p95 <=20 ms page/API claim is recorded.
- Production does not depend on synthetic demo data.

## Hosted persistence/publication entry criteria
Before network persistence lands, define a versioned policy-data schema, migration policy, 3NF relational model, per-item UPSERT/idempotency rules, immutable publication receipt, supersession/rollback semantics, tenant/purpose authorization, audit evidence, encryption/key management, retention/deletion behavior, and backup/restore testing. Use two-or-more-word semantic persistence object names in `snake_case` by default.

A publication command must operate on a specific reviewed `policy_revision` and create a new immutable `publication_revision`. It must fail closed when blocking findings, incompatible rule/template versions, missing source receipts, or missing authorization exist. Publication never mutates foreign customer databases.

## External boundaries
Legal/rule data enters through a Legal Source Registry ACL with source identity, effective date, retrieval/version evidence, and an implementation mapping. Customer/application integrations require their own explicit adapters. If future LLM assistance is justified for drafting/explanation, calls must route through `ContextualWisdomLab/contextual-orchestrator`; deterministic validation and publication authority remain outside the model.

## Verification state
Only exact-current-head checks count. Queued, cancelled, skipped-required, or predecessor-head runs are not evidence of passing. Normal integration requires the live ruleset's independent approval and thread-resolution requirements; no administrative bypass is part of this TRD.