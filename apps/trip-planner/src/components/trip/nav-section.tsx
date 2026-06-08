import type { LucideIcon } from "lucide-react";
import { Car, Footprints, Navigation, TrainFront } from "lucide-react";
import { Section } from "./section";
import type { NavLeg, TravelMode } from "@/data/itinerary";
import { googleMapsDirectionsUrl } from "@/lib/maps";

const modeIcon: Record<TravelMode, LucideIcon> = {
  driving: Car,
  transit: TrainFront,
  walking: Footprints,
};

/** One-tap navigation legs for the day. Each row opens Google Maps directions
 *  with the route preloaded. Answers "how do I get there". */
export function NavSection({ legs }: { legs: NavLeg[] }) {
  return (
    <Section icon={Navigation} title="导航">
      <ul className="space-y-2">
        {legs.map((leg) => {
          const Icon = modeIcon[leg.mode ?? "driving"];
          return (
            <li key={leg.label}>
              <a
                href={googleMapsDirectionsUrl({
                  origin: leg.from,
                  destination: leg.to,
                  waypoints: leg.via,
                  mode: leg.mode,
                })}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/30 hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{leg.label}</span>
                  {leg.note ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {leg.note}
                    </span>
                  ) : null}
                </span>
                <Navigation className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
