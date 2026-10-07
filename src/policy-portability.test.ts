import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createPolicyExport, getCompletedSteps, getDraftReview, initialFacts, initialItems, restorePolicyExport, type DraftFacts } from './policy'
import { createPolicyReviewText, formatReviewFinding } from './policy-review-report'

const otherwiseReadyFacts: DraftFacts = {
  ...initialFacts,
  serviceName: 'Example Portal',
  serviceUrl: 'https://example.test/privacy',
  retentionStatus: 'none',
  thirdPartyStatus: 'no',
  internationalStatus: 'no',
  privacyOfficerName: 'Example Privacy Team',
  privacyOfficerEmail: 'privacy@example.test',
}

describe('normalized draft portability', () => {
  it.each([
    ['blank', 'f3fcca2186508a6864d1faf814377997d3b23e1db4b50ceee95a3fa80de05d76', ''],
    ['valid', '0633d76ea48a5b8af289414d13feff8d189acdc0093dedf33b6ad494eeb5dd3e', 'https://example.test/privacy'],
  ])('preserves fixed predecessor %s file bytes', (name, digest, serviceUrl) => {
    const bytes = readFileSync(new URL(`../tests/fixtures/policy-v1-predecessor-${name}.json`, import.meta.url), 'utf8')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest)
    const restored = restorePolicyExport(JSON.parse(bytes))
    expect(restored.facts).toEqual({ ...otherwiseReadyFacts, serviceUrl })
    expect(`${JSON.stringify(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts), null, 2)}\n`).toBe(bytes)
    expect(`${JSON.stringify(createPolicyExport(initialItems, true, { ...otherwiseReadyFacts, serviceUrl }), null, 2)}\n`).toBe(bytes)
  })

  it('rejects the fixed producer-inconsistent predecessor without a compatibility exception', () => {
    const bytes = readFileSync(new URL('../tests/fixtures/policy-v1-predecessor-withheld.json', import.meta.url), 'utf8')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('353123483750fb345f6443577d6d16a183e66e48bb92cb053fd6e026b11bd7f2')
    const historical = JSON.parse(bytes)
    expect(historical.policy_facts.service_profile.service_url).toBeNull()
    expect(historical.review_finding_codes).toEqual(['service_url_format'])
    expect(() => restorePolicyExport(historical)).toThrow('review_finding_codes do not match restored facts')
  })

  it.each([
    { serviceName: ' \t ', privacyOfficerName: ' ', privacyOfficerEmail: '\t' },
    { retentionStatus: 'applies', retentionPeriod: ' ' },
    { retentionStatus: 'none', retentionPeriod: 'Discarded example detail' },
    { thirdPartyStatus: 'yes', thirdPartyRecipient: ' ', thirdPartyPurpose: '\t' },
    { thirdPartyStatus: 'no', thirdPartyRecipient: 'Discarded example recipient', thirdPartyPurpose: 'Discarded example purpose' },
    { internationalStatus: 'yes', internationalCountry: ' ', internationalRecipient: ' ' },
    { internationalStatus: 'no', internationalCountry: 'Discarded example country', internationalRecipient: 'Discarded example recipient' },
    { retentionStatus: 'unsupported', thirdPartyStatus: 'unsupported', internationalStatus: 'unsupported' },
    { privacyOfficerEmail: 'invalid' },
  ])('keeps other nullable projections reconstructable for %j', (patch) => {
    const facts = { ...otherwiseReadyFacts, ...patch, serviceUrl: 'invalid' } as DraftFacts
    const before = JSON.stringify(facts)
    const exported = createPolicyExport(initialItems, true, facts)
    const restored = restorePolicyExport(JSON.parse(JSON.stringify(exported)))
    expect(exported.document_state).toBe('incomplete')
    expect(exported.review_finding_codes).toContain('service_url')
    expect(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts)).toEqual(exported)
    expect(getDraftReview(restored.facts).map((finding) => finding.code)).toEqual(exported.review_finding_codes)
    expect(JSON.stringify(facts)).toBe(before)
  })

  it.each([
    'https://user:synthetic-marker@example.test/privacy',
    'https://synthetic-marker@example.test/privacy',
    'https://example.test/privacy?synthetic-marker',
    'https://example.test/privacy#synthetic-marker',
    'https://example.test/privacy?', 'https://example.test/privacy#',
    'https://example.test/privacy?synthetic-marker#synthetic-marker',
    'https://[invalid', '/privacy', 'ftp://example.test/privacy',
  ])('keeps otherwise-ready facts incomplete and portable for rejected URL %j', (serviceUrl) => {
    const facts = Object.freeze({ ...otherwiseReadyFacts, serviceUrl })
    const items = initialItems.map((item) => Object.freeze({ ...item }))
    Object.freeze(items)
    const before = JSON.stringify({ facts, items })
    const completed = [...getCompletedSteps(items, true, facts)]
    const exported = createPolicyExport(items, true, facts)
    const bytes = `${JSON.stringify(exported, null, 2)}\n`
    const text = createPolicyReviewText(items, true, facts)

    expect(exported.review_finding_codes).toEqual(['service_url'])
    expect(exported.document_state).toBe('incomplete')
    expect(exported.policy_facts.service_profile.service_url).toBeNull()
    expect(completed).toEqual([2, 3, 4, 5, 6, 7])
    expect(getDraftReview(facts).map((finding) => finding.code)).toEqual(['service_url_format'])
    expect(text).toContain('필수 항목: "service_url" | 1단계 "서비스 정보" | "서비스 URL"')
    expect(text).not.toContain('단계 미상')
    expect(bytes).not.toContain('synthetic-marker')
    expect(text).not.toContain('synthetic-marker')
    const restored = restorePolicyExport(JSON.parse(bytes))
    expect(restored.facts).toEqual({ ...otherwiseReadyFacts, serviceUrl: '' })
    expect(`${JSON.stringify(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts), null, 2)}\n`).toBe(bytes)
    expect(createPolicyReviewText(items, true, facts)).toBe(text)
    expect([...getCompletedSteps(items, true, facts)]).toEqual(completed)
    expect(JSON.stringify({ facts, items })).toBe(before)
  })

  it.each([
    ['', ''], [' \t ', ''],
    ['https://example.test/privacy', 'https://example.test/privacy'],
    [' HTTPS://EXAMPLE.TEST:443/privacy ', 'https://example.test/privacy'],
    ['https://example.test/privacy%3Fpolicy%23section', 'https://example.test/privacy%3Fpolicy%23section'],
    ['http://example.test:80/privacy', 'http://example.test/privacy'],
  ])('preserves admitted URL %j with canonical destination %j', (serviceUrl, canonical) => {
    const facts = { ...otherwiseReadyFacts, serviceUrl }
    const exported = createPolicyExport(initialItems, true, facts)
    expect(exported.policy_facts.service_profile.service_url).toBe(canonical || null)
    expect(exported.review_finding_codes).toEqual(canonical ? [] : ['service_url'])
    const restored = restorePolicyExport(JSON.parse(JSON.stringify(exported)))
    expect(restored.facts.serviceUrl).toBe(canonical)
    expect(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts)).toEqual(exported)
  })

  it('retains raw formatter and genuine unknown-code fallback contracts', () => {
    const facts = { ...otherwiseReadyFacts, serviceUrl: 'invalid' }
    expect(formatReviewFinding('service_url_format', initialItems, facts))
      .toBe('필수 항목: "service_url_format" | 1단계 "서비스 정보" | "서비스 URL 형식"')
    expect(formatReviewFinding('unknown_future_code', initialItems, facts))
      .toBe('필수 항목: "unknown_future_code" | 단계 미상')
  })

  it('preserves independently specified mixed blocker order and non-URL diagnostics', () => {
    const items = initialItems.map((item) => item.id === 'email' ? { ...item, enabled: true } : { ...item })
    const facts = { ...otherwiseReadyFacts, serviceUrl: 'invalid', privacyOfficerEmail: 'invalid' }
    const expected = ['collection_mode:email', 'collection_path:email', 'processing_purpose:email', 'service_url', 'privacy_contact_email_format']
    const exported = createPolicyExport(items, false, facts)
    const text = createPolicyReviewText(items, false, facts)
    const rows = text.split('\n').filter((line) => line.startsWith('필수 항목: '))
    expect(exported.review_finding_codes).toEqual(expected)
    expect(rows.map((row) => JSON.parse(row.match(/^필수 항목: ("[^"]+")/)![1]))).toEqual(expected)
    expect(rows).toHaveLength(5)
    expect(text).toContain('필수 확인: 5건')
    expect(text).toContain('7단계 "개인정보 보호 담당자" | "개인정보 보호 연락 이메일 형식"')
    expect(text).not.toContain('단계 미상')
    expect(getDraftReview(facts).map((finding) => finding.code)).toEqual(['service_url_format', 'privacy_contact_email_format'])
    const restored = restorePolicyExport(JSON.parse(JSON.stringify(exported)))
    expect(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts)).toEqual(exported)
    for (const codes of [expected.slice(1), [...expected, 'service_name'], [...expected, expected[0]], [...expected].reverse(), expected.map((code) => code === 'service_url' ? 'service_url_format' : code)]) {
      expect(() => restorePolicyExport({ ...exported, review_finding_codes: codes })).toThrow('review_finding_codes do not match restored facts')
    }
  })

  it('labels the withheld URL in TXT as unresolved at step 1 without changing live format guidance', () => {
    const facts = Object.freeze({
      ...initialFacts,
      serviceName: 'Example Portal',
      serviceUrl: 'https://example.test/privacy?access_token=synthetic-marker',
    })
    const text = createPolicyReviewText(initialItems, false, facts)

    expect(text).toContain('필수 항목: "service_url" | 1단계 "서비스 정보" | "서비스 URL"')
    expect(text).not.toContain('단계 미상')
    expect(text).not.toContain('synthetic-marker')
    expect(getDraftReview(facts).map((finding) => finding.code)).toContain('service_url_format')
    expect(facts.serviceUrl).toBe('https://example.test/privacy?access_token=synthetic-marker')
    expect(createPolicyReviewText(initialItems, false, facts)).toBe(text)
  })

  it('does not admit legacy format evidence for a null URL or forged readiness', () => {
    const exported = createPolicyExport(initialItems, false, initialFacts)
    expect(() => restorePolicyExport({
      ...exported,
      review_finding_codes: exported.review_finding_codes.map((code) => code === 'service_url' ? 'service_url_format' : code),
    })).toThrow('review_finding_codes do not match restored facts')
    expect(() => restorePolicyExport({ ...exported, document_state: 'review_ready' }))
      .toThrow('document_state does not match restored facts')
  })

  it.each(['', 'https://example.test/privacy'])('reopens existing canonical URL state %j', (serviceUrl) => {
    const exported = createPolicyExport(initialItems, false, { ...initialFacts, serviceUrl })
    const restored = restorePolicyExport(JSON.parse(JSON.stringify(exported)))

    expect(restored.facts.serviceUrl).toBe(serviceUrl)
    expect(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts)).toEqual(exported)
  })

  it('reopens its own incomplete export after an inadmissible service URL is removed', () => {
    const facts = { ...initialFacts, serviceName: 'Example Portal', serviceUrl: 'https://example.test/privacy?access_token=synthetic-marker' }
    const before = JSON.stringify(facts)
    expect(getDraftReview(facts).map((finding) => finding.code)).toContain('service_url_format')
    const exported = createPolicyExport(initialItems, false, facts)
    expect(exported.document_state).toBe('incomplete')
    expect(exported.policy_facts.service_profile.service_url).toBeNull()
    expect(JSON.stringify(exported)).not.toContain('synthetic-marker')
    expect(exported.review_finding_codes).toEqual([
      'collection_selection', 'service_url', 'retention_status',
      'third_party_status', 'international_status', 'privacy_contact_name', 'privacy_contact_email',
    ])

    const restored = restorePolicyExport(JSON.parse(JSON.stringify(exported)))

    expect(restored.facts.serviceName).toBe('Example Portal')
    expect(restored.facts.serviceUrl).toBe('')
    expect(getDraftReview(restored.facts).map((finding) => finding.code)).toContain('service_url')
    expect(createPolicyExport(restored.items, restored.noCollectionAttested, restored.facts)).toEqual(exported)
    expect(JSON.stringify(facts)).toBe(before)
  })
})
