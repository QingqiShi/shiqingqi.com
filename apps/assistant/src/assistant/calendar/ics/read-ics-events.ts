import { SOURCE_MESSAGE_ID_PROPERTY } from "./build-event-ics.ts";
import {
  addDays,
  formatLocalTime,
  instantOf,
  isTimeZone,
  localTimeAt,
  type LocalTime,
} from "./instant-of.ts";
import {
  parseIcsLine,
  unescapeIcsText,
  unfoldIcs,
  type IcsProperty,
} from "./parse-ics-line.ts";

const SECOND = 1000;

/** How an event repeats: its rule and dates, and the wall-clock start they count from. */
export interface IcsRepeat {
  /** The RRULE value; null when only RDATEs repeat it. */
  rule: string | null;
  /** RDATE starts, epoch milliseconds. */
  dates: number[];
  /** EXDATE starts, epoch milliseconds. */
  exceptions: number[];
  /** The DTSTART as a wall-clock time in `zone`: the rule counts in it. */
  local: LocalTime;
  zone: string;
}

/** A VEVENT as the tools show it. */
export interface IcsEvent {
  uid: string | null;
  title: string;
  location: string | null;
  description: string | null;
  allDay: boolean;
  /** Epoch milliseconds; for an all-day event, 00:00 UTC of its first day. */
  start: number;
  /** Null when the event gives no end. */
  end: number | null;
  /** `YYYY-MM-DD` for an all-day event, else `YYYY-MM-DDTHH:mm` in `timeZone`. */
  startLocal: string;
  /** In `endTimeZone`; for an all-day event, the last day. */
  endLocal: string | null;
  /** Null for an all-day event. */
  timeZone: string | null;
  endTimeZone: string | null;
  /** It has a rule that repeats it, or it is one changed instance of such an event. */
  recurring: boolean;
  /** Null when it does not repeat. */
  repeat: IcsRepeat | null;
  /** For one changed instance of a repeating event: the start it replaces. */
  recurrenceId: number | null;
  /** It names attendees: a meeting with other people. */
  hasAttendees: boolean;
  cancelled: boolean;
  /** The Message-ID of the mail the assistant made it from. */
  sourceMessageId: string | null;
}

const DATE_TIME = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;
const DURATION =
  /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

interface ReadTime {
  local: LocalTime;
  instant: number;
  allDay: boolean;
  /** The zone the time is shown in. */
  zone: string;
}

/**
 * The time of a DTSTART or DTEND. A UTC time, or one with an unknown TZID
 * or none, is shown in `fallbackZone`.
 */
function readTime(
  property: IcsProperty,
  fallbackZone: string,
): ReadTime | null {
  const match = DATE_TIME.exec(property.value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const time: (string | undefined)[] = match.slice(4);
  const [hour, minute, second, utc] = time;
  const local: LocalTime = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour ?? 0),
    minute: Number(minute ?? 0),
    second: Number(second ?? 0),
  };
  if (hour === undefined) {
    return {
      local,
      instant: instantOf(local, "UTC"),
      allDay: true,
      zone: "UTC",
    };
  }
  if (utc) {
    const instant = instantOf(local, "UTC");
    return {
      local: localTimeAt(instant, fallbackZone),
      instant,
      allDay: false,
      zone: fallbackZone,
    };
  }
  const tzid = property.params.get("TZID") ?? "";
  const zone = isTimeZone(tzid) ? tzid : fallbackZone;
  return { local, instant: instantOf(local, zone), allDay: false, zone };
}

/** Milliseconds of an iCalendar DURATION; null when it cannot be read. */
function durationMs(value: string) {
  const match = DURATION.exec(value.trim());
  if (!match) return null;
  const groups: (string | undefined)[] = match.slice(1);
  const [sign, weeks, days, hours, minutes, seconds] = groups;
  const total =
    ((Number(weeks ?? 0) * 7 + Number(days ?? 0)) * 86_400 +
      Number(hours ?? 0) * 3600 +
      Number(minutes ?? 0) * 60 +
      Number(seconds ?? 0)) *
    SECOND;
  return sign === "-" ? -total : total;
}

