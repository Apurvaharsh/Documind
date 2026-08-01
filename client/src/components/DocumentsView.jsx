import { useRef, useState } from 'react'
import DocumentCard from './DocumentCard'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import Skeleton from './ui/Skeleton'
import { IconDocuments, IconDrag, IconSearch, IconUpload } from './ui/icons'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'READY', label: 'Ready' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'FAILED', label: 'Failed' },
]

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2.5 h-3 w-1/2" />
      <Skeleton className="mt-5 h-7 w-full" />
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
  const [filter, setFilter] = useState('all')
  const [isDragging, setDragging] = useState(false)
  // dragenter/dragleave fire for every child element crossed, so a boolean
  // flickers as the pointer moves over the grid. Counting entries against
  // exits is the only reliable way to know when the cursor has truly left.
  const dragDepth = useRef(0)

  const handleFiles = async (files) => {
    const pdfs = files.filter((file) => file.type === 'application/pdf')
    if (pdfs.length) {
      await onUpload(pdfs)
    }
  }

  const handleInputChange = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    await handleFiles(files)
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    await handleFiles(Array.from(event.dataTransfer?.files || []))
  }

  // documentId -> collection name, for the tag on each card.
  const collectionNames = Object.fromEntries(
    collections.flatMap((collection) =>
      (collection.documents || []).map((doc) => [doc.id, collection.name])
    )
  )

  const term = search.trim().toLowerCase()
  const visible = documents.filter((doc) => {
    const matchesTerm = !term || doc.originalName.toLowerCase().includes(term)
    const matchesFilter =
      filter === 'all' ||
      doc.status === filter ||
      // Queued and processing are the same thing to anyone waiting.
      (filter === 'PROCESSING' && doc.status === 'QUEUED')
    return matchesTerm && matchesFilter
  })

  const counts = documents.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1
    return acc
  }, {})

  const countFor = (id) => {
    if (id === 'all') return documents.length
    if (id === 'PROCESSING') return (counts.PROCESSING || 0) + (counts.QUEUED || 0)
    return counts[id] || 0
  }

  return (
    <div
      onDragEnter={(event) => {
        // Only react to a file drag. Dragging selected text across the page
        // should not put the whole view into a drop state.
        if (!event.dataTransfer?.types?.includes('Files')) return
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDragging(false)
        }
      }}
      onDrop={handleDrop}
      className="relative min-h-full px-5 py-6 sm:px-8 sm:py-8"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-title text-ink">Documents</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {documents.length
                ? `${countFor('READY')} of ${documents.length} ready to query`
                : 'Drop a PDF anywhere on this page to begin'}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => inputRef.current?.click()}
            isLoading={isUploading}
          >
            {isUploading ? null : <IconUpload className="h-4 w-4" />}
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={handleInputChange}
        />

        {documents.length ? (
          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            {FILTERS.map(({ id, label }) => {
              const count = countFor(id)
              const isActive = filter === id
              // Hide a filter that can only ever return nothing.
              if (!count && id !== 'all') return null

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-brand-line bg-brand-soft text-brand-ink'
                      : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {label}
                  <span className={isActive ? 'text-brand' : 'text-ink-faint'}>{count}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : visible.length ? (
          <div className="stagger mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <EmptyState
            className="mt-6"
            size="lg"
            icon={term ? <IconSearch className="h-6 w-6" /> : <IconDocuments className="h-6 w-6" />}
            title={
              term
                ? `No documents match “${search.trim()}”`
                : documents.length
                  ? 'Nothing in this filter'
                  : 'Upload your first PDF'
            }
            hint={
              term
                ? 'Try a different file name, or clear the search.'
                : documents.length
                  ? 'Every document you have is under one of the other filters.'
                  : 'Drag a file anywhere onto this page, or use the button above. Processing runs in the background, so large files never block you.'
            }
            action={
              !term && !documents.length ? (
                <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()}>
                  <IconUpload className="h-4 w-4" />
                  Upload document
                </Button>
              ) : null
            }
          />
        )}
      </div>

      {/* Drop target. Covers the view only while a file is actually over it. */}
      {isDragging ? (
        <div className="animate-fade-in pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-brand-soft/80 backdrop-blur-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-brand">
            <IconDrag />
          </span>
          <p className="mt-4 text-base font-semibold text-brand-ink">Drop to upload</p>
          <p className="mt-1 text-sm text-brand-ink/70">PDF files only</p>
        </div>
      ) : null}
    </div>
  )
}

export default DocumentsView
