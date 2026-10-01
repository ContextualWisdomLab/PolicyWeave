/** Reads a local draft through the browser stream so operator cancellation reaches the source reader. */
export async function readLocalDraft(file: Blob, signal: AbortSignal): Promise<string> {
  const reader = file.stream().getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let aborted = signal.aborted
  const abortRead = () => {
    aborted = true
    void reader.cancel(signal.reason).catch(() => undefined)
  }
  signal.addEventListener('abort', abortRead, { once: true })

  try {
    if (aborted) {
      await reader.cancel(signal.reason).catch(() => undefined)
      throw new DOMException('Local draft read cancelled', 'AbortError')
    }

    let contents = ''
    while (true) {
      const { done, value } = await reader.read()
      if (aborted) throw new DOMException('Local draft read cancelled', 'AbortError')
      if (done) return contents + decoder.decode()
      contents += decoder.decode(value, { stream: true })
    }
  } catch (error) {
    if (aborted) throw new DOMException('Local draft read cancelled', 'AbortError')
    throw error
  } finally {
    signal.removeEventListener('abort', abortRead)
    reader.releaseLock()
  }
}
