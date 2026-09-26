// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createPolicyExport, initialFacts, initialItems } from './policy'

afterEach(cleanup)

describe('policy draft import UI', () => {
  it('restores a validated schema-v1 draft into the workspace', async () => {
    const exported = createPolicyExport(initialItems, true, {
      ...initialFacts,
      serviceName: 'Restored Portal',
      serviceUrl: 'https://restored.example.test/privacy',
      retentionStatus: 'none',
      thirdPartyStatus: 'no',
      internationalStatus: 'no',
      privacyOfficerName: 'Privacy Team',
      privacyOfficerEmail: 'privacy@example.test',
    })
    const file = new File([JSON.stringify(exported)], 'policyweave-draft.json', { type: 'application/json' })
    const { container } = render(<App />)

    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, { target: { files: [file] } })

    await waitFor(() => expect(container.querySelector('.document-name')?.textContent).toContain('Restored Portal'))
    expect(container.querySelector('output')?.textContent).toContain('\uCD08\uC548\uC744 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4')
    expect(container.querySelector('.review-stat.blocking b')?.textContent).toBe('0\uAC74')
  })

  it('locks authoring controls while a selected draft is being read', async () => {
    const exported = createPolicyExport(initialItems, true, {
      ...initialFacts,
      serviceName: 'Restored Portal',
      serviceUrl: 'https://restored.example.test/privacy',
      retentionStatus: 'none',
      thirdPartyStatus: 'no',
      internationalStatus: 'no',
      privacyOfficerName: 'Privacy Team',
      privacyOfficerEmail: 'privacy@example.test',
    })
    let completeRead!: (contents: string) => void
    const contents = new Promise<string>((resolve) => { completeRead = resolve })
    const file = new File(['pending'], 'policyweave-draft.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => contents })
    const { container } = render(<App />)
    const importInput = container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!

    fireEvent.change(importInput, { target: { files: [file] } })

    expect(importInput.matches(':disabled')).toBe(true)
    expect(importInput.closest('.file-control')?.getAttribute('aria-disabled')).toBe('true')
    expect(container.querySelector('.save-state')?.getAttribute('aria-live')).toBe('polite')
    expect(container.querySelector('.save-state')?.textContent).toContain('JSON \uCD08\uC548 \uD655\uC778 \uC911')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(true)

    completeRead(JSON.stringify(exported))
    await waitFor(() => expect(container.querySelector('.document-name')?.textContent).toContain('Restored Portal'))
    expect(importInput.closest('.file-control')?.getAttribute('aria-disabled')).toBe('false')
    expect(container.querySelector('.save-state')?.textContent).toContain('\uBE0C\uB77C\uC6B0\uC800 \uC791\uC5C5 \uC911')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(false)
  })

  it('keeps current facts unchanged when an imported file fails validation', async () => {
    const { container } = render(<App />)
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: 'Existing Service' } })
    const forged = new File(['{"schema_version":1,"document_state":"review_ready"}'], 'forged.json', { type: 'application/json' })

    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, { target: { files: [forged] } })

    await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4'))
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.value).toBe('Existing Service')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(false)
  })

  it('rejects draft files larger than one mebibyte before parsing', async () => {
    const { container } = render(<App />)
    const oversized = new File(['x'.repeat((1024 * 1024) + 1)], 'oversized.json', { type: 'application/json' })

    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, { target: { files: [oversized] } })

    await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('1 MiB'))
  })
})
