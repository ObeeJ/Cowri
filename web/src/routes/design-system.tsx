import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MarketingShell } from '~/components/layout/marketing-shell'
import { ComponentDoc, DocsGroup } from '~/components/docs/docs'
import { Button, IconButton } from '~/components/ui/button'
import { Checkbox, Field, Input, Label, Radio, Select, Switch, Textarea } from '~/components/ui/field'
import { PinInput } from '~/components/ui/pin-input'
import { PhoneInput } from '~/components/ui/phone-input'
import { MoneyInput } from '~/components/ui/money-input'
import { Dialog, Drawer } from '~/components/ui/dialog'
import { DropdownMenu, Popover, Tooltip } from '~/components/ui/popover'
import { Tabs } from '~/components/ui/tabs'
import { useToast } from '~/components/ui/toast'
import { Avatar, Badge, Divider, Progress } from '~/components/ui/display'
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'
import { Pagination } from '~/components/ui/pagination'
import { EmptyState, ErrorState } from '~/components/ui/states'
import { MoneyAmount } from '~/components/domain/money-amount'
import { StatusPill } from '~/components/domain/status-pill'
import { TransactionList } from '~/components/domain/transaction-list'
import { BalanceCard } from '~/components/domain/balance-card'
import { AjoCycleTimeline, AjoGroupCard, ContributionSchedule } from '~/components/domain/ajo'
import { BillCard, ParticipantSplitRow } from '~/components/domain/bill'
import { DataTable } from '~/components/domain/data-table'
import { PageHeader } from '~/components/domain/page-header'
import {
  CircleGroupIcon,
  CloseIcon,
  NoteIcon,
  ReceiptIcon,
  SettingsIcon,
  ShellIcon,
  SignOutIcon,
  SplitIcon,
  TallyIcon,
  WalletIcon,
} from '~/components/icons'
import { ApiError } from '~/lib/api/client'
import type { AjoGroup, AjoMemberSummary, Bill, Transaction, Wallet } from '~/lib/api/types'

export const Route = createFileRoute('/design-system')({
  component: DesignSystemPage,
})

// ── Sample data for the previews ────────────────────────────────────────────

const wallet: Wallet = {
  id: 'w1',
  user_id: 'u1',
  available_kobo: 4_875_000,
  ledger_kobo: 5_125_000,
  version: 12,
}

const transaction: Transaction = {
  id: 'tx1',
  wallet_id: 'w1',
  kind: 'debit',
  amount_kobo: 500_000,
  reference: 'ajo-9f2c-0',
  description: 'Ajo contribution: Owambe Circle',
  status: 'success',
  created_at: new Date().toISOString(),
}

const transactions: Transaction[] = [
  transaction,
  {
    ...transaction,
    id: 'tx2',
    kind: 'credit',
    amount_kobo: 2_000_000,
    reference: 'fund-4a1b',
    description: 'Wallet top-up via Paystack',
  },
]

const group: AjoGroup = {
  id: 'g1',
  name: 'Owambe Circle',
  admin_id: 'u1',
  contribution_kobo: 500_000,
  frequency: 'weekly',
  member_count: 4,
  current_cycle: 1,
  status: 'active',
  created_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
}

const members: AjoMemberSummary[] = [
  { user_id: 'u2', payout_position: 0, has_received: true },
  { user_id: 'u1', payout_position: 1, has_received: false },
  { user_id: 'u3', payout_position: 2, has_received: false },
  { user_id: 'u4', payout_position: 3, has_received: false },
]

const bill: Bill = {
  id: 'b1',
  title: 'Dinner at Terra Kulture',
  creator_id: 'u1',
  total_kobo: 750_000,
  status: 'partially_paid',
  deadline_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  complete_by_at: new Date(Date.now() + 86_400_000).toISOString(),
  timezone: 'Africa/Lagos',
  created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
}

const groups = [
  { id: 'tokens', label: 'Foundations' },
  { id: 'controls', label: 'Controls' },
  { id: 'forms', label: 'Form fields' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'money', label: 'Money and status' },
  { id: 'domain', label: 'Domain surfaces' },
  { id: 'layout', label: 'Layout' },
]

function DesignSystemPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <header className="max-w-2xl">
          <p className="label-caps">Design system</p>
          <h1 className="mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
            Cowri component library
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink-muted">
            Every component the product is built from, rendered live with its props documented. The
            previews are the real components, so this page breaks when they do.
          </p>
        </header>

        <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2 border-y border-rule py-3">
          {groups.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-[var(--radius-pill)] border border-rule px-3 py-1.5 text-sm text-ink-muted transition-colors duration-150 ease-[var(--ease-ui)] hover:border-accent hover:text-accent"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Foundations />
        <Controls />
        <FormFields />
        <Overlays />
        <Feedback />
        <MoneyAndStatus />
        <DomainSurfaces />
        <LayoutDocs />
      </div>
    </MarketingShell>
  )
}

// ── Foundations ─────────────────────────────────────────────────────────────

