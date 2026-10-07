import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/** Reads an actual browser download without substituting a fixture response. */
async function downloadSummary(page: import('@playwright/test').Page, activate: () => Promise<void>) {
  const pending = page.waitForEvent('download')
  await activate()
  const download = await pending
  expect(download.suggestedFilename()).toBe('policyweave-review.txt')
  const path = await download.path()
  expect(path).not.toBeNull()
  return readFile(path!, 'utf8')
}

test('actual TXT summary mouse, keyboard or touch download preserves current work and stable bytes', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: '서비스 이름', exact: true }).fill('Review Fixture')
  const button = page.getByRole('button', { name: '검토 요약 다운로드' })
  const first = await downloadSummary(page, () => testInfo.project.name.startsWith('mobile') ? button.tap() : button.click())
  expect(first).toContain('필수 확인: 7건')
  expect(first).toContain('Review Fixture')
  expect(first).toContain('공개본 아님')
  await button.focus()
  const second = await downloadSummary(page, () => button.press('Enter'))
  expect(second).toBe(first)
  await expect(page.getByRole('textbox', { name: '서비스 이름', exact: true })).toHaveValue('Review Fixture')
  await page.getByRole('textbox', { name: '서비스 URL', exact: true }).fill('https://example.test/?token=DO-NOT-EXPORT')
  const unsafe = await downloadSummary(page, () => button.click())
  expect(unsafe).toContain('필수 항목: "service_url" | 1단계 "서비스 정보" | "서비스 URL"')
  expect(unsafe).not.toContain('service_url_format')
  expect(unsafe).not.toContain('단계 미상')
  expect(unsafe).not.toContain('DO-NOT-EXPORT')
  await expect(page.getByRole('textbox', { name: '서비스 URL', exact: true })).toHaveValue('https://example.test/?token=DO-NOT-EXPORT')
  await expect(page.locator('.document-warning').filter({ hasText: '서비스 URL 형식 확인이 필요합니다.' })).toBeVisible()
  await page.getByRole('textbox', { name: '서비스 이름', exact: true }).fill('Changed Fixture')
  const changed = await downloadSummary(page, () => button.click())
  expect(changed).toContain('Changed Fixture')
  expect(changed).not.toBe(first)
  const bounds = await button.boundingBox()
  expect(bounds?.height).toBeGreaterThanOrEqual(48)
  expect(bounds?.width).toBeGreaterThanOrEqual(48)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('review-summary.png'), fullPage: true })
})
