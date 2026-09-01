# PolicyWeave

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ContextualWisdomLab/PolicyWeave)

웹·앱 운영자가 실제 개인정보 처리 흐름을 입력하면, 누락과 모순을 표시하면서 개인정보처리방침 검토본을 만드는 로컬 우선 웹 앱입니다.

> 생성 결과는 법률 자문이나 준법 보장이 아닙니다. 공개 전 개인정보보호책임자 또는 법률 전문가의 검토가 필요합니다.

## 실행

```bash
npm install
npm run dev
```

검증은 `npm run lint`, `npm test`, `npm run build`로 수행합니다.

## 현재 범위

- 7단계 작성 흐름과 진행 상태
- 개인정보 수집 항목 선택 및 필수/선택 구분
- 조건부 상세 입력
- 실시간 검토본과 법적 근거 표시
- 차단 오류와 권장 검토 항목 구분
- 반응형 작성/미리보기 전환

제품 요구사항과 결정 기록은 [`docs/PRD.md`](docs/PRD.md), [`docs/ADR-0001-policy-as-data.md`](docs/ADR-0001-policy-as-data.md)에 있습니다.
