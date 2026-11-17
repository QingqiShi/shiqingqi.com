import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getCalendarDeps } from "#src/assistant/home/get-calendar-deps.ts";
import { makeTodoHandlers } from "./make-todo-handlers.ts";

export const todoHandlers = makeTodoHandlers({
  isConfigured: isAssistantConfigured,
  userScope: getUserScope,
  getSession: getAssistantSession,
  getCalendarDeps,
  now: () => new Date(),
});
