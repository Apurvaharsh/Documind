/**
 * The single surface. An optional header row keeps panel titles consistent
 * instead of each panel inventing its own.
 *
 * `flush` turns off the body padding for cards whose content owns its own
 * edges — tables and full-bleed lists.
 */
function Card({ title, description, action, flush = false, className = '', children }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-xs ${className}`}
    >
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line-subtle px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={flush ? '' : 'px-5 py-4'}>{children}</div>
    </section>
  )
}

export default Card
