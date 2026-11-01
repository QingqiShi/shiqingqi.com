import { instantOf, isTimeZone, type LocalTime } from "./instant-of.ts";

/** A VEVENT of another calendar, as far as the duplicate check needs it. */
export interface IcsEvent {
  uid: string | null;
  title: string;
  /** For an all-day event, the instant of its date at 00:00 UTC. */
  start: number;
  end: number | null;
  allDay: boolean;
  /** `YYYY-MM-DD` of the start, for an all-day event. */
  startDate: string | null;
}

interface Property {
  name: string;
  params: Map<string, string>;
  value: string;
}

function unfold(ics: string) {
  return ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function parseProperty(line: string): Property | null {
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') inQuotes = !inQuotes;
    if (char === ":" && !inQuotes) {
      const [name, ...rawParams] = line.slice(0, index).split(";");
      const params = new Map(
        rawParams.map((param) => {
          const [key, value = ""] = param.split("=");
          return [key.toUpperCase(), value.replace(/^"|"$/g, "")];
        }),
      );
      return { name: name.toUpperCase(), params, value: line.slice(index + 1) };
    }
  }
  return null;
}

function unescapeText(value: string) {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === "n" || char === "N" ? "\n" : char,
  );
}

const DATE_TIME = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

/**
 * The instant of a DTSTART or DTEND. A time with an unknown TZID, or with
 * none, is read in `fallbackZone`.
 */
function readTime(property: Property, fallbackZone: string) {
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
      instant: instantOf(local, "UTC"),
      allDay: true,
      date: `${year}-${month}-${day}`,
    };
  }
  const tzid = property.params.get("TZID") ?? "";
  const zone = utc ? "UTC" : isTimeZone(tzid) ? tzid : fallbackZone;
  return { instant: instantOf(local, zone), allDay: false, date: null };
}

/** The events of an iCalendar object. Lines it cannot read are skipped. */
export function readIcsEvents(ics: string, fallbackZone: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Property[] | null = null;
  let depth = 0;
  for (const line of unfold(ics)) {
    const property = parseProperty(line);
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
      const props = current;
      current = null;
      const find = (name: string) => props.find((prop) => prop.name === name);
      const startProp = find("DTSTART");
      const start = startProp ? readTime(startProp, fallbackZone) : null;
      if (!start) continue;
      const endProp = find("DTEND");
      const end = endProp ? readTime(endProp, fallbackZone) : null;
      const summary = find("SUMMARY");
      const uid = find("UID");
      events.push({
        uid: uid ? uid.value.trim() : null,
        title: summary ? unescapeText(summary.value) : "",
        start: start.instant,
        end: end?.instant ?? null,
        allDay: start.allDay,
        startDate: start.date,
      });
      continue;
    }
    if (current && depth === 0) current.push(property);
  }
  return events;
}
