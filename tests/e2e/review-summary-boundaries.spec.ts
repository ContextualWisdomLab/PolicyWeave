import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

// First-GREEN characterization of existing behavior, not a manufactured RED or
// evidence of browser/OS failures. Only the explicitly named fault cases inject
// failures; positive TXT/JSON downloads use the original browser primitives.
type FailureStage = 'blob' | 'url' | 'anchor' | 'click'
type BoundaryEvent = {
  kind: string
  url?: string
  type?: string
  filename?: string
  cleanupTask?: boolean
  sameTask?: boolean
  native?: boolean
}
type BoundaryController = {
  events: BoundaryEvent[]
  arm: (stage: FailureStage | null) => void
  hold: () => void
  release: (reject: boolean) => void
  fileReads: Array<{ name: string; native: boolean }>
  restore: () => boolean
}
declare global {
  interface Window { __reviewBoundary: BoundaryController }
}

/** Transparent observation with descriptor, receiver, return/throw preservation. */
async function installBoundaryObserver(page: Page) {
  await page.addInitScript(() => {
    const events: BoundaryEvent[] = []
    const fileReads: Array<{ name: string; native: boolean }> = []
    const saved: Array<{ owner: object; key: string; descriptor: PropertyDescriptor | undefined }> = []
    const nativeBlob = window.Blob
    const nativeCreate = URL.createObjectURL
    const nativeRevoke = URL.revokeObjectURL
    const nativeClick = HTMLAnchorElement.prototype.click
    const nativeElement = Document.prototype.createElement
    const nativeTimeout = window.setTimeout
    const nativeText = File.prototype.text
    const pending = new Map<string, { type: string; sameTask: boolean }>()
    let failure: FailureStage | null = null
    let holdFile = false
    let releaseFile: ((reject: boolean) => void) | undefined
    let cleanupTask = false
    let restored = false

    function replace(owner: object, key: string, value: unknown) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      saved.push({ owner, key, descriptor })
      Object.defineProperty(owner, key, descriptor ? { ...descriptor, value } : { value, configurable: true, writable: true })
    }
    function inject(stage: FailureStage, applicable: boolean) {
      if (failure !== stage || !applicable) return
      failure = null
      events.push({ kind: `injected-${stage}` })
      throw new Error(`test-fixture injected ${stage} boundary failure`)
    }
    replace(window, 'Blob', new Proxy(nativeBlob, {
      construct(target, args, newTarget) {
        inject('blob', args[1]?.type === 'text/plain;charset=utf-8')
        return Reflect.construct(target, args, newTarget)
      },
    }))
    replace(URL, 'createObjectURL', function (this: typeof URL, object: Blob | MediaSource) {
      inject('url', object instanceof nativeBlob && object.type === 'text/plain;charset=utf-8')
      const url = Reflect.apply(nativeCreate, this, [object])
      const record = { type: object instanceof nativeBlob ? object.type : '', sameTask: true }
      pending.set(url, record)
      events.push({ kind: 'create', url, type: record.type, native: true })
      queueMicrotask(() => {
        record.sameTask = false
        events.push({ kind: 'activation-microtask', url })
      })
      return url
    })
    replace(URL, 'revokeObjectURL', function (this: typeof URL, url: string) {
      const record = pending.get(url)
      // Call the original even for duplicate or unrelated revocations.
      const result = Reflect.apply(nativeRevoke, this, [url])
      events.push({ kind: 'revoke', url, type: record?.type, sameTask: record?.sameTask, cleanupTask, native: true })
      pending.delete(url)
      return result
    })
    replace(Document.prototype, 'createElement', function (this: Document, ...args: Parameters<Document['createElement']>) {
      inject('anchor', args[0] === 'a' && [...pending.values()].some(({ type }) => type === 'text/plain;charset=utf-8'))
      return Reflect.apply(nativeElement, this, args)
    })
    replace(HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement, ...args: []) {
      events.push({ kind: 'click-enter', url: this.href, filename: this.download })
      inject('click', this.download === 'policyweave-review.txt')
      const result = Reflect.apply(nativeClick, this, args)
      events.push({ kind: 'click-return', url: this.href, filename: this.download, native: true })
      return result
    })
    replace(window, 'setTimeout', function (this: Window, handler: TimerHandler, timeout?: number, ...args: unknown[]) {
      if (typeof handler !== 'function' || timeout !== 0 || pending.size === 0) {
        return Reflect.apply(nativeTimeout, this, [handler, timeout, ...args])
      }
      // Observe an actual scheduled task; never accelerate or suppress cleanup.
      events.push({ kind: 'timer-scheduled' })
      return Reflect.apply(nativeTimeout, this, [function (this: Window, ...callbackArgs: unknown[]) {
        const previous = cleanupTask
        cleanupTask = true
        events.push({ kind: 'timer-enter' })
        try { return Reflect.apply(handler, this, callbackArgs) } finally { cleanupTask = previous }
      }, timeout, ...args])
    })
    replace(File.prototype, 'text', function (this: File, ...args: []) {
      if (!holdFile || !this.name.startsWith('test-fixture')) return Reflect.apply(nativeText, this, args)
      holdFile = false
      const record = { name: this.name, native: false }
      fileReads.push(record)
      return new Promise<string>((resolve, reject) => {
        releaseFile = (readFailure) => {
          releaseFile = undefined
          if (readFailure) {
            reject(new Error('test-fixture injected File.text rejection'))
          } else {
            // Valid and invalid JSON both traverse the native File.text method.
            record.native = true
            try { resolve(Reflect.apply(nativeText, this, args)) } catch (error) { reject(error) }
          }
        }
      })
    })
    const controller: BoundaryController = {
      events, fileReads,
      arm: (stage) => { failure = stage },
      hold: () => { holdFile = true },
      release: (reject) => {
        if (!releaseFile) throw new Error('No owned test-fixture File.text read is pending')
        releaseFile(reject)
      },
      restore: () => {
        if (!restored) {
          for (const { owner, key, descriptor } of saved.toReversed()) {
            if (descriptor) Object.defineProperty(owner, key, descriptor)
            else Reflect.deleteProperty(owner, key)
          }
          restored = true
          window.removeEventListener('pagehide', onPageHide)
        }
        return saved.every(({ owner, key, descriptor }) => {
          const actual = Object.getOwnPropertyDescriptor(owner, key)
          if (!descriptor) return actual === undefined
          return actual !== undefined && Reflect.ownKeys(descriptor).every((property) => actual[property as keyof PropertyDescriptor] === descriptor[property as keyof PropertyDescriptor])
        })
      },
    }
    function onPageHide() { controller.restore() }
    Object.defineProperty(window, '__reviewBoundary', { value: controller, configurable: true })
    window.addEventListener('pagehide', onPageHide, { once: true })
  })
}

