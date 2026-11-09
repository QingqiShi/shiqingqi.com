import { and, eq, gt, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import {
  RunCalendars,
  type CalendarDeps,
  type RunCalendar,
} from "#src/assistant/agent/calendar/run-calendars.ts";
import { CalendarRequestError } from "#src/assistant/calendar/caldav/calendar-request-error.ts";
import type { CalendarSession } from "#src/assistant/calendar/caldav/types.ts";
import {
  ASSISTANT_UID_DOMAIN,
  buildEventIcs,
  type EventTiming,
} from "#src/assistant/calendar/ics/build-event-ics.ts";
import {
  editEventIcs,
  IcsEditError,
} from "#src/assistant/calendar/ics/edit-event-ics.ts";
import { localTimeAt } from "#src/assistant/calendar/ics/instant-of.ts";
import { readIcsEvents } from "#src/assistant/calendar/ics/read-ics-events.ts";
import { mailAccounts, todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { ownTodo } from "./own-todo.ts";
import { readReportSettings } from "./read-report-settings.ts";

/** The longest that one owner's action waits for the calendar. The to-do's own change is stored by then. */
const CALENDAR_TIMEOUT_MS = 20_000;

/** A time that the owner sets aside. */
export interface SlotTime {
  start: Date;
  end: Date;
}

/** What became of the event of a to-do that is over. */
export type SlotOutcome = "freed" | "changed" | "unreachable";

/** Why a write of a slot did not happen. The to-do stays as it was, and only `gone` takes its slot away. */
export type SlotRefusal =
  | "not-found"
  | "no-calendar"
  | "calendar-unreachable"
  | "calendar-changed"
  | "calendar-gone"
  | "has-slot"
  | "no-slot"
  | "slot-over";

const slotColumns = {
  id: todos.id,
  title: todos.title,
  detail: todos.detail,
  sourceMessageId: todos.sourceMessageId,
  doneAt: todos.doneAt,
  accountId: todos.calendarAccountId,
  calendarUrl: todos.calendarUrl,
  href: todos.calendarHref,
  etag: todos.calendarEtag,
  start: todos.calendarStart,
};

/** The columns of a to-do that holds no time. */
const NO_SLOT = {
  calendarAccountId: null,
  calendarUrl: null,
  calendarHref: null,
  calendarEtag: null,
  calendarStart: null,
  calendarEnd: null,
};

type Deps = CalendarDeps | null;

class CalendarUnreachable extends Error {
  constructor() {
    super("The calendar did not answer");
    this.name = "CalendarUnreachable";
  }
}

function isStatus(error: unknown, status: number) {
  return error instanceof CalendarRequestError && error.status === status;
}

/** Runs work on the calendar, for one request of the owner. Any failure on the way counts as no answer. */
async function reach<T>(work: () => Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new CalendarUnreachable());
        }, CALENDAR_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error(
      "A to-do's calendar write failed",
      error instanceof Error ? error.message : String(error),
    );
    return "calendar-unreachable" as const;
  } finally {
    clearTimeout(timer);
  }
}

/** A login to the user's own iCloud accounts, with the session of each that answered. */
async function openCalendars({ db, userId }: UserScope, deps: Deps) {
  if (!deps) throw new CalendarUnreachable();
  const calendars = await RunCalendars.open(db, userId, deps);
  return calendars.load();
}

async function sessionOf(
  scope: UserScope,
  deps: Deps,
  accountId: string,
): Promise<CalendarSession> {
  const session = (await openCalendars(scope, deps)).sessions.get(accountId);
  if (!session) throw new CalendarUnreachable();
  return session;
}

/** The time in the owner's zone, as the calendar shows it. */
function timingOf({ start, end }: SlotTime, timeZone: string): EventTiming {
  return {
    allDay: false,
    start: localTimeAt(start.getTime(), timeZone),
    end: localTimeAt(end.getTime(), timeZone),
    timeZone,
    endTimeZone: timeZone,
  };
}

function readSlot(scope: UserScope, todoId: string) {
  return scope.db
    .select(slotColumns)
    .from(todos)
    .where(and(ownTodo(scope), eq(todos.id, todoId)))
    .then((rows) => rows.at(0));
}

/** Takes the slot off a to-do, whether or not it is deleted, when it still names this event. */
function clearSlot({ db, userId }: UserScope, todoId: string, href: string) {
  return db
    .update(todos)
    .set(NO_SLOT)
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.id, todoId),
        eq(todos.calendarHref, href),
      ),
    );
}

/** The calendar of a new slot: the default one, else the first that is the owner's alone. */
function calendarForNewSlot(calendars: readonly RunCalendar[]) {
  return (
    calendars.find((calendar) => calendar.isDefault) ??
    calendars.find((calendar) => !calendar.shared)
  );
}

/**
 * Makes the event. An earlier try of this request can have made it and lost the
 * answer, and then the same name finds it, so a retry makes no second event.
 */
