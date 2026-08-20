import { useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { CopyIcon, TickIcon } from '~/components/icons'
import { Button } from '~/components/ui/button'

export type PropDoc = {
  name: string
  type: string
  /** Omit for required props. */
  default?: string
  required?: boolean
  description: string
}

export type ComponentDocProps = {
  name: string
  /** What the component is for, and when to reach for something else. */
  summary: string
  /** Anything a caller must know: a11y requirements, gotchas, API coupling. */
  notes?: ReactNode
  props: PropDoc[]
  /** Rendered live, so the documentation cannot drift from the component. */
  example: ReactNode
  /** The source of `example`, shown beneath it. */
  code: string
  id: string
}

/**
 * One entry in the component library documentation.
 *
 * The preview is the real component rendered in the page, not a picture of one,
 * so anything that breaks in the product breaks here too.
 */
export function ComponentDoc({
  name,
  summary,
  notes,
  props,
  example,
  code,
  id,
}: ComponentDocProps) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-rule py-10 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="font-numeric text-lg text-ink">{name}</h3>
        <a
          href={`#${id}`}
          className="text-xs text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          link
        </a>
      </div>
      <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">{summary}</p>
      {notes ? (
        <div className="mt-3 max-w-prose border-l-0 text-[0.8125rem] leading-6 text-ink-faint">
          {notes}
        </div>
      ) : null}

      <div className="mt-5 border border-rule bg-paper-sunken p-5">
        <p className="label-caps mb-4">Live example</p>
        {example}
      </div>

      <CodeBlock code={code} />

      {props.length > 0 ? (
        <div className="mt-5 overflow-x-auto border border-rule">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{name} props</caption>
            <thead>
              <tr className="border-b border-rule-strong bg-paper-sunken">
                <th scope="col" className="label-caps px-3 py-2">
                  Prop
                </th>
                <th scope="col" className="label-caps px-3 py-2">
                  Type
                </th>
                <th scope="col" className="label-caps px-3 py-2">
                  Default
                </th>
                <th scope="col" className="label-caps px-3 py-2">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {props.map((prop) => (
                <tr key={prop.name} className="align-top">
                  <td className="numeric px-3 py-2.5 text-[0.8125rem] text-ink">
                    {prop.name}
                    {prop.required ? (
                      <span className="ml-1 text-clay" title="Required">
                        *
                      </span>
                    ) : null}
                  </td>
                  <td className="numeric px-3 py-2.5 text-[0.75rem] text-accent">{prop.type}</td>
                  <td className="numeric px-3 py-2.5 text-[0.75rem] text-ink-faint">
                    {prop.default ?? (prop.required ? '—' : 'undefined')}
                  </td>
                  <td className="px-3 py-2.5 text-[0.8125rem] leading-6 text-ink-muted">
                    {prop.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard permission refused. The text is selectable either way.
    }
  }

  return (
    <div className={cn('relative mt-3 border border-rule bg-paper-raised', className)}>
      <div className="absolute right-2 top-2">
        <Button
          size="sm"
          onClick={copy}
          leading={copied ? <TickIcon size={14} /> : <CopyIcon size={14} />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 pr-24 text-[0.8125rem] leading-6">
        <code className="numeric text-ink">{code}</code>
      </pre>
    </div>
  )
}

/** A titled band grouping several component entries. */
export function DocsGroup({
  title,
  description,
  id,
  children,
}: {
  title: string
  description?: string
  id: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-12">
      <div className="border-b-2 border-rule-strong pb-3">
        <h2 className="text-2xl text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
