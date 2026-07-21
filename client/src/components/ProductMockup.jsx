// The generated design hotlinked a screenshot from googleusercontent.com.
// That URL expires and the picture would drift from the real product, so the
// mockup is built in markup instead - no external request, always accurate.
function ProductMockup() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-ink-muted">DocuMind — Chat</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_260px]">
        <div className="space-y-4 p-6">
          <div className="ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm bg-brand-soft px-3.5 py-2.5 text-sm text-ink">
            What is the notice period to cancel renewal?
          </div>

          <div className="max-w-[90%] space-y-2">
            <p className="text-sm leading-6 text-ink">
              Either party must give{' '}
              <span className="rounded bg-amber-100 px-1 font-medium text-amber-900">
                ninety (90) days written notice
              </span>{' '}
              before the end of the current term, otherwise the agreement renews
              automatically for a further twelve months.
            </p>
            <p className="text-xs text-ink-muted">Searched 3 documents in 1.4s</p>
          </div>

          <div className="rounded-lg bg-canvas p-3">
            <p className="text-xs font-medium text-ink-soft">Sources</p>
            <div className="mt-2 space-y-1.5">
              {[
                ['contract.pdf', 'page 4', '0.912'],
                ['contract.pdf', 'page 5', '0.874'],
                ['amendment.pdf', 'page 1', '0.702'],
              ].map(([file, page, score]) => (
                <div key={`${file}-${page}`} className="flex items-center gap-2 text-xs">
                  <span className="truncate text-ink-soft">{file}</span>
                  <span className="text-ink-muted">· {page}</span>
                  <span className="ml-auto tabular-nums text-ink-muted">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* document rail */}
        <div className="hidden border-l border-line bg-canvas p-4 md:block">
          <p className="text-xs font-medium text-ink-soft">Documents</p>
          <div className="mt-3 space-y-2">
            {[
              ['contract.pdf', 'Ready', 'bg-emerald-50 text-emerald-700'],
              ['amendment.pdf', 'Ready', 'bg-emerald-50 text-emerald-700'],
              ['invoices.pdf', 'Processing', 'bg-amber-50 text-amber-700'],
            ].map(([name, state, tone]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2"
              >
                <span className="truncate text-xs text-ink">{name}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
                  {state}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductMockup
