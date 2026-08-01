import { useEffect } from 'react'
import Button from '../ui/Button'
import { IconChat, IconDocuments, IconSettings, IconUpload, IconX } from '../ui/icons'

const NAV = [
  { id: 'documents', label: 'Documents', Icon: IconDocuments },
  { id: 'chat', label: 'Chat', Icon: IconChat },
]

function NavItem({ id, label, Icon, activeView, onNavigate }) {
  const isActive = activeView === id

  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-soft hover:bg-surface hover:text-ink'
      }`}
    >
      {/* A rail on the active item, not just a tint. The tint alone is easy to
          lose against the sidebar; a hard edge is legible at a glance. */}
      <span
        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* The size has to be repeated here: `className` replaces the icon's
          default rather than adding to it, so dropping h-5/w-5 leaves the SVG
          unconstrained and it grows to fill the button. */}
      <Icon
        className={`h-5 w-5 ${
          isActive ? 'text-brand' : 'text-ink-muted transition-colors group-hover:text-ink-soft'
        }`}
      />
      {label}
    </button>
  )
}

/**
 * `mobileHidden` suppresses the drawer on small screens. Chat uses it: there,
 * the phone-sized drawer is given over to the conversation rail instead, which
 * carries its own way back to Documents.
 */
function Sidebar({ activeView, onNavigate, onUploadClick, isOpen, onClose, mobileHidden = false }) {
  // Escape closes the drawer, which is the expected way out of any overlay.
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // On a phone the sidebar covers the content, so picking something must
  // dismiss it. On a laptop it sits alongside and should stay where it is.
  const closeIfOverlay = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      onClose()
    }
  }

  const handleNavigate = (id) => {
    onNavigate(id)
    closeIfOverlay()
  }

  return (
    <>
      {/* Scrim, drawer only. Sits under the panel and closes on click. */}
      {isOpen && !mobileHidden ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="animate-fade-in fixed inset-0 z-30 bg-overlay backdrop-blur-[2px] md:hidden"
        />
      ) : null}

      {/* Toggling display rather than sliding a transform: two competing
          translate utilities on one element did not resolve reliably, and
          hidden/flex is unambiguous.
          Collapsed at every width — on a laptop it gives its space back to the
          content, on a phone it is an overlay. */}
      <aside
        className={`w-[264px] shrink-0 flex-col border-r border-line bg-canvas ${
          isOpen ? 'fixed inset-y-0 left-0 z-40 flex shadow-xl md:static md:shadow-none' : 'hidden'
        } ${mobileHidden ? 'max-md:hidden' : ''}`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand shadow-brand">
            {/* The mark: a page with a fold. Set in the display serif so the
                wordmark and the mark share a voice. */}
            <span className="font-display text-lg leading-none">D</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg leading-none tracking-[-0.01em] text-ink">DocuMind</p>
            <p className="mt-1 text-[11px] text-ink-faint">Intelligent documents</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink md:hidden"
          >
            <IconX />
          </button>
        </div>

        <div className="px-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              onUploadClick()
              closeIfOverlay()
            }}
            className="w-full"
          >
            <IconUpload className="h-4 w-4" />
            Upload document
          </Button>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5 px-4">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            Workspace
          </p>
          {NAV.map((item) => (
            <NavItem key={item.id} {...item} activeView={activeView} onNavigate={handleNavigate} />
          ))}
        </nav>

        <div className="mt-auto px-4 pb-4">
          <NavItem
            id="settings"
            label="Settings"
            Icon={IconSettings}
            activeView={activeView}
            onNavigate={handleNavigate}
          />
        </div>
      </aside>
    </>
  )
}

export default Sidebar
