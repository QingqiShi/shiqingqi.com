"use client";

import type { Icon } from "@phosphor-icons/react";
import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { CarProfileIcon } from "@phosphor-icons/react/dist/ssr/CarProfile";
import { CloudIcon } from "@phosphor-icons/react/dist/ssr/Cloud";
import { CloudRainIcon } from "@phosphor-icons/react/dist/ssr/CloudRain";
import { CloudSunIcon } from "@phosphor-icons/react/dist/ssr/CloudSun";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { HandWavingIcon } from "@phosphor-icons/react/dist/ssr/HandWaving";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { TrainIcon } from "@phosphor-icons/react/dist/ssr/Train";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Text } from "@tuja/ui/components/text";
import { blue } from "@tuja/ui/palette/blue.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { indigo } from "@tuja/ui/palette/indigo.stylex";
import { orange } from "@tuja/ui/palette/orange.stylex";
import { pink } from "@tuja/ui/palette/pink.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { teal } from "@tuja/ui/palette/teal.stylex";
import { yellow } from "@tuja/ui/palette/yellow.stylex";
import { show } from "@tuja/ui/primitives/show.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";
import { Fragment } from "react";
import calendarTrips from "./calendar-trips.json";

interface CalPerson {
  name: string;
  initial: string;
  kind: string;
}

interface CalDay {
  id: string;
  date: string;
  title: string;
  temp: string | null;
  sky: string | null;
  driving: number | null;
  highlights: { kind: string; label: string }[];
  stay: string | null;
  people: CalPerson[];
}

