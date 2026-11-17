"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { PageHeader } from "@tuja/ui/components/page-header";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Fragment, useRef, type ReactNode } from "react";
import type { ResolvedDay, Trip } from "#src/trips/types.ts";
import { TripCalendar } from "./calendar/trip-calendar.tsx";
import { dateLabel, dateRangeLabel } from "./date-label.ts";
import { DayStepper } from "./day-stepper.tsx";
import { DayView } from "./day-view.tsx";
import { TripLanguageProvider, TripText } from "./trip-text.tsx";
import { useKeepPageOffline } from "./use-keep-page-offline.ts";
import { useScrollToNow } from "./use-scroll-to-now.ts";
import { tripLocationHash, useTripLocation } from "./use-trip-location.ts";
import { useTripToday } from "./use-trip-today.ts";
import type { LiveWeather } from "./weather/types.ts";

function PhaseNote({ trip, today }: { trip: Trip; today: ResolvedDay }) {
  const locale = useLocale();
  const before = t({
    en: "{n} days to go. The trip starts on {date}.",
    zh: "距出发还有 {n} 天 · {date}启程",
  });
  const after = t({
    en: "This trip is over. You can still read every day of it.",
    zh: "旅程已结束 · 回顾全程",
  });
  if (today.phase === "during") return null;
  return (
    <Callout intent="neutral" icon={<CalendarBlankIcon weight="bold" />}>
      {today.phase === "before"
        ? before
            .replace("{n}", String(today.daysUntil))
            .replace("{date}", dateLabel(trip.days[0].date, locale))
        : after}
    </Callout>
  );
}

/** A trip: one day at a time, or every day on a calendar. */
export function TripPage({
  tripId,
  trip,
  serverToday,
  weatherByDay,
  actions,
  editHref,
}: {
  tripId: string;
  trip: Trip;
  /** The edit screen of the trip, for a viewer who can change it. */
  editHref?: string;
  /** Where today falls on the trip when the server rendered the page. */
  serverToday: ResolvedDay;
  weatherByDay: Record<string, LiveWeather>;
  /** What this viewer can do with the trip, such as share it. */
  actions?: ReactNode;
}) {
  const locale = useLocale();
  const today = useTripToday(trip, serverToday);
  const [location, go] = useTripLocation(trip.days.length, today.index);
  const topRef = useRef<HTMLDivElement>(null);
  useKeepPageOffline();
  const todayIndex = today.phase === "during" ? today.index : -1;
  useScrollToNow(trip, todayIndex);

  const openDay = (index: number) => {
    go({ view: "day", day: index });
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ block: "start" });
    }
  };

  return (
    <TripLanguageProvider language={trip.language}>
      <div ref={topRef} css={stack.group}>
        <PageHeader
          eyebrow={
            trip.party ? (
              <>
                {dateRangeLabel(trip.days, locale)} ·{" "}
                <TripText>{trip.party}</TripText>
              </>
            ) : (
              dateRangeLabel(trip.days, locale)
            )
          }
          title={<TripText>{trip.title}</TripText>}
          description={
            trip.subtitle ? <TripText>{trip.subtitle}</TripText> : undefined
          }
          actions={
            <>
              {/* Without a key, React at times warns that this node from the
                  server has none, after `router.refresh()` sends it again. */}
              <Fragment key="actions">{actions}</Fragment>
              {editHref ? (
                <Button
                  size="sm"
                  look="outline"
                  icon={<PencilSimpleIcon weight="bold" />}
                  href={
                    location.view === "day"
                      ? editHref + tripLocationHash(location)
                      : editHref
                  }
                >
                  {t({ en: "Edit", zh: "编辑" })}
                </Button>
              ) : null}
              <SegmentedControl
                aria-label={t({ en: "View", zh: "视图" })}
                size="sm"
                value={location.view}
                onChange={(view) => {
                  if (view === "calendar") {
                    go({ view: "calendar" });
                  } else {
                    openDay(today.index);
                  }
                }}
                options={[
                  { value: "day", label: t({ en: "Day", zh: "每日" }) },
                  {
                    value: "calendar",
                    label: t({ en: "Calendar", zh: "日历" }),
                  },
                ]}
              />
            </>
          }
        />
        <PhaseNote trip={trip} today={today} />
        {location.view === "day" ? (
          <>
            <DayStepper
              trip={trip}
              current={location.day}
              todayIndex={todayIndex}
              onSelect={openDay}
            />
            <DayView
              key={trip.days[location.day].id}
              tripId={tripId}
              trip={trip}
              day={trip.days[location.day]}
              liveWeather={weatherByDay[trip.days[location.day].id]}
              onOpenDay={openDay}
            />
          </>
        ) : (
          <TripCalendar
            trip={trip}
            todayIndex={todayIndex}
            weatherByDay={weatherByDay}
            onOpenDay={openDay}
          />
        )}
        <FlowBlock>
          <Text look="caption" tone="muted">
            {t({
              en: "Have a good trip, and travel safe. The plan is a guide: check restaurants and prices on their own sites.",
              zh: "祝旅途愉快，一路平安 · 行程仅供参考，餐厅与价格以官网实时为准",
            })}
          </Text>
        </FlowBlock>
      </div>
    </TripLanguageProvider>
  );
}
