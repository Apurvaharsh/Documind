import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import {
  createApiKey,
  createCollection,
  getDocumentStatus,
  listApiKeys,
  listDocuments,
  revokeApiKey,
  uploadDocuments,
} from './api/client'

// Badge colours for each value of the DocumentStatus enum in schema.prisma.
const STATUS_STYLES = {
  QUEUED: 'bg-slate-500/20 text-slate-300',
  PROCESSING: 'bg-amber-400/20 text-amber-200',
  READY: 'bg-emerald-400/20 text-emerald-200',
  FAILED: 'bg-rose-400/20 text-rose-200',
}

function App() {
  const { getToken, isLoaded, userId } = useAuth()
  const { user } = useUser()
  const [files, setFiles] = useState([])
  const [documents, setDocuments] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiKeys, setApiKeys] = useState([])
  const [keyName, setKeyName] = useState('')
  const [latestKey, setLatestKey] = useState('')
  const [keysLoading, setKeysLoading] = useState(false)

  const handleShowToken = async () => {
    const token = await getToken()
    if (!token) {
      window.alert('No session token is available yet.')
      return
    }

    window.alert(token)
  }

  const loadApiKeys = async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    setKeysLoading(true)
    try {
      const data = await listApiKeys(token)
      setApiKeys(data.apiKeys || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setKeysLoading(false)
    }
  }

  const loadDocuments = async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    try {
      const data = await listDocuments(token)
      setDocuments(data.documents || [])
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    const syncUserData = async () => {
      if (!userId) {
        // Signed out - drop anything left over from the previous session.
        setApiKeys([])
        setDocuments([])
        return
      }

      await loadApiKeys()
      await loadDocuments()
    }

    syncUserData()
  }, [userId])

  const handleCreateCollection = async () => {
    setError('')
    setStatus('Creating vector collection...')
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      const data = await createCollection(token)
      setStatus(data.message || 'Collection is ready.')
    } catch (collectionError) {
      setError(collectionError.message)
      setStatus('')
    }
  }

  // Ask the server "is this document done yet?" every couple of seconds.
  // This is the client half of the async pattern: the upload request already
  // returned, so the only way to learn about progress is to keep checking.
  const pollUntilFinished = async (token, documentId) => {
    const POLL_INTERVAL_MS = 2000
    const MAX_ATTEMPTS = 150 // roughly 5 minutes before we give up

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      const data = await getDocumentStatus(token, documentId)
      const updated = data.document

      // Swap just this one document in the list, leave the rest untouched.
      setDocuments((current) =>
        current.map((doc) => (doc.id === updated.id ? { ...doc, ...updated } : doc))
      )

      if (updated.status === 'READY' || updated.status === 'FAILED') {
        return updated
      }
    }

    throw new Error('Timed out waiting for processing to finish.')
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    setError('')

    if (!files.length) {
      setError('Select at least one PDF file.')
      return
    }

    setIsSubmitting(true)
    setStatus('Uploading...')

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      // Step 1 - this comes back almost instantly, even for a 300 page PDF.
      // The files are only queued at this point, not processed.
      const data = await uploadDocuments(token, files)
      const queued = data.documents || []
      setDocuments((current) => [...queued, ...current])
      setStatus(`${queued.length} document(s) queued. The worker is processing them...`)

      // Step 2 - watch each one until the background worker finishes it.
      const results = await Promise.all(
        queued.map((doc) => pollUntilFinished(token, doc.id))
      )

      const failedCount = results.filter((doc) => doc.status === 'FAILED').length
      setStatus(
        failedCount
          ? `${failedCount} document(s) failed to process.`
          : 'All documents processed and ready to query.'
      )
    } catch (uploadError) {
      setError(uploadError.message)
      setStatus('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateKey = async (event) => {
    event.preventDefault()
    setError('')
    setLatestKey('')

    if (!keyName.trim()) {
      setError('Enter a name for the API key.')
      return
    }

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      const data = await createApiKey(token, keyName.trim())
      setLatestKey(data.key || '')
      setKeyName('')
      await loadApiKeys()
    } catch (keyError) {
      setError(keyError.message)
    }
  }

  const handleRevokeKey = async (id) => {
    setError('')
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      await revokeApiKey(token, id)
      await loadApiKeys()
    } catch (revokeError) {
      setError(revokeError.message)
    }
  }

  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <div className="w-full max-w-xl rounded-3xl border border-amber-400/30 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Clerk setup needed
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Add your publishable key to test authentication
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Create a <code className="rounded bg-slate-800 px-2 py-1 text-slate-100">client/.env</code> file and add{' '}
            <code className="rounded bg-slate-800 px-2 py-1 text-slate-100">
              VITE_CLERK_PUBLISHABLE_KEY=your_key
            </code>
            .
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                DocuMind
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ask better questions across your PDF documents
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                This is a basic frontend for upload, retrieval, and answer generation, with Clerk auth visible while you test the protected routes.
              </p>
            </div>
            <SignedIn>
              <div className="self-start rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-2">
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Workspace</h2>
            <SignedOut>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    Create account
                  </button>
                </SignUpButton>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Sign in to create the collection, upload PDFs, generate answers, and manage API keys.
              </p>
            </SignedOut>

            <SignedIn>
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-sm font-medium text-emerald-200">Signed in successfully</p>
                  <p className="mt-1 text-sm text-emerald-100/80">
                    {user?.primaryEmailAddress?.emailAddress || user?.username || 'Authenticated user'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCreateCollection}
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Create collection
                  </button>
                  <button
                    type="button"
                    onClick={handleShowToken}
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Show Clerk token
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleUpload}>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="pdfs">
                      Upload PDFs
                    </label>
                    <input
                      id="pdfs"
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={(event) => setFiles(Array.from(event.target.files || []))}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-medium file:text-slate-950"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      {files.length ? `${files.length} file(s) selected` : 'Choose one or more PDFs to index.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Processing...' : 'Upload PDFs'}
                  </button>
                </form>

                {documents.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Documents
                    </h3>
                    <ul className="mt-4 space-y-2">
                      {documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-200">{doc.originalName}</p>
                            {doc.errorMessage ? (
                              <p className="mt-1 truncate text-xs text-rose-300">{doc.errorMessage}</p>
                            ) : null}
                          </div>
                          <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${STATUS_STYLES[doc.status] || STATUS_STYLES.QUEUED}`}>
                            {doc.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </SignedIn>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Control panel</h2>
            <dl className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-slate-400">Clerk loaded</dt>
                <dd className="mt-1 font-medium text-white">{isLoaded ? 'Yes' : 'No'}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-slate-400">User ID</dt>
                <dd className="mt-1 break-all font-medium text-white">{userId || 'Not signed in'}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-slate-400">Recommended next check</dt>
                <dd className="mt-1 text-slate-200">
                  Use the token button after sign-in, then send that token to your protected backend route.
                </dd>
              </div>
            </dl>

            {(status || error) && (
              <div className="mt-5 space-y-3">
                {status ? (
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                    {status}
                  </div>
                ) : null}
                {error ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}
              </div>
            )}

            <SignedIn>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  API keys
                </h3>
                <form className="mt-4 flex flex-col gap-3" onSubmit={handleCreateKey}>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    placeholder="Key name"
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Create API key
                  </button>
                </form>

                {latestKey ? (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Copy this key now</p>
                    <p className="mt-2 break-all font-mono text-sm text-amber-50">{latestKey}</p>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {keysLoading ? (
                    <p className="text-sm text-slate-400">Loading keys...</p>
                  ) : apiKeys.length ? (
                    apiKeys.map((apiKey) => (
                      <div
                        key={apiKey.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{apiKey.name}</p>
                          <p className="text-xs text-slate-400">
                            Created {new Date(apiKey.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeKey(apiKey.id)}
                          className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20"
                        >
                          Revoke
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No API keys created yet.</p>
                  )}
                </div>
              </div>
            </SignedIn>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default App
