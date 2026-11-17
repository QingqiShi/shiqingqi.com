"use client";

import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Day, Trip } from "#src/trips/types.ts";
import { DayFacts } from "./day-facts.tsx";
import { DayFeed } from "./day-feed/day-feed.tsx";
import { momentDomId } from "./day-feed/moment-dom-id.ts";
import { DayGlance } from "./day-glance.tsx";
import { dayHighlights } from "./day-highlights.ts";
import { DayParty } from "./day-party.tsx";
import { DayTitle } from "./day-title.tsx";
import { DiningList } from "./dining-list.tsx";
import { DayMap } from "./maps/day-map.tsx";
import { PlaceList } from "./place-list.tsx";
import { presencesOnDay } from "./presences-on-day.ts";
import { StaySection } from "./stay-section.tsx";
import { TipCallout } from "./tip-callout.tsx";
import { TripText } from "./trip-text.tsx";
import type { LiveWeather } from "./weather/types.ts";

/** One day of the trip, from its figures and fixed times down to the bed. */
export function DayView({
  tripId,
  trip,
  day,
  liveWeather,
  onOpenDay,
}: {
  tripId: string;
  trip: Trip;
  day: Day;
  liveWeather: LiveWeather | undefined;
  onOpenDay: (index: number) => void;
}) {
  const highlights = dayHighlights(day);
  const sameAsDayId = day.stay.sameAs?.dayId;
  const sameAsIndex = sameAsDayId
    ? trip.days.findIndex((other) => other.id === sameAsDayId)
    : -1;

  const jumpToMoment = (momentId: string) => {
    document
      .getElementById(momentDomId(momentId))
      ?.scrollIntoView({ block: "start" });
  };

  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <Heading level={2} look="h2">
          <DayTitle day={day} index={trip.days.indexOf(day)} />
        </Heading>
        {day.route ? (
          <Text tone="muted">
            <TripText>{day.route}</TripText>
          </Text>
        ) : null}
      </div>
      <DayParty people={presencesOnDay(trip.people, day.id)} />
      <DayFacts day={day} liveWeather={liveWeather} />
      {highlights.length > 0 ? (
        <DayGlance highlights={highlights} onJump={jumpToMoment} />
      ) : null}
      {day.tips.length > 0 ? (
        <Section title={t({ en: "Good to know", zh: "今日须知" })} look="label">
          <div css={stack.tight}>
            {day.tips.map((tip) => (
              <TipCallout key={tip.id} tip={tip} />
            ))}
          </div>
        </Section>
      ) : null}
      <DayMap day={day} />
      <DayFeed tripId={tripId} day={day} />
      {day.dining.length > 0 ? (
        <Section
          title={t({ en: "Places to eat", zh: "餐饮选择" })}
          look="label"
        >
          <DiningList restaurants={day.dining} />
        </Section>
      ) : null}
      {day.places.length > 0 ? (
        <Section
          title={t({ en: "Places to go", zh: "想去的地方" })}
          look="label"
        >
          <PlaceList places={day.places} />
        </Section>
      ) : null}
      <StaySection
        stay={day.stay}
        sameAsDay={sameAsIndex < 0 ? null : sameAsIndex}
        onOpenDay={onOpenDay}
      />
    </div>
  );
}
