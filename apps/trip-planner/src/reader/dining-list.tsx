"use client";

import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { GlobeIcon } from "@phosphor-icons/react/dist/ssr/Globe";
import { NavigationArrowIcon } from "@phosphor-icons/react/dist/ssr/NavigationArrow";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Booking, Restaurant } from "#src/trips/types.ts";
import { webLink } from "#src/trips/web-link.ts";
import { ExternalButton } from "./external-button.tsx";
import { ExternalLinkIndicator } from "./external-link-indicator.tsx";
import { ExternalRowLink } from "./external-row-link.tsx";
import { googleMapsDirectionsUrl } from "./maps/google-maps-directions-url.ts";
import { googleMapsUrl } from "./maps/google-maps-url.ts";
import { useItemChangeButton } from "./quick-edit/use-item-change-button.tsx";
import { TripText } from "./trip-text.tsx";

function BookingCallout({
  booking,
  query,
}: {
  booking: Booking;
  query: string;
}) {
  const by = t({ en: "Booked by {name}", zh: "预订人 {name}" });
  const when = [booking.date, booking.time].filter(Boolean).join(" ");
  const lines = [when, booking.party].filter(Boolean);
  const meta = [
    booking.by ? by.replace("{name}", booking.by) : null,
    booking.contact,
    booking.note,
  ].filter(Boolean);

  return (
    <Callout
      intent="success"
      title={
        lines.length > 0 ? <TripText>{lines.join(" · ")}</TripText> : undefined
      }
      action={
        <ExternalButton
          href={googleMapsDirectionsUrl({
            destination: query,
            mode: "transit",
          })}
          look="outline"
          icon={<NavigationArrowIcon weight="bold" />}
        >
          {t({ en: "Directions", zh: "导航前往" })}
        </ExternalButton>
      }
    >
      {meta.length > 0 ? <TripText>{meta.join(" · ")}</TripText> : null}
    </Callout>
  );
}

type DayRestaurant = Restaurant & { id: string };

function RestaurantRow({ restaurant }: { restaurant: DayRestaurant }) {
  const changeButton = useItemChangeButton(restaurant.id, restaurant.name);
  const michelin = {
    1: t({ en: "1 Michelin star", zh: "米其林一星" }),
    2: t({ en: "2 Michelin stars", zh: "米其林二星" }),
    3: t({ en: "3 Michelin stars", zh: "米其林三星" }),
  };
  const booked = t({ en: "Booked", zh: "已预订" });
  const pick = t({ en: "First choice", zh: "首选" });
  const menu = t({ en: "Menu", zh: "菜单" });
  const website = t({ en: "Website", zh: "官网" });
  const menuUrl =
    restaurant.menu && webLink.is(restaurant.menu) ? restaurant.menu : null;
  const websiteUrl =
    restaurant.website && webLink.is(restaurant.website)
      ? restaurant.website
      : null;
  const links = restaurant.menu || restaurant.website;

  return (
    <ListRow
      href={googleMapsUrl(restaurant.query)}
      linkComponent={ExternalRowLink}
      leading={<ForkKnifeIcon weight="bold" />}
      leadingShape="circle"
      wrap
      caret={false}
      trailing={
        <>
          {restaurant.status === "booked" ? (
            <Badge size="sm" intent="success">
              {booked}
            </Badge>
          ) : null}
          {restaurant.status === "pick" ? (
            <Badge size="sm" intent="primary">
              {pick}
            </Badge>
          ) : null}
          <ExternalLinkIndicator />
        </>
      }
      actions={changeButton}
      detail={
        restaurant.description ? (
          <TripText>{restaurant.description}</TripText>
        ) : undefined
      }
      extra={
        <MetaLine
          facts={[
            restaurant.area ? (
              <TripText key="area">{restaurant.area}</TripText>
            ) : null,
            restaurant.tag ? (
              <TripText key="tag">{restaurant.tag}</TripText>
            ) : null,
            restaurant.michelin ? michelin[restaurant.michelin] : null,
            restaurant.price ? (
              <TripText key="price">{restaurant.price}</TripText>
            ) : null,
          ].filter(Boolean)}
        />
      }
      below={
        restaurant.booking || links ? (
          <>
            {restaurant.booking ? (
              <BookingCallout
                booking={restaurant.booking}
                query={restaurant.query}
              />
            ) : null}
            {links ? (
              <div css={cluster.tight}>
                {menuUrl ? (
                  <ExternalButton
                    href={menuUrl}
                    look="ghost"
                    icon={<BookOpenIcon weight="bold" />}
                  >
                    {menu}
                  </ExternalButton>
                ) : restaurant.menu ? (
                  <Text tone="muted">
                    <TripText>{restaurant.menu}</TripText>
                  </Text>
                ) : null}
                {websiteUrl ? (
                  <ExternalButton
                    href={websiteUrl}
                    look="ghost"
                    icon={<GlobeIcon weight="bold" />}
                  >
                    {website}
                  </ExternalButton>
                ) : restaurant.website ? (
                  <Text tone="muted">
                    <TripText>{restaurant.website}</TripText>
                  </Text>
                ) : null}
              </div>
            ) : null}
          </>
        ) : undefined
      }
    >
      <TripText>{restaurant.name}</TripText>
    </ListRow>
  );
}

/** Places to eat: the booked or first-choice ones first, then the others. */
export function DiningList({ restaurants }: { restaurants: DayRestaurant[] }) {
  const featured = restaurants.filter((r) => r.status);
  const others = restaurants.filter((r) => !r.status);
  const othersLabel = t({ en: "Other options", zh: "其他选择" });

  return (
    <div css={stack.item}>
      {featured.length > 0 ? (
        <List>
          {featured.map((r) => (
            <RestaurantRow key={r.id} restaurant={r} />
          ))}
        </List>
      ) : null}
      {others.length > 0 && featured.length > 0 ? (
        <Text look="label" tone="muted">
          {othersLabel}
        </Text>
      ) : null}
      {others.length > 0 ? (
        <List>
          {others.map((r) => (
            <RestaurantRow key={r.id} restaurant={r} />
          ))}
        </List>
      ) : null}
    </div>
  );
}
