import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const longB = 'SyntheticMobileDocumentNameABCDEFGHIJKLMNOPQRSTUVWXYZ'
const suffix = ' 개인정보처리방침'

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}

/** Native rendered line rectangles, not only DOM text or document overflow. */
async function measure(page: Page) {
  await settle(page)
  return page.evaluate(() => {
    const failures: string[] = []
    const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height })
    const contained = (r: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => r.left >= b.left - 1 && r.right <= b.right + 1 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1
    const elements = [...document.querySelectorAll<HTMLElement>('.topbar > *')]
    const visible = elements.filter((e) => getComputedStyle(e).display !== 'none')
    for (const selector of ['.brand', '.document-name', '.status', '.file-control', 'button.outline']) {
      if (!visible.some((e) => e.matches(selector))) failures.push(`${selector}:missing-visible-sibling`)
    }
    const siblings = visible.map((e) => {
      const key = e.className || e.tagName
      const box = rect(e.getBoundingClientRect())
      const style = getComputedStyle(e)
      const lines: ReturnType<typeof rect>[] = []
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim() || node.parentElement?.closest('svg, .sr-only, script, style')) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        lines.push(...[...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map(rect))
      }
      if (!lines.length) failures.push(`${key}:empty-lines`)
      if (style.visibility !== 'visible' || Number(style.opacity) === 0 || parseFloat(style.fontSize) < 1 || style.color === 'rgba(0, 0, 0, 0)') failures.push(`${key}:invisible`)
      if (box.width <= 0 || box.height <= 0) failures.push(`${key}:empty-box`)
      if (lines.some((r) => !contained(r, box))) failures.push(`${key}:line-containment`)
      if (box.left < -1 || box.right > innerWidth + 1 || lines.some((r) => r.left < -1 || r.right > innerWidth + 1)) failures.push(`${key}:horizontal-viewport`)
      if (e.scrollWidth > e.clientWidth + 1) failures.push(`${key}:scroll-width`)
      if (e.scrollHeight > e.clientHeight + 1) failures.push(`${key}:scroll-height`)
      for (let ancestor = e.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const s = getComputedStyle(ancestor), b = rect(ancestor.getBoundingClientRect())
        if (lines.some((r) => (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX) && (r.left < b.left - 1 || r.right > b.right + 1)) || (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowY) && (r.top < b.top - 1 || r.bottom > b.bottom + 1)))) failures.push(`${key}:ancestor-clipping`)
        if (s.visibility !== 'visible' || Number(s.opacity) === 0) failures.push(`${key}:ancestor-invisible`)
      }
      return { key, box, lines, text: e.textContent, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, clientHeight: e.clientHeight, scrollHeight: e.scrollHeight,
        style: { display: style.display, whiteSpace: style.whiteSpace, overflowX: style.overflowX, overflowY: style.overflowY, fontSize: style.fontSize, visibility: style.visibility, opacity: style.opacity } }
    })
    for (let i = 0; i < siblings.length; i++) for (let j = i + 1; j < siblings.length; j++) {
      const a = siblings[i], b = siblings[j]
      if (Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left) > 1 && Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top) > 1) failures.push(`overlap:${a.key}:${b.key}`)
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) failures.push('document:horizontal-overflow')
    return { failures, siblings, viewport: innerWidth, documentWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth }
  })
}

async function receipt(info: TestInfo, name: string, data: unknown) {
  const path = info.outputPath(name)
  await writeFile(path, JSON.stringify(data, null, 2))
  await info.attach(name, { path, contentType: 'application/json' })
}

async function assertTitle(page: Page, name: string, info: TestInfo, label: string) {
  await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue(name)
  expect(await page.locator('.document-name').textContent()).toBe(`${name || '내 서비스'}${suffix}`)
  const data = await measure(page)
  await receipt(info, `${label}.json`, data)
  await page.screenshot({ path: info.outputPath(`${label}.png`), animations: 'disabled' })
  expect(data.siblings.map(({ key }) => key)).toEqual(expect.arrayContaining(['brand', 'document-name', 'status', 'outline file-control', 'outline']))
  expect(data.failures, 'rendered per-line containment and visible sibling geometry').toEqual([])
}

