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
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-brand-soft text-brand'
          : 'text-ink-soft hover:bg-brand-soft/60 hover:text-ink'
      }`}
    >
      <Icon />
      {label}
    </button>
  )
}

function Sidebar({ activeView, onNavigate, onUploadClick, isOpen, onClose }) {
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
      {isOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/20 md:hidden"
        />
      ) : null}

      {/* Toggling display rather than sliding a transform: two competing
          translate utilities on one element did not resolve reliably, and
          hidden/flex is unambiguous.
          Collapsed at every width now - on a laptop it simply gives its space
          back to the content, on a phone it is an overlay. */}
      <aside
        className={`w-[264px] shrink-0 flex-col border-r border-line bg-sidebar ${
          isOpen ? 'fixed inset-y-0 left-0 z-40 flex md:static' : 'hidden'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-semibold text-white">
            D
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold text-ink">DocuMind</p>
            <p className="text-xs text-ink-muted">Intelligent Docs</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-ink-soft hover:bg-brand-soft md:hidden"
          >
            <IconX />
          </button>
        </div>

        <div className="px-4">
          <Button
            variant="primary"
            onClick={() => {
              onUploadClick()
              closeIfOverlay()
            }}
            className="w-full py-3"
          >
            <IconUpload />
            Upload Document
          </Button>
        </div>

        <nav className="mt-6 flex flex-col gap-1 px-4">
          {NAV.map((item) => (
            <NavItem
              key={item.id}
              {...item}
              activeView={activeView}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        <div className="mt-auto px-4 pb-5">
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
