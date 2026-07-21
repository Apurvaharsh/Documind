import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCollections } from './hooks/useCollections'
import { useDocuments } from './hooks/useDocuments'
import ApiKeysCard from './components/ApiKeysCard'
import AppHeader from './components/AppHeader'
import AskPanel from './components/AskPanel'
import CollectionsCard from './components/CollectionsCard'
import DocumentsView from './components/DocumentsView'
import SignedOutHero from './components/SignedOutHero'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Toast from './components/ui/Toast'

function MissingClerkKey() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-24">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-base font-medium text-amber-900">Clerk setup needed</h1>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Create a <code className="rounded bg-white px-1.5 py-0.5">client/.env</code> file
          containing{' '}
          <code className="rounded bg-white px-1.5 py-0.5">
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

  const { refresh: refreshDocuments, clear: clearDocuments } = docs
  const { refresh: refreshCollections, clear: clearCollections } = cols

  useEffect(() => {
    if (!userId) {
      clearDocuments()
      clearCollections()
      return
    }

    refreshDocuments()
    refreshCollections()
  }, [userId, refreshDocuments, refreshCollections, clearDocuments, clearCollections])

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar
        activeView={view}
        onNavigate={setView}
        onUploadClick={() => {
          setView('documents')
          fileInputRef.current?.click()
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar search={search} onSearchChange={setSearch} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error || status ? (
            <div className="px-8 pt-6">
              <Toast
                message={error || status}
                tone={error ? 'error' : 'info'}
                onDismiss={() => (error ? setError('') : setStatus(''))}
              />
            </div>
          ) : null}

          {view === 'documents' ? (
            <DocumentsView
              documents={docs.documents}
              collections={cols.collections}
              search={search}
              isUploading={docs.isUploading}
              onUpload={docs.upload}
              onDelete={docs.remove}
              fileInputRef={fileInputRef}
            />
          ) : null}

          {view === 'chat' ? (
            <div className="mx-auto max-w-3xl px-8 py-7">
              <h1 className="mb-6 text-[32px] font-bold tracking-tight text-ink">Chat</h1>
              <AskPanel
                getToken={getToken}
                documents={docs.documents}
                collections={cols.collections}
                onError={handleError}
              />
            </div>
          ) : null}

          {view === 'settings' ? (
            <div className="mx-auto max-w-3xl space-y-5 px-8 py-7">
              <h1 className="text-[32px] font-bold tracking-tight text-ink">Settings</h1>
              <CollectionsCard
                collections={cols.collections}
                documents={docs.documents}
                onCreate={cols.create}
                onAddDocuments={cols.addDocuments}
              />
              <ApiKeysCard
                getToken={getToken}
                userId={userId}
                onError={handleError}
                onStatus={handleStatus}
              />
            </div>
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
        <div className="min-h-screen bg-canvas">
          <AppHeader />
          <SignedOutHero />
        </div>
      </SignedOut>
      <SignedIn>
        <Workspace getToken={getToken} userId={userId} />
      </SignedIn>
    </>
  )
}

export default App
