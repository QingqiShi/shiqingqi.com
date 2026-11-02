import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { and, eq } from "drizzle-orm";
import { morningReports, type UserLocale } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import type {
  PushMessage,
  PushSender,
} from "#src/assistant/push/get-push-sender.ts";
import { sendToDevices } from "#src/assistant/push/send-to-devices.ts";
import type { BuiltReport } from "./build-morning-report.ts";

// The cron writes the notification outside React, where `t()` cannot run,
// so its two languages are here.
const COPY: Record<
  UserLocale,
  {
    notWritten: string;
    todos: (count: number) => string;
    open: string;
  }
> = {
  en: {
    notWritten: "Your morning report could not be written today",
    todos: (count) =>
      count === 1 ? "1 new to-do." : `${String(count)} new to-dos.`,
    open: "Open your morning report.",
  },
  zh: {
    notWritten: "今天的晨报没能写成",
    todos: (count) => `新增 ${String(count)} 项待办。`,
    open: "打开今天的晨报。",
  },
};

export function reportMessage(report: BuiltReport): PushMessage {
  const copy = COPY[report.locale];
  return {
    title: report.headline ?? copy.notWritten,
    body: report.newTodos > 0 ? copy.todos(report.newTodos) : copy.open,
    url: getLocalePath("/", report.locale),
  };
}

/** Sends the report's headline to each of the user's devices, and marks the report notified. */
export function notifyReport(
  { db, userId }: { db: AssistantDb; userId: string },
  report: BuiltReport,
  { send, now }: { send: PushSender; now: () => Date },
) {
  return sendToDevices({ db, userId }, reportMessage(report), {
    send,
    now,
    onSent: ({ db, userId }) =>
      db
        .update(morningReports)
        .set({ notifiedAt: now() })
        .where(
          and(
            eq(morningReports.userId, userId),
            eq(morningReports.id, report.id),
          ),
        ),
  });
}
