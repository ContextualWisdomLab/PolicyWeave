import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const widths = [320, 390, 720, 721, 820, 1280, 1440]
const shortPurpose = '계정 확인'
const longPurpose = 'A'.repeat(320) + 'Z'
const receiptRoot = process.env.REFLOW_RECEIPTS
const phase = process.env.REFLOW_PHASE ?? 'current'

async function receipt(info: TestInfo, name: string, value: unknown) {
  const root = receiptRoot ?? info.outputPath('receipts')
  await mkdir(root, { recursive: true })
  await writeFile(join(root, `${phase}-${name}.json`), JSON.stringify(value, null, 2))
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}

async function shortFixture(page: Page) {
  await page.getByLabel('서비스 이름', { exact: true }).fill('Synthetic Review')
  await page.locator('.rail').getByRole('button', { name: /수집 항목/ }).click()
  await page.getByRole('checkbox', { name: '이름', exact: true }).check()
  await page.locator('.item').filter({ has: page.getByRole('checkbox', { name: '이름', exact: true }) }).locator('select').selectOption('필수')
  await page.getByLabel('수집 경로', { exact: true }).fill('가입 화면')
  await page.locator('.rail').getByRole('button', { name: /처리 목적/ }).click()
  await page.getByLabel('이름 처리 목적', { exact: true }).fill(shortPurpose)
}

async function admit(page: Page, purpose: string) {
  await expect(page.getByLabel('이름 처리 목적', { exact: true })).toHaveValue(purpose)
  await expect(page.locator('.paper table tbody tr')).toHaveCount(1)
  await expect(page.locator('.paper table thead th')).toHaveText(['수집 항목', '처리 목적', '검토 상태'])
  await expect(page.locator('.paper table tbody td')).toHaveText(['이름', purpose, '입력됨'])
  await settle(page)
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const paper = document.querySelector<HTMLElement>('.paper')!
    const preview = document.querySelector<HTMLElement>('.preview')!
    const box = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    const content = (element: Element) => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element)
      return { left: r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight) }
    }
    const violations: string[] = []
    const p = content(paper), v = content(preview)
    const table = paper.querySelector('table')!
    const tr = table.getBoundingClientRect(), pr = paper.getBoundingClientRect()
    if (tr.left < p.left - 1 || tr.right > p.right + 1) violations.push('table-paper-content-x')
    if (pr.left < v.left - 1 || pr.right > v.right + 1) violations.push('paper-preview-content-x')
    const text = [...paper.querySelectorAll(':scope > h2, :scope > p, th, td')].map((element, index) => {
      const local = content(element)
      const range = document.createRange(); range.selectNodeContents(element)
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
      if (!rects.length) violations.push(`text-empty-${index}`)
      for (const r of rects) {
        if (r.left < local.left - 1 || r.right > local.right + 1) violations.push(`text-local-content-x-${index}`)
        if (r.left < p.left - 1 || r.right > p.right + 1) violations.push(`text-paper-content-x-${index}`)
      }
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        const s = getComputedStyle(ancestor)
        if (s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0) violations.push(`invisible-${index}`)
        if (['hidden', 'clip'].includes(s.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) violations.push(`vertical-clip-${index}`)
        if (['hidden', 'clip'].includes(s.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1) violations.push(`horizontal-clip-${index}`)
      }
      return { text: element.textContent, box: box(element), rects: rects.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })) }
    })
    const siblings = [...paper.children].filter((e) => e.matches('h2, h3, p, table'))
    for (let i = 0; i < siblings.length; i++) for (let j = i + 1; j < siblings.length; j++) {
      const a = siblings[i].getBoundingClientRect(), b = siblings[j].getBoundingClientRect()
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) violations.push('sibling-overlap')
    }
    return { violations: [...new Set(violations)], paper: box(paper), table: box(table), preview: box(preview), paperContent: p, text, scroll: { paper: paper.scrollWidth - paper.clientWidth, preview: preview.scrollWidth - preview.clientWidth }, raw: paper.textContent }
  })
}

function assertReadingWidth(measured: Awaited<ReturnType<typeof geometry>>) {
  expect(measured.violations, 'table and exact text must fit paper reading width without horizontal panning').toEqual([])
  expect(measured.scroll.paper).toBeLessThanOrEqual(1)
  expect(measured.scroll.preview).toBeLessThanOrEqual(1)
}

