import { SignInButton, SignUpButton } from '@clerk/clerk-react'

function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <span className="text-base font-semibold tracking-tight text-brand-deep">DocuMind</span>

      <div className="flex items-center gap-4">
        <SignInButton mode="modal">
          <button
            type="button"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-deep"
          >
            Get started
          </button>
        </SignUpButton>
      </div>
    </header>
  )
}

export default AppHeader