function Foundations() {
  const swatches = [
    { token: '--color-paper', name: 'paper', use: 'Page canvas. Never pure white.' },
    { token: '--color-paper-raised', name: 'paper-raised', use: 'Panels sitting on the canvas.' },
    { token: '--color-paper-sunken', name: 'paper-sunken', use: 'Wells, table headers, insets.' },
    { token: '--color-ink', name: 'ink', use: 'Body text and headings.' },
    { token: '--color-ink-muted', name: 'ink-muted', use: 'Secondary text.' },
    { token: '--color-ink-faint', name: 'ink-faint', use: 'Captions and metadata.' },
    { token: '--color-rule', name: 'rule', use: 'Hairline structure. Used instead of shadows.' },
    { token: '--color-rule-strong', name: 'rule-strong', use: 'Control borders and emphasis.' },
    { token: '--color-accent', name: 'accent', use: 'The single accent. Primary actions, credits.' },
    { token: '--color-accent-tint', name: 'accent-tint', use: 'Accent backgrounds.' },
    { token: '--color-clay', name: 'clay', use: 'Warnings, debits, destructive actions.' },
    { token: '--color-clay-tint', name: 'clay-tint', use: 'Warning backgrounds.' },
  ]

  return (
    <DocsGroup
      id="tokens"
      title="Foundations"
      description="Colour, type and shape are defined once as CSS custom properties in src/styles.css and consumed as Tailwind utilities. Both themes redefine the same token names, so nothing downstream needs a dark variant."
    >
      <section className="border-b border-rule py-10">
        <h3 className="font-numeric text-lg text-ink">Colour</h3>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">
          One accent and one warning tone, over a warm neutral range. Colour never carries meaning
          on its own: every status that uses it also says what it is in words.
        </p>
        <ul className="mt-5 divide-y divide-rule border border-rule">
          {swatches.map((swatch) => (
            <li key={swatch.token} className="flex items-center gap-4 px-4 py-2.5">
              <span
                aria-hidden="true"
                className="size-8 shrink-0 border border-rule-strong"
                style={{ background: `var(${swatch.token})` }}
              />
              <span className="numeric w-40 shrink-0 text-[0.8125rem] text-ink">{swatch.name}</span>
              <span className="text-[0.8125rem] text-ink-muted">{swatch.use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-b border-rule py-10">
        <h3 className="font-numeric text-lg text-ink">Type</h3>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">
          Three faces with distinct jobs. Headings in a serif with real character, interface text in
          a neutral grotesque, and every figure in a monospace with tabular numerals so columns of
          money line up and a changing balance does not shift the layout.
        </p>
        <div className="mt-5 divide-y divide-rule border border-rule">
          <div className="px-4 py-4">
            <p className="label-caps">font-display, Fraunces</p>
            <p className="mt-2 font-display text-3xl text-ink">Save together, split easy</p>
          </div>
          <div className="px-4 py-4">
            <p className="label-caps">font-sans, Public Sans</p>
            <p className="mt-2 text-base text-ink">
              Interface text, form labels, body copy and everything a person reads at a glance.
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="label-caps">numeric, IBM Plex Mono, tabular</p>
            <p className="numeric mt-2 text-2xl text-ink">₦1,234,567.89</p>
            <p className="numeric text-2xl text-ink">₦0,000,000.00</p>
          </div>
        </div>
      </section>

      <section className="py-10">
        <h3 className="font-numeric text-lg text-ink">Shape and depth</h3>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">
          Radii differ by role rather than being uniform, and depth comes from a background step and
          a hairline rule rather than from a shadow.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          {[
            { radius: 'var(--radius-panel)', label: 'panel, 2px' },
            { radius: 'var(--radius-control)', label: 'control, 7px' },
            { radius: 'var(--radius-pill)', label: 'pill, full' },
          ].map((shape) => (
            <div key={shape.label} className="text-center">
              <div
                className="size-20 border border-rule-strong bg-paper-raised"
                style={{ borderRadius: shape.radius }}
              />
              <p className="numeric mt-2 text-xs text-ink-faint">{shape.label}</p>
            </div>
          ))}
        </div>
      </section>
    </DocsGroup>
  )
}

// ── Controls ────────────────────────────────────────────────────────────────

function Controls() {
  const [pending, setPending] = useState(false)

  return (
    <DocsGroup
      id="controls"
      title="Controls"
      description="Actions. One primary per view, everything else secondary or quieter."
    >
      <ComponentDoc
        id="button"
        name="Button"
        summary="The app's action control. Five variants and three sizes, with a loading state that blocks repeat clicks and announces itself."
        notes={
          <p>
            The medium size is 44px tall, which is the minimum comfortable tap target. Use the small
            size only inside dense rows where a finger is not the primary input.
          </p>
        }
        example={
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Primary</Button>
              <Button>Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" leading={<NoteIcon size={16} />}>
                With an icon
              </Button>
              <Button disabled>Disabled</Button>
              <Button
                variant="primary"
                loading={pending}
                loadingText="Working"
                onClick={() => {
                  setPending(true)
                  setTimeout(() => setPending(false), 1500)
                }}
              >
                Click to load
              </Button>
            </div>
          </div>
        }
        code={`<Button variant="primary" loading={isPending} loadingText="Sending">
  Send code
</Button>`}
        props={[
          {
            name: 'variant',
            type: "'primary' | 'secondary' | 'ghost' | 'danger' | 'link'",
            default: "'secondary'",
            description: 'Visual weight. Use primary for the one action the page is about.',
          },
          {
            name: 'size',
            type: "'sm' | 'md' | 'lg'",
            default: "'md'",
            description: 'md is the 44px default tap target.',
          },
          {
            name: 'loading',
            type: 'boolean',
            default: 'false',
            description: 'Shows a spinner, disables the button and sets aria-busy.',
          },
          {
            name: 'loadingText',
            type: 'string',
            description: 'Replaces the label while loading, so the state is readable not just visible.',
          },
          { name: 'leading', type: 'ReactNode', description: 'Node rendered before the label.' },
          { name: 'trailing', type: 'ReactNode', description: 'Node rendered after the label.' },
          {
            name: 'fullWidth',
            type: 'boolean',
            default: 'false',
            description: 'Stretches to the container width. Used for form submits on mobile.',
          },
        ]}
      />

      <ComponentDoc
        id="icon-button"
        name="IconButton"
        summary="A square control holding a single icon, for toolbars and dismiss affordances."
        notes={
          <p>
            <strong>label is required.</strong> There is no visible text, so without it the control
            is unnamed for screen readers and unlabelled on hover.
          </p>
        }
        example={
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Close">
              <CloseIcon />
            </IconButton>
            <IconButton label="Settings" variant="secondary">
              <SettingsIcon />
            </IconButton>
            <IconButton label="Sign out" variant="danger">
              <SignOutIcon />
            </IconButton>
            <IconButton label="Small" size="sm" variant="secondary">
              <WalletIcon size={18} />
            </IconButton>
          </div>
        }
        code={`<IconButton label="Close" variant="ghost" onClick={close}>
  <CloseIcon />
</IconButton>`}
        props={[
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Accessible name, also used as the title tooltip.',
          },
          {
            name: 'variant',
            type: 'ButtonVariant',
            default: "'ghost'",
            description: 'Same variants as Button.',
          },
          { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Square box size.' },
        ]}
      />

      <ComponentDoc
        id="icons"
        name="Icon set"
        summary="Icons drawn for this product on a 24 unit grid, exported from src/components/icons.tsx. No icon library is used anywhere in the app."
        notes={
          <p>
            Icons are decorative and hidden from assistive technology by default. Passing a{' '}
            <span className="numeric">title</span> makes one meaningful, which sets role="img" and a
            label.
          </p>
        }
        example={
          <div className="flex flex-wrap items-center gap-6 text-ink">
            {[
              { Icon: ShellIcon, name: 'Shell' },
              { Icon: WalletIcon, name: 'Wallet' },
              { Icon: CircleGroupIcon, name: 'CircleGroup' },
              { Icon: SplitIcon, name: 'Split' },
              { Icon: ReceiptIcon, name: 'Receipt' },
              { Icon: TallyIcon, name: 'Tally' },
              { Icon: NoteIcon, name: 'Note' },
            ].map(({ Icon, name }) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <Icon size={26} />
                <span className="numeric text-[0.6875rem] text-ink-faint">{name}</span>
              </div>
            ))}
          </div>
        }
        code={`import { WalletIcon } from '~/components/icons'

// Decorative, beside its own label
<WalletIcon size={18} />

// Meaningful on its own
<WalletIcon size={18} title="Wallet balance" />`}
        props={[
          { name: 'size', type: 'number', default: '20', description: 'Pixel size on both axes.' },
          {
            name: 'title',
            type: 'string',
            description: 'Accessible name. Omit for icons that sit beside text.',
          },
        ]}
      />
    </DocsGroup>
  )
}

// ── Form fields ─────────────────────────────────────────────────────────────

function FormFields() {
  const [text, setText] = useState('')
  const [pin, setPin] = useState('')
  const [otp, setOtp] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState<number | null>(250_000)
  const [frequency, setFrequency] = useState('weekly')
  const [accepted, setAccepted] = useState(false)
  const [order, setOrder] = useState('join')
  const [dark, setDark] = useState(false)

  return (
    <DocsGroup
      id="forms"
      title="Form fields"
      description="Field owns the ids that tie a label, a hint and an error message to a control, so a screen cannot ship an unlabelled input by forgetting an htmlFor."
    >
      <ComponentDoc
        id="field"
        name="Field, Label, FieldError"
        summary="The wrapper every control sits in. It generates the ids, wires aria-describedby to the hint and the error, and marks the control invalid when an error is present."
        example={
          <div className="flex max-w-sm flex-col gap-5">
            <Field label="Full name" hint="As it appears on your ID." required>
              <Input value={text} onChange={(event) => setText(event.target.value)} />
            </Field>
            <Field label="Email address" error="Enter an address you can open right now." required>
              <Input type="email" defaultValue="not-an-email" />
            </Field>
          </div>
        }
        code={`<Field label="Phone number" hint="Nigerian mobile number" error={errors.phone} required>
  <PhoneInput value={phone} onValueChange={setPhone} />
</Field>`}
        props={[
          { name: 'label', type: 'ReactNode', required: true, description: 'The visible label.' },
          {
            name: 'hint',
            type: 'ReactNode',
            description: 'Format guidance under the label. Not for error text.',
          },
          {
            name: 'error',
            type: 'string | null',
            description: 'Presence switches the field into its error state and announces the message.',
          },
          {
            name: 'required',
            type: 'boolean',
            default: 'false',
            description: 'Marks the label and sets required on the control.',
          },
          {
            name: 'action',
            type: 'ReactNode',
            description: 'Right-aligned node on the label row, such as a "Forgot PIN?" link.',
          },
        ]}
      />

      <ComponentDoc
        id="input"
        name="Input, Textarea"
        summary="Single and multi-line text. Input takes optional prefix and suffix slots, which move the border and focus ring onto a wrapper so the whole control reads as one thing."
        example={
          <div className="flex max-w-sm flex-col gap-5">
            <Field label="Circle name">
              <Input placeholder="Owambe Circle" />
            </Field>
            <Field label="Amount with a prefix">
              <Input prefix={<span>₦</span>} placeholder="0" className="numeric" />
            </Field>
            <Field label="Note">
              <Textarea rows={3} placeholder="What was this for?" />
            </Field>
          </div>
        }
        code={`<Field label="Circle name" error={errors.name}>
  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
</Field>`}
        props={[
          { name: 'prefix', type: 'ReactNode', description: 'Non-interactive node inside the control, on the left.' },
          { name: 'suffix', type: 'ReactNode', description: 'Node inside the control on the right. May hold a button.' },
          {
            name: 'invalid',
            type: 'boolean',
            description: 'Forces the error styling. Inherited from Field when omitted.',
          },
        ]}
      />

      <ComponentDoc
        id="pin-input"
        name="PinInput"
        summary="Segmented numeric entry for PINs and one-time codes. Handles paste of a whole code, arrow key movement, and backspace that clears to the end."
        notes={
          <p>
            The API takes a 4 to 6 digit PIN and issues 6 digit codes. Set{' '}
            <span className="numeric">autoComplete="one-time-code"</span> on a code field so the
            platform can offer the code it just received.
          </p>
        }
        example={
          <div className="flex flex-col gap-5">
            <Field label="Transaction PIN">
              <PinInput label="Transaction PIN" secret value={pin} onValueChange={setPin} />
            </Field>
            <Field label="Verification code">
              <PinInput
                label="Verification code"
                length={6}
                autoComplete="one-time-code"
                value={otp}
                onValueChange={setOtp}
              />
            </Field>
          </div>
        }
        code={`<PinInput
  label="Verification code"
  length={6}
  autoComplete="one-time-code"
  value={code}
  onValueChange={setCode}
  onComplete={verify}
/>`}
        props={[
          { name: 'value', type: 'string', required: true, description: 'The digits entered so far.' },
          {
            name: 'onValueChange',
            type: '(value: string) => void',
            required: true,
            description: 'Fired on every change with the digits only.',
          },
          { name: 'label', type: 'string', required: true, description: 'Names the group and each box.' },
          { name: 'length', type: 'number', default: '4', description: 'Number of digits.' },
          {
            name: 'secret',
            type: 'boolean',
            default: 'false',
            description: 'Masks the digits and adds a reveal control.',
          },
          {
            name: 'onComplete',
            type: '(value: string) => void',
            description: 'Fired once the last digit lands. Use to submit without a click.',
          },
        ]}
      />

      <ComponentDoc
        id="phone-input"
        name="PhoneInput"
        summary="A phone field that normalises what is typed to the canonical local form and displays it grouped."
        notes={
          <p>
            The API matches accounts and bill participants on the exact stored phone string, so the
            app must always send one form. That form is the local 11 digit number with its leading
            zero, which is what existing accounts were registered with. Use{' '}
            <span className="numeric">normalisePhone</span> anywhere a number is read from
            somewhere other than this component.
          </p>
        }
        example={
          <div className="max-w-sm">
            <Field label="Phone number" hint="Type it any way. +234, 0803 and 234 all normalise.">
              <PhoneInput value={phone} onValueChange={setPhone} />
            </Field>
            <p className="numeric mt-2 text-xs text-ink-faint">Sent to the API as: {phone || '—'}</p>
          </div>
        }
        code={`<Field label="Phone number" error={errors.phone}>
  <PhoneInput value={phone} onValueChange={setPhone} autoComplete="tel-national" />
</Field>`}
        props={[
          { name: 'value', type: 'string', required: true, description: 'The normalised number.' },
          {
            name: 'onValueChange',
            type: '(value: string) => void',
            required: true,
            description: 'Receives the normalised number, not the formatted display text.',
          },
        ]}
      />

      <ComponentDoc
        id="money-input"
        name="MoneyInput"
        summary="Naira entry that reports integer kobo. Holds the typed text so a trailing decimal point survives, and reports null rather than zero when the input cannot be read."
        notes={
          <p>
            Nothing here converts to a float. An unparseable field is null, which is why a caller can
            never mistake a broken field for a legitimate ₦0.
          </p>
        }
        example={
          <div className="max-w-sm">
            <Field label="Amount to add">
              <MoneyInput
                valueKobo={amount}
                onValueChange={setAmount}
                minKobo={10_000}
                maxKobo={100_000_000}
                presetsKobo={[100_000, 250_000, 500_000]}
              />
            </Field>
            <p className="numeric mt-2 text-xs text-ink-faint">
              Sent to the API as: {amount === null ? 'null' : `${amount} kobo`}
            </p>
          </div>
        }
        code={`<Field label="Amount" error={errors.amount}>
  <MoneyInput
    valueKobo={amountKobo}
    onValueChange={setAmountKobo}
    minKobo={10_000}
    presetsKobo={[100_000, 200_000, 500_000]}
  />
</Field>`}
        props={[
          {
            name: 'valueKobo',
            type: 'number | null',
            required: true,
            description: 'Integer kobo, or null when empty or unparseable.',
          },
          {
            name: 'onValueChange',
            type: '(valueKobo: number | null) => void',
            required: true,
            description: 'Receives integer kobo.',
          },
          { name: 'minKobo', type: 'number', description: 'Printed as guidance under the field.' },
          { name: 'maxKobo', type: 'number', description: 'Printed as guidance under the field.' },
          { name: 'presetsKobo', type: 'number[]', description: 'Quick-pick chips under the field.' },
        ]}
      />

      <ComponentDoc
        id="choice"
        name="Select, Checkbox, Radio, Switch"
        summary="Choice controls. Select stays native so phones open the platform picker. Checkbox and Radio carry a 44px hit area around a 20px box. Switch is for settings that apply immediately."
        example={
          <div className="flex max-w-sm flex-col gap-6">
            <Field label="How often">
              <Select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </Field>

            <Checkbox
              label="I accept the Terms of Service"
              description="Required before your first contribution."
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />

            <fieldset className="border-0 p-0">
              <legend className="label-caps mb-2">Payout order</legend>
              <div className="flex flex-col gap-1">
                <Radio
                  name="docs-order"
                  label="Order of joining"
                  description="How Cowri assigns positions today."
                  checked={order === 'join'}
                  onChange={() => setOrder('join')}
                />
                <Radio
                  name="docs-order"
                  label="Drawn at random"
                  description="Not supported by the API yet."
                  checked={order === 'random'}
                  onChange={() => setOrder('random')}
                />
              </div>
            </fieldset>

            <Switch
              label="Dark theme"
              description="Applies as soon as you flip it."
              checked={dark}
              onCheckedChange={setDark}
            />
          </div>
        }
        code={`<Select value={frequency} onChange={(e) => setFrequency(e.target.value)}
  options={[{ value: 'weekly', label: 'Weekly' }]} />

<Checkbox label="I accept the Terms" checked={accepted}
  onChange={(e) => setAccepted(e.target.checked)} />

<Switch label="Dark theme" checked={dark} onCheckedChange={setDark} />`}
        props={[
          {
            name: 'Select.options',
            type: 'Array<{ value, label, disabled? }>',
            required: true,
            description: 'The list of options.',
          },
          {
            name: 'Select.placeholder',
            type: 'string',
            description: 'Disabled first entry shown while the value is empty.',
          },
          {
            name: 'Checkbox.label',
            type: 'ReactNode',
            required: true,
            description: 'Visible label, wired to the input.',
          },
          {
            name: 'Switch.onCheckedChange',
            type: '(checked: boolean) => void',
            required: true,
            description: 'Fired with the next state.',
          },
          {
            name: 'Switch.hideLabel',
            type: 'boolean',
            default: 'false',
            description: 'Hides the visible label, keeping the accessible name.',
          },
        ]}
      />

      <ComponentDoc
        id="label"
        name="Label"
        summary="A standalone label, for the rare control that sits outside a Field, such as a fieldset legend."
        example={
          <div className="max-w-sm">
            <Label htmlFor="docs-standalone" required>
              Search
            </Label>
            <Input id="docs-standalone" type="search" placeholder="Name, phone or id" className="mt-1.5" />
          </div>
        }
        code={`<Label htmlFor="search" required>Search</Label>
<Input id="search" type="search" />`}
        props={[
          { name: 'htmlFor', type: 'string', description: 'Id of the control being labelled.' },
          {
            name: 'required',
            type: 'boolean',
            default: 'false',
            description: 'Appends a marker to the label.',
          },
        ]}
      />
    </DocsGroup>
  )
}

// ── Overlays ────────────────────────────────────────────────────────────────

function Overlays() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <DocsGroup
      id="overlays"
      title="Overlays"
      description="All four share one implementation of focus trapping, Escape and outside-click dismissal, and scroll locking, so they cannot drift apart."
    >
      <ComponentDoc
        id="dialog"
        name="Dialog, Drawer"
        summary="Modal surfaces. Dialog centres on desktop and rises from the bottom on phones. Drawer is a side sheet on desktop and a bottom sheet on phones. Both trap focus and return it to the trigger."
        notes={
          <p>
            Set <span className="numeric">dismissable={'{false}'}</span> only while an irreversible
            operation is in flight, such as a payment. It removes Escape, the backdrop click and the
            close control at once.
          </p>
        }
        example={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open a dialog
            </Button>
            <Button onClick={() => setDrawerOpen(true)}>Open a drawer</Button>

            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              title="Pay your share"
              description="₦1,875 will leave your wallet now."
              footer={
                <>
                  <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => setDialogOpen(false)}>
                    Pay ₦1,875
                  </Button>
                </>
              }
            >
              <p className="text-sm leading-6 text-ink-muted">
                This settles your portion of Dinner at Terra Kulture and cannot be undone.
              </p>
            </Dialog>

            <Drawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              title="Filter transactions"
              footer={
                <Button variant="primary" onClick={() => setDrawerOpen(false)}>
                  Apply
                </Button>
              }
            >
              <p className="text-sm leading-6 text-ink-muted">
                A drawer holds secondary controls without taking the page away from the reader.
              </p>
            </Drawer>
          </div>
        }
        code={`<Dialog
  open={confirming}
  onOpenChange={setConfirming}
  title="Pay your share"
  description="₦1,875 will leave your wallet now."
  dismissable={!isPending}
  footer={<Button variant="primary" onClick={pay}>Pay ₦1,875</Button>}
>
  <p>This settles your portion of the bill.</p>
</Dialog>`}
        props={[
          { name: 'open', type: 'boolean', required: true, description: 'Controlled open state.' },
          {
            name: 'onOpenChange',
            type: '(open: boolean) => void',
            required: true,
            description: 'Called on every dismissal path.',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Accessible name of the surface.',
          },
          {
            name: 'description',
            type: 'string',
            description: 'Wired up as the accessible description.',
          },
          {
            name: 'hideTitle',
            type: 'boolean',
            default: 'false',
            description: 'Hides the header visually, keeping the name.',
          },
          { name: 'footer', type: 'ReactNode', description: 'Action row on a ruled band at the bottom.' },
          {
            name: 'dismissable',
            type: 'boolean',
            default: 'true',
            description: 'Set false to block Escape and backdrop dismissal.',
          },
        ]}
      />

      <ComponentDoc
        id="popover"
        name="Popover, DropdownMenu, Tooltip"
        summary="Non-modal anchored surfaces. Popover holds arbitrary content, DropdownMenu holds actions and supports arrow key movement, Tooltip is a hint on hover and focus."
        notes={
          <p>
            Tooltips are invisible on touch, so they may only repeat or expand on something already
            visible. Never put an instruction that matters in one.
          </p>
        }
        example={
          <div className="flex flex-wrap items-center gap-4">
            <Popover label="Balance detail" trigger={<Button>Balance detail</Button>}>
              <dl className="w-56 p-3 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-ink-muted">Available</dt>
                  <dd>
                    <MoneyAmount kobo={wallet.available_kobo} size="sm" />
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-ink-muted">Ledger</dt>
                  <dd>
                    <MoneyAmount kobo={wallet.ledger_kobo} size="sm" tone="muted" />
                  </dd>
                </div>
              </dl>
            </Popover>

            <DropdownMenu
              label="Account"
              trigger={<Button>Account menu</Button>}
              items={[
                { label: 'Profile and settings', icon: <SettingsIcon size={16} />, onSelect: () => {} },
                { label: 'Sign out', icon: <SignOutIcon size={16} />, danger: true, onSelect: () => {} },
              ]}
            />

            <Tooltip content="Money in the ledger that has not settled into your available balance yet.">
              <button type="button" className="text-sm text-ink underline decoration-rule-strong underline-offset-4">
                Ledger balance
              </button>
            </Tooltip>
          </div>
        }
        code={`<DropdownMenu
  label="Account"
  align="end"
  trigger={<IconButton label="Account"><UserIcon /></IconButton>}
  items={[
    { label: 'Settings', icon: <SettingsIcon size={16} />, onSelect: goToSettings },
    { label: 'Sign out', icon: <SignOutIcon size={16} />, danger: true, onSelect: signOut },
  ]}
/>`}
        props={[
          {
            name: 'trigger',
            type: 'ReactElement',
            required: true,
            description: 'The control that opens the surface. Receives the aria wiring.',
          },
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Names the surface for assistive technology.',
          },
          {
            name: 'items',
            type: 'MenuItem[]',
            required: true,
            description: 'DropdownMenu only. Each item takes label, onSelect, and optional icon, danger and disabled.',
          },
          {
            name: 'align',
            type: "'start' | 'end'",
            default: "'start'",
            description: 'Which edge the surface lines up with.',
          },
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'Tooltip only. Short supporting text.',
          },
        ]}
      />

      <ComponentDoc
        id="tabs"
        name="Tabs"
        summary="A controlled tab set following the ARIA authoring practice: one tab stop for the list, arrow keys between tabs, and manual activation so arrowing through does not fire a fetch per tab."
        example={<TabsExample />}
        code={`<Tabs
  label="Transaction type"
  value={filter}
  onValueChange={setFilter}
  items={[
    { value: 'all', label: 'Everything' },
    { value: 'credit', label: 'Money in', badge: 12 },
  ]}
>
  <TransactionList transactions={filtered} />
</Tabs>`}
        props={[
          {
            name: 'items',
            type: 'TabItem[]',
            required: true,
            description: 'Each takes value, label, and optional badge and disabled.',
          },
          { name: 'value', type: 'string', required: true, description: 'The selected tab value.' },
          {
            name: 'onValueChange',
            type: '(value: string) => void',
            required: true,
            description: 'Fired on click and on arrow key movement.',
          },
          { name: 'label', type: 'string', required: true, description: 'Names the tab list.' },
        ]}
      />
    </DocsGroup>
  )
}

