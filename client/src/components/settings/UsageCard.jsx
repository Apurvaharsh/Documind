import Skeleton from '../ui/Skeleton'

/**
 * The bar changes colour as the limit approaches — amber past 75%, red past
 * 90%. A quota you are about to hit and one you have barely touched should not
 * look identical until the moment it stops working.
 */
function Meter({ label, used, limit }) {
  // Clamp so an over-quota account cannot render a bar wider than its track.
  const ratio = limit ? Math.min(1, used / limit) : 0
  const percent = ratio * 100

  const tone =
    ratio >= 0.9 ? 'bg-danger' : ratio >= 0.75 ? 'bg-warn' : 'bg-brand'

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="text-xs font-medium tabular-nums">
          <span className="text-ink">{used.toLocaleString()}</span>
          <span className="text-ink-faint"> / {limit.toLocaleString()}</span>
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out-quint ${tone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function UsageCard({ usage }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div>
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink">Usage this month</h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          Documents is a running total. Questions resets monthly.
        </p>
      </div>

      {usage ? (
        <>
          <Meter label="Documents" used={usage.documents.used} limit={usage.documents.limit} />
          <Meter label="Questions" used={usage.questions.used} limit={usage.questions.limit} />
        </>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>
      )}
    </div>
  )
}

export default UsageCard
