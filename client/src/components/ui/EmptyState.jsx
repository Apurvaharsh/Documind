/**
 * An invitation, not an apology — so never "nothing here yet".
 *
 * The icon sits in a soft plate rather than floating loose: an unbounded glyph
 * in a large empty area has nothing to give it scale, and reads as an error
 * mark. Bounded, it reads as a placeholder.
 */
function EmptyState({ icon, title, hint, action, size = 'md', className = '' }) {
  const isLarge = size === 'lg'

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface/60 px-6 text-center ${
        isLarge ? 'py-16' : 'py-10'
      } ${className}`}
    >
      {icon ? (
        <span
          className={`mb-4 flex items-center justify-center rounded-2xl bg-brand-soft text-brand ${
            isLarge ? 'h-14 w-14' : 'h-11 w-11'
          }`}
        >
          {icon}
        </span>
      ) : null}

      <p className={`font-semibold tracking-[-0.01em] text-ink ${isLarge ? 'text-base' : 'text-sm'}`}>
        {title}
      </p>

      {hint ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-ink-muted">{hint}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default EmptyState
