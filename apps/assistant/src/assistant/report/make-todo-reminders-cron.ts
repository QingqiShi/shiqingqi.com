import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import type { PushSender } from "#src/assistant/push/get-push-sender.ts";
import { sendTodoReminders } from "./send-todo-reminders.ts";

/** The run claims no new reminder after this; the function may run 60 s. */
const REMINDERS_BUDGET_MS = 50_000;

interface ReminderTotals {
  users: number;
  failedUsers: number;
  reminders: number;
  sent: number;
  removedDevices: number;
  failedSends: number;
}

/** The 5-minute cron: sends each user's to-do reminders that are due. */
export function makeTodoRemindersCron(
  dependencies: UserCronDependencies & {
    /** Null when the VAPID keys are not set: then reminders stay unsent. */
    getPushSender: () => PushSender | null;
  },
) {
  return makeUserCronHandler<ReminderTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getPushSender() !== null,
    },
    {
      budgetMs: REMINDERS_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        failedUsers: 0,
        reminders: 0,
        sent: 0,
        removedDevices: 0,
        failedSends: 0,
      }),
      runUser: async ({ db, userId, now, totals, endsAt }) => {
        const send = dependencies.getPushSender();
        if (!send) return;
        const result = await sendTodoReminders(
          { db, userId },
          { send, now, clock: dependencies.now, endsAt },
        );
        totals.reminders += result.reminders;
        totals.sent += result.sent;
        totals.removedDevices += result.removed;
        totals.failedSends += result.failed;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
