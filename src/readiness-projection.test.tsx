// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

const CONFIRMED = '필수 확인이 완료되었습니다'

afterEach(() => {
  cleanup()
})

function railButtons(container: HTMLElement) {
  return container.querySelectorAll<HTMLButtonElement>('.rail li button')
}

function nameItem(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('.item-list .item')[0]
}

function nameRowCells(container: HTMLElement) {
  const row = Array.from(container.querySelectorAll<HTMLTableRowElement>('.paper tbody tr')).find((candidate) => candidate.cells[0]?.textContent === '이름')
  return row ? Array.from(row.cells).map((cell) => cell.textContent) : null
}

/** Enables the name item and sets only the supplied per-item facts through the real controls. */
function authorNameItem(container: HTMLElement, { mode, path, purpose }: { mode?: string; path?: string; purpose?: string }) {
  fireEvent.click(railButtons(container)[1])
  fireEvent.click(container.querySelectorAll<HTMLInputElement>('.check-label input')[0])
  if (mode !== undefined) fireEvent.change(nameItem(container).querySelector<HTMLSelectElement>('select')!, { target: { value: mode } })
  if (path !== undefined) fireEvent.change(nameItem(container).querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: path } })
  if (purpose !== undefined) {
    fireEvent.click(railButtons(container)[2])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-name"]')!, { target: { value: purpose } })
  }
}

function completeNonCollectionFacts(container: HTMLElement) {
  const stepButtons = railButtons(container)
  fireEvent.click(stepButtons[0])
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: '예시 서비스' } })
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceUrl"]')!, { target: { value: 'https://example.test' } })
  fireEvent.click(stepButtons[3])
  fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="retentionStatus"]')!, { target: { value: 'applies' } })
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="retentionPeriod"]')!, { target: { value: '회원 탈퇴 시까지' } })
  fireEvent.click(stepButtons[4])
  fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="thirdPartyStatus"]')!, { target: { value: 'no' } })
  fireEvent.click(stepButtons[5])
  fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="internationalStatus"]')!, { target: { value: 'no' } })
  fireEvent.click(stepButtons[6])
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="privacyOfficerName"]')!, { target: { value: '개인정보보호 담당' } })
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="privacyOfficerEmail"]')!, { target: { value: 'privacy@example.test' } })
}

function renderReadyWorkspace() {
  const rendered = render(<App />)
  authorNameItem(rendered.container, { mode: '필수', path: '회원가입 화면', purpose: '회원 식별' })
  completeNonCollectionFacts(rendered.container)
  expect(rendered.container.querySelector('.review-stat.blocking b')?.textContent).toBe('0건')
  return rendered
}

function confirmReadiness(container: HTMLElement) {
  fireEvent.click(container.querySelector<HTMLButtonElement>('.publish')!)
  expect(container.querySelector('.review-bar output')?.textContent).toContain(CONFIRMED)
}

function footerText(container: HTMLElement) {
  return container.querySelector('.review-bar')?.textContent ?? ''
}

describe('preview item review state follows the per-item readiness contract', () => {
  it.each([
    ['purpose only', { purpose: '회원 식별' }],
    ['collection mode unconfirmed', { path: '회원가입 화면', purpose: '회원 식별' }],
    ['collection path whitespace only', { mode: '필수', path: '   ', purpose: '회원 식별' }],
    ['purpose missing', { mode: '필수', path: '회원가입 화면' }],
  ])('does not mark the item 입력됨 when %s', (_label, facts) => {
    const { container } = render(<App />)
    authorNameItem(container, facts)
    const cells = nameRowCells(container)
    expect(cells?.[2]).toBe('확인 필요')
    expect(Array.from(container.querySelectorAll('.document-warning')).some((warning) => warning.textContent?.includes('이름의'))).toBe(true)
  })

  it('marks 입력됨 only when mode, path and purpose are all established, matching the warnings', () => {
    const { container } = render(<App />)
    authorNameItem(container, { mode: '선택', path: '회원가입 화면', purpose: '회원 식별' })
    expect(nameRowCells(container)).toEqual(['이름', '회원 식별', '입력됨'])
    expect(Array.from(container.querySelectorAll('.document-warning')).some((warning) => warning.textContent?.includes('이름의'))).toBe(false)
  })

  it('keeps the purpose cell projection unchanged when purpose is present but other item facts are open', () => {
    const { container } = render(<App />)
    authorNameItem(container, { purpose: '회원 식별' })
    const row = Array.from(container.querySelectorAll<HTMLTableRowElement>('.paper tbody tr')).find((candidate) => candidate.cells[0]?.textContent === '이름')!
    expect(row.cells[1]?.textContent).toBe('회원 식별')
    expect(row.cells[1]?.classList.contains('missing')).toBe(false)
  })
})

