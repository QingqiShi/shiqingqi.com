import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { readLimitedText } from "#src/assistant/http/read-limited-text.ts";
import { parseTodoDate } from "#src/assistant/report-page/parse-todo-date.ts";
import { captureLimits, captureTokenStore } from "./capture-token-store.ts";
import { localClock } from "./due-report-date.ts";
import { oneLineText } from "./one-line-text.ts";
import { ownerTodos } from "./owner-todos.ts";
import { readReportSettings } from "./read-report-settings.ts";
import { todoLimits } from "./todo-limits.ts";

const captureBody = z.strictObject({
  text: z
    .string()
    .transform(oneLineText)
    .pipe(z.string().min(1).max(todoLimits.titleChars)),
});

const BEARER = /^Bearer (\S+)$/i;

function readJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function makeCaptureHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /**
     * Adds a to-do for the owner of the bearer token. The token is the only
     * way in here and it can do nothing else: no session, and the answer holds
     * only the new to-do. It must never reach a log.
     */
    capture: async (request: Request): Promise<Response> => {
      if (!deps.isConfigured()) {
        return assistantJson({ error: "not-configured" }, { status: 503 });
      }
      const db = deps.getDb();
      const now = deps.now();
      const token = BEARER.exec(
        request.headers.get("Authorization") ?? "",
      )?.[1];
      const use = token
        ? await captureTokenStore.spend(db, token, now)
        : { kind: "refused" as const };
      if (use.kind === "refused") {
        return assistantJson(
          { error: "unauthorised" },
          { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
        );
      }
      if (use.kind === "limited") {
        return assistantJson(
          { error: "rate-limited" },
          {
            status: 429,
            headers: { "Retry-After": String(use.retryAfterSeconds) },
          },
        );
      }

      const text = await readLimitedText(request.body, captureLimits.bodyBytes);
      if (text === null) {
        return assistantJson({ error: "too-large" }, { status: 413 });
      }
      const body = captureBody.safeParse(readJson(text));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }

      const scope = { db, userId: use.userId };
      const { timeZone } = await readReportSettings(scope);
      const { title, dueDate } = parseTodoDate(
        body.data.text,
        localClock(now, timeZone).date,
      );
      const id = randomUUID();
      await ownerTodos.add(
        scope,
        { id, title, detail: null, dueDate, startDate: null },
        now,
      );
      return assistantJson({ id, title, dueDate }, { status: 201 });
    },

    /** Makes a token and answers with it, the one time that it is shown. */
    createToken: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const created = await captureTokenStore.create(
        { db: deps.getDb(), userId: session.userId },
        deps.now(),
      );
      return assistantJson(created, { status: 201 });
    },

    revokeToken: async (request: Request, id: string): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const revoked =
        z.uuid().safeParse(id).success &&
        (await captureTokenStore.revoke(
          { db: deps.getDb(), userId: session.userId },
          id,
        ));
      return revoked
        ? assistantNoContent()
        : assistantJson({ error: "not-found" }, { status: 404 });
    },
  };
}