interface CalTrip {
  title: string;
  stays: Record<string, string>;
  days: CalDay[];
  people: string[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HIGHLIGHT_ICONS: Record<string, Icon> = {
  flight: AirplaneTiltIcon,
  transit: TrainIcon,
  reservation: ForkKnifeIcon,
  drive: CameraIcon,
  pickup: HandWavingIcon,
  dropoff: HandWavingIcon,
};

function skyIcon(sky: string | null): Icon {
  if (sky === null) return CloudIcon;
  if (sky.includes("雨")) return CloudRainIcon;
  if (sky.includes("间晴")) return CloudSunIcon;
  if (sky.includes("晴")) return SunIcon;
  return CloudIcon;
}

function utc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function isoOf(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** The Mondays to Sundays that hold the trip, as ISO dates. */
function weeksOf(days: CalDay[]) {
  const first = utc(days[0].date);
  const last = utc(days[days.length - 1].date);
  const cursor = new Date(first);
  cursor.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const weeks: string[][] = [];
  while (cursor <= last) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isoOf(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const HUE_COUNT = 8;

function useStayHues(trip: CalTrip) {
  const order = Object.keys(trip.stays);
  return (stay: string) => order.indexOf(stay) % HUE_COUNT;
}

function nightsOf(trip: CalTrip, stay: string) {
  return trip.days.filter((day) => day.stay === stay).length;
}

function Presence({ people }: { people: CalPerson[] }) {
  const joins = people.filter((p) => p.kind === "arrive").map((p) => p.name);
  const leaves = people.filter((p) => p.kind === "depart").map((p) => p.name);
  const here = people.filter((p) => p.kind !== "home");
  return (
    <div css={styles.presence}>
      <div css={styles.avatars}>
        {here.map((person) => (
          <Avatar
            key={person.name}
            name={person.name}
            initials={person.initial}
            size="sm"
            look={person.kind === "present" ? "subtle" : "solid"}
            css={styles.avatar}
          />
        ))}
      </div>
      {joins.length > 0 ? (
        <Text as="span" look="caption" tone="muted">
          {`+ ${joins.join(", ")}`}
        </Text>
      ) : null}
      {leaves.length > 0 ? (
        <Text as="span" look="caption" tone="muted">
          {`− ${leaves.join(", ")}`}
        </Text>
      ) : null}
    </div>
  );
}

function DriveMeter({ hours }: { hours: number | null }) {
  if (hours === null) return null;
  const label =
    hours === 0
      ? "No driving"
      : `${Math.floor(hours)}h${hours % 1 ? String(Math.round((hours % 1) * 60)).padStart(2, "0") : ""}`;
  return (
    <div css={styles.drive}>
      <CarProfileIcon weight="bold" {...stylex.props(styles.driveIcon)} />
      <div css={styles.meterTrack} aria-hidden>
        <div
          css={[styles.meterFill, styles.meterWidth(Math.min(hours / 7, 1))]}
        />
      </div>
      <Text as="span" look="caption" tone="muted" css={styles.driveLabel}>
        {label}
      </Text>
    </div>
  );
}

function Highlights({ day, limit }: { day: CalDay; limit: number }) {
  return (
    <ul css={styles.highlights}>
      {day.highlights.slice(0, limit).map((highlight) => {
        const HighlightIcon = HIGHLIGHT_ICONS[highlight.kind] ?? CameraIcon;
        return (
          <li key={highlight.label} css={styles.highlight}>
            <HighlightIcon
              weight="bold"
              {...stylex.props(styles.highlightIcon)}
            />
            <Text as="span" look="caption" css={styles.clamp1}>
              {highlight.label}
            </Text>
          </li>
        );
      })}
    </ul>
  );
}

function DayCell({
  day,
  index,
  today,
}: {
  day: CalDay;
  index: number;
  today: number;
}) {
  const SkyIcon = skyIcon(day.sky);
  const date = utc(day.date);
  return (
    <a
      href={`#${day.id}`}
      css={[
        styles.cell,
        index === today && styles.cellToday,
        index < today && styles.cellPast,
      ]}
      aria-current={index === today ? "date" : undefined}
    >
      <div css={styles.cellHead}>
        <div css={styles.dateBlock}>
          <span css={styles.dateNumber}>{date.getUTCDate()}</span>
          <Text as="span" look="caption" tone="muted">
            {`D${index}`}
          </Text>
        </div>
        {index === today ? (
          <Badge size="sm">Today</Badge>
        ) : day.temp ? (
          <span css={styles.weather}>
            <SkyIcon weight="bold" {...stylex.props(styles.skyIcon)} />
            <Text as="span" look="caption">
              {day.temp.replace("°C", "°")}
            </Text>
          </span>
        ) : null}
      </div>
      <Text look="label" weight="semibold" css={styles.clamp2}>
        {day.title}
      </Text>
      <Highlights day={day} limit={2} />
      <div css={styles.cellFoot}>
        <DriveMeter hours={day.driving} />
        <Presence people={day.people} />
      </div>
    </a>
  );
}

function StayBand({
  trip,
  stay,
  start,
  end,
  continued,
  hue,
}: {
  trip: CalTrip;
  stay: string;
  start: number;
  end: number;
  continued: boolean;
  hue: number;
}) {
  const nights = nightsOf(trip, stay);
  return (
    <div
      css={[
        styles.band,
        bandHues[hue],
        styles.bandSpan(start, end),
        continued && styles.bandContinued,
      ]}
    >
      <BedIcon weight="bold" {...stylex.props(styles.bandIcon)} />
      {end - start < 2 ? null : (
        <span css={styles.bandText}>
          {continued
            ? trip.stays[stay]
            : `${trip.stays[stay]} · ${nights} night${nights > 1 ? "s" : ""}`}
        </span>
      )}
    </div>
  );
}

/**
 * The bands of one week. A night runs from the middle of its day to the
 * middle of the next day, as a booking does, so each day spans two of the
 * fourteen tracks.
 */
function weekBands(trip: CalTrip, week: string[]) {
  const bands: {
    stay: string;
    start: number;
    end: number;
    continued: boolean;
  }[] = [];
  week.forEach((iso, col) => {
    const day = trip.days.find((d) => d.date === iso);
    const stay = day?.stay ?? null;
    if (stay === null) return;
    const last = bands.at(-1);
    if (last && last.stay === stay && last.end === col * 2 + 2) {
      last.end = col * 2 + 4;
      return;
    }
    const previous = trip.days.find(
      (d) => d.date === isoOf(new Date(utc(iso).getTime() - 864e5)),
    );
    const continued = col === 0 && previous?.stay === stay;
    bands.push({
      stay,
      start: continued ? 1 : col * 2 + 2,
      end: col * 2 + 4,
      continued,
    });
  });
  return bands.map((band) => ({ ...band, end: Math.min(band.end, 15) }));
}

function MonthGrid({ trip, today }: { trip: CalTrip; today: number }) {
  const hueOf = useStayHues(trip);
  return (
    <div css={styles.month}>
      <div css={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <Text
            key={weekday}
            as="span"
            look="overline"
            tone="muted"
            css={styles.weekday}
          >
            {weekday}
          </Text>
        ))}
      </div>
      {weeksOf(trip.days).map((week) => (
        <div key={week[0]} css={styles.week}>
          {week.map((iso, col) => {
            const index = trip.days.findIndex((d) => d.date === iso);
            const gridColumn = `${col * 2 + 1} / span 2`;
            if (index === -1) {
              return (
                <div key={iso} css={[styles.offDay, styles.column(gridColumn)]}>
                  <span css={styles.offNumber}>{utc(iso).getUTCDate()}</span>
                </div>
              );
            }
            return (
              <div key={iso} css={[styles.slot, styles.column(gridColumn)]}>
                <DayCell day={trip.days[index]} index={index} today={today} />
              </div>
            );
          })}
          {weekBands(trip, week).map((band) => (
            <StayBand
              key={`${band.stay}-${band.start}`}
              trip={trip}
              hue={hueOf(band.stay)}
              {...band}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Agenda({ trip, today }: { trip: CalTrip; today: number }) {
  const hueOf = useStayHues(trip);
  return (
    <ol css={styles.agenda}>
      {trip.days.map((day, index) => {
        const date = utc(day.date);
        const previousStay = index > 0 ? trip.days[index - 1].stay : null;
        const checksIn = day.stay !== null && day.stay !== previousStay;
        const SkyIcon = skyIcon(day.sky);
        const weekStarts = index === 0 || date.getUTCDay() === 1;
        return (
          <Fragment key={day.id}>
            {weekStarts ? (
              <li css={styles.agendaRow}>
                <span />
                <div css={styles.rail} aria-hidden>
                  <div
                    css={[
                      styles.railHalf,
                      styles.railGrow,
                      previousStay === null
                        ? styles.railNone
                        : railHues[hueOf(previousStay)],
                    ]}
                  />
                </div>
                <Text look="overline" tone="muted" css={styles.agendaWeekLabel}>
                  {`Week of ${date.getUTCDate() - ((date.getUTCDay() + 6) % 7)} Jun`}
                </Text>
              </li>
            ) : null}
            <li css={[styles.agendaRow, index < today && styles.cellPast]}>
              <div css={styles.agendaDate}>
                <Text as="span" look="caption" tone="muted">
                  {WEEKDAYS[(date.getUTCDay() + 6) % 7]}
                </Text>
                <span css={styles.dateNumber}>{date.getUTCDate()}</span>
              </div>
              <div css={styles.rail} aria-hidden>
                <div
                  css={[
                    styles.railHalf,
                    previousStay === null
                      ? styles.railNone
                      : railHues[hueOf(previousStay)],
                  ]}
                />
                <div css={[styles.node, index === today && styles.nodeToday]} />
                <div
                  css={[
                    styles.railHalf,
                    styles.railGrow,
                    day.stay === null
                      ? styles.railNone
                      : railHues[hueOf(day.stay)],
                  ]}
                />
              </div>
              <a
                href={`#${day.id}`}
                css={[styles.agendaBody, index === today && styles.agendaToday]}
              >
                <div css={styles.cellHead}>
                  <Text look="label" weight="semibold">
                    {`D${index} · ${day.title}`}
                  </Text>
                  {index === today ? <Badge size="sm">Today</Badge> : null}
                </div>
                <div css={styles.agendaMeta}>
                  {day.temp ? (
                    <span css={styles.weather}>
                      <SkyIcon
                        weight="bold"
                        {...stylex.props(styles.skyIcon)}
                      />
                      <Text as="span" look="caption">
                        {day.temp}
                      </Text>
                    </span>
                  ) : null}
                  <DriveMeter hours={day.driving} />
                </div>
                <Highlights day={day} limit={3} />
                <Presence people={day.people} />
                {checksIn && day.stay !== null ? (
                  <div css={[styles.agendaStay, bandHues[hueOf(day.stay)]]}>
                    <BedIcon weight="bold" {...stylex.props(styles.bandIcon)} />
                    <span css={styles.bandText}>
                      {`${trip.stays[day.stay]} · ${nightsOf(trip, day.stay)} night${nightsOf(trip, day.stay) > 1 ? "s" : ""}`}
                    </span>
                  </div>
                ) : null}
              </a>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

function Summary({ trip }: { trip: CalTrip }) {
  const hours = trip.days.reduce((sum, day) => sum + (day.driving ?? 0), 0);
  const facts = [
    {
      icon: <BedIcon weight="bold" />,
      text: `${Object.keys(trip.stays).length} places to sleep`,
    },
    {
      icon: <CarProfileIcon weight="bold" />,
      text: `≈ ${Math.round(hours)}h at the wheel`,
    },
    { icon: <UsersThreeIcon weight="bold" />, text: trip.people.join(" · ") },
  ];
  return (
    <div css={styles.summary}>
      {facts.map((fact) => (
        <span key={fact.text} css={styles.summaryFact}>
          {fact.icon}
          <Text as="span" look="bodySmall">
            {fact.text}
          </Text>
        </span>
      ))}
    </div>
  );
}

export function TripCalendar({
  trip: tripKey = "gb",
  today = 4,
}: {
  trip?: "gb" | "tuscany";
  today?: number;
}) {
  const trip = calendarTrips[tripKey] as CalTrip;
  return (
    <div css={styles.root}>
      <Summary trip={trip} />
      <div css={show.wide}>
        <MonthGrid trip={trip} today={today} />
      </div>
      <div css={show.narrow}>
        <Agenda trip={trip} today={today} />
      </div>
    </div>
  );
}

const bandStyles = stylex.create({
  blue: {
    backgroundColor: `light-dark(${blue._92}, ${blue._20})`,
    color: `light-dark(${blue._30}, ${blue._87})`,
    borderColor: `light-dark(${blue._80}, ${blue._30})`,
  },
  teal: {
    backgroundColor: `light-dark(${teal._92}, ${teal._20})`,
    color: `light-dark(${teal._30}, ${teal._87})`,
    borderColor: `light-dark(${teal._80}, ${teal._30})`,
  },
  orange: {
    backgroundColor: `light-dark(${orange._92}, ${orange._20})`,
    color: `light-dark(${orange._30}, ${orange._87})`,
    borderColor: `light-dark(${orange._80}, ${orange._30})`,
  },
  purple: {
    backgroundColor: `light-dark(${purple._92}, ${purple._20})`,
    color: `light-dark(${purple._30}, ${purple._87})`,
    borderColor: `light-dark(${purple._80}, ${purple._30})`,
  },
  green: {
    backgroundColor: `light-dark(${green._92}, ${green._20})`,
    color: `light-dark(${green._30}, ${green._87})`,
    borderColor: `light-dark(${green._80}, ${green._30})`,
  },
  pink: {
    backgroundColor: `light-dark(${pink._92}, ${pink._20})`,
    color: `light-dark(${pink._30}, ${pink._87})`,
    borderColor: `light-dark(${pink._80}, ${pink._30})`,
  },
  indigo: {
    backgroundColor: `light-dark(${indigo._92}, ${indigo._20})`,
    color: `light-dark(${indigo._30}, ${indigo._87})`,
    borderColor: `light-dark(${indigo._80}, ${indigo._30})`,
  },
  yellow: {
    backgroundColor: `light-dark(${yellow._92}, ${yellow._20})`,
    color: `light-dark(${yellow._30}, ${yellow._87})`,
    borderColor: `light-dark(${yellow._80}, ${yellow._30})`,
  },
});

const railStyles = stylex.create({
  blue: { backgroundColor: `light-dark(${blue._70}, ${blue._50})` },
  teal: { backgroundColor: `light-dark(${teal._70}, ${teal._50})` },
  orange: { backgroundColor: `light-dark(${orange._70}, ${orange._50})` },
  purple: { backgroundColor: `light-dark(${purple._70}, ${purple._50})` },
  green: { backgroundColor: `light-dark(${green._70}, ${green._50})` },
  pink: { backgroundColor: `light-dark(${pink._70}, ${pink._50})` },
  indigo: { backgroundColor: `light-dark(${indigo._70}, ${indigo._50})` },
  yellow: { backgroundColor: `light-dark(${yellow._70}, ${yellow._50})` },
});

const bandHues = [
  bandStyles.blue,
  bandStyles.teal,
  bandStyles.orange,
  bandStyles.purple,
  bandStyles.green,
  bandStyles.pink,
  bandStyles.indigo,
  bandStyles.yellow,
];
const railHues = [
  railStyles.blue,
  railStyles.teal,
  railStyles.orange,
  railStyles.purple,
  railStyles.green,
  railStyles.pink,
  railStyles.indigo,
  railStyles.yellow,
];

const styles = stylex.create({
  root: { display: "flex", flexDirection: "column", gap: space._5 },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    gap: `${space._1} ${space._5}`,
    color: color.mutedForeground,
  },
  summaryFact: { display: "inline-flex", alignItems: "center", gap: space._1 },
  month: { display: "flex", flexDirection: "column", gap: space._3 },
  weekdays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: space._1,
  },
  weekday: { paddingInline: space._2 },
  week: {
    display: "grid",
    gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
    gridTemplateRows: "auto auto",
    columnGap: space._1,
    rowGap: space._1,
  },
  column: (gridColumn: string) => ({ gridColumn, gridRow: 1 }),
  slot: { display: "flex", minWidth: 0 },
  offDay: {
    minHeight: "12rem",
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  offNumber: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: color.border,
    fontVariantNumeric: "tabular-nums",
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    flexGrow: 1,
    minWidth: 0,
    minHeight: "12rem",
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_3,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: {
      default: color.card,
      ":hover": color.muted,
    },
    color: color.foreground,
    textDecoration: "none",
    transitionProperty: "background-color",
    transitionDuration: "150ms",
  },
  cellToday: {
    borderColor: color.foreground,
    boxShadow: `0 0 0 1px ${color.foreground}`,
  },
  cellPast: { opacity: 0.55 },
  cellHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space._1,
  },
  dateBlock: { display: "flex", alignItems: "baseline", gap: space._1 },
  dateNumber: {
    fontSize: "1.5rem",
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  weather: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._0,
    whiteSpace: "nowrap",
  },
  skyIcon: { flexShrink: 0, width: "1rem", height: "1rem" },
  clamp1: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  clamp2: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  highlights: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  highlight: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    minWidth: 0,
    color: color.mutedForeground,
  },
  highlightIcon: { flexShrink: 0, width: ".875rem", height: ".875rem" },
  cellFoot: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    marginTop: "auto",
  },
  drive: { display: "flex", alignItems: "center", gap: space._1 },
  driveIcon: {
    flexShrink: 0,
    width: ".875rem",
    height: ".875rem",
    color: color.mutedForeground,
  },
  meterTrack: {
    flexGrow: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: color.muted,
    overflow: "hidden",
    minWidth: "2rem",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: color.foreground,
  },
  meterWidth: (fraction: number) => ({ width: `${fraction * 100}%` }),
  driveLabel: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  presence: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    flexWrap: "wrap",
  },
  avatars: { display: "flex", paddingInlineStart: space._0 },
  avatar: {
    marginInlineStart: `calc(-1 * ${space._0})`,
    boxShadow: `0 0 0 2px ${color.card}`,
    borderRadius: 999,
  },
  band: {
    gridRow: 2,
    display: "flex",
    alignItems: "center",
    gap: space._1,
    minWidth: 0,
    height: "1.75rem",
    paddingInline: space._2,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
  },
  bandSpan: (start: number, end: number) => ({
    gridColumn: `${start} / ${end}`,
  }),
  bandContinued: {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
    borderInlineStartWidth: 0,
  },
  bandIcon: { flexShrink: 0, width: ".875rem", height: ".875rem" },
  bandText: {
    fontSize: ".75rem",
    fontWeight: 600,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  agenda: { margin: 0, padding: 0, listStyle: "none" },
  agendaWeekLabel: { paddingBlock: space._3, paddingInline: space._3 },
  agendaRow: {
    display: "grid",
    gridTemplateColumns: "2.75rem 1rem minmax(0, 1fr)",
    columnGap: space._2,
  },
  agendaDate: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: space._00,
    paddingTop: space._3,
  },
  rail: { display: "flex", flexDirection: "column", alignItems: "center" },
  railHalf: { width: 4, height: space._4, flexShrink: 0 },
  railGrow: { flexGrow: 1 },
  railNone: { backgroundColor: "transparent" },
  node: {
    flexShrink: 0,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: color.foreground,
    backgroundColor: color.background,
  },
  nodeToday: {
    backgroundColor: color.foreground,
    boxShadow: `0 0 0 4px ${color.muted}`,
  },
  agendaBody: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    marginBlock: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_3,
    color: color.foreground,
    textDecoration: "none",
    backgroundColor: { default: "transparent", ":hover": color.muted },
  },
  agendaToday: { backgroundColor: color.muted },
  agendaMeta: { display: "flex", alignItems: "center", gap: space._3 },
  agendaStay: {
    display: "inline-flex",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: space._1,
    maxWidth: "100%",
    height: "1.75rem",
    paddingInline: space._2,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
  },
});
