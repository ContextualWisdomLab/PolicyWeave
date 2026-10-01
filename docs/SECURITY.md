# Security and Privacy Baseline

## Current exposure
PolicyWeave is currently a client-only, local-first authoring workspace. There is no production account system, server-side persistence, publication service, or secret-bearing provider integration in this repository. This limits current remote data exposure but does not make the product compliant or production-ready.

## Local preview listener
The default `npm run dev` and `npm run preview` scripts bind explicitly to
`127.0.0.1`; they are local evaluation servers, not production hosting or
identity/authorization services. Do not broaden the listener, allow arbitrary
hosts, or disable origin protections as an onboarding workaround. Deliberate
remote development requires a separately reviewed network and access-control
configuration. A loopback listener does not prove protection from local processes
or replace browser-origin controls.

`npm test` runs `tests/local_preview_contract.mjs` through `pretest` before the
existing Vitest suite. That check binds the script arguments and README security
link to their source contracts; it is not a running-server or penetration test.
See [the repair evidence](doctoring/local-preview-readme-boundary.md).

## Assets and trust boundaries
Protected assets include policy facts, contact details, processing descriptions, legal/rule source receipts, review findings, audit events, and future publication artifacts. Browser state is trusted only for the active local editing session. Any future API, datastore, identity provider, legal-source feed, or customer system is an explicit external boundary and requires an ACL/adapter.

## Threats to address before hosted launch
- Cross-tenant access or confused-deputy publication.
- Unauthorized draft mutation or publication.
- Loss of provenance/source-version evidence.
- Silent mutation of already-published revisions.
- Injection through user-entered policy text, imported source metadata, or rendered markup.
- Credential leakage in CI or runtime.
- Over-broad logging of PII or policy content.
- Retention/deletion behavior inconsistent with the operator's configured lifecycle.
- Supply-chain compromise in npm/GitHub Actions dependencies.

## Required controls
1. Authenticate users and authorize every tenant/resource/purpose operation server-side before hosted persistence.
2. Encrypt PII and policy content in transit and at rest; use non-masking protections when masking would break legitimate work, while minimizing disclosure in logs/telemetry.
3. Keep immutable audit events for security- and publication-relevant actions with actor, tenant, revision, action, result, and timestamp.
4. Publication operates on an explicit reviewed revision and creates an immutable publication receipt with digest/version evidence.
5. Secrets never enter client bundles or repository content. CI checkout credentials remain non-persistent and Actions are SHA pinned.
6. Validate and encode user-entered content at output boundaries; do not treat imported HTML/Markdown/source material as executable instructions.
7. Define backup/restore, incident response, access review, retention/deletion, and evidence collection before claiming SOC 2 readiness. Map hosted controls toward CSAP and SOC 2 without describing an unassessed product as certified.
8. Tests/docs use fictionalized organizations and people; real personal/institutional names are not fixtures.
9. Service URLs containing credentials, query, or fragment components are invalid and withheld from the review projection; operators must provide a credential-free HTTP(S) location whose destination can be exported without lossy rewriting.
10. Direct npm declarations use exact reviewed lock resolutions, and compiler/bundler packages are development-only. Exact-head CI emits a CycloneDX SBOM from the installed lock graph; the package-lock license inventory supports review but does not itself approve license compatibility.

## Verification
Security posture is head-specific. A successful predecessor scan, unresolved finding dismissal, or queued security workflow is not passing evidence. Merge/release decisions must reacquire the exact current head's organization-required security/SAST/review checks plus the dependency manifest contract and CycloneDX artifact. Vulnerability or license inventory is evidence for review, not a substitute for an explicit release decision.


## Local JSON portability
The export path serializes only the current in-memory PolicyWeave draft and deterministic readiness codes into a browser Blob. It makes no network request, uses a fixed filename rather than customer-controlled path text, and defers object-URL revocation until the next task after initiating the download so browsers with deferred navigation can consume the Blob. If local download preparation or activation throws, the exception is contained and the existing live status output directs the operator to retry. A temporary object URL is revoked exactly when allocation succeeded; preparation failure before allocation has no fabricated cleanup target. A service URL containing username, password, query, or fragment components is omitted from the file and remains represented by the `service_url_format` finding. The same shared validator withholds it from preview and readiness, preventing token disclosure and destination-changing rewrites.

Selected JSON files are untrusted input. Restore accepts only the exact schema-v1 object graph, canonical strings and URL, closed status vocabulary, and built-in collection catalog. It rejects unknown fields, duplicate or unknown catalog keys, contradictions, and file-supplied readiness or finding claims that do not match a fresh deterministic calculation. Files above 1 MiB are rejected before parsing, and no workspace setter runs until complete validation succeeds. This bound does not prove general denial-of-service resistance, and current-version restore does not imply a safe future-version migration.

The file remains customer-controlled sensitive data; operators are responsible for its storage and transfer. The cancel action invalidates late UI effects and restores editing; it does not prove that the browser or operating system aborted an underlying file read. These controls are not encryption, persistence, publication, backup, authorization, malware scanning, or resource-level transfer cancellation evidence.
