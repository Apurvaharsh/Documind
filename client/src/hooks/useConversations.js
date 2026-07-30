import { useCallback, useState } from 'react'
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
    setActiveId(null)
    setMessages([])
  }, [])

  const open = useCallback(
    async (id) => {
      setActiveId(id)
      setIsLoadingThread(true)
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        const data = await getConversation(token, id)
        setMessages((data.conversation.queries || []).flatMap(toMessages))
      } catch (error) {
        onError?.(error.message)
      } finally {
        setIsLoadingThread(false)
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
        setActiveId((current) => {
          if (current === id) {
            setMessages([])
            return null
          }
          return current
        })
      } catch (error) {
        onError?.(error.message)
      }
    },
    [getToken, onError]
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
