export type CollectionMode = '필수' | '선택'
export type PolicyItem = { id: string; label: string; description: string; purpose: string; enabled: boolean; mode: CollectionMode; detail?: string }

export const initialItems: PolicyItem[] = [
  { id: 'name', label: '이름', description: '서비스 이용자 식별', purpose: '서비스 이용자 식별', enabled: true, mode: '필수' },
  { id: 'email', label: '이메일 주소', description: '계정 식별, 로그인, 중요 고지 수신', purpose: '계정 식별 및 중요 고지', enabled: true, mode: '필수' },
  { id: 'phone', label: '휴대전화 번호', description: '본인 확인, 알림 발송', purpose: '', enabled: false, mode: '선택' },
  { id: 'usage', label: '서비스 이용 기록', description: '접속 로그, 이용 내역, 클릭 기록 등', purpose: '서비스 개선 및 이용 통계 분석', enabled: true, mode: '필수' },
  { id: 'ip', label: '접속 IP 주소', description: '보안, 부정 이용 방지', purpose: '보안 및 부정 이용 방지', enabled: false, mode: '선택' },
  { id: 'cookie', label: '쿠키 및 유사 기술', description: '설정 유지, 통계 분석', purpose: '', enabled: false, mode: '선택' },
  { id: 'address', label: '주소', description: '배송, 청구서 발송', purpose: '', enabled: false, mode: '선택' },
  { id: 'payment', label: '결제 정보', description: '결제 처리, 환불 처리', purpose: '', enabled: false, mode: '선택' },
  { id: 'content', label: '게시물 및 문의 내용', description: '게시 기능, 고객 문의 처리', purpose: '', enabled: false, mode: '선택' },
]

export const steps = ['서비스 정보', '수집 항목', '처리 목적', '보유 기간', '제3자 제공', '국외 이전', '개인정보 보호 담당자']

export function getReview(items: PolicyItem[]) {
  const enabled = items.filter((item) => item.enabled)
  const blocking = enabled.filter((item) => !item.purpose.trim())
  const recommended = enabled.filter((item) => item.mode === '선택' && item.id !== 'usage')
  return { enabled, blocking, recommended }
}
