/**
 * The one button.
 *
 * The variant set stays small on purpose: that is what keeps the accent colour
 * from spreading across the UI. One primary action visible at a time.
 *
 * Every variant shares the same geometry, the same press feedback, and the
 * same focus ring, so a button never has to be re-learned from screen to
 * screen.
 */

const VARIANTS = {
  // Carries a tinted shadow rather than a grey one — a coloured surface lit
  // from above throws a shadow of its own hue.
  primary:
    'bg-brand text-on-brand shadow-brand hover:bg-brand-hover disabled:bg-ink-faint disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line shadow-xs hover:border-line-strong hover:bg-canvas',
  // The quiet affirmative: reads as brand without competing with primary.
  subtle: 'bg-brand-soft text-brand-ink hover:brightness-[0.97]',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger-soft text-danger hover:brightness-[0.97]',
}

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-9.5 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      // aria-busy tells a screen reader the control is working; the spinner
      // only tells someone who can see it.
      aria-busy={isLoading || undefined}
      className={`inline-flex shrink-0 select-none items-center justify-center font-medium transition-all duration-150 ease-out-quint
        active:scale-[0.98]
        disabled:pointer-events-none disabled:opacity-60 disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export default Button