async function createOrFind(
  session: CalendarSession,
  calendarUrl: string,
  name: string,
  data: string,
) {
  try {
    const created = await session.createEvent(calendarUrl, `${name}.ics`, data);
    return created.etag !== null
      ? created
      : {
          url: created.url,
          etag: (await session.getEvent(created.url))?.etag ?? null,
        };
  } catch (error) {
    if (!isStatus(error, 412)) throw error;
    const url = new URL(`${name}.ics`, calendarUrl).href;
    const found = await session.getEvent(url);
    if (!found) throw error;
    return { url, etag: found.etag };
  }
}

/** Puts time for an open to-do on the default calendar. `name` is made by the page, so that a retry names the same event. */
async function addSlot(
  scope: UserScope,
  deps: Deps,
  todoId: string,
  { name, ...time }: SlotTime & { name: string },
  now: Date,
): Promise<{ calendar: string | null } | SlotRefusal> {
  if (time.end <= now) return "slot-over";
  const open = and(ownTodo(scope), eq(todos.id, todoId), isNull(todos.doneAt));
  const row = (await scope.db.select(slotColumns).from(todos).where(open)).at(
    0,
  );
  if (!row) return "not-found";
  if (row.accountId) {
    return row.href?.endsWith(`/${name}.ics`) ? { calendar: null } : "has-slot";
  }
  const { timeZone } = await readReportSettings(scope);
  return reach(async () => {
    const { calendars, sessions, unavailable } = await openCalendars(
      scope,
      deps,
    );
    const calendar = calendarForNewSlot(calendars);
    const session = calendar && sessions.get(calendar.accountId);
    if (!session) {
      return unavailable.length > 0 ? "calendar-unreachable" : "no-calendar";
    }
    const created = await createOrFind(
      session,
      calendar.url,
      name,
      buildEventIcs({
        uid: `${name}${ASSISTANT_UID_DOMAIN}`,
        title: row.title,
        timing: timingOf(time, timeZone),
        location: null,
        description: row.detail,
        url: null,
        sourceMessageId: row.sourceMessageId,
        alarms: [],
        now,
      }),
    );
    const stored = await scope.db
      .update(todos)
      .set({
        calendarAccountId: calendar.accountId,
        calendarUrl: calendar.url,
        calendarHref: created.url,
        calendarEtag: created.etag,
        calendarStart: time.start,
        calendarEnd: time.end,
        updatedAt: now,
      })
      .where(and(open, isNull(todos.calendarAccountId)))
      .returning({ id: todos.id });
    if (stored.length > 0) return { calendar: calendar.name };
    await session.deleteEvent(created.url, created.etag);
    return "not-found";
  });
}

/** One event with an end, and no rule or attendees: the app can move it without a word to other people. */
function plainEventIn(ics: string, timeZone: string) {
  const events = readIcsEvents(ics, timeZone);
  const event = events.at(0);
  return events.length === 1 &&
    event &&
    !event.allDay &&
    event.end !== null &&
    !event.recurring &&
    !event.hasAttendees
    ? { start: event.start, end: event.end }
    : null;
}

/** Moves the event of an open to-do, and refuses when it is not as the app left it. The title follows the to-do. */
async function moveSlot(
  scope: UserScope,
  deps: Deps,
  todoId: string,
  time: SlotTime,
  now: Date,
): Promise<SlotRefusal | null> {
  if (time.end <= now) return "slot-over";
  const row = await readSlot(scope, todoId);
  if (!row || row.doneAt) return "not-found";
  if (!row.accountId || !row.href) return "no-slot";
  const { accountId, href, etag } = row;
  const { timeZone } = await readReportSettings(scope);
  return reach(async () => {
    const session = await sessionOf(scope, deps, accountId);
    const found = await session.getEvent(href);
    if (!found) {
      await clearSlot(scope, todoId, href);
      return "calendar-gone";
    }
    if (
      etag === null ||
      found.etag !== etag ||
      !plainEventIn(found.data, timeZone)
    ) {
      return "calendar-changed";
    }
    let written: { etag: string | null };
    try {
      written = await session.updateEvent(
        href,
        editEventIcs(found.data, {
          title: row.title,
          timing: timingOf(time, timeZone),
          now,
        }),
        etag,
      );
    } catch (error) {
      if (error instanceof IcsEditError || isStatus(error, 412)) {
        return "calendar-changed";
      }
      if (isStatus(error, 404)) {
        await clearSlot(scope, todoId, href);
        return "calendar-gone";
      }
      throw error;
    }
    await scope.db
      .update(todos)
      .set({
        calendarEtag:
          written.etag ?? (await session.getEvent(href))?.etag ?? null,
        calendarStart: time.start,
        calendarEnd: time.end,
        updatedAt: now,
      })
      .where(
        and(ownTodo(scope), eq(todos.id, todoId), eq(todos.calendarHref, href)),
      );
    return null;
  });
}

/**
 * Deletes the event only when it is as the app left it. A session deletes with
 * no condition when it gets no etag, so a row with no etag counts as changed.
 */
