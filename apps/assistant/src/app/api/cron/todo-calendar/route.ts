import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getCalendarDeps } from "#src/assistant/home/get-calendar-deps.ts";
import { makeTodoCalendarCron } from "#src/assistant/report/make-todo-calendar-cron.ts";

export const maxDuration = 60;

export const GET = makeTodoCalendarCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getCalendarDeps,
});
