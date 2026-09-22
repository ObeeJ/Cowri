/**
 * Cowri's icon set.
 *
 * Drawn for this product rather than pulled from a library, on a 24 unit grid
 * with a 1.5 unit stroke and round joins. Shapes lean on the ledger and market
 * motifs the rest of the interface uses: a tallied circle for Ajo, a torn
 * receipt for bills, a cowrie shell for the mark itself.
 *
 * Icons are decorative by default and hidden from assistive technology. Pass a
 * `title` to make one meaningful, which also gives it role="img" and a label.
 */

import type { SVGProps } from 'react'

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Pixel size for both axes. Default 20. */
  size?: number
  /** Accessible name. Omit for icons that sit beside their own text label. */
  title?: string
}

function Icon({ size = 20, title, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** The Cowri mark: a cowrie shell, slit side up. */
export function ShellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c4 0 6.5 3.9 6.5 9S16 21 12 21s-6.5-3.9-6.5-9S8 3 12 3Z" />
      <path d="M12 7.5v9" />
      <path d="M10.4 9.2 12 7.5l1.6 1.7M10.4 12l1.6-1.6 1.6 1.6M10.4 14.8l1.6-1.6 1.6 1.6" />
    </Icon>
  )
}

/** Wallet: a folded pouch with a clasp. */
export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h10.9a2 2 0 0 1 2 2v1" />
      <path d="M3 8.5v8A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5V12a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 8.5Z" />
      <path d="M16.5 14.25h.01" />
    </Icon>
  )
}

/** Ajo: members ringed around a circle, with the rotation of the payout. */
export function CircleGroupIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="4.6" r="1.6" />
      <circle cx="19.4" cy="12" r="1.6" />
      <circle cx="12" cy="19.4" r="1.6" />
      <circle cx="4.6" cy="12" r="1.6" />
      <path d="M14.6 6.1a7 7 0 0 1 3.3 3.3M17.9 14.6a7 7 0 0 1-3.3 3.3M9.4 17.9a7 7 0 0 1-3.3-3.3M6.1 9.4a7 7 0 0 1 3.3-3.3" />
    </Icon>
  )
}

/** Split: one amount forking into shares. */
export function SplitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h4" />
      <path d="M8 12c3.2 0 3.4-6 6.6-6H20" />
      <path d="M8 12c3.2 0 3.4 6 6.6 6H20" />
      <path d="M17.5 3.5 20 6l-2.5 2.5" />
      <path d="M17.5 15.5 20 18l-2.5 2.5" />
    </Icon>
  )
}

/** Receipt with a torn lower edge. */
export function ReceiptIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3.5h14v14.8l-2.3-1.3-2.3 1.3-2.4-1.3-2.3 1.3-2.4-1.3L5 18.3Z" />
      <path d="M8.5 8h7M8.5 11.5h4.5" />
    </Icon>
  )
}

/** Directional arrow. Rotate with the `direction` prop. */
export function ArrowIcon({
  direction = 'right',
  style,
  ...props
}: IconProps & { direction?: 'up' | 'right' | 'down' | 'left' }) {
  const degrees = { right: 0, down: 90, left: 180, up: 270 }[direction]
  return (
    <Icon {...props} style={{ ...style, transform: `rotate(${degrees}deg)` }}>
      <path d="M4 12h15" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </Icon>
  )
}

export function ChevronIcon({
  direction = 'down',
  style,
  ...props
}: IconProps & { direction?: 'up' | 'right' | 'down' | 'left' }) {
  const degrees = { down: 0, left: 90, up: 180, right: 270 }[direction]
  return (
    <Icon {...props} style={{ ...style, transform: `rotate(${degrees}deg)` }}>
      <path d="m6 9.5 6 5.5 6-5.5" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}

export function TickIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </Icon>
  )
}

/** A struck tally mark, used for a settled or completed cycle. */
export function TallyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4.5v15M10.5 4.5v15M15 4.5v15" />
      <path d="M3.5 17 18 7" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19.5H3Z" />
      <path d="M12 10v4M12 16.75h.01" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8h.01" />
    </Icon>
  )
}

