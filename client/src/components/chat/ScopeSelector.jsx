import { IconChevronDown, IconLayers } from '../ui/icons'

/**
 * One <select> drives all three search scopes. The value is encoded as
 * "all" | "col:<id>" | "doc:<id>" so it stays a single piece of state.
 *
 * A native select rather than a custom listbox: it is the one control that
 * behaves correctly on a phone without any work, and this is the control most
 * likely to be reached for on one.
 *
 * The count beside it is the honest answer to "what is actually being
 * searched" — a scope covering zero ready documents looks identical to a
 * healthy one otherwise, and silently returns nothing.
 */
function ScopeSelector({ scope, onScopeChange, collections, documents, searchCount }) {
  const readyDocuments = documents.filter((doc) => doc.status === 'READY')
  const isEmpty = searchCount === 0

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="group relative min-w-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors group-hover:text-ink-soft">
          <IconLayers />
        </span>

        <select
          value={scope}
          onChange={(event) => onScopeChange(event.target.value)}
          aria-label="Search scope"
          className="w-full max-w-56 cursor-pointer appearance-none truncate rounded-lg border border-line bg-surface py-2 pl-9 pr-8 text-sm font-medium text-ink shadow-xs transition-colors hover:border-line-strong sm:max-w-72"
        >
          <option value="all">All documents</option>

          {collections.length ? (
            <optgroup label="Collections">
              {collections.map((collection) => (
                <option key={collection.id} value={`col:${collection.id}`}>
                  {collection.name}
                </option>
              ))}
            </optgroup>
          ) : null}

          {readyDocuments.length ? (
            <optgroup label="Documents">
              {readyDocuments.map((doc) => (
                <option key={doc.id} value={`doc:${doc.id}`}>
                  {doc.originalName}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
          <IconChevronDown className="h-4 w-4" />
        </span>
      </div>

      <div
        className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors md:flex ${
          isEmpty
            ? 'border-warn-line bg-warn-soft text-warn'
            : 'border-line bg-surface-sunken text-ink-soft'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isEmpty ? 'bg-warn' : 'bg-ok'}`} />
        {isEmpty ? 'nothing ready to search' : `${searchCount} document${searchCount === 1 ? '' : 's'}`}
      </div>
    </div>
  )
}

export default ScopeSelector