// The initial two cases are the unchanged RED -> GREEN tracer bullet.
for (const width of [320, 390]) {
  test(`B long title remains fully readable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
    await assertTitle(page, '', info, 'default')
    await page.getByLabel('서비스 이름', { exact: true }).fill(longB)
    await assertTitle(page, longB, info, 'long-B')
  })
}

const cases = [
  ['mixed-A', '검증용 긴 서비스 이름 abcdefghijklmnopqrstuvwxyz0123456789'],
  ['short-Korean', '검증'],
  ['long-Korean', '검증용모바일문서제목전체표시확인을위한긴한글서비스이름합성시험자료'],
] as const
for (const width of [320, 390, 720]) for (const [label, name] of cases) {
  test(`${label} title and same-input navigation at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.getByLabel('서비스 이름', { exact: true }).fill(name)
    await assertTitle(page, name, info, label)
    const survey = () => page.evaluate(() => ({
      title: document.querySelector('.document-name')?.textContent,
      input: document.querySelector<HTMLInputElement>('.form-panel input')?.value,
      completion: document.querySelector('.progress-copy')?.textContent,
      findings: [...document.querySelectorAll('.document-warning')].map((e) => e.textContent),
      output: document.querySelector('output')?.textContent,
    }))
    const before = await survey()
    await page.locator('.rail ol button').nth(1).click()
    await expect(page.locator('.form-panel h1')).toHaveText('2. 수집 항목')
    const warning = page.locator('.document-warning').filter({ hasText: '서비스 URL 확인이 필요합니다.' }).getByRole('button', { name: '서비스 정보 확인', exact: true })
    await warning.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.form-panel h1')).toBeFocused()
    await expect(page.locator('.form-panel h1')).toHaveText('1. 서비스 정보')
    const after = await survey()
    await receipt(info, 'same-input-survey.json', { before, after })
    expect(after).toEqual(before)
    await assertTitle(page, name, info, `${label}-after-navigation`)
  })
}

test('B long title wraps at the inclusive 720px boundary', async ({ page }, info) => {
  await page.setViewportSize({ width: 720, height: 844 })
  await page.goto('/')
  await page.getByLabel('서비스 이름', { exact: true }).fill(longB)
  await assertTitle(page, longB, info, 'long-B-720')
})

// Nonmobile scope preservation, with SAME inputs and a fixture-owned legacy rule.
// The independent pre-repair native survey is retained in the task scratch packet.
for (const width of [721, 820, 1280]) for (const name of ['', '검증']) {
  test(`nonmobile ${name ? 'short' : 'default'} geometry is preserved at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.getByLabel('서비스 이름', { exact: true }).fill(name)
    await settle(page)
    const snapshot = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.topbar > *')].map((e) => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e)
      return { text: e.textContent, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, style: { display: s.display, whiteSpace: s.whiteSpace, overflowX: s.overflowX, overflowY: s.overflowY, maxWidth: s.maxWidth, flexBasis: s.flexBasis, fontSize: s.fontSize, fontWeight: s.fontWeight } }
    }))
    const current = await snapshot()
    const legacy = await page.addStyleTag({ content: '@media(max-width:720px){.document-name{display:flex;flex-basis:auto;min-width:auto;max-width:190px;overflow:hidden;white-space:nowrap;overflow-wrap:normal}}' })
    try {
      await settle(page)
      const oldScopedRule = await snapshot()
      await receipt(info, 'nonmobile-preservation.json', { current, oldScopedRule })
      expect(current).toEqual(oldScopedRule)
      expect(await page.locator('.document-name').textContent()).toBe(`${name || '내 서비스'}${suffix}`)
      await expect(page.getByLabel('서비스 이름', { exact: true })).toHaveValue(name)
      await expect(page.locator('.document-name')).toHaveCSS('display', 'flex')
    } finally { await legacy.evaluate((e) => e.parentNode?.removeChild(e)) }
  })
}

test('native oracle rejects causal clipping, invisibility and overlap controls', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 844 })
  // Only this disposable test page is mutated; no production file or React state.
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}.topbar{display:flex;flex-wrap:wrap;gap:9px;padding:10px 14px;font:16px sans-serif}.document-name{display:block;flex-basis:100%;min-width:0;max-width:100%;overflow-wrap:anywhere}.file-control,button{min-height:44px}</style><header class="topbar"><a class="brand">PolicyWeave</a><span class="document-name">${longB}${suffix}</span><span class="status">작성 중</span><label class="outline file-control">JSON 가져오기</label><button class="outline">JSON 내보내기</button></header>`)
  const baseline = await measure(page)
  expect(baseline.failures).toEqual([])
  const saved = await page.locator('.topbar > *').evaluateAll((elements) => elements.map((e) => e.getAttribute('style')))
  const controls = [
    { name: 'old190hiddennowrap', selector: '.document-name', style: 'max-width:190px;overflow:hidden;white-space:nowrap', field: 'document-name:line-containment' },
    { name: 'fixedheightclip', selector: '.document-name', style: 'height:10px;overflow:hidden', field: 'document-name:scroll-height' },
    { name: 'invisible', selector: '.document-name', style: 'visibility:hidden', field: 'document-name:invisible' },
    { name: 'overlap', selector: '.status', style: 'position:absolute;left:14px;top:40px', field: 'overlap:document-name:status' },
  ]
  for (const control of controls) {
    try {
      await page.locator(control.selector).evaluate((e, style) => e.setAttribute('style', style), control.style)
      const rejected = await measure(page)
      await receipt(info, `${control.name}.json`, { control, rejected })
      expect(rejected.failures).toContain(control.field)
    } finally {
      await page.locator('.topbar > *').evaluateAll((elements, styles) => elements.forEach((e, i) => {
        if (styles[i] === null) e.removeAttribute('style')
        else e.setAttribute('style', styles[i]!)
      }), saved)
    }
    expect(await page.locator('.topbar > *').evaluateAll((elements) => elements.map((e) => e.getAttribute('style')))).toEqual(saved)
    expect(await measure(page)).toEqual(baseline)
  }
})
