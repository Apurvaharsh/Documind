import { SignUpButton } from '@clerk/clerk-react'
import ProductMockup from './ProductMockup'
import Button from './ui/Button'
import { IconBolt, IconQuote, IconSearch, IconSparkle, IconSpeed } from './ui/icons'

const FEATURES = [
  {
    Icon: IconSpeed,
    title: 'Background processing',
    body: 'Upload returns immediately and parsing runs in a worker, so a 300-page PDF never blocks the page.',
  },
  {
    Icon: IconSearch,
    title: 'Cross-document search',
    body: 'Group files into a collection and ask one question across all of them at once.',
  },
  {
    Icon: IconQuote,
    title: 'Cited answers',
    body: 'Every response carries the passages it was built from, down to the page number.',
  },
]

const STEPS = [
  { title: 'Upload', body: 'Drop in a PDF. Parsing and embedding start straight away.' },
  { title: 'Process', body: 'Text is split, embedded, and indexed for retrieval.' },
  { title: 'Ask', body: 'Questions are answered from your documents, with sources.' },
]

function SignedOutHero() {
  return (
    <main className="flex flex-grow flex-col items-center">
      {/* -- Hero ---------------------------------------------------------- */}
      <section className="relative w-full overflow-hidden">
        {/* A soft brand wash behind the fold. Radial rather than linear so it
            falls off in every direction and never draws a visible seam across
            the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_35%,var(--color-brand-soft),transparent_70%)]"
        />

        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pb-16 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft shadow-xs">
            <IconSparkle className="h-3.5 w-3.5 text-brand" />
            Answers grounded in your own documents
          </span>

          {/* The one place the serif runs at full size. An italic clause inside
              a roman headline gives the sentence a stress without needing a
              second colour or weight. */}
          <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.025em] text-ink sm:text-6xl">
            Ask questions across
            <br className="hidden sm:block" /> your PDFs, <em className="text-brand">with proof</em>
          </h1>

          <p className="max-w-xl text-base leading-7 text-ink-soft">
            Upload your documents and get straight answers — each one showing the exact passages it
            came from, so you never have to take it on trust.
          </p>

          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
            <SignUpButton mode="modal">
              <Button variant="primary" size="lg" className="px-7">
                Start for free
              </Button>
            </SignUpButton>
            <span className="text-xs text-ink-faint">No card required</span>
          </div>
        </div>
      </section>

      {/* -- Product ------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-6">
        <ProductMockup />
      </section>

      {/* -- Features ------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-line hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand-line ring-inset">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink">{title}</h3>
              <p className="text-sm leading-6 text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -- How it works -------------------------------------------------- */}
      <section className="w-full border-t border-line bg-surface py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <h2 className="text-center font-display text-title text-ink">How it works</h2>

          <div className="relative mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {/* The connecting rule sits behind the numbered steps and stops
                short of the outer two, so it reads as joining them rather than
                running off the edge of the section. */}
            <div
              aria-hidden="true"
              className="absolute left-[16.67%] right-[16.67%] top-5 hidden h-px bg-line md:block"
            />

            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="relative z-10 flex flex-col items-center gap-3 px-4 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface font-display text-lg text-brand shadow-sm">
                  {index + 1}
                </div>
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
                <p className="max-w-xs text-sm leading-6 text-ink-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Closing CTA --------------------------------------------------- */}
      <section className="w-full border-t border-line px-5 py-20 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <IconBolt className="h-5 w-5 text-brand" />
          <h2 className="font-display text-title text-ink">Put your documents to work</h2>
          <p className="max-w-md text-sm leading-6 text-ink-muted">
            Upload a PDF and ask it something in under a minute.
          </p>
          <SignUpButton mode="modal">
            <Button variant="primary" size="lg" className="px-7">
              Start for free
            </Button>
          </SignUpButton>
        </div>
      </section>
    </main>
  )
}

export default SignedOutHero
