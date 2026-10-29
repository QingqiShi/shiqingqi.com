const MAX_CAUSE_DEPTH = 5;

interface PostgresError {
  code: string;
  constraint: string | undefined;
}

/** The PostgreSQL error that is `error` or one of the errors that caused it. */
export function findPostgresError(error: unknown): PostgresError | undefined {
  let cause = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof cause !== "object" || cause === null) return undefined;
    if ("code" in cause && typeof cause.code === "string") {
      return {
        code: cause.code,
        constraint:
          "constraint" in cause && typeof cause.constraint === "string"
            ? cause.constraint
            : undefined,
      };
    }
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return undefined;
}
