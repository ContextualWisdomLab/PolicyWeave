import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

const pendingText = 'JSON 초안 확인 중'
const idleText = '브라우저 작업 중'

type ReadGate = {
  active: boolean
  calls: string[]
  nativeContents: string | null
  settled: boolean
  release: () => void
  restore: () => { exactDescriptor: boolean; lookupEqual: boolean; ownShadowDeleted: boolean }
}
declare global { interface Window { importFeedbackGate: ReadGate } }

// Only this exact fixture's first read changes Promise/timing; every other call
// retains the native receiver, arguments, Promise and synchronous throws.
async function installGate(page: Page, name: string, rejectRead = false) {
  await page.evaluate(({ name, rejectRead }) => {
    const proto = File.prototype
    const original = Object.getOwnPropertyDescriptor(proto, 'text')
    const native = proto.text
    let release!: () => void
    const barrier = new Promise<void>((resolve) => { release = resolve })
    let used = false
    const gate: ReadGate = {
      active: true, calls: [], nativeContents: null, settled: false, release,
      restore() {
        release()
        if (gate.active) {
          if (original) Object.defineProperty(proto, 'text', original)
          else delete (proto as Partial<File>).text
          gate.active = false
          window.removeEventListener('pagehide', onHide)
        }
        const now = Object.getOwnPropertyDescriptor(proto, 'text')
        return {
          exactDescriptor: original ? !!now && now.value === original.value && now.get === original.get && now.set === original.set && now.writable === original.writable && now.enumerable === original.enumerable && now.configurable === original.configurable : now === undefined,
          lookupEqual: proto.text === native,
          ownShadowDeleted: original !== undefined || !Object.hasOwn(proto, 'text'),
        }
      },
    }
    const onHide = () => gate.restore()
    Object.defineProperty(proto, 'text', {
      configurable: true, writable: true, enumerable: original?.enumerable ?? false,
      value: function (this: File, ...args: []) {
        const result = Reflect.apply(native, this, args) as Promise<string>
        if (!gate.active) return result
        gate.calls.push(this.name)
        if (used || this.name !== name) return result
        used = true
        return result.then(async (contents) => {
          gate.nativeContents = contents
          try {
            await barrier
            if (rejectRead) throw new Error('owned fixture read rejection')
            return contents
          } finally { gate.settled = true }
        }, (error: unknown) => { gate.settled = true; throw error })
      },
    })
    window.importFeedbackGate = gate
    window.addEventListener('pagehide', onHide, { once: true })
  }, { name, rejectRead })
}

async function restoreGate(page: Page, info: TestInfo) {
  const receipt = await page.evaluate(() => window.importFeedbackGate.restore())
  await writeFile(info.outputPath('descriptor-restoration.json'), JSON.stringify(receipt))
  await info.attach('descriptor-restoration', { body: JSON.stringify(receipt), contentType: 'application/json' })
  expect(receipt).toEqual({ exactDescriptor: true, lookupEqual: true, ownShadowDeleted: true })
}

async function saveDraft(page: Page, info: TestInfo, label: string) {
  const arrival = page.waitForEvent('download')
  await page.getByRole('button', { name: /JSON 내보내기/ }).click()
  const download = await arrival
  const path = info.outputPath(label, download.suggestedFilename())
  await download.saveAs(path)
  return { path, bytes: await readFile(path, 'utf8'), name: download.suggestedFilename() }
}

async function factsSnapshot(page: Page) {
  return page.evaluate(() => ({
    controls: Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.editing-lock input, .editing-lock select, .editing-lock textarea')).map((node) => ({
      tag: node.tagName, type: node.type, value: node.value,
      checked: node instanceof HTMLInputElement ? node.checked : null,
      selected: node instanceof HTMLSelectElement ? Array.from(node.options).map((option) => option.selected) : null,
    })),
    heading: document.querySelector('h1')?.textContent,
    preview: document.querySelector('.paper')?.textContent,
    rail: Array.from(document.querySelectorAll('.rail li')).map((node) => [node.className, node.textContent]),
    readiness: Array.from(document.querySelectorAll('.review-bar > :not(output)')).map((node) => node.textContent),
    completion: document.querySelector('.progress-copy')?.textContent,
  }))
}

