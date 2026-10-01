// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createPolicyExport, initialFacts, initialItems } from './policy'

afterEach(cleanup)

function streamingFile(contents: string, name = 'policyweave-draft.json'): File {
  const file = new File([contents], name, { type: 'application/json' })
  Object.defineProperty(file, 'stream', {
    value: () => new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(contents))
        controller.close()
      },
    }),
  })
  return file
}

function byteStreamingFile(contents: Uint8Array, name = 'policyweave-draft.json'): File {
  const fileBuffer = new ArrayBuffer(contents.byteLength)
  new Uint8Array(fileBuffer).set(contents)
  const file = new File([fileBuffer], name, { type: 'application/json' })
  Object.defineProperty(file, 'stream', {
    value: () => new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(contents)
        controller.close()
      },
    }),
  })
  return file
}

function pendingStreamingFile(): {
  file: File
  completeRead: (contents: string) => void
  cancel: ReturnType<typeof vi.fn>
} {
  let settleRead!: (result: ReadableStreamReadResult<Uint8Array>) => void
  let readCount = 0
  const cancel = vi.fn(() => Promise.resolve())
  const reader = {
    read: vi.fn(() => {
      if (readCount++ > 0) return Promise.resolve({ done: true, value: undefined } as ReadableStreamReadResult<Uint8Array>)
      return new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => { settleRead = resolve })
    }),
    cancel,
    releaseLock: vi.fn(),
  }
  const file = new File(['pending'], 'policyweave-draft.json', { type: 'application/json' })
  Object.defineProperty(file, 'stream', { value: () => ({ getReader: () => reader }) })
  return {
    file,
    completeRead: (contents) => settleRead({ done: false, value: new TextEncoder().encode(contents) }),
    cancel,
  }
}

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
    const file = streamingFile(JSON.stringify(exported))
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
    const { file, completeRead } = pendingStreamingFile()
    const { container } = render(<App />)
    const importInput = container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!

    fireEvent.change(importInput, { target: { files: [file] } })

    expect(importInput.matches(':disabled')).toBe(true)
    expect(importInput.closest('.file-control')?.getAttribute('aria-disabled')).toBe('true')
    expect(container.querySelector('.save-state')?.getAttribute('aria-live')).toBe('polite')
    expect(container.querySelector('.save-state')?.hasAttribute('aria-busy')).toBe(false)
    expect(container.querySelector('.save-state')?.textContent).toContain('JSON \uCD08\uC548 \uD655\uC778 \uC911')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(true)

    completeRead(JSON.stringify(exported))
    await waitFor(() => expect(container.querySelector('.document-name')?.textContent).toContain('Restored Portal'))
    expect(importInput.closest('.file-control')?.getAttribute('aria-disabled')).toBe('false')
    expect(container.querySelector('.save-state')?.textContent).toContain('\uBE0C\uB77C\uC6B0\uC800 \uC791\uC5C5 \uC911')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(false)
  })

  it('cancels a pending read and ignores its late result', async () => {
    const exported = createPolicyExport(initialItems, true, {
      ...initialFacts,
      serviceName: 'Late Restore',
      serviceUrl: 'https://restored.example.test/privacy',
      retentionStatus: 'none',
      thirdPartyStatus: 'no',
      internationalStatus: 'no',
      privacyOfficerName: 'Privacy Team',
      privacyOfficerEmail: 'privacy@example.test',
    })
    const { file, completeRead, cancel } = pendingStreamingFile()
    const { container, getByRole } = render(<App />)
    const serviceName = container.querySelector<HTMLInputElement>('input[name="serviceName"]')!
    const importInput = container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!

    fireEvent.change(serviceName, { target: { value: 'Current Work' } })
    fireEvent.change(importInput, { target: { files: [file] } })
    fireEvent.click(getByRole('button', { name: 'JSON \uAC00\uC838\uC624\uAE30 \uCDE8\uC18C' }))

    expect(importInput.matches(':disabled')).toBe(false)
    expect(serviceName.matches(':disabled')).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(serviceName))
    expect(serviceName.value).toBe('Current Work')
    expect(container.querySelector('output')?.textContent).toContain('\uAC00\uC838\uC624\uAE30\uB97C \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4')
    expect(cancel).toHaveBeenCalledOnce()

    completeRead(JSON.stringify(exported))
    await Promise.resolve()
    expect(container.querySelector('.document-name')?.textContent).not.toContain('Late Restore')
    expect(container.querySelector('output')?.textContent).not.toContain('\uCD08\uC548\uC744 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4')
  })

  it('keeps current facts unchanged when an imported file fails validation', async () => {
    const { container } = render(<App />)
    fireEvent.change(container.querySelector<HTMLInputElement>('input[name="serviceName"]')!, { target: { value: 'Existing Service' } })
    const forged = streamingFile('{"schema_version":1,"document_state":"review_ready"}', 'forged.json')

    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, { target: { files: [forged] } })

    await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4'))
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.value).toBe('Existing Service')
    expect(container.querySelector<HTMLInputElement>('input[name="serviceName"]')?.matches(':disabled')).toBe(false)
  })

  it('keeps current facts unchanged when imported fact bytes are not valid UTF-8', async () => {
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
    const encoded = new TextEncoder().encode(JSON.stringify(exported))
    const marker = new TextEncoder().encode('Restored Portal')
    const markerStart = encoded.findIndex((_, index) => marker.every((byte, offset) => encoded[index + offset] === byte))
    expect(markerStart).toBeGreaterThanOrEqual(0)
    const corrupted = new Uint8Array(encoded.length + 1)
    corrupted.set(encoded.slice(0, markerStart))
    corrupted.set([0xc3, 0x28], markerStart)
    corrupted.set(encoded.slice(markerStart + 1), markerStart + 2)

    const { container } = render(<App />)
    const serviceName = container.querySelector<HTMLInputElement>('input[name="serviceName"]')!
    fireEvent.change(serviceName, { target: { value: 'Existing Service' } })
    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, {
      target: { files: [byteStreamingFile(corrupted, 'corrupted.json')] },
    })

    await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4'))
    expect(serviceName.value).toBe('Existing Service')
    expect(serviceName.matches(':disabled')).toBe(false)
  })

  it('rejects draft files larger than one mebibyte before parsing', async () => {
    const { container } = render(<App />)
    const oversized = new File(['x'.repeat((1024 * 1024) + 1)], 'oversized.json', { type: 'application/json' })

    fireEvent.change(container.querySelector<HTMLInputElement>('input[aria-label="JSON \uCD08\uC548 \uAC00\uC838\uC624\uAE30"]')!, { target: { files: [oversized] } })

    await waitFor(() => expect(container.querySelector('output')?.textContent).toContain('1 MiB'))
  })
})
