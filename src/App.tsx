import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, ExternalLink, FileText, Link, Save } from 'lucide-react'
import { DraftFacts, getCompletedSteps, getDraftReview, getReview, initialFacts, initialItems, PolicyItem, steps } from './policy'

type FactField = {
  key: keyof DraftFacts
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'url' | 'select'
  options?: Array<{ value: string; label: string }>
  visibleWhen?: { key: keyof DraftFacts; equals: string }
}

/** Renders the seven-step authoring rail and completion progress derived from verified facts. */
function StepRail({ current, completedSteps, setCurrent }: { current: number; completedSteps: Set<number>; setCurrent: (step: number) => void }) {
  return <aside className="rail" aria-label="작성 단계">
    <div className="progress-copy"><strong>작성 진행률</strong><span>{completedSteps.size}/7 완료</span></div>
    <div className="progress"><i style={{ width: `${completedSteps.size / 7 * 100}%` }} /></div>
    <ol>{steps.map((step, index) => {
      const stepNumber = index + 1
      const completed = completedSteps.has(stepNumber)
      return <li key={step} className={stepNumber === current ? 'active' : completed ? 'done' : ''}>
        <button onClick={() => setCurrent(stepNumber)} aria-current={stepNumber === current ? 'step' : undefined}>
          <span className="step-number">{completed ? <Check size={13} /> : stepNumber}</span>
          <span><b>{step}</b><small>{completed ? '입력 확인됨' : '확인 및 입력'}</small></span>
        </button>
      </li>
    })}</ol>
    <button className="outline full" onClick={() => document.querySelector<HTMLElement>('.preview')?.focus()}><FileText size={16} /> 미리보기로 이동</button>
  </aside>
}

/** Renders previous/next navigation for the active authoring step. */
function StepActions({ current, setCurrent }: { current: number; setCurrent: (step: number) => void }) {
  return <div className="form-actions">
    <button className="outline" onClick={() => setCurrent(Math.max(1, current - 1))} disabled={current === 1}>이전</button>
    <button className="primary" onClick={() => setCurrent(Math.min(7, current + 1))} disabled={current === 7}>다음 단계</button>
  </div>
}