// These cases deliberately read all seven steps repeatedly, not a single page.
// Bound the evidence survey at 60s per case without changing global config,
// retry policy, production timer behavior, or lifecycle assertions.
test.setTimeout(60_000)
test.beforeEach(async ({ page }) => { await installBoundaryObserver(page) })
test.afterEach(async ({ page }) => {
  if (!page.isClosed()) expect(await page.evaluate(() => window.__reviewBoundary?.restore() ?? true)).toBe(true)
})

async function actualDownload(page: Page, filename: string, activate: () => Promise<unknown>) {
  const pending = page.waitForEvent('download')
  await activate()
  const download = await pending
  expect(download.suggestedFilename()).toBe(filename)
  expect(await download.failure()).toBeNull()
  const path = await download.path()
  expect(path).not.toBeNull()
  return readFile(path!)
}
async function summary(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '검토 요약 다운로드', exact: true })
  return actualDownload(page, 'policyweave-review.txt', () => keyboard ? button.press('Enter') : button.click())
}
async function jsonBytes(page: Page) {
  return actualDownload(page, 'policyweave-draft.json', () => page.getByRole('button', { name: 'JSON 내보내기', exact: true }).click())
}
async function step(page: Page, index: number) {
  await page.locator('.rail ol button').nth(index - 1).evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.form-panel h1')).toHaveText(new RegExp(`^${index}\\.`))
}

