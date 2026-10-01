import { describe, expect, it, vi } from 'vitest'
import { readLocalDraft } from './local-draft-reader'

function streamBackedBlob(stream: ReadableStream<Uint8Array>): Blob {
  return { stream: () => stream } as Blob
}

describe('local draft reader', () => {
  it('preserves UTF-8 characters split across browser stream chunks', async () => {
    const encoded = new TextEncoder().encode('{"service_name":"정책"}')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, encoded.length - 3))
        controller.enqueue(encoded.slice(encoded.length - 3))
        controller.close()
      },
    })

    await expect(readLocalDraft(streamBackedBlob(stream), new AbortController().signal))
      .resolves.toBe('{"service_name":"정책"}')
  })

  it('rejects ill-formed UTF-8 instead of replacing corrupted fact bytes', async () => {
    const prefix = new TextEncoder().encode('{"service_name":"')
    const suffix = new TextEncoder().encode('uyer"}')
    const corrupted = new Uint8Array(prefix.length + 2 + suffix.length)
    corrupted.set(prefix)
    corrupted.set([0xc3, 0x28], prefix.length)
    corrupted.set(suffix, prefix.length + 2)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(corrupted)
        controller.close()
      },
    })

    await expect(readLocalDraft(streamBackedBlob(stream), new AbortController().signal))
      .rejects.toBeInstanceOf(TypeError)
  })

  it('cancels the underlying browser reader and rejects a pending read', async () => {
    let settleRead!: (result: ReadableStreamReadResult<Uint8Array>) => void
    const cancel = vi.fn(() => {
      settleRead({ done: true, value: undefined })
      return Promise.resolve()
    })
    const reader = {
      read: vi.fn(() => new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => { settleRead = resolve })),
      cancel,
      releaseLock: vi.fn(),
    }
    const file = { stream: () => ({ getReader: () => reader }) } as unknown as Blob
    const controller = new AbortController()

    const pendingRead = readLocalDraft(file, controller.signal)
    controller.abort('operator cancelled')

    await expect(pendingRead).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancel).toHaveBeenCalledOnce()
    expect(reader.releaseLock).toHaveBeenCalledOnce()
  })

  it('does not resolve with a late chunk after cancellation', async () => {
    let settleRead!: (result: ReadableStreamReadResult<Uint8Array>) => void
    const reader = {
      read: vi.fn(() => new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => { settleRead = resolve })),
      cancel: vi.fn(() => Promise.resolve()),
      releaseLock: vi.fn(),
    }
    const file = { stream: () => ({ getReader: () => reader }) } as unknown as Blob
    const controller = new AbortController()

    const pendingRead = readLocalDraft(file, controller.signal)
    controller.abort()
    settleRead({ done: false, value: new TextEncoder().encode('{"late":true}') })

    await expect(pendingRead).rejects.toMatchObject({ name: 'AbortError' })
  })
})
