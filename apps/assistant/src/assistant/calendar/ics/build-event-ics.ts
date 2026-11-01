import type { CalendarEntry } from "./entry-of-event.ts";
import {
  formatIcsDate,
  formatIcsLocalTime,
  formatIcsUtc,
  instantOf,
  localTimeAt,
  offsetMinutesAt,
  type LocalTime,
} from "./instant-of.ts";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60_000;
const MAX_LINE_OCTETS = 75;

export const ICS_PRODUCT_ID = "-//qingqi.dev//Mail Assistant//EN";

/** Escapes a TEXT value (RFC 5545 3.3.11). */
export function escapeIcsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line into lines of at most 75 octets, without splitting a character. */
function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = lines.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      lines.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  lines.push(current);
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`));
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

export interface EventIcsInput {
  uid: string;
  sequence: number;
  entry: CalendarEntry;
  /** The summary line and the link to the mail. */
  description: string;
  /** Opens the mail. */
  url: string | null;
  now: Date;
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

/** One VEVENT with its alarms, in a VCALENDAR with the VTIMEZONE that its times need. */
export function buildEventIcs({
  uid,
  sequence,
  entry,
  description,
  url,
  now,
}: EventIcsInput): string {
  const { timing } = entry;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
  ];
  if (!timing.allDay && timing.timeZone !== "UTC") {
    lines.push(
      ...buildVTimezone(
        timing.timeZone,
        instantOf(timing.start, timing.timeZone),
        instantOf(timing.end, timing.timeZone),
      ),
    );
  }
  lines.push(
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(now.getTime())}`,
    `SEQUENCE:${String(sequence)}`,
  );
  if (timing.allDay) {
    lines.push(
      `DTSTART;VALUE=DATE:${formatIcsDate(timing.startDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(timing.endDate)}`,
    );
  } else {
    lines.push(
      dateTimeLine("DTSTART", timing.start, timing.timeZone),
      dateTimeLine("DTEND", timing.end, timing.timeZone),
    );
  }
  lines.push(`SUMMARY:${escapeIcsText(entry.title)}`);
  if (entry.location) lines.push(`LOCATION:${escapeIcsText(entry.location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE");
  for (const trigger of entry.alarms) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(entry.title)}`,
      `TRIGGER:${trigger}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}
