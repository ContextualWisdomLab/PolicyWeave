/** Actual installed-TS helper / Chromium contract; outside npm test and CI.
 * Run: node --test tests/url_portability_observation_contract.mjs
 * No product server, dependency install, private React state or product suite.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { chromium, expect } = require('@playwright/test')
const sourceUrl = new URL('./e2e/url-portability.spec.ts', import.meta.url)
const source = await readFile(sourceUrl, 'utf8')
const ast = ts.createSourceFile(sourceUrl.pathname, source, ts.ScriptTarget.Latest, true)
const names = ['installObserver', 'receipt', 'auditReceipt', 'step', 'survey']
const declarations = names.map((name) => {
  const matches = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(matches.length, 1, `actual helper ${name}`)
  return matches[0].getText(ast)
}).join('\n')
const compiled = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true })
assert.equal(compiled.diagnostics.length, 0, 'helper extraction setup')
const observations = new WeakMap()
const helpers = new Function('expect', 'writeFile', 'observations', `${compiled.outputText}; return {${names.join(',')}}`)(expect, writeFile, observations)
const scratch = join(homedir(), '.hermes/cache/scratch/url-observation-contract-20261005')
await mkdir(scratch, { recursive: true })
const run = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(join(scratch, 'contract-')))
let controls = 0

function baselineDescriptors() {
  const pairs = [[URL, 'createObjectURL'], [URL, 'revokeObjectURL'], [HTMLAnchorElement.prototype, 'click'], [File.prototype, 'text'], ...['getItem', 'setItem', 'removeItem', 'clear', 'key'].map((key) => [Storage.prototype, key]), ...['open', 'deleteDatabase'].map((key) => [IDBFactory.prototype, key])]
  window.contractDescriptors = pairs.map(([owner, key]) => ({ owner, key, descriptor: Object.getOwnPropertyDescriptor(owner, key) }))
  window.contractText = File.prototype.text
}
function descriptorsRestored() {
  return window.contractDescriptors.every(({ owner, key, descriptor }) => {
    const actual = Object.getOwnPropertyDescriptor(owner, key)
    return descriptor ? actual !== undefined && Reflect.ownKeys(descriptor).every((property) => actual[property] === descriptor[property]) : actual === undefined
  })
}
async function nativeActivity(page, filename = 'active.json') {
  return page.evaluate(async (name) => {
    const file = new File(['synthetic native bytes'], name, { type: 'application/json' })
    const text = await file.text()
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    const revokeResult = URL.revokeObjectURL(url)
    return { text, revokeUndefined: revokeResult === undefined }
  }, filename)
}

test('actual URL observer admission and native lifetime', { timeout: 60000 }, async (t) => {
  console.log(JSON.stringify({ argv: process.argv, node: process.version, sourceSha256: createHash('sha256').update(source).digest('hex'), contractSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'), run }))
  // A launch failure is setup, never an admission RED.
  const browser = await chromium.launch({ headless: true })
  console.log('SETUP Chromium launched')
  const context = await browser.newContext({ acceptDownloads: true })
  await context.route('**/*', (route) => route.abort())
  const pages = []
  async function fresh(name) {
    const page = await context.newPage()
    pages.push(page)
    await page.addInitScript(baselineDescriptors)
    await helpers.installObserver(page)
    await page.goto('data:text/html,<h1>Synthetic contract</h1>')
    observations.set(page, { errors: [], console: [], requests: [] })
    return { page, info: { outputPath: (file) => join(run, `${name}-${file}`), attach: async () => {} } }
  }
  try {
    await t.test('active native read/download positive and pre-reload restore audit', async () => {
      const { page, info } = await fresh('active')
      assert.deepEqual(await nativeActivity(page), { text: 'synthetic native bytes', revokeUndefined: true })
      const audit = await helpers.auditReceipt(page, info, 'audit.json', true)
      assert.deepEqual(audit.events.map(({ kind }) => kind), ['native-file-text', 'native-create', 'native-click', 'native-revoke'])
      assert.equal(audit.restored, true)
      assert.equal(await page.evaluate(descriptorsRestored), true)
      assert.equal(await page.evaluate(() => window.__urlPortabilityAudit.restore()), true)
      await page.reload()
      assert.deepEqual(await nativeActivity(page, 'reload.json'), { text: 'synthetic native bytes', revokeUndefined: true })
      assert.equal((await helpers.auditReceipt(page, info, 'reload.json')).events[0].filename, 'reload.json')
      controls++
    })
    await t.test('post-restoration native activity cannot be admitted vacuously', async () => {
      const { page, info } = await fresh('inactive')
      assert.equal(await page.evaluate(() => window.__urlPortabilityAudit.restore()), true)
      assert.deepEqual(await nativeActivity(page, 'late.json'), { text: 'synthetic native bytes', revokeUndefined: true })
      assert.deepEqual(await page.evaluate(() => window.__urlPortabilityAudit.events), [])
      await assert.rejects(helpers.auditReceipt(page, info, 'late.json'), /URL portability observer is no longer active/)
      controls++
    })
    await t.test('held native read settles exactly once during idempotent restoration', async () => {
      const { page, info } = await fresh('held')
      assert.deepEqual(await page.evaluate(async () => {
        const audit = window.__urlPortabilityAudit
        audit.hold('held.json')
        const pending = new File(['held native bytes'], 'held.json').text()
        const wasPending = audit.pending
        const restored = audit.restore()
        const restoredAgain = audit.restore()
        return { wasPending, restored, restoredAgain, text: await pending, pending: audit.pending, events: audit.events.map(({ kind }) => kind) }
      }), { wasPending: true, restored: true, restoredAgain: true, text: 'held native bytes', pending: false, events: ['held-owned-file', 'native-file-text'] })
      assert.equal(await page.evaluate(descriptorsRestored), true)
      await assert.rejects(helpers.auditReceipt(page, info, 'held.json'), /URL portability observer is no longer active/)
      controls++
    })
    await t.test('pagehide cleans descriptors and rejects late audit', async () => {
      const { page, info } = await fresh('pagehide')
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
      assert.equal(await page.evaluate(descriptorsRestored), true)
      await assert.rejects(helpers.auditReceipt(page, info, 'pagehide.json'), /URL portability observer is no longer active/)
      controls++
    })
    await t.test('native File receiver rejection and inherited descriptor preserved', async () => {
      const { page } = await fresh('receiver')
      assert.deepEqual(await page.evaluate(async () => {
        let rejects = false
        try { await Reflect.apply(File.prototype.text, { name: 'invalid-receiver.json' }, []) } catch (error) { rejects = error instanceof TypeError }
        const restore = window.__urlPortabilityAudit.restore()
        return { rejects, restore, equal: File.prototype.text === window.contractText, own: Object.hasOwn(File.prototype, 'text') }
      }), { rejects: true, restore: true, equal: true, own: false })
      controls++
    })
  } finally {
    for (const page of pages) if (!page.isClosed()) await page.evaluate(() => window.__urlPortabilityAudit?.restore()).catch(() => {})
    await context.close()
    await browser.close()
    console.log(JSON.stringify({ controls, browserConnected: browser.isConnected(), scope: 'actual helpers / synthetic native Chromium; not product gate' }))
  }
})
