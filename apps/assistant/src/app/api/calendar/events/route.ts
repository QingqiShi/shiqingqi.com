import { calendarHandlers } from "#src/assistant/calendar/calendar-handlers.ts";

/** Adding one event reads the user's calendars first. */
export const maxDuration = 60;

export const POST = calendarHandlers.add;
