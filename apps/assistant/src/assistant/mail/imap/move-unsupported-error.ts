/**
 * The server has neither MOVE nor UIDPLUS. A plain EXPUNGE removes other mail
 * that the user marked deleted, so the app does not move mail on this server.
 */
export class MoveUnsupportedError extends Error {
  constructor() {
    super("The mail server has neither the MOVE command nor UIDPLUS");
    this.name = "MoveUnsupportedError";
  }
}
