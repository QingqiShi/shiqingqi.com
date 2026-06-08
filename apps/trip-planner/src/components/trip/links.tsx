import { ExternalLink, MapPin, Navigation } from "lucide-react";
import type { ReactNode } from "react";
import type { MapPlace, TravelMode } from "@/data/itinerary";
import { googleMapsDirectionsUrl, googleMapsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";

/** A text link that opens the query in Google Maps. */
export function MapsLink({
  query,
  children,
  className,
}: {
  query: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={googleMapsUrl(query)}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex items-center gap-1 underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** An "官网" external link. */
export function WebLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3" />
      官网
    </a>
  );
}

/** A "菜单" external link. */
export function MenuLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3" />
      菜单
    </a>
  );
}

/** A compact "导航" chip that opens Google Maps directions to a destination. */
export function NavLink({
  to,
  from,
  mode = "driving",
  label = "导航",
  className,
}: {
  to: string;
  from?: string;
  mode?: TravelMode;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={googleMapsDirectionsUrl({
        origin: from,
        destination: to,
        mode,
      })}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-foreground/30 hover:bg-accent",
        className,
      )}
    >
      <Navigation className="size-3 shrink-0" />
      {label}
    </a>
  );
}

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