function TabsExample() {
  const [tab, setTab] = useState('all')
  return (
    <Tabs
      label="Transaction type"
      value={tab}
      onValueChange={setTab}
      items={[
        { value: 'all', label: 'Everything', badge: 2 },
        { value: 'credit', label: 'Money in', badge: 1 },
        { value: 'debit', label: 'Money out', badge: 1 },
      ]}
    >
      <div className="panel overflow-hidden">
        <TransactionList
          transactions={transactions.filter((item) => (tab === 'all' ? true : item.kind === tab))}
        />
      </div>
    </Tabs>
  )
}

// ── Feedback ────────────────────────────────────────────────────────────────

function Feedback() {
  const { toast } = useToast()
  const [page, setPage] = useState(0)

  return (
    <DocsGroup
      id="feedback"
      title="Feedback and loading"
      description="Every list surface has a matching skeleton, and every failed fetch has a retryable error state. Nothing in the product renders a bare spinner where a shaped placeholder would do."
    >
      <ComponentDoc
        id="skeleton"
        name="Skeleton, SkeletonGroup"
        summary="Shaped placeholders. A skeleton must match the geometry of what replaces it, otherwise the page jumps when data lands. Group them so the region is announced once."
        example={
          <SkeletonGroup label="Loading transactions" className="w-full max-w-md divide-y divide-rule border border-rule">
            {['62%', '45%', '73%'].map((width) => (
              <div key={width} className="flex items-start gap-3 px-4 py-3">
                <Skeleton width="1.75rem" height="1.75rem" shape="pill" />
                <div className="flex-1">
                  <Skeleton width={width} height="0.9375rem" />
                  <Skeleton width="7rem" height="0.75rem" className="mt-2" />
                </div>
                <Skeleton width="5rem" height="1rem" />
              </div>
            ))}
          </SkeletonGroup>
        }
        code={`<SkeletonGroup label="Loading balance">
  <Skeleton width="8.5rem" height="0.75rem" />
  <Skeleton width="12rem" height="2.5rem" shape="block" className="mt-3" />
</SkeletonGroup>`}
        props={[
          { name: 'width', type: 'string | number', description: 'Any CSS width. Vary widths across a group.' },
          { name: 'height', type: 'string | number', default: "'1rem'", description: 'Any CSS height.' },
          {
            name: 'shape',
            type: "'text' | 'block' | 'pill'",
            default: "'text'",
            description: 'Corner treatment matching the content it stands in for.',
          },
          {
            name: 'SkeletonGroup.label',
            type: 'string',
            default: "'Loading'",
            description: 'Announced once for the whole region.',
          },
        ]}
      />

      <ComponentDoc
        id="spinner"
        name="Spinner"
        summary="Indeterminate progress for a control that is busy. Use a skeleton instead whenever the shape of the incoming content is known."
        example={
          <div className="flex items-center gap-6">
            <Spinner size={16} />
            <Spinner size={24} />
            <Spinner size={32} label="Loading transactions" />
          </div>
        }
        code={`<Spinner size={20} label="Loading transactions" />`}
        props={[
          { name: 'size', type: 'number', default: '16', description: 'Pixel size.' },
          {
            name: 'label',
            type: 'string',
            description: 'Announced as a status. Omit inside a button that is already aria-busy.',
          },
        ]}
      />

      <ComponentDoc
        id="toast"
        name="Toast"
        summary="Transient confirmation. Warnings use an assertive live region so a failed payment interrupts a screen reader; info and success stay polite."
        notes={
          <p>
            <strong>Nothing essential belongs only in a toast.</strong> It disappears. Anything the
            user may need again goes on the page.
          </p>
        }
        example={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => toast({ title: 'Invite link copied', tone: 'success' })}>
              Success
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: 'Continue on Paystack',
                  description: 'Your balance updates once the payment is confirmed.',
                  tone: 'info',
                })
              }
            >
              Info
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: 'Payment failed',
                  description: 'Insufficient balance.',
                  tone: 'warning',
                  action: { label: 'Add money', onSelect: () => {} },
                })
              }
            >
              Warning with an action
            </Button>
          </div>
        }
        code={`const { toast } = useToast()

toast({ title: 'Invite link copied', tone: 'success' })
toast({ title: 'Payment failed', description: message, tone: 'warning' })`}
        props={[
          { name: 'title', type: 'string', required: true, description: 'The headline. Keep it short.' },
          { name: 'description', type: 'string', description: 'One supporting sentence.' },
          {
            name: 'tone',
            type: "'info' | 'success' | 'warning'",
            default: "'info'",
            description: 'Warning uses an assertive live region.',
          },
          {
            name: 'duration',
            type: 'number',
            default: '5000, or 8000 for warnings',
            description: 'Milliseconds before auto-dismiss. 0 requires a manual dismissal.',
          },
          {
            name: 'action',
            type: '{ label: string; onSelect: () => void }',
            description: 'One inline action, dismissed after selection.',
          },
        ]}
      />

      <ComponentDoc
        id="states"
        name="EmptyState, ErrorState"
        summary="EmptyState is for a surface that loaded and has nothing in it. ErrorState is for a load that failed, and reads the API's own message off the thrown error."
        example={
          <div className="flex flex-col gap-4">
            <EmptyState
              icon={<CircleGroupIcon size={28} />}
              title="You are not in a circle yet"
              description="Start one and share the invite link with the people you already save with."
              action={<Button variant="primary">Start a circle</Button>}
            />
            <ErrorState
              error={new ApiError(402, 'Insufficient balance')}
              onRetry={() => {}}
            />
          </div>
        }
        code={`{query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : null}

<EmptyState
  icon={<ReceiptIcon size={28} />}
  title="No bills yet"
  description="Split a bill and Cowri works out the shares."
  action={<Button variant="primary">Split a bill</Button>}
/>`}
        props={[
          { name: 'title', type: 'string', required: true, description: 'EmptyState heading.' },
          { name: 'description', type: 'string', description: 'What to do next.' },
          { name: 'icon', type: 'ReactNode', description: 'A drawn mark from the icon set.' },
          { name: 'action', type: 'ReactNode', description: 'The one thing to do from here.' },
          {
            name: 'ErrorState.error',
            type: 'unknown',
            required: true,
            description: 'Whatever the query threw. Turned into a readable sentence.',
          },
          {
            name: 'ErrorState.onRetry',
            type: '() => void',
            description: 'Wire to the query refetch. Hidden for 401 and 403, which retrying cannot fix.',
          },
        ]}
      />

      <ComponentDoc
        id="progress"
        name="Progress, Badge, Avatar, Divider"
        summary="Small display pieces. Progress is a ruled determinate track. Badge classifies. Avatar shows initials, since the product has no uploaded images. Divider separates."
        example={
          <div className="flex max-w-md flex-col gap-6">
            <Progress value={3} max={8} label="Contributions collected this cycle" showLabel />
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Member</Badge>
              <Badge tone="accent">Admin</Badge>
              <Badge tone="clay">Not verified</Badge>
              <Badge tone="outline">Draft</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Avatar name="Adaeze Nwosu" size="sm" />
              <Avatar name="Adaeze Nwosu" size="md" />
              <Avatar name="Adaeze Nwosu" size="lg" />
            </div>
            <Divider label="or" />
          </div>
        }
        code={`<Progress value={3} max={8} label="Contributions this cycle" showLabel />
<Badge tone="accent">Admin</Badge>
<Avatar name="Adaeze Nwosu" size="md" />
<Divider label="or" />`}
        props={[
          { name: 'Progress.value', type: 'number', required: true, description: 'Current value.' },
          { name: 'Progress.max', type: 'number', default: '100', description: 'Upper bound.' },
          {
            name: 'Progress.label',
            type: 'string',
            required: true,
            description: 'Describes what is progressing. Required for the progressbar role.',
          },
          {
            name: 'Badge.tone',
            type: "'neutral' | 'accent' | 'clay' | 'outline'",
            default: "'neutral'",
            description: 'Colour only reinforces the text; it never carries the meaning alone.',
          },
          {
            name: 'Avatar.name',
            type: 'string',
            required: true,
            description: 'Used for the initials and the accessible name.',
          },
          {
            name: 'Divider.label',
            type: 'string',
            description: 'Centres a caption in the rule. Horizontal only.',
          },
        ]}
      />

      <ComponentDoc
        id="pagination"
        name="Pagination"
        summary="Previous and next paging. Two of the API's list endpoints return a bare array with no total, so this control infers the end of the data from a short final page rather than inventing a page count."
        example={
          <div className="w-full max-w-md">
            <Pagination
              page={page}
              perPage={20}
              currentPageCount={page < 2 ? 20 : 7}
              onPageChange={setPage}
            />
          </div>
        }
        code={`<Pagination
  page={page}
  perPage={20}
  currentPageCount={rows.length}
  onPageChange={setPage}
/>`}
        props={[
          {
            name: 'page',
            type: 'number',
            required: true,
            description: "Zero based, matching the API's page parameter.",
          },
          {
            name: 'onPageChange',
            type: '(page: number) => void',
            required: true,
            description: 'Fired with the next page index.',
          },
          { name: 'perPage', type: 'number', required: true, description: 'Page size sent to the API.' },
          {
            name: 'total',
            type: 'number',
            description: 'Pass when the endpoint reports one, which the admin endpoints do.',
          },
          {
            name: 'currentPageCount',
            type: 'number',
            description: 'Length of the current page, used to detect the end when there is no total.',
          },
        ]}
      />
    </DocsGroup>
  )
}