/** Inputs are intentionally raw/untrimmed; JSON alone would lose that evidence. */
async function seedWorkspace(page: Page, validServiceUrl = false) {
  await page.goto('/')
  await page.getByLabel('서비스 이름', { exact: true }).fill('  Boundary Fixture 서비스  ')
  await page.getByLabel('서비스 URL', { exact: true }).fill(validServiceUrl ? 'https://example.test/privacy' : 'https://example.test/privacy?token=RAW-ONLY-FIXTURE')
  await step(page, 2)
  await page.getByRole('checkbox', { name: '이메일 주소', exact: true }).check()
  await page.getByRole('combobox', { name: '이메일 주소 수집 구분', exact: true }).selectOption('선택')
  await page.getByLabel('수집 경로', { exact: true }).fill('  test-fixture signup  ')
  await step(page, 3)
  await page.getByLabel('이메일 주소 처리 목적', { exact: true }).fill('  test-fixture account notices  ')
  await step(page, 4)
  await page.getByRole('combobox', { name: '개인정보 보유 여부', exact: true }).selectOption('applies')
  await page.getByLabel('대표 보유 기간 또는 종료 조건', { exact: true }).fill('  test-fixture account closure  ')
  await step(page, 5)
  await page.getByRole('combobox', { name: '제3자 제공 여부', exact: true }).selectOption('yes')
  await page.getByLabel('제공받는 자', { exact: true }).fill('  Test Fixture Recipient  ')
  await page.getByLabel('제공 목적', { exact: true }).fill('  test-fixture delivery  ')
  await step(page, 6)
  await page.getByRole('combobox', { name: '국외 이전 여부', exact: true }).selectOption('yes')
  await page.getByLabel('이전 국가', { exact: true }).fill('  Test Fixture Country  ')
  await page.getByLabel('국외 수령자', { exact: true }).fill('  Test Fixture Overseas  ')
  await step(page, 7)
  await page.getByLabel('담당자 또는 담당 부서', { exact: true }).fill('  Test Fixture Privacy Team  ')
  await page.getByLabel('연락 이메일', { exact: true }).fill('privacy@example.test')
  await step(page, 2)
}

async function observableWorkspace(page: Page) {
  return page.evaluate(() => ({
    heading: document.querySelector('.form-panel h1')?.textContent,
    controls: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.form-panel input, .form-panel select')].map((control) => ({
      tag: control.tagName, name: control.name, type: control.type,
      value: control.value,
      checked: control instanceof HTMLInputElement ? control.checked : null,
      selected: control instanceof HTMLSelectElement ? [...control.options].map((option) => ({ value: option.value, selected: option.selected })) : null,
      disabled: control.matches(':disabled'), readOnly: control instanceof HTMLInputElement ? control.readOnly : null,
    })),
    navigation: [...document.querySelectorAll('.rail li')].map((item) => ({ text: item.textContent, class: item.className, current: item.querySelector('button')?.getAttribute('aria-current') })),
    progress: document.querySelector('.progress-copy')?.textContent,
    progressWidth: document.querySelector<HTMLElement>('.progress i')?.style.width,
    preview: document.querySelector('.paper')?.textContent,
    previewMeta: document.querySelector('.meta')?.textContent,
    readiness: [...document.querySelectorAll('.review-stat')].map((item) => item.textContent),
    publishDisabled: document.querySelector<HTMLButtonElement>('.publish')?.disabled,
    navigationDisabled: [...document.querySelectorAll<HTMLButtonElement>('.form-actions button')].map((button) => button.disabled),
  }))
}

/**
 * Normal native JSON bytes plus raw DOM properties at all seven authoring steps.
 * This proves observable work, including disabled controls and raw values omitted
 * by the JSON projection. It cannot prove discarded/unmounted disabled-item stale
 * facts which neither the public export nor a visible control exposes; no React
 * internals or production testing API is used to claim that inaccessible evidence.
 */
async function workspaceSnapshot(page: Page) {
  const bytes = await jsonBytes(page)
  const active = await page.locator('.rail ol button').evaluateAll((buttons) => buttons.findIndex((button) => button.getAttribute('aria-current') === 'step') + 1)
  // Native DOM activation avoids auto-scroll/animation waits during a read-only
  // survey; the public rail still owns every state transition (no React access).
  async function surveyStep(index: number) {
    await page.locator('.rail ol button').nth(index - 1).evaluate((button: HTMLButtonElement) => button.click())
    await expect(page.locator('.form-panel h1')).toHaveText(new RegExp(`^${index}\\.`))
  }
  const steps = []
  for (let index = 1; index <= 7; index += 1) {
    await surveyStep(index)
    steps.push(await observableWorkspace(page))
  }
  await surveyStep(active)
  return { json: bytes.toString('utf8'), active, steps, current: await observableWorkspace(page) }
}

