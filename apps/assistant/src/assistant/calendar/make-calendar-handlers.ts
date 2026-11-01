import { eq } from "drizzle-orm";
import { z } from "zod";
import { calendarWrites } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { assistantJson } from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import {
  ADD_EVENT_BUDGET_MS,
  writeCalendarEvents,
  type CalendarDeps,
} from "./write-calendar-events.ts";

const addBody = z.object({ classificationId: z.uuid() });

export function makeCalendarHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    /** Null when the credential key is missing. */
    getCalendarDeps: () => CalendarDeps | null;
  },
) {
  return {
    /** 加入日历: writes the event of one digest mail, also when the classifier was unsure. */
    add: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = addBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const calendarDeps = deps.getCalendarDeps();
      if (!calendarDeps) {
        return assistantJson({ error: "not-configured" }, { status: 503 });
      }
      const { classificationId } = body.data;
      const db = deps.getDb();
      const run = await writeCalendarEvents(
        {
          db,
          userId: session.userId,
          endsAt: Date.now() + ADD_EVENT_BUDGET_MS,
          classificationIds: [classificationId],
        },
        calendarDeps,
      );
      if (!run.available) {
        return assistantJson({ error: "no-calendar" }, { status: 409 });
      }
      if (run.results.has(classificationId)) {
        const result = run.results.get(classificationId);
        return result
          ? assistantJson({ result })
          : assistantJson({ error: "failed" }, { status: 502 });
      }
      const earlier = await withUser(db, session.userId, async ({ db }) =>
        (
          await db
            .select({ result: calendarWrites.result })
            .from(calendarWrites)
            .where(eq(calendarWrites.classificationId, classificationId))
        ).at(0),
      );
      return earlier?.result
        ? assistantJson({ result: earlier.result })
        : assistantJson({ error: "not-found" }, { status: 404 });
    },
  };
}
