import { Link, type LinkProps } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { useAuth } from '~/lib/auth'
import { useTheme } from '~/lib/theme'
import { CloseIcon, MenuIcon, MoonIcon, ShellIcon, SunIcon } from '~/components/icons'
import { Button, IconButton } from '~/components/ui/button'

const sections = [
  { to: '/how-ajo-works', label: 'How Ajo works' },
  { to: '/split-bills', label: 'Splitting bills' },
  { to: '/security', label: 'Security' },
] as const

/**
 * The public frame. Wider measure than the app shell, with the same rules and
 * paper surfaces so the marketing pages and the product read as one thing.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { resolved, setPreference } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:border focus:border-accent focus:bg-paper-raised focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-rule bg-paper">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-ink">
            <ShellIcon size={26} className="text-accent" />
            <span className="font-display text-xl">Cowri</span>
          </Link>

          <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 md:flex">
            {sections.map((section) => (
              <Link
                key={section.to}
                to={section.to}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm text-ink-muted transition-colors duration-150 ease-[var(--ease-ui)] hover:text-ink"
                activeProps={{ className: 'text-ink font-medium' }}
              >
                {section.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <IconButton
              label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
              size="sm"
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            >
              {resolved === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </IconButton>

            {status === 'authenticated' ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Open Cowri
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button size="sm">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Create account
                  </Button>
                </Link>
              </>
            )}

            <IconButton
              label={menuOpen ? 'Close menu' : 'Open menu'}
              size="sm"
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
            </IconButton>
          </div>
        </div>

        {menuOpen ? (
          <nav aria-label="Sections" className="border-t border-rule bg-paper-raised md:hidden">
            <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
              {sections.map((section) => (
                <li key={section.to}>
                  <Link
                    to={section.to}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-rule py-3 text-sm text-ink last:border-b-0"
                  >
                    {section.label}
                  </Link>
                </li>
              ))}
              {status !== 'authenticated' ? (
                <li>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-sm text-ink"
                  >
                    Sign in
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <MarketingFooter />
    </div>
  )
}

function MarketingFooter() {
  return (
    <footer className="border-t border-rule bg-paper-raised">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5 text-ink">
            <ShellIcon size={24} className="text-accent" />
            <span className="font-display text-lg">Cowri</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">
            Rotating savings, split bills and a wallet, built on a double entry ledger so every
            kobo is accounted for.
          </p>
        </div>

        <FooterColumn
          heading="Product"
          links={[
            { to: '/how-ajo-works', label: 'How Ajo works' },
            { to: '/split-bills', label: 'Splitting bills' },
            { to: '/security', label: 'Security' },
            { to: '/design-system', label: 'Design system' },
          ]}
        />

        <FooterColumn
          heading="Legal"
          links={[
            { to: '/terms', label: 'Terms of Service' },
            { to: '/privacy', label: 'Privacy Policy' },
          ]}
        />
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-faint sm:px-6">
          <p>Cowri. Built for saving together.</p>
          <p>Amounts are held in kobo and reconciled against a double entry ledger.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string
  links: ReadonlyArray<{ to: LinkProps['to']; label: string }>
}) {
  return (
    <div>
      <h2 className="label-caps">{heading}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={cn(
                'text-sm text-ink-muted transition-colors duration-150 ease-[var(--ease-ui)]',
                'hover:text-ink',
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
