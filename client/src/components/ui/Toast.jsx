import { useEffect } from 'react'
import { IconAlert, IconCheck, IconX } from './icons'

const AUTO_DISMISS_MS = 5000

const TONES = {
  info: {
    shell: 'border-line bg-surface text-ink',
    plate: 'bg-ok-soft text-ok',
    Icon: IconCheck,
  },
  error: {
    shell: 'border-danger-line bg-surface text-ink',
    plate: 'bg-danger-soft text-danger',
    Icon: IconAlert,
  },
}

/**
 * Floats above the layout rather than sitting in the flow. Inline, it pushed
 * the chat view down and clipped the composer, and every status message
 * shifted the page underneath the pointer.
 *
 * The surface stays neutral in both tones and the colour is carried by the
 * icon plate alone. A fully tinted panel at this size is a shout; the plate
 * says the same thing at conversational volume.
 */
function Toast({ message, tone = 'info', onDismiss }) {
  // Errors stay until dismissed — they usually need reading. Status messages
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

  const { shell, plate, Icon } = TONES[tone] || TONES.info

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4">
      <div
        // A live region so the message is announced, not just shown. Errors
        // interrupt; status messages wait for a gap.
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        className={`animate-fade-up pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border py-2.5 pl-2.5 pr-2.5 shadow-lg ${shell}`}
      >
        <span className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${plate}`}>
          <Icon className="h-4 w-4" />
        </span>

        <p className="min-w-0 py-1 text-sm leading-5">{message}</p>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default Toast
