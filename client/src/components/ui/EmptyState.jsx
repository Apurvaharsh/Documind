// An invitation, not an apology - so no "nothing here yet".
function EmptyState({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
      <p className="text-sm text-ink-soft">{title}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export default EmptyState
