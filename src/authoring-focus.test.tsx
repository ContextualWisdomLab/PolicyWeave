// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { AuthoringFocusController } from './AuthoringFocusController'

afterEach(cleanup)

function renderAuthoringWorkspace() {
  return render(<><AuthoringFocusController /><App /></>)
}

async function expectActiveStepHeading(container: HTMLElement, text: string) {
  await waitFor(() => {
    const heading = container.querySelector<HTMLElement>('.form-panel .section-head h1')
    expect(heading?.textContent).toBe(text)
    expect(document.activeElement).toBe(heading)
    expect(heading?.tabIndex).toBe(-1)
  })
}

describe('authoring focus transitions', () => {
  it('moves focus to the newly selected step heading from the authoring rail', async () => {
    const { container } = renderAuthoringWorkspace()
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])

    await expectActiveStepHeading(container, '1. 서비스 정보')
  })

  it('moves focus to the next step heading after sequential navigation', async () => {
    const { container } = renderAuthoringWorkspace()
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    await expectActiveStepHeading(container, '1. 서비스 정보')

    fireEvent.click(container.querySelector<HTMLButtonElement>('.form-actions .primary')!)

    await expectActiveStepHeading(container, '2. 수집 항목')
  })

  it('moves focus to the owning step when a review warning is activated', async () => {
    const { container } = renderAuthoringWorkspace()
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.rail li button')[0])
    await expectActiveStepHeading(container, '1. 서비스 정보')

    const warningButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.document-warning button'))
      .find((button) => button.textContent?.includes('수집 항목'))!
    fireEvent.click(warningButton)

    await expectActiveStepHeading(container, '2. 수집 항목')
  })
})
