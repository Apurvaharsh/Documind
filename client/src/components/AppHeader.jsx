import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import Button from './ui/Button'

function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-medium text-white">
            D
          </span>
          <span className="text-sm font-medium text-ink">DocuMind</span>
        </div>

        <SignedOut>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="primary" size="sm">
                Get started
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}

export default AppHeader
