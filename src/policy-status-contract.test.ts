import { strict as assert } from 'node:assert'
import { describe, it } from 'vitest'
import { createPolicyExport, getCompletedSteps, getDraftReview, getReview, initialFacts, initialItems } from './policy'
import type { CollectionMode, DraftFacts, PolicyItem } from './policy'

const readyFacts: DraftFacts = {
  ...initialFacts,
  serviceName: 'Example service',
  serviceUrl: 'https://example.test/',
  retentionStatus: 'none',
  thirdPartyStatus: 'no',
  internationalStatus: 'no',
  privacyOfficerName: 'Privacy contact',
  privacyOfficerEmail: 'privacy@example.test',
}
const readyItems: PolicyItem[] = [{
  ...initialItems[2],
  enabled: true,
  mode: '필수',
  purpose: 'Account verification',
  detail: 'Account registration form',
}]

// Deliberately cross the compile-time boundary: assertions do not validate runtime input.
const invalidStatuses: ReadonlyArray<readonly [string, unknown]> = [
  ['unknown token', 'unchecked'],
  ['foreign vocabulary', 'required'],
  ['case variant', 'YES'],
  ['padded transfer status', ' no '],
  ['padded retention status', 'applies '],
  ['padded collection mode', '필수 '],
  ['empty sentinel', ''],
  ['whitespace', '\t'],
  ['null', null],
  ['undefined', undefined],
  ['true', true],
  ['false', false],
  ['nonzero number', 1],
  ['zero', 0],
  ['object', {}],
  ['array', []],
]
const statusContracts = [
  { fieldName: 'retentionStatus', findingCode: 'retention_status', stepNumber: 4 },
  { fieldName: 'thirdPartyStatus', findingCode: 'third_party_status', stepNumber: 5 },
  { fieldName: 'internationalStatus', findingCode: 'international_status', stepNumber: 6 },
] as const

describe('runtime policy status admission', () => {
  for (const { fieldName, findingCode, stepNumber } of statusContracts) {
    for (const [caseName, invalidStatus] of invalidStatuses) {
      it(`keeps ${fieldName} unresolved for ${caseName}`, () => {
        const sourceFacts = { ...readyFacts, [fieldName]: invalidStatus } as DraftFacts
        const originalFacts = structuredClone(sourceFacts)
        const draftFindings = getDraftReview(sourceFacts)
        assert.deepEqual(draftFindings.map((finding) => finding.code), [findingCode])
        assert.equal(draftFindings[0].step, stepNumber)
        assert.equal(getCompletedSteps(initialItems, true, sourceFacts).has(stepNumber), false)

        const draftExport = createPolicyExport(initialItems, true, sourceFacts)
        const exportedStatuses = {
          retentionStatus: draftExport.policy_facts.retention.retention_status,
          thirdPartyStatus: draftExport.policy_facts.third_party_transfer.transfer_status,
          internationalStatus: draftExport.policy_facts.international_transfer.transfer_status,
        }
        assert.equal(draftExport.document_state, 'incomplete')
        assert.deepEqual(draftExport.review_finding_codes, [findingCode])
        assert.equal(exportedStatuses[fieldName], null)
        assert.deepEqual(sourceFacts, originalFacts)
        assert.deepEqual(createPolicyExport(initialItems, true, sourceFacts), draftExport)
      })
    }
  }

  for (const [caseName, invalidStatus] of invalidStatuses) {
    it(`keeps collection mode unresolved for ${caseName}`, () => {
      const sourceItems = [{ ...readyItems[0], mode: invalidStatus as CollectionMode }]
      const originalItems = structuredClone(sourceItems)
      const collectionReview = getReview(sourceItems)
      assert.equal(collectionReview.blockingCount, 1)
      assert.deepEqual(collectionReview.modeBlocking, sourceItems)
      const completedSteps = getCompletedSteps(sourceItems, false, readyFacts)
      assert.equal(completedSteps.has(2), false)
      assert.equal(completedSteps.has(3), true)
      const draftExport = createPolicyExport(sourceItems, false, readyFacts)
      assert.equal(draftExport.document_state, 'incomplete')
      assert.deepEqual(draftExport.review_finding_codes, ['collection_mode:phone'])
      assert.equal(draftExport.policy_facts.collection_items[0].collection_mode, null)
      assert.equal(draftExport.policy_facts.collection_items[0].processing_purpose, readyItems[0].purpose)
      assert.equal(draftExport.policy_facts.collection_items[0].collection_path, readyItems[0].detail)
      assert.deepEqual(sourceItems, originalItems)
    })
  }

  for (const collectionMode of ['필수', '선택'] as const) {
    for (const retentionStatus of ['applies', 'none'] as const) {
      for (const thirdPartyStatus of ['yes', 'no'] as const) {
        for (const internationalStatus of ['yes', 'no'] as const) {
          it(`preserves admitted ${collectionMode}/${retentionStatus}/${thirdPartyStatus}/${internationalStatus} facts`, () => {
            const sourceItems = [{ ...readyItems[0], mode: collectionMode }]
            const sourceFacts: DraftFacts = {
              ...readyFacts,
              retentionStatus,
              retentionPeriod: 'Until account deletion',
              thirdPartyStatus,
              thirdPartyRecipient: 'Example recipient',
              thirdPartyPurpose: 'Support delivery',
              internationalStatus,
              internationalCountry: 'Example destination',
              internationalRecipient: 'Example processor',
            }
            const draftExport = createPolicyExport(sourceItems, false, sourceFacts)
            assert.equal(draftExport.document_state, 'review_ready')
            assert.deepEqual(draftExport.review_finding_codes, [])
            assert.equal(getCompletedSteps(sourceItems, false, sourceFacts).size, 7)
            assert.equal(draftExport.policy_facts.collection_items[0].collection_mode, collectionMode)
            assert.deepEqual(draftExport.policy_facts.retention, {
              retention_status: retentionStatus,
              retention_period: retentionStatus === 'applies' ? sourceFacts.retentionPeriod : null,
            })
            assert.deepEqual(draftExport.policy_facts.third_party_transfer, {
              transfer_status: thirdPartyStatus,
              recipient_name: thirdPartyStatus === 'yes' ? sourceFacts.thirdPartyRecipient : null,
              transfer_purpose: thirdPartyStatus === 'yes' ? sourceFacts.thirdPartyPurpose : null,
            })
            assert.deepEqual(draftExport.policy_facts.international_transfer, {
              transfer_status: internationalStatus,
              destination_country: internationalStatus === 'yes' ? sourceFacts.internationalCountry : null,
              recipient_name: internationalStatus === 'yes' ? sourceFacts.internationalRecipient : null,
            })
          })
        }
      }
    }
  }

  it('does not let an inactive invalid mode block an explicitly no-collection draft', () => {
    const sourceItems = [{ ...readyItems[0], enabled: false, mode: 'invalid' as CollectionMode }]
    const draftExport = createPolicyExport(sourceItems, true, readyFacts)
    assert.equal(draftExport.document_state, 'review_ready')
    assert.deepEqual(draftExport.policy_facts.collection_items, [])
  })
})
