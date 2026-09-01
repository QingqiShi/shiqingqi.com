import { Navigation } from "lucide-react";
import type { TravelMode } from "@/data/types";
import { googleMapsDirectionsUrl } from "@/lib/maps/google-maps-directions-url";
import { cn } from "@/lib/utils";

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
