import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { ArrowIcon, WalletIcon } from "~/components/icons";

export function CashLinkCard() {
  return (
    <div className="panel flex flex-col h-full rounded-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-tint rounded-full">
            <WalletIcon size={20} className="text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-ink">
            Send & receive with Cowri Cash Links
          </h3>
        </div>

        <p className="text-ink-muted leading-relaxed mb-6">
          Send funds with a simple link. Share via text or WhatsApp and claim
          instantly with zero delays or hidden fees.
        </p>

        <Link to="/register">
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto rounded-full"
            trailing={<ArrowIcon size={18} />}
          >
            Send a Cash Link
          </Button>
        </Link>
      </div>

      <div className="relative border-t border-rule bg-paper p-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-paper-raised border border-rule p-4 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-accent-tint flex items-center justify-center">
                <WalletIcon size={18} className="text-accent" />
              </div>
              <div>
                <p className="font-medium text-ink">Cowri Cash Link</p>
                <p className="text-xs text-ink-muted">Via WhatsApp</p>
              </div>
            </div>

            <div className="bg-paper border border-rule rounded-full py-2 px-3 mb-4">
              <p className="text-sm text-ink-muted break-all ">
                cowri.app/claim/7x9k2m
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full rounded-full"
              trailing={<ArrowIcon size={16} />}
            >
              Claim ₦10,000
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
