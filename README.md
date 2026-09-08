# PolicyWeave

PolicyWeave is a proposed privacy-notice authoring product for teams that need
to turn an evidence-backed description of personal-data processing into a
reviewable draft. The intended value is to expose missing or contradictory
facts before publication and preserve why each disclosure was included.

> PolicyWeave does not provide legal advice or certify compliance. A privacy
> officer or qualified legal reviewer must approve any notice before use.

## Current status

This repository is a **concept seed**. It does not yet contain an application,
package manifest, executable service, database schema, release, or published
documentation site. There is therefore no supported install, quickstart, API,
or deployment procedure yet.

The previous `npm install` / `npm run dev` instructions and links to PRD and ADR
files were removed because the referenced implementation and documents are not
present on the protected branch.

## Intended workflow

The first usable release is expected to let an authorized product or privacy
team:

1. describe one processing activity and its purpose, data categories, people,
   recipients, retention, legal basis, and international transfers;
2. see blocking omissions and non-blocking review prompts separately;
3. generate a versioned review draft with evidence and approval status;
4. revise or roll back the draft without losing its audit history; and
5. export only an approved version for publication.

These are product requirements, not claims about implemented behavior.

## Product boundary

PolicyWeave should own privacy-notice authoring, review, approval, versioning,
and publication evidence. Identity, organizational policy, ontology labels,
and external publication remain separate responsibilities connected only
through released contracts. No integration is currently implemented.

## Security and data handling

Do not enter real personal information, credentials, customer records, or
production processing inventories into this repository. Before real use, the
product needs authenticated access, tenant isolation, purpose limitation,
retention and deletion controls, immutable audit evidence, encrypted storage,
backup and recovery, and tested export/publication authorization.

## Development status and evidence

The current requirements, missing technical foundations, and acceptance gates
are tracked in the
[product and technical gap baseline](docs/product-technical-gap-baseline.md).
Changes should keep customer-facing claims tied to protected-branch code,
tests, security evidence, and released artifacts.

## Support

Use this repository's GitHub Issues for product questions, defects, security
coordination, and implementation proposals. Do not include personal data or
secrets in an issue.

## License

No `LICENSE` file or verified rights grant is present. Copyright law therefore
applies by default: this repository does not currently grant permission to
use, copy, modify, or distribute its contents. A license may be added only
after ownership and inbound provenance are verified; this README does not
manufacture or imply those rights.
