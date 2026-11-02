import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { readTodayAgenda } from "./read-today-agenda.ts";

/** In Tokyo, this is 05:00 on 3 November. */
const NOW = new Date("2026-11-02T20:00:00Z");

function ics(...lines: string[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    ...lines,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

let db: TestDb;
let userId: string;
let server: FakeCalendarServer;
let calendarUrl: string;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  server = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  calendarUrl = server.addCalendar("Calendar");
});

afterEach(async () => {
  await db.close();
});

function read(connector = server.connector) {
  return readTodayAgenda(
    { db, userId },
    NOW,
    {
      calendarConnector: connector,
      auth: mailDeps({ connector: () => Promise.reject(new Error("No mail")) })
        .auth,
    },
    "Asia/Tokyo",
  );
}

describe("readTodayAgenda", () => {
  it("gives today's events in the owner's zone, without their notes", async () => {
    await insertAccount(db, userId);
    server.putEvent(
      calendarUrl,
      "dentist.ics",
      ics(
        "UID:dentist",
        "DTSTART;TZID=Asia/Tokyo:20261103T090000",
        "DTEND;TZID=Asia/Tokyo:20261103T100000",
        "SUMMARY:Dentist",
        "LOCATION:Shibuya",
        "DESCRIPTION:Secret notes",
      ),
    );
    server.putEvent(
      calendarUrl,
      "standup.ics",
      ics(
        "UID:standup",
        "DTSTART;TZID=Asia/Tokyo:20261026T083000",
        "DTEND;TZID=Asia/Tokyo:20261026T084500",
        "RRULE:FREQ=DAILY",
        "SUMMARY:Stand-up",
      ),
    );
    server.putEvent(
      calendarUrl,
      "yesterday.ics",
      ics(
        "UID:yesterday",
        "DTSTART;TZID=Asia/Tokyo:20261102T090000",
        "DTEND;TZID=Asia/Tokyo:20261102T100000",
        "SUMMARY:Yesterday",
      ),
    );
    server.putEvent(
      calendarUrl,
      "holiday.ics",
      ics(
        "UID:holiday",
        "DTSTART;VALUE=DATE:20261103",
        "DTEND;VALUE=DATE:20261104",
        "SUMMARY:Holiday",
      ),
    );
    server.putEvent(
      calendarUrl,
      "all-day-yesterday.ics",
      ics(
        "UID:all-day-yesterday",
        "DTSTART;VALUE=DATE:20261102",
        "DTEND;VALUE=DATE:20261103",
        "SUMMARY:All day yesterday",
      ),
    );

    const agenda = await read();

    expect(agenda).toEqual({
      status: "ok",
      items: [
        {
          title: "Holiday",
          allDay: true,
          start: "2026-11-03",
          end: "2026-11-03",
          timeZone: null,
          location: null,
          note: null,
        },
        {
          title: "Stand-up",
          allDay: false,
          start: "2026-11-03T08:30",
          end: "2026-11-03T08:45",
          timeZone: null,
          location: null,
          note: null,
        },
        {
          title: "Dentist",
          allDay: false,
          start: "2026-11-03T09:00",
          end: "2026-11-03T10:00",
          timeZone: null,
          location: "Shibuya",
          note: null,
        },
      ],
    });
    expect(JSON.stringify(agenda)).not.toContain("Secret notes");
    expect(server.state.loginUsers).toEqual(["me@icloud.com"]);
  });

  it("is none without an iCloud account", async () => {
    await insertAccount(db, userId, {
      provider: "outlook",
      address: "me@outlook.com",
    });
    expect(await read()).toEqual({ status: "none" });
    expect(server.state.loginUsers).toEqual([]);
  });

  it("is an error when the login fails, and changes no account", async () => {
    const accountId = await insertAccount(db, userId);
    const [before] = await db
      .select()
      .from(mailAccounts)
      .where(eq(mailAccounts.id, accountId));

    const refused = createFakeCalendarServer({
      user: "me@icloud.com",
      password: "another-password",
    });
    expect(await read(refused.connector)).toEqual({ status: "error" });

    const [after] = await db
      .select()
      .from(mailAccounts)
      .where(eq(mailAccounts.id, accountId));
    expect(after).toEqual(before);
  });

  it("is an error when an account waits for a new connect, with no login", async () => {
    const accountId = await insertAccount(db, userId);
    await db
      .update(mailAccounts)
      .set({ status: "reconnect" })
      .where(eq(mailAccounts.id, accountId));
    expect(await read()).toEqual({ status: "error" });
    expect(server.state.loginUsers).toEqual([]);
  });
});
