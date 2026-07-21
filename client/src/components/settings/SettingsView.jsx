import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { getUsage } from '../../api/client'
import CollectionsCard from '../CollectionsCard'
import ApiKeysPanel from './ApiKeysPanel'
import UsageCard from './UsageCard'

// "Collections" is not in the original design, but it has to live somewhere
// reachable and it is closer to settings than to the document grid.
const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'keys', label: 'API keys' },
  { id: 'usage', label: 'Usage' },
  { id: 'collections', label: 'Collections' },
]

function ProfileTab() {
  const { user } = useUser()

  const rows = [
    ['Name', user?.fullName || '—'],
    ['Email', user?.primaryEmailAddress?.emailAddress || '—'],
    ['Joined', user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'],
  ]

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h3 className="mb-1 text-base font-semibold tracking-[-0.01em] text-ink">Profile</h3>
      <p className="mb-5 text-sm text-ink-soft">
        Your account details are managed by Clerk. Use the avatar menu to change them.
      </p>
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="truncate text-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SettingsView({ getToken, userId, collections, documents, onCreate, onAddDocuments, onError, onStatus }) {
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
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6">
        <h2 className="mb-6 text-[30px] font-semibold leading-[38px] tracking-[-0.02em] text-ink">
          Settings
        </h2>

        <div className="flex gap-6 border-b border-line" role="tablist">
          {TABS.map(({ id, label }) => {
            const isActive = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
                  isActive
                    ? 'border-brand font-medium text-brand'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
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
