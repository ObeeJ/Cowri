import { type ComponentType } from "react";
import { cn } from "~/lib/cn";

interface ValuePillarCardProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

export function ValuePillarCard({
  icon: Icon,
  title,
  description,
}: ValuePillarCardProps) {
  return (
    <div
      className={cn(
        "p-6 lg:p-8 rounded-2xl border border-rule bg-paper-raised",
        "flex flex-col items-start",
      )}
    >
      <div
        className={cn(
          "size-12 rounded-full flex items-center justify-center mb-6",
          "bg-accent-tint text-accent",
        )}
      >
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-semibold text-ink mb-3">{title}</h3>
      <p className="text-ink-muted leading-relaxed text-sm">{description}</p>
    </div>
  );
}
