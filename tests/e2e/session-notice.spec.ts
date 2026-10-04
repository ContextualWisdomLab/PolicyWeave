import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

// US-SESSION-01: first-GREEN characterization of the current memory-only UI.
// Positive paths use native downloads and a real saved-file import. Only the
// explicitly named activation-failure cases inject a scoped synthetic fault.
const noticeText = '자동 저장되지 않습니다. 새로고침하거나 탭을 닫으면 작성 내용이 사라집니다. 보관하려면 JSON 내보내기를 사용하세요.'
type SessionAudit = {
  events: Array<{ kind: string; filename?: string; url?: string; type?: string }>
  storageCalls: string[]
  arm: (filename: string) => void
  restore: () => boolean
}
declare global { interface Window { __sessionNoticeAudit: SessionAudit } }
const pageErrors = new WeakMap<Page, string[]>()

// No storage initialization, export replacement, acceleration, or React access.
// Preserve native descriptors, method receivers, results and exceptions; the
// inherited File.text shadow is deleted on restoration, not redefined undefined.
async function installObserver(page: Page) {
  await page.addInitScript(() => {
    const events: SessionAudit['events'] = []
    const storageCalls: string[] = []
    const saved: Array<{ owner: object; key: string; descriptor: PropertyDescriptor | undefined }> = []
    let failureFilename: string | null = null
    let restored = false
    function replace(owner: object, key: string, value: unknown) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      saved.push({ owner, key, descriptor })
      Object.defineProperty(owner, key, descriptor ? { ...descriptor, value } : { value, writable: true, configurable: true })
    }
    const nativeCreate = URL.createObjectURL
    replace(URL, 'createObjectURL', function (this: typeof URL, object: Blob | MediaSource) {
      const url = Reflect.apply(nativeCreate, this, [object])
      events.push({ kind: 'native-create', url, type: object instanceof Blob ? object.type : '' })
      return url
    })
    const nativeRevoke = URL.revokeObjectURL
    replace(URL, 'revokeObjectURL', function (this: typeof URL, url: string) {
      const result = Reflect.apply(nativeRevoke, this, [url])
      events.push({ kind: 'native-revoke', url })
      return result
    })
    const nativeClick = HTMLAnchorElement.prototype.click
    replace(HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement) {
      if (failureFilename === this.download) {
        failureFilename = null
        events.push({ kind: 'synthetic-activation-failure', filename: this.download, url: this.href })
        throw new Error('US-SESSION-01 test-fixture activation failure')
      }
      const result = Reflect.apply(nativeClick, this, [])
      events.push({ kind: 'native-click', filename: this.download, url: this.href })
      return result
    })
    const nativeText = File.prototype.text
    replace(File.prototype, 'text', function (this: File) {
      const result = Reflect.apply(nativeText, this, [])
      events.push({ kind: 'native-file-text', filename: this.name })
      return result
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
    const audit: SessionAudit = {
      events, storageCalls,
      arm: (filename) => { failureFilename = filename },
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
          return descriptor ? actual !== undefined && Reflect.ownKeys(descriptor).every((property) => actual[property as keyof PropertyDescriptor] === descriptor[property as keyof PropertyDescriptor]) : actual === undefined
        })
      },
    }
    function onPageHide() { audit.restore() }
    Object.defineProperty(window, '__sessionNoticeAudit', { value: audit, configurable: true })
    window.addEventListener('pagehide', onPageHide, { once: true })
  })
}
async function receipt(info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(name)
  await writeFile(path, JSON.stringify(data, null, 2))
  await info.attach(name, { path, contentType: 'application/json' })
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  await installObserver(page)
})
test.afterEach(async ({ page }, info) => {
  if (page.isClosed()) return
  const audit = await page.evaluate(() => ({ events: window.__sessionNoticeAudit?.events ?? [], storageCalls: window.__sessionNoticeAudit?.storageCalls ?? [], restored: window.__sessionNoticeAudit?.restore() ?? true }))
  const errors = pageErrors.get(page) ?? []
  await receipt(info, 'native-observer.json', { ...audit, errors })
  expect(audit.restored).toBe(true)
  expect(audit.storageCalls).toEqual([])
  expect(errors).toEqual([])
})
async function notice(page: Page) {
  const paragraph = page.locator('.session-notice')
  await expect(paragraph).toHaveCount(1)
  await expect(paragraph).toHaveText(noticeText)
  await expect(paragraph).toBeVisible()
  const semantics = await paragraph.evaluate((element) => ({
    tag: element.tagName,
    liveAncestor: !!element.closest('[aria-live], [role="alert"], [role="status"], [role="log"]'),
    afterHeading: !!document.querySelector('.section-head') && !!(document.querySelector('.section-head')!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
    beforeControls: [...document.querySelectorAll('.form-panel input, .form-panel select, .form-panel textarea')].every((control) => !!(element.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING)),
    nextNotice: element.nextElementSibling?.classList.contains('notice'),
  }))
  expect(semantics).toEqual({ tag: 'P', liveAncestor: false, afterHeading: true, beforeControls: true, nextNotice: true })
  await expect(page.locator('.topbar')).not.toContainText(/임시\s*저장/)
  const topVersion = page.locator('.topbar .version')
  const previewVersion = page.locator('.preview .meta span').filter({ hasText: '앱 버전' })
  await expect(topVersion).toHaveText('앱 버전 0.1.0')
  await expect(previewVersion).toHaveCount(1)
  await expect(previewVersion).toHaveText('앱 버전 0.1.0')
  await expect(previewVersion).toBeVisible()
  // The phone stylesheet intentionally hides the topbar version; require its
  // DOM identity everywhere, and visual identity where the stylesheet exposes it.
  if (page.viewportSize()!.width > 720) await expect(topVersion).toBeVisible()
  else await expect(topVersion).toBeHidden()
  return semantics
}
async function step(page: Page, number: number) {
  // Native activation of the public rail, not a private state/testing API. The
  // mobile horizontal rail is intentional; read-only surveys need not scroll it.
  await page.locator('.rail ol button').nth(number - 1).evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.form-panel h1')).toHaveText(new RegExp(`^${number}\\.`))
  await notice(page)
}
async function download(page: Page, info: TestInfo, filename: string, retainedName: string) {
  await notice(page)
  const pending = page.waitForEvent('download')
  const button = page.getByRole('button', { name: filename.endsWith('.json') ? 'JSON 내보내기' : '검토 요약 다운로드', exact: true })
  if (info.project.name === 'mobile-chromium') await button.tap()
  else await button.click()
  const actual = await pending
  expect(actual.suggestedFilename()).toBe(filename)
  expect(await actual.failure()).toBeNull()
  const nativePath = await actual.path()
  expect(nativePath).not.toBeNull()
  const savedPath = info.outputPath(retainedName)
  await actual.saveAs(savedPath)
  const bytes = await readFile(savedPath)
  expect(bytes.equals(await readFile(nativePath!))).toBe(true)
  await notice(page)
  await receipt(info, `${retainedName}.receipt.json`, { filename, nativePath, savedPath, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  return { bytes, savedPath }
}
async function seed(page: Page) {
  await page.goto('/')
  await notice(page)
  await page.getByLabel('서비스 이름', { exact: true }).fill('Session Notice Synthetic Fixture')
  await page.getByLabel('서비스 URL', { exact: true }).fill('https://example.test/privacy')
  await step(page, 2)
  await page.getByRole('checkbox', { name: '이메일 주소', exact: true }).check()
  await page.getByRole('combobox', { name: '이메일 주소 수집 구분', exact: true }).selectOption('선택')
  await page.getByLabel('수집 경로', { exact: true }).fill('Synthetic fixture signup')
  await step(page, 3)
  await page.getByLabel('이메일 주소 처리 목적', { exact: true }).fill('Synthetic fixture account notices')
  await step(page, 4)
  await page.getByRole('combobox', { name: '개인정보 보유 여부', exact: true }).selectOption('applies')
  await page.getByLabel('대표 보유 기간 또는 종료 조건', { exact: true }).fill('Synthetic fixture account closure')
  await step(page, 5)
  await page.getByRole('combobox', { name: '제3자 제공 여부', exact: true }).selectOption('yes')
  await page.getByLabel('제공받는 자', { exact: true }).fill('Synthetic Fixture Recipient')
  await page.getByLabel('제공 목적', { exact: true }).fill('Synthetic fixture delivery')
  await step(page, 6)
  await page.getByRole('combobox', { name: '국외 이전 여부', exact: true }).selectOption('yes')
  await page.getByLabel('이전 국가', { exact: true }).fill('Synthetic Fixture Country')
  await page.getByLabel('국외 수령자', { exact: true }).fill('Synthetic Fixture Overseas')
  await step(page, 7)
  await page.getByLabel('담당자 또는 담당 부서', { exact: true }).fill('Synthetic Fixture Privacy Team')
  await page.getByLabel('연락 이메일', { exact: true }).fill('privacy@example.test')
  await expect(page.locator('.progress-copy')).toContainText('7/7 완료')
  await notice(page)
}
async function survey(page: Page) {
  const active = await page.locator('.rail ol button').evaluateAll((buttons) => buttons.findIndex((button) => button.getAttribute('aria-current') === 'step') + 1)
  const observations = []
  for (let index = 1; index <= 7; index++) {
    await step(page, index)
    observations.push(await page.evaluate(() => ({
      heading: document.querySelector('.form-panel h1')?.textContent,
      controls: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.form-panel input, .form-panel select')].map((control) => ({ name: control.name, type: control.type, value: control.value, checked: control instanceof HTMLInputElement ? control.checked : null, disabled: control.matches(':disabled'), selected: control instanceof HTMLSelectElement ? [...control.options].map((option) => option.selected) : null })),
      progress: document.querySelector('.progress-copy')?.textContent,
      preview: document.querySelector('.paper')?.textContent,
      notice: document.querySelector('.session-notice')?.textContent,
    })))
  }
  await step(page, active)
  return { active, observations }
}
async function layoutSurvey(page: Page, info: TestInfo, label: string) {
  await page.goto('/')
  const measurements = []
  for (let index = 1; index <= 7; index++) {
    await step(page, index)
    await page.locator('.session-notice').scrollIntoViewIfNeeded()
    const geometry = await page.locator('.session-notice').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const lines = [...range.getClientRects()].map((line) => ({ left: line.left, right: line.right, top: line.top, bottom: line.bottom }))
      const siblings = [...document.querySelectorAll('.section-head, .notice, .form-panel input, .form-panel select, .form-panel textarea')].map((sibling) => sibling.getBoundingClientRect())
      const style = getComputedStyle(element)
      return {
        viewport: { width: innerWidth, height: innerHeight },
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, lines,
        clipped: element.scrollWidth > element.clientWidth,
        display: style.display, visibility: style.visibility, opacity: style.opacity,
        overlaps: siblings.filter((sibling) => Math.min(rect.right, sibling.right) - Math.max(rect.left, sibling.left) > 0.5 && Math.min(rect.bottom, sibling.bottom) - Math.max(rect.top, sibling.top) > 0.5).length,
      }
    })
    measurements.push({ step: index, ...geometry })
    await page.screenshot({ path: info.outputPath(`${label}-step-${index}.png`), fullPage: true })
    // Retain actual evidence before any assertion can stop this survey.
    await receipt(info, `${label}-geometry.json`, measurements)
    expect(geometry.clipped).toBe(false)
    expect(geometry.overlaps).toBe(0)
    expect(geometry.rect.left).toBeGreaterThanOrEqual(0)
    expect(geometry.rect.right).toBeLessThanOrEqual(geometry.viewport.width)
    expect(geometry.rect.top).toBeGreaterThanOrEqual(0)
    expect(geometry.rect.bottom).toBeLessThanOrEqual(geometry.viewport.height)
    expect(geometry.lines.length).toBeGreaterThan(0)
    if (geometry.viewport.width <= 400) expect(new Set(geometry.lines.map((line) => line.top)).size).toBeGreaterThan(1)
    for (const line of geometry.lines) {
      expect(line.left).toBeGreaterThanOrEqual(geometry.rect.left - 1)
      expect(line.right).toBeLessThanOrEqual(geometry.rect.right + 1)
      expect(line.top).toBeGreaterThanOrEqual(geometry.rect.top - 1)
      expect(line.bottom).toBeLessThanOrEqual(geometry.rect.bottom + 1)
    }
  }
}

test('US-SESSION-01 every profile: one ordinary notice precedes inputs on all seven steps without clipping or overlap', async ({ page }, info) => {
  await layoutSurvey(page, info, 'profile')
})
test('US-SESSION-01 320px: notice visibly wraps without overlap on all seven steps', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await layoutSurvey(page, info, '320px')
})
test('US-SESSION-01 native JSON file: UI 7/7, reload empty 0/7, file restore to step 1 and byte-equal re-export', async ({ page }, info) => {
  await seed(page)
  const before = await survey(page)
  const exported = await download(page, info, 'policyweave-draft.json', 'original-draft.json')
  expect(JSON.parse(exported.bytes.toString('utf8'))).toMatchObject({ schema_version: 1, document_state: 'review_ready', review_finding_codes: [] })
  await page.reload()
  await notice(page)
  await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
  await expect(page.locator('.progress-copy')).toContainText('0/7 완료')
  const empty = await survey(page)
  for (const observation of empty.observations) {
    for (const control of observation.controls) {
      expect(control.value).toBe(control.type === 'checkbox' ? 'on' : '')
      if (control.checked !== null) expect(control.checked).toBe(false)
      if (control.selected) expect(control.selected).toEqual(control.selected.map((_, index) => index === 0))
    }
  }
  const input = page.getByLabel('JSON 초안 가져오기', { exact: true })
  await input.setInputFiles(exported.savedPath)
  await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
  await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
  await expect(page.locator('.progress-copy')).toContainText('7/7 완료')
  await expect(input).toHaveValue('')
  const restored = await survey(page)
  expect(restored.observations).toEqual(before.observations)
  expect(restored.active).toBe(1)
  const reexport = await download(page, info, 'policyweave-draft.json', 'restored-draft.json')
  expect(reexport.bytes.equals(exported.bytes)).toBe(true)
  await receipt(info, 'reload-and-restore.json', { before, empty, restored, actualFilePath: exported.savedPath })
})
test('US-SESSION-01 actual TXT and invalid native-file import retain known facts and notice', async ({ page }, info) => {
  await seed(page)
  const before = await survey(page)
  const original = await download(page, info, 'policyweave-draft.json', 'before-invalid.json')
  const txt = await download(page, info, 'policyweave-review.txt', 'actual-review.txt')
  expect(txt.bytes.toString('utf8')).toContain('Session Notice Synthetic Fixture')
  expect(txt.bytes.toString('utf8')).toContain('공개본 아님')
  // The session warning belongs to the workspace, not the exported policy prose.
  expect(await survey(page)).toEqual(before)
  const invalidPath = info.outputPath('test-fixture-invalid.json')
  await writeFile(invalidPath, '{}\n')
  await page.getByLabel('JSON 초안 가져오기', { exact: true }).setInputFiles(invalidPath)
  await expect(page.locator('output')).toContainText('불러오지 못했습니다')
  await notice(page)
  expect(await survey(page)).toEqual(before)
  const after = await download(page, info, 'policyweave-draft.json', 'after-invalid.json')
  expect(after.bytes.equals(original.bytes)).toBe(true)
  await receipt(info, 'invalid-preservation.json', { before, invalidPath })
})
for (const filename of ['policyweave-draft.json', 'policyweave-review.txt']) {
  test(`US-SESSION-01 explicitly injected ${filename} activation failure retains facts and notice; native retry`, async ({ page }, info) => {
    await seed(page)
    const before = await survey(page)
    const original = await download(page, info, 'policyweave-draft.json', 'before-failure.json')
    const downloads: string[] = []
    page.on('download', (actual) => downloads.push(actual.suggestedFilename()))
    await page.evaluate((ownedFilename) => window.__sessionNoticeAudit.arm(ownedFilename), filename)
    await page.getByRole('button', { name: filename.endsWith('.json') ? 'JSON 내보내기' : '검토 요약 다운로드', exact: true }).click()
    await expect(page.locator('output')).toHaveText(filename.endsWith('.json') ? 'JSON 파일을 내보내지 못했습니다. 다시 시도하세요.' : '검토 요약을 내보내지 못했습니다. 다시 시도하세요.')
    await notice(page)
    expect(await survey(page)).toEqual(before)
    expect(downloads).toEqual([])
    const retry = await download(page, info, filename, `native-retry-${filename}`)
    if (filename.endsWith('.json')) expect(retry.bytes.equals(original.bytes)).toBe(true)
    else expect(retry.bytes.toString('utf8')).toContain('Session Notice Synthetic Fixture')
    const after = await download(page, info, 'policyweave-draft.json', 'after-failure.json')
    expect(after.bytes.equals(original.bytes)).toBe(true)
    expect(await survey(page)).toEqual(before)
    await expect.poll(() => page.evaluate(() => window.__sessionNoticeAudit.events.filter((event) => event.kind === 'native-create').length - window.__sessionNoticeAudit.events.filter((event) => event.kind === 'native-revoke').length)).toBe(0)
    expect(await page.evaluate(() => window.__sessionNoticeAudit.events.filter((event) => event.kind === 'synthetic-activation-failure').map((event) => event.filename))).toEqual([filename])
    await receipt(info, 'failure-preservation.json', { before, scopedSyntheticFault: filename })
  })
}
