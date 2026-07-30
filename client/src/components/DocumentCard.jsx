import StatusBadge from './ui/StatusBadge'
import { IconCalendar, IconFile, IconTrash, IconWeight } from './ui/icons'

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

// PDFs get the warm tint, anything else the indigo one, so the grid is
// scannable by file type at a glance.
function iconTint(fileName = '') {
  return fileName.toLowerCase().endsWith('.pdf')
    ? 'bg-rose-50 text-rose-500 dark:bg-rose-950 dark:text-rose-400'
    : 'bg-brand-soft text-brand'
}

function DocumentCard({ document, collectionName, onDelete, onAsk }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTint(document.originalName)}`}
        >
          <IconFile className="h-5.5 w-5.5" />
        </span>
        <StatusBadge status={document.status} />
      </div>

      <h3
        className="mt-4 truncate text-[15px] font-semibold text-ink"
        title={document.originalName}
      >
        {document.originalName}
      </h3>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
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
        <span className="mt-3 w-fit rounded-md bg-canvas px-2 py-0.5 text-xs text-ink-soft">
          {collectionName}
        </span>
      ) : null}

      {document.errorMessage ? (
        <p
          className="mt-3 line-clamp-2 text-xs text-rose-600 dark:text-rose-400"
          title={document.errorMessage}
        >
          {document.errorMessage}
        </p>
      ) : null}

      {/* Revealed on hover so the resting grid stays calm. Focus-visible keeps
          them reachable by keyboard, where there is no hover to trigger it. */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        {document.status === 'READY' ? (
          <button
            type="button"
            onClick={() => onAsk(document.id)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-soft"
          >
            Ask
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          aria-label={`Delete ${document.originalName}`}
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
        >
          <IconTrash />
        </button>
      </div>
    </article>
  )
}

export default DocumentCard
