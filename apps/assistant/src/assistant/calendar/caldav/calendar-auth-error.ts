/**
 * The calendar server refused the login. The message starts with "Invalid
 * credentials" because tsdav keeps such an error through its discovery.
 */
export class CalendarAuthError extends Error {
  constructor() {
    super("Invalid credentials: the calendar server refused the login");
    this.name = "CalendarAuthError";
  }
}
