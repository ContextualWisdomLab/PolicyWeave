import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

function mediaBlock(maxWidth: number) {
  const pattern = new RegExp(`@media \\(max-width: ${maxWidth}px\\) \\{([\\s\\S]*?)(?=\\n\\}\\n(?:\\n@media|$))`)
  const match = css.match(pattern)
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
