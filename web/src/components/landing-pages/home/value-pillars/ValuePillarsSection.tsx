import { CircleGroupIcon, SplitIcon, ShieldIcon } from '~/components/icons';
import { ValuePillarCard } from './ValuePillarCard';

const pillars = [
  {
    icon: CircleGroupIcon,
    title: 'Automated Savings Circles',
    description:
      'Pool funds with trusted peers on flexible weekly or monthly schedules. Access lump-sum payouts when you need them without high loan interest rates.',
  },
  {
    icon: SplitIcon,
    title: 'Seamless Bill Splitting',
    description:
      'Divide shared expenses, group dinners, and household bills easily. Settle fair shares directly from one unified wallet.',
  },
  {
    icon: ShieldIcon,
    title: 'Double-Entry Ledger',
    description:
      'Every single kobo is accounted for on an immutable double-entry ledger, giving you full visibility and peace of mind.',
  },
] as const;

export function ValuePillarsSection() {
  return (
    <section className="py-16 lg:py-24 bg-paper">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-ink mb-4">
            Save together. Share the burden.
          </h2>
          <p className="text-lg sm:text-xl text-ink-muted leading-relaxed">
            Experience effortless social finance built around trust, fair bill splitting, and
            full financial transparency.
          </p>
        </div>

        {/* 3-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar) => (
            <ValuePillarCard
              key={pillar.title}
              icon={pillar.icon}
              title={pillar.title}
              description={pillar.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}