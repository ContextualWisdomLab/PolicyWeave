import { describe, expect, it } from 'vitest'
import { getReview, initialItems } from './policy'

describe('policy review', () => {
  it('includes only selected collection items', () => {
    expect(getReview(initialItems).enabled.map((item) => item.id)).toEqual(['name', 'email', 'usage'])
  })

  it('blocks publishing when a selected item has no purpose', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true } : item)
    expect(getReview(items).blocking.map((item) => item.id)).toEqual(['phone'])
  })

  it('treats a whitespace-only purpose as missing', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, purpose: '   \t  ' } : item)
    expect(getReview(items).blocking.map((item) => item.id)).toEqual(['phone'])
  })

  it('accepts a purpose that contains non-whitespace content', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, purpose: '  본인 확인  ' } : item)
    expect(getReview(items).blocking.map((item) => item.id)).not.toContain('phone')
  })
})
