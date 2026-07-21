import { IconFile } from '../ui/icons'

function SourceCard({ source }) {
  const isPdf = (source.fileName || '').toLowerCase().endsWith('.pdf')

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand/30 hover:bg-canvas">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${isPdf ? 'text-rose-500' : 'text-brand'}`}>
          <IconFile className="h-4 w-4" />
        </span>
        <span
          className="truncate text-sm font-medium text-ink"
          title={source.fileName || 'Unknown file'}
        >
          {source.fileName || 'Unknown file'}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-ink-soft">
        {/* Documents ingested before page tracking have no page number, so fall
            back to the chunk position rather than inventing one. */}
        <span>
          {source.page != null ? `Page ${source.page}` : `Chunk ${source.chunkIndex ?? '—'}`}
        </span>
        <span className="rounded bg-canvas px-1.5 py-0.5 tabular-nums text-ink">
          {source.score?.toFixed(3)}
        </span>
      </div>

      {source.excerpt ? (
        <p className="mt-1 truncate border-l-2 border-line pl-2 text-xs text-ink-muted">
          &ldquo;{source.excerpt}&rdquo;
        </p>
      ) : null}
    </div>
  )
}

export default SourceCard
