import type { EventChange } from "#src/assistant/classify/types.ts";
import type { CalendarEntry } from "./ics/entry-of-event.ts";
import { localTimeAt } from "./ics/instant-of.ts";
import type { IcsEvent } from "./ics/read-ics-events.ts";

/** An event the app wrote earlier in the same thread. */
export interface ThreadEvent {
  id: string;
  cancelled: boolean;
}

export type CalendarPlan =
  | { action: "create" }
  | { action: "update"; eventId: string }
  | { action: "delete"; eventId: string }
  | { action: "skip"; result: "unmatched" | "past" };

/**
 * What to do with the event of one mail. A cancel deletes the thread's
 * event; any other change updates it, or makes a new one when the thread
 * has none. An event that is over gets nothing.
 */
export function planCalendarWrite({
  change,
  endsAt,
  now,
  threadEvent,
}: {
  change: EventChange;
  /** When the event ends, epoch milliseconds. */
  endsAt: number;
  now: Date;
  threadEvent: ThreadEvent | null;
}): CalendarPlan {
  const live = threadEvent && !threadEvent.cancelled ? threadEvent : null;
  if (change === "cancel") {
    return live
      ? { action: "delete", eventId: live.id }
      : { action: "skip", result: "unmatched" };
  }
  if (endsAt <= now.getTime()) return { action: "skip", result: "past" };
  return live ? { action: "update", eventId: live.id } : { action: "create" };
}

const SAME_TIME_MS = 5 * 60 * 1000;
const PREFIXES = /^(?:待办[:：]\s*|to do:\s*)/i;
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "you",
  "our",
  "from",
  "booking",
  "booked",
  "confirmed",
  "confirmation",
  "reservation",
  "appointment",
  "invitation",
  "event",
  "meeting",
]);

function normalise(title: string) {
  return title.normalize("NFKC").toLowerCase().trim().replace(PREFIXES, "");
}

function tokensOf(title: string) {
  const tokens = new Set<string>();
  for (const word of title.match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (/\p{Script=Han}/u.test(word)) {
      const chars = Array.from(word);
      for (let index = 0; index + 1 < chars.length; index += 1) {
        tokens.add(chars[index] + chars[index + 1]);
      }
    } else if (word.length >= 3 && !STOP_WORDS.has(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

/** True when two titles likely name one thing: one holds the other, or they share a word. */
export function titlesMatch(a: string, b: string) {
  const left = normalise(a);
  const right = normalise(b);
  if (left.length < 2 || right.length < 2) return false;
  if (left.includes(right) || right.includes(left)) return true;
  const tokens = tokensOf(left);
  return [...tokensOf(right)].some((token) => tokens.has(token));
}

function dateIn(epoch: number, timeZone: string) {
  const local = localTimeAt(epoch, timeZone);
  return `${String(local.year).padStart(4, "0")}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

function startDateOfEntry(entry: CalendarEntry) {
  const { timing } = entry;
  const local = timing.allDay ? timing.startDate : timing.start;
  return `${String(local.year).padStart(4, "0")}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

/**
 * True when a calendar already holds the entry: such as an invitation that
 * the user accepted. Timed events must start within 5 minutes of each other;
 * when either is all-day, they must start on the same day. The titles must
 * match in both cases.
 */
export function isDuplicate(
  entry: CalendarEntry,
  entryStart: number,
  other: IcsEvent,
  /** The user's zone: the day of a timed event next to an all-day entry. */
  userTimeZone: string,
) {
  if (!titlesMatch(entry.title, other.title)) return false;
  const { timing } = entry;
  if (!timing.allDay && !other.allDay) {
    return Math.abs(other.start - entryStart) <= SAME_TIME_MS;
  }
  const zone = timing.allDay ? userTimeZone : timing.timeZone;
  const otherDate = other.startDate ?? dateIn(other.start, zone);
  return otherDate === startDateOfEntry(entry);
}
