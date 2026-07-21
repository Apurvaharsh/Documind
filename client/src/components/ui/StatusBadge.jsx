// Colour here is reserved for document state and nothing else. If a green
// badge shows up somewhere decorative, this rule has been broken.
const STYLES = {
  QUEUED: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-amber-50 text-amber-700',
  READY: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-rose-50 text-rose-700',
}

const LABELS = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  READY: 'Ready',
  FAILED: 'Failed',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${STYLES[status] || STYLES.QUEUED}`}
    >
      {status === 'PROCESSING' ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      ) : null}
      {LABELS[status] || status}
    </span>
  )
}

export default StatusBadge
