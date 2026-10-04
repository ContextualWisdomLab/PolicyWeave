// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createPolicyExport, initialFacts, initialItems } from './policy'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

let captured: Blob | undefined
const allocate = vi.fn((blob: Blob) => { captured = blob; return 'blob:review-fixture' })
const revoke = vi.fn()
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); captured = undefined; allocate.mockClear(); revoke.mockClear() })

function mount() {
  vi.stubGlobal('URL', class extends URL { static createObjectURL = allocate; static revokeObjectURL = revoke })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const view = render(<App />)
  return { ...view, click }
}

describe('local review summary download UI', () => {
  it.each(['blob', 'url', 'anchor', 'click'])('preserves the complete workspace and retries after %s failure', (stage) => {
    vi.useFakeTimers()
    const { getByRole, click, container } = mount()
    fireEvent.change(container.querySelector('input[name="serviceName"]')!, { target: { value: 'Review Fixture' } })
    fireEvent.click(container.querySelectorAll('.rail ol button')[1])
    fireEvent.click(container.querySelector('input[name="noCollectionAttested"]')!)
    const before = container.querySelector('.workspace')!.innerHTML
    const sessionNotice = container.querySelector('.session-notice')?.textContent
    expect(sessionNotice).toContain('자동 저장되지 않습니다')
    const failure = new Error('fixture failure')
    if (stage === 'blob') vi.stubGlobal('Blob', class { constructor() { throw failure } })
    if (stage === 'url') allocate.mockImplementationOnce(() => { throw failure })
    if (stage === 'anchor') {
      const original = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementationOnce(((tag: string) => { if (tag === 'a') throw failure; return original(tag) }) as typeof document.createElement)
    }
    if (stage === 'click') click.mockImplementationOnce(() => { throw failure })
    fireEvent.click(getByRole('button', { name: '검토 요약 다운로드' }))
    expect(container.querySelector('output')?.textContent).toContain('다시 시도하세요')
    expect(container.querySelector('.session-notice')?.textContent).toBe(sessionNotice)
    expect(container.querySelector('.workspace')!.innerHTML).toBe(before)
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    if (stage === 'anchor' || stage === 'click') expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:review-fixture')
    else expect(revoke).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    vi.stubGlobal('URL', class extends URL { static createObjectURL = allocate; static revokeObjectURL = revoke })
    fireEvent.click(getByRole('button', { name: '검토 요약 다운로드' }))
    expect(container.querySelector('output')?.textContent).toContain('다운로드를 시작했습니다')
    expect(container.querySelector('.session-notice')?.textContent).toBe(sessionNotice)
    expect(container.querySelector('.workspace')!.innerHTML).toBe(before)
    vi.runAllTimers()
  })

  it.each(['valid', 'invalid'])('blocks summary allocation during import and recovers after %s completion', async (outcome) => {
    const { getByRole, container } = mount()
    let finish!: (text: string) => void
    const file = new File(['pending'], 'draft.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => new Promise<string>((resolve) => { finish = resolve }) })
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } })
    const button = getByRole('button', { name: '검토 요약 다운로드' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(allocate).not.toHaveBeenCalled()
    expect(container.querySelector('.save-state')?.textContent).toContain('JSON 초안 확인 중')
    finish(outcome === 'valid' ? JSON.stringify(createPolicyExport(initialItems, false, initialFacts)) : '{}')
    await waitFor(() => expect(button.disabled).toBe(false), { timeout: 60000 })
    fireEvent.click(button)
    expect(allocate).toHaveBeenCalledOnce()
  })

  it('starts an incomplete TXT download with a fixed filename and delayed object URL cleanup', () => {
    vi.useFakeTimers()
    const { getByRole, click, container } = mount()
    fireEvent.change(container.querySelector('input[name="serviceName"]')!, { target: { value: 'Review Fixture' } })
    fireEvent.click(getByRole('button', { name: '검토 요약 다운로드' }))
    expect(allocate).toHaveBeenCalledOnce()
    expect(captured?.type).toBe('text/plain;charset=utf-8')
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('policyweave-review.txt')
    expect(container.querySelector('output')?.textContent).toContain('다운로드를 시작했습니다')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.value).toBe('Review Fixture')
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:review-fixture')
  })
})
