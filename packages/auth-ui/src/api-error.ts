/** A route of the app refused the request. `code` is the server's error code, or the client's fallback code; `body` is the refusal's parsed body, if any. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly body: unknown;
  /** From the `Retry-After` header of a 429: how long until the limit allows a request again. */
  readonly retryAfterSeconds: number | null;

  constructor(
    code: string,
    status: number,
    body: unknown = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** A failed request as an `ApiError`; any other failure has the code `request_failed`. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError("request_failed", 0);
}
