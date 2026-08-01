const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * fetch(), with a network failure translated into something a person can act
 * on.
 *
 * A refused connection rejects with `TypeError: Failed to fetch` — an internal
 * browser string that says nothing about what broke or what to do. It reached
 * the toast verbatim, so the first thing anyone saw after signing in with the
 * API down was "Failed to fetch".
 *
 * The distinction matters: a TypeError here means the request never reached
 * the server at all. An HTTP error, however unpleasant, is handled below and
 * carries a real message from the API.
 */
async function fetchOrExplain(url, options) {
  try {
    return await fetch(url, options)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    // The original TypeError is kept as the cause: the message shown to the
    // reader is deliberately non-technical, so the technical detail has to
    // survive somewhere for whoever is debugging it.
    throw new Error(
      `Cannot reach the DocuMind server at ${API_BASE_URL}. Check that it is running.`,
      { cause: error }
    )
  }
}

async function request(path, options = {}) {
  const response = await fetchOrExplain(`${API_BASE_URL}${path}`, options)
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.message || 'Request failed'
    throw new Error(message)
  }

  return data
}

function authHeaders(token, json = false) {
  const headers = { Authorization: `Bearer ${token}` }
  if (json) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

// Creates the Qdrant vector collection. Unrelated to user "collections" below -
// this one is the single shared vector store the whole app writes into.
export async function createVectorCollection(token) {
  return request('/create-collection', {
    method: 'GET',
    headers: authHeaders(token),
  })
}

// Ask a question.
// scope: {}                  -> every ready document you own
//        { documentId }      -> one document
//        { collectionId }    -> every ready document in that collection
// conversationId continues an existing thread; omit it to start a new one.
export async function askQuestion(token, question, scope = {}, conversationId) {
  return request('/query', {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ question, ...scope, conversationId }),
  })
}

/**
 * Ask a question and receive the answer as it is written.
 *
 * `onEvent(name, payload)` is called for each Server-Sent Event:
 *   meta    -> { conversationId, conversationTitle }
 *   sources -> { sources, documentsSearched }   (arrives before any text)
 *   delta   -> { text }                          (one fragment of the answer)
 *   done    -> { responseMs }
 *   error   -> { message }
 *
 * `signal` aborts the request. Generation runs for tens of seconds on CPU, so
 * the reader has to be interruptible or "Stop" cannot mean anything. Aborting
 * resolves normally rather than throwing: the caller asked for this, so it is
 * not an error, and every partial token already delivered stays on screen.
 */
export async function askQuestionStream(
  token,
  question,
  scope = {},
  conversationId,
  onEvent,
  signal
) {
  let reader

  // The whole exchange is wrapped, not just the read loop. Retrieval alone
  // takes seconds before a single byte comes back, so Stop is most likely to
  // be pressed while the request is still in flight — and an abort there used
  // to escape as "signal is aborted without reason" and surface to the reader
  // as an error toast for something they deliberately did.
  try {
    const response = await fetchOrExplain(`${API_BASE_URL}/query/stream`, {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify({ question, ...scope, conversationId }),
      signal,
    })

    if (!response.ok) {
      // Errors before the stream starts still arrive as ordinary JSON.
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || `Request failed (${response.status})`)
    }

    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Frames are separated by a blank line. A partial frame stays in the
      // buffer until the rest of it arrives.
      let index
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)

        const name = frame.match(/^event: (.+)$/m)?.[1]
        const data = frame.match(/^data: (.+)$/m)?.[1]
        if (!name || !data) continue

        try {
          onEvent(name, JSON.parse(data))
        } catch {
          // Ignore a frame we cannot parse rather than killing the stream.
        }
      }
    }
  } catch (error) {
    // A deliberate stop is the expected end of the stream, not a failure.
    if (error.name !== 'AbortError') {
      throw error
    }
  } finally {
    // Releasing the lock lets the body cancel cleanly on abort instead of
    // leaving the connection held open. Optional-chained on `reader` itself
    // now: an abort during the fetch means the reader was never created.
    reader?.releaseLock?.()
  }
}

export async function listConversations(token) {
  return request('/conversations', { headers: authHeaders(token) })
}

export async function getConversation(token, id) {
  return request(`/conversations/${id}`, { headers: authHeaders(token) })
}

export async function deleteConversation(token, id) {
  return request(`/conversations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
}

export async function listCollections(token) {
  return request('/collections', { headers: authHeaders(token) })
}

export async function createCollection(token, name, description) {
  return request('/collections', {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ name, description }),
  })
}

export async function addDocumentsToCollection(token, collectionId, documentIds) {
  return request(`/collections/${collectionId}/documents`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ documentIds }),
  })
}

export async function getUsage(token) {
  return request('/usage', { headers: authHeaders(token) })
}

export async function deleteDocument(token, id) {
  return request(`/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
}

// Returns immediately with { documents: [{ id, status: 'QUEUED', ... }] }.
// The PDFs are NOT processed yet at this point - poll getDocumentStatus for that.
export async function uploadDocuments(token, files, collectionId) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('pdfs', file)
  }
  if (collectionId) {
    formData.append('collectionId', collectionId)
  }

  return request('/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
}

export async function getDocumentStatus(token, id) {
  return request(`/documents/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function listDocuments(token) {
  return request('/documents', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function listApiKeys(token) {
  return request('/api/keys', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createApiKey(token, name) {
  return request('/api/keys', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
}

export async function revokeApiKey(token, id) {
  return request(`/api/keys/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
