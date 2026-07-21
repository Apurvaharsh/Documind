import { useCallback, useState } from 'react'
import {
  deleteDocument as apiDeleteDocument,
  getDocumentStatus,
  listDocuments,
  uploadDocuments,
} from '../api/client'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 150 // ~5 minutes before giving up

/**
 * Owns the document list and the polling loop.
 *
 * Uploads return as soon as the files are queued, so the only way to learn
 * that a PDF finished processing is to keep asking the server.
 */
export function useDocuments(getToken, { onError, onStatus } = {}) {
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    try {
      const data = await listDocuments(token)
      setDocuments(data.documents || [])
    } catch (error) {
      onError?.(error.message)
    }
  }, [getToken, onError])

  const clear = useCallback(() => setDocuments([]), [])

  const pollUntilFinished = useCallback(async (token, documentId) => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      const data = await getDocumentStatus(token, documentId)
      const updated = data.document

      // Replace just this document, leave the rest of the list alone.
      setDocuments((current) =>
        current.map((doc) => (doc.id === updated.id ? { ...doc, ...updated } : doc))
      )

      if (updated.status === 'READY' || updated.status === 'FAILED') {
        return updated
      }
    }

    throw new Error('Timed out waiting for processing to finish.')
  }, [])

  const upload = useCallback(
    async (files, collectionId) => {
      if (!files.length) {
        onError?.('Select at least one PDF.')
        return
      }

      setIsUploading(true)
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        const data = await uploadDocuments(token, files, collectionId)
        const queued = data.documents || []
        setDocuments((current) => [...queued, ...current])
        onStatus?.(`${queued.length} file(s) queued. Processing in the background.`)

        const results = await Promise.all(
          queued.map((doc) => pollUntilFinished(token, doc.id))
        )

        const failed = results.filter((doc) => doc.status === 'FAILED').length
        onStatus?.(
          failed
            ? `${failed} file(s) failed to process.`
            : 'All files processed and ready to query.'
        )
      } catch (error) {
        onError?.(error.message)
      } finally {
        setIsUploading(false)
      }
    },
    [getToken, onError, onStatus, pollUntilFinished]
  )

  const remove = useCallback(
    async (id) => {
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Please sign in first.')
        }

        const data = await apiDeleteDocument(token, id)
        setDocuments((current) => current.filter((doc) => doc.id !== id))
        onStatus?.(data.message)
      } catch (error) {
        onError?.(error.message)
      }
    },
    [getToken, onError, onStatus]
  )

  return { documents, isUploading, refresh, clear, upload, remove }
}
