import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '~/lib/cn'
import { Spinner } from './spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual weight. One primary action per view. */
  variant?: ButtonVariant
  /** `md` is the 44px default. `sm` is for dense table rows and toolbars. */
  size?: ButtonSize
  /** Shows a spinner, blocks clicks, and announces busy state. */
  loading?: boolean
  /** Replaces the label while `loading`. Also read out by screen readers. */
  loadingText?: string
  /** Rendered before the label. Pass an icon, not text. */
  leading?: ReactNode
  /** Rendered after the label. */
  trailing?: ReactNode
  fullWidth?: boolean
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] ' +
  'font-medium whitespace-nowrap transition-colors duration-150 ease-[var(--ease-ui)] ' +
  'disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-paper-raised border border-accent hover:bg-accent-hover hover:border-accent-hover',
  secondary:
    'bg-paper-raised text-ink border border-rule-strong hover:bg-paper-sunken',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-paper-sunken',
  danger:
    'bg-clay text-paper-raised border border-clay hover:bg-clay-hover hover:border-clay-hover',
  link:
    'bg-transparent text-accent border border-transparent underline underline-offset-4 ' +
    'decoration-accent-rule hover:decoration-accent px-0',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-13 px-6 text-base',
}

/**
 * The app's action control.
 *
 * @example
 * <Button variant="primary" onClick={submit} loading={isPending} loadingText="Sending">
 *   Send code
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    loadingText,
    leading,
    trailing,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        variant === 'link' ? 'h-auto p-0' : sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : leading}
      <span>{loading && loadingText ? loadingText : children}</span>
      {loading ? null : trailing}
    </button>
  )
})

export type IconButtonProps = Omit<ButtonProps, 'leading' | 'trailing' | 'children'> & {
  /** Required. Icon-only controls have no visible text to name them. */
  label: string
  children: ReactNode
}

/**
 * A square control holding one icon. The `label` becomes its accessible name.
 *
 * @example
 * <IconButton label="Close" variant="ghost" onClick={close}><CloseIcon /></IconButton>
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, loading, disabled, ...rest },
  ref,
) {
  const box = { sm: 'size-9', md: 'size-11', lg: 'size-13' }[size]
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        box,
        'shrink-0 p-0',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
})
