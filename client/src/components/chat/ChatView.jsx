import { useEffect, useRef, useState } from 'react'
import { askQuestionStream } from '../../api/client'
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
            {message.documentsSearched === 1 ? '' : 's'}
            {/* Timing only once the stream has finished - mid-stream it would
                read "0.0s", which is worse than saying nothing. */}
            {message.responseMs != null
              ? ` in ${(message.responseMs / 1000).toFixed(1)}s`
              : '…'}
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
  onThreadUpdated,
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

      // Patch just the placeholder message as each event lands.
      const update = (patch) =>
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId ? { ...message, ...patch } : message
          )
        )

      let streamError = null
      let answer = ''

      await askQuestionStream(
        token,
        question,
        scopeToPayload(scope),
        conversationId,
        (name, payload) => {
          if (name === 'meta') {
            // The server assigns the id on the first answer of a new thread.
            if (!conversationId && payload.conversationId) {
              onConversationStarted(payload.conversationId)
            }
          } else if (name === 'sources') {
            // Retrieval finishes long before generation, so citations show
            // while the answer is still being written.
            update({
              sources: payload.sources,
              documentsSearched: payload.documentsSearched,
            })
          } else if (name === 'delta') {
            answer += payload.text || ''
            update({ pending: false, text: answer })
          } else if (name === 'done') {
            update({ pending: false, responseMs: payload.responseMs })
          } else if (name === 'error') {
            streamError = payload.message
          }
        }
      )

      if (streamError) {
        throw new Error(streamError)
      }

      // Refresh the thread list only now. Doing it when the conversation was
      // created showed "0 messages", because the Query row is not written
      // until the stream finishes.
      onThreadUpdated()
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
