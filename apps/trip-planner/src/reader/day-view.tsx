"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
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
import { StaySection } from "./stay-section.tsx";
import { TipCallout } from "./tip-callout.tsx";
import { TripText } from "./trip-text.tsx";
import type { LiveWeather } from "./weather/types.ts";

/** A day with no plan: it says so, and gives an editor of the trip the way to plan it. */
function EmptyDay({ editHref }: { editHref: string | undefined }) {
  return (
    <EmptyState
      icon={<CalendarBlankIcon weight="bold" />}
      title={t({ en: "Nothing planned yet", zh: "这一天还没有安排" })}
      description={
        editHref
          ? t({
              en: "Add times, places to go and places to eat in the editor.",
              zh: "在编辑器里添加时间、去处和餐厅。",
            })
          : t({
              en: "The plan for this day is still to come.",
              zh: "这一天的行程还在计划中。",
            })
      }
      action={
        editHref ? (
          <Button
            look="primary"
            icon={<PencilSimpleIcon weight="bold" />}
            href={editHref}
          >
            {t({ en: "Plan this day", zh: "安排这一天" })}
          </Button>
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
  editHref,
}: {
  tripId: string | null;
  trip: Trip;
  day: Day;
  liveWeather: LiveWeather | undefined;
  onOpenDay: (index: number) => void;
  /** The editor at this day, for a viewer who can change the trip. */
  editHref?: string;
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
      {isEmpty ? <EmptyDay editHref={editHref} /> : null}
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
