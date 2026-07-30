import { UserButton } from '@clerk/clerk-react'
import { IconBell, IconHelp, IconMenu, IconMoon, IconSearch, IconSun } from '../ui/icons'

// `leading` lets each view own the left side of the bar - search on the
// documents grid, the scope selector in chat - without duplicating the bar.
function TopBar({ search, onSearchChange, leading, onMenuClick, isSidebarOpen, theme, onToggleTheme }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      {/* Shown at every width, not just mobile, so the panels can be collapsed
          on a laptop to give the chat the full window. */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={isSidebarOpen ? 'Hide panels' : 'Show panels'}
        aria-expanded={isSidebarOpen}
        className="-ml-1 rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
      >
        <IconMenu />
      </button>

      {leading || (
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
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>

        {/* Secondary actions give up their space first on narrow screens. */}
        <button
          type="button"
          aria-label="Notifications"
          className="hidden rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:block"
        >
          <IconBell />
        </button>
        <button
          type="button"
          aria-label="Help"
          className="hidden rounded-lg p-2 text-ink-soft transition-colors hover:bg-canvas hover:text-ink sm:block"
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
