/**
 * Independent handler-guard mutation proof, not a product-defect RED or browser E2E.
 * Run: TMPDIR="$HOME/.hermes/cache/scratch" node --test tests/review_summary_guard_contract.mjs
 * Only private App copies are mutated. Both variants remove the summary button's
 * disabled prop; the negative also removes the handler guard. Real React DOM
 * events must reach the enabled button while a synthetic File.text() is pending.
 * Installed dependencies are shared by a symlink (versions checked against the
 * manifest and lock), not copied/reinstalled or claimed to be a clean install.
 * Fixture source, config and Vite caches stay in scratch. Raw reports/receipts
 * remain there; runtime copies are removed after both subprocesses have exited.
 * This standalone Node test is NOT automatically admitted by npm test or CI.
 */
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const marker = 'HANDLER_GUARD_PENDING_IMPORT_ALLOCATION'
const sourcePaths = ['src/App.tsx', 'src/policy.ts', 'src/policy-review-report.ts', 'package.json', 'package-lock.json', 'vite.config.ts', 'tests/review_summary_guard_contract.mjs']
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

function replaceExactlyOnce(source, needle, replacement) {
  assert.equal(source.split(needle).length - 1, 1, `mutation selector must match once: ${needle}`)
  return source.replace(needle, replacement)
}

const fixtureTest = `
import React from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './src/App'
import { createPolicyExport, initialFacts, initialItems } from './src/policy'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('real enabled summary click allocates zero URLs while File.text is pending', async () => {
  vi.useFakeTimers()
  const allocate = vi.fn(() => 'blob:review-guard-fixture')
  const revoke = vi.fn()
  vi.stubGlobal('URL', class extends URL { static createObjectURL = allocate; static revokeObjectURL = revoke })
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const { container, getByRole } = render(<App />)
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
  let finish!: (text: string) => void
  let settled = false
  const pendingRead = new Promise<string>((resolve) => { finish = resolve })
  const read = vi.fn(() => pendingRead)
  const file = new File(['pending synthetic draft'], 'synthetic-draft.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: read })
  const nativeClick = vi.fn()
  try {
    fireEvent.change(fileInput, { target: { files: [file] } })
    const button = getByRole('button', { name: '검토 요약 다운로드' }) as HTMLButtonElement
    expect(read).toHaveBeenCalledOnce()
    expect(fileInput.disabled).toBe(true)
    expect(container.querySelector('fieldset')?.disabled).toBe(true)
    expect(container.querySelector('.save-state')?.textContent).toContain('JSON 초안 확인 중')
    expect(button.disabled, 'fixture must remove the button disabled prop').toBe(false)
    expect(button.matches(':disabled'), 'no disabled ancestor may swallow activation').toBe(false)
    expect(settled).toBe(false)
    button.addEventListener('click', nativeClick)
    fireEvent.click(button)
    expect(nativeClick).toHaveBeenCalledOnce()
    expect(settled).toBe(false)
    const pendingAllocations = allocate.mock.calls.length
    const pendingDownloads = anchorClick.mock.calls.length

    // Settle genuine async import, then prove the SAME public UI path can export.
    await act(async () => {
      finish(JSON.stringify(createPolicyExport(initialItems, false, initialFacts)))
      await pendingRead
      settled = true
    })
    expect(fileInput.disabled).toBe(false)
    expect(container.querySelector('.save-state')?.textContent).not.toContain('JSON 초안 확인 중')
    fireEvent.click(button)
    expect(nativeClick).toHaveBeenCalledTimes(2)
    expect(allocate.mock.calls.length).toBe(pendingAllocations + 1)
    expect(anchorClick.mock.calls.length).toBe(pendingDownloads + 1)
    expect((anchorClick.mock.instances.at(-1) as HTMLAnchorElement).download).toBe('policyweave-review.txt')
    vi.runAllTimers()
    expect(revoke.mock.calls.length).toBe(allocate.mock.calls.length)
    expect(pendingAllocations, '${marker}').toBe(0)
    expect(pendingDownloads).toBe(0)
  } finally {
    if (!settled) {
      await act(async () => { finish('{}'); await pendingRead; settled = true })
    }
    vi.runAllTimers()
  }
})
`

function observeOwnedGroup(pgid) {
  const observed = spawnSync('/bin/ps', ['-axo', 'pid=,pgid='], { encoding: 'utf8', timeout: 5000 })
  assert.equal(observed.error, undefined, 'process lookup failed; custody unknown')
  assert.equal(observed.status, 0, 'process lookup failed; custody unknown')
  return observed.stdout.trim().split('\n').filter(Boolean).map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([, group]) => group === pgid).map(([pid]) => pid)
}

