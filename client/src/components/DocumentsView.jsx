import { useRef } from 'react'
import DocumentCard from './DocumentCard'
import Button from './ui/Button'
import { IconUpload } from './ui/icons'

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-canvas" />
      <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-canvas" />
      <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-canvas" />
    </div>
  )
}

function DocumentsView({
  documents,
  collections,
  search,
  isUploading,
  isLoading,
  onUpload,
  onDelete,
  onAsk,
  fileInputRef,
}) {
  const localRef = useRef(null)
  const inputRef = fileInputRef || localRef

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length) {
      await onUpload(files)
    }
  }

  // documentId -> collection name, for the tag on each card.
  const collectionNames = Object.fromEntries(
    collections.flatMap((collection) =>
      (collection.documents || []).map((doc) => [doc.id, collection.name])
    )
  )

  const term = search.trim().toLowerCase()
  const visible = term
    ? documents.filter((doc) => doc.originalName.toLowerCase().includes(term))
    : documents

  return (
    <div className="px-8 py-7">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">Documents</h1>
        <Button
          variant="primary"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="px-5 py-3"
        >
          <IconUpload className="h-4 w-4" />
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="sr-only"
        onChange={handleFiles}
      />

      {isLoading ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visible.length ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              collectionName={collectionNames[doc.id]}
              onDelete={onDelete}
              onAsk={onAsk}
            />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="text-base font-medium text-ink">
            {term ? 'No documents match that search' : 'Upload your first PDF'}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
            {term
              ? 'Try a different file name.'
              : 'Processing runs in the background, so large files never block the page.'}
          </p>
          {!term ? (
            <Button
              variant="primary"
              onClick={() => inputRef.current?.click()}
              className="mt-5 px-5 py-2.5"
            >
              <IconUpload className="h-4 w-4" />
              Upload Document
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default DocumentsView
