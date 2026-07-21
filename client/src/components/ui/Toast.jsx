import { useEffect } from 'react'

const AUTO_DISMISS_MS = 5000

/**
 * Floats above the layout rather than sitting in the flow. Inline, it pushed
 * the chat view down and clipped the composer, and every status message
 * shifted the page underneath the pointer.
 */
function Toast({ message, tone = 'info', onDismiss }) {
  // Errors stay until dismissed - they usually need reading. Status messages
  // are transient and clear themselves.
  useEffect(() => {
    if (!message || tone === 'error') {
      return undefined
    }

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message, tone, onDismiss])

  if (!message) {
    return null
  }

  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-line bg-surface text-ink-soft'

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex max-w-lg items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm shadow-sm ${styles}`}
      >
        <span className="min-w-0">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-xs opacity-60 transition-opacity hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default Toast
