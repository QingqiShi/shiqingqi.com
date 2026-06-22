import { MapsLink, PlacePill } from "./links";
import { Badge } from "@/components/ui/badge";
import type { MapPlace, PlaceTier } from "@/data/types";
import { cn } from "@/lib/utils";

const TIER_ORDER: PlaceTier[] = ["primary", "backup", "fallback"];

const TIER_LABEL: Record<PlaceTier, string> = {
  primary: "首选",
  backup: "备选",
  fallback: "兜底",
};

function PlaceCard({
  place,
  featured = false,
}: {
  place: MapPlace;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4",
        featured && "border-foreground/25 bg-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <MapsLink query={place.query} className="font-medium">
          {place.name}
        </MapsLink>
        {place.when ? (
          <Badge variant="outline" className="shrink-0">
            {place.when}
          </Badge>
        ) : null}
      </div>

      {place.note ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {place.note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The day's places. When at least one carries a `tier`, the list reads as a
 * Plan A/B/C ladder — grouped under 首选 / 备选 / 兜底 with each option as a
 * card and its `when` trigger as a chip. Otherwise it stays a flat pill list,
 * the right weight for a day that's just a handful of loose ideas.
 */
export function PlaceList({ places }: { places: MapPlace[] }) {
  const tiered = places.some((place) => place.tier);

  if (!tiered) {
    return (
      <div className="flex flex-wrap gap-2">
        {places.map((place) => (
          <PlacePill key={place.name} place={place} />
        ))}
      </div>
    );
  }

  const groups = TIER_ORDER.map((tier) => ({
    tier,
    places: places.filter((place) => place.tier === tier),
  })).filter((group) => group.places.length > 0);
  // Any untiered place on a tiered day still gets shown, after the ladder.
  const looseIdeas = places.filter((place) => !place.tier);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.tier}>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
            {TIER_LABEL[group.tier]}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.places.map((place) => (
              <PlaceCard
                key={place.name}
                place={place}
                featured={group.tier === "primary"}
              />
            ))}
          </div>
        </div>
      ))}

      {looseIdeas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {looseIdeas.map((place) => (
            <PlacePill key={place.name} place={place} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
