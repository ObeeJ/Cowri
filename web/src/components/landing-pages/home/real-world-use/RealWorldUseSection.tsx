import { UseCaseContent } from "./UseCaseContent";
import { UseCaseGraphic } from "./UseCaseGraphic";

export function RealWorldUseSection() {
  return (
    <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28 bg-paper-raised">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:gap-12 lg:items-center">
        <div className="w-full lg:w-1/2 flex justify-center">
          <UseCaseGraphic />
        </div>
        <div className="w-full lg:w-1/2 lg:pl-6">
          <UseCaseContent />
        </div>
      </div>
    </section>
  );
}
