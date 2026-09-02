# Technical Requirements Document

## Scope
This TRD covers the pre-release PolicyWeave browser workspace and the contracts that must exist before hosted persistence/publication is added.

## Current runtime
- React + TypeScript + Vite browser application.
- Structured authoring state is in browser memory; no production database or backend exists.
- `src/policy.ts` owns deterministic review logic for collection selection/no-collection attestation/mode/purpose/path and the non-collection authoring-completeness findings for service identity, retention, transfer statuses/details, and privacy contact.
- `src/App.tsx` provides the seven-step authoring flow, review navigation, explicit no-collection and transfer-status capture, stale dependent-fact invalidation, and deterministic preview projection.
- `src/AuthoringFocusController.tsx` keeps explicit step navigation and review-warning jumps aligned with the newly active step by moving programmatic focus to its heading after the React update; ordinary form controls and the dedicated preview shortcut are outside this behavior.
- The current CI contract is lint, Vitest, and TypeScript/Vite build plus live organization-required security/review workflows.

## Functional contracts
1. Every PRD step must route to an editable surface; selecting a step cannot change only the rail indicator.
2. A fresh workspace contains no inferred customer operational facts. Blank authoring values mean unresolved, not `none`.
3. Collection readiness requires either at least one explicitly selected collection item or an explicit no-collection attestation. The no-collection attestation and selected items are mutually exclusive; contradictory state fails closed. Turning the attestation on clears selected items and their mode/purpose/path evidence, and later turning it off does not revive those stale facts.
4. Every selected collection item requires an explicit collection mode, nonblank processing purpose, and nonblank collection-path evidence. Each missing responsibility is counted independently and navigates to its owning step.
5. Service name, service URL, retention period, third-party provision status, international-transfer status, privacy-contact owner, and privacy-contact email are product-defined readiness facts and block readiness while unresolved. Service URL must be an absolute HTTP(S) URL; contact email must satisfy a minimal address-shape check. These syntax checks do not claim endpoint reachability or mailbox ownership.
6. Third-party provision and international transfer use explicit unresolved/yes/no status. `no` is an operator attestation; `yes` requires its dependent facts. Changing either status away from `yes` clears dependent details to prevent stale evidence revival.
7. Blank/whitespace authoring facts are normalized as unresolved.
8. Disabling a collection item invalidates dependent collection-mode, processing-purpose, and collection-path evidence; re-enabling requires renewed confirmation.
9. Every blocking finding links to the responsible editing step.
10. Explicit step navigation through the rail, previous/next controls, or a blocking-finding action transfers focus to the newly active step heading after that surface renders. This logical focus-order contract must not steal focus from ordinary editing controls or the dedicated preview shortcut.
11. Preview text is derived from current structured facts, including the explicit no-collection attestation; it does not become an independently editable authority.
12. UI copy distinguishes a review draft from legal advice, certification, or a compliance guarantee.

These are authoring-completeness contracts, not claims that the resulting policy is legally sufficient. Legal sufficiency remains a separate versioned-rule responsibility backed by authoritative source evidence.

## Quality contracts
- Touched production behavior requires regression and edge-case tests first.
- Touched production functions carry descriptive JSDoc rather than relying on implicit behavior.
- Do not suppress deprecation warnings to pass CI.
- Browser/accessibility validation must include keyboard/focus order, WCAG 2.2 automated checks, responsive desktop/tablet/mobile interactions, and screenshot evidence before a buyer-facing accessibility claim. Deterministic jsdom focus-transition coverage is supporting evidence only and does not substitute for real-browser focus-not-obscured, zoom, screen-reader, or responsive verification.
- Hosted web endpoints, when introduced, use non-blocking/asynchronous handling and require realistic k6 tests before a p95 <=20 ms page/API claim is recorded.
- Production does not depend on synthetic demo data.

## Hosted persistence/publication entry criteria
Before network persistence lands, define a versioned policy-data schema, migration policy, 3NF relational model, per-item UPSERT/idempotency rules, immutable publication receipt, supersession/rollback semantics, tenant/purpose authorization, audit evidence, encryption/key management, retention/deletion behavior, and backup/restore testing. Use two-or-more-word semantic persistence object names in `snake_case` by default.

A publication command must operate on a specific reviewed `policy_revision` and create a new immutable `publication_revision`. It must fail closed when blocking findings, incompatible rule/template versions, missing source receipts, or missing authorization exist. Publication never mutates foreign customer databases.

## External boundaries
Legal/rule data enters through a Legal Source Registry ACL with source identity, effective date, retrieval/version evidence, and an implementation mapping. Customer/application integrations require their own explicit adapters. If future LLM assistance is justified for drafting/explanation, calls must route through `ContextualWisdomLab/contextual-orchestrator`; deterministic validation and publication authority remain outside the model.

## Verification state
Only exact-current-head checks count. Queued, cancelled, skipped-required, or predecessor-head runs are not evidence of passing. Normal integration requires the live ruleset's independent approval and thread-resolution requirements; no administrative bypass is part of this TRD.
