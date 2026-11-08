import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";
import {
  RunCalendars,
  type CalendarDeps,
} from "#src/assistant/agent/calendar/run-calendars.ts";
import { mailAccounts, todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import { ownTodo } from "./own-todo.ts";
import {
  CALENDAR_TIMEOUT_MS,
  deleteIfUnchanged,
  NO_SLOT,
} from "./todo-calendar-slots.ts";

/** Why a close or a delete did not happen. The to-dos stay as they were. */
export type CloseFailure = "calendar-unreachable" | "calendar-disconnected";

/** Thrown in a transaction, so that the transaction rolls back. */
export class CloseFailed extends Error {
  readonly failure: CloseFailure;

  constructor(failure: CloseFailure) {
    super(`A to-do's slot was not freed: ${failure}`);
    this.name = "CloseFailed";
    this.failure = failure;
  }
}

/** True when only a new connect can fix the login: the server refused it, or no password is stored. */
function refusedLogin(error: string) {
  return (
    error.startsWith("Invalid credentials") ||
    error.includes("no app-specific password")
  );
}

async function withinCalendarTime(
  work: (timedOut: () => boolean) => Promise<void>,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let over = false;
  try {
    await Promise.race([
      work(() => over),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          over = true;
          reject(new CloseFailed("calendar-unreachable"));
        }, CALENDAR_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    if (error instanceof CloseFailed) throw error;
    console.error(
      "Freeing a to-do's slot failed",
      error instanceof Error ? error.message : String(error),
    );
    throw new CloseFailed("calendar-unreachable");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Frees the slots to come of these to-dos, as part of their close or delete in
 * `tx`. It deletes each event and then takes the slot off the row. An event that
 * changed in the calendar stays there, and the row lets it go. A slot that has
 * begun stays as a record of the time. It throws `CloseFailed` when an event
 * cannot be deleted, so that `tx` rolls back. Gives the ids whose event it deleted.
 */
export async function freeSlotsOf(
  tx: AssistantDb,
  userId: string,
  calendar: CalendarDeps | null,
  ids: readonly string[],
  now: Date,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await tx
    .select({
      id: todos.id,
      accountId: todos.calendarAccountId,
      address: mailAccounts.address,
      href: todos.calendarHref,
      etag: todos.calendarEtag,
    })
    .from(todos)
    .leftJoin(mailAccounts, eq(mailAccounts.id, todos.calendarAccountId))
    .where(
      and(
        eq(todos.userId, userId),
        inArray(todos.id, [...ids]),
        isNotNull(todos.calendarAccountId),
        gt(todos.calendarStart, now),
      ),
    )
    .for("update", { of: todos });
  if (rows.length === 0) return [];
  if (!calendar) throw new CloseFailed("calendar-disconnected");
  const freed: string[] = [];
  await withinCalendarTime(async (timedOut) => {
    const { sessions, unavailable } = await (
      await RunCalendars.open(tx, userId, calendar)
    ).load();
    for (const { id, accountId, address, href, etag } of rows) {
      const session = accountId ? sessions.get(accountId) : undefined;
      if (!session || !href) {
        const failed = unavailable.find((entry) => entry.address === address);
        throw new CloseFailed(
          failed && !refusedLogin(failed.error)
            ? "calendar-unreachable"
            : "calendar-disconnected",
        );
      }
      if (timedOut()) return;
      if ((await deleteIfUnchanged(session, href, etag)) === "freed") {
        freed.push(id);
      }
    }
  });
  await tx
    .update(todos)
    .set(NO_SLOT)
    .where(
      and(
        eq(todos.userId, userId),
        inArray(
          todos.id,
          rows.map(({ id }) => id),
        ),
      ),
    );
  return freed;
}

/** Runs a transaction that frees slots, and gives the failure in place of a throw. */
export async function orCloseFailure<T>(
  work: Promise<T>,
): Promise<T | CloseFailure> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof CloseFailed) return error.failure;
    throw error;
  }
}

/** A to-do that comes back no longer teaches the report anything. */
export const notDeleted = {
  deletedAt: null,
  rejectedAt: null,
  rejectionNote: null,
  addUndoneAt: null,
};

/** Locks these to-dos for the transaction. */
function lockTodos(
  tx: Pick<AssistantDb, "select">,
  scope: UserScope,
  ids: readonly string[],
) {
  return tx
    .select({ id: todos.id, doneAt: todos.doneAt })
    .from(todos)
    .where(and(ownTodo(scope), inArray(todos.id, [...ids])))
    .for("update");
}

/**
 * Closes many to-dos and frees their slots, all or none. It gives back those
 * that it closed, because one that is done already must stay done after an
 * undo, and those whose event it deleted. False when the user lacks one of them.
 */
export function closeTodos(
  scope: UserScope,
  calendar: CalendarDeps | null,
  ids: readonly string[],
  now: Date,
): Promise<{ closed: string[]; freed: string[] } | false | CloseFailure> {
  return orCloseFailure(
    scope.db.transaction(async (tx) => {
      const rows = await lockTodos(tx, scope, ids);
      if (rows.length !== ids.length) return false;
      const closed = rows
        .filter((row) => row.doneAt === null)
        .map((row) => row.id);
      const freed = await freeSlotsOf(tx, scope.userId, calendar, closed, now);
      await tx
        .update(todos)
        .set({ doneAt: now, updatedAt: now })
        .where(and(ownTodo(scope), inArray(todos.id, closed)));
      return { closed, freed };
    }),
  );
}

/** Opens many to-dos again, all or none. False when the user lacks one of them. */
export async function reopenTodos(
  scope: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const rows = await lockTodos(tx, scope, ids);
    if (rows.length !== ids.length) return false;
    await tx
      .update(todos)
      .set({ doneAt: null, doneReason: null, updatedAt: now })
      .where(
        and(
          ownTodo(scope),
          inArray(
            todos.id,
            rows.filter((row) => row.doneAt !== null).map((row) => row.id),
          ),
        ),
      );
    return true;
  });
}

