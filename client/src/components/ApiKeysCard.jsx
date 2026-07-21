import { useCallback, useEffect, useState } from 'react'
import { createApiKey, listApiKeys, revokeApiKey } from '../api/client'
import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'

function ApiKeysCard({ getToken, userId, onError, onStatus }) {
  const [apiKeys, setApiKeys] = useState([])
  const [name, setName] = useState('')
  // Shown once, right after creation - the server never returns it again.
  const [freshKey, setFreshKey] = useState('')

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      return
    }

    try {
      const data = await listApiKeys(token)
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      onError(error.message)
    }
  }, [getToken, onError])

  useEffect(() => {
    const sync = async () => {
      if (!userId) {
        setApiKeys([])
        return
      }
      await refresh()
    }

    sync()
  }, [userId, refresh])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      onError('Enter a key name.')
      return
    }

    try {
      const token = await getToken()
      const data = await createApiKey(token, name.trim())
      setFreshKey(data.key || '')
      setName('')
      await refresh()
    } catch (error) {
      onError(error.message)
    }
  }

  const handleRevoke = async (id) => {
    try {
      const token = await getToken()
      await revokeApiKey(token, id)
      await refresh()
      onStatus('API key revoked.')
    } catch (error) {
      onError(error.message)
    }
  }

  return (
    <Card title="API keys" description="Use these to call the API without a browser.">
      <form className="flex gap-2" onSubmit={handleCreate}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="CI pipeline"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
        />
        <Button type="submit" variant="secondary">
          Create
        </Button>
      </form>

      {freshKey ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-medium text-amber-800">
            Copy this now — it will not be shown again.
          </p>
          <code className="mt-1.5 block break-all rounded bg-white px-2 py-1.5 text-xs text-ink">
            {freshKey}
          </code>
        </div>
      ) : null}

      <div className="mt-3">
        {apiKeys.length ? (
          <ul className="divide-y divide-line">
            {apiKeys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{key.name}</p>
                  <p className="text-xs text-ink-muted">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : 'Never used'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No API keys yet" />
        )}
      </div>
    </Card>
  )
}

export default ApiKeysCard
