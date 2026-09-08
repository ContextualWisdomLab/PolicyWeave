# PolicyWeave product and technical gap baseline

Status: **Proposed**  
Evidence date: 2026-09-08  
Protected source examined: `main@52f4fd6bb68f870d0519cf11dd471573a2f197c0`

## Goal and operating loop

The product goal is a trustworthy workflow that converts verified processing
facts into an approved, versioned privacy-notice publication. Development
follows: establish a bounded requirement, add a failing contract, implement
the smallest owner-side behavior, obtain exact-head quality and security
evidence, release an immutable version, and validate the user workflow.

## Current evidence

At the protected revision above, the repository contains only `README.md`.
There is no application source, package metadata, dependency lock, schema,
test, workflow, container, release, Pages deployment, license grant, NOTICE,
or third-party attribution inventory. Earlier README references to an npm app,
PRD, and ADR were therefore not supported by repository evidence.

## Proposed product boundary and Context Map

PolicyWeave owns the **Privacy Notice Authoring** bounded context: processing
activity intake, disclosure completeness, draft versions, review decisions,
approval state, and publication evidence.

Proposed external relationships remain unimplemented:

- an identity and authorization provider supplies authenticated actor and
  tenant decisions through a released Anti-Corruption Layer;
- organization and policy systems supply approved purpose and retention facts;
- ontology/catalog products may supply released reference labels but do not
  own PolicyWeave's product language or notice decisions;
- a publication adapter receives only an approved immutable notice version;
  it does not read PolicyWeave storage directly.

No shared ContextualWisdomLab service is a mandatory dependency until its
protected contract, release, and operational maturity are verified.

## Documentation and design baseline

| Artifact | Current status | Required evidence |
| --- | --- | --- |
| PRD | Missing | Users, end-to-end scenes, exclusions, measurable outcomes, acceptance criteria |
| TRD | Missing | Runtime choice, APIs, state transitions, failure contracts, observability, deployment |
| ADR | Missing | Selected and rejected alternatives, constraints, evidence, risks, follow-up |
| UML | Missing | Authoring, review, approval, rollback, and publication sequences |
| ERD | Missing | 3NF tenant, activity, disclosure, draft version, decision, evidence, and publication model |
| UX | Missing | Normal, loading, empty, error, permission, responsive, and interaction states |
| Security | Missing | Threat model, authorization, isolation, encryption, audit, retention, recovery |
| Test strategy | Missing | Unit, contract, integration, browser E2E, accessibility, performance, failure evidence |
| Operability | Missing | Health, metrics, logs, backup/restore, rollback, incident and support procedures |

## Buyer-visible gaps and actions

| Gap | Evidence | Action | Exit status |
| --- | --- | --- | --- |
| No usable product | No executable source or package metadata | Define the first bounded authoring-to-review vertical in a PRD and implement it test-first | Open |
| No authoritative data model | No schema or ERD | Define minimal transaction aggregates and a 3NF persistence model with tenant and version invariants | Open |
| No approval/publication contract | No API, state machine, or immutable evidence | Specify fail-closed transitions and publish only approved immutable versions | Open |
| No security boundary | No authentication, authorization, or threat model | Establish purpose-limited tenant access, audit, encryption, retention, and recovery evidence | Open |
| No localization authority | No versioned resources or locale tests | Separate UI text from ontology labels; design DB-backed reviewed resources for ko/en/ja/zh/vi/es/de/fr | Open |
| No realistic UX evidence | No component catalog or browser tests | Define reusable components and validate all material states, keyboard access, wrapping, and responsive behavior | Open |
| No performance evidence | No service or load test | Measure the complete user path and publish reproducible latency and resource evidence without reducing workload | Blocked by implementation |
| No release/provenance | No CI, SBOM, artifact, or release | Add exact-head build, test, security, SBOM, provenance, immutable release, and rollback gates | Open |
| No rights grant | No LICENSE, NOTICE, or provenance inventory | Verify first-party ownership and inbound rights before selecting an ecosystem-consistent license | Blocked on rights evidence |

## First release definition of done

The first release is not complete until one authorized user can create a
processing activity, receive deterministic omission/contradiction results,
produce a versioned draft, record an independent approval decision, publish
only that approved version, and roll back publication. The same exact revision
must have realistic automated tests, accessibility and security evidence,
operable persistence and recovery, a complete dependency/provenance inventory,
and a verified license decision.