/**
 * Hides many to-dos and frees their slots, all or none. Gives back those whose
 * event it deleted. False when the user lacks one of them.
 */
export function deleteTodos(
  scope: UserScope,
  calendar: CalendarDeps | null,
  ids: readonly string[],
  now: Date,
): Promise<{ freed: string[] } | false | CloseFailure> {
  return orCloseFailure(
    scope.db.transaction(async (tx) => {
      const rows = await lockTodos(tx, scope, ids);
      if (rows.length !== ids.length) return false;
      const freed = await freeSlotsOf(tx, scope.userId, calendar, ids, now);
      await tx
        .update(todos)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(ownTodo(scope), inArray(todos.id, [...ids])));
      return { freed };
    }),
  );
}

/** Brings many deleted to-dos back. False when the user has none of them. */
export async function restoreTodos(
  { db, userId }: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<boolean> {
  const restored = await db
    .update(todos)
    .set({ ...notDeleted, updatedAt: now })
    .where(
      and(
        eq(todos.userId, userId),
        inArray(todos.id, [...ids]),
        isNotNull(todos.deletedAt),
      ),
    )
    .returning({ id: todos.id });
  return restored.length > 0;
}

/**
 * Says that the report should not have added these deleted to-dos, all or none.
 * False when one of them is not a deleted to-do of the report's.
 */
export async function rejectTodos(
  { db, userId }: UserScope,
  ids: readonly string[],
  note: string | null,
  now: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rejectable = and(
      eq(todos.userId, userId),
      inArray(todos.id, [...ids]),
      isNotNull(todos.deletedAt),
      eq(todos.createdBy, "report"),
    );
    const rows = await tx
      .select({ id: todos.id })
      .from(todos)
      .where(rejectable)
      .for("update");
    if (rows.length !== ids.length) return false;
    await tx
      .update(todos)
      .set({ rejectedAt: now, rejectionNote: note, updatedAt: now })
      .where(rejectable);
    return true;
  });
}
