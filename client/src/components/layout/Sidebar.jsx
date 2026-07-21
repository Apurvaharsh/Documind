import Button from '../ui/Button'
import { IconChat, IconDocuments, IconSettings, IconUpload } from '../ui/icons'

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

function Sidebar({ activeView, onNavigate, onUploadClick }) {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-semibold text-white">
          D
        </span>
        <div className="leading-tight">
          <p className="text-base font-semibold text-ink">DocuMind</p>
          <p className="text-xs text-ink-muted">Intelligent Docs</p>
        </div>
      </div>

      <div className="px-4">
        <Button variant="primary" onClick={onUploadClick} className="w-full py-3">
          <IconUpload />
          Upload Document
        </Button>
      </div>

      <nav className="mt-6 flex flex-col gap-1 px-4">
        {NAV.map((item) => (
          <NavItem key={item.id} {...item} activeView={activeView} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto px-4 pb-5">
        <NavItem
          id="settings"
          label="Settings"
          Icon={IconSettings}
          activeView={activeView}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  )
}

export default Sidebar
