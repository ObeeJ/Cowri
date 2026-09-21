import { UseCaseContent } from "./UseCaseContent";
import { UseCaseGraphic } from "./UseCaseGraphic";

export function RealWorldUseSection() {
  return (
    <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28 bg-paper-raised">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div>
          <UseCaseGraphic />
        </div>
        <div className="lg:pl-6">
          <UseCaseContent />
        </div>
      </div>
    </section>
  );
}
