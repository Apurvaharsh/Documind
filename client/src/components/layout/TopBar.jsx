import { UserButton } from '@clerk/clerk-react'
import { IconBell, IconHelp, IconSearch } from '../ui/icons'

function TopBar({ search, onSearchChange }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <div className="relative w-full max-w-xl">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search documents..."
          aria-label="Search documents"
          className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:bg-surface"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconBell />
        </button>
        <button
          type="button"
          aria-label="Help"
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconHelp />
        </button>
        <div className="ml-1">
          <UserButton />
        </div>
      </div>
    </header>
  )
}

export default TopBar