/** Renders a scalar-fact authoring step backed by the current draft facts. */
function FactStep({ current, title, description, fields, facts, setFacts, setCurrent }: {
  current: number
  title: string
  description: string
  fields: FactField[]
  facts: DraftFacts
  setFacts: (facts: DraftFacts) => void
  setCurrent: (step: number) => void
}) {
  const update = (key: keyof DraftFacts, value: string) => {
    const next = { ...facts, [key]: value } as DraftFacts
    if (key === 'retentionStatus' && value !== 'applies') next.retentionPeriod = ''
    if (key === 'thirdPartyStatus' && value !== 'yes') {
      next.thirdPartyRecipient = ''
      next.thirdPartyPurpose = ''
    }
    if (key === 'internationalStatus' && value !== 'yes') {
      next.internationalCountry = ''
      next.internationalRecipient = ''
    }
    setFacts(next)
  }
  return <main className="form-panel">
    <header className="section-head"><h1>{current}. {title}</h1><p>{description}</p></header>
    <div className="notice"><strong>사실 기반 입력</strong><span>운영 중인 서비스와 계약·처리 흐름에서 확인한 사실만 입력하세요. 확인되지 않은 내용은 비워 두고 검토 대상으로 남깁니다.</span></div>
    <h2>확인 정보</h2>
    <div className="conditional">{fields.filter((field) => !field.visibleWhen || facts[field.visibleWhen.key] === field.visibleWhen.equals).map((field) => <label key={field.key}>{field.label}{field.type === 'select'
      ? <select name={field.key} value={facts[field.key]} onChange={(event) => update(field.key, event.target.value)}>{field.options?.map((option) => <option value={option.value} key={option.value || 'unresolved'}>{option.label}</option>)}</select>
      : <input name={field.key} type={field.type ?? 'text'} value={facts[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} />}</label>)}</div>
    <StepActions current={current} setCurrent={setCurrent} />
  </main>
}

/** Captures collection facts only after the operator explicitly selects an item or attests that none are collected. */
function CollectionForm({ items, setItems, noCollectionAttested, setNoCollectionAttested, setCurrent }: {
  items: PolicyItem[]
  setItems: (items: PolicyItem[]) => void
  noCollectionAttested: boolean
  setNoCollectionAttested: (attested: boolean) => void
  setCurrent: (step: number) => void
}) {
  const update = (id: string, patch: Partial<PolicyItem>) => setItems(items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const setNoCollection = (attested: boolean) => {
    if (attested) setItems(items.map((item) => ({ ...item, enabled: false, purpose: '', detail: '', mode: '' })))
    setNoCollectionAttested(attested)
  }
  return <main className="form-panel">
    <header className="section-head"><h1>2. 수집 항목</h1><p>서비스에서 실제로 수집하는 개인정보만 선택하세요. 선택한 항목에 따라 다음 단계가 달라집니다.</p></header>
    <div className="notice"><strong>입력 원칙</strong><span>서비스 코드와 운영 절차에서 확인한 항목만 반영하세요. 추정으로 선택하지 않습니다.</span></div>
    <h2>수집 여부</h2>
    <label className="attestation-label"><input name="noCollectionAttested" type="checkbox" checked={noCollectionAttested} onChange={(event) => setNoCollection(event.target.checked)} /> 개인정보를 수집하지 않음으로 확인</label>
    <h2>기본 정보</h2>
    <div className="table-head"><span>수집 항목</span><span>설명</span><span>수집 여부</span></div>
    <div className="item-list">{items.map((item) => <div className={`item ${item.enabled ? 'selected' : ''}`} key={item.id}>
      <div className="item-row">
        <label className="check-label"><input type="checkbox" checked={item.enabled} disabled={noCollectionAttested} onChange={(event) => {
          const enabled = event.target.checked
          update(item.id, enabled ? { enabled } : { enabled, purpose: '', detail: '', mode: '' })
        }} /><span className="box"><Check size={13} /></span><b>{item.label}</b></label>
        <span>{item.description}</span>
        <label className="select-wrap"><span className="sr-only">{item.label} 수집 구분</span><select value={item.mode} onChange={(event) => update(item.id, { mode: event.target.value as PolicyItem['mode'] })} disabled={!item.enabled || noCollectionAttested}><option value="">확인 필요</option><option>필수</option><option>선택</option></select><ChevronDown size={14} /></label>
      </div>
      {item.enabled && !noCollectionAttested && <div className="conditional"><label>수집 경로 <input value={item.detail ?? ''} onChange={(event) => update(item.id, { detail: event.target.value })} placeholder="예: 회원가입 화면" /></label></div>}
    </div>)}</div>
    <StepActions current={2} setCurrent={setCurrent} />
  </main>
}

/** Captures processing purposes for collection items explicitly selected by the operator. */
function PurposeForm({ items, setItems, noCollectionAttested, setCurrent }: { items: PolicyItem[]; setItems: (items: PolicyItem[]) => void; noCollectionAttested: boolean; setCurrent: (step: number) => void }) {
  const enabled = items.filter((item) => item.enabled)
  const updatePurpose = (id: string, purpose: string) => setItems(items.map((item) => item.id === id ? { ...item, purpose } : item))
  return <main className="form-panel">
    <header className="section-head"><h1>3. 처리 목적</h1><p>선택한 개인정보 항목마다 실제 처리 목적을 연결합니다. 목적이 없는 항목은 공개 검토를 통과할 수 없습니다.</p></header>
    <div className="notice"><strong>검토 원칙</strong><span>포괄적인 문구를 새로 만들기보다 실제 기능·업무 목적과 연결하세요.</span></div>
    <h2>항목별 처리 목적</h2>
    {noCollectionAttested ? <p>개인정보를 수집하지 않음으로 확인되었습니다. 수집 항목을 추가하려면 수집 항목 단계에서 이 확인을 해제하세요.</p> : enabled.length === 0 ? <p>수집 항목 단계에서 실제 수집 항목을 먼저 선택하세요.</p> : <div className="item-list purpose-list">{enabled.map((item) => <div className="item" key={item.id}><div className="conditional"><label>{item.label} 처리 목적<input name={`purpose-${item.id}`} value={item.purpose} onChange={(event) => updatePurpose(item.id, event.target.value)} placeholder={`${item.label}을 처리하는 실제 목적`} /></label><label>수집 경로<input value={item.detail ?? ''} readOnly placeholder="수집 항목 단계에서 입력" /></label></div></div>)}</div>}
    <StepActions current={3} setCurrent={setCurrent} />
  </main>
}

/** Chooses the editing surface that owns the active authoring step. */
function EditingPanel({ current, items, setItems, noCollectionAttested, setNoCollectionAttested, facts, setFacts, setCurrent }: {
  current: number
  items: PolicyItem[]
  setItems: (items: PolicyItem[]) => void
  noCollectionAttested: boolean
  setNoCollectionAttested: (attested: boolean) => void
  facts: DraftFacts
  setFacts: (facts: DraftFacts) => void
  setCurrent: (step: number) => void
}) {
  if (current === 2) return <CollectionForm items={items} setItems={setItems} noCollectionAttested={noCollectionAttested} setNoCollectionAttested={setNoCollectionAttested} setCurrent={setCurrent} />
  if (current === 3) return <PurposeForm items={items} setItems={setItems} noCollectionAttested={noCollectionAttested} setCurrent={setCurrent} />

  const yesNoOptions = [
    { value: '', label: '확인 필요' },
    { value: 'yes', label: '있음' },
    { value: 'no', label: '없음' },
  ]
  const retentionOptions = [
    { value: '', label: '확인 필요' },
    { value: 'applies', label: '보유함' },
    { value: 'none', label: '보유하지 않음' },
  ]
  const stepConfig: Record<number, { title: string; description: string; fields: FactField[] }> = {
    1: { title: '서비스 정보', description: '개인정보처리방침이 적용되는 서비스와 공개 위치를 확인합니다.', fields: [
      { key: 'serviceName', label: '서비스 이름', placeholder: '예: 서비스 이름' },
      { key: 'serviceUrl', label: '서비스 URL', placeholder: 'https://example.com', type: 'url' },
    ] },
    4: { title: '보유 기간', description: '개인정보 보유 여부를 먼저 확인하고, 실제 보유가 있는 경우 기간 또는 종료 조건을 기록합니다.', fields: [
      { key: 'retentionStatus', label: '개인정보 보유 여부', type: 'select', options: retentionOptions },
      { key: 'retentionPeriod', label: '대표 보유 기간 또는 종료 조건', placeholder: '예: 회원 탈퇴 시까지, 별도 보존 근거가 있는 항목은 해당 기간', visibleWhen: { key: 'retentionStatus', equals: 'applies' } },
    ] },
    5: { title: '제3자 제공', description: '제3자 제공 여부를 먼저 확인하고, 실제 제공이 있는 경우 제공받는 자와 목적을 기록합니다.', fields: [
      { key: 'thirdPartyStatus', label: '제3자 제공 여부', type: 'select', options: yesNoOptions },
      { key: 'thirdPartyRecipient', label: '제공받는 자', placeholder: '실제 제공받는 자', visibleWhen: { key: 'thirdPartyStatus', equals: 'yes' } },
      { key: 'thirdPartyPurpose', label: '제공 목적', placeholder: '실제 제공 목적', visibleWhen: { key: 'thirdPartyStatus', equals: 'yes' } },
    ] },
    6: { title: '국외 이전', description: '국외 이전 여부를 먼저 확인하고, 실제 이전이 있는 경우 국가와 수령자를 기록합니다.', fields: [
      { key: 'internationalStatus', label: '국외 이전 여부', type: 'select', options: yesNoOptions },
      { key: 'internationalCountry', label: '이전 국가', placeholder: '실제 이전 국가', visibleWhen: { key: 'internationalStatus', equals: 'yes' } },
      { key: 'internationalRecipient', label: '국외 수령자', placeholder: '실제 수령 법인 또는 서비스', visibleWhen: { key: 'internationalStatus', equals: 'yes' } },
    ] },
    7: { title: '개인정보 보호 담당자', description: '개인정보 관련 문의를 받을 책임자와 연락 채널을 기록합니다.', fields: [
      { key: 'privacyOfficerName', label: '담당자 또는 담당 부서', placeholder: '예: 개인정보보호 담당' },
      { key: 'privacyOfficerEmail', label: '연락 이메일', placeholder: 'privacy@example.com', type: 'email' },
    ] },
  }
  const config = stepConfig[current] ?? stepConfig[1]
  return <FactStep current={current} title={config.title} description={config.description} fields={config.fields} facts={facts} setFacts={setFacts} setCurrent={setCurrent} />
}

/** Projects verified authoring facts and deterministic readiness findings into the review draft. */
function DocumentPreview({ items, noCollectionAttested, facts, setCurrent }: { items: PolicyItem[]; noCollectionAttested: boolean; facts: DraftFacts; setCurrent: (step: number) => void }) {
  const review = useMemo(() => getReview(items, noCollectionAttested), [items, noCollectionAttested])
  const draftFindings = useMemo(() => getDraftReview(facts, noCollectionAttested), [facts, noCollectionAttested])
  const blockingCount = review.blockingCount + draftFindings.length
  return <section className="preview" aria-label="개인정보처리방침 미리보기" tabIndex={-1}>
    <div className="preview-title"><h2>개인정보처리방침 미리보기</h2><button className="outline" onClick={() => window.print()}>인쇄 미리보기 <ExternalLink size={14} /></button></div>
    <div className="meta"><span>근거 법령 <b>개인정보 보호법</b></span><span className={blockingCount ? 'warn-tag' : 'ok-tag'}>{blockingCount ? `검토 필요 ${blockingCount}` : '필수 확인 완료'}</span><span>버전 0.1.0</span></div>
    <article className="paper">
      <h2>{facts.serviceName || '개인정보처리방침'} (검토본)</h2>
      {facts.serviceUrl && <p>적용 서비스: {facts.serviceUrl}</p>}
      <p>{facts.serviceName || '서비스 운영자'}는 이용자의 개인정보를 중요하게 여기며, 확인된 실제 처리 사실을 바탕으로 다음 사항을 검토합니다.</p>
      <h3>제1조 (개인정보의 처리 목적)</h3>
      {noCollectionAttested ? <p>운영자는 현재 서비스에서 개인정보를 수집하지 않음으로 확인했습니다.</p> : <p>아래 목적은 작성자가 확인한 운영 사실을 기준으로 표시됩니다.</p>}
      <table><thead><tr><th>수집 항목</th><th>처리 목적</th><th>검토 상태</th></tr></thead><tbody>{review.enabled.map((item) => {
        const hasPurpose = item.purpose.trim().length > 0
        return <tr key={item.id}><td>{item.label}</td><td className={!hasPurpose ? 'missing' : ''}>{hasPurpose ? item.purpose : '처리 목적 입력 필요'}</td><td>{hasPurpose ? '입력됨' : '확인 필요'}</td></tr>
      })}</tbody></table>
      {review.selectionMissing && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>실제 수집 항목 또는 개인정보를 수집하지 않는다는 운영 사실이 아직 확인되지 않았습니다.<button className="outline" onClick={() => setCurrent(2)}>수집 항목 확인</button></span></div>}
      {review.collectionContradiction && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>수집하지 않음 확인과 선택된 수집 항목이 동시에 존재합니다.<button className="outline" onClick={() => setCurrent(2)}>수집 여부 확인</button></span></div>}
      {review.modeBlocking.length > 0 && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>{review.modeBlocking.map((item) => item.label).join(', ')}의 수집 구분을 확인해야 합니다.<button className="outline" onClick={() => setCurrent(2)}>수집 구분 확인</button></span></div>}
      {review.pathBlocking.length > 0 && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>{review.pathBlocking.map((item) => item.label).join(', ')}의 수집 경로를 확인해야 합니다.<button className="outline" onClick={() => setCurrent(2)}>수집 경로 확인</button></span></div>}
      {review.blocking.length > 0 && <div className="document-warning"><AlertTriangle size={18} /><span><b>공개 전 확인</b>{review.blocking.map((item) => item.label).join(', ')}의 처리 목적이 입력되지 않았습니다.<button className="outline" onClick={() => setCurrent(3)}>처리 목적 확인</button></span></div>}
      {draftFindings.map((finding) => <div className="document-warning" key={finding.code}><AlertTriangle size={18} /><span><b>공개 전 확인</b>{finding.label} 확인이 필요합니다.<button className="outline" onClick={() => setCurrent(finding.step)}>{steps[finding.step - 1]} 확인</button></span></div>)}
      <h3>제2조 (처리 및 보유 기간)</h3><p>{facts.retentionStatus === 'none' ? '보유하는 개인정보 없음으로 확인되었습니다.' : facts.retentionStatus === 'applies' ? facts.retentionPeriod || '보유 기간을 확인해야 합니다.' : '보유 여부 및 기간을 확인해야 합니다.'}</p>
      <h3>제3조 (제3자 제공)</h3><p>{facts.thirdPartyStatus === 'no' ? '제3자 제공 없음으로 확인되었습니다.' : facts.thirdPartyStatus === 'yes' ? `${facts.thirdPartyRecipient || '제공받는 자 확인 필요'}에 ${facts.thirdPartyPurpose || '제공 목적 확인 필요'}으로 제공하는 흐름을 검토 중입니다.` : '제3자 제공 여부를 확인하는 단계가 남아 있습니다.'}</p>
      <h3>제4조 (국외 이전)</h3><p>{facts.internationalStatus === 'no' ? '국외 이전 없음으로 확인되었습니다.' : facts.internationalStatus === 'yes' ? `${facts.internationalCountry || '국가 확인 필요'} · ${facts.internationalRecipient || '수령자 확인 필요'}` : '국외 이전 여부를 확인하는 단계가 남아 있습니다.'}</p>
      <h3>개인정보 보호 문의</h3><p>{facts.privacyOfficerName || '담당자 확인 필요'} · {facts.privacyOfficerEmail || '연락처 확인 필요'}</p>
    </article>
    <small className="legal-note">입력 내용은 검토본에 즉시 반영됩니다. 생성된 문서는 법률 자문이 아닙니다. 공개 전 책임자의 검토가 필요합니다.</small>
  </section>
}

/** Coordinates PolicyWeave browser-only authoring state and readiness feedback. */
export default function App() {
  const [items, setItems] = useState(initialItems)
  const [noCollectionAttested, setNoCollectionAttested] = useState(false)
  const [facts, setFacts] = useState(initialFacts)
  const [current, setCurrent] = useState(1)
  const collectionReview = useMemo(() => getReview(items, noCollectionAttested), [items, noCollectionAttested])
  const draftFindings = useMemo(() => getDraftReview(facts, noCollectionAttested), [facts, noCollectionAttested])
  const completedSteps = useMemo(() => getCompletedSteps(items, noCollectionAttested, facts), [items, noCollectionAttested, facts])
  const blockingCount = collectionReview.blockingCount + draftFindings.length
  const [message, setMessage] = useState('')
  function publish() { setMessage(blockingCount ? '필수 확인 항목을 먼저 입력하세요.' : '필수 확인이 완료되었습니다. 현재 검토본을 책임자와 검토하고 필요한 사실을 보완하세요.') }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top">PolicyWeave</a><span className="document-name">{facts.serviceName || '내 서비스'} 개인정보처리방침</span><span className="status">작성 중</span><span className="version">버전 0.1.0 (임시저장)</span><span className="save-state"><Check size={15} /> 브라우저 작업 중</span><button className="outline" disabled><Save size={15} /> JSON 내보내기 준비 중</button></header>
    <div className="workspace" id="top"><StepRail current={current} completedSteps={completedSteps} setCurrent={setCurrent} /><EditingPanel current={current} items={items} setItems={setItems} noCollectionAttested={noCollectionAttested} setNoCollectionAttested={setNoCollectionAttested} facts={facts} setFacts={setFacts} setCurrent={setCurrent} /><DocumentPreview items={items} noCollectionAttested={noCollectionAttested} facts={facts} setCurrent={setCurrent} /></div>
    <footer className="review-bar"><div><b>검토 요약</b><small>확인을 마친 뒤 공개 준비 상태를 확인하세요.</small></div><div className="review-stat blocking"><AlertTriangle size={21} /><span>필수 확인 <b>{blockingCount}건</b></span></div><div className="review-stat"><Check size={21} /><span>권장 검토 <b>{collectionReview.recommended.length}건</b></span></div><button className="primary publish" onClick={publish} disabled={blockingCount > 0}><Link size={16} /> 공개 준비 확인</button><output aria-live="polite">{message}</output></footer>
  </div>
}
