import { IconFile } from '../ui/icons'

/**
 * One retrieved passage.
 *
 * The similarity score is shown as a bar rather than as `0.912`. Three decimal
 * places imply a precision the reader cannot act on, and nobody knows whether
 * 0.912 is good without something to compare it against — a filled bar answers
 * that instantly. The exact figure stays in the tooltip for anyone tuning
 * retrieval.
 */
function SourceCard({ source, rank }) {
  const isPdf = (source.fileName || '').toLowerCase().endsWith('.pdf')
  const score = typeof source.score === 'number' ? Math.max(0, Math.min(1, source.score)) : null

  return (
    <div className="group flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-md">
      <div className="flex items-center gap-2">
        {rank ? (
          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded bg-surface-sunken text-[10px] font-semibold tabular-nums text-ink-muted">
            {rank}
          </span>
        ) : null}

        <span className={`shrink-0 ${isPdf ? 'text-danger' : 'text-brand'}`}>
          <IconFile className="h-3.5 w-3.5" />
        </span>

        <span
          className="truncate text-xs font-medium text-ink"
          title={source.fileName || 'Unknown file'}
        >
          {source.fileName || 'Unknown file'}
        </span>
      </div>

      {source.excerpt ? (
        // Three lines, not one. A quotation truncated at a single line rarely
        // contains the clause that answers the question, which makes the whole
        // citation decorative.
        <p className="line-clamp-3 border-l-2 border-line pl-2.5 text-xs leading-5 text-ink-muted">
          {source.excerpt}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-0.5">
        <span className="shrink-0 text-[11px] text-ink-faint">
          {/* Documents ingested before page tracking have no page number, so
              fall back to the chunk position rather than inventing one. */}
          {source.page != null ? `Page ${source.page}` : `Chunk ${source.chunkIndex ?? '—'}`}
        </span>

        {score != null ? (
          <span
            className="ml-auto flex items-center gap-1.5"
            title={`Similarity ${source.score.toFixed(3)}`}
          >
            <span className="h-1 w-10 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-out-quint"
                style={{ width: `${score * 100}%` }}
              />
            </span>
            <span className="text-[11px] tabular-nums text-ink-faint">
              {Math.round(score * 100)}%
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default SourceCard