// ── Money and status ────────────────────────────────────────────────────────

function MoneyAndStatus() {
  const [balance, setBalance] = useState(4_875_000)

  return (
    <DocsGroup
      id="money"
      title="Money and status"
      description="Every figure in the product goes through MoneyAmount, and every API enum goes through StatusPill. Neither has an alternative path."
    >
      <ComponentDoc
        id="money-amount"
        name="MoneyAmount"
        summary="The only component that renders money. Tabular figures keep digits in fixed columns, so a changing balance does not shift the layout beside it."
        notes={
          <p>
            Screen readers get a spoken form, because "₦12,345.67" is read unreliably. The animated
            figure is hidden from assistive technology so a roll-up is not announced frame by frame.
          </p>
        }
        example={
          <div className="flex flex-col gap-4">
            <div>
              <MoneyAmount kobo={balance} size="display" koboDigits="always" animate />
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setBalance((current) => current + 250_000)}>
                  Add ₦2,500
                </Button>
                <Button size="sm" onClick={() => setBalance((current) => current - 187_500)}>
                  Take ₦1,875
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-6 border-t border-rule pt-4">
              <MoneyAmount kobo={1_234_567} size="lg" />
              <MoneyAmount kobo={500_000} size="md" />
              <MoneyAmount kobo={187_550} size="sm" tone="muted" koboDigits="always" />
              <MoneyAmount kobo={200_000} tone="auto" signed />
              <MoneyAmount kobo={-50_000} tone="auto" signed />
            </div>
          </div>
        }
        code={`<MoneyAmount kobo={wallet.available_kobo} size="display" animate />

// In a ledger row, coloured and signed by direction
<MoneyAmount kobo={isCredit ? amount : -amount} tone="auto" signed />`}
        props={[
          {
            name: 'kobo',
            type: 'number',
            required: true,
            description: 'Integer kobo, exactly as the API returned it.',
          },
          {
            name: 'size',
            type: "'sm' | 'md' | 'lg' | 'display'",
            default: "'md'",
            description: 'display is for the one headline balance per screen.',
          },
          {
            name: 'tone',
            type: "'default' | 'muted' | 'credit' | 'debit' | 'auto'",
            default: "'default'",
            description: 'auto colours by sign: credits accent, debits clay.',
          },
          {
            name: 'signed',
            type: 'boolean',
            default: 'false',
            description: 'Prefixes a + or -.',
          },
          {
            name: 'koboDigits',
            type: "'auto' | 'always' | 'never'",
            default: "'auto'",
            description: 'auto hides the kobo part on whole naira amounts.',
          },
          {
            name: 'animate',
            type: 'boolean',
            default: 'false',
            description: 'Rolls up to a changed value over 450ms. Respects reduced motion. For the balance only.',
          },
        ]}
      />

      <ComponentDoc
        id="status-pill"
        name="StatusPill"
        summary="Turns an API status enum into a labelled pill. The label carries the meaning, so it still works in monochrome."
        example={
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill kind="ajo" status="active" />
              <StatusPill kind="ajo" status="paused" />
              <StatusPill kind="ajo" status="completed" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill kind="bill" status="pending" />
              <StatusPill kind="bill" status="partially_paid" />
              <StatusPill kind="bill" status="settled" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill kind="transaction" status="pending" />
              <StatusPill kind="transaction" status="success" />
              <StatusPill kind="transaction" status="failed" />
            </div>
          </div>
        }
        code={`<StatusPill kind="bill" status={bill.status} />`}
        props={[
          {
            name: 'kind',
            type: "'ajo' | 'bill' | 'transaction'",
            required: true,
            description: 'Which enum the status belongs to. Narrows the allowed status values.',
          },
          {
            name: 'status',
            type: 'AjoStatus | BillStatus | TransactionStatus',
            required: true,
            description: 'The snake_case value straight from the API.',
          },
        ]}
      />
    </DocsGroup>
  )
}

