// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('authoring progress truthfulness', () => {
  it('does not claim temporary storage for a memory-only workspace', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.topbar')?.textContent).not.toContain('임시저장')
    expect(container.querySelector('.version')?.textContent).toBe('앱 버전 0.1.0')
    expect(container.querySelector('.meta')?.textContent).toContain('앱 버전 0.1.0')
    expect(container.querySelector('.save-state')?.textContent).toContain('브라우저 작업 중')
  })

  it('explains the memory-only boundary before inputs on every authoring step', () => {
    const { container } = render(<App />)
    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[index])
      const notice = container.querySelector('.form-panel .session-notice')
      expect(notice, `session boundary notice missing on step ${index + 1}`).not.toBeNull()
      expect(notice?.textContent).toContain('자동 저장되지 않습니다')
      expect(notice?.textContent).toContain('새로고침')
      expect(notice?.textContent).toContain('JSON 내보내기')
      expect(container.querySelectorAll('.session-notice')).toHaveLength(1)
      expect(notice?.hasAttribute('aria-live')).toBe(false)
      expect(notice?.getAttribute('tabindex')).toBeNull()
      expect(notice?.getAttribute('role')).not.toBe('alert')
      const firstControl = container.querySelector('.form-panel input, .form-panel select')
      if (firstControl) expect(notice!.compareDocumentPosition(firstControl) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
      expect(container.querySelector('.progress-copy span')?.textContent).toBe('0/7 완료')
    }
  })

  it('starts with the first unresolved authoring responsibility and zero completed responsibilities', () => {
    const { container } = render(<App />)

    expect(container.querySelector('.form-panel h1')?.textContent).toBe('1. 서비스 정보')
    expect(container.querySelector('.progress-copy span')?.textContent).toBe('0/7 완료')
    expect(container.querySelectorAll('.rail li.done')).toHaveLength(0)
    expect(container.querySelector('.rail li.active small')?.textContent).toBe('확인 및 입력')
  })

  it('does not increase completion merely because the operator navigates past unresolved responsibilities', () => {
    const { container } = render(<App />)
    const railButtons = container.querySelectorAll<HTMLButtonElement>('.rail li button')

    fireEvent.click(railButtons[6])

    expect(container.querySelector('.form-panel h1')?.textContent).toBe('7. 개인정보 보호 담당자')
    expect(container.querySelector('.progress-copy span')?.textContent).toBe('0/7 완료')
    expect(container.querySelectorAll('.rail li.done')).toHaveLength(0)
    expect(Array.from(container.querySelectorAll('.rail li small')).every((label) => label.textContent === '확인 및 입력')).toBe(true)
  })

  it('marks a responsibility complete only after its blocking facts are actually satisfied', () => {
    const { container } = render(<App />)
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: 'Example Service' } })
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceUrl"]')!, { target: { value: 'https://example.com' } })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.form-actions .primary')!)

    const firstStep = container.querySelectorAll<HTMLLIElement>('.rail li')[0]
    expect(container.querySelector('.progress-copy span')?.textContent).toBe('1/7 완료')
    expect(firstStep.classList.contains('done')).toBe(true)
    expect(firstStep.querySelector('small')?.textContent).toBe('입력 확인됨')
  })
})
