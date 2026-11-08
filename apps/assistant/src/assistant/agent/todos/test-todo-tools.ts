import { agentRuns, morningReports } from "#src/assistant/db/schema.ts";
import type { TestDb } from "#src/assistant/db/testing/create-test-db.ts";
import { applyTodoChanges } from "./apply-todo-changes.ts";
import type { TodoChanges } from "./types.ts";

export const NOW = new Date("2026-11-01T09:00:00Z");

export async function applyChanges(
  db: TestDb,
  userId: string,
  changes: TodoChanges,
) {
  const [report] = await db
    .insert(morningReports)
    .values({
      userId,
      localDate: "2026-11-01",
      content: {
        version: 2,
        mailDate: "2026-10-31",
        status: "written",
        headline: "A day.",
        needsAction: [],
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
      builtAt: NOW,
    })
    .returning();
  const [run] = await db
    .insert(agentRuns)
    .values({ userId, task: "report", modelId: "test", startedAt: NOW })
    .returning();
  await db.transaction((tx) =>
    applyTodoChanges(tx, {
      userId,
      reportId: report.id,
      runId: run.id,
      now: NOW,
      changes,
      calendar: null,
    }),
  );
}
