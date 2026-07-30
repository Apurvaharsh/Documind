// The single surface used everywhere. Optional title/action row keeps headers
// consistent instead of each panel inventing its own.
function Card({ title, description, action, className = '', children }) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface ${className}`}
    >
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-medium text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export default Card
