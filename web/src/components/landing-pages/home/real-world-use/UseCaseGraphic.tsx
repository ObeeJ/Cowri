const USE_CASE_IMAGE_URL = "/smiling-african-woman.jpg";

export function UseCaseGraphic() {
  return (
    <div className="relative aspect-[4/5] lg:aspect-[3/4] overflow-hidden rounded-[var(--radius-panel)] border border-rule bg-paper-sunken">
      <img
        src={USE_CASE_IMAGE_URL}
        alt="Cowri Real World Savings Story"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
