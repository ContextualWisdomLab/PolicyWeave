# Security and Privacy Baseline

## Current exposure
PolicyWeave is currently a client-only, local-first authoring workspace. There is no production account system, server-side persistence, publication service, or secret-bearing provider integration in this repository. This limits current remote data exposure but does not make the product compliant or production-ready.

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
9. Credential-bearing service URLs are invalid and are withheld from the review projection; operators must provide a credential-free HTTP(S) location.

## Verification
Security posture is head-specific. A successful predecessor scan, unresolved finding dismissal, or queued security workflow is not passing evidence. Merge/release decisions must reacquire the exact current head's organization-required security/SAST/review checks.


## Local JSON export
The export path serializes only the current in-memory PolicyWeave draft and deterministic readiness codes into a browser Blob. It makes no network request, uses a fixed filename rather than customer-controlled path text, and defers object-URL revocation until the next task after initiating the download so browsers with deferred navigation can consume the Blob. If local download activation throws, the exception is contained, the existing live status output directs the operator to retry, and the same temporary object URL is still revoked. A service URL containing username or password components is omitted from the file and remains represented by the `service_url_format` finding. Query and fragment components are removed from accepted URLs so token-like values are not copied into the export. The file is still customer-controlled sensitive data; operators remain responsible for its storage and transfer. This control is not encryption, persistence, publication, backup, authorization, or mid-transfer cancellation evidence.
