import { cache } from "react";
import "server-only";
import type { AssistantSession } from "../auth/types.ts";
import { getAssistantDb } from "./get-assistant-db.ts";
import { scopeTo, type UserScope } from "./scope-to.ts";

const scopeOf = cache((userId: string): UserScope =>
  scopeTo(getAssistantDb(), userId),
);

/**
 * The scope of the user of a session. It takes the session, not a user id, so
 * that only a user that the session cookie proved gets a scope. In one render,
 * each call for the same user gives the same scope, so the reads that `cache`
 * keeps per scope run once.
 */
export function getUserScope(session: AssistantSession): UserScope {
  return scopeOf(session.userId);
}
