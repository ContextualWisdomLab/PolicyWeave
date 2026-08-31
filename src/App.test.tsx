// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

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

  it('미리보기 경고에서 처리 목적 단계로 이동한다', () => {
    const { container } = render(<App />)
    const phone = container.querySelectorAll<HTMLInputElement>('.check-label input')[2]
    fireEvent.click(phone)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.document-warning button')!)
    expect(container.querySelector('.form-panel h1')?.textContent).toBe('3. 처리 목적')
  })
})
