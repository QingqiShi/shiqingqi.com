import { MapPin } from "lucide-react";
import type { MapPlace } from "@/data/types";
import { googleMapsUrl } from "@/lib/maps/google-maps-url";

/** A pill linking a place to Google Maps. */
export function PlacePill({ place }: { place: MapPlace }) {
  return (
    <a
      href={googleMapsUrl(place.query)}
      target="_blank"
      rel="noreferrer noopener"
      className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-foreground/30 hover:bg-accent"
    >
      <MapPin className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
      <span>{place.name}</span>
      {place.note ? (
        <span className="text-xs text-muted-foreground">· {place.note}</span>
      ) : null}
    </a>
  );
}
