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

test('invalidates stale retention evidence through responsive browser transitions', async ({ page }) => {
  await page.goto('/')

  const retentionStep = page.locator('.rail').getByRole('button', { name: /보유 기간/ })
  await retentionStep.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: '4. 보유 기간' })).toBeFocused()

  const retentionStatus = page.getByLabel('개인정보 보유 여부')
  await retentionStatus.selectOption('applies')
  const retentionPeriod = page.getByLabel('대표 보유 기간 또는 종료 조건')
  await retentionPeriod.fill('회원 탈퇴 시까지')

  const retentionRailItem = page.locator('.rail li').filter({ hasText: '보유 기간' })
  await expect(retentionRailItem).toHaveClass(/done/)
  await expect(page.locator('.paper').getByText('회원 탈퇴 시까지', { exact: true })).toBeVisible()

  await retentionStatus.selectOption('none')
  await expect(retentionPeriod).toHaveCount(0)
  await expect(retentionRailItem).toHaveClass(/done/)
  await expect(page.locator('.paper').getByText('보유하는 개인정보 없음으로 확인되었습니다.', { exact: true })).toBeVisible()

  await retentionStatus.selectOption('applies')
  const renewedRetentionPeriod = page.getByLabel('대표 보유 기간 또는 종료 조건')
  await expect(renewedRetentionPeriod).toHaveValue('')
  await expect(retentionRailItem).not.toHaveClass(/done/)
  await expect(page.locator('.paper').getByText('보유 기간을 확인해야 합니다.', { exact: true })).toBeVisible()
})

test('reflows the core authoring flow at an effective 200% browser zoom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Browser zoom reflow is measured from the desktop viewport.')

  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  await page.setViewportSize({ width: Math.floor(viewport!.width / 2), height: Math.floor(viewport!.height / 2) })
  await page.goto('/')

  const viewportOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(viewportOverflow).toBeLessThanOrEqual(0)

  await expect(page.getByRole('heading', { level: 1, name: '1. 서비스 정보' })).toBeVisible()
  const nextStep = page.getByRole('button', { name: '다음 단계' })
  await nextStep.scrollIntoViewIfNeeded()
  await nextStep.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: '2. 수집 항목' })).toBeFocused()
})
