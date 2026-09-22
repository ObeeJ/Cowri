import { ShellIcon } from '~/components/icons';

export function FooterBrandCol() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-2xl font-bold text-ink">
        <ShellIcon size={28} className="text-accent" />
        <span>Cowri</span>
      </div>
      <p className="text-sm text-ink-muted leading-relaxed max-w-xs">
        Spend less time organizing. Spend more time saving and splitting together with people you trust.
      </p>
    </div>
  );
}