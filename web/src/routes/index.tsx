import { Link, createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "~/components/layout/marketing-shell";
import { Hero } from "~/components/landing-pages/home/hero";
import { GlobalReachSection } from "~/components/landing-pages/home/global-reach";
import { Button } from "~/components/ui/button";
import {
  CircleGroupIcon,
  ReceiptIcon,
  SplitIcon,
  WalletIcon,
} from "~/components/icons";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  {
    icon: CircleGroupIcon,
    label: "Savings circles",
    caption: "Contribute on a schedule, take turns collecting",
  },
  {
    icon: SplitIcon,
    label: "Split payments",
    caption: "Fair shares, settled from your wallet",
  },
  {
    icon: WalletIcon,
    label: "One wallet",
    caption: "Fund once, use it everywhere",
  },
  {
    icon: ReceiptIcon,
    label: "A ledger you can check",
    caption: "Every entry accounted for",
  },
];

function HomePage() {
  return (
    <MarketingShell>
      <Hero />

      {/* What Cowri does, named plainly, without explaining how. The how lives
          on its own page for anyone who wants it. */}
      <section className=" bg-paper-raised">
        <div className="mt-16 mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-4 md:gap-x-8">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center text-center"
            >
              <feature.icon size={24} className="text-accent" />
              <p className="mt-3 text-sm font-semibold text-ink">
                {feature.label}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-5 text-ink-muted">
                {feature.caption}
              </p>
            </div>
          ))}
        </div>
      </section>

      <GlobalReachSection />

      {/* One line, one button. No second sales pitch. */}
      <section className="px-4 py-14 sm:px-6 bg-paper-raised">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <p className="text-lg leading-8 text-ink">
            Set up your wallet in a couple of minutes.
          </p>
          <Link to="/register">
            <Button variant="primary" size="lg">
              Create your account
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
