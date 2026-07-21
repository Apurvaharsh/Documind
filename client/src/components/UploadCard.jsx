import { useRef, useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'

function UploadCard({ collections, isUploading, onUpload }) {
  const [files, setFiles] = useState([])
  const [collectionId, setCollectionId] = useState('')
  const inputRef = useRef(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onUpload(files, collectionId || undefined)
    setFiles([])
    // The file input keeps its own internal value, so clear it directly.
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <Card title="Upload" description="PDFs are processed in the background.">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label
          htmlFor="pdfs"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-6 text-center transition-colors hover:border-brand hover:bg-brand-soft"
        >
          <span className="text-sm font-medium text-ink">
            {files.length ? `${files.length} file(s) selected` : 'Choose PDF files'}
          </span>
          <span className="mt-0.5 text-xs text-ink-muted">Up to 10 at a time</span>
          <input
            id="pdfs"
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
        </label>

        {collections.length ? (
          <select
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">No collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                Add to: {collection.name}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          disabled={isUploading || !files.length}
          className="w-full"
        >
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
      </form>
    </Card>
  )
}

export default UploadCard
