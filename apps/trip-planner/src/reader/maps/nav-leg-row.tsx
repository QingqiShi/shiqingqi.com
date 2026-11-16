"use client";

import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/ssr/MapTrifold";
import { PersonSimpleWalkIcon } from "@phosphor-icons/react/dist/ssr/PersonSimpleWalk";
import { TrainSimpleIcon } from "@phosphor-icons/react/dist/ssr/TrainSimple";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { ListRow } from "@tuja/ui/components/list-row";
import type { ReactNode } from "react";
import { useState } from "react";
import { ExternalLinkIndicator } from "#src/reader/external-link-indicator.tsx";
import { ExternalRowLink } from "#src/reader/external-row-link.tsx";
import { TripText } from "#src/reader/trip-text.tsx";
import type { TravelMode } from "#src/trips/types.ts";
import type { NavLeg } from "#src/trips/types.ts";
import { mapsEmbedEnabled } from "./constants.ts";
import { googleMapsDirectionsUrl } from "./google-maps-directions-url.ts";
import { googleMapsEmbedDirectionsUrl } from "./google-maps-embed-directions-url.ts";
import { googleMapsEmbedPlaceUrl } from "./google-maps-embed-place-url.ts";
import { MapEmbed } from "./map-embed.tsx";

/**
 * The Embed API needs a concrete origin, so legs starting from the device's
 * current location preview the destination as a place instead of a route.
 */
function legEmbedSrc(leg: NavLeg) {
  // Keep the embed preview in sync with the deep-link: both route through the
  // leg's waypoints, so the inline map and the directions link open the same
  // route. (Every waypoint must be a name the Maps geocoder resolves, or the
  // embed route fails to render.)
  return leg.from
    ? googleMapsEmbedDirectionsUrl({
        origin: leg.from,
        destination: leg.to,
        waypoints: leg.waypoints,
        mode: leg.mode,
      })
    : googleMapsEmbedPlaceUrl(leg.to);
}

/** One leg of the day as a row of a `List`: it opens the directions in Google
 *  Maps, and can show the route on a map in place. */
export function NavLegRow({ leg }: { leg: NavLeg }) {
  const [mapOpen, setMapOpen] = useState(false);
  const mapLabel = t({ en: "Map", zh: "地图" });
  const mapTitle = t({ en: "Route map", zh: "路线地图" });

  return (
    <ListRow
      href={googleMapsDirectionsUrl({
        origin: leg.from,
        destination: leg.to,
        waypoints: leg.waypoints,
        mode: leg.mode,
      })}
      linkComponent={ExternalRowLink}
      leading={travelModeIcon[leg.mode ?? "driving"]}
      leadingShape="circle"
      detail={leg.note ? <TripText>{leg.note}</TripText> : undefined}
      extra={
        leg.waypoints && leg.waypoints.length > 0 ? (
          <TripText>{leg.waypoints.join(" · ")}</TripText>
        ) : undefined
      }
      trailing={<ExternalLinkIndicator />}
      caret={false}
      wrap
      actions={
        mapsEmbedEnabled ? (
          <Button
            look="ghost"
            size="sm"
            icon={<MapTrifoldIcon weight="bold" />}
            aria-pressed={mapOpen}
            onClick={() => {
              setMapOpen((open) => !open);
            }}
          >
            {mapLabel}
          </Button>
        ) : undefined
      }
      below={
        mapOpen ? (
          <MapEmbed
            src={legEmbedSrc(leg)}
            title={`${leg.label} · ${mapTitle}`}
          />
        ) : undefined
      }
    >
      <TripText>{leg.label}</TripText>
    </ListRow>
  );
}

const travelModeIcon: Record<TravelMode, ReactNode> = {
  driving: <CarIcon weight="bold" />,
  transit: <TrainSimpleIcon weight="bold" />,
  walking: <PersonSimpleWalkIcon weight="bold" />,
};
