import { SignUpButton } from '@clerk/clerk-react'
import ProductMockup from './ProductMockup'
import { IconQuote, IconSearch, IconSpeed } from './ui/icons'

const FEATURES = [
  {
    Icon: IconSpeed,
    title: 'Background processing',
    body: 'Upload large PDFs without waiting.',
  },
  {
    Icon: IconSearch,
    title: 'Cross-document search',
    body: 'Group files and ask across all of them.',
  },
  {
    Icon: IconQuote,
    title: 'Cited answers',
    body: 'Every response shows the passages it used.',
  },
]

const STEPS = ['Upload', 'Process', 'Ask']

function SignedOutHero() {
  return (
    <main className="flex flex-grow flex-col items-center">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
        <h1 className="max-w-2xl text-[30px] font-semibold leading-[38px] tracking-[-0.02em] text-ink sm:text-4xl sm:leading-tight">
          Ask questions across your PDFs
        </h1>
        <p className="max-w-xl text-sm leading-5 text-ink-soft sm:text-base sm:leading-7">
          Get accurate answers from your own documents with verifiable sources attached.
        </p>
        <div className="pt-4">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-deep"
            >
              Start for free
            </button>
          </SignUpButton>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <ProductMockup />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6"
            >
              <span className="mb-2 text-brand">
                <Icon />
              </span>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</h3>
              <p className="text-sm leading-5 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full border-y border-line bg-surface py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-base font-semibold tracking-[-0.01em] text-ink">
            How it works
          </h2>

          <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4">
            {/* The connecting rule sits behind the numbered steps. */}
            <div className="absolute left-0 top-1/2 hidden h-px w-full -translate-y-1/2 bg-line md:block" />

            {STEPS.map((step, index) => (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center gap-2 bg-surface px-4 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="text-sm font-medium text-ink">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default SignedOutHero
