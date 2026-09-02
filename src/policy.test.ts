import { describe, expect, it } from 'vitest'
import { getReview, initialItems } from './policy'

describe('policy review', () => {
  it('starts without invented operational selections, collection modes, or processing purposes', () => {
    expect(initialItems.filter((item) => item.enabled)).toEqual([])
    expect(initialItems.every((item) => item.mode === '')).toBe(true)
    expect(initialItems.every((item) => item.purpose === '')).toBe(true)
    const review = getReview(initialItems)
    expect(review.selectionMissing).toBe(true)
    expect(review.blockingCount).toBe(1)
  })

  it('blocks readiness when a selected item still lacks collection mode and processing purpose', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true } : item)
    const review = getReview(items)
    expect(review.selectionMissing).toBe(false)
    expect(review.modeBlocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blockingCount).toBe(2)
  })

  it('treats a whitespace-only purpose as missing after collection mode is confirmed', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '   \t  ' } : item)
    const review = getReview(items)
    expect(review.modeBlocking).toEqual([])
    expect(review.blocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blockingCount).toBe(1)
  })

  it('clears readiness findings once both collection mode and purpose are explicit', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '  본인 확인  ' } : item)
    const review = getReview(items)
    expect(review.blocking.map((item) => item.id)).not.toContain('phone')
    expect(review.modeBlocking.map((item) => item.id)).not.toContain('phone')
    expect(review.blockingCount).toBe(0)
  })
})