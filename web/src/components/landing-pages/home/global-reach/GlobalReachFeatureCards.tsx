import { CashLinkCard } from './CashLinkCard'
import { FeeBreakdownCard } from './FeeBreakdownCard'

export function GlobalReachFeatureCards() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-12 lg:mt-16">
      <div className="grid gap-6 lg:grid-cols-2">
        <CashLinkCard />
        <FeeBreakdownCard />
      </div>
    </div>
  )
}