"use client";

import type { LucideIcon } from "lucide-react";
import {
  Car,
  ChevronDown,
  Footprints,
  MapPin,
  Navigation,
  TrainFront,
} from "lucide-react";
import { useId, useState } from "react";
import { MapEmbed } from "./map-embed";
import type { NavLeg, TravelMode } from "@/data/types";
import {
  googleMapsDirectionsUrl,
  googleMapsEmbedDirectionsUrl,
  googleMapsEmbedPlaceUrl,
  mapsEmbedEnabled,
} from "@/lib/maps";
import { cn } from "@/lib/utils";

const modeIcon: Record<TravelMode, LucideIcon> = {
  driving: Car,
  transit: TrainFront,
  walking: Footprints,
};

/**
 * The Embed API needs a concrete origin, so legs starting from the device's
 * current location preview the destination as a place instead of a route.
 */
function legEmbedSrc(leg: NavLeg) {
  // Keep the embed preview in sync with the deep-link: both route through the
  // leg's waypoints, so the inline map and the 导航 link open the same route.
  // (Every waypoint must be a name the Maps geocoder resolves, or the embed
  // route fails to render.)
  return leg.from
    ? googleMapsEmbedDirectionsUrl({
        origin: leg.from,
        destination: leg.to,
        waypoints: leg.waypoints,
        mode: leg.mode,
      })
    : googleMapsEmbedPlaceUrl(leg.to);
}

/** One nav leg: a deep-link to directions plus an optional inline map preview. */
export function NavLegRow({ leg }: { leg: NavLeg }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Icon = modeIcon[leg.mode ?? "driving"];

  return (
    <li className="overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/30">
      <div className="flex items-center gap-3 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <a
          href={googleMapsDirectionsUrl({
            origin: leg.from,
            destination: leg.to,
            waypoints: leg.waypoints,
            mode: leg.mode,
          })}
          target="_blank"
          rel="noreferrer noopener"
          className="group min-w-0 flex-1"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {leg.label}
            <Navigation className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </span>
          {leg.note ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {leg.note}
            </span>
          ) : null}
          {leg.waypoints && leg.waypoints.length > 0 ? (
            <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {leg.waypoints.join(" · ")}
            </span>
          ) : null}
        </a>
        {mapsEmbedEnabled ? (
          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value);
            }}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex shrink-0 items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            地图
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} className="border-t p-3">
          <MapEmbed src={legEmbedSrc(leg)} title={`${leg.label} · 路线地图`} />
        </div>
      ) : null}
    </li>
  );
}
