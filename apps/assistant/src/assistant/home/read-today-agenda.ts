import { and, eq } from "drizzle-orm";
import {
  readDayEvents,
  withinTime,
} from "#src/assistant/agent/calendar/read-day-events.ts";
import {
  RunCalendars,
  type CalendarDeps,
} from "#src/assistant/agent/calendar/run-calendars.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { agendaItems } from "#src/assistant/report/agenda-items.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import type { TodayAgenda } from "./types.ts";

const TIMEOUT_MS = 8000;

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
  const events = await readDayEvents(
    calendars,
    localClock(now, timeZone).date,
    timeZone,
  );
  return { status: "ok", items: agendaItems(events, timeZone) };
}

/**
 * Today's events in the owner's zone, read live from the user's own iCloud
 * accounts, for a page view. It logs in once per account, writes nothing to
 * the database, and never throws. Any account or calendar that fails makes
 * the whole result `error`. A CalendarSession holds only a login, so there is
 * nothing to close.
 */
export async function readTodayAgenda(
  scope: UserScope,
  now: Date,
  deps: CalendarDeps | null,
  timeZone: string,
): Promise<TodayAgenda> {
  try {
    if (!deps) throw new Error("The credential key is missing");
    return await withinTime(readAgenda(scope, now, deps, timeZone), TIMEOUT_MS);
  } catch (error) {
    console.error(
      "Reading today's calendar failed",
      error instanceof Error ? error.message : String(error),
    );
    return { status: "error" };
  }
}
