/** A Finance route refused the request. `code` is the server's error code, or the client's fallback code; `body` is the refusal's parsed body, if any. */
export class FinanceApiError extends Error {
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
    this.name = "FinanceApiError";
    this.code = code;
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** A failed Finance request as a `FinanceApiError`; any other failure has the code `request_failed`. */
export function toFinanceApiError(error: unknown): FinanceApiError {
  return error instanceof FinanceApiError
    ? error
    : new FinanceApiError("request_failed", 0);
}
