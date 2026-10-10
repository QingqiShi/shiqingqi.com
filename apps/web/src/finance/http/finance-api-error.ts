/** A Finance route refused the request. `code` is the server's error code, or the client's fallback code. */
export class FinanceApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "FinanceApiError";
    this.code = code;
    this.status = status;
  }
}