/** The times of a property that can list several, such as EXDATE. */
function readTimes(
  props: readonly IcsProperty[],
  name: string,
  fallbackZone: string,
) {
  return props
    .filter((prop) => prop.name === name)
    .flatMap((prop) =>
      prop.value
        .split(",")
        .map((value) => readTime({ ...prop, value }, fallbackZone)),
    )
    .flatMap((time) => (time ? [time.instant] : []));
}

function repeatOf(
  props: readonly IcsProperty[],
  start: ReadTime,
  startProp: IcsProperty,
  fallbackZone: string,
): IcsRepeat | null {
  const rule = props.find((prop) => prop.name === "RRULE")?.value.trim();
  const dates = readTimes(props, "RDATE", fallbackZone);
  if (!rule && dates.length === 0) return null;
  const utc = !start.allDay && startProp.value.trim().endsWith("Z");
  return {
    rule: rule ?? null,
    dates,
    exceptions: readTimes(props, "EXDATE", fallbackZone),
    local: utc ? localTimeAt(start.instant, "UTC") : start.local,
    zone: utc ? "UTC" : start.zone,
  };
}

function toEvent(props: IcsProperty[], fallbackZone: string): IcsEvent | null {
  const find = (name: string) => props.find((prop) => prop.name === name);
  const has = (name: string) => props.some((prop) => prop.name === name);
  const startProp = find("DTSTART");
  if (!startProp) return null;
  const start = readTime(startProp, fallbackZone);
  if (!start) return null;
  const endProp = find("DTEND");
  let end = endProp ? readTime(endProp, fallbackZone) : null;
  const duration = find("DURATION");
  if (!end && duration) {
    const ms = durationMs(duration.value);
    if (ms !== null) {
      const instant = start.instant + ms;
      end = {
        local: start.allDay
          ? addDays(start.local, Math.round(ms / 86_400_000))
          : localTimeAt(instant, start.zone),
        instant,
        allDay: start.allDay,
        zone: start.zone,
      };
    }
  }
  const text = (name: string) => {
    const prop = find(name);
    return prop ? unescapeIcsText(prop.value) : null;
  };
  const uid = find("UID");
  const recurrenceIdProp = find("RECURRENCE-ID");
  const recurrenceId = recurrenceIdProp
    ? (readTime(recurrenceIdProp, fallbackZone)?.instant ?? null)
    : null;
  const repeat = repeatOf(props, start, startProp, fallbackZone);
  return {
    uid: uid ? uid.value.trim() : null,
    title: text("SUMMARY") ?? "",
    location: text("LOCATION"),
    description: text("DESCRIPTION"),
    allDay: start.allDay,
    start: start.instant,
    end: end?.instant ?? null,
    startLocal: formatLocalTime(start.local, !start.allDay),
    endLocal: end
      ? formatLocalTime(
          start.allDay ? addDays(end.local, -1) : end.local,
          !start.allDay,
        )
      : null,
    timeZone: start.allDay ? null : start.zone,
    endTimeZone: start.allDay || !end ? null : end.zone,
    recurring: repeat !== null || recurrenceIdProp !== undefined,
    repeat,
    recurrenceId,
    hasAttendees: has("ATTENDEE"),
    cancelled: find("STATUS")?.value.trim().toUpperCase() === "CANCELLED",
    sourceMessageId: text(SOURCE_MESSAGE_ID_PROPERTY),
  };
}

/**
 * The events of an iCalendar object, each with the properties of its own
 * VEVENT (not of its alarms). Lines it cannot read are skipped.
 */
export function readIcsEvents(ics: string, fallbackZone: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: IcsProperty[] | null = null;
  let depth = 0;
  for (const line of unfoldIcs(ics)) {
    const property = parseIcsLine(line);
    if (!property) continue;
    if (property.name === "BEGIN") {
      if (property.value.toUpperCase() === "VEVENT" && current === null) {
        current = [];
        depth = 0;
      } else if (current) depth += 1;
      continue;
    }
    if (property.name === "END" && current) {
      if (depth > 0) {
        depth -= 1;
        continue;
      }
      const event = toEvent(current, fallbackZone);
      current = null;
      if (event) events.push(event);
      continue;
    }
    if (current && depth === 0) current.push(property);
  }
  return events;
}
