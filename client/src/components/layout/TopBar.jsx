import { UserButton } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import IconButton from '../ui/IconButton'
import { IconMoon, IconPanelLeft, IconSearch, IconSun, IconX } from '../ui/icons'

/**
 * `leading` lets each view own the left side of the bar — search on the
 * documents grid, the scope selector in chat — without duplicating the bar.
 *
 * The bell and help buttons that used to live here were removed rather than
 * restyled: neither did anything, and a control that does nothing when clicked
 * costs more trust than the space it filled was worth.
 */
function TopBar({ search, onSearchChange, leading, onMenuClick, isSidebarOpen, theme, onToggleTheme }) {
  const searchRef = useRef(null)

  // "/" jumps to search, Escape leaves it. Cheap to add, and it is the shortcut
  // people already try. Guarded so it does not steal the key mid-sentence.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'Escape' && event.target === searchRef.current) {
        searchRef.current.blur()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-3 backdrop-blur-xl sm:px-5">
      <IconButton
        label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        onClick={onMenuClick}
        aria-expanded={isSidebarOpen}
      >
        <IconPanelLeft />
      </IconButton>

      {leading || (
        <div className="group relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-brand">
            <IconSearch />
          </span>

          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9.5 pr-16 text-sm text-ink shadow-xs transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-brand-line focus:outline-none"
          />

          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          ) : (
            // Hidden once typing starts — a hint for a shortcut you have
            // already used is just clutter over your own text.
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-sans text-ink-faint group-focus-within:opacity-0 sm:block">
              /
            </kbd>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <IconButton
          label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={onToggleTheme}
          placement="left"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </IconButton>

        <div className="ml-1.5 flex items-center">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8 ring-1 ring-line',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}

export default TopBar
