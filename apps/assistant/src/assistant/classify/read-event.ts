import type { ClassifyOutput } from "./classify-prompt.ts";
import type { MailEvent } from "./types.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isRealDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The due date that the model returned, when it is a real `YYYY-MM-DD` date. */
export function readDueDate(raw: string | null): string | null {
  const value = raw?.trim() ?? "";
  return DATE.test(value) && isRealDate(value) ? value : null;
}

/**
 * Checks the event that the model returned. An event whose start is not a
 * real date or time in the form its `allDay` asks for is dropped; an end in
 * another form, or before the start, is dropped. A timed event without a
 * known time zone takes the user's and becomes `unsure`.
 */
export function readEvent(
  raw: ClassifyOutput["event"],
  userTimeZone: string,
): MailEvent | null {
  if (!raw) return null;
  const form = raw.allDay ? DATE : LOCAL_TIME;
  const start = raw.start.trim();
  if (!form.test(start) || !isRealDate(start)) return null;
  const title = raw.title.trim();
  if (title === "") return null;
  const rawEnd = raw.end?.trim() ?? null;
  const end =
    rawEnd !== null &&
    form.test(rawEnd) &&
    isRealDate(rawEnd) &&
    rawEnd >= start
      ? rawEnd
      : null;
  const zone = raw.timeZone?.trim() ?? "";
  const hasZone = zone !== "" && isTimeZone(zone);
  return {
    kind: raw.kind,
    change: raw.change,
    title,
    start,
    end,
    allDay: raw.allDay,
    timeZone: hasZone ? zone : userTimeZone,
    location: raw.location?.trim() || null,
    certainty: !hasZone && !raw.allDay ? "unsure" : raw.certainty,
  };
}
