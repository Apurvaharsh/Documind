/**
 * Document state, and nothing else.
 *
 * The four tones resolve through semantic tokens, so neither this file nor any
 * caller needs a `dark:` variant — the palette handles it.
 */

const STYLES = {
  QUEUED: 'bg-neutral-soft text-ink-soft',
  PROCESSING: 'bg-warn-soft text-warn',
  READY: 'bg-ok-soft text-ok',
  FAILED: 'bg-danger-soft text-danger',
}

const LABELS = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  READY: 'Ready',
  FAILED: 'Failed',
}

// A dot rather than an icon: at 6px an icon is mush, and the dot can carry the
// only motion in the component — which is exactly where attention belongs.
const DOTS = {
  QUEUED: 'bg-ink-faint',
  PROCESSING: 'bg-warn',
  READY: 'bg-ok',
  FAILED: 'bg-danger',
}

function StatusBadge({ status, className = '' }) {
  const key = STYLES[status] ? status : 'QUEUED'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[key]} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {key === 'PROCESSING' ? (
          // A ping ring on top of a solid dot: the ring says "still working",
          // the dot keeps the badge legible when the ring is mid-fade.
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${DOTS[key]} opacity-75`} />
        ) : null}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOTS[key]}`} />
      </span>
      {LABELS[key] || status}
    </span>
  )
}

export default StatusBadge
