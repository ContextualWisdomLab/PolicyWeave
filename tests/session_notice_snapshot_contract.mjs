import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { chromium, expect } = require('@playwright/test')
const sourceUrl = new URL('./e2e/session-notice.spec.ts', import.meta.url)
const source = await readFile(sourceUrl, 'utf8')
const ast = ts.createSourceFile(sourceUrl.pathname, source, ts.ScriptTarget.Latest, true)
// Execute only the real helper declarations, never register the product suite.
const declarations = ['noticeSnapshot', 'noticeExpected', 'notice'].map((name) => {
  const matches = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(matches.length, 1, `actual helper declaration ${name}`)
  return matches[0].getText(ast)
}).join('\n')
const noticeText = source.match(/const noticeText = '([^']+)'/)[1]
const compiled = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true })
assert.equal(compiled.diagnostics.length, 0)
const helper = new Function('expect', 'noticeText', `${compiled.outputText}; return {noticeSnapshot, noticeExpected, notice}`)(expect, noticeText)
const coreUrl = new URL('../node_modules/playwright-core/lib/coreBundle.js', import.meta.url)
const core = await readFile(coreUrl, 'utf8')
assert.equal(require('playwright-core/package.json').version, '1.63.0')
assert.equal(createHash('sha256').update(core).digest('hex'), '549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171')
// Primary source oracle: extract installed generated elementText, not a copy.
const bundleAst = ts.createSourceFile('coreBundle.js', core, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
let injected
function findInjected(node) {
  if (ts.isBinaryExpression(node) && node.left.getText(bundleAst) === 'source4' && ts.isStringLiteral(node.right)) injected = node.right.text
  ts.forEachChild(node, findInjected)
}
findInjected(bundleAst)
assert.ok(injected)
const injectedAst = ts.createSourceFile('injected.js', injected, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const textFunctions = ['normalizeWhiteSpace', 'shouldSkipForTextMatching', 'elementText'].map((name) => {
  const matches = injectedAst.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(matches.length, 1)
  return matches[0].getText(injectedAst)
}).join('\n')
const nativeText = new Function(`return function(root) { let normalizedWhitespaceCache; ${textFunctions}; return elementText(new Map(), root) }`)()
const html = (mobile = false) => `<style>${mobile ? '.topbar .version{display:none}' : ''}</style><header class="topbar"><span class="version">앱 버전 0.1.0</span></header><main class="form-panel"><div class="section-head"><h1>1. Synthetic heading</h1></div><p class="session-notice">${noticeText}</p><p class="notice">Synthetic review notice</p><input><select></select><textarea></textarea></main><aside class="preview"><div class="meta"><span>앱 버전 0.1.0</span></div></aside>`

// Original semantic DOM queries intentionally do NOT cross shadow roots.
async function originalRecord(page, mobile) {
  const notices = page.locator('.session-notice')
  const topbars = page.locator('.topbar')
  const top = page.locator('.topbar .version')
  const preview = page.locator('.preview .meta span').filter({ hasText: '앱 버전' })
  const texts = async (locator) => Promise.all((await locator.all()).map((item) => item.evaluate(nativeText)))
  const noticeCount = await notices.count()
  const first = notices.first()
  const semantics = noticeCount ? await first.evaluate((element) => ({
    tag: element.tagName,
    liveAncestor: !!element.closest('[aria-live], [role="alert"], [role="status"], [role="log"]'),
    afterHeading: !!document.querySelector('.section-head') && !!(document.querySelector('.section-head').compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
    beforeControls: [...document.querySelectorAll('.form-panel input, .form-panel select, .form-panel textarea')].every((control) => !!(element.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING)),
    nextNotice: element.nextElementSibling?.classList.contains('notice'),
  })) : null
  const topTexts = await texts(top)
  const previewTexts = await texts(preview)
  return {
    noticeCount, noticeText: noticeCount ? (await first.evaluate(nativeText)).normalized : null,
    noticeVisible: noticeCount ? await first.isVisible() : false, semantics,
    topbarCount: await topbars.count(), topbarHasTemporarySave: (await texts(topbars)).some((text) => /임시\s*저장/.test(text.full)),
    topVersionCount: topTexts.length, topVersionTexts: topTexts.map((text) => text.normalized),
    topVersionVisibility: await Promise.all((await top.all()).map((item) => item.isVisible())),
    previewVersionCount: previewTexts.length, previewVersionTexts: previewTexts.map((text) => text.normalized),
    previewVersionVisibility: await Promise.all((await preview.all()).map((item) => item.isVisible())), mobile,
  }
}

const negative = [
  ['notice-missing', () => document.querySelector('.session-notice').remove()],
  ['notice-duplicate', () => document.querySelector('.session-notice').after(document.querySelector('.session-notice').cloneNode(true))],
  ['notice-text', () => { document.querySelector('.session-notice').textContent = 'Wrong' }],
  ['notice-hidden', () => { document.querySelector('.session-notice').style.display = 'none' }],
  ['notice-not-P', () => { const e = document.querySelector('.session-notice'); const n = document.createElement('div'); n.className = e.className; n.textContent = e.textContent; e.replaceWith(n) }],
  ...['aria-live', 'alert', 'status', 'log'].map((role) => [`live-${role}`, ({ role }) => document.querySelector('.form-panel').setAttribute(role === 'aria-live' ? 'aria-live' : 'role', role === 'aria-live' ? 'off' : role), { role }]),
  ['heading-missing', () => document.querySelector('.section-head').remove()],
  ['heading-after', () => document.querySelector('.session-notice').after(document.querySelector('.section-head'))],
  ...['input', 'select', 'textarea'].map((tag) => [`${tag}-before`, ({ tag }) => document.querySelector('.section-head').after(document.querySelector(tag)), { tag }]),
  ['next-notice', () => { document.querySelector('.notice').className = 'wrong' }],
  ['topbar-temporary-save', () => document.querySelector('.topbar').append('임시\n 저장')],
  ['topbar-missing', () => document.querySelector('.topbar').remove()],
  ['top-version-missing', () => document.querySelector('.topbar .version').remove()],
  ['top-version-duplicate', () => document.querySelector('.topbar .version').after(document.querySelector('.topbar .version').cloneNode(true))],
  ['top-version-text', () => { document.querySelector('.topbar .version').textContent = '앱 버전 0.2.0' }],
  ['top-version-desktop-hidden', () => { document.querySelector('.topbar .version').style.display = 'none' }],
  ['preview-version-missing', () => document.querySelector('.preview .meta span').remove()],
  ['preview-version-duplicate', () => document.querySelector('.preview .meta span').after(document.querySelector('.preview .meta span').cloneNode(true))],
  ['preview-version-text', () => { document.querySelector('.preview .meta span').textContent = '앱 버전 0.2.0' }],
  ['preview-version-hidden', () => { document.querySelector('.preview .meta span').style.display = 'none' }],
  ...['button', 'submit', 'reset'].map((type) => [`temporary-save-input-${type}`, ({ type }) => { const e = document.createElement('input'); e.type = type; e.value = '임시저장'; document.querySelector('.topbar').append(e) }, { type }]),
  ...['notice', 'top-version', 'preview-version'].map((slot) => [`wrong-input-value-${slot}`, ({ slot }) => { const e = document.querySelector(slot === 'notice' ? '.session-notice' : slot === 'top-version' ? '.topbar .version' : '.preview .meta span'); const input = document.createElement('input'); input.type = 'button'; input.value = 'Wrong'; e.append(input) }, { slot }]),
  ...['notice', 'top-version', 'preview-version', 'topbar'].map((slot) => [`wrong-shadow-text-${slot}`, ({ slot }) => { const e = document.querySelector(slot === 'notice' ? '.session-notice' : slot === 'top-version' ? '.topbar .version' : slot === 'topbar' ? '.topbar' : '.preview .meta span'); const host = document.createElement('div'); e.append(host); host.attachShadow({ mode: 'open' }).textContent = slot === 'topbar' ? '임시저장' : 'Wrong' }, { slot }]),
  ...['notice', 'topbar', 'top-version', 'preview-version'].map((slot) => [`shadow-duplicate-${slot}`, ({ slot }) => { const selector = slot === 'notice' ? '.session-notice' : slot === 'topbar' ? '.topbar' : slot === 'top-version' ? '.topbar .version' : '.preview .meta span'; const host = document.createElement('div'); const clone = document.querySelector(selector).cloneNode(true); (slot === 'top-version' ? document.querySelector('.topbar') : slot === 'preview-version' ? document.querySelector('.preview .meta') : document.body).append(host); host.attachShadow({ mode: 'open' }).append(clone) }, { slot }]),
]
const visibility = [
  ['normal', '<div id="probe">text</div>'],
  ['opacity-zero', '<div id="probe" style="opacity:0">text</div>'],
  ['offscreen', '<div id="probe" style="position:absolute;left:-10000px">text</div>'],
  ['display-none', '<div id="probe" style="display:none">text</div>'],
  ['hidden', '<div id="probe" style="visibility:hidden">text</div>'],
  ['collapse', '<div id="probe" style="visibility:collapse">text</div>'],
  ['zero-box', '<div id="probe" style="width:0;height:0"></div>'],
  ['closed-details', '<details><summary>Summary</summary><div id="probe">text</div></details>'],
  ['closed-summary', '<details><summary id="probe">Summary</summary>text</details>'],
  ['open-details', '<details open><summary>Summary</summary><div id="probe">text</div></details>'],
  ['content-hidden-self', '<div id="probe" style="content-visibility:hidden">text</div>'],
  ['content-hidden-ancestor', '<div style="content-visibility:hidden"><div id="probe">text</div></div>'],
  ['contents-visible-element', '<div id="probe" style="display:contents"><span>text</span></div>'],
  ['contents-text-range', '<div id="probe" style="display:contents">text</div>'],
  ['contents-recursive', '<div id="probe" style="display:contents"><div style="display:contents"><span>text</span></div></div>'],
  ['contents-empty', '<div id="probe" style="display:contents"></div>'],
  ['contents-hidden-child', '<div id="probe" style="display:contents"><span style="display:none">text</span></div>'],
  ['contents-hidden-text', '<div id="probe" style="display:contents;visibility:hidden">text</div>'],
  ['contents-hidden-element', '<div id="probe" style="display:contents;visibility:hidden"><span>text</span></div>'],
  ['contents-collapsed-text', '<div id="probe" style="display:contents;visibility:collapse">text</div>'],
  ['contents-details', '<details><summary>Summary</summary><div id="probe" style="display:contents">text</div></details>'],
  ['content-auto-offscreen', '<div style="content-visibility:auto;position:absolute;top:100000px"><div id="probe">text</div></div>'],
]

test('real session notice snapshot contract against installed Chromium/Playwright', async (t) => {
  console.log(JSON.stringify({ source: sourceUrl.pathname, sha256: createHash('sha256').update(source).digest('hex'), argv: process.argv }))
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } })
  // No HTTP fixture server or external requests are needed or permitted.
  await context.route('**/*', (route) => route.abort())
  const page = await context.newPage()
  async function check(name, mutation, argument, valid, mobile = false) {
    await t.test(name, async () => {
      await page.setContent(html(mobile))
      if (mutation) await page.evaluate(mutation, argument)
      const original = await originalRecord(page, mobile)
      const actual = await page.evaluate(helper.noticeSnapshot, mobile)
      const expected = helper.noticeExpected(noticeText, mobile)
      if (valid) assert.deepEqual(original, expected, 'original positive')
      else assert.notDeepEqual(original, expected, 'original negative')
      if (name === 'temporary-save-input-button') await assert.rejects(expect(page.locator('.topbar')).not.toContainText(/임시\s*저장/))
      if (name === 'shadow-duplicate-notice') await assert.rejects(expect(page.locator('.session-notice')).toHaveCount(1))
      console.log(JSON.stringify({ name, originalAdmits: JSON.stringify(original) === JSON.stringify(expected), snapshotAdmits: JSON.stringify(actual) === JSON.stringify(expected) }))
      assert.deepEqual(actual, original, 'real helper must equal original locator/text/DOM semantics')
      if (valid) {
        let evaluates = 0
        const counted = new Proxy(page, { get(target, key) { const value = target[key]; return key === 'evaluate' ? (...args) => { evaluates++; return value.apply(target, args) } : typeof value === 'function' ? value.bind(target) : value } })
        await helper.notice(counted)
        assert.equal(evaluates, 1, 'valid record uses one evaluate')
      } else assert.notDeepEqual(actual, expected, 'malformed snapshot must not admit')
    })
  }
  try {
    for (const width of [1000, 720, 390]) { await page.setViewportSize({ width, height: 700 }); await check(`valid-${width}`, null, null, true, width <= 720) }
    await page.setViewportSize({ width: 1000, height: 700 })
    for (const [name, mutation, argument] of negative) await check(name, mutation, argument, false)
    await check('normalized-text', () => { const e = document.querySelector('.session-notice'); e.textContent = `  ${e.textContent.replaceAll(' ', '\n ')}\u200b\u00ad  ` }, null, true)
    await check('script-style-noscript-excluded', () => { for (const selector of ['.session-notice', '.topbar', '.topbar .version', '.preview .meta span']) for (const tag of ['script', 'style', 'noscript']) { const e = document.createElement(tag); e.textContent = tag === 'script' ? '/* 임시저장 Wrong */' : '임시저장 Wrong'; document.querySelector(selector).append(e) } }, null, true)
    for (const slot of ['notice', 'top-version', 'preview-version']) for (const kind of ['input', 'shadow']) await check(`valid-${kind}-text-${slot}`, ({ slot, kind }) => { const e = document.querySelector(slot === 'notice' ? '.session-notice' : slot === 'top-version' ? '.topbar .version' : '.preview .meta span'); const text = e.textContent; e.textContent = ''; const child = document.createElement(kind === 'input' ? 'input' : 'div'); e.append(child); if (kind === 'input') { child.type = 'button'; child.value = text } else child.attachShadow({ mode: 'open' }).textContent = text }, { slot, kind }, true)
    await check('canonical-nested-light-shadow-versions', () => { for (const selector of ['.topbar .version', '.preview .meta span']) { const e = document.querySelector(selector); const parent = e.parentElement; const host = document.createElement('div'); parent.append(host); const root = host.attachShadow({ mode: 'open' }); const inner = document.createElement('div'); root.append(inner); inner.attachShadow({ mode: 'open' }).append(e) } }, null, true)
    // closest/order/control queries retain their native DOM boundary, including
    // disconnected compareDocumentPosition bits; no invented composed order.
    await check('shadow-host-live-ancestor-does-not-change-light-notice', () => { const host = document.createElement('div'); host.setAttribute('role', 'alert'); document.body.append(host); host.attachShadow({ mode: 'open' }).innerHTML = '<input><div class="section-head">Shadow heading</div>'; document.querySelector('.form-panel').append(host) }, null, true)
    await check('shadow-notice-host-live-ancestor-native-semantics', () => { const notice = document.querySelector('.session-notice'); const next = document.querySelector('.notice'); const host = document.createElement('div'); host.setAttribute('role', 'alert'); notice.before(host); const root = host.attachShadow({ mode: 'open' }); root.append(notice, next) }, null, true)
    await check('shadow-controls-do-not-enter-document-survey', () => { const host = document.createElement('div'); document.querySelector('.section-head').after(host); host.attachShadow({ mode: 'open' }).innerHTML = '<input><select></select><textarea></textarea>' }, null, true)
    await t.test('mobile-visible-version-rejected-by-real-5s-poll', async () => {
      await page.setViewportSize({ width: 390, height: 700 }); await page.setContent(html(false))
      assert.notDeepEqual(await page.evaluate(helper.noticeSnapshot, true), helper.noticeExpected(noticeText, true))
      await assert.rejects(helper.notice(page), /Expected|expect/)
    })
    assert.equal(visibility.length, 22)
    for (const [name, markup] of visibility) await t.test(`visibility-${name}`, async () => {
      await page.setContent(markup.replace('id="probe"', 'id="probe" class="session-notice"'))
      assert.equal((await page.evaluate(helper.noticeSnapshot, false)).noticeVisible, await page.locator('#probe').isVisible())
    })
  } finally {
    await context.close()
    await browser.close()
    assert.equal(browser.isConnected(), false)
    console.log('OWNED_CHROMIUM_CLOSED')
  }
})
