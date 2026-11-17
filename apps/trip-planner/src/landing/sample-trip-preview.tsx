"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { TripCalendar } from "#src/reader/calendar/trip-calendar.tsx";
import { dateRangeLabel } from "#src/reader/date-label.ts";
import { DayGlance } from "#src/reader/day-glance.tsx";
import { dayHighlights } from "#src/reader/day-highlights.ts";
import { DayParty } from "#src/reader/day-party.tsx";
import { DayStepper } from "#src/reader/day-stepper.tsx";
import { presencesOnDay } from "#src/reader/presences-on-day.ts";
import { TripLanguageProvider, TripText } from "#src/reader/trip-text.tsx";
import type { Day, Trip } from "#src/trips/types.ts";

const NOT_TODAY = -1;

/** The day's commitments, as rows that do not jump, since the preview has no feed to jump to. */
function glanceOf(day: Day) {
  return dayHighlights(day).map((highlight) => ({
    ...highlight,
    inFeed: false,
  }));
}

/**
 * The made-up trip, read with the reader's own parts: the top of one day, or
 * every day on the calendar. The place stays in this component and never in
 * the URL, as the landing page is not a trip.
 */
export function SampleTripPreview({ trip }: { trip: Trip }) {
  const locale = useLocale();
  const [view, setView] = useState<"day" | "calendar">("day");
  const [dayIndex, setDayIndex] = useState(0);
  const day = trip.days[dayIndex];
  const glance = glanceOf(day);

  return (
    <TripLanguageProvider language={trip.language}>
      <div css={stack.group}>
        <div css={cluster.item}>
          <div css={stack.tight}>
            <Text look="overline" tone="muted">
              {dateRangeLabel(trip.days, locale)} ·{" "}
              <TripText>{trip.party}</TripText>
            </Text>
            <Heading level={2} look="h2">
              <TripText>{trip.title}</TripText>
            </Heading>
          </div>
          <SegmentedControl
            aria-label={t({ en: "View", zh: "视图" })}
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: t({ en: "Day", zh: "每日" }) },
              {
                value: "calendar",
                label: t({ en: "Calendar", zh: "日历" }),
              },
            ]}
          />
        </div>
        {view === "day" ? (
          <div css={stack.group}>
            <DayStepper
              days={trip.days}
              current={dayIndex}
              todayIndex={NOT_TODAY}
              onSelect={setDayIndex}
            />
            <div css={stack.text}>
              <Heading level={3} look="h3">
                <TripText>{day.title}</TripText>
              </Heading>
              <Text tone="muted">
                <TripText>{day.route}</TripText>
              </Text>
            </div>
            <DayParty people={presencesOnDay(trip.people, day.id)} />
            {glance.length > 0 ? (
              <DayGlance highlights={glance} onJump={() => undefined} />
            ) : null}
          </div>
        ) : (
          <TripCalendar
            trip={trip}
            todayIndex={NOT_TODAY}
            weatherByDay={{}}
            onOpenDay={(index) => {
              setDayIndex(index);
              setView("day");
            }}
          />
        )}
      </div>
    </TripLanguageProvider>
  );
}
