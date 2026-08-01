import { SignInButton, SignUpButton } from '@clerk/clerk-react'
import { useTheme } from '../hooks/useTheme'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import { IconMoon, IconSun } from './ui/icons'

function AppHeader() {
  // The signed-out pages had no way to change theme at all, so anyone who
  // preferred dark met a full-brightness landing page first.
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-on-brand shadow-brand">
            <span className="font-display text-base leading-none">D</span>
          </span>
          <span className="font-display text-xl leading-none tracking-[-0.01em] text-ink">
            DocuMind
          </span>
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <IconButton
            label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={toggle}
            placement="left"
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </IconButton>

          <SignInButton mode="modal">
            <button
              type="button"
              className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
            >
              Sign in
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <Button variant="primary">Get started</Button>
          </SignUpButton>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
