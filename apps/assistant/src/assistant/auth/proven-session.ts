const sessionReadKey: unique symbol = Symbol("session read");

/**
 * A session that the session cookie proved. Only `provenSession` makes one:
 * the constructor needs a key that only this module has.
 * The user id is in a private field, so neither an object literal nor a copy
 * such as `{ ...session, userId }` passes as a session, and the instance is
 * frozen.
 */
export class AssistantSession {
  readonly sessionId: string;
  readonly #userId: string;

  constructor(sessionId: string, userId: string, key: typeof sessionReadKey) {
    if (key !== sessionReadKey) {
      throw new Error("Only the session read makes a session.");
    }
    this.sessionId = sessionId;
    this.#userId = userId;
    Object.freeze(this);
  }

  get userId(): string {
    return this.#userId;
  }

  /** The user of a real session. Anything else throws, also when its type says it is a session. */
  static userIdOf(session: AssistantSession): string {
    if (typeof session !== "object" || !(#userId in session)) {
      throw new Error("This is not a session that the session cookie proved.");
    }
    return session.#userId;
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
  return new AssistantSession(sessionId, userId, sessionReadKey);
}

/** The user of a session, read from the session itself, not from its `userId`. */
export function provenUserId(session: AssistantSession): string {
  return AssistantSession.userIdOf(session);
}
