"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, opacity, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { dayNumber } from "#src/trips/day-number.ts";
import type { Day } from "#src/trips/types.ts";
import { dayDateLabel, weekdayLabel } from "../date-label.ts";
import { presencesOnDay } from "../presences-on-day.ts";
import { TripText } from "../trip-text.tsx";
import { useDayNumber } from "../use-day-number.ts";
import { calendarWeeks } from "./calendar-weeks.ts";
import { dayLinkProps } from "./day-link-props.ts";
import { DayPeople } from "./day-people.tsx";
import { DayWeather } from "./day-weather.tsx";
import { DriveMeter } from "./drive-meter.tsx";
import { HighlightLines } from "./highlight-lines.tsx";
import type { WeekBand } from "./month-bands.ts";
import { monthBands } from "./month-bands.ts";
import { StayPill } from "./stay-pill.tsx";
import type { CalendarProps } from "./trip-calendar.tsx";
import { useStayLabel } from "./use-stay-label.ts";

function dayOfMonth(iso: string) {
  return Number(iso.slice(8));
}

function DayCell({
  day,
  index,
  css,
  trip,
  todayIndex,
  weatherByDay,
  onOpenDay,
}: Omit<CalendarProps, "stays"> & {
  day: Day;
  index: number;
  css: StyleProp;
}) {
  const locale = useLocale();
  const dayLabel = useDayNumber(trip);
  const today = t({ en: "Today", zh: "今天" });
  const isToday = index === todayIndex;
  return (
    <a
      {...dayLinkProps(index, todayIndex, onOpenDay)}
      css={[
        cardSurface.base,
        cardSurface.interactive,
        styles.cell,
        isToday && styles.today,
        index < todayIndex && styles.past,
        css,
      ]}
    >
      <span css={styles.head}>
        <span css={styles.date}>
          <span
            css={[typeRole.h1, typeModifier.numeric, styles.dateNumber]}
            aria-hidden
          >
            {dayOfMonth(day.date)}
          </span>
          <span css={a11y.srOnly}>{dayDateLabel(day.date, locale)}</span>
          <Text as="span" look="caption" tone="muted">
            <span aria-hidden>{`D${String(dayNumber(trip, index))}`}</span>
            <span css={a11y.srOnly}>{dayLabel(index)}</span>
          </Text>
        </span>
        {isToday ? (
          <Badge size="sm">{today}</Badge>
        ) : (
          <DayWeather day={day} live={weatherByDay[day.id]} short />
        )}
      </span>
      {day.title ? (
        <Text as="span" look="label" weight="semibold" css={styles.title}>
          <TripText>{day.title}</TripText>
        </Text>
      ) : null}
      <HighlightLines day={day} limit={2} />
      <span css={[stack.tight, styles.foot]}>
        <DriveMeter minutes={day.drivingMinutes} />
        <DayPeople people={presencesOnDay(trip.people, day.id)} />
      </span>
    </a>
  );
}

function Band({ band }: { band: WeekBand }) {
  const stayLabel = useStayLabel();
  return (
    <StayPill
      stay={band.stay}
      text={
        band.label === "nights"
          ? stayLabel(band.stay)
          : band.label && band.stay.name
      }
      css={[
        styles.band(band.start, band.end),
        band.continued && styles.bandContinued,
        band.continues && styles.bandContinues,
      ]}
    />
  );
}

/**
 * The trip on a month grid, a week on each row from Monday. Under each week,
 * a band for each stay runs from the middle of the day of its first night to
 * the middle of the day after its last night.
 */
export function MonthGrid(props: CalendarProps) {
  const { trip, stays } = props;
  const locale = useLocale();
  const weeks = calendarWeeks(trip.days);
  const bands = monthBands(weeks, stays);
  const indexOfDate = new Map(trip.days.map((day, index) => [day.date, index]));

  return (
    <div css={stack.item}>
      <div css={styles.weekdays} aria-hidden>
        {weeks[0].map((iso) => (
          <Text
            key={iso}
            as="span"
            look="overline"
            tone="muted"
            css={styles.weekday}
          >
            {weekdayLabel(iso, locale)}
          </Text>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={week[0]} css={styles.week}>
          {week.map((iso, col) => {
            const index = indexOfDate.get(iso);
            return index === undefined ? (
              <span
                key={iso}
                aria-hidden
                css={[
                  typeRole.h4,
                  typeModifier.numeric,
                  styles.offDay,
                  styles.column(col),
                ]}
              >
                {dayOfMonth(iso)}
              </span>
            ) : (
              <DayCell
                key={iso}
                trip={trip}
                todayIndex={props.todayIndex}
                weatherByDay={props.weatherByDay}
                onOpenDay={props.onOpenDay}
                day={trip.days[index]}
                index={index}
                css={styles.column(col)}
              />
            );
          })}
          {bands[weekIndex].map((band) => (
            <Band key={band.start} band={band} />
          ))}
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  weekdays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    columnGap: rhythm.tight,
  },
  weekday: { paddingInline: space._3 },
  // Two tracks for each day, so that a band can start and end at midday.
  week: {
    display: "grid",
    gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
    gridTemplateRows: "auto auto",
    gap: rhythm.tight,
  },
  column: (col: number) => ({
    gridColumn: `${String(col * 2 + 1)} / span 2`,
    gridRow: 1,
  }),
  offDay: {
    minHeight: space._12,
    paddingBlock: space._2,
    paddingInline: space._3,
    color: color.border,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    minWidth: 0,
    minHeight: space._12,
    paddingBlock: space._2,
    paddingInline: space._3,
    color: color.foreground,
    textDecoration: "none",
  },
  today: {
    borderColor: color.foreground,
    boxShadow: `0 0 0 ${border.size_1} ${color.foreground}`,
  },
  past: { opacity: opacity.disabled },
  head: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: rhythm.inline,
  },
  date: { display: "flex", alignItems: "baseline", gap: rhythm.inline },
  dateNumber: { lineHeight: font.lineHeight_1 },
  title: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  foot: { marginTop: "auto" },
  band: (start: number, end: number) => ({
    gridColumn: `${String(start)} / ${String(end)}`,
    gridRow: 2,
  }),
  bandContinued: {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
    borderInlineStartWidth: 0,
  },
  bandContinues: {
    borderStartEndRadius: 0,
    borderEndEndRadius: 0,
    borderInlineEndWidth: 0,
  },
});
