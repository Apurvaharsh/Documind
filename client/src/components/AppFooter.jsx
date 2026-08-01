const REPO_URL = 'https://github.com/Apurvaharsh/Documind'

/**
 * The three placeholder links that used to live here — "Privacy policy",
 * "Terms of service", "Contact support" — were all `href="#"`. A link that
 * looks real and goes nowhere is worse than no link, so they are gone until
 * there are actual pages behind them. The repository link is real.
 */
function AppFooter() {
  return (
    <footer className="mt-auto w-full border-t border-line bg-surface px-5 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-on-brand">
            <span className="font-display text-xs leading-none">D</span>
          </span>
          <span className="text-xs text-ink-muted">
            © {new Date().getFullYear()} DocuMind
          </span>
        </div>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}

export default AppFooter
