import { Map as MapIcon } from "lucide-react";
import { MapEmbed } from "./map-embed";
import { Section } from "./section";
import type { Day } from "@/data/itinerary";
import {
  dayRouteMode,
  dayRoutePoints,
  googleMapsEmbedDirectionsUrl,
  mapsEmbedEnabled,
  MAX_ROUTE_WAYPOINTS,
} from "@/lib/maps";

/**
 * An at-a-glance map of the whole day, chaining the nav legs into one route.
 * Drawn in the day's travel mode (driving for road-trip days, walking for
 * no-car city days) — it frames the shape of the day, while the per-leg maps
 * below carry the exact mode for each hop. Renders nothing when no key is
 * configured or the day has too few stops to draw a route.
 */
export function DayMap({ day }: { day: Day }) {
  if (!mapsEmbedEnabled || !day.nav || day.nav.length === 0) return null;

  const points = dayRoutePoints(day.nav);
  const [origin] = points;
  const destination = points.at(-1);
  if (!origin || !destination) return null;

  const waypoints = points.slice(1, -1).slice(0, MAX_ROUTE_WAYPOINTS);
  // A round-trip day (origin === destination, e.g. Inverness ↔ Speyside) still
  // draws as a meaningful loop via its waypoints; only skip when there is
  // genuinely nothing to route between.
  if (origin === destination && waypoints.length === 0) return null;

  const src = googleMapsEmbedDirectionsUrl({
    origin,
    destination,
    waypoints,
    mode: dayRouteMode(day.nav),
  });

  return (
    <Section icon={MapIcon} title="本日路线">
      <MapEmbed src={src} title={`${day.title} · 本日路线地图`} />
    </Section>
  );
}
