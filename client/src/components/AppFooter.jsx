const LINKS = ['Privacy policy', 'Terms of service', 'Contact support']

function AppFooter() {
  return (
    <footer className="mt-auto w-full border-t border-line bg-surface px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <span className="text-xs text-ink-muted">
          © {new Date().getFullYear()} DocuMind. All rights reserved.
        </span>
        <nav className="flex gap-6">
          {LINKS.map((label) => (
            <a
              key={label}
              href="#"
              className="text-xs text-ink-muted transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export default AppFooter
