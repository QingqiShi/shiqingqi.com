import {
  formatIcsDate,
  formatIcsLocalTime,
  formatIcsUtc,
  instantOf,
  localTimeAt,
  offsetMinutesAt,
  type LocalTime,
} from "./instant-of.ts";
import { escapeIcsText, joinIcs } from "./parse-ics-line.ts";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60_000;
const HOURS_14 = 14 * 60 * 60 * 1000;

export const ICS_PRODUCT_ID = "-//qingqi.dev//Mail Assistant//EN";

/** The UIDs of the events that the assistant makes end in this. */
export const ASSISTANT_UID_DOMAIN = "@assistant.qingqi.dev";

/** The property that holds the Message-ID of the mail an event came from. */
export const SOURCE_MESSAGE_ID_PROPERTY = "X-QINGQI-SOURCE-MESSAGE-ID";

/** When an event happens: whole days, or wall-clock times in the zones of the places. */
export type EventTiming =
  | {
      allDay: true;
      startDate: LocalTime;
      /** The day after the last day. */
      endDate: LocalTime;
    }
  | {
      allDay: false;
      start: LocalTime;
      end: LocalTime;
      timeZone: string;
      /** The zone of the end, such as the arrival airport's; often `timeZone`. */
      endTimeZone: string;
    };

/** The span of an event in epoch milliseconds. An all-day event spans its days in every zone on earth. */
export function spanOfTiming(timing: EventTiming): {
  start: number;
  end: number;
} {
  if (!timing.allDay) {
    return {
      start: instantOf(timing.start, timing.timeZone),
      end: instantOf(timing.end, timing.endTimeZone),
    };
  }
  return {
    start: instantOf(timing.startDate, "UTC") - HOURS_14,
    end: instantOf(timing.endDate, "UTC") + HOURS_14,
  };
}

function formatOffset(minutes: number) {
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  return `${sign}${hours}${String(absolute % 60).padStart(2, "0")}`;
}

interface Transition {
  /** The first instant of the new offset. */
  at: number;
  from: number;
  to: number;
}

/** The instants in [start, end) where the offset of `timeZone` changes. */
function transitionsIn(timeZone: string, start: number, end: number) {
  const transitions: Transition[] = [];
  let previous = offsetMinutesAt(start, timeZone);
  for (let day = start + DAY; day <= end; day += DAY) {
    const offset = offsetMinutesAt(day, timeZone);
    if (offset === previous) continue;
    let low = day - DAY;
    let high = day;
    while (high - low > MINUTE) {
      const middle = low + Math.floor((high - low) / 2 / MINUTE) * MINUTE;
      if (offsetMinutesAt(middle, timeZone) === previous) low = middle;
      else high = middle;
    }
    transitions.push({ at: high, from: previous, to: offset });
    previous = offset;
  }
  return transitions;
}

/**
 * A VTIMEZONE for `timeZone` from the year before `start` to the year after
 * `end`, with one observance for each change of offset that Intl knows. A
 * zone without changes gets one STANDARD observance.
 */
export function buildVTimezone(timeZone: string, start: number, end: number) {
  const fromYear = new Date(start).getUTCFullYear() - 1;
  const toYear = new Date(end).getUTCFullYear() + 1;
  const rangeStart = Date.UTC(fromYear, 0, 1);
  const transitions = transitionsIn(
    timeZone,
    rangeStart,
    Date.UTC(toYear + 1, 0, 1),
  );
  const lines = ["BEGIN:VTIMEZONE", `TZID:${timeZone}`];
  if (transitions.length === 0) {
    const offset = formatOffset(offsetMinutesAt(rangeStart, timeZone));
    lines.push(
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      `TZOFFSETFROM:${offset}`,
      `TZOFFSETTO:${offset}`,
      "END:STANDARD",
    );
  }
  for (const transition of transitions) {
    const kind = transition.to > transition.from ? "DAYLIGHT" : "STANDARD";
    const onset = localTimeAt(transition.at + transition.from * MINUTE, "UTC");
    lines.push(
      `BEGIN:${kind}`,
      `DTSTART:${formatIcsLocalTime(onset)}`,
      `TZOFFSETFROM:${formatOffset(transition.from)}`,
      `TZOFFSETTO:${formatOffset(transition.to)}`,
      `END:${kind}`,
    );
  }
  lines.push("END:VTIMEZONE");
  return lines;
}

/** The zones that a VTIMEZONE must describe for these times. */
export function zonesOfTiming(timing: EventTiming): string[] {
  if (timing.allDay) return [];
  return [...new Set([timing.timeZone, timing.endTimeZone])].filter(
    (zone) => zone !== "UTC",
  );
}

function dateTimeLine(
  name: "DTSTART" | "DTEND",
  local: LocalTime,
  timeZone: string,
) {
  return timeZone === "UTC"
    ? `${name}:${formatIcsUtc(instantOf(local, "UTC"))}`
    : `${name};TZID=${timeZone}:${formatIcsLocalTime(local)}`;
}

/** DTSTART and DTEND. */
export function timingLines(timing: EventTiming): string[] {
  if (timing.allDay) {
    return [
      `DTSTART;VALUE=DATE:${formatIcsDate(timing.startDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(timing.endDate)}`,
    ];
  }
  return [
    dateTimeLine("DTSTART", timing.start, timing.timeZone),
    dateTimeLine("DTEND", timing.end, timing.endTimeZone),
  ];
}

/** One VALARM per trigger: iCalendar durations from the start, such as `-PT1H`. */
export function alarmLines(title: string, triggers: readonly string[]) {
  return triggers.flatMap((trigger) => [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(title)}`,
    `TRIGGER:${trigger}`,
    "END:VALARM",
  ]);
}

/** The VTIMEZONE of each zone, for the years around the event. */
export function vTimezoneLines(zones: readonly string[], timing: EventTiming) {
  const span = spanOfTiming(timing);
  return zones.flatMap((zone) => buildVTimezone(zone, span.start, span.end));
}

export interface NewEventIcs {
  uid: string;
  title: string;
  timing: EventTiming;
  location: string | null;
  description: string | null;
  /** Opens the mail the event came from. */
  url: string | null;
  /** The Message-ID of that mail. */
  sourceMessageId: string | null;
  alarms: readonly string[];
  now: Date;
}

/** One VEVENT with its alarms, in a VCALENDAR with the VTIMEZONEs that its times need. */
export function buildEventIcs({
  uid,
  title,
  timing,
  location,
  description,
  url,
  sourceMessageId,
  alarms,
  now,
}: NewEventIcs): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    ...vTimezoneLines(zonesOfTiming(timing), timing),
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(now.getTime())}`,
    "SEQUENCE:0",
    ...timingLines(timing),
    `SUMMARY:${escapeIcsText(title)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (url) lines.push(`URL:${url}`);
  if (sourceMessageId) {
    lines.push(
      `${SOURCE_MESSAGE_ID_PROPERTY}:${escapeIcsText(sourceMessageId)}`,
    );
  }
  lines.push(
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    ...alarmLines(title, alarms),
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return joinIcs(lines);
}
