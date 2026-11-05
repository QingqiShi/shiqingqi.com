import {
  spanOfTiming,
  type EventTiming,
} from "#src/assistant/calendar/ics/build-event-ics.ts";
import {
  addDays,
  addMinutes,
  instantOf,
  isLocalTimeText,
  isTimeZone,
  parseLocalTime,
} from "#src/assistant/calendar/ics/instant-of.ts";
import { ToolRefusal } from "../agent-tool.ts";

const DEFAULT_MINUTES = 60;

type TimeInput = {
  start: string;
  end?: string;
  allDay: boolean;
  timeZone?: string;
  endTimeZone?: string;
};

function zoneOf(value: string | undefined, fallback: string) {
  if (value === undefined) return fallback;
  if (!isTimeZone(value)) {
    throw new ToolRefusal(
      `"${value}" is not an IANA time zone, such as Europe/London.`,
    );
  }
  return value;
}

/** The timing of the input; a refusal for a time that cannot be read or an end before the start. */
export function timingOf(input: TimeInput, ownerZone: string): EventTiming {
  const form = input.allDay ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm";
  for (const value of [input.start, input.end]) {
    if (value !== undefined && !isLocalTimeText(value, !input.allDay)) {
      throw new ToolRefusal(`"${value}" is not a time in the form ${form}.`);
    }
  }
  const start = parseLocalTime(input.start);
  if (input.allDay) {
    const last = input.end ? parseLocalTime(input.end) : start;
    const endDate = addDays(last, 1);
    if (instantOf(endDate, "UTC") <= instantOf(start, "UTC")) {
      throw new ToolRefusal("The last day is before the first day.");
    }
    return { allDay: true, startDate: start, endDate };
  }
  const timeZone = zoneOf(input.timeZone, ownerZone);
  const endTimeZone = zoneOf(input.endTimeZone, timeZone);
  const end = input.end
    ? parseLocalTime(input.end)
    : addMinutes(start, DEFAULT_MINUTES);
  const timing: EventTiming = {
    allDay: false,
    start,
    end,
    timeZone,
    endTimeZone,
  };
  const span = spanOfTiming(timing);
  if (span.end <= span.start) {
    throw new ToolRefusal("The end is not after the start.");
  }
  return timing;
}

export function hasTimeChange(input: Partial<TimeInput>) {
  return (
    input.start !== undefined ||
    input.end !== undefined ||
    input.allDay !== undefined ||
    input.timeZone !== undefined ||
    input.endTimeZone !== undefined
  );
}
