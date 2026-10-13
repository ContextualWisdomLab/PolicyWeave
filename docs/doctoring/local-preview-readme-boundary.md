# Local preview and README boundary repair

## Problem and exact source evidence

The README's local-first quick start invoked `npm run dev`, but `package.json`
at `a2f48f977cc6d40d62e0ee56ae7c3dddbc9f589b` selected `vite --host 0.0.0.0`.
The README also linked root `SECURITY.md` although the retained policy is
`docs/SECURITY.md`. These were a configuration mismatch and a broken navigation
path, not evidence that any customer data had actually been disclosed.

## Decision and alternatives

Bind both package preview commands explicitly to IPv4 loopback and repair the
README link. Keep the existing Vitest, PostgreSQL and browser checks. Add a
Node-standard-library `pretest` contract, whose filename intentionally stays
outside Vitest's automatic `*.test.*` collection. This adds no dependency.

A README-only host override was rejected because it leaves the default script
network-exposed. A new server, proxy, authentication path or workflow was rejected
because none is needed to repair local evaluation. CORS and allowed-host settings
are unchanged. This is not approval for remotely exposing a development server.

## User and failure scenes

A contributor runs locked setup in an implementation worktree, opens the local
address printed by Vite, and stops it with Ctrl+C. A documentation-only checkout
has no runnable application and must not be described as a released package.
The built preview follows the same loopback boundary. Security guidance resolves
to the existing repository document instead of a missing file.

## Validation and limits

The exact pre-repair package/README bytes were checked against Git blob identities
`a6078bfdce9109e32c88296219a541b2a84c80fb` and
`c7267cecf57dfc8a34bebf43fe62092ac843c102`. On those bytes the new five Node tests
failed for the intended script, hook, link and guidance assertions. The repaired
files pass those five tests under Node.js 22.16.0.

This local executor cannot resolve GitHub/npm hosts. No dependency install, full
Vitest run, Vite listener smoke, production build, PostgreSQL run, or browser E2E
pass is claimed here. Exact-head hosted CI and review remain integration gates.
A future host/configuration change must retain the source checks and obtain a
running-server listener check plus the existing browser evidence. No source or
third-party license is changed; lockfile and dependency declarations are retained.

## References

Vite contributors. (n.d.). *Server options*. Vite. Retrieved September 12, 2026,
from https://vite.dev/config/server-options

Vite contributors. (n.d.). *Preview options*. Vite. Retrieved September 12, 2026,
from https://vite.dev/config/preview-options

npm, Inc. (n.d.). *Scripts*. npm Docs. Retrieved September 12, 2026,
from https://docs.npmjs.com/cli/v11/using-npm/scripts

The Vite host contract explains the all-address versus loopback decision; the npm
lifecycle contract explains why the existing CI `npm test` command runs `pretest`.
These sources do not establish deployed exposure, legal compliance or release
readiness for PolicyWeave.
