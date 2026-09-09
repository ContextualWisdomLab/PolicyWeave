import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('renders a truthful responsive initial workspace without serious accessibility violations', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('1. 서비스 정보')
  await expect(page.getByText('0/7 완료')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('initial-workspace.png'), fullPage: true, animations: 'disabled' })

  const viewportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(viewportOverflow).toBeLessThanOrEqual(0)

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('preserves keyboard context through the explicit no-collection path', async ({ page }) => {
  await page.goto('/')

  const collectionStep = page.getByRole('button', { name: /수집 항목/ }).first()
  await collectionStep.focus()
  await page.keyboard.press('Enter')
  const collectionHeading = page.getByRole('heading', { level: 1, name: '2. 수집 항목' })
  await expect(collectionHeading).toBeFocused()
  const headingBounds = await collectionHeading.boundingBox()
  expect(headingBounds).not.toBeNull()
  expect(headingBounds!.y).toBeGreaterThanOrEqual(0)
  expect(headingBounds!.y + headingBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height)

  const noCollection = page.getByRole('checkbox', { name: '개인정보를 수집하지 않음으로 확인' })
  await noCollection.focus()
  await page.keyboard.press('Space')
  await expect(noCollection).toBeChecked()
  await expect(page.getByText('2/7 완료')).toBeVisible()

  const nextStep = page.getByRole('button', { name: '다음 단계' })
  await nextStep.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: '3. 처리 목적' })).toBeFocused()
  await expect(page.getByText('개인정보를 수집하지 않음으로 확인되었습니다.')).toBeVisible()
})

test('keeps the owning step heading visible after keyboard navigation from a review warning', async ({ page }) => {
  await page.goto('/')

  const serviceWarning = page
    .locator('.document-warning')
    .filter({ hasText: '서비스 이름 확인이 필요합니다.' })
    .getByRole('button', { name: '서비스 정보 확인', exact: true })
  await serviceWarning.scrollIntoViewIfNeeded()
  await serviceWarning.focus()
  await page.keyboard.press('Enter')

  const serviceHeading = page.getByRole('heading', { level: 1, name: '1. 서비스 정보' })
  await expect(serviceHeading).toBeFocused()
  const headingBounds = await serviceHeading.boundingBox()
  expect(headingBounds).not.toBeNull()
  expect(headingBounds!.y).toBeGreaterThanOrEqual(0)
  expect(headingBounds!.y + headingBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
})
