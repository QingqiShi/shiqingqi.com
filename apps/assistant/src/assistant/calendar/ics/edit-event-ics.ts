import {
  alarmLines,
  timingLines,
  vTimezoneLines,
  zonesOfTiming,
  type EventTiming,
} from "./build-event-ics.ts";
import { formatIcsUtc } from "./instant-of.ts";
import {
  escapeIcsText,
  joinIcs,
  parseIcsLine,
  unescapeIcsText,
  unfoldIcs,
} from "./parse-ics-line.ts";

/** The iCalendar object is not one event that the tools can change. */
export class IcsEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IcsEditError";
  }
}

/** What to change. A field left out stays as it is; null removes it. */
export interface EventEdit {
  title?: string;
  timing?: EventTiming;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  /** Replaces every alarm of the event. */
  alarms?: readonly string[];
  now: Date;
}

/** A property line (`name` null) or a whole component, at one level. */
interface Block {
  name: string | null;
  lines: string[];
}

function componentName(line: string, keyword: "BEGIN" | "END") {
  const property = parseIcsLine(line);
  return property?.name === keyword
    ? property.value.trim().toUpperCase()
    : null;
}

function splitBlocks(lines: readonly string[]): Block[] {
  const blocks: Block[] = [];
  let open: Block | null = null;
  let depth = 0;
  for (const line of lines) {
    if (open) {
      open.lines.push(line);
      if (componentName(line, "BEGIN")) depth += 1;
      else if (componentName(line, "END")) {
        depth -= 1;
        if (depth === 0) open = null;
      }
      continue;
    }
    const begin = componentName(line, "BEGIN");
    if (begin) {
      open = { name: begin, lines: [line] };
      blocks.push(open);
      depth = 1;
    } else {
      blocks.push({ name: null, lines: [line] });
    }
  }
  if (open) throw new IcsEditError(`The ${open.name ?? ""} block has no end.`);
  return blocks;
}

function propertyName(block: Block) {
  return block.name === null ? (parseIcsLine(block.lines[0])?.name ?? "") : "";
}

function tzidOf(block: Block) {
  for (const line of block.lines) {
    const property = parseIcsLine(line);
    if (property?.name === "TZID") return property.value.trim();
  }
  return null;
}

/** The TZIDs that the lines outside VTIMEZONE blocks name. */
function referencedZones(blocks: readonly Block[]) {
  const zones = new Set<string>();
  for (const block of blocks) {
    if (block.name === "VTIMEZONE") continue;
    for (const line of block.lines) {
      const zone = parseIcsLine(line)?.params.get("TZID");
      if (zone) zones.add(zone);
    }
  }
  return zones;
}

function editEvent(event: Block, edit: EventEdit): Block {
  const inner = splitBlocks(event.lines.slice(1, -1));
  const replaced = new Set(["DTSTAMP", "SEQUENCE", "LAST-MODIFIED"]);
  const added: string[] = [];
  const stamp = formatIcsUtc(edit.now.getTime());
  const sequenceLine = inner.find(
    (block) => propertyName(block) === "SEQUENCE",
  );
  const sequence = Number(
    sequenceLine ? parseIcsLine(sequenceLine.lines[0])?.value : 0,
  );
  added.push(
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `SEQUENCE:${String((Number.isInteger(sequence) ? sequence : 0) + 1)}`,
  );
  if (edit.title !== undefined) {
    replaced.add("SUMMARY");
    added.push(`SUMMARY:${escapeIcsText(edit.title)}`);
  }
  if (edit.timing) {
    replaced.add("DTSTART").add("DTEND").add("DURATION");
    added.push(...timingLines(edit.timing));
  }
  const optional = [
    ["LOCATION", edit.location],
    ["DESCRIPTION", edit.description],
  ] as const;
  for (const [name, value] of optional) {
    if (value === undefined) continue;
    replaced.add(name);
    if (value) added.push(`${name}:${escapeIcsText(value)}`);
  }
  if (edit.url !== undefined) {
    replaced.add("URL");
    if (edit.url) added.push(`URL:${edit.url}`);
  }

  const kept = inner.filter((block) =>
    block.name === null
      ? !replaced.has(propertyName(block))
      : !(edit.alarms && block.name === "VALARM"),
  );
  const summary = inner.find((block) => propertyName(block) === "SUMMARY");
  const title =
    edit.title ??
    (summary
      ? unescapeIcsText(parseIcsLine(summary.lines[0])?.value ?? "")
      : "");
  return {
    name: "VEVENT",
    lines: [
      event.lines[0],
      ...kept.filter((block) => block.name === null).flatMap((b) => b.lines),
      ...added,
      ...kept.filter((block) => block.name !== null).flatMap((b) => b.lines),
      ...(edit.alarms ? alarmLines(title, edit.alarms) : []),
      event.lines.at(-1) ?? "END:VEVENT",
    ],
  };
}

/**
 * Changes the one VEVENT of an iCalendar object and keeps every other line
 * as it was: attendees, notes, alarms and the properties of other apps. It
 * raises SEQUENCE and sets DTSTAMP. New times get the VTIMEZONEs they need,
 * and a VTIMEZONE that no line names any more goes.
 */
export function editEventIcs(ics: string, edit: EventEdit): string {
  const lines = unfoldIcs(ics);
  if (
    componentName(lines[0] ?? "", "BEGIN") !== "VCALENDAR" ||
    componentName(lines.at(-1) ?? "", "END") !== "VCALENDAR"
  ) {
    throw new IcsEditError("It is not an iCalendar object.");
  }
  let blocks = splitBlocks(lines.slice(1, -1));
  const events = blocks.filter((block) => block.name === "VEVENT");
  if (events.length !== 1) {
    throw new IcsEditError(
      `It holds ${String(events.length)} events, not one.`,
    );
  }
  const edited = editEvent(events[0], edit);
  blocks = blocks.map((block) => (block === events[0] ? edited : block));
  if (edit.timing) {
    const known = new Set(
      blocks.filter((block) => block.name === "VTIMEZONE").map(tzidOf),
    );
    const missing = zonesOfTiming(edit.timing).filter(
      (zone) => !known.has(zone),
    );
    const timing = edit.timing;
    blocks.splice(
      blocks.indexOf(edited),
      0,
      ...missing.map((zone) => ({
        name: "VTIMEZONE",
        lines: vTimezoneLines([zone], timing),
      })),
    );
    const used = referencedZones(blocks);
    blocks = blocks.filter(
      (block) => block.name !== "VTIMEZONE" || used.has(tzidOf(block) ?? ""),
    );
  }
  return joinIcs([
    lines[0],
    ...blocks.flatMap((block) => block.lines),
    lines.at(-1) ?? "END:VCALENDAR",
  ]);
}
