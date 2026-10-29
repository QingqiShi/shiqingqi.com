/** The message of the database error behind a failed query. */
export async function failureOf(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error: unknown) {
    let cause = error;
    while (cause instanceof Error && cause.cause instanceof Error) {
      cause = cause.cause;
    }
    return cause instanceof Error ? cause.message : String(cause);
  }
  throw new Error("The query did not fail");
}
