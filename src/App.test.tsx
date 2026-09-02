// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

function completeNonCollectionFacts(container: HTMLElement) {
  const stepButtons = container.querySelectorAll<HTMLButtonElement>('.rail li button')

  fireEvent.click(stepButtons[0])
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: '예시 서비스' } })
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceUrl"]')!, { target: { value: 'https://example.test' } })

  fireEvent.click(stepButtons[3])
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="retentionPeriod"]')!, { target: { value: '회원 탈퇴 시까지' } })

  fireEvent.click(stepButtons[4])
  fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="thirdPartyStatus"]')!, { target: { value: 'no' } })

  fireEvent.click(stepButtons[5])
  fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="internationalStatus"]')!, { target: { value: 'no' } })

  fireEvent.click(stepButtons[6])
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="privacyOfficerName"]')!, { target: { value: '개인정보보호 담당' } })
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="privacyOfficerEmail"]')!, { target: { value: 'privacy@example.test' } })
}

describe('policy editing workflow', () => {
  it('일곱 단계의 입력 화면을 전환한다', () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll<HTMLButtonElement>('.rail li button')
    const headings = ['1. 서비스 정보', '2. 수집 항목', '3. 처리 목적', '4. 보유 기간', '5. 제3자 제공', '6. 국외 이전', '7. 개인정보 보호 담당자']
    for (const [index, heading] of headings.entries()) {
      fireEvent.click(buttons[index])
      expect(container.querySelector('.form-panel h1')?.textContent).toBe(heading)
    }
  })

  it('새 작업공간은 운영 사실을 임의 선택하지 않고 일곱 단계 미확인 사실을 공개 준비 차단에 포함한다', () => {
    const { container } = render(<App />)
    const selected = Array.from(container.querySelectorAll<HTMLInputElement>('.check-label input')).filter((input) => input.checked)
    expect(selected).toHaveLength(0)
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('8건')
    expect(container.querySelector<HTMLButtonElement>('.publish')?.disabled).toBe(true)
    expect(container.querySelector('.document-warning')?.textContent).toContain('수집 항목')
  })

  it('서비스 URL을 입력하면 검토본의 적용 서비스 정보에 반영한다', () => {
    const { container } = render(<App />)
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceUrl"]')!, { target: { value: 'https://privacy.example.test' } })
    expect(container.querySelector('.paper')?.textContent).toContain('https://privacy.example.test')
  })

  it('아직 제공하지 않는 내보내기와 생성 기능을 클릭 가능한 동작처럼 노출하지 않는다', () => {
    const { container } = render(<App />)
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    const exportButton = buttons.find((button) => button.textContent?.includes('JSON 내보내기'))
    expect(exportButton?.disabled).toBe(true)
    expect(exportButton?.textContent).toContain('준비 중')
    expect(buttons.find((button) => button.textContent?.includes('개인정보처리방침'))).toBeUndefined()
    expect(container.querySelector('.document-name')?.tagName).toBe('SPAN')
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('.preview button')).some((button) => button.textContent?.includes('검토본 생성'))).toBe(false)
    expect(container.querySelector('.preview')?.textContent).toContain('입력 내용은 검토본에 즉시 반영됩니다')
  })

  it('수집 단계에서는 선택 항목의 수집 경로와 수집 구분을 명시적으로 확인하고 처리 목적은 다음 단계에서 편집한다', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')).toHaveLength(0)

    const phone = container.querySelectorAll<HTMLInputElement>('.check-label input')[2]
    fireEvent.click(phone)
    const phoneItem = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    expect(phoneItem.querySelector<HTMLSelectElement>('select')?.value).toBe('')
    expect(container.querySelectorAll<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')).toHaveLength(1)

    fireEvent.change(phoneItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    expect(phoneItem.querySelector<HTMLSelectElement>('select')?.value).toBe('필수')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    expect(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')).not.toBeNull()
  })

  it('수집 항목을 해제하면 이전 처리 목적, 수집 경로, 수집 구분을 폐기해 재활성화 시 재검토한다', () => {
    const { container } = render(<App />)
    const phoneCheckbox = () => container.querySelectorAll<HTMLInputElement>('.check-label input')[2]

    fireEvent.click(phoneCheckbox())
    const phoneItem = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    fireEvent.change(phoneItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    fireEvent.change(phoneItem.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: 'SMS 인증 화면' } })

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')!, { target: { value: '본인 확인 및 알림 발송' } })
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('7건')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[1])
    fireEvent.click(phoneCheckbox())
    fireEvent.click(phoneCheckbox())

    const reenabledPhone = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    expect(reenabledPhone.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')?.value).toBe('')
    expect(reenabledPhone.querySelector<HTMLSelectElement>('select')?.value).toBe('')
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('10건')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    expect(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')?.value).toBe('')
  })

  it('공백뿐인 처리 목적은 미리보기에서도 미입력으로 표시한다', () => {
    const { container } = render(<App />)
    const nameCheckbox = container.querySelectorAll<HTMLInputElement>('.check-label input')[0]
    fireEvent.click(nameCheckbox)
    const nameItem = container.querySelectorAll<HTMLElement>('.item-list .item')[0]
    fireEvent.change(nameItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    fireEvent.change(nameItem.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: '회원가입 화면' } })
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])

    const purpose = container.querySelector<HTMLInputElement>('input[name="purpose-name"]')!
    fireEvent.change(purpose, { target: { value: '   ' } })

    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('8건')
    const nameRow = Array.from(container.querySelectorAll<HTMLTableRowElement>('.paper tbody tr')).find((row) => row.cells[0]?.textContent === '이름')!
    expect(nameRow.cells[1]?.textContent).toBe('처리 목적 입력 필요')
    expect(nameRow.cells[1]?.classList.contains('missing')).toBe(true)
    expect(nameRow.cells[2]?.textContent).toBe('확인 필요')
  })

  it('미리보기 처리 목적 경고에서 처리 목적 단계로 이동한다', () => {
    const { container } = render(<App />)
    const phone = container.querySelectorAll<HTMLInputElement>('.check-label input')[2]
    fireEvent.click(phone)
    const warningButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.document-warning button')).find((button) => button.textContent?.includes('처리 목적'))!
    fireEvent.click(warningButton)
    expect(container.querySelector('.form-panel h1')?.textContent).toBe('3. 처리 목적')
  })

  it('수집 여부 미확인 경고에서 수집 항목 단계로 이동한다', () => {
    const { container } = render(<App />)
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    const warningButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.document-warning button')).find((button) => button.textContent?.includes('수집 항목'))!
    fireEvent.click(warningButton)
    expect(container.querySelector('.form-panel h1')?.textContent).toBe('2. 수집 항목')
  })

  it('수집 구분 미확인 경고에서 수집 항목 단계로 이동한다', () => {
    const { container } = render(<App />)
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('.check-label input')[2])
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    const warningButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.document-warning button')).find((button) => button.textContent?.includes('수집 구분'))!
    fireEvent.click(warningButton)
    expect(container.querySelector('.form-panel h1')?.textContent).toBe('2. 수집 항목')
  })

  it('수집 경로 미확인 경고에서 수집 항목 단계로 이동한다', () => {
    const { container } = render(<App />)
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('.check-label input')[2])
    const phoneItem = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    fireEvent.change(phoneItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')!, { target: { value: '본인 확인' } })
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    const warningButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.document-warning button')).find((button) => button.textContent?.includes('수집 경로'))!
    fireEvent.click(warningButton)
    expect(container.querySelector('.form-panel h1')?.textContent).toBe('2. 수집 항목')
  })

  it('제3자 제공과 국외 이전은 확인 전 상태를 별도로 표현하고 없음 확인 시 종속 사실을 요구하지 않는다', () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll<HTMLButtonElement>('.rail li button')

    fireEvent.click(buttons[4])
    const thirdParty = container.querySelector<HTMLSelectElement>('select[name="thirdPartyStatus"]')!
    expect(thirdParty.value).toBe('')
    expect(container.querySelector<HTMLInputElement>('input[name="thirdPartyRecipient"]')).toBeNull()
    fireEvent.change(thirdParty, { target: { value: 'no' } })
    expect(container.querySelector<HTMLInputElement>('input[name="thirdPartyRecipient"]')).toBeNull()

    fireEvent.click(buttons[5])
    const international = container.querySelector<HTMLSelectElement>('select[name="internationalStatus"]')!
    expect(international.value).toBe('')
    fireEvent.change(international, { target: { value: 'no' } })
    expect(container.querySelector<HTMLInputElement>('input[name="internationalCountry"]')).toBeNull()
  })

  it('제공 있음에서 없음으로 바꾸면 이전 수령자 사실을 폐기해 재활성화 시 재검토한다', () => {
    const { container } = render(<App />)
    const buttons = container.querySelectorAll<HTMLButtonElement>('.rail li button')
    fireEvent.click(buttons[4])
    const status = container.querySelector<HTMLSelectElement>('select[name="thirdPartyStatus"]')!
    fireEvent.change(status, { target: { value: 'yes' } })
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="thirdPartyRecipient"]')!, { target: { value: '외부 처리자' } })
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="thirdPartyPurpose"]')!, { target: { value: '업무 처리' } })
    fireEvent.change(status, { target: { value: 'no' } })
    fireEvent.change(status, { target: { value: 'yes' } })
    expect(container.querySelector<HTMLInputElement>('input[name="thirdPartyRecipient"]')?.value).toBe('')
    expect(container.querySelector<HTMLInputElement>('input[name="thirdPartyPurpose"]')?.value).toBe('')
  })

  it('모든 제품 정의 필수 사실을 확인한 뒤에만 공개 준비 확인을 허용한다', () => {
    const { container } = render(<App />)
    const phone = container.querySelectorAll<HTMLInputElement>('.check-label input')[2]
    fireEvent.click(phone)
    const phoneItem = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    fireEvent.change(phoneItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    fireEvent.change(phoneItem.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: '회원가입 화면' } })
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')!, { target: { value: '본인 확인 및 알림 발송' } })

    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('7건')
    expect(container.querySelector<HTMLButtonElement>('.publish')?.disabled).toBe(true)

    completeNonCollectionFacts(container)

    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('0건')
    const publish = container.querySelector<HTMLButtonElement>('.publish')!
    expect(publish.disabled).toBe(false)
    expect(publish.textContent).toContain('공개 준비 확인')
    fireEvent.click(publish)
    const message = container.querySelector('output')?.textContent ?? ''
    expect(message).toContain('책임자와 검토')
    expect(message).not.toContain('백엔드')
    expect(message).not.toContain('저장소')
  })
})