import { useState } from 'react'
import { askQuestion } from '../api/client'
import Button from './ui/Button'
import Card from './ui/Card'

/**
 * The scope is encoded in a single string so one <select> can drive all three
 * search modes: "all", "col:<id>", "doc:<id>".
 */
function scopeToPayload(scope) {
  if (scope.startsWith('doc:')) {
    return { documentId: scope.slice(4) }
  }
  if (scope.startsWith('col:')) {
    return { collectionId: scope.slice(4) }
  }
  return {}
}

function AskPanel({ getToken, documents, collections, onError }) {
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState('all')
  const [answer, setAnswer] = useState(null)
  const [isAsking, setIsAsking] = useState(false)

  const readyDocuments = documents.filter((doc) => doc.status === 'READY')
  const canAsk = readyDocuments.length > 0

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!question.trim()) {
      onError('Enter a question.')
      return
    }

    setIsAsking(true)
    setAnswer(null)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Please sign in first.')
      }

      const data = await askQuestion(token, question.trim(), scopeToPayload(scope))
      setAnswer(data)
    } catch (error) {
      onError(error.message)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <Card
      title="Ask"
      description={
        canAsk
          ? 'Answers are generated only from the documents you select.'
          : 'Upload and process a PDF first.'
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          disabled={!canAsk}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink disabled:opacity-60"
        >
          <option value="all">All my documents</option>
          {collections.map((collection) => (
            <option key={collection.id} value={`col:${collection.id}`}>
              Collection · {collection.name}
            </option>
          ))}
          {readyDocuments.map((doc) => (
            <option key={doc.id} value={`doc:${doc.id}`}>
              Document · {doc.originalName}
            </option>
          ))}
        </select>

        <textarea
          rows="3"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={!canAsk}
          placeholder="What are the key terms in this contract?"
          className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted disabled:opacity-60"
        />

        <Button type="submit" variant="primary" disabled={isAsking || !canAsk}>
          {isAsking ? 'Searching…' : 'Ask'}
        </Button>
      </form>

      {isAsking ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          <div className="h-3 w-3/4 animate-pulse rounded bg-canvas" />
          <div className="h-3 w-full animate-pulse rounded bg-canvas" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-canvas" />
        </div>
      ) : null}

      {answer ? (
        <article className="mt-4 border-t border-line pt-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-ink">{answer.text}</p>

          <p className="mt-3 text-xs text-ink-muted">
            Searched {answer.documentsSearched ?? 0} document(s) in{' '}
            {((answer.responseMs ?? 0) / 1000).toFixed(1)}s
          </p>

          {answer.sources?.length ? (
            <div className="mt-3 rounded-lg bg-canvas px-3 py-2.5">
              <h3 className="text-xs font-medium text-ink-soft">Sources</h3>
              <ul className="mt-1.5 space-y-1">
                {answer.sources.slice(0, 5).map((source, index) => (
                  <li
                    key={`${source.documentId}-${source.chunkIndex}-${index}`}
                    className="flex items-center justify-between gap-2 text-xs text-ink-muted"
                  >
                    <span className="truncate">
                      {source.fileName} · chunk {source.chunkIndex}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {source.score?.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}
    </Card>
  )
}

export default AskPanel
