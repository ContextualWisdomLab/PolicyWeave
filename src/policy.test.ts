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
})
