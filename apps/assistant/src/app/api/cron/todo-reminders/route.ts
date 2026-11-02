import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getPushSender } from "#src/assistant/push/get-push-sender.ts";
import { makeTodoRemindersCron } from "#src/assistant/report/make-todo-reminders-cron.ts";

export const maxDuration = 60;

export const GET = makeTodoRemindersCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getPushSender,
});
