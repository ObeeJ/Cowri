import { GlobalReachHeader } from "./GlobalReachHeader";
import { GlobalReachFeatureCards } from "./GlobalReachFeatureCards";

export function GlobalReachSection() {
  return (
    <section className="py-16 lg:py-24">
      <GlobalReachHeader />
      <GlobalReachFeatureCards />
    </section>
  );
}
