// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { getReview, initialItems } from './policy'

afterEach(cleanup)

describe('explicit no-collection attestation', () => {
  it('clears the unresolved selection blocker without inventing collection items', () => {
    const review = getReview(initialItems, true)
    expect(review.enabled).toEqual([])
    expect(review.selectionMissing).toBe(false)
    expect(review.collectionContradiction).toBe(false)
    expect(review.blockingCount).toBe(0)
  })

  it('fails closed when a no-collection attestation coexists with a selected item', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '본인 확인', detail: '회원가입 화면' } : item)
    const review = getReview(items, true)
    expect(review.collectionContradiction).toBe(true)
    expect(review.blockingCount).toBe(1)
  })

  it('treats retention as not applicable instead of forcing an invented retention fact', () => {
    const { container } = render(<App />)
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[1])
    fireEvent.click(container.querySelector<HTMLInputElement>('input[name="noCollectionAttested"]')!)

    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('6건')
    expect(container.querySelectorAll<HTMLLIElement>('.rail li')[3].classList.contains('done')).toBe(true)
    expect(container.querySelector('.paper')?.textContent).toContain('개인정보를 수집하지 않음으로 확인되어 보유 기간이 적용되지 않습니다.')
    expect(container.querySelector('.paper')?.textContent).not.toContain('보유 기간 단계에서 확인한 운영 기준을 입력해야 합니다.')
  })

  it('invalidates stale item facts when the operator attests no collection and does not revive them when the attestation is removed', () => {
    const { container } = render(<App />)
    const phone = container.querySelectorAll<HTMLInputElement>('.check-label input')[2]
    fireEvent.click(phone)
    const phoneItem = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    fireEvent.change(phoneItem.querySelector<HTMLSelectElement>('select')!, { target: { value: '필수' } })
    fireEvent.change(phoneItem.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')!, { target: { value: '회원가입 화면' } })

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')!, { target: { value: '본인 확인' } })
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[1])

    const noCollection = container.querySelector<HTMLInputElement>('input[name="noCollectionAttested"]')!
    expect(noCollection).not.toBeNull()
    fireEvent.click(noCollection)
    expect(container.querySelectorAll<HTMLInputElement>('.check-label input')[2].checked).toBe(false)
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('6건')

    fireEvent.click(noCollection)
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('8건')
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('.check-label input')[2])
    const reenabledPhone = container.querySelectorAll<HTMLElement>('.item-list .item')[2]
    expect(reenabledPhone.querySelector<HTMLSelectElement>('select')?.value).toBe('')
    expect(reenabledPhone.querySelector<HTMLInputElement>('input[placeholder="예: 회원가입 화면"]')?.value).toBe('')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[2])
    expect(container.querySelector<HTMLInputElement>('input[name="purpose-phone"]')?.value).toBe('')
  })
})
