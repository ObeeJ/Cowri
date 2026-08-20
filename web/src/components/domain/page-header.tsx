import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { ArrowIcon } from '~/components/icons'

export type PageHeaderProps = {
  title: string
  /** One line under the title. Say what the page is for, not what it is called. */
  description?: ReactNode
  /** A small label above the title, e.g. the section this page sits in. */
  eyebrow?: string
  /** Renders a back link. Give it the route to return to. */
  back?: { to: LinkProps['to']; label: string; params?: LinkProps['params'] }
  /** Primary and secondary actions for the page. */
  actions?: ReactNode
  className?: string
}

/**
 * The top of an application page: one h1, optional context, and the page's own
 * actions on the same line at wide sizes.
 *
 * @example
 * <PageHeader
 *   eyebrow="Savings circles"
 *   title="Owambe Contribution"
 *   description="Eight members, weekly."
 *   back={{ to: '/ajo', label: 'All circles' }}
 *   actions={<Button variant="primary">Contribute</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6', className)}>
      {back ? (
        <Link
          to={back.to}
          params={back.params}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 ease-[var(--ease-ui)] hover:text-ink"
        >
          <ArrowIcon direction="left" size={16} />
          {back.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? <p className="label-caps mb-1">{eyebrow}</p> : null}
          <h1 className="text-[1.75rem] leading-9 text-ink sm:text-[2rem]">{title}</h1>
          {description ? (
            <div className="mt-1.5 max-w-prose text-sm leading-6 text-ink-muted">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