async function deleteIfUnchanged(
  session: CalendarSession,
  href: string,
  etag: string | null,
): Promise<"freed" | "changed"> {
  if (etag === null) return "changed";
  try {
    await session.deleteEvent(href, etag);
    return "freed";
  } catch (error) {
    if (!isStatus(error, 412)) throw error;
    return (await session.getEvent(href)) ? "changed" : "freed";
  }
}

/** Takes the event off the calendar, and refuses when it is not as the app left it. An event that is gone counts as done. */
async function removeSlot(
  scope: UserScope,
  deps: Deps,
  todoId: string,
): Promise<SlotRefusal | null> {
  const row = await readSlot(scope, todoId);
  if (!row) return "not-found";
  if (!row.accountId || !row.href) return "no-slot";
  const { accountId, href, etag } = row;
  return reach(async () => {
    const session = await sessionOf(scope, deps, accountId);
    if ((await deleteIfUnchanged(session, href, etag)) === "changed") {
      return "calendar-changed";
    }
    await clearSlot(scope, todoId, href);
    return null;
  });
}

/**
 * The owner takes what the calendar holds now, after a write found the event
 * changed. A later write sends the new etag. An event that the app cannot move
 * any more, such as one that now has attendees, stays there and leaves the to-do.
 */
async function adoptSlot(
  scope: UserScope,
  deps: Deps,
  todoId: string,
  now: Date,
): Promise<SlotRefusal | null> {
  const row = await readSlot(scope, todoId);
  if (!row) return "not-found";
  if (!row.accountId || !row.href) return "no-slot";
  const { accountId, href } = row;
  const { timeZone } = await readReportSettings(scope);
  return reach(async () => {
    const session = await sessionOf(scope, deps, accountId);
    const found = await session.getEvent(href);
    const event = found && plainEventIn(found.data, timeZone);
    if (!event) {
      await clearSlot(scope, todoId, href);
      return found ? null : "calendar-gone";
    }
    await scope.db
      .update(todos)
      .set({
        calendarEtag: found.etag,
        calendarStart: new Date(event.start),
        calendarEnd: new Date(event.end),
        updatedAt: now,
      })
      .where(
        and(ownTodo(scope), eq(todos.id, todoId), eq(todos.calendarHref, href)),
      );
    return null;
  });
}

type SlotRow = NonNullable<Awaited<ReturnType<typeof readSlot>>>;

/**
 * Takes these to-dos' events off the calendar, each with the etag the app knows.
 * An event that changed is the owner's now: it stays, and the to-do lets it go.
 * This never throws, because the to-do's own change is stored already. A row
 * with no answer keeps its slot, and `freeSlotsOfClosedTodos` tries it again.
 */
async function freeEvents(
  scope: UserScope,
  deps: Deps,
  rows: readonly SlotRow[],
): Promise<{ id: string; outcome: SlotOutcome }[]> {
  if (rows.length === 0) return [];
  const outcomes = new Map<string, SlotOutcome>();
  await reach(async () => {
    const { sessions } = await openCalendars(scope, deps);
    for (const { id, accountId, href, etag } of rows) {
      const session = accountId ? sessions.get(accountId) : undefined;
      if (!session || !href) continue;
      outcomes.set(id, await deleteIfUnchanged(session, href, etag));
      await clearSlot(scope, id, href);
    }
  });
  return rows.map(({ id }) => ({
    id,
    outcome: outcomes.get(id) ?? "unreachable",
  }));
}

/**
 * Frees the time that closed and deleted to-dos still hold in the future. A slot
 * that has begun stays as a record of the time spent. Only rows with such a slot
 * need a login. With `todoIds`, it looks at those to-dos only.
 */
export async function freeSlotsOfClosedTodos(
  scope: UserScope,
  deps: Deps,
  now: Date,
  todoIds?: readonly string[],
) {
  const rows = await scope.db
    .select(slotColumns)
    .from(todos)
    .where(
      and(
        eq(todos.userId, scope.userId),
        isNotNull(todos.calendarAccountId),
        gt(todos.calendarStart, now),
        or(isNotNull(todos.doneAt), isNotNull(todos.deletedAt)),
        todoIds ? inArray(todos.id, [...todoIds]) : undefined,
      ),
    );
  return freeEvents(scope, deps, rows);
}

/** True when the owner can put a to-do on a calendar. */
export async function hasCalendarAccount({ db, userId }: UserScope) {
  const accounts = await db.$count(
    mailAccounts,
    and(
      eq(mailAccounts.userId, userId),
      eq(mailAccounts.provider, "icloud"),
      ne(mailAccounts.status, "reconnect"),
    ),
  );
  return accounts > 0;
}

/** What the owner can do with the time a to-do holds. Each takes the user from the session. */
export const todoCalendarSlots = {
  add: addSlot,
  move: moveSlot,
  remove: removeSlot,
  adopt: adoptSlot,
};