async function audit(page: Page) {
  return page.evaluate(() => window.__reviewBoundary.events)
}
async function clearAudit(page: Page) {
  // Wait for native JSON snapshot cleanup before isolating summary evidence.
  await expect.poll(async () => {
    const events = await audit(page)
    return events.filter(({ kind }) => kind === 'create').length - events.filter(({ kind }) => kind === 'revoke').length
  }).toBe(0)
  await page.evaluate(() => { window.__reviewBoundary.events.length = 0 })
}
async function assertLifecycle(page: Page, expectedAllocations: number, clicked: boolean) {
  await expect.poll(async () => (await audit(page)).filter(({ kind }) => kind === 'revoke').length).toBe(expectedAllocations)
  const events = await audit(page)
  const created = events.filter(({ kind }) => kind === 'create')
  expect(created).toHaveLength(expectedAllocations)
  expect(new Set(created.map(({ url }) => url)).size).toBe(expectedAllocations)
  for (const creation of created) {
    expect(creation.type).toBe('text/plain;charset=utf-8')
    expect(creation.native).toBe(true)
    expect(creation.url).toMatch(/^blob:http:\/\/127\.0\.0\.1:4173\//)
    const revokes = events.filter(({ kind, url }) => kind === 'revoke' && url === creation.url)
    expect(revokes).toEqual([{ kind: 'revoke', url: creation.url, type: creation.type, sameTask: false, cleanupTask: true, native: true }])
    const revokeIndex = events.indexOf(revokes[0])
    expect(events.findIndex(({ kind, url }) => kind === 'activation-microtask' && url === creation.url)).toBeLessThan(revokeIndex)
    expect(events.slice(0, revokeIndex).some(({ kind }) => kind === 'timer-enter')).toBe(true)
    if (clicked) {
      const click = events.find(({ kind, url }) => kind === 'click-return' && url === creation.url)
      expect(click).toEqual({ kind: 'click-return', url: creation.url, filename: 'policyweave-review.txt', native: true })
      expect(events.indexOf(click!)).toBeLessThan(revokeIndex)
      expect(events.findIndex(({ kind, url }) => kind === 'click-enter' && url === creation.url)).toBeLessThan(events.indexOf(click!))
    }
  }
  // A second real task must not reveal a duplicate cleanup.
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  expect((await audit(page)).filter(({ kind }) => kind === 'revoke')).toHaveLength(expectedAllocations)
  return events
}
async function attachReceipt(testInfo: TestInfo, name: string, data: unknown) {
  // The configured line reporter does not retain successful body attachments.
  // Write the same actual observation under the runner's isolated output path.
  const path = testInfo.outputPath(name)
  await writeFile(path, JSON.stringify(data, null, 2))
  await testInfo.attach(name, { path, contentType: 'application/json' })
}

test('native TXT MIME, original URL/click and next-task cleanup preserve every observable step', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seedWorkspace(page)
  const before = await workspaceSnapshot(page)
  expect(before.json).not.toContain('RAW-ONLY-FIXTURE')
  expect(before.steps[0].controls.map(({ value }) => value)).toContain('https://example.test/privacy?token=RAW-ONLY-FIXTURE')
  await clearAudit(page)
  const first = await summary(page)
  const firstLifecycle = await assertLifecycle(page, 1, true)
  expect(first.toString('utf8')).toContain('Boundary Fixture 서비스')
  expect(first.toString('utf8')).toContain('공개본 아님')
  expect(first.toString('utf8')).not.toContain('RAW-ONLY-FIXTURE')
  await expect(page.locator('output')).toContainText('다운로드를 시작했습니다')
  expect(await workspaceSnapshot(page)).toEqual(before)
  await clearAudit(page)
  const second = await summary(page, true)
  const secondLifecycle = await assertLifecycle(page, 1, true)
  expect(second.equals(first)).toBe(true)
  expect(await workspaceSnapshot(page)).toEqual(before)
  expect(errors).toEqual([])
  await attachReceipt(testInfo, 'native-summary-lifecycle.json', { firstLifecycle, secondLifecycle, before, errors })
})

for (const stage of ['blob', 'url', 'anchor', 'click'] as const) {
  test(`injected ${stage} failure reports generic retry; native retry preserves observable workspace`, async ({ page }, testInfo) => {
    const errors: string[] = []
    const downloads: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('download', (download) => downloads.push(download.suggestedFilename()))
    await seedWorkspace(page)
    const before = await workspaceSnapshot(page)
    await clearAudit(page)
    downloads.length = 0
    await page.evaluate((failure) => window.__reviewBoundary.arm(failure), stage)
    await page.getByRole('button', { name: '검토 요약 다운로드', exact: true }).click()
    await expect(page.locator('output')).toHaveText('검토 요약을 내보내지 못했습니다. 다시 시도하세요.')
    const failureLifecycle = await assertLifecycle(page, stage === 'anchor' || stage === 'click' ? 1 : 0, false)
    expect(failureLifecycle.filter(({ kind }) => kind === `injected-${stage}`)).toHaveLength(1)
    expect(failureLifecycle.filter(({ kind }) => kind === 'click-return')).toEqual([])
    expect(downloads).toEqual([])
    expect(await workspaceSnapshot(page)).toEqual(before)
    await clearAudit(page)
    await page.evaluate(() => window.__reviewBoundary.arm(null))
    const bytes = await summary(page)
    const retryLifecycle = await assertLifecycle(page, 1, true)
    await expect(page.locator('output')).toContainText('다운로드를 시작했습니다')
    expect(bytes.toString('utf8')).toContain('Boundary Fixture 서비스')
    expect(await workspaceSnapshot(page)).toEqual(before)
    expect(errors).toEqual([])
    await attachReceipt(testInfo, `injected-${stage}-retry.json`, { failureLifecycle, retryLifecycle, before, errors })
  })
}

