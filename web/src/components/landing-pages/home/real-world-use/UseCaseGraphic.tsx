const USE_CASE_IMAGE_URL = "/smiling-african-woman.jpg";

export function UseCaseGraphic() {
  return (
    <div className="relative max-w-md w-full">
      {/* Top-Left Arch / Ring Accent */}
      <div className="absolute -top-10 -left-12 w-32 h-32 md:w-44 md:h-44 rounded-full bg-accent-tint/60 z-0 pointer-events-none" />

      {/* Main Image Element */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-rule bg-paper-sunken">
        <img
          src={USE_CASE_IMAGE_URL}
          alt="Cowri Savings Circle Story"
          className="w-full h-auto object-cover max-h-[420px]"
        />
      </div>

      {/* Bottom-Right Dot Matrix Overlay */}
      <div className="absolute -bottom-10 -right-12 w-40 h-24 opacity-40 z-10 pointer-events-none">
        <svg
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <pattern
            id="dot-pattern"
            x="0"
            y="0"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="2"
              fill="currentColor"
              className="text-accent"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        </svg>
      </div>
    </div>
  );
}
