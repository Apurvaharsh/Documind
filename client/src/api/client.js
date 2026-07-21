const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
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

export async function createCollection(token) {
  return request('/create-collection', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

// Returns immediately with { documents: [{ id, status: 'QUEUED', ... }] }.
// The PDFs are NOT processed yet at this point - poll getDocumentStatus for that.
export async function uploadDocuments(token, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('pdfs', file)
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