// ── Domain surfaces ─────────────────────────────────────────────────────────

function DomainSurfaces() {
  return (
    <DocsGroup
      id="domain"
      title="Domain surfaces"
      description="Components that know about wallets, circles and bills. Each one is shaped by what the API actually returns, including where it returns less than a designer might wish for."
    >
      <ComponentDoc
        id="balance-card"
        name="BalanceCard"
        summary="The wallet's headline figure. The ledger line only appears when the ledger and available balances differ, which is the case worth explaining."
        example={
          <BalanceCard
            wallet={wallet}
            animate={false}
            actions={
              <>
                <Button variant="primary" size="sm" leading={<NoteIcon size={16} />}>
                  Add money
                </Button>
                <Button size="sm">Transaction history</Button>
              </>
            }
          />
        }
        code={`<BalanceCard
  wallet={wallet}
  actions={<Button variant="primary">Add money</Button>}
/>`}
        props={[
          {
            name: 'wallet',
            type: 'Wallet',
            required: true,
            description: 'The wallet object from GET /wallet.',
          },
          { name: 'actions', type: 'ReactNode', description: 'Rendered on a ruled band beneath the figure.' },
          {
            name: 'animate',
            type: 'boolean',
            default: 'true',
            description: 'Rolls the figure up when the balance changes.',
          },
        ]}
      />

      <ComponentDoc
        id="transaction-list"
        name="TransactionRow, TransactionList"
        summary="The ledger. Direction is carried three ways at once: the wording, the sign on the figure and the colour, so colour alone is never load-bearing."
        example={
          <div className="panel overflow-hidden">
            <TransactionList transactions={transactions} grouped showReference />
          </div>
        }
        code={`<TransactionList
  transactions={data}
  grouped
  showReference
  empty={<EmptyState title="No activity yet" />}
/>`}
        props={[
          {
            name: 'transactions',
            type: 'Transaction[]',
            required: true,
            description: 'Rows to render, in the order the API returned them.',
          },
          {
            name: 'grouped',
            type: 'boolean',
            default: 'false',
            description: 'Groups rows under Today, Yesterday and dated headings.',
          },
          {
            name: 'showReference',
            type: 'boolean',
            default: 'false',
            description: 'Prints the ledger reference under each row.',
          },
          {
            name: 'empty',
            type: 'ReactNode',
            description: 'Rendered instead of the rows when the list is empty.',
          },
        ]}
      />

      <ComponentDoc
        id="ajo-components"
        name="AjoGroupCard, AjoCycleTimeline, ContributionSchedule"
        summary="The three ways a circle is shown: as an entry in a list, as a payout order, and as a breakdown of what a cycle costs and collects."
        notes={
          <p>
            The API returns members as positions and a received flag, with no names, so the timeline
            labels seats rather than people. Empty seats are drawn as unfilled rather than hidden,
            because a cycle with nobody in it has nobody to pay.
          </p>
        }
        example={
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-3">
              <AjoGroupCard group={group} joined={4} />
            </ul>
            <div className="panel overflow-hidden">
              <AjoCycleTimeline group={group} members={members} currentUserId="u1" />
            </div>
            <div className="panel px-4 py-3">
              <ContributionSchedule
                detail={{
                  group,
                  members,
                  contributions_this_cycle: 2,
                  members_total: 4,
                }}
              />
            </div>
          </div>
        }
        code={`<AjoGroupCard group={group} joined={detail.members_total} />

<AjoCycleTimeline group={detail.group} members={detail.members} currentUserId={user.id} />

<ContributionSchedule detail={detail} />`}
        props={[
          { name: 'group', type: 'AjoGroup', required: true, description: 'The group object from the API.' },
          {
            name: 'joined',
            type: 'number',
            description: 'Current headcount. group.member_count is the target, not the headcount.',
          },
          {
            name: 'members',
            type: 'AjoMemberSummary[]',
            required: true,
            description: 'Timeline only. Positions and received flags from GET /ajo/:id.',
          },
          {
            name: 'currentUserId',
            type: 'Uuid',
            description: "Marks the caller's own seat on the timeline.",
          },
          {
            name: 'detail',
            type: 'AjoDetail',
            required: true,
            description: 'ContributionSchedule only. The whole detail payload.',
          },
        ]}
      />

      <ComponentDoc
        id="bill-components"
        name="BillCard, ParticipantSplitRow"
        summary="A bill in a list, and one person's share within it."
        notes={
          <p>
            Participants arrive as account ids with no names attached, so rows read as "You" or
            "Participant 8f3a…". Cowri does not invent a person the API declined to describe.
          </p>
        }
        example={
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-3">
              <BillCard bill={bill} currentUserId="u1" myShareKobo={187_500} />
            </ul>
            <div className="panel overflow-hidden">
              <ul className="divide-y divide-rule">
                <ParticipantSplitRow
                  participant={{ user_id: 'u1', share_kobo: 187_500, paid: false }}
                  currentUserId="u1"
                  creatorId="u1"
                  action={
                    <Button size="sm" variant="primary">
                      Pay
                    </Button>
                  }
                />
                <ParticipantSplitRow
                  participant={{ user_id: 'u2f3a91', share_kobo: 187_500, paid: true }}
                  currentUserId="u1"
                  creatorId="u1"
                />
              </ul>
            </div>
          </div>
        }
        code={`<BillCard bill={bill} currentUserId={user.id} />

<ParticipantSplitRow
  participant={participant}
  currentUserId={user.id}
  creatorId={bill.creator_id}
  action={<Button size="sm" variant="primary" onClick={pay}>Pay</Button>}
/>`}
        props={[
          { name: 'bill', type: 'Bill', required: true, description: 'The bill object from the API.' },
          {
            name: 'currentUserId',
            type: 'Uuid',
            description: 'Marks bills you raised, and your own row on a split.',
          },
          {
            name: 'myShareKobo',
            type: 'number',
            description: 'Adds your share to the card when the detail has been loaded.',
          },
          {
            name: 'participant',
            type: 'BillParticipantSummary',
            required: true,
            description: 'Row only. One entry from the detail payload.',
          },
          { name: 'action', type: 'ReactNode', description: 'Right-hand node, typically a pay button.' },
        ]}
      />

      <ComponentDoc
        id="data-table"
        name="DataTable"
        summary="A ruled table for the admin surfaces. Scrolls horizontally inside its own container rather than pushing the page wide, and keeps its caption in the accessibility tree even when hidden."
        example={
          <DataTable
            caption="Recent transactions"
            hideCaption={false}
            rows={transactions}
            getRowId={(row) => row.id}
            columns={[
              { id: 'description', header: 'Description', cell: (row) => row.description },
              {
                id: 'reference',
                header: 'Reference',
                hideOnMobile: true,
                cell: (row) => <span className="numeric text-xs text-ink-faint">{row.reference}</span>,
              },
              {
                id: 'amount',
                header: 'Amount',
                numeric: true,
                cell: (row) => (
                  <MoneyAmount
                    kobo={row.kind === 'debit' ? -row.amount_kobo : row.amount_kobo}
                    size="sm"
                    tone="auto"
                    signed
                  />
                ),
              },
            ]}
          />
        }
        code={`<DataTable
  caption="All users"
  rows={data.users}
  getRowId={(user) => user.id}
  loading={query.isPending}
  empty={<EmptyState title="No users yet" />}
  columns={[
    { id: 'name', header: 'Name', cell: (user) => user.name },
    { id: 'balance', header: 'Balance', numeric: true,
      cell: (user) => <MoneyAmount kobo={user.balance_kobo} size="sm" /> },
  ]}
/>`}
        props={[
          {
            name: 'columns',
            type: 'Array<Column<Row>>',
            required: true,
            description: 'Each takes id, header, cell, and optional numeric, hideOnMobile and width.',
          },
          { name: 'rows', type: 'Row[]', required: true, description: 'The data.' },
          {
            name: 'getRowId',
            type: '(row: Row) => string',
            required: true,
            description: 'Stable React key for each row.',
          },
          {
            name: 'caption',
            type: 'string',
            required: true,
            description: 'Names the table. Hidden visually by default.',
          },
          {
            name: 'loading',
            type: 'boolean',
            default: 'false',
            description: 'Renders a skeleton shaped to the column layout.',
          },
          { name: 'empty', type: 'ReactNode', description: 'Shown instead of the table when there are no rows.' },
        ]}
      />
    </DocsGroup>
  )
}

