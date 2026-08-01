import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { askQuestionStream } from '../../api/client'
import Skeleton from '../ui/Skeleton'
import {
  IconArrowUp,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconCornerDownLeft,
  IconSparkle,
  IconStop,
} from '../ui/icons'
import Markdown from './Markdown'
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

/* Openers for an empty thread. Deliberately about the shape of a document
   rather than its subject, so they are useful whatever was uploaded. */
const STARTERS = [
  'Summarise this document',
  'What are the key points?',
  'List any dates or deadlines',
  'What does this say about pricing?',
]

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      <span className="typing-dot h-2 w-2 rounded-full bg-brand" />
      <span className="typing-dot h-2 w-2 rounded-full bg-brand" />
      <span className="typing-dot h-2 w-2 rounded-full bg-brand" />
    </span>
  )
}

/**
 * The waiting state, which on CPU is most of the interaction — measured at
 * 25–70s depending on how many chunks are retrieved.
 *
 * It names the phase rather than pulsing anonymously, because the two stages
 * are genuinely different and the app already knows which one it is in:
 * `sources` arrives when retrieval finishes, long before the first token. So
 * "Searching" becoming "Reading N passages" is real progress, not decoration.
 *
 * The elapsed counter appears after two seconds. Below that it is noise; above
 * it, on a forty-second wait, it is the difference between "working" and
 * "frozen".
 */
