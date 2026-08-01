import { IconChat, IconHome, IconPlus, IconTrash } from '../ui/icons'

/**
 * Buckets threads the way someone actually looks for them — by when they last
 * spoke, not by an absolute date. A flat list sorted by timestamp forces you to
 * read every title; three headings let you skip straight to the right stretch
 * of the week.
 */
function groupByAge(conversations) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const weekAgo = new Date(startOfToday)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups = { Today: [], 'Previous 7 days': [], Earlier: [] }

  for (const conversation of conversations) {
    const when = new Date(conversation.updatedAt || conversation.createdAt || Date.now())
    if (when >= startOfToday) {
      groups.Today.push(conversation)
    } else if (when >= weekAgo) {
      groups['Previous 7 days'].push(conversation)
    } else {
      groups.Earlier.push(conversation)
    }
  }

  return Object.entries(groups).filter(([, items]) => items.length)
}

function ConversationList({ conversations, activeId, onOpen, onNew, onDelete, onHome }) {
  const groups = groupByAge(conversations)

  return (
    <div className="flex h-full w-[248px] shrink-0 flex-col border-r border-line bg-surface-sunken">
      {/* The main sidebar collapses on entering chat, so this is the way back. */}
      <div className="flex items-center gap-1 px-3 pb-1 pt-3">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <IconHome />
          Documents
        </button>
      </div>

      <div className="px-3 py-2">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink shadow-xs transition-all duration-150 hover:border-brand-line hover:shadow-sm active:scale-[0.98]"
        >
          <IconPlus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.length ? (
          groups.map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                {label}
              </p>

              <ul className="space-y-0.5">
                {items.map((conversation) => {
                  const isActive = conversation.id === activeId
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onOpen(conversation.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`w-full rounded-lg px-2.5 py-2 pr-9 text-left transition-colors ${
                          isActive
                            ? 'bg-brand-soft text-brand-ink'
                            : 'text-ink-soft hover:bg-surface hover:text-ink'
                        }`}
                      >
                        <span className="block truncate text-sm">{conversation.title}</span>
                        <span
                          className={`text-[11px] ${isActive ? 'text-brand' : 'text-ink-faint'}`}
                        >
                          {conversation._count?.queries ?? 0} message
                          {conversation._count?.queries === 1 ? '' : 's'}
                        </span>
                      </button>

                      {/* Faint at rest rather than invisible: a control that
                          only exists on hover cannot be found by anyone who
                          does not already know it is there. */}
                      <button
                        type="button"
                        onClick={() => onDelete(conversation.id)}
                        aria-label={`Delete ${conversation.title}`}
                        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint opacity-0 transition-all hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center px-3 py-10 text-center">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink-faint">
              <IconChat />
            </span>
            <p className="text-xs leading-5 text-ink-faint">
              Your conversations
              <br />
              will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationList
