import {
  createContext,
  forwardRef,
  use,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '~/lib/cn'
import { AlertIcon, TickIcon } from '~/components/icons'

/**
 * Form plumbing.
 *
 * `Field` owns the ids so that a label, a hint and an error message are wired to
 * their control automatically. Controls read that context, which means no screen
 * can ship a labelless input by forgetting to pass `htmlFor`.
 */

type FieldContextValue = {
  inputId: string
  hintId: string
  errorId: string
  hasError: boolean
  hasHint: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useFieldContext() {
  return use(FieldContext)
}

export type FieldProps = {
  label: ReactNode
  /** Sits under the label. Use for format rules, not for error text. */
  hint?: ReactNode
  /** Presence switches the field into its error state. */
  error?: string | null
  required?: boolean
  /** Rendered on the label row, right aligned. A "Forgot password?" link, say. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Wraps one control with its label, hint and error message.
 *
 * @example
 * <Field label="Phone number" hint="Nigerian mobile number" error={errors.phone}>
 *   <PhoneInput value={phone} onValueChange={setPhone} />
 * </Field>
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  action,
  children,
  className,
}: FieldProps) {
  const id = useId()
  const value: FieldContextValue = {
    inputId: `${id}-input`,
    hintId: `${id}-hint`,
    errorId: `${id}-error`,
    hasError: Boolean(error),
    hasHint: Boolean(hint),
    required,
  }

  return (
    <FieldContext value={value}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={value.inputId} required={required}>
            {label}
          </Label>
          {action}
        </div>
        {hint ? (
          <p id={value.hintId} className="text-[0.8125rem] leading-5 text-ink-faint">
            {hint}
          </p>
        ) : null}
        {children}
        <FieldError id={value.errorId}>{error}</FieldError>
      </div>
    </FieldContext>
  )
}

export type LabelProps = {
  htmlFor?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/** @example <Label htmlFor="amount" required>Amount</Label> */
export function Label({ htmlFor, required = false, children, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-sm font-medium text-ink', className)}
    >
      {children}
      {required ? (
        <span className="ml-1 text-clay" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  )
}

export type FieldErrorProps = {
  id?: string
  children?: ReactNode
}

/**
 * The error slot. It renders nothing when there is no error but keeps its live
 * region mounted, so the message is announced when it appears.
 *
 * @example <FieldError>PIN must be 4 digits</FieldError>
 */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p
      id={id}
      role={children ? 'alert' : undefined}
      aria-live="polite"
      className={cn(
        'flex items-start gap-1.5 text-[0.8125rem] leading-5 text-clay',
        !children && 'hidden',
      )}
    >
      {children ? (
        <>
          <AlertIcon size={15} className="mt-0.5 shrink-0" />
          <span>{children}</span>
        </>
      ) : null}
    </p>
  )
}

// ── Shared control surface ──────────────────────────────────────────────────

export const controlBase =
  'w-full rounded-[var(--radius-control)] border bg-paper-raised px-3 text-ink ' +
  'placeholder:text-ink-faint transition-colors duration-150 ease-[var(--ease-ui)] ' +
  'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-faint ' +
  'read-only:bg-paper-sunken'

export function controlBorder(hasError: boolean): string {
  return hasError
    ? 'border-clay focus:border-clay'
    : 'border-rule-strong hover:border-ink-faint focus:border-accent'
}

function describedBy(field: FieldContextValue | null): string | undefined {
  if (!field) return undefined
  const ids = [field.hasHint ? field.hintId : null, field.hasError ? field.errorId : null].filter(
    Boolean,
  )
  return ids.length ? ids.join(' ') : undefined
}

// ── Input ───────────────────────────────────────────────────────────────────

// `prefix` is omitted from the native attributes because HTML defines it as a
// string, and this component takes a node.
export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  /** Rendered inside the control on the left. Non-interactive. */
  prefix?: ReactNode
  /** Rendered inside the control on the right. Can hold a button. */
  suffix?: ReactNode
  invalid?: boolean
}

/**
 * A single-line text control. Inside a `Field` it picks up the id, description
 * and error state on its own.
 *
 * @example
 * <Field label="Full name" error={errors.name}>
 *   <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
 * </Field>
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { prefix, suffix, invalid, className, id, ...rest },
  ref,
) {
  const field = useFieldContext()
  const hasError = invalid ?? field?.hasError ?? false
  const wrapped = Boolean(prefix || suffix)

  const control = (
    <input
      ref={ref}
      id={id ?? field?.inputId}
      aria-invalid={hasError || undefined}
      aria-describedby={rest['aria-describedby'] ?? describedBy(field)}
      required={rest.required ?? field?.required}
      className={cn(
        wrapped
          ? // The wrapper owns the border, background and focus ring.
            'h-full w-full min-w-0 flex-1 border-0 bg-transparent text-ink outline-none ' +
            'placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-faint ' +
            cn(prefix ? 'pl-0' : 'pl-3', suffix ? 'pr-0' : 'pr-3')
          : cn(controlBase, controlBorder(hasError)),
        'text-[0.9375rem]',
        wrapped ? null : 'h-11',
        className,
      )}
      {...rest}
    />
  )

  if (!wrapped) return control

  return (
    <div
      className={cn(
        'flex h-11 items-center rounded-[var(--radius-control)] border bg-paper-raised',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        controlBorder(hasError),
      )}
    >
      {prefix ? (
        <span className="flex select-none items-center gap-1.5 pl-3 pr-2 text-sm text-ink-faint">
          {prefix}
        </span>
      ) : null}
      {control}
      {suffix ? <span className="flex items-center pr-1.5 pl-1">{suffix}</span> : null}
    </div>
  )
})

// ── Textarea ────────────────────────────────────────────────────────────────

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }

/**
 * @example
 * <Field label="Note"><Textarea rows={4} maxLength={280} /></Field>
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, id, rows = 3, ...rest },
  ref,
) {
  const field = useFieldContext()
  const hasError = invalid ?? field?.hasError ?? false
  return (
    <textarea
      ref={ref}
      id={id ?? field?.inputId}
      rows={rows}
      aria-invalid={hasError || undefined}
      aria-describedby={rest['aria-describedby'] ?? describedBy(field)}
      required={rest.required ?? field?.required}
      className={cn(controlBase, controlBorder(hasError), 'resize-y py-2.5 text-[0.9375rem]', className)}
      {...rest}
    />
  )
})

// ── Select ──────────────────────────────────────────────────────────────────

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: SelectOption[]
  /** Shown as a disabled first entry when the value is empty. */
  placeholder?: string
  invalid?: boolean
}

/**
 * A native select, styled to match the other controls. Native is deliberate:
 * on phones it opens the platform picker, which beats any custom listbox.
 *
 * @example
 * <Field label="Frequency">
 *   <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}
 *     options={[{ value: 'weekly', label: 'Weekly' }]} />
 * </Field>
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, invalid, className, id, ...rest },
  ref,
) {
  const field = useFieldContext()
  const hasError = invalid ?? field?.hasError ?? false
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id ?? field?.inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={rest['aria-describedby'] ?? describedBy(field)}
        required={rest.required ?? field?.required}
        className={cn(
          controlBase,
          controlBorder(hasError),
          'h-11 appearance-none pr-10 text-[0.9375rem]',
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9.5 6 5.5 6-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  )
})

// ── Checkbox and Radio ──────────────────────────────────────────────────────

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode
  description?: ReactNode
}

/**
 * @example
 * <Checkbox label="I accept the Terms" checked={accepted}
 *   onChange={(e) => setAccepted(e.target.checked)} />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...rest },
  ref,
) {
  const generated = useId()
  const inputId = id ?? generated
  const descriptionId = description ? `${inputId}-description` : undefined

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative flex size-11 shrink-0 items-center justify-center -m-1.5">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-describedby={descriptionId}
          className="peer size-5 shrink-0 cursor-pointer appearance-none rounded-[3px] border border-rule-strong bg-paper-raised checked:border-accent checked:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
          {...rest}
        />
        <TickIcon
          size={14}
          className="pointer-events-none absolute text-paper-raised opacity-0 peer-checked:opacity-100"
          strokeWidth={2.5}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-1.5">
        <label htmlFor={inputId} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-[0.8125rem] leading-5 text-ink-faint">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  )
})

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode
  description?: ReactNode
}

/**
 * A single radio. Wrap a set in `<fieldset>` with a `<legend>` so the group has
 * its own name.
 *
 * @example
 * <fieldset><legend className="label-caps">Payout order</legend>
 *   <Radio name="order" value="join" label="Order of joining" />
 * </fieldset>
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, className, id, ...rest },
  ref,
) {
  const generated = useId()
  const inputId = id ?? generated
  const descriptionId = description ? `${inputId}-description` : undefined

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative flex size-11 shrink-0 items-center justify-center -m-1.5">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          aria-describedby={descriptionId}
          className="peer size-5 shrink-0 cursor-pointer appearance-none rounded-full border border-rule-strong bg-paper-raised checked:border-accent disabled:cursor-not-allowed disabled:opacity-55"
          {...rest}
        />
        <span className="pointer-events-none absolute size-2.5 rounded-full bg-accent opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-1.5">
        <label htmlFor={inputId} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-[0.8125rem] leading-5 text-ink-faint">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  )
})

// ── Switch ──────────────────────────────────────────────────────────────────

export type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  /** Hides the visible label but keeps the accessible name. */
  hideLabel?: boolean
  description?: ReactNode
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * A toggle for settings that take effect immediately. For anything that needs a
 * save step, use a Checkbox instead.
 *
 * @example
 * <Switch label="Dark theme" checked={dark} onCheckedChange={setDark} />
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  description,
  disabled = false,
  id,
  className,
}: SwitchProps) {
  const generated = useId()
  const switchId = id ?? generated
  const descriptionId = description ? `${switchId}-description` : undefined

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {hideLabel ? null : (
        <span className="flex min-w-0 flex-col gap-0.5">
          <label htmlFor={switchId} className="text-sm font-medium text-ink">
            {label}
          </label>
          {description ? (
            <span id={descriptionId} className="text-[0.8125rem] leading-5 text-ink-faint">
              {description}
            </span>
          ) : null}
        </span>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[var(--radius-pill)]',
          'border transition-colors duration-150 ease-[var(--ease-ui)] disabled:cursor-not-allowed disabled:opacity-55',
          checked ? 'border-accent bg-accent' : 'border-rule-strong bg-paper-sunken',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block size-4.5 rounded-full bg-paper-raised',
            'transition-transform duration-150 ease-[var(--ease-ui)]',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