function ThinkingIndicator({ sourceCount }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const label = sourceCount
    ? `Reading ${sourceCount} passage${sourceCount === 1 ? '' : 's'}`
    : 'Searching your documents'

  return (
    <div className="flex items-center gap-2.5 pt-1.5" role="status" aria-live="polite">
      <TypingIndicator />
      <span className="text-sm text-ink-soft">{label}</span>
      {elapsed >= 2 ? (
        <span className="text-xs tabular-nums text-ink-faint">{elapsed}s</span>
      ) : null}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return undefined
    }
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // The answer is selectable, so failing quietly is better than an alarm.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      {copied ? <IconCheck className="h-3.5 w-3.5 text-ok" /> : <IconCopy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function AssistantMessage({ message }) {
  const [showSources, setShowSources] = useState(true)
  const sources = message.sources || []

  // Keyed off the text itself, not off a `pending` flag. The first delta can
  // carry an empty string — which cleared `pending` while there was still
  // nothing to render, leaving an avatar sitting beside a blank column for the
  // rest of the wait.
  const hasText = Boolean(message.text?.trim())
  const isWaiting = !hasText && message.streaming
  const isStreaming = Boolean(message.streaming && hasText)

  return (
    <div className="animate-fade-up flex w-full flex-col gap-3">
      <div className="flex gap-3.5 sm:gap-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand-line ring-inset">
          <IconSparkle className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          {isWaiting ? (
            <ThinkingIndicator sourceCount={sources.length} />
          ) : hasText ? (
            <Markdown text={message.text} caret={isStreaming} />
          ) : (
            // Finished with nothing to show. Saying so beats an empty bubble
            // that looks like the app dropped the question — and the two ways
            // of getting here are not the same thing.
            <p className="pt-1.5 text-sm italic text-ink-faint">
              {message.stopped
                ? 'Stopped before an answer was written.'
                : 'The model returned an empty answer.'}
            </p>
          )}

          {/* Only once the answer is settled — action buttons appearing and
              shifting mid-stream is noise while you are trying to read. */}
          {!isWaiting && !isStreaming && hasText ? (
            <div className="-ml-2 mt-2 flex items-center gap-1">
              <CopyButton text={message.text} />

              {message.responseMs != null ? (
                <span className="flex items-center gap-1.5 px-1 text-xs text-ink-faint">
                  <IconBolt className="h-3 w-3" />
                  {/* The doc count is not persisted with the query, so a
                      reopened thread has none — show it only when present
                      rather than claiming every past answer searched 0. */}
                  {message.documentsSearched != null
                    ? `${message.documentsSearched} doc${message.documentsSearched === 1 ? '' : 's'} · `
                    : ''}
                  {(message.responseMs / 1000).toFixed(1)}s
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {sources.length ? (
        <div className="pl-11.5 sm:pl-12">
          <button
            type="button"
            onClick={() => setShowSources((open) => !open)}
            aria-expanded={showSources}
            className="group/src inline-flex items-center gap-1.5 rounded-md py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:text-ink"
          >
            <IconChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showSources ? '' : '-rotate-90'
              }`}
            />
            {sources.length} source{sources.length === 1 ? '' : 's'}
          </button>

          {showSources ? (
            <div className="stagger mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {sources.slice(0, 6).map((source, index) => (
                <SourceCard
                  key={`${source.documentId}-${source.chunkIndex}-${index}`}
                  source={source}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div className="animate-fade-up flex w-full justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm leading-relaxed text-on-brand shadow-sm sm:max-w-[75%]">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

/**
 * Auto-growing composer.
 *
 * A textarea rather than an input, because questions about a document are
 * regularly two or three lines and a single-line field hides everything but
 * the tail of what you typed. Enter sends, Shift+Enter breaks the line — the
 * convention every chat surface shares.
 */
function Composer({ value, onChange, onSubmit, onStop, isAsking, disabled, placeholder }) {
  const textareaRef = useRef(null)

  // Reset to auto before measuring, or the box can only ever grow: scrollHeight
  // of an already-tall element includes the height it was given last time.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="relative"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg transition-colors focus-within:border-brand-line">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Ask about your documents"
          className="max-h-50 min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
        />

        {isAsking ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink transition-all duration-150 hover:bg-line-subtle active:scale-90"
          >
            <IconStop />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Send question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-brand transition-all duration-150 hover:bg-brand-hover active:scale-90 disabled:bg-line-strong disabled:text-ink-faint disabled:shadow-none disabled:active:scale-100"
          >
            <IconArrowUp />
          </button>
        )}
      </div>

      <p className="mt-2 hidden items-center justify-center gap-1.5 text-[11px] text-ink-faint sm:flex">
        <kbd className="rounded border border-line bg-surface px-1 py-px font-sans">Enter</kbd>
        to send
        <span className="text-line-strong">·</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border border-line bg-surface px-1 py-px font-sans">
          Shift
          <IconCornerDownLeft />
        </kbd>
        for a new line
      </p>
    </form>
  )
}

function ThreadSkeleton() {
  return (
    <div className="space-y-8 pt-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
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
  // Whether the thread is following new content. Set false the moment the
  // reader scrolls away from the bottom.
  const [isPinned, setPinned] = useState(true)

  const scrollerRef = useRef(null)
  const endRef = useRef(null)
  const abortRef = useRef(null)

  const hasReadyDocuments = documents.some((doc) => doc.status === 'READY')

  // Follow the answer only while the reader is already at the bottom. The old
  // behaviour scrolled on every token, which dragged the view back down each
  // time you tried to scroll up and re-read something mid-answer.
  useEffect(() => {
    if (isPinned) {
      endRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [messages, isPinned])

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setPinned(distance < 80)
  }, [])

  const jumpToLatest = () => {
    setPinned(true)
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  // Abandon an in-flight stream when the view goes away, otherwise its deltas
  // keep patching a message that is no longer on screen.
  //
  // Switching threads is covered by the same cleanup: App keys this component
  // on the conversation id, so a different thread is a different instance.
  // That resets the draft and the scroll pin as well, which is what switching
  // conversations should do anyway.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const submitQuestion = async (question) => {
    if (!question || isAsking) {
      return
    }

    setDraft('')
    setIsAsking(true)
    setPinned(true)

    // Show the question and a placeholder answer straight away, so the thread
    // reacts immediately even though the reply takes many seconds.
    const pendingId = crypto.randomUUID()
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', text: question },
      // `streaming` drives the whole assistant render: with no text yet it
      // shows the thinking indicator, with text it streams, and it is cleared
      // on done/stop/error. There is no separate `pending` flag — an empty
      // first delta used to clear it while the text was still empty, blanking
      // the bubble for the rest of the wait.
      { id: pendingId, role: 'assistant', streaming: true },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      // Patch just the placeholder message as each event lands.
      const update = (patch) =>
        setMessages((current) =>
          current.map((message) => (message.id === pendingId ? { ...message, ...patch } : message))
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
            update({ sources: payload.sources, documentsSearched: payload.documentsSearched })
          } else if (name === 'delta') {
            answer += payload.text || ''
            update({ text: answer })
          } else if (name === 'done') {
            update({ streaming: false, responseMs: payload.responseMs })
          } else if (name === 'error') {
            streamError = payload.message
          }
        },
        controller.signal
      )

      if (streamError) {
        throw new Error(streamError)
      }

      // A stopped answer keeps whatever had arrived, but it was never written
      // to the database, so it is marked rather than left looking complete.
      if (controller.signal.aborted) {
        update({ streaming: false, stopped: true })
        return
      }

      update({ streaming: false })

      // Refresh the thread list only now. Doing it when the conversation was
      // created showed "0 messages", because the Query row is not written
      // until the stream finishes.
      onThreadUpdated()
    } catch (error) {
      // Drop the placeholder rather than leaving it spinning forever.
      setMessages((current) => current.filter((message) => message.id !== pendingId))
      onError(error.message)
    } finally {
      abortRef.current = null
      setIsAsking(false)
    }
  }

  const isEmpty = !isLoadingThread && !messages.length

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-44 pt-8 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
          {isLoadingThread ? <ThreadSkeleton /> : null}

          {messages.map((message) =>
            message.role === 'user' ? (
              <UserMessage key={message.id} text={message.text} />
            ) : (
              <AssistantMessage key={message.id} message={message} />
            )
          )}

          {isEmpty ? (
            <div className="animate-fade-up flex flex-col items-center pt-12 text-center sm:pt-20">
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand ring-1 ring-brand-line ring-inset">
                <IconSparkle className="h-6 w-6" />
              </span>

              <h2 className="font-display text-3xl tracking-[-0.01em] text-ink">
                {hasReadyDocuments ? 'What would you like to know?' : 'Nothing to read yet'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                {hasReadyDocuments
                  ? 'Answers are drawn only from the documents in scope, and every one shows the passages it used.'
                  : 'Upload a PDF to get started. Processing runs in the background, and documents become searchable once ready.'}
              </p>

              {hasReadyDocuments ? (
                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => submitQuestion(starter)}
                      className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-soft shadow-xs transition-all duration-150 hover:-translate-y-px hover:border-brand-line hover:text-ink hover:shadow-sm active:translate-y-0"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </div>

      {/* Jump-to-latest. Only offered once the reader has actually left the
          bottom — a permanently visible button is just clutter. */}
      {!isPinned && messages.length ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="animate-scale-in absolute bottom-36 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-lg transition-colors hover:text-ink"
          aria-label="Jump to latest"
        >
          <IconChevronDown className="h-4 w-4" />
        </button>
      ) : null}

      {/* The gradient stops the thread colliding with the composer as it
          scrolls underneath. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-4 pb-5 pt-14 sm:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={() => submitQuestion(draft.trim())}
            onStop={handleStop}
            isAsking={isAsking}
            disabled={!hasReadyDocuments}
            placeholder={
              hasReadyDocuments ? 'Ask about your documents…' : 'Upload a document to start asking'
            }
          />
        </div>
      </div>
    </div>
  )
}

export default ChatView
