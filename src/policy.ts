export type CollectionMode = '' | '필수' | '선택'
export type DisclosureStatus = '' | 'yes' | 'no'
export type RetentionStatus = '' | 'applies' | 'none'

export type PolicyItem = {
  id: string
  label: string
  description: string
  purpose: string
  enabled: boolean
  mode: CollectionMode
  detail?: string
}

export type DraftFacts = {
  serviceName: string
  serviceUrl: string
  retentionStatus: RetentionStatus
  retentionPeriod: string
  thirdPartyStatus: DisclosureStatus
  thirdPartyRecipient: string
  thirdPartyPurpose: string
  internationalStatus: DisclosureStatus
  internationalCountry: string
  internationalRecipient: string
  privacyOfficerName: string
  privacyOfficerEmail: string
}

export type DraftFinding = {
  code: string
  step: number
  label: string
}

export const initialItems: PolicyItem[] = [
  { id: 'name', label: '이름', description: '서비스 이용자 식별', purpose: '', enabled: false, mode: '' },
  { id: 'email', label: '이메일 주소', description: '계정 식별, 로그인, 중요 고지 수신', purpose: '', enabled: false, mode: '' },
  { id: 'phone', label: '휴대전화 번호', description: '본인 확인, 알림 발송', purpose: '', enabled: false, mode: '' },
  { id: 'usage', label: '서비스 이용 기록', description: '접속 로그, 이용 내역, 클릭 기록 등', purpose: '', enabled: false, mode: '' },
  { id: 'ip', label: '접속 IP 주소', description: '보안, 부정 이용 방지', purpose: '', enabled: false, mode: '' },
  { id: 'cookie', label: '쿠키 및 유사 기술', description: '설정 유지, 통계 분석', purpose: '', enabled: false, mode: '' },
  { id: 'address', label: '주소', description: '배송, 청구서 발송', purpose: '', enabled: false, mode: '' },
  { id: 'payment', label: '결제 정보', description: '결제 처리, 환불 처리', purpose: '', enabled: false, mode: '' },
  { id: 'content', label: '게시물 및 문의 내용', description: '게시 기능, 고객 문의 처리', purpose: '', enabled: false, mode: '' },
]

export const initialFacts: DraftFacts = {
  serviceName: '',
  serviceUrl: '',
  retentionStatus: '',
  retentionPeriod: '',
  thirdPartyStatus: '',
  thirdPartyRecipient: '',
  thirdPartyPurpose: '',
  internationalStatus: '',
  internationalCountry: '',
  internationalRecipient: '',
  privacyOfficerName: '',
  privacyOfficerEmail: '',
}

export const steps = ['서비스 정보', '수집 항목', '처리 목적', '보유 기간', '제3자 제공', '국외 이전', '개인정보 보호 담당자']

/** Returns whether a service URL is an absolute HTTP(S) web location suitable for a buyer-facing policy target. */
function isWebServiceUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

/** Applies the minimal address-shape contract needed for a usable contact channel without claiming mailbox existence. */
function isContactEmail(value: string) {
  return /^[^\s@]+@[^\s@]+$/.test(value)
}

/** Derives deterministic readiness findings from operator-confirmed collection facts and an explicit no-collection attestation. */
export function getReview(items: PolicyItem[], noCollectionAttested = false) {
  const enabled = items.filter((item) => item.enabled)
  const blocking = enabled.filter((item) => !item.purpose.trim())
  const modeBlocking = enabled.filter((item) => !item.mode)
  const pathBlocking = enabled.filter((item) => !item.detail?.trim())
  const selectionMissing = enabled.length === 0 && !noCollectionAttested
  const collectionContradiction = noCollectionAttested && enabled.length > 0
  const blockingCount = blocking.length + modeBlocking.length + pathBlocking.length + (selectionMissing ? 1 : 0) + (collectionContradiction ? 1 : 0)
  const recommended = enabled.filter((item) => item.mode === '선택' && item.id !== 'usage')
  return { enabled, blocking, modeBlocking, pathBlocking, selectionMissing, collectionContradiction, noCollectionAttested, blockingCount, recommended }
}

/** Derives non-collection authoring findings without inferring retention state from collection state. */
export function getDraftReview(facts: DraftFacts, _noCollectionAttested = false): DraftFinding[] {
  const findings: DraftFinding[] = []
  const addWhenBlank = (value: string, code: string, step: number, label: string) => {
    if (!value.trim()) findings.push({ code, step, label })
  }

  addWhenBlank(facts.serviceName, 'service_name', 1, '서비스 이름')
  const serviceUrl = facts.serviceUrl.trim()
  if (!serviceUrl) findings.push({ code: 'service_url', step: 1, label: '서비스 URL' })
  else if (!isWebServiceUrl(serviceUrl)) findings.push({ code: 'service_url_format', step: 1, label: '서비스 URL 형식' })

  if (!facts.retentionStatus) {
    findings.push({ code: 'retention_status', step: 4, label: '개인정보 보유 여부' })
  } else if (facts.retentionStatus === 'applies') {
    addWhenBlank(facts.retentionPeriod, 'retention_period', 4, '보유 기간')
  }

  if (!facts.thirdPartyStatus) {
    findings.push({ code: 'third_party_status', step: 5, label: '제3자 제공 여부' })
  } else if (facts.thirdPartyStatus === 'yes') {
    addWhenBlank(facts.thirdPartyRecipient, 'third_party_recipient', 5, '제3자 제공받는 자')
    addWhenBlank(facts.thirdPartyPurpose, 'third_party_purpose', 5, '제3자 제공 목적')
  }

  if (!facts.internationalStatus) {
    findings.push({ code: 'international_status', step: 6, label: '국외 이전 여부' })
  } else if (facts.internationalStatus === 'yes') {
    addWhenBlank(facts.internationalCountry, 'international_country', 6, '이전 국가')
    addWhenBlank(facts.internationalRecipient, 'international_recipient', 6, '국외 수령자')
  }

  addWhenBlank(facts.privacyOfficerName, 'privacy_contact_name', 7, '개인정보 보호 담당자')
  const privacyOfficerEmail = facts.privacyOfficerEmail.trim()
  if (!privacyOfficerEmail) findings.push({ code: 'privacy_contact_email', step: 7, label: '개인정보 보호 연락 이메일' })
  else if (!isContactEmail(privacyOfficerEmail)) findings.push({ code: 'privacy_contact_email_format', step: 7, label: '개인정보 보호 연락 이메일 형식' })

  return findings
}

/** Derives completed authoring responsibilities from the same fail-closed facts used by readiness review. */
export function getCompletedSteps(items: PolicyItem[], noCollectionAttested: boolean, facts: DraftFacts) {
  const collectionReview = getReview(items, noCollectionAttested)
  const draftBlockedSteps = new Set(getDraftReview(facts, noCollectionAttested).map((finding) => finding.step))
  const completed = new Set<number>()

  if (!draftBlockedSteps.has(1)) completed.add(1)

  const collectionEstablished = !collectionReview.selectionMissing && !collectionReview.collectionContradiction
  if (collectionEstablished && collectionReview.modeBlocking.length === 0 && collectionReview.pathBlocking.length === 0) completed.add(2)
  if (collectionEstablished && collectionReview.blocking.length === 0) completed.add(3)

  for (const step of [4, 5, 6, 7]) {
    if (!draftBlockedSteps.has(step)) completed.add(step)
  }

  return completed
}
