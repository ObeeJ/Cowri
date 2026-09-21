import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "~/components/layout/marketing-shell";
import { Hero } from "~/components/landing-pages/home/hero";
import { ValuePillarsSection } from "~/components/landing-pages/home/value-pillars";
import { GlobalReachSection } from "~/components/landing-pages/home/global-reach";
import { RealWorldUseSection } from "~/components/landing-pages/home/real-world-use";
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

      <RealWorldUseSection />

      <ValuePillarsSection />
    </MarketingShell>
  );
}
