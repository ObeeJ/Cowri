export function FooterWatermark() {
  return (
    <div
      aria-hidden="true"
      className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none opacity-[0.05] text-ink text-[12rem] sm:text-[18rem] md:text-[22rem] font-extrabold tracking-tighter leading-none z-0 whitespace-nowrap"
    >
      Cowri
    </div>
  );
}