async function snapshot(page: Page) {
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.preview')!.scrollTo(0, 0) })
  await settle(page)
  return page.evaluate(() => {
    const selectors = ['.topbar', '.status', '.save-state', '.document-name', '.rail', '.review-bar', '.preview-title', '.review-download', '.meta', '.paper', '.paper > h2', '.paper > p', '.paper table', '.paper th', '.paper td', '.document-warning', '.document-warning button']
    return {
      controls: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.form-panel input, .form-panel select, .form-panel textarea')].map((e) => ({ name: e.name, value: e.value, checked: e instanceof HTMLInputElement ? e.checked : null, disabled: e.disabled })),
      step: document.querySelector('h1')!.textContent, completion: document.querySelector('.progress-copy')!.textContent,
      readiness: document.querySelector('.review-bar')!.textContent, paper: document.querySelector('.paper')!.textContent,
      elements: selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((e) => {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e)
        return { selector, text: e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, whiteSpace: s.whiteSpace, wordBreak: s.wordBreak, display: s.display, visibility: s.visibility }
      })),
    }
  })
}

async function download(page: Page, info: TestInfo, kind: 'json' | 'txt', suffix: string) {
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: kind === 'json' ? /JSON 내보내기/ : '검토 요약 다운로드' }).click()
  const file = await waiting
  expect(file.suggestedFilename()).toBe(kind === 'json' ? 'policyweave-draft.json' : 'policyweave-review.txt')
  const root = receiptRoot ?? info.outputPath('receipts')
  await mkdir(root, { recursive: true })
  const path = join(root, `${phase}-${suffix}.${kind}`)
  await file.saveAs(path)
  return { path, bytes: await readFile(path, 'utf8') }
}

test('default and short paired preservation receipts', async ({ page }, info) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    for (const state of ['default', 'short']) {
      if (state === 'short') await shortFixture(page)
      const captured = await snapshot(page)
      await receipt(info, `${state}-${width}`, captured)
      if (phase === 'green' && receiptRoot) expect(captured).toEqual(JSON.parse(await readFile(join(receiptRoot, `baseline-${state}-${width}.json`), 'utf8')))
    }
  }
  await page.setViewportSize({ width: 820, height: 900 })
  for (const state of ['default', 'short', 'long']) {
    await page.goto('/')
    if (state !== 'default') await shortFixture(page)
    if (state === 'long') await page.getByLabel('이름 처리 목적', { exact: true }).fill(longPurpose)
    await page.emulateMedia({ media: 'print' })
    const captured = await snapshot(page)
    await receipt(info, `print-${state}-820`, captured)
    if (phase === 'green' && receiptRoot) expect(captured).toEqual(JSON.parse(await readFile(join(receiptRoot, `baseline-print-${state}-820.json`), 'utf8')))
    await page.emulateMedia({ media: 'screen' })
  }
  await page.goto('/')
  await shortFixture(page)
  await admit(page, shortPurpose)
  const json = await download(page, info, 'json', 'short')
  const txt = await download(page, info, 'txt', 'short')
  expect(txt.bytes).not.toContain(shortPurpose)
  await page.reload()
  await page.getByLabel('JSON 초안 가져오기').setInputFiles(json.path)
  await expect(page.locator('output')).toHaveText(/초안을 불러왔습니다/)
  const restored = await download(page, info, 'json', 'restored')
  expect(restored.bytes).toBe(json.bytes)
  if (phase === 'green' && receiptRoot) {
    expect(json.bytes).toBe(await readFile(join(receiptRoot, 'baseline-short.json'), 'utf8'))
    expect(txt.bytes).toBe(await readFile(join(receiptRoot, 'baseline-short.txt'), 'utf8'))
  }
})

test('320 ASCII purpose tracer has a short positive then exact long reading-width containment', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/')
  await shortFixture(page)
  await admit(page, shortPurpose)
  const positive = await geometry(page)
  await receipt(info, 'tracer-short', positive)
  assertReadingWidth(positive)
  await page.getByLabel('이름 처리 목적', { exact: true }).fill(longPurpose)
  await admit(page, longPurpose)
  const measured = await geometry(page)
  await receipt(info, 'tracer-long', measured)
  await page.locator('.paper table').screenshot({ path: receiptRoot ? join(receiptRoot, `${phase}-tracer-table.png`) : info.outputPath('tracer-table.png') })
  assertReadingWidth(measured)
})

async function endpoints(page: Page) {
  return page.evaluate(async () => {
    const results = []
    for (const element of document.querySelectorAll<HTMLElement>('.paper > h2, .paper > p, .paper th, .paper td')) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) if (walker.currentNode.textContent?.length) nodes.push(walker.currentNode as Text)
      for (const last of [false, true]) {
        const node = last ? nodes.at(-1)! : nodes[0]
        const offset = last ? node.length - 1 : 0
        const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1)
        let owner = element.parentElement
        while (owner && !(owner.scrollHeight > owner.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(owner).overflowY))) owner = owner.parentElement
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        const before = range.getBoundingClientRect()
        if (owner) {
          const o = owner.getBoundingClientRect()
          owner.scrollTop += before.top - o.top - owner.clientHeight / 2
          owner.scrollIntoView({ block: 'nearest' })
        } else window.scrollBy(0, before.top - innerHeight / 2)
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const r = range.getBoundingClientRect()
        let top = 0, bottom = innerHeight
        for (let ancestor: Element | null = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(ancestor).overflowY)) {
            const b = ancestor.getBoundingClientRect(); top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom)
          }
        }
        results.push({ text: node.textContent, last, owner: owner?.className ?? 'document', reached: r.height > 0 && r.bottom > top && r.top < bottom, top: r.top, bottom: r.bottom, clip: { top, bottom } })
      }
    }
    return results
  })
}

