import type { ReactNode } from 'react'

/**
 * The reading layout for the public content and legal pages: one narrow column
 * on the paper canvas, with the section heading sitting in the left margin at
 * wide sizes rather than stacked above the text.
 */
export function Article({
  eyebrow,
  title,
  standfirst,
  updated,
  children,
}: {
  eyebrow?: string
  title: string
  standfirst?: string
  /** ISO date shown as "Last updated". Used on the legal pages. */
  updated?: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-2xl">
        {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
        <h1 className="mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">{title}</h1>
        {standfirst ? (
          <p className="mt-4 text-lg leading-8 text-ink-muted">{standfirst}</p>
        ) : null}
        {updated ? (
          <p className="mt-4 text-[0.8125rem] text-ink-faint">Last updated {updated}</p>
        ) : null}
      </header>
      <div className="mt-10 border-t border-rule pt-10">{children}</div>
    </article>
  )
}

/**
 * One section of an article. The heading sits beside the body on wide screens,
 * which gives the page a rhythm without resorting to cards.
 */
export function Section({
  heading,
  children,
  id,
}: {
  heading: string
  children: ReactNode
  id?: string
}) {
  return (
    <section
      id={id}
      className="grid gap-3 border-b border-rule py-8 first:pt-0 last:border-b-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-12"
    >
      <h2 className="text-lg leading-7 text-ink lg:sticky lg:top-24 lg:self-start">{heading}</h2>
      <div className="max-w-prose text-[0.9375rem] leading-7 text-ink-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}

/** A numbered walkthrough, ruled like a ledger rather than bulleted. */
export function Steps({ items }: { items: Array<{ title: string; body: ReactNode }> }) {
  return (
    <ol className="divide-y divide-rule">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <span className="numeric mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-rule-strong text-xs text-ink-muted">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="text-[0.9375rem] font-semibold text-ink">{item.title}</h3>
            <div className="mt-1 text-[0.9375rem] leading-7 text-ink-muted">{item.body}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}
