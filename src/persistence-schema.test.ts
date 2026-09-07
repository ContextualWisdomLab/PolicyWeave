import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migrationPath = fileURLToPath(new URL('../db/migrations/0001_policy_revision.sql', import.meta.url))
const migrationSql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : ''

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
    expect(migrationSql).toMatch(/deferrable initially deferred/i)
    expect(migrationSql).toMatch(/no_collection_confirmed[\s\S]*exists\s*\([\s\S]*from collection_item/i)
    expect(migrationSql).toMatch(/retention_status = 'applies'[\s\S]*from retention_rule/i)
  })

  it('declares item-level UPSERT idempotency on the revision natural key', () => {
    expect(migrationSql).toMatch(/create function upsert_collection_item/i)
    expect(migrationSql).toMatch(/on conflict \(policy_revision_id, collection_item_key\)[\s\S]*do update/i)
  })
})
