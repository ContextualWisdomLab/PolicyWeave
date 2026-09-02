import { describe, expect, it } from 'vitest'
import { getDraftReview, getReview, initialFacts, initialItems } from './policy'

describe('collection policy review', () => {
  it('starts without invented operational selections, collection modes, or processing purposes', () => {
    expect(initialItems.filter((item) => item.enabled)).toEqual([])
    expect(initialItems.every((item) => item.mode === '')).toBe(true)
    expect(initialItems.every((item) => item.purpose === '')).toBe(true)
    const review = getReview(initialItems)
    expect(review.selectionMissing).toBe(true)
    expect(review.blockingCount).toBe(1)
  })

  it('blocks readiness when a selected item still lacks collection mode, processing purpose, and collection path evidence', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true } : item)
    const review = getReview(items)
    expect(review.selectionMissing).toBe(false)
    expect(review.modeBlocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.pathBlocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blockingCount).toBe(3)
  })

  it('treats a whitespace-only collection path as missing evidence', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '본인 확인', detail: '  \t  ' } : item)
    const review = getReview(items)
    expect(review.modeBlocking).toEqual([])
    expect(review.blocking).toEqual([])
    expect(review.pathBlocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blockingCount).toBe(1)
  })

  it('treats a whitespace-only purpose as missing after collection mode and path are confirmed', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '   \t  ', detail: '회원가입 화면' } : item)
    const review = getReview(items)
    expect(review.modeBlocking).toEqual([])
    expect(review.pathBlocking).toEqual([])
    expect(review.blocking.map((item) => item.id)).toEqual(['phone'])
    expect(review.blockingCount).toBe(1)
  })

  it('clears readiness findings once collection mode, purpose, and path evidence are explicit', () => {
    const items = initialItems.map((item) => item.id === 'phone' ? { ...item, enabled: true, mode: '필수' as const, purpose: '  본인 확인  ', detail: '  회원가입 화면  ' } : item)
    const review = getReview(items)
    expect(review.blocking.map((item) => item.id)).not.toContain('phone')
    expect(review.modeBlocking.map((item) => item.id)).not.toContain('phone')
    expect(review.pathBlocking.map((item) => item.id)).not.toContain('phone')
    expect(review.blockingCount).toBe(0)
  })
})

describe('seven-step draft readiness', () => {
  it('starts with every unresolved non-collection authoring responsibility blocked', () => {
    expect(getDraftReview(initialFacts).map((finding) => finding.code)).toEqual([
      'service_name',
      'service_url',
      'retention_status',
      'third_party_status',
      'international_status',
      'privacy_contact_name',
      'privacy_contact_email',
    ])
  })

  it('does not infer retention applicability from no-collection', () => {
    expect(getDraftReview(initialFacts, true).map((finding) => finding.code)).toContain('retention_status')
  })

  it('accepts an explicit no-retention fact without inventing a retention period', () => {
    const facts = {
      ...initialFacts,
      serviceName: '예시 서비스',
      serviceUrl: 'https://example.test',
      retentionStatus: 'none' as const,
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: '개인정보보호 담당',
      privacyOfficerEmail: 'privacy@example.test',
    }
    expect(getDraftReview(facts, true)).toEqual([])
  })

  it('requires a retention period only after the operator confirms retained personal data exists', () => {
    const facts = {
      ...initialFacts,
      serviceName: '예시 서비스',
      serviceUrl: 'https://example.test',
      retentionStatus: 'applies' as const,
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: '개인정보보호 담당',
      privacyOfficerEmail: 'privacy@example.test',
    }
    expect(getDraftReview(facts).map((finding) => finding.code)).toEqual(['retention_period'])
    expect(getDraftReview({ ...facts, retentionPeriod: '회원 탈퇴 시까지' })).toEqual([])
  })

  it('treats explicit no-transfer attestations as complete without inventing recipients', () => {
    const facts = {
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
    expect(getDraftReview(facts)).toEqual([])
  })

  it('requires dependent transfer facts only when the operator confirms a transfer exists', () => {
    const facts = {
      ...initialFacts,
      serviceName: '예시 서비스',
      serviceUrl: 'https://example.test',
      retentionStatus: 'applies' as const,
      retentionPeriod: '회원 탈퇴 시까지',
      thirdPartyStatus: 'yes' as const,
      internationalStatus: 'yes' as const,
      privacyOfficerName: '개인정보보호 담당',
      privacyOfficerEmail: 'privacy@example.test',
    }
    expect(getDraftReview(facts).map((finding) => finding.code)).toEqual([
      'third_party_recipient',
      'third_party_purpose',
      'international_country',
      'international_recipient',
    ])
  })

  it('normalizes whitespace-only authoring facts as unresolved', () => {
    const facts = {
      ...initialFacts,
      serviceName: '   ',
      serviceUrl: '\t',
      retentionStatus: 'applies' as const,
      retentionPeriod: '\n',
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: '  ',
      privacyOfficerEmail: ' ',
    }
    expect(getDraftReview(facts).map((finding) => finding.code)).toEqual([
      'service_name',
      'service_url',
      'retention_period',
      'privacy_contact_name',
      'privacy_contact_email',
    ])
  })

  it('blocks malformed or non-web service URLs after presence is established', () => {
    const base = {
      ...initialFacts,
      serviceName: '예시 서비스',
      retentionStatus: 'applies' as const,
      retentionPeriod: '회원 탈퇴 시까지',
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: '개인정보보호 담당',
      privacyOfficerEmail: 'privacy@example.test',
    }
    expect(getDraftReview({ ...base, serviceUrl: 'not a url' }).map((finding) => finding.code)).toEqual(['service_url_format'])
    expect(getDraftReview({ ...base, serviceUrl: 'javascript:alert(1)' }).map((finding) => finding.code)).toEqual(['service_url_format'])
    expect(getDraftReview({ ...base, serviceUrl: 'https://example.test/path' })).toEqual([])
  })

  it('blocks malformed privacy contact email after presence is established', () => {
    const base = {
      ...initialFacts,
      serviceName: '예시 서비스',
      serviceUrl: 'https://example.test',
      retentionStatus: 'applies' as const,
      retentionPeriod: '회원 탈퇴 시까지',
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: '개인정보보호 담당',
    }
    expect(getDraftReview({ ...base, privacyOfficerEmail: 'not-an-email' }).map((finding) => finding.code)).toEqual(['privacy_contact_email_format'])
    expect(getDraftReview({ ...base, privacyOfficerEmail: 'privacy@example.test' })).toEqual([])
  })
})