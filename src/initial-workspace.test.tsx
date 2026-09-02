// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('authoring progress truthfulness', () => {
  it('starts with the first unresolved authoring responsibility instead of marking it complete', () => {
    const { container } = render(<App />)

    expect(container.querySelector('.form-panel h1')?.textContent).toBe('1. 서비스 정보')
    expect(container.querySelector('.progress-copy span')?.textContent).toBe('1/7 단계')
    expect(container.querySelectorAll('.rail li.done')).toHaveLength(0)
    expect(container.querySelector('.rail li.active small')?.textContent).toBe('확인 및 입력')
  })

  it('does not mark unresolved responsibilities complete merely because the operator navigates past them', () => {
    const { container } = render(<App />)
    const railButtons = container.querySelectorAll<HTMLButtonElement>('.rail li button')

    fireEvent.click(railButtons[6])

    expect(container.querySelector('.form-panel h1')?.textContent).toBe('7. 개인정보 보호 담당자')
    expect(container.querySelectorAll('.rail li.done')).toHaveLength(0)
    expect(Array.from(container.querySelectorAll('.rail li small')).every((label) => label.textContent === '확인 및 입력')).toBe(true)
  })

  it('marks a responsibility complete only after its blocking facts are actually satisfied', () => {
    const { container } = render(<App />)
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: 'Example Service' } })
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceUrl"]')!, { target: { value: 'https://example.com' } })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.form-actions .primary')!)

    const firstStep = container.querySelectorAll<HTMLLIElement>('.rail li')[0]
    expect(firstStep.classList.contains('done')).toBe(true)
    expect(firstStep.querySelector('small')?.textContent).toBe('입력 확인됨')
  })
})
