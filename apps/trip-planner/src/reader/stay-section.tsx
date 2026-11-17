"use client";

import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Lodging, Stay } from "#src/trips/types.ts";
import { DAY_SECTION_IDS } from "./day-section-ids.ts";
import { ExternalButton } from "./external-button.tsx";
import { ExternalLinkIndicator } from "./external-link-indicator.tsx";
import { ExternalRowLink } from "./external-row-link.tsx";
import { googleMapsUrl } from "./maps/google-maps-url.ts";
import { TripText } from "./trip-text.tsx";

function StatusBadge({ lodging }: { lodging: Lodging }) {
  const booked = t({ en: "Booked", zh: "已预订" });
  const pending = t({ en: "To confirm", zh: "待定" });
  const recommended = t({ en: "Recommended", zh: "推荐" });
  const option = t({ en: "Option", zh: "备选" });
  if (lodging.status === "booked") {
    return (
      <Badge size="sm" intent="success">
        {booked}
      </Badge>
    );
  }
  if (lodging.status === "pending") {
    return (
      <Badge size="sm" intent="warning">
        {pending}
      </Badge>
    );
  }
  if (lodging.recommended) {
    return (
      <Badge size="sm" intent="primary">
        {recommended}
      </Badge>
    );
  }
  if (lodging.status === "option") {
    return (
      <Badge size="sm" intent="neutral">
        {option}
      </Badge>
    );
  }
  return null;
}

function LodgingRow({ lodging }: { lodging: Lodging }) {
  const checkIn = t({ en: "Check-in {time}", zh: "入住 {time}" });
  const checkOut = t({ en: "Check-out {time}", zh: "退房 {time}" });
  const room = t({ en: "Room: {room}", zh: "房型：{room}" });
  const phone = t({ en: "Phone {phone}", zh: "电话 {phone}" });
  const facts = [
    lodging.checkIn ? checkIn.replace("{time}", lodging.checkIn) : null,
    lodging.checkOut ? checkOut.replace("{time}", lodging.checkOut) : null,
    lodging.room ? room.replace("{room}", lodging.room) : null,
    lodging.phone ? phone.replace("{phone}", lodging.phone) : null,
  ].filter((fact) => fact !== null);
  const mapsQuery = lodging.query ?? lodging.address ?? lodging.name;

  const shared = {
    leading: <BedIcon weight="bold" />,
    leadingShape: "circle" as const,
    wrap: true,
    detail: lodging.address ? (
      <TripText>{lodging.address}</TripText>
    ) : undefined,
    extra:
      facts.length > 0 || lodging.note ? (
        <>
          {facts.length > 0 ? (
            <MetaLine
              facts={facts.map((fact) => (
                <TripText key={fact}>{fact}</TripText>
              ))}
            />
          ) : null}
          {lodging.note ? <TripText>{lodging.note}</TripText> : null}
        </>
      ) : undefined,
  };
  const name = <TripText>{lodging.name}</TripText>;

  return mapsQuery ? (
    <ListRow
      {...shared}
      trailing={
        <>
          <StatusBadge lodging={lodging} />
          <ExternalLinkIndicator />
        </>
      }
      caret={false}
      href={googleMapsUrl(mapsQuery)}
      linkComponent={ExternalRowLink}
    >
      {name}
    </ListRow>
  ) : (
    <ListRow {...shared} trailing={<StatusBadge lodging={lodging} />}>
      {name}
    </ListRow>
  );
}

/** Where the night is spent: the booked or possible places, or a link back to
 *  the day that has the same bed. */
export function StaySection({
  stay,
  sameAsDay,
  sameAsDetail,
  onOpenDay,
}: {
  stay: Stay;
  /** The index of the earlier day whose bed this night repeats. */
  sameAsDay: number | null;
  /** The words under the label of that night, for a label that does not name the earlier day. */
  sameAsDetail?: string;
  onOpenDay: (index: number) => void;
}) {
  const title = t({ en: "Stay", zh: "住宿" });
  const search = t({ en: "Search on Booking.com", zh: "在 Booking.com 搜索" });
  if (
    !stay.sameAs &&
    stay.lodging.length === 0 &&
    !stay.note &&
    !stay.bookingUrl
  ) {
    return null;
  }

  return (
    <Section
      id={DAY_SECTION_IDS.lodging}
      title={title}
      look="label"
      css={styles.section}
    >
      <div css={stack.item}>
        {stay.sameAs && sameAsDay !== null ? (
          <List>
            <ListRow
              leading={<BedIcon weight="bold" />}
              leadingShape="circle"
              wrap
              detail={sameAsDetail}
              onClick={() => {
                onOpenDay(sameAsDay);
              }}
            >
              <TripText>{stay.sameAs.label}</TripText>
            </ListRow>
          </List>
        ) : (
          <List>
            {stay.lodging.map((lodging) => (
              <LodgingRow key={lodging.id} lodging={lodging} />
            ))}
          </List>
        )}
        {stay.note ? (
          <Text tone="muted">
            <TripText>{stay.note}</TripText>
          </Text>
        ) : null}
        {stay.bookingUrl ? (
          <div>
            <ExternalButton
              href={stay.bookingUrl}
              look="outline"
              icon={<MagnifyingGlassIcon weight="bold" />}
            >
              {search}
            </ExternalButton>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

const styles = stylex.create({
  // A section that another screen opens the page at stops under the header.
  section: {
    scrollMarginBlockStart: "4rem",
  },
});
