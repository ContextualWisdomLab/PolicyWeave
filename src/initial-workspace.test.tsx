// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('fresh workspace position', () => {
  it('starts with the first unresolved authoring responsibility instead of marking it complete', () => {
    const { container } = render(<App />)

    expect(container.querySelector('.form-panel h1')?.textContent).toBe('1. 서비스 정보')
    expect(container.querySelector('.progress-copy span')?.textContent).toBe('1/7 단계')
    expect(container.querySelectorAll('.rail li.done')).toHaveLength(0)
    expect(container.querySelector('.rail li.active small')?.textContent).toBe('확인 및 입력')
  })
})