for (const cohort of [
  ...widths.map((width) => ({ width, language: 'ascii', fact: longPurpose })),
  ...[320, 820].map((width) => ({ width, language: 'korean-mixed', fact: '가나다검토'.repeat(35) + 'MixedToken'.repeat(15) + '끝Z' })),
]) {
  test(`exact long facts ${cohort.language} at ${cohort.width}`, async ({ page }, info) => {
    await page.setViewportSize({ width: cohort.width, height: 900 })
    await page.goto('/')
    await shortFixture(page)
    await page.getByLabel('이름 처리 목적', { exact: true }).fill(cohort.fact)
    await admit(page, cohort.fact)
    await page.locator('.rail').getByRole('button', { name: /보유 기간/ }).click()
    await page.getByLabel('개인정보 보유 여부').selectOption('applies')
    await page.getByLabel('대표 보유 기간 또는 종료 조건').fill(cohort.fact)
    await expect(page.getByLabel('대표 보유 기간 또는 종료 조건')).toHaveValue(cohort.fact)
    await page.locator('.rail').getByRole('button', { name: /서비스 정보/ }).click()
    if (cohort.width <= 720) await page.getByLabel('서비스 이름', { exact: true }).fill(cohort.fact)
    await page.getByLabel('서비스 URL', { exact: true }).fill('https://synthetic.example/' + 'route'.repeat(55) + 'Z')
    await settle(page)
    await expect(page.locator('.paper table tbody td')).toHaveText(['이름', cohort.fact, '입력됨'])
    const measured = await geometry(page)
    const reached = await endpoints(page)
    await receipt(info, `expanded-${cohort.language}-${cohort.width}`, { measured, reached })
    expect(measured.text.filter(({ text }) => text === cohort.fact).length).toBeGreaterThanOrEqual(2)
    assertReadingWidth(measured)
    expect(reached.every((r) => r.reached), 'first and last source characters reach effective vertical clip after actual owner scroll').toBe(true)
    if (cohort.width === 320) await page.locator('.paper table').screenshot({ path: receiptRoot ? join(receiptRoot, `${phase}-${cohort.language}-320-table.png`) : info.outputPath(`${cohort.language}-table.png`) })
  })
}

test('otherwise-valid geometry oracle sensitivity with finally cleanup', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/')
  await shortFixture(page)
  await page.getByLabel('이름 처리 목적', { exact: true }).fill(longPurpose)
  await admit(page, longPurpose)
  const positive = await geometry(page)
  assertReadingWidth(positive)
  expect((await endpoints(page)).every((r) => r.reached)).toBe(true)
  const controls = [
    { name: 'nowrap', css: '.paper td { white-space: nowrap !important; }', reason: 'table-paper-content-x' },
    { name: 'table-minwidth', css: '.paper table { min-width: 700px !important; }', reason: 'table-paper-content-x' },
    { name: 'horizontal-hidden', css: '.paper table { min-width: 700px !important; } .paper { overflow-x: hidden !important; }', reason: 'horizontal-clip-' },
    { name: 'vertical-hidden', css: '.paper { height: 80px !important; min-height: 0 !important; overflow-y: hidden !important; }', reason: 'vertical-clip-' },
    { name: 'invisible', css: '.paper td:nth-child(2) { visibility: hidden !important; }', reason: 'invisible-' },
    { name: 'opacity', css: '.paper td:nth-child(2) { opacity: 0 !important; }', reason: 'invisible-' },
    { name: 'sibling-overlap', css: '.paper > p:first-of-type { position: absolute !important; top: 0 !important; } .paper > h2 { position: absolute !important; top: 0 !important; }', reason: 'sibling-overlap' },
  ]
  const receipts = []
  for (const control of controls) {
    const style = await page.addStyleTag({ content: control.css })
    try {
      await settle(page)
      const measured = await geometry(page)
      receipts.push({ name: control.name, violations: measured.violations })
      expect(measured.violations.some((v) => v.startsWith(control.reason)), control.name).toBe(true)
    } finally {
      await style.evaluate((element) => element.parentNode!.removeChild(element))
      await settle(page)
    }
    assertReadingWidth(await geometry(page))
  }
  await receipt(info, 'sensitivity', receipts)
})
