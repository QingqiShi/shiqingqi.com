/** A refusal that an auth route answers with: the status, and the code that the page reads. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    code: string,
    headers: Record<string, string> = {},
  ) {
    super(code);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}
