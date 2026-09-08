# Changelog

All notable product changes are recorded here. PolicyWeave is pre-release; entries describe the active commercialization branch and do not imply a published compliance product.

## Unreleased

### Added
- Deterministic local JSON draft export with a versioned `snake_case` contract, normalized operator-authored facts, explicit incomplete/review-ready state, readiness finding codes, and fail-closed omission of credential-bearing service URLs plus query/fragment data. Unresolved collection mode is serialized as `null`, not the UI empty-string sentinel, and object-URL cleanup is deferred until after download navigation starts. The browser download performs no network transfer and does not claim publication.
- PostgreSQL restart and custom-format dump/restore evidence that preserves NULL-safe complete service/collection-item values, a collecting-without-retention cross-state fixture, and independent no-collection and applies-retention facts, then re-executes no-collection plus both retention-status/rule contradictions against the restored database.
- PostgreSQL two-session concurrency evidence that observes real lock waits, rejects a collection-item writer racing with a no-collection update, and proves competing same-item UPSERTs converge to one row carrying the second writer's label, mode, and path with NULL-safe complete-value assertions and without timing-based transaction sleeps.
- PostgreSQL 18 runtime contract coverage for migration apply/down/apply cycles, item-key UPSERT idempotency, and deferred rejection of no-collection, missing-retention-rule, and revision-owner contradictions. The database remains CI-only and is not a hosted product backend.
- Proposed PostgreSQL `policy_revision` 3NF migration contract with tenant-scoped version identity, normalized revision-owned facts, owner-key immutability, parent-row-serialized deferred no-collection/retention consistency checks, and item-level natural-key UPSERT. It is source-validated only and does not claim a deployed database or hosted persistence.
- Seven-step authoring workflow with distinct editing surfaces for service information, collection items, processing purposes, retention, third-party transfer, international transfer, and privacy contact.
- Explicit `개인정보를 수집하지 않음` operator attestation so a genuine no-collection service can complete collection authoring without treating an empty item list as `none`.
- Independent explicit retention status (`확인 필요` / `보유함` / `보유하지 않음`) so collection absence cannot be misused as evidence that storage or retention is absent.
- Warning-to-source navigation for missing collection selection/no-collection confirmation, collection mode, collection-path evidence, processing purposes, service identity, retention status/period, transfer statuses/details, and privacy contact.
- Explicit unresolved/yes/no states for third-party provision and international transfer, with dependent detail capture only for confirmed `yes` cases.
- Regression coverage for all seven step routes, zero-inferred startup facts, first-responsibility startup state, explicit no-collection state and stale-item invalidation, independent retention authority and stale-period invalidation, collection-mode/path confirmation, seven-step readiness, explicit no-transfer attestations, transfer-dependent fact invalidation, whitespace normalization, service URL projection, warning navigation, collection-path/purpose separation, stale collection evidence invalidation, buyer-facing publication guidance, non-deceptive handling of unshipped affordances, authored focus-indicator contrast, and authoring-step focus transfer.
- Product/technical gap ledger, architecture, technical requirements, security baseline, and legal-source/accessibility traceability.
- Playwright/axe browser evidence harness covering desktop, tablet, and mobile rendering; horizontal overflow; keyboard activation and focus transfer; explicit no-collection progression; retention-status transitions and stale-period invalidation; effective 200% browser-zoom reflow from the desktop profile; serious/critical automated accessibility findings; real-browser JSON download events with mouse, keyboard, and touch activation; fixed filename; JSON MIME; byte-stable repeated exports; review-ready payload semantics; success and activation-error object-URL cleanup; and exact-head screenshot artifacts.

