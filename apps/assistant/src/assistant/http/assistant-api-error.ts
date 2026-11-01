/** An Assistant route refused the request. `code` is the server's error code, or the client's fallback code; `body` is the refusal's parsed body, if any. */
export class AssistantApiError extends Error {
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
    this.name = "AssistantApiError";
    this.code = code;
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** A failed Assistant request as a `AssistantApiError`; any other failure has the code `request_failed`. */
export function toAssistantApiError(error: unknown): AssistantApiError {
  return error instanceof AssistantApiError
    ? error
    : new AssistantApiError("request_failed", 0);
}