function runVitest(fixtureRoot, evidenceRoot, name) {
  const argv = [join(projectRoot, 'node_modules/vitest/vitest.mjs'), 'run', '--root', fixtureRoot,
    '--config', join(fixtureRoot, 'vitest.config.mjs'), '--reporter=json', '--outputFile', join(evidenceRoot, `${name}.report.json`)]
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, argv, {
      cwd: fixtureRoot,
      env: { ...process.env, NODE_ENV: 'test', TMPDIR: fixtureRoot, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // Own one POSIX process group, including ordinary Vitest workers.
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let launchError
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => { launchError = error })
    let deadlineSignalError
    const deadline = setTimeout(() => {
      timedOut = true
      try { process.kill(-child.pid, 'SIGKILL') } catch (error) { deadlineSignalError = error.code }
    }, 120000)
    child.on('close', (exitCode, signal) => {
      clearTimeout(deadline)
      let remainingGroupPids = null
      let custodyError = null
      try { remainingGroupPids = observeOwnedGroup(child.pid) } catch (error) { custodyError = String(error) }
      const receipt = { name, executable: process.execPath, nodeVersion: process.version, argv, pid: child.pid,
        exitCode, signal, timedOut, launchError: launchError?.message ?? null, deadlineSignalError: deadlineSignalError ?? null,
        remainingGroupPids, custodyError, stdout, stderr }
      try {
        writeFileSync(join(evidenceRoot, `${name}.process.json`), `${JSON.stringify(receipt, null, 2)}\n`)
        if (launchError) rejectRun(launchError)
        else resolveRun(receipt)
      } catch (error) { rejectRun(error) }
    })
  })
}

function verifyReport(receipt, evidenceRoot, name, shouldFail) {
  assert.equal(receipt.timedOut, false, `${name}: timeout is not mutation evidence`)
  assert.equal(receipt.signal, null, `${name}: terminated process is not mutation evidence`)
  assert.equal(receipt.custodyError, null, `${name}: process-group custody unknown`)
  assert.deepEqual(receipt.remainingGroupPids, [], `${name}: owned Vitest workers remain alive`)
  assert.equal(receipt.exitCode, shouldFail ? 1 : 0, `${name}: ${receipt.stdout}\n${receipt.stderr}`)
  const report = JSON.parse(readFileSync(join(evidenceRoot, `${name}.report.json`), 'utf8'))
  assert.equal(report.numTotalTestSuites, 1)
  assert.equal(report.numTotalTests, 1)
  assert.equal(report.numPendingTestSuites, 0)
  assert.equal(report.numFailedTestSuites, shouldFail ? 1 : 0)
  assert.equal(report.numPassedTestSuites, shouldFail ? 0 : 1)
  assert.equal(report.numPendingTests, 0)
  assert.equal(report.numFailedTests, shouldFail ? 1 : 0)
  assert.equal(report.numPassedTests, shouldFail ? 0 : 1)
  assert.equal(report.success, !shouldFail)
  assert.equal(report.testResults.length, 1)
  const results = report.testResults[0].assertionResults
  assert.equal(results.length, 1)
  assert.equal(results[0].status, shouldFail ? 'failed' : 'passed')
  if (shouldFail) {
    assert.equal(results[0].failureMessages.length, 1)
    assert.match(results[0].failureMessages[0], new RegExp(`${marker}: expected 1 to be (?:\\+)?0`))
  } else {
    assert.deepEqual(results[0].failureMessages, [])
  }
  assert.doesNotMatch(`${receipt.stderr}\n${receipt.stdout}`, /Unhandled (?:Error|Rejection)|Failed to (?:load|resolve)|Transform failed|Test timed out/i)
  return { exitCode: receipt.exitCode, testStatus: results[0].status, failureMessages: results[0].failureMessages }
}

