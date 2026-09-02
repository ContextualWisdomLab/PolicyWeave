import { useEffect } from 'react'

/**
 * Transfers focus to the active authoring-step heading after explicit step navigation.
 *
 * PolicyWeave replaces the editing panel when the operator uses the step rail, sequential
 * previous/next controls, or a review warning. Moving focus to the new heading keeps keyboard and
 * assistive-technology context aligned with the visible step without stealing focus from ordinary
 * form controls or from the dedicated preview shortcut.
 */
export function AuthoringFocusController() {
  useEffect(() => {
    const pendingFocusTransfers = new Set<number>()

    const handleNavigationClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const button = event.target.closest('button')
      if (!(button instanceof HTMLButtonElement)) return
      if (!button.closest('.rail li, .form-actions, .document-warning')) return

      const timer = window.setTimeout(() => {
        pendingFocusTransfers.delete(timer)
        const heading = document.querySelector<HTMLElement>('.form-panel .section-head h1')
        if (!heading) return
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }, 0)
      pendingFocusTransfers.add(timer)
    }

    document.addEventListener('click', handleNavigationClick)
    return () => {
      document.removeEventListener('click', handleNavigationClick)
      pendingFocusTransfers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return null
}
