import { IconHome, IconPlus, IconTrash } from '../ui/icons'

function ConversationList({ conversations, activeId, onOpen, onNew, onDelete, onHome }) {
  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-line bg-canvas">
      {/* The main sidebar collapses on entering chat, so this is the way back. */}
      <div className="flex items-center gap-2 border-b border-line p-3">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <IconHome />
          Home
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong"
        >
          <IconPlus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {conversations.length ? (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeId
              return (
                <li key={conversation.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onOpen(conversation.id)}
                    className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-soft text-brand'
                        : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span className="block truncate">{conversation.title}</span>
                    <span className="text-xs text-ink-muted">
                      {conversation._count?.queries ?? 0} message
                      {conversation._count?.queries === 1 ? '' : 's'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    aria-label={`Delete ${conversation.title}`}
                    className="absolute right-1.5 top-2 rounded p-1 text-ink-muted opacity-0 transition hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-2.5 py-4 text-xs text-ink-muted">
            Your chats will appear here.
          </p>
        )}
      </div>
    </div>
  )
}

export default ConversationList
