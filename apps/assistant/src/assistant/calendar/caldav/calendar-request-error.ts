export class CalendarRequestError extends Error {
  readonly status: number;

  constructor(method: string, status: number) {
    super(`The calendar server answered ${method} with ${String(status)}`);
    this.name = "CalendarRequestError";
    this.status = status;
  }
}