test('independent handler guard survives enabled-button positive and rejects guard-removal mutant', async (t) => {
  const scratchParent = resolve(process.env.TMPDIR ?? join(homedir(), '.hermes/cache/scratch'))
  mkdirSync(scratchParent, { recursive: true })
  const evidenceRoot = mkdtempSync(join(scratchParent, 'policyweave-review-guard-'))
  t.diagnostic(`scratch receipts: ${evidenceRoot}`)
  const original = Object.fromEntries(sourcePaths.map((path) => [path, readFileSync(join(projectRoot, path))]))
  const beforeHashes = Object.fromEntries(sourcePaths.map((path) => [path, digest(original[path])]))
  for (const path of sourcePaths) {
    const snapshotPath = join(evidenceRoot, 'original-inputs', path)
    mkdirSync(dirname(snapshotPath), { recursive: true })
    writeFileSync(snapshotPath, original[path])
  }
  writeFileSync(join(evidenceRoot, 'guard.test.tsx'), fixtureTest)
  const manifest = JSON.parse(original['package.json'])
  const lock = JSON.parse(original['package-lock.json'])
  const dependencyVersions = {}
  for (const [name, pinned] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    const installed = JSON.parse(readFileSync(join(projectRoot, 'node_modules', name, 'package.json'), 'utf8')).version
    assert.equal(installed, pinned, `installed direct dependency mismatch: ${name}`)
    assert.equal(lock.packages[`node_modules/${name}`].version, pinned, `lock mismatch: ${name}`)
    dependencyVersions[name] = installed
  }
  const button = '<button className="outline review-download" onClick={exportReview} disabled={isImporting}>검토 요약 다운로드</button>'
  const enabledButton = button.replace(' disabled={isImporting}', '')
  const guarded = '  function exportReview() {\n    if (isImporting) return\n'
  const unguarded = '  function exportReview() {\n'
  const originalApp = original['src/App.tsx'].toString('utf8')
  const positiveApp = replaceExactlyOnce(originalApp, button, enabledButton)
  assert.equal(positiveApp.split(guarded).length - 1, 1, 'positive must retain the exact handler guard')
  const negativeApp = replaceExactlyOnce(positiveApp, guarded, unguarded)
  const runtimeRoots = []
  const processReceipts = []
  const summary = { evidenceKind: 'scratch-only UI handler-guard mutation proof, not a reproduced product bug',
    dependencySharing: { kind: 'node_modules symlink; direct installed/manifest/lock version parity',
      target: realpathSync(join(projectRoot, 'node_modules')), versions: dependencyVersions },
    beforeHashes, variants: {}, afterHashes: {}, runtimeRemoved: false }
  let primaryFailure
  try {
    for (const [name, app] of [['positive', positiveApp], ['negative', negativeApp]]) {
      const fixtureRoot = join(evidenceRoot, `${name}-runtime`)
      runtimeRoots.push(fixtureRoot)
      mkdirSync(join(fixtureRoot, 'src'), { recursive: true })
      writeFileSync(join(fixtureRoot, 'package.json'), '{"private":true,"type":"module"}\n')
      symlinkSync(join(projectRoot, 'node_modules'), join(fixtureRoot, 'node_modules'), 'dir')
      writeFileSync(join(fixtureRoot, 'src/App.tsx'), app)
      for (const path of ['src/policy.ts', 'src/policy-review-report.ts']) writeFileSync(join(fixtureRoot, path), original[path])
      writeFileSync(join(fixtureRoot, 'guard.test.tsx'), fixtureTest)
      writeFileSync(join(fixtureRoot, 'vitest.config.mjs'), `import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vitest/config'\nexport default defineConfig({ plugins: [react()], cacheDir: './.vite-cache', test: { environment: 'jsdom', include: ['guard.test.tsx'], pool: 'forks', maxWorkers: 1, fileParallelism: false, testTimeout: 60000 } })\n`)
      // Retain exact mutation inputs separately from disposable runtime/cache trees.
      writeFileSync(join(evidenceRoot, `${name}.App.tsx`), app)
      const receipt = await runVitest(fixtureRoot, evidenceRoot, name)
      processReceipts.push(receipt)
      summary.variants[name] = { appHash: digest(app), mutation: name === 'positive' ? ['remove summary-button disabled prop'] : ['remove summary-button disabled prop', 'remove exportReview isImporting guard'],
        ...verifyReport(receipt, evidenceRoot, name, name === 'negative') }
      t.diagnostic(`${name}: Vitest exit ${receipt.exitCode}; ${summary.variants[name].testStatus}${name === 'negative' ? ` at ${marker} (1 URL allocation vs 0)` : ' (0 pending allocations; fresh post-import UI export works)'}`)
    }
  } catch (error) {
    primaryFailure = error
    summary.failure = String(error)
  } finally {
    const custodySettled = processReceipts.length === runtimeRoots.length && processReceipts.every((receipt) =>
      receipt.custodyError === null && Array.isArray(receipt.remainingGroupPids) && receipt.remainingGroupPids.length === 0)
    // Never delete a runtime still owned by a producer whose settlement is unknown.
    if (custodySettled) for (const root of runtimeRoots) rmSync(root, { recursive: true, force: true })
    summary.processCustodySettled = custodySettled
    summary.runtimeRemoved = runtimeRoots.every((root) => !existsSync(root))
    summary.afterHashes = Object.fromEntries(sourcePaths.map((path) => [path, digest(readFileSync(join(projectRoot, path)))]))
    writeFileSync(join(evidenceRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  }
  if (primaryFailure) throw primaryFailure
  assert.equal(summary.runtimeRemoved, true)
  assert.deepEqual(summary.afterHashes, beforeHashes, 'live input source changed during the proof')
  t.diagnostic('live source hashes unchanged; both child close events observed; owned runtime/cache trees removed')
})
