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

function MissingClerkKey() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-24">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
        <h1 className="text-base font-medium text-amber-900 dark:text-amber-200">Clerk setup needed</h1>
        <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-300">
          Create a <code className="rounded bg-surface px-1.5 py-0.5">client/.env</code> file
          containing{' '}
          <code className="rounded bg-surface px-1.5 py-0.5">
            VITE_CLERK_PUBLISHABLE_KEY=your_key
          </code>
          .
        </p>
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
  // "all" | "col:<id>" | "doc:<id>" - lives here so the top bar and the chat
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
        onNavigate={setView}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onUploadClick={() => {
          setView('documents')
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
            view === 'chat' ? (
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
        <div className={`min-h-0 flex-1 ${view === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
                setView('chat')
              }}
              fileInputRef={fileInputRef}
            />
          ) : null}

          {view === 'chat' ? (
            <div className="flex h-full">
              {/* Collapses with the sidebar, so one control clears both rails
                  and gives the thread the whole window. Always hidden on a
                  phone, where the chat needs the full screen. */}
              <div className={isSidebarOpen ? 'hidden md:flex' : 'hidden'}>
                <ConversationList
                  conversations={chats.conversations}
                  activeId={chats.activeId}
                  onOpen={chats.open}
                  onNew={chats.startNew}
                  onDelete={chats.remove}
                />
              </div>

              <div className="min-w-0 flex-1">
                <ChatView
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
