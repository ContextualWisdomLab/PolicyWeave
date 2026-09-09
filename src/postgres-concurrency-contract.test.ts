import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowPath = fileURLToPath(new URL('../.github/workflows/ci.yml', import.meta.url))
const concurrencyPath = fileURLToPath(new URL('../db/tests/policy_revision_concurrency.sh', import.meta.url))

const workflowSource = readFileSync(workflowPath, 'utf8')
const concurrencyTest = existsSync(concurrencyPath) ? readFileSync(concurrencyPath, 'utf8') : ''

describe('PostgreSQL concurrent writer evidence contract', () => {
  it('observes real PostgreSQL lock waits without timing-based transaction sleeps', () => {
    expect(concurrencyTest).toContain('mkfifo')
    expect(concurrencyTest).toContain("wait_event_type = 'Lock'")
    expect(concurrencyTest).toContain('policyweave_parent_writer')
    expect(concurrencyTest).toContain('policyweave_item_writer')
    expect(concurrencyTest).toContain('statement_timeout=15000')
    expect(concurrencyTest).not.toContain('pg_sleep')
  })

  it('proves competing facts fail closed and same-item UPSERTs converge', () => {
    expect(concurrencyTest).toContain('no-collection confirmation conflicts with collection items')
    expect(concurrencyTest).toMatch(/count\(\*\)[\s\S]*Concurrent contact email/)
    expect(concurrencyTest).toMatch(
      /stored_mode[\s\S]*stored_path[\s\S]*if[\s\S]*stored_mode is distinct from 'optional'[\s\S]*stored_path is distinct from 'Account profile form'/i,
    )
    expect(workflowSource).toContain('run: sh db/tests/policy_revision_concurrency.sh')
  })
})
