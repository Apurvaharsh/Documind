function Meter({ label, used, limit }) {
  // Clamp so an over-quota account cannot render a bar wider than its track.
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="text-xs font-medium">
          <span className="text-ink">{used.toLocaleString()}</span>
          <span className="text-ink-muted"> / {limit.toLocaleString()}</span>
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function UsageCard({ usage }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
      <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">Usage this month</h3>

      {usage ? (
        <>
          <Meter label="Documents" used={usage.documents.used} limit={usage.documents.limit} />
          <Meter label="Questions" used={usage.questions.used} limit={usage.questions.limit} />
          <p className="text-xs leading-5 text-ink-muted">
            Documents is a running total. Questions resets at the start of each month.
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <div className="h-2 w-full animate-pulse rounded-full bg-line" />
          <div className="h-2 w-full animate-pulse rounded-full bg-line" />
        </div>
      )}
    </div>
  )
}

export default UsageCard
