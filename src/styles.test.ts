import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

const mediaPatterns = {
  1300: /@media \(max-width: 1300px\) \{([\s\S]*?)(?=\n\}\n(?:\n@media|$))/,
  720: /@media \(max-width: 720px\) \{([\s\S]*?)(?=\n\}\n(?:\n@media|$))/,
} as const

function mediaBlock(maxWidth: keyof typeof mediaPatterns) {
  const match = css.match(mediaPatterns[maxWidth])
  if (!match) throw new Error(`Missing max-width ${maxWidth}px media block`)
  return match[1]
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255)
  if (!channels || channels.length !== 3) throw new Error(`Invalid RGB hex: ${hex}`)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(left: string, right: string) {
  const luminances = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a)
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

describe('responsive review workspace CSS contract', () => {
  it('keeps the policy preview available through tablet widths', () => {
    const tablet = mediaBlock(1300)
    expect(tablet).toContain('.preview { display: block;')
  })

  it('places mobile publish output in normal flow across the full review bar', () => {
    const mobile = mediaBlock(720)
    expect(mobile).toContain('.review-bar output { position: static; grid-column: 1 / -1;')
  })

  it('uses a focus token that preserves at least 3:1 contrast against white', () => {
    const green = css.match(/--green:\s*(#[0-9a-fA-F]{6});/)?.[1]
    expect(green).toBeDefined()
    expect(contrastRatio(green!, '#ffffff')).toBeGreaterThanOrEqual(3)
    expect(css).toContain(':focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }')
    expect(css).toContain('.check-label input:focus-visible + .box { outline: 3px solid var(--green); outline-offset: 2px; }')
    expect(css).toContain('.file-control:focus-within { outline: 3px solid var(--green); outline-offset: 2px; }')
  })

  it('keeps the local-file control visibly interactive and touch-sized', () => {
    expect(css).toContain('.file-control { min-height: 44px; cursor: pointer; }')
  })

  it('keeps the authoring fieldset as a semantic grid item', () => {
    const editingLock = css.match(/\.editing-lock\s*\{([^}]*)\}/)?.[1]
    expect(editingLock).toBeDefined()
    expect(editingLock).not.toContain('display: contents')
    expect(editingLock).toContain('min-width: 0')
    expect(editingLock).toContain('margin: 0')
    expect(editingLock).toContain('padding: 0')
    expect(editingLock).toContain('border: 0')
    expect(css).toContain('.editing-lock .form-panel { height: 100%; }')
  })

  it('keeps muted small text above 4.5:1 on every authored surface', () => {
    const muted = css.match(/--muted:\s*(#[0-9a-fA-F]{6});/)?.[1]
    expect(muted).toBeDefined()
    for (const background of ['#ffffff', '#f4f7f4', '#f7f8f7', '#eef1ee']) {
      expect(contrastRatio(muted!, background)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
