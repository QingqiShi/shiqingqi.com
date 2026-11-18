"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Day, Trip } from "#src/trips/types.ts";
import { DayFacts } from "./day-facts.tsx";
import { buildDayFeed } from "./day-feed/build-day-feed.ts";
import { DayFeed } from "./day-feed/day-feed.tsx";
import { momentDomId } from "./day-feed/moment-dom-id.ts";
import { DayGlance } from "./day-glance.tsx";
import { dayHighlights } from "./day-highlights.ts";
import { DayParty } from "./day-party.tsx";
import { DAY_SECTION_IDS } from "./day-section-ids.ts";
import { DayTitle } from "./day-title.tsx";
import { DiningList } from "./dining-list.tsx";
import { DayMap } from "./maps/day-map.tsx";
import { PlaceList } from "./place-list.tsx";
import { presencesOnDay } from "./presences-on-day.ts";
import { useQuickEdit } from "./quick-edit/quick-edit-context.ts";
import { TripDetailsButton } from "./quick-edit/trip-details-button.tsx";
import { StaySection } from "./stay-section.tsx";
import { TipCallout } from "./tip-callout.tsx";
import { TripText } from "./trip-text.tsx";
import { useDayNumber } from "./use-day-number.ts";
import type { LiveWeather } from "./weather/types.ts";

const isTripEmpty = (trip: Trip) =>
  trip.days.every(
    (day) =>
      day.moments.length === 0 &&
      day.tips.length === 0 &&
      day.dining.length === 0 &&
      day.places.length === 0 &&
      day.stay.lodging.length === 0,
  );

/**
 * A day with no plan: it says so, and tells an editor of the trip how to
 * plan it. In a trip with nothing in it yet, it first offers the details of
 * the trip.
 */
function EmptyDay({ trip }: { trip: Trip }) {
  const canChange = useQuickEdit() !== null;
  const isNewTrip = canChange && isTripEmpty(trip);
  const planDescription = canChange
    ? t({
        en: "Ask the trip assistant to add times, places to go and places to eat.",
        zh: "让行程助手添加时间、去处和餐厅。",
      })
    : t({
        en: "The plan for this day is still to come.",
        zh: "这一天的行程还在计划中。",
      });
  return (
    <EmptyState
      icon={<CalendarBlankIcon weight="bold" />}
      title={t({ en: "Nothing planned yet", zh: "这一天还没有安排" })}
      description={
        isNewTrip
          ? t({
              en: "This trip is new. Check who travels and the time zone in its details, then ask the trip assistant to plan each day.",
              zh: "这是一个新行程。先在行程信息里核对同行的人和时区，再让行程助手安排每一天。",
            })
          : planDescription
      }
      action={
        isNewTrip ? (
          <TripDetailsButton look="primary" size="md">
            {t({ en: "Trip details", zh: "行程信息" })}
          </TripDetailsButton>
        ) : undefined
      }
    />
  );
}

/** One day of the trip, from its figures and fixed times down to the bed. */
export function DayView({
  tripId,
  trip,
  day,
  liveWeather,
  onOpenDay,
}: {
  tripId: string | null;
  trip: Trip;
  day: Day;
  liveWeather: LiveWeather | undefined;
  onOpenDay: (index: number) => void;
}) {
  const highlights = dayHighlights(day);
  const isEmpty =
    highlights.length === 0 &&
    day.tips.length === 0 &&
    day.dining.length === 0 &&
    day.places.length === 0 &&
    buildDayFeed(day).length === 0;
  const sameAsDayId = day.stay.sameAs?.dayId;
  const sameAsIndex = sameAsDayId
    ? trip.days.findIndex((other) => other.id === sameAsDayId)
    : -1;
  const dayNumber = useDayNumber(trip);
  const sameBed = t({ en: "Same bed as {day}", zh: "与{day}同住一处" });
  // A label that is only the name of the stay does not say which day has it.
  const isLabelTheName =
    sameAsIndex >= 0 &&
    trip.days[sameAsIndex].stay.lodging.some(
      (lodging) => lodging.name === day.stay.sameAs?.label,
    );

  const jumpToMoment = (momentId: string) => {
    document
      .getElementById(momentDomId(momentId))
      ?.scrollIntoView({ block: "start" });
  };

  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <Heading level={2} look="h2">
          <DayTitle trip={trip} day={day} />
        </Heading>
        {day.route ? (
          <Text tone="muted">
            <TripText>{day.route}</TripText>
          </Text>
        ) : null}
      </div>
      <DayParty people={presencesOnDay(trip.people, day.id)} />
      <DayFacts day={day} liveWeather={liveWeather} />
      {isEmpty ? <EmptyDay trip={trip} /> : null}
      {highlights.length > 0 ? (
        <DayGlance highlights={highlights} onJump={jumpToMoment} />
      ) : null}
      {day.tips.length > 0 ? (
        <Section
          id={DAY_SECTION_IDS.tips}
          title={t({ en: "Good to know", zh: "今日须知" })}
          look="label"
          css={styles.section}
        >
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
          id={DAY_SECTION_IDS.dining}
          title={t({ en: "Places to eat", zh: "餐饮选择" })}
          look="label"
          css={styles.section}
        >
          <DiningList restaurants={day.dining} />
        </Section>
      ) : null}
      {day.places.length > 0 ? (
        <Section
          id={DAY_SECTION_IDS.places}
          title={t({ en: "Places to go", zh: "想去的地方" })}
          look="label"
          css={styles.section}
        >
          <PlaceList places={day.places} />
        </Section>
      ) : null}
      <StaySection
        stay={day.stay}
        sameAsDay={sameAsIndex < 0 ? null : sameAsIndex}
        sameAsDetail={
          isLabelTheName
            ? sameBed.replace("{day}", dayNumber(sameAsIndex))
            : undefined
        }
        onOpenDay={onOpenDay}
      />
    </div>
  );
}

const styles = stylex.create({
  // A section that another screen opens the page at stops under the header.
  section: {
    scrollMarginBlockStart: "4rem",
  },
});
