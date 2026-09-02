# Legal and research traceability

Last reconciled: 2026-09-02

PolicyWeave treats legal and regulatory material as versioned evidence, not as implicit knowledge embedded in UI copy. The current MVP does not yet implement a legal/rule engine; this ledger therefore records source authority and the product capability that still needs to be derived and tested.

## Authoritative source register

| Source | Current evidence on 2026-09-02 | Product use | Implementation status |
| --- | --- | --- | --- |
| Republic of Korea, Personal Information Protection Act (개인정보 보호법), National Law Information Center | Current law: Act No. 20897, effective 2025-10-02. Enacted amendment: Act No. 21445, promulgated 2026-03-10. Its general amended provisions take effect 2026-09-11, while Article 32-2(1) proviso and Article 75(2)(15) take effect separately on 2027-07-01. Retrieved 2026-09-02 from the National Law Information Center; canonical amendment identifier: Act No. 21445 / legal-information sequence 283839. https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21445&ancYd=20260310&efYd=20260911&lsiSeq=283839 | Statutory authority and provision-level effective-date anchor for rule derivation | Registry only; no article-level rules are encoded yet. Future rule snapshots must bind each provision to its own effective date. |
| Republic of Korea, Enforcement Decree of the Personal Information Protection Act (개인정보 보호법 시행령), National Law Information Center | Presidential Decree No. 36121, promulgated 2026-02-19 and effective 2026-08-20. Retrieved 2026-09-02; canonical National Law Information Center legal-information sequence 283503. https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joNo=0032&lsiSeq=283503 | Subordinate-rule authority/effective-date anchor | Registry only; no decree-level rules are encoded yet. Future mappings must record the exact decree article and effective-date snapshot. |
| Personal Information Protection Commission. (2026, April 23). 개인정보 처리방침 작성지침(2026.4. 개정) [Guideline for writing privacy policies, April 2026 revision]. | PIPC marks this as the current guide. Retrieved 2026-09-02. https://pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS217&mCode=D010030000 | Authoring/review guidance and template requirement discovery | Source registered; requirement-by-requirement mapping still required |

## Accessibility standards traceability

W3C's WCAG 2.2 guidance states that authored visual focus indicators are subject to the Level AA non-text contrast requirement, and its Focus Visible guidance explicitly points focus indication to Success Criterion 1.4.11. The previous PolicyWeave focus color `#8eb59e` was approximately 2.27:1 against white, so it did not provide the 3:1 contrast expected for an authored focus indicator. Test-first commit `e5b77f1897ab13dd4f27ccd8b7fa724ba3e74bb0` required the high-contrast product token; production commit `e9e7dcc5c4160a70a9c483574fb651125589392d` moved generic and custom-checkbox focus outlines to `--green` (`#174f35`, approximately 9.52:1 against white); regression commit `ee73bc24e80b32851dcc6f519a457ca9d5efed56` computes the token contrast and enforces a minimum 3:1 ratio rather than relying only on literal CSS text. This is CSS-level evidence only; browser keyboard traversal, focus-not-obscured behavior, zoom, screen-reader behavior, and responsive screenshots remain open.

## APA 7 references

Personal Information Protection Commission. (2026, April 23). *개인정보 처리방침 작성지침(2026.4. 개정)* [Guideline for writing privacy policies, April 2026 revision]. https://pipc.go.kr/np/cop/bbs/selectBoardList.do?bbsId=BS217&mCode=D010030000

Republic of Korea. (2025). *개인정보 보호법* [Personal Information Protection Act] (Act No. 20897, effective October 2, 2025). National Law Information Center. https://www.law.go.kr/unSc.do?query=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8%EB%B2%95

Republic of Korea. (2026). *개인정보 보호법 일부개정법률* [Amendment to the Personal Information Protection Act] (Act No. 21445, promulgated March 10, 2026; general effective date September 11, 2026; Article 32-2(1) proviso and Article 75(2)(15) effective July 1, 2027). National Law Information Center. https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21445&ancYd=20260310&efYd=20260911&lsiSeq=283839

Republic of Korea. (2026). *개인정보 보호법 시행령* [Enforcement Decree of the Personal Information Protection Act] (Presidential Decree No. 36121, promulgated February 19, 2026, effective August 20, 2026; legal-information sequence 283503). National Law Information Center. https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joNo=0032&lsiSeq=283503

World Wide Web Consortium. (2025). *Understanding Success Criterion 1.4.11: Non-text contrast*. Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

World Wide Web Consortium. (2025). *Understanding Success Criterion 2.4.7: Focus visible*. Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html

## Traceability rules
1. Every future legal/rule/template implementation records source identifier, article/section where applicable, effective date, source revision or retrieval timestamp/digest, implementation symbol, and tests.
2. Future-effective law is never silently treated as already-effective law. A rule set declares the jurisdiction/effective-date snapshot it evaluates; provisions with distinct commencement dates remain distinct entries rather than inheriting a statute-level date.
3. Guidance is not promoted to statute, and product copy does not claim that following a guide guarantees compliance.
4. A source revision creates an explicit evaluation event against existing draft/published revisions; it does not mutate historical publication evidence.
5. LLM output, if later used to explain or propose wording, is never an authoritative legal source and cannot change review/publication state.

## Current gap
The seven-step workspace now captures the product's intended fact categories, but retention, third-party provision, international transfer, contact/controller information, and legal-basis review still need requirement-level mappings to the authoritative register, deterministic validation, and regression fixtures before PolicyWeave can claim those steps are legally complete. CSS-level focus contrast now has an executable regression contract, but browser-level accessibility evidence remains required before claiming WCAG conformance.
