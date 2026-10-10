/** A Finance route refused the request. `code` is the server's error code, or the client's fallback code; `body` is the refusal's parsed body, if any. */
export class FinanceApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly body: unknown;

  constructor(code: string, status: number, body: unknown = null) {
    super(code);
    this.name = "FinanceApiError";
    this.code = code;
    this.status = status;
    this.body = body;
  }
}
