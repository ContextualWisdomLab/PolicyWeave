/**
 * Check the README's local-preview configuration without installing dependencies.
 * npm's pretest hook runs this before the existing Vitest suite. The filename
 * deliberately avoids Vitest's *.test.* pattern so Node owns these tests once.
 * These are configuration/documentation checks, not running-server or E2E proof.
 */
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { test } from 'node:test'

const projectRoot = new URL('../', import.meta.url)
const packageManifest = JSON.parse(readFileSync(new URL('package.json', projectRoot), 'utf8'))
const readmeText = readFileSync(new URL('README.md', projectRoot), 'utf8')

/** Require an explicit loopback listener with no later argument overriding it. */
test('development preview listens on IPv4 loopback by default', () => {
  assert.deepEqual(packageManifest.scripts.dev.trim().split(/\s+/), ['vite', '--host', '127.0.0.1'])
})

/** The built-bundle preview must retain the same local-only listener boundary. */
test('built preview listens on IPv4 loopback by default', () => {
  assert.deepEqual(packageManifest.scripts.preview.trim().split(/\s+/), ['vite', 'preview', '--host', '127.0.0.1'])
})

/** Keep this check in normal verification without removing the product test suite. */
test('npm test executes the preview contract before the existing Vitest suite', () => {
  assert.equal(packageManifest.scripts.pretest, 'node --test tests/local_preview_contract.mjs')
  assert.equal(packageManifest.scripts.test, 'vitest run')
})

/** Prevent the documented security link from drifting to an absent root file. */
test('README security guidance points to the repository security document', () => {
  const linkTargets = [...readmeText.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)]
    .map((linkMatch) => linkMatch[1])
  assert.ok(linkTargets.includes('docs/SECURITY.md'))
  assert.ok(!linkTargets.includes('SECURITY.md'))
  assert.ok(statSync(new URL('docs/SECURITY.md', projectRoot)).isFile())
})

/** A reader must know both how to start and how to stop the local preview. */
test('README retains locked setup and explains the local listener and shutdown', () => {
  assert.ok(readmeText.includes('npm ci\nnpm run dev'))
  assert.ok(readmeText.includes('127.0.0.1'))
  assert.ok(readmeText.includes('Ctrl+C'))
})
