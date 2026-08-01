import { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'
import { IconLayers, IconPlus } from './ui/icons'

function CollectionsCard({ collections, documents, onCreate, onAddDocuments }) {
  const [name, setName] = useState('')
  const [isCreating, setCreating] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      return
    }

    setCreating(true)
    try {
      const created = await onCreate(name.trim())
      if (created) {
        setName('')
      }
    } finally {
      setCreating(false)
    }
  }

  // Only READY documents are worth adding — the others cannot be searched yet.
  const readyIds = documents.filter((doc) => doc.status === 'READY').map((doc) => doc.id)

  return (
    <Card title="Collections" description="Group documents to search them together.">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Q4 reports"
          aria-label="Collection name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-xs transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-brand-line focus:outline-none"
        />
        <Button type="submit" variant="subtle" disabled={!name.trim()} isLoading={isCreating}>
          {isCreating ? null : <IconPlus className="h-4 w-4" />}
          Create
        </Button>
      </form>

      <div className="mt-4">
        {collections.length ? (
          <ul className="divide-y divide-line-subtle">
            {collections.map((collection) => (
              <li key={collection.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <IconLayers />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{collection.name}</p>
                  <p className="text-xs text-ink-faint">
                    {collection._count?.documents ?? 0} document
                    {collection._count?.documents === 1 ? '' : 's'}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!readyIds.length}
                  onClick={() => onAddDocuments(collection.id, readyIds)}
                  title={
                    readyIds.length
                      ? `Add all ${readyIds.length} ready documents`
                      : 'No ready documents to add'
                  }
                >
                  Add ready
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<IconLayers className="h-5 w-5" />}
            title="No collections yet"
            hint="Create one to ask a question across several PDFs at once."
          />
        )}
      </div>
    </Card>
  )
}

export default CollectionsCard
