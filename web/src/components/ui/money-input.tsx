import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react'
import { formatKobo, koboToInputValue, parseNairaToKobo } from '~/lib/money'
import { Input } from './field'

export type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> & {
  /** Integer kobo, or null when the field is empty or unparseable. */
  valueKobo: number | null
  onValueChange: (valueKobo: number | null) => void
  /** Rejected below this, in kobo. The API's own floor for top-ups is ₦100. */
  minKobo?: number
  maxKobo?: number
  invalid?: boolean
  /** Quick-pick amounts in kobo, rendered as chips under the field. */
  presetsKobo?: number[]
}

/**
 * Naira entry that never touches a float.
 *
 * The field holds the text the user typed so a trailing decimal point survives
 * keystrokes, while the parsed integer kobo value is what leaves the component.
 * Anything that cannot be read as an amount reports null rather than zero, so
 * an unparseable field can never be mistaken for a legitimate ₦0.
 *
 * @example
 * <Field label="Amount to add" error={errors.amount}>
 *   <MoneyInput
 *     valueKobo={amount}
 *     onValueChange={setAmount}
 *     minKobo={10_000}
 *     presetsKobo={[100_000, 200_000, 500_000]}
 *   />
 * </Field>
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { valueKobo, onValueChange, minKobo, maxKobo, invalid, presetsKobo, ...rest },
  ref,
) {
  const [text, setText] = useState(() => (valueKobo === null ? '' : koboToInputValue(valueKobo)))

  // Follow the value when a parent sets it, e.g. from a preset chip, but leave
  // the text alone while the user is mid-edit on the same amount.
  useEffect(() => {
    const parsed = parseNairaToKobo(text)
    if (parsed !== valueKobo) {
      setText(valueKobo === null ? '' : koboToInputValue(valueKobo))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKobo])

  function handleChange(raw: string) {
    // Allow the intermediate states of typing: "", "1", "1.", "1.5".
    if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw.replace(/,/g, ''))) return
    setText(raw)
    onValueChange(parseNairaToKobo(raw))
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        invalid={invalid}
        prefix={<span aria-hidden="true">₦</span>}
        aria-describedby={rest['aria-describedby']}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={(event) => {
          const parsed = parseNairaToKobo(event.target.value)
          if (parsed !== null) setText(koboToInputValue(parsed))
          rest.onBlur?.(event)
        }}
        className="numeric text-base"
        {...rest}
      />
      {presetsKobo && presetsKobo.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {presetsKobo.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setText(koboToInputValue(preset))
                onValueChange(preset)
              }}
              className={
                'numeric cursor-pointer rounded-[var(--radius-pill)] border border-rule-strong ' +
                'bg-paper-raised px-3 py-1.5 text-sm text-ink-muted transition-colors duration-150 ' +
                'ease-[var(--ease-ui)] hover:border-accent hover:text-accent'
              }
            >
              {formatKobo(preset)}
            </button>
          ))}
        </div>
      ) : null}
      {minKobo !== undefined || maxKobo !== undefined ? (
        <p className="text-[0.8125rem] text-ink-faint">
          {minKobo !== undefined ? `Minimum ${formatKobo(minKobo)}` : null}
          {minKobo !== undefined && maxKobo !== undefined ? '. ' : null}
          {maxKobo !== undefined ? `Maximum ${formatKobo(maxKobo)}` : null}
        </p>
      ) : null}
    </div>
  )
})
