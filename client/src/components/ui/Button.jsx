// Three variants only. Keeping the set small is what stops the accent colour
// from spreading across the whole UI - there should be one primary action
// visible on screen at a time.
const VARIANTS = {
  primary:
    'bg-brand text-white hover:bg-brand-hover disabled:bg-ink-muted',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-canvas',
  ghost:
    'bg-transparent text-ink-soft hover:bg-canvas hover:text-ink',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
}

function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
