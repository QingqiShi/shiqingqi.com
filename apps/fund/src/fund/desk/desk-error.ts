/** A report of the owner that the desk refuses. `status` is the HTTP status for it. */
export class DeskError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = "DeskError";
    this.status = status;
  }
}