// ── Layout ──────────────────────────────────────────────────────────────────

function LayoutDocs() {
  return (
    <DocsGroup
      id="layout"
      title="Layout"
      description="Three frames: the marketing shell, the signed-in app shell with its bottom navigation, and the authentication shell. Each page contributes one PageHeader and nothing else structural."
    >
      <ComponentDoc
        id="page-header"
        name="PageHeader"
        summary="The top of an application page. One h1, optional context, an optional back link, and the page's own actions on the same line at wide sizes."
        example={
          <div className="border border-rule bg-paper-raised px-5 py-5">
            <PageHeader
              eyebrow="Savings circle"
              title="Owambe Circle"
              description="Four members, weekly, currently on cycle two."
              back={{ to: '/ajo', label: 'All circles' }}
              actions={<Button variant="primary">Contribute ₦5,000</Button>}
            />
          </div>
        }
        code={`<PageHeader
  eyebrow="Savings circles"
  title={group.name}
  description="Eight members, weekly."
  back={{ to: '/ajo', label: 'All circles' }}
  actions={<Button variant="primary">Contribute</Button>}
/>`}
        props={[
          { name: 'title', type: 'string', required: true, description: "The page's only h1." },
          { name: 'description', type: 'ReactNode', description: 'What the page is for.' },
          { name: 'eyebrow', type: 'string', description: 'Small label above the title naming the section.' },
          {
            name: 'back',
            type: '{ to, label, params? }',
            description: 'Renders a back link above the title.',
          },
          { name: 'actions', type: 'ReactNode', description: 'Primary and secondary page actions.' },
        ]}
      />

      <section className="border-b border-rule py-10 last:border-b-0">
        <h3 className="font-numeric text-lg text-ink">AppShell, BottomNav, MarketingShell, AuthShell</h3>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-7 text-ink-muted">
          The signed-in frame is a fixed narrow rail on the left at desktop widths, a bar and a
          bottom navigation on phones. The content column is capped and sits left of centre, with the
          remaining space left as margin rather than filled with a second column. You are looking at
          the marketing shell now.
        </p>
        <ul className="mt-4 divide-y divide-rule border border-rule text-[0.9375rem]">
          <li className="px-4 py-3">
            <span className="numeric text-ink">AppShell</span>
            <span className="ml-3 text-ink-muted">
              Wraps every authenticated route. Provides the skip link, the offline notice, the rail,
              the account menu and the theme control.
            </span>
          </li>
          <li className="px-4 py-3">
            <span className="numeric text-ink">BottomNav</span>
            <span className="ml-3 text-ink-muted">
              Four targets, each at least 56px tall, labels always visible. Hidden above the lg
              breakpoint.
            </span>
          </li>
          <li className="px-4 py-3">
            <span className="numeric text-ink">MarketingShell</span>
            <span className="ml-3 text-ink-muted">
              Public frame with the section navigation and the footer carrying the legal links.
            </span>
          </li>
          <li className="px-4 py-3">
            <span className="numeric text-ink">AuthShell</span>
            <span className="ml-3 text-ink-muted">
              Narrow left-aligned frame for the sign-in, registration, verification and password
              reset steps.
            </span>
          </li>
          <li className="px-4 py-3">
            <span className="numeric text-ink">OfflineNotice</span>
            <span className="ml-3 text-ink-muted">
              A standing bar while the browser reports no connection, warning that balances may be
              stale and payments will fail.
            </span>
          </li>
        </ul>
      </section>
    </DocsGroup>
  )
}
