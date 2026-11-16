"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import type { Trip } from "#src/trips/types.ts";
import { dayDateLabel } from "./date-label.ts";
import { dayRestaurants } from "./day-feed/build-day-feed.ts";
import { DayParty } from "./day-party.tsx";
import { presencesOnDay } from "./presences-on-day.ts";
import { TripText } from "./trip-text.tsx";

/** Every day of the trip on one list, each a way into that day. */
export function Overview({
  trip,
  todayIndex,
  onOpenDay,
}: {
  trip: Trip;
  todayIndex: number;
  onOpenDay: (index: number) => void;
}) {
  const locale = useLocale();
  const today = t({ en: "Today", zh: "今天" });
  const bookedAt = t({ en: "Booked: {name}", zh: "已订 · {name}" });

  return (
    <List>
      {trip.days.map((day, index) => {
        const booked = dayRestaurants(day).find((r) => r.status === "booked");
        const facts = [
          day.driving ? <TripText key="driving">{day.driving}</TripText> : null,
          <TripText key="stay">{day.stay.summary}</TripText>,
          booked ? (
            <TripText key="booked">
              {bookedAt.replace("{name}", booked.name)}
            </TripText>
          ) : null,
        ].filter(Boolean);
        return (
          <ListRow
            key={day.id}
            leading={
              <Text as="span" weight="semibold">
                {index}
              </Text>
            }
            leadingShape="square"
            wrap
            detail={
              <MetaLine
                facts={[
                  dayDateLabel(day.date, locale),
                  <TripText key="route">{day.route}</TripText>,
                ]}
              />
            }
            extra={
              <>
                <MetaLine facts={facts} />
                <DayParty
                  people={presencesOnDay(trip.people, day.id)}
                  compact
                />
              </>
            }
            trailing={
              index === todayIndex ? (
                <Badge size="sm">{today}</Badge>
              ) : undefined
            }
            onClick={() => {
              onOpenDay(index);
            }}
          >
            <TripText>{day.title}</TripText>
          </ListRow>
        );
      })}
    </List>
  );
}
