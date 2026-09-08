import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowPath = fileURLToPath(new URL('../.github/workflows/ci.yml', import.meta.url))
const runtimeTestPath = fileURLToPath(new URL('../db/tests/policy_revision_runtime.sh', import.meta.url))
const rollbackPath = fileURLToPath(new URL('../db/migrations/0001_policy_revision.down.sql', import.meta.url))

const workflowSource = readFileSync(workflowPath, 'utf8')
const runtimeTest = existsSync(runtimeTestPath) ? readFileSync(runtimeTestPath, 'utf8') : ''
const rollbackSql = existsSync(rollbackPath) ? readFileSync(rollbackPath, 'utf8') : ''

describe('PostgreSQL runtime evidence contract', () => {
  it('runs the migration against an immutable PostgreSQL 18 service', () => {
    expect(workflowSource).toMatch(/services:\s*\n\s+postgres:/)
    expect(workflowSource).toContain('postgres@sha256:d3e1620b530c944afa6e887d22eb899824da68e19c52024bf98f5220c88a65b2')
    expect(workflowSource).toMatch(/pg_isready -U policyweave_ci -d policyweave_test/)
    expect(workflowSource).toMatch(/run: sh db\/tests\/policy_revision_runtime\.sh/)
  })

  it('exercises the migration, rollback, idempotency, and deferred failures', () => {
    expect(runtimeTest).toContain('0001_policy_revision.sql')
    expect(runtimeTest).toContain('0001_policy_revision.down.sql')
    expect(runtimeTest).toMatch(/server_version_num[^\n]*180000/)
    expect(runtimeTest).toMatch(/upsert_collection_item[\s\S]*count\(\*\)/)
    expect(runtimeTest).toContain("stored_mode <> 'optional'")
    expect(runtimeTest).toContain("stored_path <> 'Account profile form'")
    expect(runtimeTest).toContain(
      "expect_failure no_collection_conflict 'no-collection confirmation conflicts with collection items'",
    )
    expect(runtimeTest).toContain(
      "expect_failure retention_rule_missing 'retention status applies requires a retention rule'",
    )
    expect(runtimeTest).toContain(
      "expect_failure revision_owner_change 'revision-owned facts cannot move between policy revisions'",
    )
    expect(runtimeTest).toMatch(/grep -F -- "\$expected_message" "\$failure_log"/)
  })

  it('removes every migration-owned object during rollback', () => {
    for (const objectName of [
      'upsert_collection_item',
      'enforce_policy_revision_facts',
      'processing_purpose',
      'retention_rule',
      'collection_item',
      'service_profile',
      'policy_revision',
      'collection_fact_mode',
      'retention_fact_status',
    ]) {
      expect(rollbackSql).toContain(objectName)
    }
  })
})
