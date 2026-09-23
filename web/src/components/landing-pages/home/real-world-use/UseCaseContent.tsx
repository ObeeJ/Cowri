import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { ArrowIcon } from "~/components/icons";

export function UseCaseContent() {
  return (
    <div className="flex flex-col justify-center lg:pl-8">
      <p className="label-caps text-accent">REAL-WORLD SAVINGS</p>

      <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-ink">
        Amina and her 3 friends needed to save ₦1,000,000 for a group project.
      </h2>

      <p className="mt-6 text-lg leading-relaxed text-ink-muted">
        They created a Cowri savings circle, contributed monthly on a
        transparent ledger, and collected payouts with zero hassle. No missed
        payments, no awkward reminders, just a fair system that worked for
        everyone.
      </p>

      <div className="mt-5 pt-8">
        {/* <p className="text-lg leading-8 text-ink">
          Set up your wallet in a couple of minutes.
        </p> */}
        <div>
          <Link to="/register">
            <Button
              variant="primary"
              size="sm"
              trailing={<ArrowIcon size={18} />}
              className="rounded-full"
            >
              Create savings circle
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
