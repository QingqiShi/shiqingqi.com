import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantJson } from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { readHomeStatus } from "./read-home-status.ts";

export function makeHomeHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  return {
    /** The `HomeStatus` of the signed-in user. */
    status: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: false });
      if (session instanceof Response) return session;
      return assistantJson(
        await readHomeStatus(
          { db: deps.getDb(), userId: session.userId },
          deps.now(),
        ),
      );
    },
  };
}
