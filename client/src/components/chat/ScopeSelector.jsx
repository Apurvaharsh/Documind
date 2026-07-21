import { IconChevronDown } from '../ui/icons'

/**
 * One <select> drives all three search scopes. The value is encoded as
 * "all" | "col:<id>" | "doc:<id>" so it stays a single piece of state.
 */
function ScopeSelector({ scope, onScopeChange, collections, documents, searchCount }) {
  const readyDocuments = documents.filter((doc) => doc.status === 'READY')

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <select
          value={scope}
          onChange={(event) => onScopeChange(event.target.value)}
          aria-label="Search scope"
          className="appearance-none rounded-lg border border-line bg-surface py-1.5 pl-3 pr-9 text-sm font-medium text-ink transition-colors hover:bg-canvas"
        >
          <option value="all">All documents</option>
          {collections.map((collection) => (
            <option key={collection.id} value={`col:${collection.id}`}>
              {collection.name}
            </option>
          ))}
          {readyDocuments.map((doc) => (
            <option key={doc.id} value={`doc:${doc.id}`}>
              {doc.originalName}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft">
          <IconChevronDown className="h-4 w-4" />
        </span>
      </div>

      <div className="hidden items-center gap-1.5 rounded-full border border-line bg-canvas px-2 py-1 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        <span className="text-xs text-ink-soft">
          searching {searchCount} document{searchCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}

export default ScopeSelector
