import { useCallback, useState } from 'react'
import {
  addDocumentsToCollection,
  createCollection,
  listCollections,
} from '../api/client'

/** Named groups of documents, so one question can span several PDFs. */
export function useCollections(getToken, { onError, onStatus } = {}) {
  const [collections, setCollections] = useState([])

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    try {
      const data = await listCollections(token)
      setCollections(data.collections || [])
    } catch (error) {
      onError?.(error.message)
    }
  }, [getToken, onError])

  const clear = useCallback(() => setCollections([]), [])

  const create = useCallback(
    async (name) => {
      if (!name.trim()) {
        onError?.('Enter a collection name.')
        return false
      }

      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        await createCollection(token, name.trim())
        await refresh()
        onStatus?.(`Collection "${name.trim()}" created.`)
        return true
      } catch (error) {
        onError?.(error.message)
        return false
      }
    },
    [getToken, onError, onStatus, refresh]
  )

  const addDocuments = useCallback(
    async (collectionId, documentIds) => {
      if (!documentIds.length) {
        onError?.('No ready documents to add.')
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        const data = await addDocumentsToCollection(token, collectionId, documentIds)
        await refresh()
        onStatus?.(data.message)
      } catch (error) {
        onError?.(error.message)
      }
    },
    [getToken, onError, onStatus, refresh]
  )

  return { collections, refresh, clear, create, addDocuments }
}
