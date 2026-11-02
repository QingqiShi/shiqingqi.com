import { and, eq } from "drizzle-orm";
import {
  RunCalendars,
  type CalendarDeps,
} from "#src/assistant/agent/calendar/run-calendars.ts";
import { eventsInRange } from "#src/assistant/calendar/ics/events-in-range.ts";
import {
  readIcsEvents,
  type IcsEvent,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { agendaItems } from "#src/assistant/report/agenda-items.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { localDayBounds } from "#src/assistant/report/local-day-bounds.ts";
import type { TodayAgenda } from "./types.ts";

const TIMEOUT_MS = 8000;

/**
 * An all-day event starts at 00:00 UTC of its first day, so a range of
 * instants in another zone also finds the event of the day before or after.
 * Its own dates say if it is on `today`.
 */
function isOn(event: IcsEvent, today: string) {
  if (!event.allDay) return true;
  return (
    event.startLocal <= today && today <= (event.endLocal ?? event.startLocal)
  );
}

async function readAgenda(
  { db, userId }: UserScope,
  now: Date,
  deps: CalendarDeps,
  timeZone: string,
): Promise<TodayAgenda> {
  const calendars = await RunCalendars.open(db, userId, deps);
  if (!calendars.hasAccounts) {
    const waitingForConnect = await db.$count(
      mailAccounts,
      and(eq(mailAccounts.userId, userId), eq(mailAccounts.provider, "icloud")),
    );
    if (waitingForConnect === 0) return { status: "none" };
    throw new Error("The iCloud account needs a new connect");
  }
  const { calendars: list, unavailable } = await calendars.load();
  if (unavailable.length > 0) {
    throw new Error("An iCloud account did not log in");
  }
  const today = localClock(now, timeZone).date;
  const day = localDayBounds(today, timeZone);
  const range = { start: day.start.getTime(), end: day.end.getTime() };
  const objects = await Promise.all(
    list.map(async (calendar) => {
      const session = await calendars.session(calendar);
      return session.listEvents(calendar.url, day);
    }),
  );
  const events = objects
    .flat()
    .flatMap((object) =>
      eventsInRange(readIcsEvents(object.data, timeZone), range),
    )
    .filter((event) => !event.cancelled && isOn(event, today))
    .map((event) => ({
      ...event,
      start: event.startLocal,
      end: event.endLocal,
    }));
  return { status: "ok", items: agendaItems(events, timeZone) };
}

/**
 * Today's events in the owner's zone, read live from the user's own iCloud
 * accounts, for a page view. It logs in once per account, writes nothing to
 * the database, and never throws. Any account or calendar that fails makes
 * the whole result `error`, because an agenda with events missing looks
 * complete. A CalendarSession holds only a login, so there is nothing to close.
 */
export async function readTodayAgenda(
  scope: UserScope,
  now: Date,
  deps: CalendarDeps | null,
  timeZone: string,
): Promise<TodayAgenda> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!deps) throw new Error("The credential key is missing");
    return await Promise.race([
      readAgenda(scope, now, deps, timeZone),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("The calendar took too long"));
        }, TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error(
      "Reading today's calendar failed",
      error instanceof Error ? error.message : String(error),
    );
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
}
