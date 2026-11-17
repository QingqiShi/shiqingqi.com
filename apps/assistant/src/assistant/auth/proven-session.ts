/**
 * A session that the session cookie proved. Only `provenSession` makes one.
 * The user id is in a private field, so neither an object literal nor a copy
 * such as `{ ...session, userId }` passes as a session.
 */
export class AssistantSession {
  readonly sessionId: string;
  readonly #userId: string;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.#userId = userId;
  }

  get userId(): string {
    return this.#userId;
  }
}

/** Marks the session that the session store found for a cookie. */
export function provenSession({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}): AssistantSession {
  return new AssistantSession(sessionId, userId);
}
