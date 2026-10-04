import { createPolicyExport, getCompletedSteps, getDraftReview, getReview, type DraftFacts, type PolicyItem, steps } from './policy'

/** Quotes TXT data and makes visual line/direction controls explicit; not an HTML/Markdown encoder. */
function quoteText(value: string): string {
  return JSON.stringify(value).replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

/** Formats one exported blocker without changing its identity or deriving readiness. */
export function formatReviewFinding(code: string, items: PolicyItem[], facts: DraftFacts): string {
  let finding = getDraftReview(facts).find((candidate) => candidate.code === code)
  if (code === 'collection_selection') finding = { code, step: 2, label: '수집 항목 선택 또는 수집하지 않음 확인' }
  if (code === 'collection_contradiction') finding = { code, step: 2, label: '수집하지 않음 확인과 수집 항목의 모순' }
  for (const [prefix, step, label] of [
    ['collection_mode', 2, '수집 구분'], ['collection_path', 2, '수집 경로'], ['processing_purpose', 3, '처리 목적'],
  ] as const) {
    const item = items.find((candidate) => code === `${prefix}:${candidate.id}`)
    if (item) finding = { code, step, label: `${item.label}: ${label}` }
  }
  return finding
    ? `필수 항목: ${quoteText(code)} | ${finding.step}단계 ${quoteText(steps[finding.step - 1])} | ${quoteText(finding.label)}`
    : `필수 항목: ${quoteText(code)} | 단계 미상`
}

/** Projects the current authoring state into a local review summary, never a publication receipt. */
export function createPolicyReviewText(items: PolicyItem[], noCollectionAttested: boolean, facts: DraftFacts): string {
  const exported = createPolicyExport(items, noCollectionAttested, facts)
  const completed = getCompletedSteps(items, noCollectionAttested, facts)
  const recommended = getReview(items, noCollectionAttested).recommended
  return [
    'PolicyWeave 검토 요약 — 공개본 아님',
    '검토 요약 형식 v1 / 사실 스키마 v1',
    'report_format: v1',
    `schema_version: ${exported.schema_version}`,
    `상태: ${exported.document_state === 'incomplete' ? '미완료' : '제품 정의 필수 사실 입력 확인됨'}`,
    `document_state: ${exported.document_state}`,
    `서비스 이름: ${exported.policy_facts.service_profile.service_name === null ? '미확인' : quoteText(exported.policy_facts.service_profile.service_name)}`,
    `서비스 URL: ${exported.policy_facts.service_profile.service_url === null ? '미확인' : quoteText(exported.policy_facts.service_profile.service_url)}`,
    `필수 확인: ${exported.review_finding_codes.length}건`,
    ...steps.map((step, index) => `${index + 1}. ${step}: ${completed.has(index + 1) ? '제품 정의 입력 확인됨' : '확인 필요'}`),
    ...exported.review_finding_codes.map((code) => formatReviewFinding(code, items, facts)),
    `권장 검토: ${recommended.length}건`,
    ...recommended.map((item) => `권장 항목: ${quoteText(item.label)}`),
    '법률 자문·준법 보장·승인·발행·자동 저장의 증거가 아닙니다. 공개 전 책임자 검토가 필요합니다.',
    '서비스 식별정보가 포함될 수 있습니다. 파일 보관 및 전달 범위를 직접 확인하세요.',
    '로컬 TXT 검토 요약입니다. HTML·Markdown에 삽입하는 용도의 보호를 제공하지 않습니다.',
    '',
  ].join('\n')
}
