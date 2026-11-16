"use client";

import { t } from "@tuja/i18n";
import { Section } from "@tuja/ui/components/section";
import { dayNavLegs } from "#src/reader/day-feed/build-day-feed.ts";
import type { Day } from "#src/trips/types.ts";
import { mapsEmbedEnabled, MAX_ROUTE_WAYPOINTS } from "./constants.ts";
import { dayRouteMode } from "./day-route-mode.ts";
import { dayRoutePoints } from "./day-route-points.ts";
import { googleMapsEmbedDirectionsUrl } from "./google-maps-embed-directions-url.ts";
import { MapEmbed } from "./map-embed.tsx";

/** The route of the whole day as one map, with the day's legs chained. */
function dayRouteSrc(day: Day) {
  const legs = dayNavLegs(day);
  if (!mapsEmbedEnabled || legs.length === 0) return null;

  const points = dayRoutePoints(legs);
  const [origin] = points;
  const destination = points.at(-1);
  if (!origin || !destination) return null;

  const waypoints = points.slice(1, -1).slice(0, MAX_ROUTE_WAYPOINTS);
  // A round-trip day (origin === destination, e.g. Inverness ↔ Speyside) still
  // draws as a meaningful loop via its waypoints; only skip when there is
  // genuinely nothing to route between.
  if (origin === destination && waypoints.length === 0) return null;

  return googleMapsEmbedDirectionsUrl({
    origin,
    destination,
    waypoints,
    mode: dayRouteMode(legs),
  });
}

/**
 * A map of the whole day in the day's main way to travel. It shows the shape
 * of the day; the map of each leg shows its exact route. Nothing shows when no
 * key is set or the day has too few stops.
 */
export function DayMap({ day }: { day: Day }) {
  const title = t({ en: "Route", zh: "本日路线" });
  const src = dayRouteSrc(day);
  if (!src) return null;
  return (
    <Section title={title} look="label">
      <MapEmbed src={src} title={`${day.title} · ${title}`} />
    </Section>
  );
}