async function measure(page: Page, expectedText: string) {
  await page.evaluate(() => document.fonts.ready)
  const visual = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('.save-state')!
    const box = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const status = box(node)
    const lines: ReturnType<typeof box>[] = []
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const text = walker.currentNode
      if (!text.textContent?.trim() || text.parentElement?.closest('svg')) continue
      const range = document.createRange()
      range.selectNodeContents(text)
      for (const r of range.getClientRects()) lines.push({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom })
    }
    const ancestors = []
    for (let element: HTMLElement | null = node; element; element = element.parentElement) {
      const style = getComputedStyle(element)
      ancestors.push({ tag: element.tagName, className: element.className, rect: box(element), display: style.display, visibility: style.visibility, opacity: style.opacity, fontSize: style.fontSize, overflowX: style.overflowX, overflowY: style.overflowY, clipPath: style.clipPath })
    }
    const header = document.querySelector('.topbar')!
    const siblings = Array.from(header.children).filter((element) => element !== node && getComputedStyle(element).display !== 'none').map((element) => ({ className: element.className, text: element.textContent, rect: box(element) }))
    return { text: node.textContent?.trim(), status, lines, ancestors, siblings, header: box(header), rail: box(document.querySelector('.rail')!), width: innerWidth, style: { flexBasis: getComputedStyle(node).flexBasis, marginLeft: getComputedStyle(node).marginLeft, whiteSpace: getComputedStyle(node).whiteSpace, overflowWrap: getComputedStyle(node).overflowWrap } }
  })
  const cdp = await page.context().newCDPSession(page)
  try {
    const doc = await cdp.send('DOM.getDocument')
    const query = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.save-state' })
    const described = await cdp.send('DOM.describeNode', { nodeId: query.nodeId })
    const tree = await cdp.send('Accessibility.getFullAXTree')
    const owner = tree.nodes.find((node) => node.backendDOMNodeId === described.node.backendNodeId)
    const map = new Map(tree.nodes.map((node) => [node.nodeId, node]))
    const descendants: typeof tree.nodes = []
    const visit = (id: string) => {
      const node = map.get(id)
      if (!node) return
      descendants.push(node)
      for (const child of node.childIds ?? []) visit(child)
    }
    for (const id of owner?.childIds ?? []) visit(id)
    const ancestors: typeof tree.nodes = []
    for (let node = owner; node; node = node.parentId ? map.get(node.parentId) : undefined) ancestors.push(node)
    const property = (node: typeof tree.nodes[number], name: string) => node.properties?.find((prop) => prop.name === name)?.value.value
    const textNodes = descendants.filter((node) => !node.ignored && node.role?.value === 'StaticText' && node.name?.value?.trim() === expectedText)
    return { visual, ax: { backendNode: described.node.backendNodeId, owner, descendants, ancestors, live: owner ? property(owner, 'live') : null, busy: ancestors.some((node) => { const busy = property(node, 'busy'); return busy === true || busy === 1 || busy === 'true' }), textCount: textNodes.length, paths: textNodes.map((node) => node.nodeId) } }
  } finally { await cdp.detach() }
}

