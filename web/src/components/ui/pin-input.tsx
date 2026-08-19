import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '~/lib/cn'
import { EyeIcon, EyeOffIcon } from '~/components/icons'
import { IconButton } from './button'

export type PinInputProps = {
  value: string
  onValueChange: (value: string) => void
  /** Number of digits. The API accepts 4 to 6 for a PIN and issues 6 for OTPs. */
  length?: number
  /** Masks each digit and offers a reveal control. */
  secret?: boolean
  /** Names the group for assistive technology. Required. */
  label: string
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** 'one-time-code' lets the platform offer a received code. */
  autoComplete?: string
  /** Fired once the last digit is entered. Use to submit without a click. */
  onComplete?: (value: string) => void
  id?: string
  className?: string
}

/**
 * A segmented numeric entry for PINs and one-time codes.
 *
 * The digits are held as one compact string, so callers never reassemble them.
 * Pasting a whole code fills every box. Backspace clears from the caret to the
 * end, which is how people actually correct a code they mistyped.
 *
 * @example
 * // A 4 digit PIN, masked, with a reveal control
 * <PinInput label="Transaction PIN" secret value={pin} onValueChange={setPin} />
 *
 * @example
 * // A 6 digit email code that submits itself when complete
 * <PinInput
 *   label="Verification code"
 *   length={6}
 *   autoComplete="one-time-code"
 *   value={code}
 *   onValueChange={setCode}
 *   onComplete={verify}
 * />
 */
export function PinInput({
  value,
  onValueChange,
  length = 4,
  secret = false,
  label,
  invalid = false,
  disabled = false,
  autoFocus = false,
  autoComplete,
  onComplete,
  id,
  className,
}: PinInputProps) {
  const generatedId = useId()
  const groupId = id ?? generatedId
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [revealed, setRevealed] = useState(false)

  const digits = value.replace(/\D/g, '').slice(0, length)

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onValueChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  function focusBox(index: number) {
    inputs.current[Math.min(Math.max(index, 0), length - 1)]?.focus()
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '')
    if (typed === '') return
    // Clicking a box past the filled region types at the end instead of
    // leaving a gap the compact string cannot represent.
    const at = Math.min(index, digits.length)
    const next = (digits.slice(0, at) + typed + digits.slice(at + typed.length)).slice(0, length)
    commit(next)
    focusBox(at + typed.length)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const target = digits[index] ? index : index - 1
      if (target < 0) return
      commit(digits.slice(0, target))
      focusBox(target)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    commit(pasted)
    focusBox(pasted.length)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="group"
        aria-label={label}
        aria-invalid={invalid || undefined}
        id={groupId}
        className="flex gap-2"
      >
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node
            }}
            type={secret && !revealed ? 'password' : 'text'}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? autoComplete : 'off'}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            maxLength={1}
            value={digits[index] ?? ''}
            aria-label={`${label}, digit ${index + 1} of ${length}`}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.currentTarget.select()}
            className={cn(
              'numeric size-12 rounded-[var(--radius-control)] border bg-paper-raised text-center',
              'text-lg text-ink transition-colors duration-150 ease-[var(--ease-ui)]',
              'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-faint',
              invalid
                ? 'border-clay'
                : 'border-rule-strong hover:border-ink-faint focus:border-accent',
            )}
          />
        ))}
      </div>
      {secret ? (
        <IconButton
          label={revealed ? 'Hide PIN' : 'Show PIN'}
          size="sm"
          disabled={disabled}
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </IconButton>
      ) : null}
    </div>
  )
}
