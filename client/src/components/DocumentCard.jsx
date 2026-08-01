import { useEffect, useState } from 'react'
import StatusBadge from './ui/StatusBadge'
import { IconAlert, IconCalendar, IconChat, IconFile, IconTrash, IconWeight } from './ui/icons'

function formatSize(bytes) {
  if (!bytes && bytes !== 0) {
    return '—'
  }
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

// "Just now" / "Today" / "Yesterday" read better than a date stamp for the
// files someone just dropped in, which is most of what this list shows.
function formatWhen(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  const minutes = (Date.now() - date.getTime()) / 60000

  if (minutes < 2) return 'Just now'
  if (minutes < 60) return `${Math.round(minutes)} min ago`

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  if (date >= startOfToday) return 'Today'

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (date >= startOfYesterday) return 'Yesterday'

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function DocumentCard({ document, collectionName, onDelete, onAsk }) {
  const [confirming, setConfirming] = useState(false)
  const isReady = document.status === 'READY'

  // A confirmation that stays armed forever is a trap for the next click in
  // that corner. It disarms itself.
  useEffect(() => {
    if (!confirming) {
      return undefined
    }
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {/* PDFs get the warm tint so the grid is scannable by type at a glance. */}
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <IconFile className="h-5 w-5" />
        </span>
        <StatusBadge status={document.status} />
      </div>

      <h3
        className="mt-3.5 truncate text-sm font-semibold tracking-[-0.01em] text-ink"
        title={document.originalName}
      >
        {document.originalName}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <IconCalendar />
          {formatWhen(document.uploadedAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <IconWeight />
          {formatSize(document.fileSize)}
        </span>
      </div>

      {collectionName ? (
        <span className="mt-3 w-fit rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">
          {collectionName}
        </span>
      ) : null}

      {document.errorMessage ? (
        <p
          className="mt-3 flex items-start gap-1.5 rounded-lg bg-danger-soft px-2 py-1.5 text-xs leading-5 text-danger"
          title={document.errorMessage}
        >
          <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{document.errorMessage}</span>
        </p>
      ) : null}

      {/* Actions sit in the flow rather than floating on hover. The old version
          revealed them with group-hover only, which meant that on any touch
          device there was no way at all to delete a document. */}
      <div className="mt-4 flex items-center gap-1.5 border-t border-line-subtle pt-3">
        {isReady ? (
          <button
            type="button"
            onClick={() => onAsk(document.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft"
          >
            <IconChat className="h-3.5 w-3.5" />
            Ask
          </button>
        ) : (
          <span className="px-2 py-1.5 text-xs text-ink-faint">
            {document.status === 'FAILED' ? 'Cannot be queried' : 'Preparing…'}
          </span>
        )}

        {confirming ? (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(document.id)}
              className="rounded-lg bg-danger-soft px-2 py-1.5 text-xs font-semibold text-danger transition-colors hover:brightness-95"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${document.originalName}`}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  )
}

export default DocumentCard
