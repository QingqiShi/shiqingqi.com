"use client";

import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { MapPlace, PlaceTier } from "#src/trips/types.ts";
import { DirectionsButton } from "./directions-button.tsx";
import { ExternalLinkIndicator } from "./external-link-indicator.tsx";
import { ExternalRowLink } from "./external-row-link.tsx";
import { googleMapsUrl } from "./maps/google-maps-url.ts";
import { TripText } from "./trip-text.tsx";

const TIER_ORDER: PlaceTier[] = ["primary", "backup", "fallback"];

function PlaceRow({
  place,
  directions,
}: {
  place: MapPlace;
  directions: boolean;
}) {
  return (
    <ListRow
      href={googleMapsUrl(place.query)}
      linkComponent={ExternalRowLink}
      leading={<MapPinIcon weight="bold" />}
      leadingShape="circle"
      detail={place.note ? <TripText>{place.note}</TripText> : undefined}
      trailing={
        place.when ? (
          <Badge size="sm" intent="neutral">
            <TripText>{place.when}</TripText>
          </Badge>
        ) : (
          <ExternalLinkIndicator />
        )
      }
      caret={false}
      wrap
      actions={
        directions ? <DirectionsButton destination={place.query} /> : undefined
      }
    >
      <TripText>{place.name}</TripText>
    </ListRow>
  );
}

/** Loose places to go, as rows that open Google Maps. */
export function PlaceRows({ places }: { places: MapPlace[] }) {
  return (
    <List>
      {places.map((place) => (
        <PlaceRow key={place.name} place={place} directions={false} />
      ))}
    </List>
  );
}

/**
 * The day's places. When one of them has a `tier`, the list reads as plan A,
 * B and C, with the condition of each as a badge. Otherwise it is one list.
 */
export function PlaceList({ places }: { places: MapPlace[] }) {
  const tierLabel: Record<PlaceTier, string> = {
    primary: t({ en: "First choice", zh: "首选" }),
    backup: t({ en: "Backup", zh: "备选" }),
    fallback: t({ en: "Fallback", zh: "兜底" }),
  };

  if (!places.some((place) => place.tier)) {
    return <PlaceRows places={places} />;
  }

  const groups = TIER_ORDER.map((tier) => ({
    tier,
    places: places.filter((place) => place.tier === tier),
  })).filter((group) => group.places.length > 0);
  const loose = places.filter((place) => !place.tier);

  return (
    <div css={stack.group}>
      {groups.map((group) => (
        <div key={group.tier} css={stack.tight}>
          <Text look="label" tone="muted">
            {tierLabel[group.tier]}
          </Text>
          <List>
            {group.places.map((place) => (
              <PlaceRow key={place.name} place={place} directions />
            ))}
          </List>
        </div>
      ))}
      {loose.length > 0 ? <PlaceRows places={loose} /> : null}
    </div>
  );
}
