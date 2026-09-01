# Technical Requirements Document

## Scope
This TRD covers the pre-release PolicyWeave browser workspace and the contracts that must exist before hosted persistence/publication is added.

## Current runtime
- React + TypeScript + Vite browser application.
- Structured authoring state is in browser memory; no production database or backend exists.
- `src/policy.ts` contains deterministic review logic for selected collection items and missing processing purposes.
- `src/App.tsx` provides the seven-step authoring flow, review navigation, and deterministic preview projection.
- The current CI contract is lint, Vitest, and TypeScript/Vite build plus live organization-required security/review workflows.

## Functional contracts
1. Every PRD step must route to an editable surface; selecting a step cannot change only the rail indicator.
2. Selected collection items expose their collection mode and processing-purpose contract.
3. A selected item with blank/whitespace purpose produces a blocking review finding.
4. A blocking finding links to the responsible editing step.
5. Preview text is derived from current structured facts; it does not become an independently editable authority.
6. UI copy distinguishes a review draft from legal advice, certification, or a compliance guarantee.

## Quality contracts
- Touched production behavior requires regression and edge-case tests first.
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
