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

describe('responsive review workspace CSS contract', () => {
  it('keeps the policy preview available through tablet widths', () => {
    const tablet = mediaBlock(1300)
    expect(tablet).toContain('.preview { display: block;')
  })

  it('places mobile publish output in normal flow across the full review bar', () => {
    const mobile = mediaBlock(720)
    expect(mobile).toContain('.review-bar output { position: static; grid-column: 1 / -1;')
  })
})
