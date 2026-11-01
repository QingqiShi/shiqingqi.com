/**
 * The server has no MOVE command. A move by copy, `\Deleted` and EXPUNGE can
 * remove other mail that the user marked deleted, so the app does not move.
 */
export class MoveUnsupportedError extends Error {
  constructor() {
    super("The mail server does not support the MOVE command");
    this.name = "MoveUnsupportedError";
  }
}
