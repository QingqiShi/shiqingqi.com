import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { buildEventIcs } from "#src/assistant/calendar/ics/build-event-ics.ts";
import { parseLocalTime } from "#src/assistant/calendar/ics/instant-of.ts";
import { morningReports, todos } from "#src/assistant/db/schema.ts";
import { reportAgent } from "./test-morning-report-agents.ts";
import {
  accountId,
  calendar,
  db,
  deliverDay,
  insertTodos,
  NOW,
  runCron,
  setUpMorningReportCron,
} from "./test-morning-report-cron.ts";

setUpMorningReportCron();

/** The passport to-do, which the report agent closes, holds time on the calendar. */
async function passportWithSlot() {
  const { invoiceTodo, passportTodo } = await insertTodos();
  const calendarUrl = calendar.addCalendar("To-dos");
  const href = calendar.putEvent(
    calendarUrl,
    "passport.ics",
    buildEventIcs({
      uid: "passport@test",
      title: passportTodo.title,
      timing: {
        allDay: false,
        start: parseLocalTime("2026-11-03T14:00"),
        end: parseLocalTime("2026-11-03T15:00"),
        timeZone: "UTC",
        endTimeZone: "UTC",
      },
      location: null,
      description: null,
      url: null,
      sourceMessageId: null,
      alarms: [],
      now: NOW,
    }),
  );
  const [event] = calendar.events(calendarUrl);
  await db
    .update(todos)
    .set({
      calendarAccountId: accountId,
      calendarUrl,
      calendarHref: href,
      calendarEtag: event.etag,
      calendarStart: new Date("2026-11-03T14:00:00Z"),
      calendarEnd: new Date("2026-11-03T15:00:00Z"),
    })
    .where(eq(todos.id, passportTodo.id));
  return { invoiceTodo, passportTodo, calendarUrl, event };
}

async function storedTodo(id: string) {
  const [row] = await db.select().from(todos).where(eq(todos.id, id));
  return row;
}

describe("a to-do that the report agent closes while it holds time", () => {
  it("frees the time with the close", async () => {
    const { passportTodo, calendarUrl } = await passportWithSlot();
    deliverDay();

    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });

    expect(await storedTodo(passportTodo.id)).toMatchObject({
      doneAt: NOW,
      calendarHref: null,
    });
    expect(calendar.events(calendarUrl)).toEqual([]);
  });

  it("keeps that one to-do open when the calendar fails, and stores the report with the other changes", async () => {
    const { invoiceTodo, passportTodo, calendarUrl, event } =
      await passportWithSlot();
    deliverDay();
    calendar.state.failNextWrites = 1;

    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });

    expect(await storedTodo(passportTodo.id)).toMatchObject({
      doneAt: null,
      calendarHref: event.url,
    });
    expect(calendar.events(calendarUrl)).toEqual([event]);
    expect((await storedTodo(invoiceTodo.id)).dueDate).toBe("2026-11-05");
    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      doneTodos: [],
      keptOpenTodos: [
        {
          id: passportTodo.id,
          title: passportTodo.title,
          failure: "calendar-unreachable",
        },
      ],
    });
  });
});
