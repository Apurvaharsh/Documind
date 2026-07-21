// A single feedback line, so status and errors do not each invent their own box.
function Toast({ message, tone = 'info', onDismiss }) {
  if (!message) {
    return null
  }

  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-line bg-surface text-ink-soft'

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}
    >
      <span className="min-w-0">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-xs opacity-60 hover:opacity-100"
      >
        Close
      </button>
    </div>
  )
}

export default Toast