type Measurement = Awaited<ReturnType<typeof measure>>
function violations(data: Measurement, text: string) {
  const { visual: v, ax } = data
  const errors: string[] = []
  const inside = (a: typeof v.status, b: typeof v.status, horizontal = true, vertical = true) => (!horizontal || a.x >= b.x - 1 && a.right <= b.right + 1) && (!vertical || a.y >= b.y - 1 && a.bottom <= b.bottom + 1)
  if (v.text !== text || !v.status.width || !v.status.height || v.ancestors.some((a) => a.display === 'none' || a.visibility !== 'visible' || Number(a.opacity) <= 0 || Number.parseFloat(a.fontSize) <= 0)) errors.push('hidden')
  if (!v.lines.length || v.lines.some((line) => line.width <= 0 || line.height <= 0)) errors.push('empty-line')
  if (v.lines.some((line) => !inside(line, v.status) || line.x < -1 || line.right > v.width + 1 || v.ancestors.some((a) => a.clipPath !== 'none' || !inside(line, a.rect, ['hidden', 'clip', 'auto', 'scroll'].includes(a.overflowX), ['hidden', 'clip', 'auto', 'scroll'].includes(a.overflowY))))) errors.push('clipped')
  if (v.siblings.some(({ rect: b }) => b.width > 0 && b.height > 0 && Math.min(v.status.right, b.right) - Math.max(v.status.x, b.x) > 1 && Math.min(v.status.bottom, b.bottom) - Math.max(v.status.y, b.y) > 1)) errors.push('overlap')
  if (v.rail.y < v.header.bottom - 1) errors.push('rail-above-header')
  if (!ax.owner || ax.owner.ignored || ax.live !== 'polite' || ax.textCount !== 1) errors.push('wrong-AX')
  if (ax.busy) errors.push('busy-ancestor')
  return errors
}

async function record(page: Page, info: TestInfo, label: string, text: string) {
  const data = await measure(page, text)
  await writeFile(info.outputPath(`${label}.json`), JSON.stringify({ ...data, violations: violations(data, text) }, null, 2))
  await info.attach(label, { body: JSON.stringify({ ...data, violations: violations(data, text) }, null, 2), contentType: 'application/json' })
  await page.screenshot({ path: info.outputPath(`${label}.png`), fullPage: true, animations: 'disabled' })
  return data
}

async function prepare(page: Page, info: TestInfo, width: number, longTitle = false) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/')
  await page.getByLabel('서비스 이름', { exact: true }).fill('Synthetic Saved Service')
  const saved = await saveDraft(page, info, 'saved')
  await page.reload()
  await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue('')
  await page.getByLabel('서비스 이름', { exact: true }).fill(longTitle ? 'Synthetic current service '.repeat(8) : 'Current')
  await page.locator('.rail').getByRole('button', { name: /보유 기간/ }).click()
  await page.getByLabel('개인정보 보유 여부').selectOption('applies')
  await page.getByLabel('대표 보유 기간 또는 종료 조건').fill('Synthetic retention condition')
  await page.evaluate(() => window.scrollTo(0, 0))
  return saved
}

for (const width of [320, 390, 720]) {
  test(`native saved-file pending feedback at ${width}`, async ({ page }, info) => {
    const saved = await prepare(page, info, width)
    const before = await factsSnapshot(page)
    const input = page.getByLabel('JSON 초안 가져오기')
    const identity = await input.elementHandle()
    await installGate(page, saved.name)
    try {
      await input.setInputFiles(saved.path)
      await expect.poll(() => page.evaluate(() => window.importFeedbackGate.nativeContents)).toBe(saved.bytes)
      // Measurements are retained before the intended RED assertion.
      const pending = await record(page, info, 'pending', pendingText)
      const observed = await page.evaluate(() => ({ active: window.importFeedbackGate.active, calls: window.importFeedbackGate.calls, busy: document.querySelector('.editing-lock')?.getAttribute('aria-busy'), disabled: (document.querySelector('input[type=file]') as HTMLInputElement).disabled }))
      await info.attach('pending-prerequisites', { body: JSON.stringify(observed), contentType: 'application/json' })
      expect(observed).toEqual({ active: true, calls: [saved.name], busy: 'true', disabled: true })
      await expect(page.locator('.file-control')).toHaveAttribute('aria-disabled', 'true')
      await expect(page.locator('.review-download')).toBeDisabled()
      await expect(page.locator('fieldset.editing-lock')).toHaveJSProperty('disabled', true)
      expect(await page.locator('.session-notice').evaluate((node) => !node.closest('[aria-live], [role=status], [role=alert]'))).toBe(true)
      expect(await identity!.evaluate((node) => node === document.querySelector('input[type=file]'))).toBe(true)
      expect(await factsSnapshot(page)).toEqual(before)
      expect(violations(pending, pendingText)).toEqual([])
      await page.evaluate(() => window.importFeedbackGate.release())
      await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
      await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue('Synthetic Saved Service')
      await expect(page.locator('h1')).toHaveText('1. 서비스 정보')
      await expect(page.locator('fieldset.editing-lock')).toHaveJSProperty('disabled', false)
      await expect(input).toBeEnabled()
      await expect(input).toHaveValue('')
      expect(violations(await record(page, info, 'idle', idleText), idleText)).toEqual([])
      expect((await saveDraft(page, info, 'reexport')).bytes).toBe(saved.bytes)
    } finally {
      await page.evaluate(() => window.importFeedbackGate.release())
      await expect.poll(() => page.evaluate(() => window.importFeedbackGate.settled)).toBe(true)
      await restoreGate(page, info)
    }
  })
}

