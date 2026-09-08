import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowPath = fileURLToPath(new URL('../.github/workflows/ci.yml', import.meta.url))
const restorePath = fileURLToPath(new URL('../db/tests/policy_revision_restore.sh', import.meta.url))

const workflowSource = readFileSync(workflowPath, 'utf8')
const restoreTest = existsSync(restorePath) ? readFileSync(restorePath, 'utf8') : ''

describe('PostgreSQL restart and restore evidence contract', () => {
  it('restarts the digest-pinned PostgreSQL service and reconnects without fabricated delays', () => {
    expect(restoreTest).toContain('docker restart')
    expect(restoreTest).toContain('pg_isready')
    expect(restoreTest).toContain('checkpoint')
    expect(restoreTest).not.toContain('pg_sleep')
    expect(restoreTest).not.toContain('sleep 5')
  })

  it('restores a custom dump after rollback and keeps collection independent from retention', () => {
    expect(restoreTest).toContain('--format=custom')
    expect(restoreTest).toContain('0001_policy_revision.down.sql')
    expect(restoreTest).toContain('pg_restore')
    expect(restoreTest).toContain("no_collection_confirmed = true")
    expect(restoreTest).toContain("retention_status = 'none'")
    expect(restoreTest).toContain("retention_status = 'applies'")
    expect(restoreTest).toContain('no-collection confirmation conflicts with collection items')
    expect(workflowSource).toContain('run: sh db/tests/policy_revision_restore.sh')
  })
})
