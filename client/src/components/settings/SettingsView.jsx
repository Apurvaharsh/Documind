import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { getUsage } from '../../api/client'
import CollectionsCard from '../CollectionsCard'
import { IconGauge, IconKey, IconLayers, IconUser } from '../ui/icons'
import ApiKeysPanel from './ApiKeysPanel'
import UsageCard from './UsageCard'

// "Collections" is not in the original design, but it has to live somewhere
// reachable and it is closer to settings than to the document grid.
const TABS = [
  { id: 'keys', label: 'API keys', Icon: IconKey },
  { id: 'usage', label: 'Usage', Icon: IconGauge },
  { id: 'collections', label: 'Collections', Icon: IconLayers },
  { id: 'profile', label: 'Profile', Icon: IconUser },
]

function ProfileTab() {
  const { user } = useUser()

  const rows = [
    ['Name', user?.fullName || '—'],
    ['Email', user?.primaryEmailAddress?.emailAddress || '—'],
    ['Joined', user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'],
  ]

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink">Profile</h3>
      <p className="mt-0.5 text-xs text-ink-muted">
        Managed by Clerk. Use the avatar menu in the top bar to change them.
      </p>

      <dl className="mt-4 divide-y divide-line-subtle">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="shrink-0 text-sm text-ink-soft">{label}</dt>
            <dd className="truncate text-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SettingsView({
  getToken,
  userId,
  collections,
  documents,
  onCreate,
  onAddDocuments,
  onError,
  onStatus,
}) {
  const [tab, setTab] = useState('keys')
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setUsage(null)
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          return
        }
        const data = await getUsage(token)
        setUsage(data.usage)
      } catch (error) {
        onError(error.message)
      }
    }

    load()
  }, [userId, getToken, onError])

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
      <h1 className="font-display text-title text-ink">Settings</h1>

      {/* A segmented control rather than an underline row: at four items the
          underline reads as a nav bar for the whole app, and this is a switch
          between panels inside one page. */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-sunken p-1"
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-brand' : ''}`} />
              {label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-5 lg:col-span-2">
          {tab === 'profile' ? <ProfileTab /> : null}

          {tab === 'keys' ? (
            <ApiKeysPanel
              getToken={getToken}
              userId={userId}
              onError={onError}
              onStatus={onStatus}
            />
          ) : null}

          {tab === 'usage' ? <UsageCard usage={usage} /> : null}

          {tab === 'collections' ? (
            <CollectionsCard
              collections={collections}
              documents={documents}
              onCreate={onCreate}
              onAddDocuments={onAddDocuments}
            />
          ) : null}
        </div>

        {/* The usage card doubles as the sidebar on the other tabs, matching
            the two-column layout in the design. */}
        {tab !== 'usage' ? (
          <div className="lg:col-span-1">
            <UsageCard usage={usage} />
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default SettingsView
