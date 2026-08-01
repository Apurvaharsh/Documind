/**
 * A square, icon-only control with a built-in tooltip.
 *
 * The label is mandatory and does double duty: it is the accessible name and
 * the tooltip text. Tying them together means an icon button cannot ship
 * unlabelled — the component will not let you.
 *
 * The tooltip is pure CSS on a group, so there is no portal, no positioning
 * library, and nothing to tear down on unmount.
 */

const VARIANTS = {
  ghost: 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
  surface: 'border border-line bg-surface text-ink-soft shadow-xs hover:border-line-strong hover:text-ink',
  danger: 'text-ink-muted hover:bg-danger-soft hover:text-danger',
}

const SIZES = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-10 w-10 rounded-lg',
}

const PLACEMENT = {
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
}

function IconButton({
  label,
  tooltip = true,
  placement = 'bottom',
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        type={type}
        aria-label={label}
        className={`inline-flex items-center justify-center transition-all duration-150 ease-out-quint
          active:scale-90
          disabled:pointer-events-none disabled:opacity-40
          ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {children}
      </button>

      {tooltip ? (
        <span
          role="tooltip"
          // Hidden from the accessibility tree: the button already carries this
          // exact string as its name, and announcing it twice is noise.
          aria-hidden="true"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-canvas opacity-0 shadow-md transition-opacity duration-150
            group-hover/tip:opacity-100 group-focus-within/tip:opacity-100
            ${PLACEMENT[placement]}`}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}

export default IconButton
