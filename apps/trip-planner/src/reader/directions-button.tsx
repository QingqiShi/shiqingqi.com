"use client";

import { NavigationArrowIcon } from "@phosphor-icons/react/dist/ssr/NavigationArrow";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import type { TravelMode } from "#src/trips/types.ts";
import { googleMapsDirectionsUrl } from "./maps/google-maps-directions-url.ts";
import { useNewTabLabel } from "./use-new-tab-label.ts";

/** An icon button that opens directions to a place in Google Maps. */
export function DirectionsButton({
  destination,
  mode,
}: {
  destination: string;
  mode?: TravelMode;
}) {
  return (
    <Button
      href={googleMapsDirectionsUrl({ destination, mode })}
      target="_blank"
      rel="noreferrer noopener"
      look="ghost"
      size="sm"
      icon={<NavigationArrowIcon weight="bold" />}
      aria-label={`${t({ en: "Directions", zh: "导航前往" })} ${useNewTabLabel()}`}
    />
  );
}
