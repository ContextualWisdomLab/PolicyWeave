import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, ExternalLink, FileText, Link, Save } from 'lucide-react'
import { getReview, initialItems, PolicyItem, steps } from './policy'

function StepRail({ current, setCurrent }: { current: number; setCurrent: (step: number) => void }) {
  return <aside className="rail" aria-label="작성 단계">
    <div className="progress-copy"><strong>작성 진행률</strong><span>{current}/7 완료</span></div>
    <div className="progress"><i style={{ width: `${current / 7 * 100}%` }} /></div>
    <ol>{steps.map((step, index) => <li key={step} className={index + 1 === current ? 'active' : index + 1 < current ? 'done' : ''}>
      <button onClick={() => setCurrent(index + 1)} aria-current={index + 1 === current ? 'step' : undefined}>
        <span className="step-number">{index + 1 < current ? <Check size={13} /> : index + 1}</span>
        <span><b>{step}</b><small>{index === 1 ? '수집하는 개인정보 선택' : index + 1 < current ? '입력 완료' : '확인 및 입력'}</small></span>
      </button>
    </li>)}</ol>
    <button className="outline full"><FileText size={16} /> 미리보기 전체화면</button>
  </aside>
}

function CollectionForm({ items, setItems, setCurrent }: { items: PolicyItem[]; setItems: (items: PolicyItem[]) => void; setCurrent: (step: number) => void }) {
  const update = (id: string, patch: Partial<PolicyItem>) => setItems(items.map((item) => item.id === id ? { ...item, ...patch } : item))
  return <main className="form-panel">
    <header className="section-head"><h1>2. 수집 항목</h1><p>서비스에서 실제로 수집하는 개인정보만 선택하세요. 선택한 항목에 따라 다음 단계가 달라집니다.</p></header>
    <div className="notice"><strong>입력 원칙</strong><span>서비스 코드와 운영 절차에서 확인한 항목만 반영하세요. 추정으로 선택하지 않습니다.</span></div>
    <h2>기본 정보</h2>
    <div className="table-head"><span>수집 항목</span><span>설명</span><span>수집 여부</span></div>
    <div className="item-list">{items.map((item) => <div className={`item ${item.enabled ? 'selected' : ''}`} key={item.id}>
      <div className="item-row">
        <label className="check-label"><input type="checkbox" checked={item.enabled} onChange={(e) => update(item.id, { enabled: e.target.checked })} /><span className="box"><Check size={13} /></span><b>{item.label}</b></label>
        <span>{item.description}</span>
        <label className="select-wrap"><span className="sr-only">{item.label} 수집 구분</span><select value={item.mode} onChange={(e) => update(item.id, { mode: e.target.value as PolicyItem['mode'] })} disabled={!item.enabled}><option>필수</option><option>선택</option></select><ChevronDown size={14} /></label>
      </div>
      {item.enabled && !item.purpose && <div className="conditional"><label>처리 목적 <input value={item.purpose} onChange={(e) => update(item.id, { purpose: e.target.value })} placeholder="예: 본인 확인, 알림 발송" /></label><label>수집 경로 <input value={item.detail ?? ''} onChange={(e) => update(item.id, { detail: e.target.value })} placeholder="예: 회원가입 화면" /></label></div>}
    </div>)}</div>
    <div className="form-actions"><button className="outline" onClick={() => setCurrent(1)}>이전</button><button className="primary" onClick={() => setCurrent(3)}>처리 목적 확인</button></div>
  </main>
}

function DocumentPreview({ items }: { items: PolicyItem[] }) {
  const review = useMemo(() => getReview(items), [items])
  return <section className="preview" aria-label="개인정보처리방침 미리보기">
    <div className="preview-title"><h2>개인정보처리방침 미리보기</h2><button className="outline">새 창에서 보기 <ExternalLink size={14} /></button></div>
    <div className="meta"><span>근거 법령 <b>개인정보 보호법</b></span><span className={review.blocking.length ? 'warn-tag' : 'ok-tag'}>{review.blocking.length ? `검토 필요 ${review.blocking.length}` : '필수 확인 완료'}</span><span>버전 0.1.0</span></div>
    <article className="paper">
      <h2>개인정보처리방침 (검토본)</h2>
      <p>회사는 이용자의 개인정보를 중요하게 여기며, 관련 법령을 준수하기 위해 다음과 같이 개인정보 처리에 관한 사항을 알립니다.</p>
      <h3>제1조 (개인정보의 처리 목적)</h3>
      <p>회사는 아래 목적을 위해 개인정보를 처리합니다. 목적이 변경되는 경우 필요한 절차를 거쳐 별도로 알립니다.</p>
      <table><thead><tr><th>수집 항목</th><th>처리 목적</th><th>근거 확인</th></tr></thead><tbody>{review.enabled.map((item) => <tr key={item.id}><td>{item.label}</td><td className={!item.purpose ? 'missing' : ''}>{item.purpose || '처리 목적 입력 필요'}</td><td>제15조 검토</td></tr>)}</tbody></table>
      {review.blocking.length > 0 && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>{review.blocking.map((item) => item.label).join(', ')}의 처리 목적이 입력되지 않았습니다.</span></div>}
      <h3>제2조 (처리 및 보유 기간)</h3><p>각 개인정보의 보유 기간은 다음 작성 단계에서 입력한 법정 보존 기간과 이용 목적 달성 시점을 기준으로 정합니다.</p>
      <h3>제3조 (제3자 제공)</h3><p>제3자 제공 여부와 제공받는 자, 목적, 항목 및 보유 기간은 확인된 운영 사실에 따라 별도 표에 반영합니다.</p>
    </article>
    <button className="primary wide" disabled={review.blocking.length > 0}>검토본 생성</button>
    <small className="legal-note">생성된 문서는 법률 자문이 아닙니다. 공개 전 책임자의 검토가 필요합니다.</small>
  </section>
}

export default function App() {
  const [items, setItems] = useState(initialItems)
  const [current, setCurrent] = useState(2)
  const review = useMemo(() => getReview(items), [items])
  const [message, setMessage] = useState('')
  function publish() { setMessage(review.blocking.length ? '필수 확인 항목을 먼저 입력하세요.' : '공개 URL 발행에는 저장소 백엔드 연결이 필요합니다.') }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top">PolicyWeave</a><button className="document-name">내 서비스 개인정보처리방침 <ChevronDown size={14} /></button><span className="status">작성 중</span><span className="version">버전 0.1.0 (임시저장)</span><span className="save-state"><Check size={15} /> 자동 저장됨</span><button className="outline"><Save size={15} /> 저장</button></header>
    <div className="workspace" id="top"><StepRail current={current} setCurrent={setCurrent} /><CollectionForm items={items} setItems={setItems} setCurrent={setCurrent} /><DocumentPreview items={items} /></div>
    <footer className="review-bar"><div><b>검토 요약</b><small>확인을 마친 뒤 공개 URL을 발행하세요.</small></div><div className="review-stat blocking"><AlertTriangle size={21} /><span>필수 확인 <b>{review.blocking.length}건</b></span></div><div className="review-stat"><Check size={21} /><span>권장 검토 <b>{review.recommended.length}건</b></span></div><button className="primary publish" onClick={publish} disabled={review.blocking.length > 0}><Link size={16} /> 공개 URL 발행</button><output aria-live="polite">{message}</output></footer>
  </div>
}
