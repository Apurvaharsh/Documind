import { useCallback, useEffect, useState } from 'react'
import { createApiKey, listApiKeys, revokeApiKey } from '../../api/client'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import { IconAlert, IconCheck, IconCopy, IconKey, IconPlus } from '../ui/icons'

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
  // Revoking is irreversible and instantly breaks whatever is using the key,
  // so it takes two clicks. Holds the id awaiting confirmation.
  const [confirmingId, setConfirmingId] = useState(null)

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

  useEffect(() => {
    if (!copied) {
      return undefined
    }
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

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
    setConfirmingId(null)
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
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink">API keys</h3>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            Call DocuMind from your own code. A key carries the same access as your account.
          </p>
        </div>

        <Button variant="primary" onClick={handleCreate} isLoading={isCreating}>
          {isCreating ? null : <IconPlus className="h-4 w-4" />}
          Create key
        </Button>
      </div>

      {freshKey ? (
        <div className="animate-fade-up flex flex-col gap-3 rounded-xl border border-warn-line bg-warn-soft p-3.5">
          <div className="flex items-center gap-2 text-warn">
            <IconAlert className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              Copy this now — it will not be shown again
            </span>
          </div>

          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-warn-line bg-surface px-3 py-2 font-mono text-xs text-ink">
              {freshKey}
            </code>
            <Button variant="secondary" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <IconCheck className="h-4 w-4 text-ok" />
              ) : (
                <IconCopy className="h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : null}

      {apiKeys.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-sunken">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                    Key
                  </th>
                  <th className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint sm:table-cell">
                    Created
                  </th>
                  <th className="hidden px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint sm:table-cell">
                    Last used
                  </th>
                  <th className="w-28 px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-line-subtle transition-colors last:border-b-0 hover:bg-surface-sunken"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {key.maskedKey || '—'}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft sm:table-cell">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft sm:table-cell">
                      {formatLastUsed(key.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmingId === key.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRevoke(key.id)}
                            className="rounded-md bg-danger-soft px-2 py-1 text-xs font-semibold text-danger transition-colors hover:brightness-95"
                          >
                            Revoke
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="rounded-md px-1.5 py-1 text-xs text-ink-muted transition-colors hover:text-ink"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(key.id)}
                          className="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<IconKey className="h-5 w-5" />}
          title="No API keys yet"
          hint="Create one to call the API from your own code."
        />
      )}
    </div>
  )
}

export default ApiKeysPanel
