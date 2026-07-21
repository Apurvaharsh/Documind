import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'
import StatusBadge from './ui/StatusBadge'

function formatSize(bytes) {
  if (!bytes) {
    return null
  }
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function DocumentList({ documents, collections, onDelete }) {
  const readyCount = documents.filter((doc) => doc.status === 'READY').length

  // collectionId -> name, so each row can show which group it belongs to.
  const collectionNames = Object.fromEntries(
    collections.flatMap((collection) =>
      (collection.documents || []).map((doc) => [doc.id, collection.name])
    )
  )

  return (
    <Card
      title="Documents"
      description={
        documents.length ? `${readyCount} of ${documents.length} ready to query` : undefined
      }
    >
      {documents.length ? (
        <ul className="divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{doc.originalName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  {formatSize(doc.fileSize)}
                  {collectionNames[doc.id] ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{collectionNames[doc.id]}</span>
                    </>
                  ) : null}
                </p>
                {doc.errorMessage ? (
                  <p className="mt-1 truncate text-xs text-rose-600" title={doc.errorMessage}>
                    {doc.errorMessage}
                  </p>
                ) : null}
              </div>

              <StatusBadge status={doc.status} />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(doc.id)}
                aria-label={`Delete ${doc.originalName}`}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Upload a PDF to get started"
          hint="Processing runs in the background, so you can keep working."
        />
      )}
    </Card>
  )
}

export default DocumentList
