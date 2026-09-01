# Legal and research traceability

Last reconciled: 2026-09-01

PolicyWeave treats legal and regulatory material as versioned evidence, not as implicit knowledge embedded in UI copy. The current MVP does not yet implement a legal/rule engine; this ledger therefore records source authority and the product capability that still needs to be derived and tested.

## Authoritative source register

| Source | Current evidence on 2026-09-01 | Product use | Implementation status |
| --- | --- | --- | --- |
| Republic of Korea, Personal Information Protection Act (개인정보 보호법), National Law Information Center | The current act shown by the official search service is effective 2025-10-02; an enacted amendment is scheduled to take effect 2026-09-11. https://www.law.go.kr/unSc.do?query=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8%EB%B2%95 | Statutory authority/effective-date anchor for rule derivation | Registry only; no article-level rules are encoded yet |
| Republic of Korea, Enforcement Decree of the Personal Information Protection Act (개인정보 보호법 시행령), National Law Information Center | Official search service lists the decree effective 2026-08-20. Same official search URL as above. | Subordinate-rule authority/effective-date anchor | Registry only; no decree-level rules are encoded yet |
| Personal Information Protection Commission. (2026, April 23). 개인정보 처리방침 작성지침(2026.4. 개정) [Guideline for writing privacy policies, April 2026 revision]. | PIPC marks this as the current guide. https://pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS217&mCode=D010030000 | Authoring/review guidance and template requirement discovery | Source registered; requirement-by-requirement mapping still required |

## APA 7 references

Personal Information Protection Commission. (2026, April 23). *개인정보 처리방침 작성지침(2026.4. 개정)* [Guideline for writing privacy policies, April 2026 revision]. https://pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS217&mCode=D010030000

Republic of Korea. (2025). *개인정보 보호법* [Personal Information Protection Act] (Act No. 20897, effective October 2, 2025; future amendment Act No. 21445 effective September 11, 2026). National Law Information Center. https://www.law.go.kr/unSc.do?query=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8%EB%B2%95

Republic of Korea. (2026). *개인정보 보호법 시행령* [Enforcement Decree of the Personal Information Protection Act] (Presidential Decree No. 36121, effective August 20, 2026). National Law Information Center. https://www.law.go.kr/unSc.do?query=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8%EB%B2%95

## Traceability rules
1. Every future legal/rule/template implementation records source identifier, article/section where applicable, effective date, source revision or retrieval digest, implementation symbol, and tests.
2. Future-effective law is never silently treated as already-effective law. A rule set declares the jurisdiction/effective-date snapshot it evaluates.
3. Guidance is not promoted to statute, and product copy does not claim that following a guide guarantees compliance.
4. A source revision creates an explicit evaluation event against existing draft/published revisions; it does not mutate historical publication evidence.
5. LLM output, if later used to explain or propose wording, is never an authoritative legal source and cannot change review/publication state.

## Current gap
The seven-step workspace now captures the product's intended fact categories, but retention, third-party provision, international transfer, contact/controller information, and legal-basis review still need requirement-level mappings to the authoritative register, deterministic validation, and regression fixtures before PolicyWeave can claim those steps are legally complete.
