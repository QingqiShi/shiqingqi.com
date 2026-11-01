import type { AssistantSession } from "../auth/types.ts";
import { assistantJson } from "./assistant-json.ts";
import { isSameOrigin } from "./is-same-origin.ts";

export interface RequestGuardDependencies {
  isConfigured: () => boolean;
  getSession: (request: Request) => Promise<AssistantSession | null>;
}

/**
 * The checks every session route runs first, in order: the database is set
 * up, a write comes from the same origin, and there is a session. Returns
 * the session, or the response that refuses the request.
 */
export async function guardRequest(
  dependencies: RequestGuardDependencies,
  request: Request,
  { write }: { write: boolean },
): Promise<AssistantSession | Response> {
  if (!dependencies.isConfigured()) {
    return assistantJson({ error: "not-configured" }, { status: 503 });
  }
  if (write && !isSameOrigin(request)) {
    return assistantJson({ error: "forbidden-origin" }, { status: 403 });
  }
  const session = await dependencies.getSession(request);
  if (!session) {
    return assistantJson({ error: "unauthorised" }, { status: 401 });
  }
  return session;
}
