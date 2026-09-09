import { describe, expect, it } from 'vitest'
import { createPolicyExport, getCompletedSteps, getDraftReview, getReview, initialFacts, initialItems } from './policy'

const reviewReadyBase = {
  ...initialFacts,
  serviceName: '예시 서비스',
  serviceUrl: 'https://example.test',
  retentionStatus: 'applies' as const,
  retentionPeriod: '회원 탈퇴 시까지',
  thirdPartyStatus: 'no' as const,
  internationalStatus: 'no' as const,
  privacyOfficerName: '개인정보보호 담당',
  privacyOfficerEmail: 'privacy@example.test',
}

describe('policy boundary contracts', () => {
  it('canonicalizes uppercase service URL spelling without changing the authored destination', () => {
    const exported = createPolicyExport(initialItems, false, { ...initialFacts, serviceUrl: 'HTTPS://EXAMPLE.TEST/Privacy' })

    expect(exported.policy_facts.service_profile.service_url).toBe('https://example.test/Privacy')
    expect(exported.review_finding_codes).not.toContain('service_url_format')
  })

  it('treats a username-only service URL as inadmissible without leaking the username', () => {
    const exported = createPolicyExport(initialItems, false, { ...initialFacts, serviceUrl: 'https://operator@example.test' })

    expect(exported.policy_facts.service_profile.service_url).toBeNull()
    expect(exported.review_finding_codes).toContain('service_url_format')
    expect(JSON.stringify(exported)).not.toContain('operator')
  })

  it('counts contradiction alongside per-item blockers instead of masking either', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true } : item)
    const review = getReview(items, true)

    expect(review.collectionContradiction).toBe(true)
    expect(review.blockingCount).toBe(4)
  })

  it('excludes collection and purpose steps while a no-collection contradiction stands', () => {
    const items = initialItems.map((item) => item.id === 'phone'
      ? { ...item, enabled: true, mode: '필수' as const, purpose: '본인 확인', detail: '회원가입 화면' }
      : item)
    const completed = getCompletedSteps(items, true, reviewReadyBase)

    expect(completed.has(2)).toBe(false)
    expect(completed.has(3)).toBe(false)
    expect(completed.has(4)).toBe(true)
  })

  it('rejects malformed contact emails beyond the missing-at-sign case', () => {
    for (const privacyOfficerEmail of ['a@b@c', '@example.test', 'privacy@', 'privacy @example.test']) {
      expect(getDraftReview({ ...reviewReadyBase, privacyOfficerEmail }).map((finding) => finding.code))
        .toEqual(['privacy_contact_email_format'])
    }
    expect(getDraftReview({ ...reviewReadyBase, privacyOfficerEmail: 'privacy@example.test' })).toEqual([])
  })

  it('exports a null retention period without inventing one when applies has only whitespace', () => {
    const exported = createPolicyExport(initialItems, false, {
      ...initialFacts,
      retentionStatus: 'applies',
      retentionPeriod: '   ',
    })

    expect(exported.policy_facts.retention.retention_period).toBeNull()
    expect(exported.review_finding_codes).toContain('retention_period')
  })
})
