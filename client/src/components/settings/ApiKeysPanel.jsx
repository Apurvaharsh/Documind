import { useCallback, useEffect, useState } from 'react'
import { createApiKey, listApiKeys, revokeApiKey } from '../../api/client'
import { IconCopy, IconInfo } from '../ui/icons'

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    : '—'
}

function formatLastUsed(value) {
  if (!value) {
    return 'Never'
  }

  const hours = (Date.now() - new Date(value).getTime()) / 3600000
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${Math.round(hours)} hours ago`
  return formatDate(value)
}

function ApiKeysPanel({ getToken, userId, onError, onStatus }) {
  const [apiKeys, setApiKeys] = useState([])
  const [freshKey, setFreshKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

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

  const handleCreate = async () => {
    // The design has no name field, so the key is named on creation and can be
    // renamed later. A prompt would block; a default keeps the flow moving.
    const name = `Key ${apiKeys.length + 1}`

    setIsCreating(true)
    try {
      const token = await getToken()
      const data = await createApiKey(token, name)
      setFreshKey(data.key || '')
      setCopied(false)
      await refresh()
    } catch (error) {
      onError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(freshKey)
      setCopied(true)
    } catch {
      onError('Could not copy. Select the key and copy manually.')
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 text-base font-semibold tracking-[-0.01em] text-ink">API keys</h3>
          <p className="text-sm text-ink-soft">
            Manage your API keys to integrate DocuMind with your own applications.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
        >
          {isCreating ? 'Creating…' : 'Create key'}
        </button>
      </div>

      {freshKey ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <IconInfo className="h-4 w-4" />
            <span className="text-sm font-medium">Copy this now — it won&rsquo;t be shown again</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded border border-amber-200 bg-surface px-3 py-2 font-mono text-xs text-ink dark:border-amber-900">
              {freshKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy key"
              className="flex items-center justify-center rounded border border-amber-200 bg-surface p-2 text-ink-soft transition-colors hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-900"
            >
              <IconCopy className="h-4 w-4" />
            </button>
          </div>
          {copied ? <span className="text-xs text-amber-800 dark:text-amber-300">Copied to clipboard</span> : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-canvas">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
                Name
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
                Key
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted sm:table-cell">
                Created
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted sm:table-cell">
                Last used
              </th>
              <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {apiKeys.length ? (
              apiKeys.map((key) => (
                <tr
                  key={key.id}
                  className="group border-b border-line transition-colors last:border-b-0 hover:bg-canvas"
                >
                  <td className="px-4 py-3 font-medium text-ink">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {key.maskedKey || '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {formatLastUsed(key.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-ink-soft opacity-0 transition-colors hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No API keys yet. Create one to call the API from your own code.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ApiKeysPanel
