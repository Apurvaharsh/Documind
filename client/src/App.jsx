import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCollections } from './hooks/useCollections'
import { useConversations } from './hooks/useConversations'
import { useDocuments } from './hooks/useDocuments'
import { useTheme } from './hooks/useTheme'
import ConversationList from './components/chat/ConversationList'
import AppFooter from './components/AppFooter'
import AppHeader from './components/AppHeader'
import ChatView from './components/chat/ChatView'
import ScopeSelector from './components/chat/ScopeSelector'
import DocumentsView from './components/DocumentsView'
import SettingsView from './components/settings/SettingsView'
import SignedOutHero from './components/SignedOutHero'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Toast from './components/ui/Toast'
import { IconAlert } from './components/ui/icons'

function MissingClerkKey() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-5 py-16">
      <div className="w-full rounded-2xl border border-warn-line bg-surface p-6 shadow-lg">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warn-soft text-warn">
          <IconAlert className="h-5 w-5" />
        </span>

        <h1 className="mt-4 font-display text-heading text-ink">Clerk setup needed</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Create a{' '}
          <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-xs">
            client/.env
          </code>{' '}
          file containing your publishable key:
        </p>

        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken px-3 py-2.5 font-mono text-xs text-ink">
          VITE_CLERK_PUBLISHABLE_KEY=your_key
        </pre>
      </div>
    </main>
  )
}

function Workspace({ getToken, userId }) {
  const [view, setView] = useState('documents')
  const [search, setSearch] = useState('')
  // Open by default on a laptop, closed on a phone where it would cover
  // everything.
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  )
  const { theme, toggle: toggleTheme } = useTheme()
  // "all" | "col:<id>" | "doc:<id>" — lives here so the top bar and the chat
  // thread stay in agreement about what is being searched.
  const [scope, setScope] = useState('all')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Stable identities so the data hooks do not re-run on every render.
  const handleError = useCallback((message) => {
    setError(message)
    setStatus('')
  }, [])

  const handleStatus = useCallback((message) => {
    setStatus(message)
    setError('')
  }, [])

  // Chat carries its own conversation rail, so leaving the main sidebar open
  // there would put three columns before the actual thread. It collapses on
  // the way in and comes back on the way out; the toggle still overrides.
  const goToView = useCallback((nextView) => {
    setView(nextView)
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
    setSidebarOpen(nextView !== 'chat' && isDesktop)
  }, [])

  const callbacks = { onError: handleError, onStatus: handleStatus }
  const docs = useDocuments(getToken, callbacks)
  const cols = useCollections(getToken, callbacks)
  const chats = useConversations(getToken, callbacks)

  const { refresh: refreshDocuments, clear: clearDocuments } = docs
  const { refresh: refreshCollections, clear: clearCollections } = cols
  const { refresh: refreshConversations, clear: clearConversations } = chats

  // How many documents the current scope actually covers. Only READY documents
  // are searchable, so a queued upload should not be counted.
  const readyDocuments = docs.documents.filter((doc) => doc.status === 'READY')
  let scopeCount = readyDocuments.length
  if (scope.startsWith('doc:')) {
    scopeCount = 1
  } else if (scope.startsWith('col:')) {
    const collection = cols.collections.find((entry) => entry.id === scope.slice(4))
    scopeCount = (collection?.documents || []).filter((doc) => doc.status === 'READY').length
  }

  useEffect(() => {
    if (!userId) {
      clearDocuments()
      clearCollections()
      clearConversations()
      return
    }

    refreshDocuments()
    refreshCollections()
    refreshConversations()
  }, [
    userId,
    refreshDocuments,
    refreshCollections,
    refreshConversations,
    clearDocuments,
    clearCollections,
    clearConversations,
  ])

  const isChat = view === 'chat'

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Floats above the layout, so a message never shifts the page. */}
      <Toast
        message={error || status}
        tone={error ? 'error' : 'info'}
        onDismiss={() => (error ? setError('') : setStatus(''))}
      />

      <Sidebar
        activeView={view}
        onNavigate={goToView}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        // On a phone in chat, the drawer belongs to the conversation rail.
        mobileHidden={isChat}
        onUploadClick={() => {
          goToView('documents')
          fileInputRef.current?.click()
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          isSidebarOpen={isSidebarOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
          leading={
            isChat ? (
              <ScopeSelector
                scope={scope}
                onScopeChange={setScope}
                collections={cols.collections}
                documents={docs.documents}
                searchCount={scopeCount}
              />
            ) : null
          }
        />

        {/* Chat scrolls its own thread and pins a composer, so the outer
            container must not scroll as well. */}
        <div className={`min-h-0 flex-1 ${isChat ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {view === 'documents' ? (
            <DocumentsView
              documents={docs.documents}
              collections={cols.collections}
              search={search}
              isUploading={docs.isUploading}
              isLoading={docs.isLoading}
              onUpload={docs.upload}
              onDelete={docs.remove}
              onAsk={(documentId) => {
                setScope(`doc:${documentId}`)
                goToView('chat')
              }}
              fileInputRef={fileInputRef}
            />
          ) : null}

          {isChat ? (
            <div className="relative flex h-full">
              {/* Scrim for the rail-as-drawer on a phone. */}
              {isSidebarOpen ? (
                <button
                  type="button"
                  aria-label="Close conversations"
                  onClick={() => setSidebarOpen(false)}
                  className="animate-fade-in fixed inset-0 z-30 bg-overlay backdrop-blur-[2px] md:hidden"
                />
              ) : null}

              {/* This rail is the chat's own navigation, so it stays put when
                  the main sidebar collapses. On a phone it is the drawer the
                  top-bar toggle opens — which is the only way conversations
                  were ever reachable there. */}
              <div
                className={`hidden md:flex ${
                  isSidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex shadow-xl md:static md:shadow-none' : ''
                }`}
              >
                <ConversationList
                  conversations={chats.conversations}
                  activeId={chats.activeId}
                  onOpen={(id) => {
                    chats.open(id)
                    if (window.matchMedia('(max-width: 767px)').matches) {
                      setSidebarOpen(false)
                    }
                  }}
                  onNew={chats.startNew}
                  onDelete={chats.remove}
                  onHome={() => goToView('documents')}
                />
              </div>

              <div className="min-w-0 flex-1">
                <ChatView
                  // A different conversation is a different thread: remounting
                  // clears the draft, the scroll position and any in-flight
                  // stream, instead of carrying them across.
                  key={chats.activeId || 'new'}
                  getToken={getToken}
                  scope={scope}
                  documents={docs.documents}
                  onError={handleError}
                  messages={chats.messages}
                  setMessages={chats.setMessages}
                  conversationId={chats.activeId}
                  isLoadingThread={chats.isLoadingThread}
                  onConversationStarted={(id) => chats.setActiveId(id)}
                  onThreadUpdated={refreshConversations}
                />
              </div>
            </div>
          ) : null}

          {view === 'settings' ? (
            <SettingsView
              getToken={getToken}
              userId={userId}
              collections={cols.collections}
              documents={docs.documents}
              onCreate={cols.create}
              onAddDocuments={cols.addDocuments}
              onError={handleError}
              onStatus={handleStatus}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function App() {
  const { getToken, userId } = useAuth()

  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkKey />
  }

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen flex-col bg-canvas">
          <AppHeader />
          <SignedOutHero />
          <AppFooter />
        </div>
      </SignedOut>
      <SignedIn>
        <Workspace getToken={getToken} userId={userId} />
      </SignedIn>
    </>
  )
}

export default App
