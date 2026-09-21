const MAP_IMAGE_URL = "/africa-map.png";

const floatingBadges = [
  { from: "NGN", to: "KES", icon: "🇳🇬→🇰🇪" },
  { from: "USD", to: "NGN", icon: "🇺🇸→🇳🇬" },
  { from: "GHS", to: "NGN", icon: "🇬🇭→🇳🇬" },
];

export function GlobalReachHeader() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12 lg:mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-ink">
          Global reach, local touch
        </h2>
        <p className="mt-4 text-lg sm:text-xl text-ink-muted max-w-2xl mx-auto">
          Send money across Nigeria and beyond with a local feel.
        </p>
      </div>

      <div className="relative">
        <div className="rounded-[var(--radius-panel)] overflow-hidden">
          <img
            src={MAP_IMAGE_URL}
            alt="Africa Transaction Map"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>

        <div className="absolute inset-0 pointer-events-none">
          {floatingBadges.map((badge, index) => (
            <div
              key={badge.from}
              className="absolute pointer-events-auto"
              style={{
                top: `${15 + index * 22}%`,
                left: `${25 + index * 18}%`,
              }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper-raised border border-rule rounded-[var(--radius-pill)] text-xs font-medium text-ink shadow-sm">
                {badge.icon}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
