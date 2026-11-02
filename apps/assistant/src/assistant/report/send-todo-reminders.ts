import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { todos, type UserLocale } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import type {
  PushMessage,
  PushSender,
} from "#src/assistant/push/get-push-sender.ts";
import { sendToDevices } from "#src/assistant/push/send-to-devices.ts";
import { ownTodo } from "./own-todo.ts";
import { readReportSettings } from "./read-report-settings.ts";

/** A push service takes about 4 KB, and a to-do's detail alone can be larger. */
const BODY_CHARS = 200;

// The cron writes the notification outside React, where `t()` cannot run,
// so its two languages are here.
const COPY: Record<
  UserLocale,
  { body: string; done: string; snooze: string; failed: string }
> = {
  en: {
    body: "To-do reminder",
    done: "Done",
    snooze: "Snooze 1 hour",
    failed: "That did not save. Open your to-dos.",
  },
  zh: {
    body: "待办提醒",
    done: "完成",
    snooze: "1 小时后提醒",
    failed: "没有保存成功，请打开待办查看。",
  },
};

function reminderMessage(
  todo: { id: string; title: string; detail: string | null },
  locale: UserLocale,
): PushMessage {
  const { body, ...actions } = COPY[locale];
  return {
    title: todo.title,
    body: todo.detail?.slice(0, BODY_CHARS) ?? body,
    url: getLocalePath("/todos", locale),
    tag: `todo-${todo.id}`,
    reminder: { todoId: todo.id, ...actions },
    urgency: "high",
  };
}

function dueReminder(scope: UserScope, now: Date) {
  return and(
    ownTodo(scope),
    isNotNull(todos.remindAt),
    isNull(todos.remindedAt),
    isNull(todos.doneAt),
    sql`coalesce(${todos.snoozedUntil}, ${todos.remindAt}) <= ${now.toISOString()}::timestamptz`,
  );
}

/**
 * Sends the user's reminders that are due, each after an atomic claim, so that a
 * retry or an overlapping run does not send it twice. When no device could take
 * it, the claim goes back and the next run tries again. A reminder not reached
 * by `endsAt` stays for the next run.
 */
export async function sendTodoReminders(
  scope: UserScope,
  {
    send,
    now,
    clock,
    endsAt,
  }: {
    send: PushSender;
    /** The time of this run. A claim holds it, and a reminder is due by it. */
    now: Date;
    clock: () => Date;
    endsAt: number;
  },
) {
  const totals = { reminders: 0, sent: 0, removed: 0, failed: 0 };
  const due = await scope.db
    .select({ id: todos.id })
    .from(todos)
    .where(dueReminder(scope, now))
    .orderBy(asc(todos.remindAt));
  if (due.length === 0) return totals;
  const { locale } = await readReportSettings(scope);
  for (const { id } of due) {
    if (clock().getTime() >= endsAt) break;
    const claimed = (
      await scope.db
        .update(todos)
        .set({ remindedAt: now, snoozedUntil: null })
        .where(and(dueReminder(scope, now), eq(todos.id, id)))
        .returning({ id: todos.id, title: todos.title, detail: todos.detail })
    ).at(0);
    if (!claimed) continue;
    const outcome = await sendToDevices(
      scope,
      reminderMessage(claimed, locale),
      { send, now: clock },
    );
    if (outcome.sent === 0 && outcome.failed > 0) {
      await scope.db
        .update(todos)
        .set({ remindedAt: null })
        .where(and(ownTodo(scope), eq(todos.id, id)));
    }
    totals.reminders += 1;
    totals.sent += outcome.sent;
    totals.removed += outcome.removed;
    totals.failed += outcome.failed;
  }
  return totals;
}
