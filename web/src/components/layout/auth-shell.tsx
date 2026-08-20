import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ShellIcon } from '~/components/icons'

export type AuthShellProps = {
  title: string
  /** One or two sentences saying what this step does. */
  description?: ReactNode
  children: ReactNode
  /** Rendered under the card, e.g. a link to the other auth route. */
  footer?: ReactNode
}

/**
 * The frame for every authentication step.
 *
 * Left aligned rather than centred, on a narrow measure, so the form reads as a
 * form rather than a splash screen.
 */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-dvh bg-paper px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2.5 text-ink">
          <ShellIcon size={26} className="text-accent" />
          <span className="font-display text-xl">Cowri</span>
        </Link>

        <div className="panel mt-8 px-5 py-6 sm:px-6">
          <h1 className="text-[1.5rem] leading-8 text-ink">{title}</h1>
          {description ? (
            <div className="mt-2 text-sm leading-6 text-ink-muted">{description}</div>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-5 text-sm text-ink-muted">{footer}</div> : null}

        <p className="mt-8 text-xs leading-5 text-ink-faint">
          By continuing you agree to the{' '}
          <Link to="/terms" className="underline underline-offset-4 hover:text-ink">
            Terms of Service
          </Link>{' '}
          and the{' '}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
