import { z } from "zod";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantJson } from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { undoAgentActions, type UndoDeps } from "./undo-agent-actions.ts";

/** A run holds at most this many actions: the moves and flag changes of the tools' limits, and a few more. */
const MAX_ACTION_IDS = 1200;

const undoBody = z.union([
  z.object({ runId: z.uuid() }).strict(),
  z
    .object({ actionIds: z.array(z.uuid()).min(1).max(MAX_ACTION_IDS) })
    .strict(),
]);

export function makeActivityHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    /** Null when the credential key is missing. */
    getUndoDeps: () => UndoDeps | null;
    now: () => Date;
  },
) {
  return {
    /**
     * Undoes the given actions, or every action of a run, of the session's
     * user, newest first. It answers with what happened to each action.
     */
    undo: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: true });
      if (session instanceof Response) return session;
      const body = undoBody.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return assistantJson({ error: "invalid-body" }, { status: 400 });
      }
      const undoDeps = deps.getUndoDeps();
      if (!undoDeps) {
        return assistantJson({ error: "not-configured" }, { status: 503 });
      }
      const outcomes = await undoAgentActions(
        { db: deps.getDb(), userId: session.userId, now: deps.now },
        undoDeps,
        body.data,
      );
      if (!outcomes) {
        return assistantJson({ error: "not-found" }, { status: 404 });
      }
      return assistantJson({ outcomes });
    },
  };
}
