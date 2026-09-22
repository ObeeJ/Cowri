import { ArrowIcon, ShieldIcon } from "~/components/icons";

export function FeeBreakdownCard() {
  return (
    <div className="panel flex flex-col h-full rounded-xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-tint rounded-full">
            <ShieldIcon size={20} className="text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-ink">
            Fees so low, you barely notice
          </h3>
        </div>

        <p className="text-ink-muted leading-relaxed">
          Move your money without the burden of high charges. Send for less than
          a fraction of traditional transfer fees, backed by our double-entry
          ledger.
        </p>
      </div>

      <div className="border-t border-rule bg-paper p-6 flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="bg-paper-raised border border-rule rounded-3xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-rule bg-paper-sunken">
              <div className="size-10 rounded-full bg-accent-tint flex items-center justify-center">
                <ArrowIcon size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-ink-faint">Amount to send</p>
                <p className="font-semibold text-ink numeric">₦5,000.00</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Amount</span>
                <span className="font-medium text-ink numeric">
                  5,000.00 NGN
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Fee</span>
                <span className="font-medium text-ink numeric">10.00 NGN</span>
              </div>
              <div className="border-t border-rule pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-ink">Total amount</span>
                  <span className="text-ink numeric">5,010.00 NGN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