describe('readiness confirmation is retracted when the confirmed facts change', () => {
  it('retracts the confirmation when an edit reopens a required fact', () => {
    const { container } = renderReadyWorkspace()
    confirmReadiness(container)
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="privacyOfficerEmail"]')!, { target: { value: '' } })
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('1건')
    expect(container.querySelector<HTMLButtonElement>('.publish')?.disabled).toBe(true)
    expect(footerText(container)).not.toContain(CONFIRMED)
  })

  it('retracts on a non-blocking edit and shows the confirmation again only on request', () => {
    const { container } = renderReadyWorkspace()
    confirmReadiness(container)
    fireEvent.click(railButtons(container)[0])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: '예시 서비스 2' } })
    expect(container.querySelector<HTMLButtonElement>('.publish')?.disabled).toBe(false)
    expect(container.querySelector('.review-bar output')?.textContent).toBe('')
    confirmReadiness(container)
  })

  it.each([
    ['collection purpose', (container: HTMLElement) => {
      fireEvent.click(railButtons(container)[2])
      fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-name"]')!, { target: { value: '회원 식별 및 문의 응대' } })
    }],
    ['collection path', (container: HTMLElement) => {
      fireEvent.click(railButtons(container)[1])
      fireEvent.change(nameItem(container).querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: '고객센터' } })
    }],
    ['collection mode', (container: HTMLElement) => {
      fireEvent.click(railButtons(container)[1])
      fireEvent.change(nameItem(container).querySelector<HTMLSelectElement>('select')!, { target: { value: '선택' } })
    }],
    ['item selection', (container: HTMLElement) => {
      fireEvent.click(railButtons(container)[1])
      fireEvent.click(container.querySelectorAll<HTMLInputElement>('.check-label input')[1])
    }],
  ])('retracts after a %s change', (_label, mutate) => {
    const { container } = renderReadyWorkspace()
    confirmReadiness(container)
    mutate(container)
    expect(footerText(container)).not.toContain(CONFIRMED)
  })

  it('keeps non-readiness outcome messages after later edits', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = () => 'blob:policyweave-test'
    URL.revokeObjectURL = () => undefined
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => undefined
    try {
      const { container } = renderReadyWorkspace()
      confirmReadiness(container)
      fireEvent.click(container.querySelector<HTMLButtonElement>('.review-download')!)
      const summaryMessage = container.querySelector('.review-bar output')?.textContent
      expect(summaryMessage).toContain('검토 요약 다운로드를 시작했습니다')
      fireEvent.click(railButtons(container)[0])
      fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: '예시 서비스 2' } })
      expect(container.querySelector('.review-bar output')?.textContent).toBe(summaryMessage)
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      HTMLAnchorElement.prototype.click = click
    }
  })

  it('does not show the confirmation while open blockers keep the readiness action disabled', () => {
    const { container } = render(<App />)
    expect(container.querySelector<HTMLButtonElement>('.publish')?.disabled).toBe(true)
    expect(footerText(container)).not.toContain(CONFIRMED)
  })

  it('retracts after the no-collection attestation changes', () => {
    const { container } = render(<App />)
    fireEvent.click(railButtons(container)[1])
    fireEvent.click(container.querySelector<HTMLInputElement>('input[name="noCollectionAttested"]')!)
    completeNonCollectionFacts(container)
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('0건')
    confirmReadiness(container)
    fireEvent.click(railButtons(container)[1])
    fireEvent.click(container.querySelector<HTMLInputElement>('input[name="noCollectionAttested"]')!)
    expect(footerText(container)).not.toContain(CONFIRMED)
  })
})
