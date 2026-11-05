import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { morningReports } from "#src/assistant/db/schema.ts";
import { reply, call, toolOutputs } from "./test-morning-report-agents.ts";
import {
  db,
  calendar,
  runCron,
  deliverDay,
  seenOf,
  setClock,
  setCalendar,
  setUpMorningReportCron,
} from "./test-morning-report-cron.ts";

setUpMorningReportCron();

describe("the morning report cron", () => {
  it("stores the day's events whether or not the agent looked at the calendar, and puts a note on the occurrence it names", async () => {
    calendar.putEvent(
      calendar.addCalendar("Work"),
      "stand-up.ics",
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:stand-up",
        "DTSTART:20261026T090000Z",
        "DTEND:20261026T091500Z",
        "RRULE:FREQ=DAILY",
        "SUMMARY:Stand-up",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
    const submit = (eventNotes?: { event: string; note: string }[]) =>
      call("submit_report", {
        headline: "Nothing urgent.",
        needsAction: [],
        worthKnowing: [],
        eventNotes,
        rest: "",
      });
    const neverLooks = new MockLanguageModelV3({
      doGenerate: () => reply([submit()], true),
    });
    await runCron({ id: "agent-model", model: neverLooks });

    const occurrences = z.object({
      events: z.array(z.object({ id: z.string(), start: z.string() })),
    });
    const notesTwoOccurrences = new MockLanguageModelV3({
      doGenerate: ({ prompt }) => {
        const listed = occurrences.safeParse(
          toolOutputs(prompt).get("events"),
        ).data;
        if (!listed) {
          return reply(
            [
              call(
                "list_events",
                { from: "2026-11-02", to: "2026-11-03" },
                "events",
              ),
            ],
            true,
          );
        }
        const idAt = (start: string) =>
          listed.events.find((event) => event.start === start)?.id ?? "";
        return reply(
          [
            submit([
              { event: idAt("2026-11-02T09:00"), note: "Online today." },
              { event: idAt("2026-11-03T09:00"), note: "Online tomorrow." },
            ]),
          ],
          true,
        );
      },
    });
    setClock(new Date("2026-11-02T09:00:00Z"));
    await runCron({ id: "agent-model", model: notesTwoOccurrences });

    const [first, second] = await db
      .select()
      .from(morningReports)
      .orderBy(morningReports.localDate);
    expect(first.content).toMatchObject({
      agenda: [
        { title: "Stand-up", start: "2026-11-01T09:00", note: null },
        { title: "Dentist", start: "2026-11-01T10:00", note: null },
      ],
    });
    expect(second.content).toMatchObject({
      agenda: [
        {
          title: "Stand-up",
          start: "2026-11-02T09:00",
          note: "Online today.",
        },
      ],
    });
  });

  it("stores the report and marks the mail read when the calendar cannot be read, and says so", async () => {
    setCalendar(
      createFakeCalendarServer({
        user: "me@icloud.com",
        password: "not-the-app-password",
      }),
    );
    const uids = deliverDay();
    const submitsAtOnce = new MockLanguageModelV3({
      doGenerate: () =>
        reply(
          [
            call("submit_report", {
              headline: "Nothing urgent.",
              needsAction: [],
              worthKnowing: [],
              rest: "",
            }),
          ],
          true,
        ),
    });

    expect(
      await runCron({ id: "agent-model", model: submitsAtOnce }),
    ).toMatchObject({ built: 1 });

    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      agenda: null,
      calendarUnread: true,
    });
    expect(seenOf("INBOX", uids.invoice)).toBe(true);
  });
});
