"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, opacity, rhythm, space } from "@tuja/ui/tokens.stylex";
import { Fragment } from "react";
import { dayNumber } from "#src/trips/day-number.ts";
import { dayDateLabel, shortDateLabel, weekdayLabel } from "../date-label.ts";
import { presencesOnDay } from "../presences-on-day.ts";
import { TripText } from "../trip-text.tsx";
import { useDayNumber } from "../use-day-number.ts";
import { dayBefore, mondayOf } from "./calendar-weeks.ts";
import { dayLinkProps } from "./day-link-props.ts";
import { DayPeople } from "./day-people.tsx";
import { DayWeather } from "./day-weather.tsx";
import { DriveMeter } from "./drive-meter.tsx";
import { HighlightLines } from "./highlight-lines.tsx";
import { StayPill, StayRail } from "./stay-pill.tsx";
import type { CalendarProps } from "./trip-calendar.tsx";
import { useStayLabel } from "./use-stay-label.ts";

/**
 * The trip as a list of its days, for a narrow view. The rail beside the
 * days has the colour of the stay of each night, and changes at the day of a
 * check-in.
 */
export function Agenda({
  trip,
  stays,
  todayIndex,
  weatherByDay,
  onOpenDay,
}: CalendarProps) {
  const locale = useLocale();
  const dayLabel = useDayNumber(trip);
  const stayLabel = useStayLabel();
  const today = t({ en: "Today", zh: "今天" });
  const weekOf = t({ en: "Week of {date}", zh: "{date}起的一周" });

  return (
    <ol css={stack.rows}>
      {trip.days.map((day, index) => {
        const lastNight = stays.get(dayBefore(day.date));
        const tonight = stays.get(day.date);
        const monday = mondayOf(day.date);
        const startsWeek =
          index === 0 || mondayOf(trip.days[index - 1].date) !== monday;
        const isToday = index === todayIndex;
        return (
          <Fragment key={day.id}>
            {startsWeek ? (
              <li css={styles.row}>
                <span />
                <span css={styles.rail} aria-hidden>
                  <StayRail stay={lastNight} grow />
                </span>
                <Text as="span" look="overline" tone="muted" css={styles.week}>
                  {weekOf.replace("{date}", shortDateLabel(monday, locale))}
                </Text>
              </li>
            ) : null}
            <li css={[styles.row, index < todayIndex && styles.past]}>
              <span css={styles.date} aria-hidden>
                <Text as="span" look="caption" tone="muted">
                  {weekdayLabel(day.date, locale)}
                </Text>
                <span
                  css={[typeRole.h1, typeModifier.numeric, styles.dateNumber]}
                >
                  {Number(day.date.slice(8))}
                </span>
              </span>
              <span css={styles.rail} aria-hidden>
                <StayRail stay={lastNight} />
                <span css={[styles.node, isToday && styles.nodeToday]} />
                <StayRail stay={tonight} grow />
              </span>
              <a
                {...dayLinkProps(index, todayIndex, onOpenDay)}
                css={[
                  corner.radius_3,
                  quietSurface.interactive,
                  stack.tight,
                  styles.body,
                ]}
              >
                <span css={styles.head}>
                  <Text as="span" look="label" weight="semibold">
                    <span css={a11y.srOnly}>
                      {`${dayDateLabel(day.date, locale)} · ${dayLabel(index)}`}
                    </span>
                    <span
                      aria-hidden
                    >{`D${String(dayNumber(trip, index))}`}</span>
                    {day.title ? (
                      <>
                        {" · "}
                        <TripText>{day.title}</TripText>
                      </>
                    ) : null}
                  </Text>
                  {isToday ? <Badge size="sm">{today}</Badge> : null}
                </span>
                <span css={cluster.item}>
                  <DayWeather day={day} live={weatherByDay[day.id]} />
                  <DriveMeter minutes={day.drivingMinutes} />
                </span>
                <HighlightLines day={day} limit={3} />
                <DayPeople people={presencesOnDay(trip.people, day.id)} />
                {tonight && tonight !== lastNight ? (
                  <StayPill
                    stay={tonight}
                    text={stayLabel(tonight)}
                    css={styles.stay}
                  />
                ) : null}
              </a>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: `${space._8} ${space._3} minmax(0, 1fr)`,
    columnGap: rhythm.tight,
  },
  past: { opacity: opacity.disabled },
  week: { paddingBlock: space._3, paddingInline: space._3 },
  date: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    paddingBlockStart: space._3,
  },
  dateNumber: { lineHeight: font.lineHeight_1 },
  rail: { display: "flex", flexDirection: "column", alignItems: "center" },
  node: {
    flexShrink: 0,
    width: space._2,
    height: space._2,
    borderRadius: border.radius_round,
    cornerShape: "round",
    borderWidth: border.size_2,
    borderStyle: "solid",
    borderColor: color.foreground,
    backgroundColor: color.background,
  },
  nodeToday: { backgroundColor: color.foreground },
  body: {
    marginBlock: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
  stay: { alignSelf: "flex-start", maxWidth: "100%" },
});