// Execute this unchanged on the baseline before the mobile-only CSS repair.
for (const width of [320, 390]) {
  for (const mode of ['invalid', 'read-reject', 'oversize'] as const) {
    test(`native ${mode} preserves current work at ${width}`, async ({ page }, info) => {
      await prepare(page, info, width)
      const before = await factsSnapshot(page)
      const previous = await saveDraft(page, info, 'previous')
      const name = `${mode}.json`
      const path = info.outputPath(name)
      await writeFile(path, mode === 'oversize' ? ' '.repeat(1024 * 1024 + 1) : mode === 'invalid' ? '{bad JSON' : previous.bytes)
      await installGate(page, name, mode === 'read-reject')
      try {
        await page.getByLabel('JSON 초안 가져오기').setInputFiles(path)
        if (mode !== 'oversize') {
          await expect.poll(() => page.evaluate(() => window.importFeedbackGate.nativeContents)).toBe(await readFile(path, 'utf8'))
          expect(violations(await record(page, info, 'pending', pendingText), pendingText)).toEqual([])
          expect(await factsSnapshot(page)).toEqual(before)
          await page.evaluate(() => window.importFeedbackGate.release())
        }
        await expect(page.locator('output')).toContainText(mode === 'oversize' ? '1 MiB' : '불러오지 못했습니다')
        expect(await page.evaluate(() => ({ active: window.importFeedbackGate.active, calls: window.importFeedbackGate.calls }))).toEqual({ active: true, calls: mode === 'oversize' ? [] : [name] })
        expect(await factsSnapshot(page)).toEqual(before)
        await expect(page.getByLabel('JSON 초안 가져오기')).toBeEnabled()
        await expect(page.getByLabel('JSON 초안 가져오기')).toHaveValue('')
        expect(violations(await record(page, info, 'idle', idleText), idleText)).toEqual([])
        expect((await saveDraft(page, info, 'preserved')).bytes).toBe(previous.bytes)
      } finally {
        await page.evaluate(() => window.importFeedbackGate.release())
        if (mode !== 'oversize') await expect.poll(() => page.evaluate(() => window.importFeedbackGate.settled)).toBe(true)
        await restoreGate(page, info)
      }
    })
  }
}

test('720 long title pending and idle remain readable', async ({ page }, info) => {
  const saved = await prepare(page, info, 720, true)
  await installGate(page, saved.name)
  try {
    expect(violations(await record(page, info, 'long-idle', idleText), idleText)).toEqual([])
    await page.getByLabel('JSON 초안 가져오기').setInputFiles(saved.path)
    await expect.poll(() => page.evaluate(() => window.importFeedbackGate.nativeContents)).toBe(saved.bytes)
    expect(violations(await record(page, info, 'long-pending', pendingText), pendingText)).toEqual([])
  } finally {
    await page.evaluate(() => window.importFeedbackGate.release())
    await expect.poll(() => page.evaluate(() => window.importFeedbackGate.settled)).toBe(true)
    await restoreGate(page, info)
  }
})

