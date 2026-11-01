import { z } from "zod";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { setTodoDone } from "./read-report.ts";

const todoBody = z.object({ done: z.boolean() });

export function makeTodoHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /** Ticks a to-do off, or, with `done: false`, undoes that. */
    update: async (request: Request, todoId: string): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = todoBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      if (!z.uuid().safeParse(todoId).success) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      const found = await withUser(deps.getDb(), session.userId, (scope) =>
        setTodoDone(scope, todoId, body.data.done, deps.now()),
      );
      return found
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },
  };
}
