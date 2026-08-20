import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from './field'

/**
 * Nigerian mobile numbers, normalised on the way to the API.
 *
 * The API keys its phone index on the exact trimmed string it was registered
 * with (backend/src/services/auth.rs), and bill participants are matched by
 * looking a typed number up in that same index. So the app must always send one
 * canonical form, and that form has to be the one existing accounts already
 * used: the local 11 digit number with its leading zero, which is what the
 * Leptos client prompted for. Normalising to +234 or to a bare subscriber
 * number would lock those accounts out.
 */

export type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string
  onValueChange: (value: string) => void
  invalid?: boolean
}

/**
 * Reduces a typed number to the canonical local form, so 0803…, +234 803… and
 * 234803… all become the same 0803… string.
 */
export function normalisePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('234')) digits = digits.slice(3)
  if (!digits.startsWith('0') && digits.length > 0) digits = '0' + digits
  return digits.slice(0, 15)
}

/** True when the number satisfies the API's 10 to 15 digit rule. */
export function isPlausiblePhone(input: string): boolean {
  const digits = normalisePhone(input)
  return digits.length >= 10 && digits.length <= 15
}

/** Groups a local number as 0803 123 4567 for display. */
export function formatPhone(input: string): string {
  const digits = normalisePhone(input)
  const groups = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11), digits.slice(11)]
  return groups.filter(Boolean).join(' ')
}

/**
 * A phone field that normalises as you type and displays the number grouped.
 *
 * @example
 * <Field label="Phone number" hint="The number on your Cowri account" error={errors.phone}>
 *   <PhoneInput value={phone} onValueChange={setPhone} autoComplete="tel-national" />
 * </Field>
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onValueChange, invalid, className, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete={rest.autoComplete ?? 'tel-national'}
      placeholder="0803 123 4567"
      maxLength={18}
      invalid={invalid}
      value={formatPhone(value)}
      onChange={(event) => onValueChange(normalisePhone(event.target.value))}
      className={className ? `numeric ${className}` : 'numeric'}
      {...rest}
    />
  )
})
