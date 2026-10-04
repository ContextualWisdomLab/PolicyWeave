import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

// First-GREEN native characterization of the parent's already test-first repair.
// No production changes, React internals, storage initialization, route mocks or
// generated JSON fixture replaces the positive native-download -> saved-file path.
const secret = 'SYNTHETIC-URL-PORTABILITY-ONLY'
const invalidUrl = `https://example.test/privacy?access_token=${secret}`
const validUrl = 'https://example.test/privacy'
const serviceName = 'URL Portability Synthetic Fixture'
const formatWarning = '서비스 URL 형식 확인이 필요합니다.'
const missingWarning = '서비스 URL 확인이 필요합니다.'
type AuditEvent = { kind: string; url?: string; filename?: string; type?: string }
type PortabilityAudit = {
  events: AuditEvent[]
  storageCalls: string[]
  pending: boolean
  hold: (filename: string) => void
  release: () => void
  restore: () => boolean
}
declare global { interface Window { __urlPortabilityAudit: PortabilityAudit } }
const observations = new WeakMap<Page, { errors: string[]; console: string[]; requests: string[] }>()
test.use({ screenshot: 'only-on-failure' })

/** Observe the real primitives; only one explicitly named saved-file read is delayed. */
async function installObserver(page: Page) {
  await page.addInitScript(() => {
    const events: AuditEvent[] = []
    const storageCalls: string[] = []
    const saved: Array<{ owner: object; key: string; descriptor: PropertyDescriptor | undefined }> = []
    let heldFilename: string | undefined
    let releaseRead: (() => void) | undefined
    let restored = false
    function replace(owner: object, key: string, value: unknown) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      saved.push({ owner, key, descriptor })
      Object.defineProperty(owner, key, descriptor ? { ...descriptor, value } : { value, writable: true, configurable: true })
    }
    const create = URL.createObjectURL
    replace(URL, 'createObjectURL', function (this: typeof URL, object: Blob | MediaSource) {
      const url = Reflect.apply(create, this, [object])
      events.push({ kind: 'native-create', url, type: object instanceof Blob ? object.type : '' })
      return url
    })
    const revoke = URL.revokeObjectURL
    replace(URL, 'revokeObjectURL', function (this: typeof URL, url: string) {
      const result = Reflect.apply(revoke, this, [url])
      events.push({ kind: 'native-revoke', url })
      return result
    })
    const click = HTMLAnchorElement.prototype.click
    replace(HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement) {
      const result = Reflect.apply(click, this, [])
      events.push({ kind: 'native-click', url: this.href, filename: this.download })
      return result
    })
    const text = File.prototype.text
    replace(File.prototype, 'text', function (this: File) {
      const read = () => {
        const result = Reflect.apply(text, this, [])
        events.push({ kind: 'native-file-text', filename: this.name })
        return result
      }
      if (heldFilename !== this.name) return read()
      heldFilename = undefined
      events.push({ kind: 'held-owned-file', filename: this.name })
      return new Promise<string>((resolve, reject) => {
        releaseRead = () => {
          releaseRead = undefined
          try { resolve(read()) } catch (error) { reject(error) }
        }
      })
    })
    for (const key of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
      const native = Storage.prototype[key]
      replace(Storage.prototype, key, function (this: Storage, ...args: unknown[]) {
        storageCalls.push(`Storage.${key}`)
        return Reflect.apply(native, this, args)
      })
    }
    for (const key of ['open', 'deleteDatabase'] as const) {
      const native = IDBFactory.prototype[key]
      replace(IDBFactory.prototype, key, function (this: IDBFactory, ...args: unknown[]) {
        storageCalls.push(`IDBFactory.${key}`)
        return Reflect.apply(native, this, args)
      })
    }
    const controller: PortabilityAudit = {
      events, storageCalls,
      get pending() { return releaseRead !== undefined },
      hold: (filename) => { heldFilename = filename },
      release: () => {
        if (!releaseRead) throw new Error('No owned URL portability read is pending')
        releaseRead()
      },
      restore: () => {
        if (!restored) {
          // Release a held native read even when a test assertion fails.
          releaseRead?.()
          for (const { owner, key, descriptor } of saved.toReversed()) {
            if (descriptor) Object.defineProperty(owner, key, descriptor)
            else Reflect.deleteProperty(owner, key)
          }
          restored = true
          window.removeEventListener('pagehide', onPageHide)
        }
        return saved.every(({ owner, key, descriptor }) => {
          const actual = Object.getOwnPropertyDescriptor(owner, key)
          return descriptor ? actual !== undefined && Reflect.ownKeys(descriptor).every((property) => actual[property as keyof PropertyDescriptor] === descriptor[property as keyof PropertyDescriptor]) : actual === undefined
        })
      },
    }
    function onPageHide() { controller.restore() }
    Object.defineProperty(window, '__urlPortabilityAudit', { value: controller, configurable: true })
    window.addEventListener('pagehide', onPageHide, { once: true })
  })
}
async function receipt(info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(name)
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`)
  await info.attach(name, { path, contentType: 'application/json' })
}
async function auditReceipt(page: Page, info: TestInfo, name: string, restore = false) {
  await expect.poll(() => page.evaluate(() => {
    const events = window.__urlPortabilityAudit.events
    return events.filter(({ kind }) => kind === 'native-create').length - events.filter(({ kind }) => kind === 'native-revoke').length
  })).toBe(0)
  const audit = await page.evaluate((shouldRestore) => ({
    events: [...window.__urlPortabilityAudit.events], storageCalls: [...window.__urlPortabilityAudit.storageCalls],
    restored: shouldRestore ? window.__urlPortabilityAudit.restore() : null,
  }), restore)
  await receipt(info, name, { ...audit, ...observations.get(page) })
  const created = audit.events.filter(({ kind }) => kind === 'native-create')
  expect(audit.events.filter(({ kind }) => kind === 'native-revoke').map(({ url }) => url)).toEqual(created.map(({ url }) => url))
  expect(audit.events.filter(({ kind }) => kind === 'native-click').map(({ url }) => url)).toEqual(created.map(({ url }) => url))
  for (const event of created) {
    expect(audit.events.findIndex(({ kind, url }) => kind === 'native-click' && url === event.url)).toBeLessThan(audit.events.findIndex(({ kind, url }) => kind === 'native-revoke' && url === event.url))
  }
  expect(audit.storageCalls).toEqual([])
  expect(observations.get(page)?.errors).toEqual([])
  expect(observations.get(page)?.requests.filter((url) => new URL(url).origin !== 'http://127.0.0.1:4173')).toEqual([])
  if (restore) expect(audit.restored).toBe(true)
  return audit
}

test.beforeEach(async ({ page }) => {
  const record = { errors: [] as string[], console: [] as string[], requests: [] as string[] }
  observations.set(page, record)
  page.on('pageerror', (error) => record.errors.push(error.message))
  page.on('console', (message) => record.console.push(`${message.type()}: ${message.text()}`))
  page.on('request', (request) => record.requests.push(request.url()))
  await installObserver(page)
})
test.afterEach(async ({ page }, info) => {
  if (page.isClosed()) return
  // Always retain evidence before asserting; failure screenshots/traces are also
  // retained by the command-line runner, with no global timeout/config changes.
  const raw = await page.evaluate(() => ({ events: window.__urlPortabilityAudit?.events ?? [], storageCalls: window.__urlPortabilityAudit?.storageCalls ?? [], restored: window.__urlPortabilityAudit?.restore() ?? true }))
  await receipt(info, 'teardown-observer.json', { ...raw, ...observations.get(page), status: info.status })
  expect(raw.restored).toBe(true)
  expect(raw.storageCalls).toEqual([])
  expect(observations.get(page)?.errors).toEqual([])
})
async function step(page: Page, number: number) {
  // Public native rail activation for bounded read-only surveys, not private state.
  await page.locator('.rail ol button').nth(number - 1).evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.form-panel h1')).toHaveText(new RegExp(`^${number}\\.`))
}
async function download(page: Page, info: TestInfo, kind: 'json' | 'txt', retainedName: string) {
  const pending = page.waitForEvent('download')
  const button = page.getByRole('button', { name: kind === 'json' ? 'JSON 내보내기' : '검토 요약 다운로드', exact: true })
  if (info.project.name === 'mobile-chromium') await button.tap()
  else await button.click()
  const actual = await pending
  expect(actual.suggestedFilename()).toBe(kind === 'json' ? 'policyweave-draft.json' : 'policyweave-review.txt')
  expect(await actual.failure()).toBeNull()
  const nativePath = await actual.path()
  expect(nativePath).not.toBeNull()
  const savedPath = info.outputPath(retainedName)
  await actual.saveAs(savedPath)
  const bytes = await readFile(savedPath)
  expect(bytes.equals(await readFile(nativePath!))).toBe(true)
  await receipt(info, `${retainedName}.receipt.json`, { filename: actual.suggestedFilename(), nativePath, savedPath, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  return { bytes, savedPath }
}
async function seed(page: Page, noCollection: boolean, url = invalidUrl) {
  await page.goto('/')
  await page.getByLabel('서비스 이름', { exact: true }).fill(serviceName)
  await page.getByLabel('서비스 URL', { exact: true }).fill(url)
  await step(page, 2)
  if (noCollection) await page.getByRole('checkbox', { name: '개인정보를 수집하지 않음으로 확인', exact: true }).check()
  else {
    await page.getByRole('checkbox', { name: '이메일 주소', exact: true }).check()
    await page.getByRole('combobox', { name: '이메일 주소 수집 구분', exact: true }).selectOption('선택')
    await page.getByLabel('수집 경로', { exact: true }).fill('Synthetic fixture signup')
    await step(page, 3)
    await page.getByLabel('이메일 주소 처리 목적', { exact: true }).fill('Synthetic fixture account notices')
  }
  await step(page, 4)
  await page.getByRole('combobox', { name: '개인정보 보유 여부', exact: true }).selectOption(noCollection ? 'none' : 'applies')
  if (!noCollection) await page.getByLabel('대표 보유 기간 또는 종료 조건', { exact: true }).fill('Synthetic fixture account closure')
  await step(page, 5)
  await page.getByRole('combobox', { name: '제3자 제공 여부', exact: true }).selectOption(noCollection ? 'no' : 'yes')
  if (!noCollection) {
    await page.getByLabel('제공받는 자', { exact: true }).fill('Synthetic Fixture Recipient')
    await page.getByLabel('제공 목적', { exact: true }).fill('Synthetic fixture delivery')
  }
  await step(page, 6)
  await page.getByRole('combobox', { name: '국외 이전 여부', exact: true }).selectOption(noCollection ? 'no' : 'yes')
  if (!noCollection) {
    await page.getByLabel('이전 국가', { exact: true }).fill('Synthetic Fixture Country')
    await page.getByLabel('국외 수령자', { exact: true }).fill('Synthetic Fixture Overseas')
  }
  await step(page, 7)
  await page.getByLabel('담당자 또는 담당 부서', { exact: true }).fill('Synthetic Fixture Privacy Team')
  await page.getByLabel('연락 이메일', { exact: true }).fill('privacy@example.test')
  await step(page, 1)
}
async function blocked(page: Page, warning: string) {
  await expect(page.locator('.progress-copy')).toContainText('6/7 완료')
  await expect(page.locator('.rail li').first()).not.toHaveClass(/done/)
  await expect(page.locator('.publish')).toBeDisabled()
  await expect(page.locator('.review-stat.blocking')).toContainText('1건')
  await expect(page.locator('.document-warning')).toHaveCount(1)
  await expect(page.locator('.document-warning')).toContainText(warning)
  await expect(page.locator('.document-warning button')).toHaveText('서비스 정보 확인')
}
async function survey(page: Page) {
  const rows = []
  for (let number = 1; number <= 7; number++) {
    await step(page, number)
    rows.push(await page.locator('.form-panel input, .form-panel select').evaluateAll((controls) => controls.map((element) => {
      const control = element as HTMLInputElement | HTMLSelectElement
      return { name: control.name, type: control.type, value: control.value, checked: control instanceof HTMLInputElement ? control.checked : null, disabled: control.matches(':disabled'), selected: control instanceof HTMLSelectElement ? [...control.options].map((option) => option.selected) : null }
    })))
  }
  await step(page, 1)
  return rows
}
async function restoreSaved(page: Page, savedPath: string) {
  const input = page.getByLabel('JSON 초안 가져오기', { exact: true })
  await input.setInputFiles(savedPath)
  await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
  await expect(input).toHaveValue('')
  await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
}
function canonicalInvalid(bytes: Buffer) {
  const text = bytes.toString('utf8')
  const parsed = JSON.parse(text)
  expect(text).toBe(`${JSON.stringify(parsed, null, 2)}\n`)
  expect(parsed.document_state).toBe('incomplete')
  expect(parsed.policy_facts.service_profile).toEqual({ service_name: serviceName, service_url: null })
  expect(parsed.review_finding_codes).toEqual(['service_url'])
  expect(text).not.toContain(secret)
  expect(text).not.toContain('service_url_format')
  return parsed
}

for (const noCollection of [false, true]) {
  test(`native invalid URL ${noCollection ? 'otherwise-ready no-collection' : 'known collection facts'}: canonical saved file restores and repeated pretty JSON bytes match`, async ({ page }, info) => {
    await seed(page, noCollection)
    await blocked(page, formatWarning)
    const before = await survey(page)
    const original = await download(page, info, 'json', 'actual-original.json')
    const exported = canonicalInvalid(original.bytes)
    expect(exported.policy_facts.no_collection_attested).toBe(noCollection)
    expect(exported.policy_facts.collection_items).toHaveLength(noCollection ? 0 : 1)
    const txt = await download(page, info, 'txt', 'actual-review.txt')
    const review = txt.bytes.toString('utf8')
    expect(review).toContain('서비스 URL: 미확인')
    expect(review).toContain('1. 서비스 정보: 확인 필요')
    expect(review).toContain('필수 항목: "service_url" | 1단계 "서비스 정보" | "서비스 URL"')
    expect(review).not.toContain('단계 미상')
    expect(review).not.toContain('service_url_format')
    expect(review).not.toContain(secret)
    expect(review).toContain('document_state: incomplete')
    await expect(page.getByLabel('서비스 URL', { exact: true })).toHaveValue(invalidUrl)
    await blocked(page, formatWarning)
    expect(await survey(page)).toEqual(before)
    await page.screenshot({ path: info.outputPath('raw-format-blocker.png'), fullPage: true })
    await auditReceipt(page, info, 'before-reload-observer.json', true)
    await page.reload()
    await expect(page.locator('.progress-copy')).toContainText('0/7 완료')
    const blank = await survey(page)
    for (const controls of blank) for (const control of controls) {
      expect(control.value).toBe(control.type === 'checkbox' ? 'on' : '')
      if (control.checked !== null) expect(control.checked).toBe(false)
      if (control.selected) expect(control.selected).toEqual(control.selected.map((_, index) => index === 0))
    }
    await restoreSaved(page, original.savedPath)
    await expect(page.getByLabel('서비스 URL', { exact: true })).toHaveValue('')
    await blocked(page, missingWarning)
    const restored = await survey(page)
    const expected = structuredClone(before)
    expected[0].find(({ name }) => name === 'serviceUrl')!.value = ''
    expect(restored).toEqual(expected)
    const repeated = []
    for (let number = 1; number <= 2; number++) {
      const actual = await download(page, info, 'json', `actual-restored-${number}.json`)
      canonicalInvalid(actual.bytes)
      expect(actual.bytes.equals(original.bytes)).toBe(true)
      repeated.push(actual.savedPath)
    }
    await blocked(page, missingWarning)
    await page.screenshot({ path: info.outputPath('restored-missing-blocker.png'), fullPage: true })
    const audit = await auditReceipt(page, info, 'after-restore-observer.json')
    expect(audit.events.filter(({ kind }) => kind === 'native-file-text').map(({ filename }) => filename)).toEqual(['actual-original.json'])
    await receipt(info, 'native-roundtrip.json', { noCollection, before, blank, restored, actualSavedFile: original.savedPath, repeated })
  })
}

// Frozen 2117734 exporter-generated synthetic files, independently supplied by
// the parent. These are predecessor domain-export bytes, NOT historical browser
// downloads; the native positive journey above still imports its actual saved file.
const predecessorControls = {
  'null-format-reject': { file: 'withheld', sha256: '353123483750fb345f6443577d6d16a183e66e48bb92cb053fd6e026b11bd7f2' },
  'canonical-blank-accept': { file: 'blank', sha256: 'f3fcca2186508a6864d1faf814377997d3b23e1db4b50ceee95a3fa80de05d76' },
  'canonical-valid-accept': { file: 'valid', sha256: '0633d76ea48a5b8af289414d13feff8d189acdc0093dedf33b6ad494eeb5dd3e' },
} as const
for (const variant of ['null-format-reject', 'canonical-blank-accept', 'canonical-valid-accept'] as const) {
  test(`independent old schema-v1 ${variant} retains strict evidence validation`, async ({ page }, info) => {
    await seed(page, true, validUrl)
    const before = await survey(page)
    const known = await download(page, info, 'json', 'known-workspace.json')
    const control = predecessorControls[variant]
    const path = new URL(`../fixtures/policy-v1-predecessor-${control.file}.json`, import.meta.url)
    const fixtureBytes = await readFile(path)
    expect(createHash('sha256').update(fixtureBytes).digest('hex')).toBe(control.sha256)
    const retainedFixture = info.outputPath(`frozen-predecessor-${control.file}.json`)
    await writeFile(retainedFixture, fixtureBytes)
    await page.getByLabel('JSON 초안 가져오기', { exact: true }).setInputFiles(retainedFixture)
    await expect(page.getByLabel('JSON 초안 가져오기', { exact: true })).toHaveValue('')
    if (variant === 'null-format-reject') {
      await expect(page.locator('output')).toContainText('불러오지 못했습니다')
      expect(await survey(page)).toEqual(before)
      const after = await download(page, info, 'json', 'known-workspace-after-rejection.json')
      expect(after.bytes.equals(known.bytes)).toBe(true)
      await expect(page.locator('.progress-copy')).toContainText('7/7 완료')
      await expect(page.locator('.publish')).toBeEnabled()
    } else {
      await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
      await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
      await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue('Example Portal')
      await expect(page.getByLabel('서비스 URL', { exact: true })).toHaveValue(variant === 'canonical-valid-accept' ? validUrl : '')
      if (variant === 'canonical-blank-accept') await blocked(page, missingWarning)
      else {
        await expect(page.locator('.progress-copy')).toContainText('7/7 완료')
        await expect(page.locator('.publish')).toBeEnabled()
        await expect(page.locator('.document-warning')).toHaveCount(0)
      }
      const actual = await download(page, info, 'json', 'legacy-accepted-native-export.json')
      expect(actual.bytes.equals(await readFile(path))).toBe(true)
    }
    await page.screenshot({ path: info.outputPath(`${variant}.png`), fullPage: true })
    await auditReceipt(page, info, 'legacy-control-observer.json')
    await receipt(info, 'legacy-control.json', { variant, independentFilePath: path, knownNativePath: known.savedPath })
  })
}

test('pending actual saved native file: editor/import/TXT lock with no storage, then native read and canonical restore', async ({ page }, info) => {
  await seed(page, false)
  const saved = await download(page, info, 'json', 'owned-pending-native.json')
  canonicalInvalid(saved.bytes)
  await page.getByLabel('서비스 이름', { exact: true }).fill('Pending Prior Synthetic Fixture')
  const before = await survey(page)
  await auditReceipt(page, info, 'before-pending-observer.json')
  const creationsBefore = await page.evaluate(() => window.__urlPortabilityAudit.events.filter(({ kind }) => kind === 'native-create').length)
  await page.evaluate(() => window.__urlPortabilityAudit.hold('owned-pending-native.json'))
  await page.getByLabel('JSON 초안 가져오기', { exact: true }).setInputFiles(saved.savedPath)
  const input = page.getByLabel('JSON 초안 가져오기', { exact: true })
  const summary = page.getByRole('button', { name: '검토 요약 다운로드', exact: true })
  await expect(input).toBeDisabled()
  await expect(summary).toBeDisabled()
  await expect(page.locator('.editing-lock')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByLabel('서비스 이름', { exact: true })).toBeDisabled()
  await expect(page.getByLabel('서비스 URL', { exact: true })).toHaveValue(invalidUrl)
  await expect(page.locator('.save-state')).toContainText('JSON 초안 확인 중')
  await summary.evaluate((button: HTMLButtonElement) => button.click())
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  expect(await page.evaluate(() => window.__urlPortabilityAudit.events.filter(({ kind }) => kind === 'native-create').length)).toBe(creationsBefore)
  expect(await page.evaluate(() => window.__urlPortabilityAudit.pending)).toBe(true)
  expect(await page.evaluate(() => window.__urlPortabilityAudit.storageCalls)).toEqual([])
  await blocked(page, formatWarning)
  await page.screenshot({ path: info.outputPath('pending-lock.png'), fullPage: true })
  await receipt(info, 'pending-lock.json', { before, savedNativePath: saved.savedPath, events: await page.evaluate(() => window.__urlPortabilityAudit.events), storageCalls: await page.evaluate(() => window.__urlPortabilityAudit.storageCalls) })
  await page.evaluate(() => window.__urlPortabilityAudit.release())
  await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
  await expect(input).toBeEnabled()
  await expect(input).toHaveValue('')
  await expect(summary).toBeEnabled()
  await expect(page.locator('.editing-lock')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue(serviceName)
  await expect(page.getByLabel('서비스 URL', { exact: true })).toHaveValue('')
  await blocked(page, missingWarning)
  const after = await download(page, info, 'json', 'pending-restored-native.json')
  expect(after.bytes.equals(saved.bytes)).toBe(true)
  const audit = await auditReceipt(page, info, 'pending-release-observer.json')
  expect(audit.events.filter(({ kind }) => kind === 'native-file-text').map(({ filename }) => filename)).toEqual(['owned-pending-native.json'])
})