/** A padlock over a ledger page. Used on security surfaces. */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 5 5.6v5.9c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V5.6Z" />
      <path d="M9.6 12.2h4.8v3.6H9.6zM10.7 12.2v-1.4a1.3 1.3 0 0 1 2.6 0v1.4" />
    </Icon>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
    </Icon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 9h10v11H9z" />
      <path d="M15 6H5v11" />
    </Icon>
  )
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5H6.5v15H14" />
      <path d="M11 12h9.5M17 8.5l3.5 3.5L17 15.5" />
    </Icon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2.2" />
      <circle cx="9" cy="16.5" r="2.2" />
    </Icon>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.5 4.5V10H15" />
    </Icon>
  )
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 5h6v6" />
      <path d="M19 5 11 13" />
      <path d="M18 15v3.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H9" />
    </Icon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Icon>
  )
}

/** Daylight, for the light theme control. */
export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </Icon>
  )
}

/** Lamplight, for the dark theme control. */
export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />
    </Icon>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </Icon>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5.5 20 18.5" />
      <path d="M9.8 7A9.9 9.9 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a16.6 16.6 0 0 1-3.3 3.7" />
      <path d="M6.2 8.6A16.4 16.4 0 0 0 2.5 12S6 17.5 12 17.5a9.8 9.8 0 0 0 3.1-.5" />
      <path d="M10.3 10.4a2.6 2.6 0 0 0 3.4 3.4" />
    </Icon>
  )
}

/** A hand of naira notes, for funding. */
export function NoteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h18v10H3z" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 12h.01M18 12h.01" />
    </Icon>
  )
}

/** X (Twitter) icon */
export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Icon>
  )
}

/** LinkedIn icon */
export function LinkedInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </Icon>
  )
}

/** Instagram icon */
export function InstagramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.128-.058-1.688-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </Icon>
  )
}

/** WhatsApp icon */
export function WhatsAppIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.52 3.48A12 12 0 1 1 3.48 20.52 12 12 0 0 1 20.52 3.48zm-1.62 11.09c-.36.18-.66.18-.84.06-.18-.12-.36-.3-.42-.36-.12-.12-.3-.24-.54-.48-.18-.24-.3-.36-.3-.66 0-.18.12-.36.18-.48.06-.12.06-.3-.06-.42s-.3-.3-.42-.36c-.12-.06-.36-.12-.6-.18a4.5 4.5 0 0 0-1.44-.6 4.5 4.5 0 0 0-1.74-.18 3.7 3.7 0 0 0-1.38.42 4.4 4.4 0 0 0-.3.66c0 .12 1.56 1.92 1.68 2.16.12.18.18.36.18.48 0 .24-.24.36-.3.36-.24 0-.6-.24-1.02-.36-.3-.12-.48-.12-.6-.18-.42-.06-1.02-.18-1.5-.3a9.17 9.17 0 0 1-2.58-1.02c-.36-.18-.6-.3-.78-.42-.12-.12-.24-.18-.24-.3 0-.18.12-.3.18-.42.18-.18.48-.6.9-1.08.42-.48 1.02-1.08 1.62-1.5.48-.36.72-.54.84-.6.18-.06.42-.06.54 0 .12.06.42.18.6.36.18.18.36.54.36 1.02 0 .42-.06.84-.18 1.08-.12.24-.42.78-.9 1.5-.42.66-.84 1.26-1.08 1.56-.18.3-.18.36 0 .42.12.06 1.02 1.08 2.1 1.56 1.02.48 1.92.9 2.64 1.2.48.24.66.36.72.48.06.12.12.3 0 .42-.12.18-.66.72-1.2 1.56v.12z" />
      <path d="M12 21.35c-.18 0-.36-.06-.54-.12a12 12 0 0 1-3.6-10.26 12 12 0 0 1 9.78-9.78c3.42 3.42 3.42 8.94 0 12.36a12 12 0 0 1-6.18 2.16c-.18 0-.36.06-.54.12z" />
    </Icon>
  )
}
