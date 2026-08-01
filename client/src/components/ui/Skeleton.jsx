/**
 * Loading placeholder.
 *
 * A sweeping gradient rather than a pulsing block: a pulse reads as "this
 * element is broken", a sweep reads as "this element is arriving". The
 * animation itself lives in index.css as `.skeleton`.
 */
function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />
}

export default Skeleton
