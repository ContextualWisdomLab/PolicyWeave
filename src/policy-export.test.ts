import { describe, expect, expectTypeOf, it } from 'vitest'
import { createPolicyExport, initialFacts, initialItems } from './policy'

describe('policy JSON export', () => {
  it('projects normalized operator facts into a deterministic versioned draft', () => {
    const items = initialItems.map((item) => item.id === 'email'
      ? { ...item, enabled: true, mode: '필수' as const, purpose: ' Account access ', detail: ' Signup form ' }
      : item)
    const facts = {
      ...initialFacts,
      serviceName: ' Buyer Portal ',
      serviceUrl: ' https://buyer.example.test/privacy ',
      retentionStatus: 'none' as const,
      thirdPartyStatus: 'no' as const,
      internationalStatus: 'no' as const,
      privacyOfficerName: ' Privacy Team ',
      privacyOfficerEmail: ' privacy@example.test ',
    }

    expect(createPolicyExport(items, false, facts)).toEqual({
      schema_version: 1,
      document_state: 'review_ready',
      policy_facts: {
        service_profile: {
          service_name: 'Buyer Portal',
          service_url: 'https://buyer.example.test/privacy',
        },
        no_collection_attested: false,
        collection_items: [{
          collection_item_key: 'email',
          collection_item_label: '이메일 주소',
          collection_mode: '필수',
          collection_path: 'Signup form',
          processing_purpose: 'Account access',
        }],
        retention: {
          retention_status: 'none',
          retention_period: null,
        },
        third_party_transfer: {
          transfer_status: 'no',
          recipient_name: null,
          transfer_purpose: null,
        },
        international_transfer: {
          transfer_status: 'no',
          destination_country: null,
          recipient_name: null,
        },
        privacy_contact: {
          contact_name: 'Privacy Team',
          contact_email: 'privacy@example.test',
        },
      },
      review_finding_codes: [],
    })
  })

  it('preserves unresolved state and finding codes without inventing facts', () => {
    const exported = createPolicyExport(initialItems, false, initialFacts)

    expect(exported.document_state).toBe('incomplete')
    expect(exported.policy_facts.collection_items).toEqual([])
    expect(exported.policy_facts.retention).toEqual({
      retention_status: null,
      retention_period: null,
    })
    expect(exported.review_finding_codes).toContain('collection_selection')
    expect(exported.review_finding_codes).toContain('service_name')
    expect(exported.review_finding_codes).toContain('retention_status')
  })

  it('keeps UI empty-string sentinels out of the portable schema types', () => {
    const exported = createPolicyExport(initialItems, false, initialFacts)

    expectTypeOf(exported.policy_facts.retention.retention_status).toEqualTypeOf<'applies' | 'none' | null>()
    expectTypeOf(exported.policy_facts.third_party_transfer.transfer_status).toEqualTypeOf<'yes' | 'no' | null>()
    expectTypeOf(exported.policy_facts.international_transfer.transfer_status).toEqualTypeOf<'yes' | 'no' | null>()
  })

  it('normalizes an unresolved collection mode without leaking the UI empty-string sentinel', () => {
    const items = initialItems.map((item) => item.id === 'email'
      ? { ...item, enabled: true, purpose: 'Account access', detail: 'Signup form' }
      : item)

    const exported = createPolicyExport(items, false, initialFacts)

    expect(exported.policy_facts.collection_items[0].collection_mode).toBeNull()
    expect(exported.review_finding_codes).toContain('collection_mode:email')
  })

  it('rejects query and fragment service URLs instead of rewriting the authored destination', () => {
    for (const serviceUrl of [
      'https://example.test/app?tenant=acme',
      'https://example.test/#/privacy',
      'https://example.test/privacy?',
      'https://example.test/privacy#',
      'https://example.test/privacy?access_token=query-secret#fragment-secret',
    ]) {
      const exported = createPolicyExport(initialItems, false, { ...initialFacts, serviceUrl })

      expect(exported.policy_facts.service_profile.service_url).toBeNull()
      expect(exported.review_finding_codes).toContain('service_url_format')
    }

    const secretExport = createPolicyExport(initialItems, false, {
      ...initialFacts,
      serviceUrl: 'https://example.test/privacy?access_token=query-secret#fragment-secret',
    })
    expect(JSON.stringify(secretExport)).not.toContain('query-secret')
    expect(JSON.stringify(secretExport)).not.toContain('fragment-secret')
  })

  it('does not export credentials embedded in an invalid service URL', () => {
    const exported = createPolicyExport(initialItems, false, {
      ...initialFacts,
      serviceUrl: 'https://operator:secret@example.test',
    })

    expect(exported.policy_facts.service_profile.service_url).toBeNull()
    expect(exported.review_finding_codes).toContain('service_url_format')
    expect(JSON.stringify(exported)).not.toContain('operator:secret')
  })
})