for (const outcome of ['valid', 'invalid', 'read-rejection'] as const) {
  test(`pending owned File.text ${outcome}: zero summary allocation, recovery and observable preservation`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await seedWorkspace(page, true)
    // Use an actual native schema-v1 export as the valid import, not invented JSON.
    await step(page, 1)
    await page.getByLabel('서비스 이름', { exact: true }).fill('Restored Fixture 서비스')
    const importBytes = await jsonBytes(page)
    await page.getByLabel('서비스 이름', { exact: true }).fill('Prior Fixture 서비스')
    await step(page, 2)
    const beforeImport = await workspaceSnapshot(page)
    await clearAudit(page)
    const beforePending = await observableWorkspace(page)
    await page.evaluate(() => window.__reviewBoundary.hold())
    await page.getByLabel('JSON 초안 가져오기', { exact: true }).setInputFiles({
      name: `test-fixture-${outcome}.json`, mimeType: 'application/json',
      buffer: outcome === 'invalid' ? Buffer.from('{}') : importBytes,
    })
    const button = page.getByRole('button', { name: '검토 요약 다운로드', exact: true })
    await expect(button).toBeDisabled()
    await expect(page.getByLabel('JSON 초안 가져오기', { exact: true })).toBeDisabled()
    await expect(page.locator('.editing-lock')).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('.save-state')).toContainText('JSON 초안 확인 중')
    await expect(page.getByRole('checkbox', { name: '이메일 주소', exact: true })).toBeDisabled()
    // Native HTMLElement.click on a disabled button is ignored by the browser.
    await button.evaluate((element: HTMLButtonElement) => element.click())
    await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    const pendingEvents = await audit(page)
    expect(pendingEvents.filter(({ kind }) => kind === 'create')).toEqual([])
    expect(pendingEvents.filter(({ kind }) => kind.startsWith('click-'))).toEqual([])
    const pendingWorkspace = await observableWorkspace(page)
    expect(pendingWorkspace.controls.map(({ disabled: _disabled, ...control }) => control)).toEqual(beforePending.controls.map(({ disabled: _disabled, ...control }) => control))
    expect(pendingWorkspace.preview).toBe(beforePending.preview)
    expect(pendingWorkspace.navigation).toEqual(beforePending.navigation)
    expect(pendingWorkspace.progress).toBe(beforePending.progress)
    expect(await page.evaluate(() => window.__reviewBoundary.fileReads)).toEqual([{ name: `test-fixture-${outcome}.json`, native: false }])
    await page.evaluate((reject) => window.__reviewBoundary.release(reject), outcome === 'read-rejection')
    await expect(button).toBeEnabled()
    await expect(page.getByLabel('JSON 초안 가져오기', { exact: true })).toBeEnabled()
    await expect(page.getByLabel('JSON 초안 가져오기', { exact: true })).toHaveValue('')
    await expect(page.locator('.editing-lock')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.save-state')).toContainText('브라우저 작업 중')
    if (outcome === 'valid') {
      await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
      await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue('Restored Fixture 서비스')
      await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
    } else {
      await expect(page.locator('output')).toContainText('불러오지 못했습니다')
    }
    const recovered = await workspaceSnapshot(page)
    if (outcome === 'valid') {
      expect(recovered.json).toBe(importBytes.toString('utf8'))
      expect(recovered.active).toBe(1)
      expect(recovered.json).not.toBe(beforeImport.json)
    } else {
      expect(recovered).toEqual(beforeImport)
    }
    await clearAudit(page)
    const bytes = await summary(page)
    const recoveryLifecycle = await assertLifecycle(page, 1, true)
    expect(bytes.toString('utf8')).toContain(outcome === 'valid' ? 'Restored Fixture 서비스' : 'Prior Fixture 서비스')
    expect(await workspaceSnapshot(page)).toEqual(recovered)
    const reads = await page.evaluate(() => window.__reviewBoundary.fileReads)
    expect(reads).toEqual([{ name: `test-fixture-${outcome}.json`, native: outcome !== 'read-rejection' }])
    expect(errors).toEqual([])
    await attachReceipt(testInfo, `pending-${outcome}.json`, { pendingEvents, reads, beforeImport, recovered, recoveryLifecycle, errors })
  })
}
