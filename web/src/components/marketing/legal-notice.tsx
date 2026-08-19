import { AlertIcon } from '~/components/icons'

/**
 * Sits at the top of the Terms and Privacy pages.
 *
 * These documents are drafted to match what the system actually does, but they
 * are not legal advice and they carry unfilled placeholders for the operating
 * entity, jurisdiction and contact details. Saying so on the page is more honest
 * than shipping a document that reads as finished when it is not.
 */
export function LegalNotice() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-[var(--radius-panel)] border border-clay-rule bg-clay-tint px-4 py-3">
      <span className="mt-0.5 shrink-0 text-clay">
        <AlertIcon size={18} />
      </span>
      <p className="text-[0.8125rem] leading-6 text-ink-muted">
        <strong className="font-semibold text-ink">Draft pending legal review.</strong> This document
        describes how Cowri actually behaves today, but the passages in square brackets still need
        the operating entity, jurisdiction and contact details filled in, and the whole text should
        be reviewed by a qualified lawyer before the service is offered publicly.
      </p>
    </div>
  )
}
