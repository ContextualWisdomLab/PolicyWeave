import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowPath = fileURLToPath(new URL('../.github/workflows/ci.yml', import.meta.url))
const workflowSource = readFileSync(workflowPath, 'utf8')

describe('repository CI concurrency contract', () => {
  it('cancels stale heads within the same pull request or branch', () => {
    expect(workflowSource).toMatch(/concurrency:\s*\n\s+group:\s*policyweave-ci-\$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/)
    expect(workflowSource).toMatch(/cancel-in-progress:\s*true/)
  })
})
