import { IconArrowUp, IconFile, IconSparkle } from './ui/icons'

// The generated design hotlinked a screenshot from googleusercontent.com.
// That URL expires and the picture would drift from the real product, so the
// mockup is built in markup instead — no external request, always accurate,
// and it re-themes with everything else.
function ProductMockup() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-surface-sunken px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-ink-faint">DocuMind — Chat</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_248px]">
        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-on-brand shadow-sm">
            What is the notice period to cancel renewal?
          </div>

          <div className="flex gap-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand-line ring-inset">
              <IconSparkle className="h-4 w-4" />
            </span>

            <div className="min-w-0 space-y-3">
              <p className="text-sm leading-7 text-ink">
                Either party must give{' '}
                {/* The one warm accent in the whole palette, spent on the span
                    the answer was actually drawn from. */}
                <mark className="rounded bg-highlight px-1 font-medium text-highlight-ink">
                  ninety (90) days written notice
                </mark>{' '}
                before the end of the current term, otherwise the agreement renews automatically for
                a further twelve months.
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  ['contract.pdf', 'Page 4', 91],
                  ['contract.pdf', 'Page 5', 87],
                  ['amendment.pdf', 'Page 1', 70],
                ].map(([file, page, score], index) => (
                  <div
                    key={`${file}-${page}`}
                    className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-surface-sunken text-[9px] font-semibold text-ink-muted">
                        {index + 1}
                      </span>
                      <IconFile className="h-3 w-3 shrink-0 text-danger" />
                      <span className="truncate text-[11px] font-medium text-ink">{file}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-ink-faint">{page}</span>
                      <span className="ml-auto h-1 w-8 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${score}%` }} />
                      </span>
                      <span className="text-[10px] tabular-nums text-ink-faint">{score}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-ink-faint">Searched 3 documents in 1.4s</p>
            </div>
          </div>

          {/* composer */}
          <div className="mt-1 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm">
            <span className="flex-1 px-2.5 text-sm text-ink-faint">Ask about your documents…</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand">
              <IconArrowUp className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* document rail */}
        <div className="hidden border-l border-line bg-surface-sunken p-4 md:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            Documents
          </p>

          <div className="mt-3 space-y-2">
            {[
              ['contract.pdf', 'Ready', 'bg-ok-soft text-ok', 'bg-ok'],
              ['amendment.pdf', 'Ready', 'bg-ok-soft text-ok', 'bg-ok'],
              ['invoices.pdf', 'Processing', 'bg-warn-soft text-warn', 'bg-warn'],
            ].map(([name, state, tone, dot]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 shadow-xs"
              >
                <span className="truncate text-xs text-ink">{name}</span>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
                >
                  <span className={`h-1 w-1 rounded-full ${dot}`} />
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
