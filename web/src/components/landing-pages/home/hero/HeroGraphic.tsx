const HERO_IMAGE_URL = "/cowri-hero.webp";

export function HeroGraphic() {
  return (
    <div className="flex items-center justify-center w-full overflow-hidden rounded-[var(--radius-panel)]">
      <img
        src={HERO_IMAGE_URL}
        alt="Cowri App Preview"
        className="w-full h-auto max-h-[500px] object-contain mx-auto"
      />
    </div>
  );
}
