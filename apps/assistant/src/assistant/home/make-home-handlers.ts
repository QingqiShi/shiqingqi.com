import type { AssistantSession } from "#src/assistant/auth/types.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { assistantJson } from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { readHomeStatus } from "./read-home-status.ts";

export function makeHomeHandlers(
  deps: RequestGuardDependencies & {
    /** The scope of the user of the session. */
    userScope: (session: AssistantSession) => UserScope;
    now: () => Date;
  },
) {
  return {
    /** The `HomeStatus` of the signed-in user. */
    status: async (request: Request): Promise<Response> => {
      const session = await guardRequest(deps, request, { write: false });
      if (session instanceof Response) return session;
      return assistantJson(
        await readHomeStatus(deps.userScope(session), deps.now()),
      );
    },
  };
}
