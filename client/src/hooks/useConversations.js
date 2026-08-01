import { useCallback, useRef, useState } from 'react'
import {
  deleteConversation as apiDeleteConversation,
  getConversation,
  listConversations,
} from '../api/client'

/** Turn a stored Query row back into the two messages it represents. */
function toMessages(query) {
  return [
    { id: `${query.id}-q`, role: 'user', text: query.question },
    {
      id: `${query.id}-a`,
      role: 'assistant',
      text: query.answer,
      sources: query.sources || [],
      responseMs: query.responseMs,
    },
  ]
}

export function useConversations(getToken, { onError } = {}) {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  // Identifies the most recent open() call. If two overlap — a quick switch
  // from thread A to B on a slow network — only the latest one is allowed to
  // write its result, so B's request finishing first cannot be overwritten by
  // A's arriving late and leaving B's title above A's messages.
  const openRequestRef = useRef(0)

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    try {
      const data = await listConversations(token)
      setConversations(data.conversations || [])
    } catch (error) {
      onError?.(error.message)
    }
  }, [getToken, onError])

  const clear = useCallback(() => {
    setConversations([])
    setActiveId(null)
    setMessages([])
  }, [])

  // Start a fresh thread. The id is assigned by the server on the first answer.
  const startNew = useCallback(() => {
    // Invalidate any in-flight open() so its late result cannot drop the
    // stored thread's messages into this blank new chat.
    openRequestRef.current += 1
    setActiveId(null)
    setMessages([])
  }, [])

  const open = useCallback(
    async (id) => {
      const requestId = ++openRequestRef.current
      setActiveId(id)
      setIsLoadingThread(true)
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        const data = await getConversation(token, id)
        // A newer open() has superseded this one; drop the stale result.
        if (requestId !== openRequestRef.current) {
          return
        }
        setMessages((data.conversation.queries || []).flatMap(toMessages))
      } catch (error) {
        if (requestId === openRequestRef.current) {
          onError?.(error.message)
        }
      } finally {
        // Only the latest request owns the loading flag, or an early-finishing
        // stale one would clear the spinner while the current load runs.
        if (requestId === openRequestRef.current) {
          setIsLoadingThread(false)
        }
      }
    },
    [getToken, onError]
  )

  const remove = useCallback(
    async (id) => {
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        await apiDeleteConversation(token, id)
        setConversations((current) => current.filter((entry) => entry.id !== id))

        // Deleting the open thread leaves the pane on a blank new chat.
        // activeId is a dependency, so it is read directly here rather than
        // through a setState updater — an updater must be pure, and the old
        // one called setMessages from inside setActiveId, which double-fired
        // under StrictMode.
        if (activeId === id) {
          openRequestRef.current += 1
          setActiveId(null)
          setMessages([])
        }
      } catch (error) {
        onError?.(error.message)
      }
    },
    [getToken, onError, activeId]
  )

  return {
    conversations,
    activeId,
    setActiveId,
    messages,
    setMessages,
    isLoadingThread,
    refresh,
    clear,
    startNew,
    open,
    remove,
  }
}
