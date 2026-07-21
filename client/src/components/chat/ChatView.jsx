import { useEffect, useRef, useState } from 'react'
import { askQuestion } from '../../api/client'
import { IconBolt, IconBot, IconSend } from '../ui/icons'
import SourceCard from './SourceCard'

function scopeToPayload(scope) {
  if (scope.startsWith('doc:')) {
    return { documentId: scope.slice(4) }
  }
  if (scope.startsWith('col:')) {
    return { collectionId: scope.slice(4) }
  }
  return {}
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 pt-2.5" aria-label="Generating an answer">
      <span className="typing-dot h-2 w-2 rounded-full bg-line-strong" />
      <span className="typing-dot h-2 w-2 rounded-full bg-line-strong" />
      <span className="typing-dot h-2 w-2 rounded-full bg-line-strong" />
    </div>
  )
}

function AssistantMessage({ message }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink">
          <IconBot />
        </span>

        <div className="min-w-0 flex-grow pt-1">
          {message.pending ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-[1.7] text-ink">{message.text}</p>
          )}
        </div>
      </div>

      {message.sources?.length ? (
        <div className="mt-2 pl-12">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
            Sources
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {message.sources.slice(0, 3).map((source, index) => (
              <SourceCard key={`${source.documentId}-${source.chunkIndex}-${index}`} source={source} />
            ))}
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-ink-soft">
            <IconBolt />
            Searched {message.documentsSearched ?? 0} document
            {message.documentsSearched === 1 ? '' : 's'} in{' '}
            {((message.responseMs ?? 0) / 1000).toFixed(1)}s
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ChatView({
  getToken,
  scope,
  documents,
  onError,
  messages,
  setMessages,
  conversationId,
  onConversationStarted,
  isLoadingThread,
}) {
  const [draft, setDraft] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const endRef = useRef(null)

  const hasReadyDocuments = documents.some((doc) => doc.status === 'READY')

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const question = draft.trim()
    if (!question || isAsking) {
      return
    }

    setDraft('')
    setIsAsking(true)

    // Show the question and a placeholder answer straight away, so the thread
    // reacts immediately even though the reply takes many seconds.
    const pendingId = crypto.randomUUID()
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', text: question },
      { id: pendingId, role: 'assistant', pending: true },
    ])

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      const data = await askQuestion(token, question, scopeToPayload(scope), conversationId)

      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                text: data.text,
                sources: data.sources,
                documentsSearched: data.documentsSearched,
                responseMs: data.responseMs,
              }
            : message
        )
      )

      // The server assigns the id on the first answer of a new thread.
      if (!conversationId && data.conversationId) {
        onConversationStarted(data.conversationId)
      }
    } catch (error) {
      // Drop the placeholder rather than leaving it spinning forever.
      setMessages((current) => current.filter((message) => message.id !== pendingId))
      onError(error.message)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-grow overflow-y-auto bg-surface px-4 pb-32 pt-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          {isLoadingThread ? (
            <div className="space-y-3 pt-8">
              <div className="ml-auto h-10 w-2/5 animate-pulse rounded-2xl bg-canvas" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-canvas" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-canvas" />
            </div>
          ) : messages.length ? (
            messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="flex w-full justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-line bg-canvas px-5 py-3.5 text-sm leading-relaxed text-ink">
                    {message.text}
                  </div>
                </div>
              ) : (
                <AssistantMessage key={message.id} message={message} />
              )
            )
          ) : (
            <div className="pt-16 text-center">
              <p className="text-base font-medium text-ink">
                {hasReadyDocuments
                  ? 'Ask something about your documents'
                  : 'Upload a PDF to start asking questions'}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-soft">
                {hasReadyDocuments
                  ? 'Answers come only from the documents in the selected scope, with the passages used shown underneath.'
                  : 'Processing runs in the background. Documents become searchable once they are ready.'}
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer. The fade stops text colliding with the input as it scrolls. */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center bg-gradient-to-t from-surface via-surface to-transparent p-6 pt-12">
        <form className="relative w-full max-w-4xl" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!hasReadyDocuments}
            placeholder="Ask about your documents..."
            aria-label="Ask about your documents"
            className="w-full rounded-lg border border-line bg-surface py-3.5 pl-4 pr-12 text-sm text-ink transition-colors placeholder:text-ink-muted focus:border-brand disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isAsking || !draft.trim() || !hasReadyDocuments}
            aria-label="Send question"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded bg-brand text-white transition-colors hover:bg-brand-deep disabled:opacity-40"
          >
            <IconSend />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatView
