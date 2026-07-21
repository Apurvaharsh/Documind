import { SignUpButton } from '@clerk/clerk-react'
import Button from './ui/Button'

const STEPS = [
  {
    title: 'Upload',
    body: 'Drop in PDFs. Processing runs on a background worker, so large files never block the page.',
  },
  {
    title: 'Group',
    body: 'Organise documents into collections when a question spans more than one file.',
  },
  {
    title: 'Ask',
    body: 'Answers cite the chunks they came from, scoped to a single document or a whole collection.',
  },
]

function SignedOutHero() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Ask questions across your PDFs
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-soft">
        DocuMind reads your documents, then answers from their contents — with the
        source passages attached, so you can check the work.
      </p>

      <div className="mt-8 flex justify-center">
        <SignUpButton mode="modal">
          <Button variant="primary">Get started</Button>
        </SignUpButton>
      </div>

      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-xl border border-line bg-surface p-5">
            <span className="text-xs font-medium text-brand">0{index + 1}</span>
            <h2 className="mt-2 text-sm font-medium text-ink">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SignedOutHero
