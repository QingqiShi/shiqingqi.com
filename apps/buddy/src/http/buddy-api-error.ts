/** A Buddy route refused the request. `code` is the server's error code, or the client's fallback code. */
export class BuddyApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "BuddyApiError";
    this.code = code;
    this.status = status;
  }
}

/** A failed Buddy request as a `BuddyApiError`; any other failure has the code `request_failed`. */
export function toBuddyApiError(error: unknown): BuddyApiError {
  return error instanceof BuddyApiError
    ? error
    : new BuddyApiError("request_failed", 0);
}
