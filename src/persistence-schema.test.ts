import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migrationPath = fileURLToPath(new URL('../db/migrations/0001_policy_revision.sql', import.meta.url))
const migrationSql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : ''
const gapBaselinePath = fileURLToPath(new URL('../docs/product-technical-gap-baseline.md', import.meta.url))
const gapBaseline = readFileSync(gapBaselinePath, 'utf8')

describe('PostgreSQL policy revision schema', () => {
  it('versions policy revisions within a tenant account', () => {
    expect(migrationSql).toMatch(/create table policy_revision\s*\([\s\S]*policy_revision_id uuid primary key/i)
    expect(migrationSql).toMatch(/unique\s*\(tenant_account_id, revision_number\)/i)
    expect(migrationSql).toMatch(/no_collection_confirmed boolean not null/i)
    expect(migrationSql).toMatch(/retention_status retention_fact_status not null/i)
  })

  it('normalizes revision-owned collection, purpose, and retention facts', () => {
    for (const tableName of ['service_profile', 'collection_item', 'processing_purpose', 'retention_rule']) {
      expect(migrationSql).toContain(`create table ${tableName}`)
    }

    expect(migrationSql).toMatch(/foreign key \(policy_revision_id, collection_item_key\)[\s\S]*references collection_item/i)
  })

  it('fails closed on contradictory collection and retention state at commit', () => {
    expect(migrationSql).toMatch(/create constraint trigger policy_revision_fact_contract/i)
    expect(migrationSql).toMatch(/create constraint trigger collection_item_fact_contract[\s\S]*on collection_item/i)
    expect(migrationSql).toMatch(/create constraint trigger retention_rule_fact_contract[\s\S]*on retention_rule/i)
    expect(migrationSql).toMatch(/deferrable initially deferred/i)
    expect(migrationSql).toMatch(/no_collection_confirmed[\s\S]*exists\s*\([\s\S]*from collection_item/i)
    expect(migrationSql).toMatch(/retention_status = 'applies'[\s\S]*from retention_rule/i)
  })

  it('serializes fact checks without conflicting with foreign-key key-share locks', () => {
    expect(migrationSql).toMatch(/from policy_revision as revision[\s\S]*for no key update;/i)
  })

  it('rejects moving a fact to another policy revision', () => {
    expect(migrationSql).toMatch(/old\.policy_revision_id is distinct from new\.policy_revision_id/i)

    for (const tableName of ['service_profile', 'collection_item', 'processing_purpose', 'retention_rule']) {
      expect(migrationSql).toMatch(new RegExp(`create constraint trigger ${tableName}_fact_contract[\\s\\S]*on ${tableName}`, 'i'))
    }
  })

  it('declares item-level UPSERT idempotency on the revision natural key', () => {
    expect(migrationSql).toMatch(/create function upsert_collection_item/i)
    expect(migrationSql).toMatch(/on conflict \(policy_revision_id, collection_item_key\)[\s\S]*do update/i)
  })

  it('documents the same-transaction retention transition contract', () => {
    expect(gapBaseline).toMatch(/transitioning away from `applies`[\s\S]*same transaction/i)
    expect(gapBaseline).toMatch(/retained[^.]*`retention_rule`[^.]*deferred constraint[^.]*reject/i)
  })

  it('binds action-runtime evidence to immutable heads without a recursive current-head claim', () => {
    const actionEvidence = gapBaseline.split('Action-runtime cleanup')[1]?.split('## Current baseline')[0] ?? ''

    expect(actionEvidence).toContain('head `23b3a1c7429aca2ea39e153c6504beee9d507d39` CI `34179633214`')
    expect(actionEvidence).toContain('head `fba59b85c5ce33813147939f8124cb2d69b184a1` CI `34180350163`')
    expect(actionEvidence).toContain('artifact `10038696518`')
    expect(actionEvidence).toContain('sha256:f31fd4d0dee1164e76e0841f01cc2c5f6f9ce73c6b07fc08e98ac9bd4b333fa8')
    expect(actionEvidence).not.toMatch(/Exact-head CI/)
  })

})