### Changed
- PostgreSQL negative-path evidence now matches each expected domain error message, so an unrelated SQL or connection failure cannot masquerade as a passing invariant check.
- Repository CI now starts one digest-pinned PostgreSQL 18 service inside the existing verification job and runs the migration contract before browser evidence, avoiding a second workflow or runner while producing real database evidence.
- Repository CI now groups runs by workflow plus pull-request number or branch ref and cancels superseded heads, preventing stale queued runs from consuming runner capacity without coupling unrelated PRs or refs.
- GitHub Actions checkout, setup/cache, and browser-evidence upload now use immutable Node 24-based `actions/checkout@v7.0.1`, `actions/setup-node@v7.0.0`, and `actions/upload-artifact@v7.0.1` releases instead of deprecated action runtimes.
- ADR readiness language now matches the executable retention contract: status is explicit, a period/end condition is required only for `applies`, and `none` needs no period; unmerged ADRs remain Proposed until protected-branch adoption.
- Browser-discovered muted text now uses a darker authored token, with a regression contract requiring at least 4.5:1 contrast on every current white, rail, conditional-field, and metadata surface.
- Fresh workspaces no longer preselect collection items or prefill collection modes/processing purposes; readiness fails closed until the operator establishes actual collection facts or explicitly attests that the service collects no personal data.
- Fresh workspaces now open at step 1, service information, rather than displaying step 2 while falsely rendering the untouched first responsibility as completed.
- Completed responsibilities retain their `done` state while active, and collection-flow tests now enter step 2 explicitly instead of depending on the retired step-2 startup state.
- Empty collection selection remains unresolved rather than being interpreted as `none`; no-collection and selected-item states are mutually exclusive and contradictory state fails closed.
- Turning on no-collection confirmation clears selected-item mode, purpose, and path evidence; later removing the confirmation does not silently restore stale customer facts.
- Collection and retention are now independent authority states. An intermediate no-collection→no-retention inference was removed after authoritative PIPC terminology showed that collection, storage, and retention are distinct included forms of personal-information processing.
- Retention readiness now requires an explicit status: `보유함` requires a period/end condition; `보유하지 않음` does not. Leaving `보유함` clears the previous period so stale facts cannot silently revive.
- Every selected collection item requires explicit collection mode, processing purpose, and nonblank collection-path evidence before readiness can pass; collection-path findings navigate back to the collection step.
- Public-readiness includes product-defined service name/URL, explicit retention status and any required period, transfer-status/detail, and privacy-contact completeness.
- Service URL and privacy-contact email are shape-validated as usability contracts without claiming endpoint reachability or mailbox ownership.
- Credential-bearing service URLs are rejected and withheld from the review projection so embedded usernames or passwords cannot leak into a generated draft.
- Blank transfer state is no longer treated as an implicit `none`; explicit `없음` confirmation is required, while `있음` requires dependent recipient/purpose or country/recipient facts.
- Changing a transfer status away from `있음` clears its dependent details so stale customer facts cannot silently revive.
- Disabling a collection item clears its collection mode, processing purpose, and collection-path evidence so re-enabling cannot silently revive stale customer facts.
- Service URL entered in the service-information step is projected into the review draft.
- Collection-path editing remains in the collection step while processing-purpose editing stays in its dedicated purpose step.
- Review preview applies the same whitespace-normalized purpose-completeness contract as the blocking review rule.
- Step-rail, previous/next, and review-warning navigation now transfers programmatic focus to the newly active step heading; ordinary form controls and the dedicated preview shortcut are excluded from that transfer.
- Review-warning navigation now lets the browser scroll the focused owner heading into view; the previous `preventScroll` option could leave that heading hundreds of pixels above the desktop or mobile viewport.
- The publication-area CTA describes a readiness check and directs the operator to responsible review rather than exposing internal implementation boundaries.
- JSON export now downloads the current structured draft locally, contains download-activation exceptions, reports a retry action through the existing live status output, and still revokes the temporary object URL; the redundant no-op `검토본 생성` control remains removed, and the document title remains non-interactive status text.
- Authored generic and custom-checkbox keyboard focus outlines now use the high-contrast `--green` token; a CSS regression test computes and enforces at least 3:1 contrast against white instead of relying on a low-contrast focus color.
- Responsive review behavior and mobile publication feedback were repaired during PR review.
- Responsive CSS contract tests use literal media-query regular expressions, removing the Semgrep dynamic-RegExp finding without suppressing or weakening the scanner gate.
- Node types are declared for the stylesheet contract test's `node:fs` boundary so the production TypeScript build type-checks the executable test source.
- GitHub Actions checkout dependencies are SHA pinned and credentials are not persisted in the working tree.

### Not yet shipped
- Authoritative legal-rule snapshots that can determine legal sufficiency beyond product-defined fact completeness.
- Manual zoom and screen-reader evidence beyond the automated desktop/tablet/mobile Chromium accessibility and focus checks.
- A product persistence adapter, durable hosted storage, tenant authorization, immutable audit history, encryption, operational backup/restore, and production-scale contention evidence. Bounded CI database execution, including process restart and dump/restore, does not constitute a hosted runtime.
- Authenticated immutable publication revisions and public URL lifecycle.
- Hosted tenant/security/operability evidence and endpoint load testing.
- Versioned DB-backed ko/en/ja/zh/vi/es/de/fr translation resources and localized export acceptance evidence.
