import { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'

function CollectionsCard({ collections, documents, onCreate, onAddDocuments }) {
  const [name, setName] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const created = await onCreate(name)
    if (created) {
      setName('')
    }
  }

  // Only READY documents are worth adding - the others cannot be searched yet.
  const readyIds = documents.filter((doc) => doc.status === 'READY').map((doc) => doc.id)

  return (
    <Card
      title="Collections"
      description="Group documents to search them together."
    >
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Q4 reports"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
        />
        <Button type="submit" variant="secondary">
          Create
        </Button>
      </form>

      <div className="mt-3">
        {collections.length ? (
          <ul className="divide-y divide-line">
            {collections.map((collection) => (
              <li
                key={collection.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{collection.name}</p>
                  <p className="text-xs text-ink-muted">
                    {collection._count?.documents ?? 0} document(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!readyIds.length}
                  onClick={() => onAddDocuments(collection.id, readyIds)}
                >
                  Add ready
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Create a collection to search several PDFs at once" />
        )}
      </div>
    </Card>
  )
}

export default CollectionsCard
