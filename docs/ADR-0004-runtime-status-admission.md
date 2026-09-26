# ADR-0004: Runtime admission of operator-confirmed policy statuses

- Status: Proposed
- Date: 2026-09-12
- Owner: Policy Fact Authoring
- Scope: `src/policy.ts`, `src/policy-status-contract.test.ts`, PR #1 on `develop`
- Requirements: existing explicit-fact authority in PRD, TRD, ADR-0002 and ARCHITECTURE; no change to published vocabulary or schema version

## Problem and constraints

The predecessor `src/policy.ts` blob `6f34076cf82a68a58bc1779ef08ae264cfe84ef1` used truthiness to admit collection mode, retention status and both transfer statuses. A runtime value such as `unchecked`, `YES`, a number or an object could therefore remove the owning review finding, complete the step and escape into a schema-v1 export labeled `review_ready`. TypeScript assertions do not provide runtime validation (TypeScript contributors, n.d.). This is a reproduced domain-integrity defect, not evidence of customer-data disclosure or of an externally reachable import endpoint.

The runtime remains an in-memory browser workspace. Do not add a backend, JSON import, provider call, dependency, shared kernel or mathematical runtime to repair categorical admission. Free-text fields and whole-object validation remain separate contracts; this change must not be presented as a general untrusted-JSON parser.

## Alternatives and decision

Keep the existing TypeScript union types and add three private, documented predicates: `isConfirmedCollectionMode`, `isConfirmedDisclosureStatus` and `isConfirmedRetentionStatus`. They accept only exact members of the existing operator-confirmed vocabulary. Reuse them in `getReview`, `getDraftReview` and `createPolicyExport`; `getCompletedSteps` continues deriving its state from those same reviews.

Accepted members are `필수`/`선택`, `yes`/`no`, and `applies`/`none`, respectively. All other values remain unresolved. Their owning review finding persists, the owning step cannot complete and the export contains `null` for that status with `document_state = incomplete`. No case folding, whitespace normalization, string coercion or inferred negative attestation is applied to categorical values. A valid explicit `no` or `none` remains valid and does not require inapplicable detail fields.

Retaining truthiness was rejected because the reproduced input bypasses the explicit-fact invariant. Silently coercing arbitrary input into a supported value was rejected because it invents operator authority. Adding a generic schema library was rejected because the bounded existing vocabulary needs neither new dependency nor new external interface. Throwing away the entire draft was rejected because a stable owning finding and null projection preserve valid independent facts and the existing correction workflow.

## User, operations and failure scenes

A caller supplies an unsupported retention status while the service and contact facts are complete. Step 4 remains unresolved and the existing retention-status finding guides the operator to confirm it. Unrelated completed responsibilities and source values are not mutated. Unsupported transfer states similarly remain unresolved at steps 5 and 6. An invalid mode on an enabled collection item blocks step 2 without incorrectly discarding its established processing purpose or collection path. An invalid mode on a disabled item does not contaminate an explicit no-collection draft.

Every valid combination of collection mode, retention and transfer statuses preserves the existing schema-v1 projection and dependent-field rules. Review readiness still means product-defined completeness, never legal sufficiency, approval or publication.

## Test-first evidence and limits

Test-only commit `557a58cd34d031c0cadb17dabdf101f2a4819198` added 81 cases before the implementation. CI `34682157436`, verify job `103522654450`, reproduced 44 status-contract failures while 119 tests passed; the 82 pre-existing tests remained passing. That PR job checked out integration commit `239b0f7f161606d5de1b3050a3be0ba4d65a2554`, explicitly combining that test head with `main@52f4fd6bb68f870d0519cf11dd471573a2f197c0`. The run's head association is not a claim that the checkout itself was the PR head.

Production commit `23ceef47a4dacc9365b426c7cab8b9b671626768` changes only the owning policy implementation. Its blob `9a16f2614de0cb4b1970e72c147e7693f76f88f2` passes strict TypeScript compilation and the same 81 assertions-driven cases under the local Node standard-library test adapter. Only the runner import is adapted locally; that result is not called a full Vitest, browser or database run. The associated hosted run was superseded by a concurrent writer, so it is not GREEN evidence.

The matrix covers 16 invalid values for each of four channels, all 16 accepted cross-channel combinations, disabled-item isolation, stable findings, null export, independent completed steps, determinism and source non-mutation. Hosted lint, full Vitest, build, PostgreSQL and browser results must be re-acquired for the final integrated candidate. Coverage percentages, publication readiness and central security acceptance are not inferred from case counts.

## Consequences and follow-up

No public type or export schema is widened, no transaction or persistence boundary changes, and no owner source is copied across repositories. Future import or released adapter work must validate complete input shape before constructing these domain facts, retain this runtime defense and supply versioned ACL/conformance evidence. Accepted status vocabulary changes require coordinated PRD/TRD/API tests, not a permissive fallback.

The active product-gap ledger now separates current integration truth from historical receipts. The entire preceding ledger is retained byte-for-byte as `docs/evidence/product-gap-history-through-20260909.md` using Git blob `417a57e8f127c51d94ef79589b9feedabfda87b1`; no historical delta or receipt is retired. This prevents former open-stack or predecessor-head statements from becoming current acceptance by repetition.

## Reference

TypeScript contributors. (n.d.). *Everyday types: Type assertions*. TypeScript. Retrieved September 12, 2026, from https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
