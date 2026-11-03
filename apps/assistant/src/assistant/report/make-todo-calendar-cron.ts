import type { CalendarDeps } from "#src/assistant/agent/calendar/run-calendars.ts";
import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import { freeSlotsOfClosedTodos } from "./todo-calendar-slots.ts";

/** The run starts no new user after this; the function may run 60 s. */
const FREE_SLOTS_BUDGET_MS = 40_000;

interface FreeSlotTotals {
  users: number;
  failedUsers: number;
  freed: number;
  changed: number;
  unreachable: number;
}

/**
 * The 15-minute cron: frees the time on the calendar that closed and deleted
 * to-dos still hold. It covers a calendar that gave no answer when the owner
 * closed the to-do, and each to-do that the report agent closed.
 */
export function makeTodoCalendarCron(
  dependencies: UserCronDependencies & {
    getCalendarDeps: () => CalendarDeps | null;
  },
) {
  return makeUserCronHandler<FreeSlotTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getCalendarDeps() !== null,
    },
    {
      budgetMs: FREE_SLOTS_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        failedUsers: 0,
        freed: 0,
        changed: 0,
        unreachable: 0,
      }),
      runUser: async ({ db, userId, now, totals }) => {
        const outcomes = await freeSlotsOfClosedTodos(
          { db, userId },
          dependencies.getCalendarDeps(),
          now,
        );
        for (const { outcome } of outcomes) totals[outcome] += 1;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
