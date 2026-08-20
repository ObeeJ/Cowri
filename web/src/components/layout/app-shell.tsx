import { Link, useNavigate, useRouterState, type LinkProps } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { useAuth } from '~/lib/auth'
import { useTheme } from '~/lib/theme'
import { firstName } from '~/lib/format'
import {
  CircleGroupIcon,
  MenuIcon,
  MoonIcon,
  ReceiptIcon,
  SettingsIcon,
  ShellIcon,
  ShieldIcon,
  SignOutIcon,
  SunIcon,
  TallyIcon,
  WalletIcon,
} from '~/components/icons'
import { IconButton } from '~/components/ui/button'
import { DropdownMenu } from '~/components/ui/popover'
import { Drawer } from '~/components/ui/dialog'
import { OfflineNotice } from './offline-notice'

type NavItem = {
  to: LinkProps['to']
  label: string
  icon: ReactNode
  /** Also highlight the item for this path prefix. */
  match?: string
}

const primaryNav: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: <TallyIcon size={18} /> },
  { to: '/wallet', label: 'Wallet', icon: <WalletIcon size={18} /> },
  { to: '/ajo', label: 'Circles', icon: <CircleGroupIcon size={18} />, match: '/ajo' },
  { to: '/bills', label: 'Bills', icon: <ReceiptIcon size={18} />, match: '/bills' },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match) return pathname === item.match || pathname.startsWith(item.match + '/')
  return pathname === item.to
}

const adminNavItem: NavItem = {
  to: '/admin',
  label: 'Admin console',
  icon: <ShieldIcon size={18} />,
  match: '/admin',
}

const settingsNavItem: NavItem = {
  to: '/settings',
  label: 'Profile and settings',
  icon: <SettingsIcon size={18} />,
}

/**
 * The signed-in frame: a narrow ruled rail on the left at desktop widths, a bar
 * plus a bottom nav on phones.
 *
 * The layout is deliberately asymmetric. The rail is fixed and narrow, the
 * content column is capped and sits left of centre, and the space that remains
 * on the right is left as margin rather than filled with a second column.
 *
 * @example
 * <AppShell><Outlet /></AppShell>
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth()
  const { resolved, setPreference } = useTheme()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[var(--radius-control)] focus:border focus:border-accent focus:bg-paper-raised focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <OfflineNotice />

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rule bg-paper px-3 lg:hidden">
        <IconButton label="Open navigation" onClick={() => setNavOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Link to="/dashboard" className="flex items-center gap-2 text-ink">
          <ShellIcon size={22} className="text-accent" />
          <span className="font-display text-lg">Cowri</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle resolved={resolved} onChange={setPreference} />
        </div>
      </header>

      <div className="lg:flex">
        {/* Desktop rail */}
        <nav
          aria-label="Main"
          className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rule bg-paper-raised px-3 py-4 lg:flex"
        >
          <Link to="/dashboard" className="mb-6 flex items-center gap-2.5 px-2 text-ink">
            <ShellIcon size={26} className="text-accent" />
            <span className="font-display text-xl">Cowri</span>
          </Link>

          <ul className="flex flex-col gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <RailLink item={item} active={isActive(pathname, item)} />
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <>
              <p className="label-caps mt-6 px-2">Administration</p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                <li>
                  <RailLink item={adminNavItem} active={isActive(pathname, adminNavItem)} />
                </li>
              </ul>
            </>
          ) : null}

          <div className="mt-auto flex flex-col gap-1 border-t border-rule pt-3">
            <div className="flex items-center gap-1 px-1">
              <ThemeToggle resolved={resolved} onChange={setPreference} />
              <DropdownMenu
                label="Account"
                align="start"
                trigger={
                  <IconButton label={user ? `Account, ${firstName(user.name)}` : 'Account'}>
                    <SettingsIcon />
                  </IconButton>
                }
                items={[
                  {
                    label: 'Profile and settings',
                    icon: <SettingsIcon size={16} />,
                    onSelect: () => void navigate({ to: '/settings' }),
                  },
                  {
                    label: 'Sign out',
                    icon: <SignOutIcon size={16} />,
                    danger: true,
                    onSelect: () => void signOut(),
                  },
                ]}
              />
            </div>
            {user ? (
              <p className="truncate px-2 pb-1 text-xs text-ink-faint">
                Signed in as {user.name}
              </p>
            ) : null}
          </div>
        </nav>

        {/* Mobile navigation sheet */}
        <Drawer open={navOpen} onOpenChange={setNavOpen} title="Navigation" hideTitle>
          <nav aria-label="Main">
            <ul className="flex flex-col gap-0.5">
              {primaryNav.map((item) => (
                <li key={item.to} onClick={() => setNavOpen(false)}>
                  <RailLink item={item} active={isActive(pathname, item)} />
                </li>
              ))}
              {isAdmin ? (
                <li onClick={() => setNavOpen(false)}>
                  <RailLink item={adminNavItem} active={pathname.startsWith('/admin')} />
                </li>
              ) : null}
              <li onClick={() => setNavOpen(false)}>
                <RailLink item={settingsNavItem} active={pathname === '/settings'} />
              </li>
            </ul>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm text-clay hover:bg-clay-tint"
            >
              <SignOutIcon size={18} />
              Sign out
            </button>
          </nav>
        </Drawer>

        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12">
          <div className="mx-auto w-full max-w-3xl lg:mx-0 lg:max-w-4xl">{children}</div>
        </main>
      </div>

      <BottomNav pathname={pathname} />
    </div>
  )
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm',
        'transition-colors duration-150 ease-[var(--ease-ui)]',
        active
          ? 'bg-accent-tint font-medium text-accent'
          : 'text-ink-muted hover:bg-paper-sunken hover:text-ink',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {item.label}
    </Link>
  )
}

function ThemeToggle({
  resolved,
  onChange,
}: {
  resolved: 'light' | 'dark'
  onChange: (preference: 'light' | 'dark') => void
}) {
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <IconButton label={`Switch to ${next} theme`} onClick={() => onChange(next)}>
      {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  )
}

/**
 * The phone navigation. Five targets at most, each at least 44px tall, with the
 * label always visible rather than revealed on tap.
 */
export function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item)
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem]',
                  'transition-colors duration-150 ease-[var(--ease-ui)]',
                  active ? 'text-accent' : 'text-ink-faint',
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
