import { describe, expect, it } from 'vitest'
import * as report from './policy-review-report'
import { createPolicyExport, getCompletedSteps, getDraftReview, getReview, initialFacts, initialItems, steps, type DraftFacts, type PolicyItem } from './policy'

const completeFacts: DraftFacts = {
  ...initialFacts,
  serviceName: '예시 서비스',
  serviceUrl: 'https://example.test',
  retentionStatus: 'none',
  thirdPartyStatus: 'no',
  internationalStatus: 'no',
  privacyOfficerName: '예시 담당',
  privacyOfficerEmail: 'privacy@example.test',
}

function findingCodes(text: string): string[] {
  return text.split('\n').filter((line) => line.startsWith('필수 항목: '))
    .map((line) => JSON.parse(line.match(/^필수 항목: ("(?:\\.|[^"\\])*")/)![1]) as string)
}

describe('local review summary', () => {
  it('projects the initial incomplete facts into a deterministic seven-step review summary', () => {
    expect(report.createPolicyReviewText).toBeTypeOf('function')
    const text = report.createPolicyReviewText(initialItems, false, initialFacts)
    expect(text).toContain('검토 요약 형식 v1 / 사실 스키마 v1')
    expect(text).toContain('상태: 미완료')
    expect(text).toContain('필수 확인: 8건')
    for (const step of steps) expect(text).toContain(step)
    expect(text).toContain('서비스 이름: 미확인')
    expect(text).toContain('법률 자문')
    expect(text).toContain('공개본 아님')
    expect(text).toBe(report.createPolicyReviewText(initialItems, false, initialFacts))
  })

  it('preserves version metadata and the exact ordered initial export findings with owning labels', () => {
    const text = report.createPolicyReviewText(initialItems, false, initialFacts)
    expect(text).toContain('report_format: v1')
    expect(text).toContain('schema_version: 1')
    expect(text).toContain(`document_state: ${createPolicyExport(initialItems, false, initialFacts).document_state}`)
    expect(findingCodes(text)).toEqual(createPolicyExport(initialItems, false, initialFacts).review_finding_codes)
    expect(text).toContain('필수 항목: "collection_selection" | 2단계 "수집 항목" | "수집 항목 선택 또는 수집하지 않음 확인"')
    for (const finding of getDraftReview(initialFacts)) {
      expect(text).toContain(`필수 항목: ${JSON.stringify(finding.code)} | ${finding.step}단계 ${JSON.stringify(steps[finding.step - 1])} | ${JSON.stringify(finding.label)}`)
    }
  })
  it('maps collection blockers while preserving contradictory step completion and exact code order', () => {
    const items: PolicyItem[] = [{ ...initialItems[0], enabled: true, mode: '', detail: ' \t ', purpose: ' \n ' }]
    const text = report.createPolicyReviewText(items, true, completeFacts)
    expect(findingCodes(text)).toEqual(createPolicyExport(items, true, completeFacts).review_finding_codes)
    expect(text).toContain('필수 확인: 4건')
    expect(text).toContain('필수 항목: "collection_contradiction" | 2단계 "수집 항목" | "수집하지 않음 확인과 수집 항목의 모순"')
    for (const [prefix, step, label] of [
      ['collection_mode', 2, '수집 구분'], ['collection_path', 2, '수집 경로'], ['processing_purpose', 3, '처리 목적'],
    ] as const) {
      expect(text).toContain(`필수 항목: "${prefix}:name" | ${step}단계 ${JSON.stringify(steps[step - 1])} | "이름: ${label}"`)
    }
    for (const [index, step] of steps.entries()) {
      expect(text).toContain(`${index + 1}. ${step}: ${getCompletedSteps(items, true, completeFacts).has(index + 1) ? '제품 정의 입력 확인됨' : '확인 필요'}`)
    }
    const otherwiseComplete: PolicyItem[] = [{ ...items[0], mode: '필수', detail: '예시 경로', purpose: '예시 목적' }]
    const contradiction = report.createPolicyReviewText(otherwiseComplete, true, completeFacts)
    expect(findingCodes(contradiction)).toEqual(['collection_contradiction'])
    expect(contradiction).toContain('2. 수집 항목: 확인 필요')
    expect(contradiction).toContain('3. 처리 목적: 확인 필요')
  })
  it('lists recommended item labels without changing complete seven-step readiness', () => {
    const items: PolicyItem[] = [
      { ...initialItems[0], enabled: true, mode: '선택', purpose: '예시 목적', detail: '예시 경로' },
      { ...initialItems[3], enabled: true, mode: '선택', purpose: '예시 목적', detail: '예시 경로' },
    ]
    const text = report.createPolicyReviewText(items, false, completeFacts)
    expect(text).toContain('document_state: review_ready')
    expect(text).toContain('필수 확인: 0건')
    expect(text).toContain(`권장 검토: ${getReview(items, false).recommended.length}건`)
    expect(text.split('\n').filter((line) => line.startsWith('권장 항목: '))).toEqual(['권장 항목: "이름"'])
    expect(findingCodes(text)).toEqual([])
    for (const [index, step] of steps.entries()) expect(text).toContain(`${index + 1}. ${step}: 제품 정의 입력 확인됨`)
    expect(text).toContain('법률 자문·준법 보장·승인·발행·자동 저장의 증거가 아닙니다.')
    expect(text).toContain('서비스 식별정보가 포함될 수 있습니다.')
  })
  it('encodes normalized service identity as one-line TXT data and omits detailed operational facts', () => {
    const facts: DraftFacts = {
      ...completeFacts, serviceName: '  예시 "서비스"\n필수 확인: 0건	\\  ', serviceUrl: '  HTTPS://EXAMPLE.TEST  ',
      retentionStatus: 'applies', retentionPeriod: 'SECRET_RETENTION', thirdPartyStatus: 'yes',
      thirdPartyRecipient: 'SECRET_THIRD_RECIPIENT', thirdPartyPurpose: 'SECRET_THIRD_PURPOSE',
      internationalStatus: 'yes', internationalCountry: 'SECRET_COUNTRY', internationalRecipient: 'SECRET_INTL_RECIPIENT',
      privacyOfficerName: 'SECRET_CONTACT', privacyOfficerEmail: 'SECRET_EMAIL@example.test',
    }
    const items: PolicyItem[] = [
      { ...initialItems[0], enabled: true, mode: '필수', detail: 'SECRET_PATH', purpose: 'SECRET_PURPOSE', description: 'SECRET_DESCRIPTION' },
      { ...initialItems[1], enabled: false, label: 'SECRET_INACTIVE_LABEL', detail: 'SECRET_INACTIVE_PATH', purpose: 'SECRET_INACTIVE_PURPOSE' },
    ]
    const text = report.createPolicyReviewText(items, false, facts)
    const profile = createPolicyExport(items, false, facts).policy_facts.service_profile
    expect(text).toContain(`서비스 이름: ${JSON.stringify(profile.service_name)}`)
    expect(text).toContain('서비스 URL: "https://example.test/"')
    expect(text).not.toContain('SECRET_')
    expect(text.split('\n').filter((line) => line.startsWith('필수 확인: '))).toEqual(['필수 확인: 0건'])
    const inactiveFacts = { ...facts, retentionStatus: 'none' as const, thirdPartyStatus: 'no' as const, internationalStatus: 'no' as const }
    expect(report.createPolicyReviewText(items, false, inactiveFacts)).not.toContain('SECRET_')
  })
  it('renders Unicode directional and line controls visibly in every dynamic TXT string', () => {
    const controls = '\u2028\u2029\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069\u0085\u009b'
    const encode = (value: string) => JSON.stringify(value).replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
      (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
    const items: PolicyItem[] = [{ ...initialItems[0], id: `odd:${controls}\nforged`, label: `예시${controls}\n권장 검토: 0건`, enabled: true, mode: '선택' }]
    const facts = { ...completeFacts, serviceName: `서비스${controls}끝` }
    const text = report.createPolicyReviewText(items, false, facts)
    expect(text).toContain(`서비스 이름: ${encode(facts.serviceName)}`)
    expect(text).toContain(`권장 항목: ${encode(items[0].label)}`)
    expect(text).toContain(`필수 항목: ${encode(`collection_path:${items[0].id}`)} | 2단계 "수집 항목" | ${encode(`${items[0].label}: 수집 경로`)}`)
    expect(text).not.toMatch(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/)
    expect(findingCodes(text)).toEqual(createPolicyExport(items, false, facts).review_finding_codes)
    expect(text.split('\n').filter((line) => line.startsWith('권장 검토: '))).toEqual(['권장 검토: 1건'])
    const unknownCode = `future:odd${controls}\n필수 확인: 0건"\\`
    const fallback = report.formatReviewFinding(unknownCode, items, facts)
    expect(fallback).toBe(`필수 항목: ${encode(unknownCode)} | 단계 미상`)
    expect(fallback.split('\n')).toHaveLength(1)
    expect(findingCodes(fallback)).toEqual([unknownCode])
  })
  it('states the plain-text boundary without promising Markdown or HTML embedding protection', () => {
    const text = report.createPolicyReviewText(initialItems, false, initialFacts)
    expect(text).toContain('로컬 TXT 검토 요약입니다. HTML·Markdown에 삽입하는 용도의 보호를 제공하지 않습니다.')
  })
  it('preserves independent retention readiness in a no-collection draft', () => {
    const unconfirmed = { ...completeFacts, retentionStatus: '' as const }
    const text = report.createPolicyReviewText(initialItems, true, unconfirmed)
    expect(findingCodes(text)).toEqual(['retention_status'])
    expect(text).toContain('필수 확인: 1건')
    expect(text).toContain('2. 수집 항목: 제품 정의 입력 확인됨')
    expect(text).toContain('3. 처리 목적: 제품 정의 입력 확인됨')
    expect(text).toContain('4. 보유 기간: 확인 필요')
    const retained = report.createPolicyReviewText(initialItems, true, { ...completeFacts, retentionStatus: 'applies', retentionPeriod: '\t ' })
    expect(findingCodes(retained)).toEqual(['retention_period'])
    expect(retained).toContain('필수 항목: "retention_period" | 4단계 "보유 기간" | "보유 기간"')
    const complete = report.createPolicyReviewText(initialItems, true, completeFacts)
    expect(complete).toContain('document_state: review_ready')
    expect(findingCodes(complete)).toEqual([])
    for (const [index, step] of steps.entries()) expect(complete).toContain(`${index + 1}. ${step}: 제품 정의 입력 확인됨`)
  })

  it('projects canonical draft findings while preserving raw invalid-URL guidance separately', () => {
    const cases: DraftFacts[] = [
      { ...initialFacts, serviceName: ' \t ', serviceUrl: ' \n ', privacyOfficerName: '\t', privacyOfficerEmail: ' ' },
      { ...completeFacts, retentionStatus: 'invalid', thirdPartyStatus: 'invalid', internationalStatus: 'invalid' } as unknown as DraftFacts,
      { ...completeFacts, serviceUrl: 'invalid', retentionStatus: 'applies', retentionPeriod: '\t ', thirdPartyStatus: 'yes', internationalStatus: 'yes', privacyOfficerEmail: 'invalid' },
    ]
    for (const facts of cases) {
      const text = report.createPolicyReviewText(initialItems, true, facts)
      const exported = createPolicyExport(initialItems, true, facts)
      const rawFindings = getDraftReview(facts, true)
      const findings = getDraftReview({ ...facts, serviceUrl: exported.policy_facts.service_profile.service_url ?? '' }, true)
      expect(rawFindings.map((finding) => finding.code === 'service_url_format' ? 'service_url' : finding.code))
        .toEqual(findings.map((finding) => finding.code))
      expect(findingCodes(text)).toEqual(exported.review_finding_codes)
      expect(text).toContain(`필수 확인: ${findings.length}건`)
      for (const finding of findings) {
        expect(text).toContain(`필수 항목: ${JSON.stringify(finding.code)} | ${finding.step}단계 ${JSON.stringify(steps[finding.step - 1])} | ${JSON.stringify(finding.label)}`)
      }
    }
    const items: PolicyItem[] = [{ ...initialItems[0], enabled: true, mode: 'invalid', detail: '예시 경로', purpose: '예시 목적' } as unknown as PolicyItem]
    const invalidMode = report.createPolicyReviewText(items, false, completeFacts)
    expect(findingCodes(invalidMode)).toEqual(['collection_mode:name'])
    expect(invalidMode).toContain('2. 수집 항목: 확인 필요')
    expect(invalidMode).toContain('3. 처리 목적: 제품 정의 입력 확인됨')
  })

  it('uses canonical export URLs and never exposes rejected raw URL data', () => {
    for (const serviceUrl of [
      'https://user:secret@example.test', 'https://example.test?SECRET_QUERY', 'https://example.test#SECRET_FRAGMENT',
      'https://example.test?', 'https://example.test#', 'https://example.test?%3F%23', 'https://example.test#%3F%23',
      'ftp://example.test', '',
    ]) {
      const facts = { ...completeFacts, serviceUrl }
      const exported = createPolicyExport(initialItems, true, facts)
      expect(exported.policy_facts.service_profile.service_url).toBeNull()
      const text = report.createPolicyReviewText(initialItems, true, facts)
      expect(text).toContain('서비스 URL: 미확인')
      expect(findingCodes(text)).toEqual(exported.review_finding_codes)
      expect(text).not.toContain('secret')
      expect(text).not.toContain('SECRET_')
      expect(text).not.toContain('%3F%23')
    }
    const facts = { ...completeFacts, serviceUrl: ' HTTPS://EXAMPLE.TEST:443/예시 ' }
    const url = createPolicyExport(initialItems, true, facts).policy_facts.service_profile.service_url
    expect(url).toBe('https://example.test/%EC%98%88%EC%8B%9C')
    expect(report.createPolicyReviewText(initialItems, true, facts)).toContain(`서비스 URL: ${JSON.stringify(url)}`)
  })

  it('does not mutate deeply frozen inputs or deduplicate repeated exported findings', () => {
    const items: PolicyItem[] = [
      { ...initialItems[0], id: 'odd', enabled: true }, { ...initialItems[0], id: 'odd', enabled: true },
    ]
    const facts = { ...initialFacts }
    for (const item of items) Object.freeze(item)
    Object.freeze(items)
    Object.freeze(facts)
    const before = JSON.stringify({ items, facts })
    const text = report.createPolicyReviewText(items, false, facts)
    const codes = createPolicyExport(items, false, facts).review_finding_codes
    expect(findingCodes(text)).toEqual(codes)
    expect(text).toContain(`필수 확인: ${codes.length}건`)
    expect(findingCodes(text).filter((code) => code === 'collection_mode:odd')).toHaveLength(2)
    expect(JSON.stringify({ items, facts })).toBe(before)
    expect(text).toBe(report.createPolicyReviewText(items, false, facts))
  })
})