test('held native read settles on pagehide cleanup with exact inherited restoration', async ({ page }, info) => {
  const saved = await prepare(page, info, 390)
  await installGate(page, saved.name)
  try {
    await page.getByLabel('JSON 초안 가져오기').setInputFiles(saved.path)
    await expect.poll(() => page.evaluate(() => window.importFeedbackGate.nativeContents)).toBe(saved.bytes)
    expect(await page.evaluate(() => window.importFeedbackGate.active)).toBe(true)
    // Explicit lifecycle-event sensitivity, not a claim about destroyed frames.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
    await expect.poll(() => page.evaluate(() => window.importFeedbackGate.settled)).toBe(true)
    expect(await page.evaluate(() => window.importFeedbackGate.active)).toBe(false)
    await expect(page.locator('output')).toContainText('초안을 불러왔습니다')
  } finally { await restoreGate(page, info) }
})

test('geometry and AX oracles reject isolated causal mutations', async ({ page }, info) => {
  await prepare(page, info, 390)
  const valid = await record(page, info, 'sensitivity-valid', idleText)
  expect(violations(valid, idleText)).toEqual([])
  for (const [mode, reason] of [['hidden', 'hidden'], ['clip', 'clipped'], ['overlap', 'overlap'], ['empty', 'empty-line'], ['wrongAX', 'wrong-AX'], ['busy', 'busy-ancestor']] as const) {
    const restore = await page.evaluate((mode) => {
      const status = document.querySelector<HTMLElement>('.save-state')!
      const header = document.querySelector<HTMLElement>('.topbar')!
      const state = { style: status.getAttribute('style'), html: status.innerHTML, busy: header.getAttribute('aria-busy') }
      if (mode === 'hidden') status.style.display = 'none'
      if (mode === 'clip') status.style.clipPath = 'inset(50%)'
      if (mode === 'overlap') {
        const b = document.querySelector('.document-name')!.getBoundingClientRect()
        status.style.position = 'absolute'; status.style.left = `${b.x}px`; status.style.top = `${b.y}px`
      }
      if (mode === 'empty') status.innerHTML = ''
      if (mode === 'wrongAX') status.setAttribute('aria-hidden', 'true')
      if (mode === 'busy') header.setAttribute('aria-busy', 'true')
      return state
    }, mode)
    try {
      const changed = await record(page, info, `sensitivity-${mode}`, idleText)
      expect(violations(changed, idleText)).toContain(reason)
    } finally {
      await page.evaluate((state) => {
        const status = document.querySelector('.save-state')!
        const header = document.querySelector('.topbar')!
        if (state.style === null) status.removeAttribute('style'); else status.setAttribute('style', state.style)
        status.innerHTML = state.html
        status.removeAttribute('aria-hidden')
        if (state.busy === null) header.removeAttribute('aria-busy'); else header.setAttribute('aria-busy', state.busy)
      }, restore)
    }
    expect(violations(await measure(page, idleText), idleText)).toEqual([])
  }
})

for (const width of [721, 820, 1280]) {
  test(`nonmobile geometry baseline ${width}`, async ({ page }, info) => {
    const saved = await prepare(page, info, width)
    await installGate(page, saved.name)
    try {
      const idle = await record(page, info, 'baseline-idle', idleText)
      await page.getByLabel('JSON 초안 가져오기').setInputFiles(saved.path)
      await expect.poll(() => page.evaluate(() => window.importFeedbackGate.nativeContents)).toBe(saved.bytes)
      const pending = await record(page, info, 'baseline-pending', pendingText)
      expect(violations(idle, idleText)).toEqual([])
      expect(violations(pending, pendingText)).toEqual([])
    } finally {
      await page.evaluate(() => window.importFeedbackGate.release())
      await expect.poll(() => page.evaluate(() => window.importFeedbackGate.settled)).toBe(true)
      await restoreGate(page, info)
    }
  })
}
