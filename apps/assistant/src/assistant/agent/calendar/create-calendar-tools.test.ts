import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { callAgentTool, ToolRefusal } from "../agent-tool.ts";
import type { NewAgentAction } from "../run-agent.ts";
import { createCalendarTools } from "./create-calendar-tools.ts";
import { EventHandles } from "./event-handles.ts";
import { RunCalendars, type CalendarPolicy } from "./run-calendars.ts";

const NOW = new Date("2026-11-02T10:00:00Z");

let db: TestDb;
let userId: string;
let server: FakeCalendarServer;
let home: string;
let work: string;
let actions: NewAgentAction[];

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  await insertAccount(db, userId, {
    provider: "gmail",
    address: "me@gmail.com",
    credential: {
      type: "oauth",
      refreshToken: "refresh",
      accessToken: "access",
      accessTokenExpiresAt: NOW.getTime() + 3_600_000,
    },
  });
  const otherUser = await insertUser(db);
  await insertAccount(db, otherUser, { address: "other@icloud.com" });
  server = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  home = server.addCalendar("Home");
  work = server.addCalendar("Work");
  actions = [];
});

afterEach(async () => {
  await db.close();
});

async function startRun(policy?: CalendarPolicy) {
  const calendars = await RunCalendars.open(
    db,
    userId,
    {
      calendarConnector: server.connector,
      auth: mailDeps({ connector: () => Promise.reject(new Error("no IMAP")) })
        .auth,
    },
    policy,
  );
  const { tools } = createCalendarTools({
    calendars,
    handles: new EventHandles(),
    timeZone: "Europe/London",
    sourceMail: (id) => {
      if (id === "m2") {
        return {
          messageId: "<bill@thameswater.co.uk>",
          subject: "Your bill",
          sender: "Thames Water <bills@thameswater.co.uk>",
          href: null,
        };
      }
      if (id !== "m1") throw new ToolRefusal(`Unknown mail id "${id}".`);
      return {
        messageId: "<booking@ba.com>",
        subject: "Your booking",
        sender: "BA <noreply@ba.com>",
        href: "message://%3Cbooking%40ba.com%3E",
      };
    },
    run: {
      logAction: (action) => {
        actions.push(action);
        return Promise.resolve();
      },
      addUsage: () => undefined,
    },
    now: () => NOW,
  });
  return (name: string, input: unknown) => callAgentTool(tools[name], input);
}

function errorOf(result: unknown) {
  const parsed = z.object({ error: z.string() }).safeParse(result);
  return parsed.success ? parsed.data.error : null;
}

const listedSchema = z.object({
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});

async function listIds(call: Awaited<ReturnType<typeof startRun>>) {
  const listed = listedSchema.parse(
    await call("list_events", { from: "2026-11-01", to: "2027-01-31" }),
  );
  return Object.fromEntries(
    listed.events.map((event) => [event.title, event.id]),
  );
}

function ownerEvent(uid: string, extra: string[] = []) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    "SEQUENCE:0",
    "DTSTART:20261210T100000Z",
    "DTEND:20261210T110000Z",
    `SUMMARY:${uid}`,
    ...extra,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

const flight = {
  calendar: "c1",
  title: "Flight BA117 London → New York",
  start: "2026-12-20T09:15",
  end: "2026-12-20T12:05",
  allDay: false,
  timeZone: "Europe/London",
  endTimeZone: "America/New_York",
  notes: "Booking ABC123",
  alarmMinutes: [180, 60, 30],
  fromMail: "m1",
  reason: "Flight booking",
};

describe("the calendar tools", () => {
  it("log in only to the user's own iCloud accounts, and only when a tool needs the calendars", async () => {
    const call = await startRun();
    expect(server.state.loginUsers).toEqual([]);

    expect(await call("list_calendars", {})).toEqual({
      calendars: [
        {
          calendar: "c1",
          name: "Home",
          account: "me@icloud.com",
          default: false,
          shared: false,
          canWrite: true,
        },
        {
          calendar: "c2",
          name: "Work",
          account: "me@icloud.com",
          default: false,
          shared: false,
          canWrite: true,
        },
      ],
      unavailable: [],
    });
    await call("list_events", { from: "2026-11-01", to: "2026-11-30" });
    expect(server.state.loginUsers).toEqual(["me@icloud.com"]);
  });

  it("make an event once, with the mail it came from in the log, and refuse one that is over", async () => {
    const call = await startRun();

    expect(await call("create_event", flight)).toEqual({
      id: "e1",
      calendar: "c1",
      created: true,
    });
    const [stored] = server.events(home);
    expect(stored.data).toContain(
      "DTEND;TZID=America/New_York:20261220T120500",
    );
    expect(stored.data).toContain("URL:message://%3Cbooking%40ba.com%3E");
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      kind: "create_event",
      messageId: "<booking@ba.com>",
      subject: "Your booking",
      reason: "Flight booking",
      detail: { calendarUrl: home, href: stored.url, etag: stored.etag },
    });

    const again = errorOf(
      await call("create_event", { ...flight, calendar: "c2" }),
    );
    expect(again).toContain('"id":"e1"');
    expect(
      errorOf(
        await call("create_event", {
          ...flight,
          start: "2026-10-20T09:15",
          end: "2026-10-20T12:05",
        }),
      ),
    ).toContain("over");
    expect(
      errorOf(await call("create_event", { ...flight, fromMail: "m9" })),
    ).toContain("Unknown mail");
    expect(server.writes.map((write) => write.command)).toEqual(["create"]);
  });

  it("put an event without a calendar into the default calendar", async () => {
    const personal = server.addCalendar("Personal", { isDefault: true });
    const call = await startRun();
    const { calendar: _calendar, ...anywhere } = flight;

    expect(await call("create_event", anywhere)).toMatchObject({
      calendar: "c3",
    });
    expect(server.events(personal)).toHaveLength(1);
  });

  it("make one event when the model asks for the same event twice at the same time", async () => {
    const call = await startRun();

    const results = await Promise.all([
      call("create_event", flight),
      call("create_event", flight),
    ]);

    expect(results.filter((result) => errorOf(result) === null)).toHaveLength(
      1,
    );
    expect(server.events(home)).toHaveLength(1);
  });

  it("refuse a second event from the same mail at the same time, also in a later run, but not one at another time or from another mail", async () => {
    const deadline = {
      calendar: "c1",
      title: "Council tax due",
      start: "2026-11-15",
      allDay: true,
      fromMail: "m1",
      reason: "Council tax deadline",
    };
    const call = await startRun();
    expect(await call("create_event", deadline)).toMatchObject({ id: "e1" });

    const later = await startRun();
    for (const again of [
      { ...deadline, title: "Pay the council tax" },
      {
        ...deadline,
        title: "Pay the council tax",
        start: "2026-11-15T09:00",
        allDay: false,
      },
    ]) {
      expect(errorOf(await later("create_event", again))).toContain(
        "update_event on e1",
      );
    }

    expect(
      errorOf(
        await later("create_event", {
          ...deadline,
          title: "Water bill due",
          fromMail: "m2",
        }),
      ),
    ).toBeNull();
    expect(
      errorOf(
        await later("create_event", {
          ...deadline,
          title: "Council tax: second instalment",
          start: "2026-12-15",
        }),
      ),
    ).toBeNull();
    expect(
      errorOf(
        await later("create_event", {
          ...flight,
          title: "Hotel in New York",
          start: "2026-12-20",
          end: "2026-12-27",
          allDay: true,
        }),
      ),
    ).toBeNull();
    expect(errorOf(await later("create_event", flight))).toBeNull();
    expect(server.events(home)).toHaveLength(5);
  });

  it("keep the event's data from before an update or a delete", async () => {
    const url = server.putEvent(home, "dinner.ics", ownerEvent("Dinner"));
    const original = server.events(home)[0];
    const call = await startRun();
    const ids = await listIds(call);

    expect(
      await call("update_event", {
        id: ids.Dinner,
        start: "2026-12-10T19:00",
        end: "2026-12-10T21:00",
        allDay: false,
        reason: "The restaurant moved the table",
      }),
    ).toMatchObject({
      updated: {
        id: ids.Dinner,
        start: "2026-12-10T19:00",
        timeZone: "Europe/London",
      },
    });
    const updated = server.events(home)[0];
    expect(updated.data).toContain("SEQUENCE:1");
    expect(actions[0]).toMatchObject({
      kind: "update_event",
      detail: {
        href: url,
        previous: { href: url, etag: original.etag, ics: original.data },
      },
    });

    expect(
      await call("delete_event", { id: ids.Dinner, reason: "Cancelled" }),
    ).toEqual({ deleted: ids.Dinner });
    expect(server.events(home)).toEqual([]);
    expect(actions[1]).toMatchObject({
      kind: "delete_event",
      detail: {
        previous: { href: url, etag: updated.etag, ics: updated.data },
      },
    });
    expect(
      errorOf(await call("delete_event", { id: ids.Dinner, reason: "Again" })),
    ).toContain("deleted");
  });

  it("refuse stale, unknown and foreign event ids, repeating events and events with attendees", async () => {
    server.putEvent(home, "lunch.ics", ownerEvent("Lunch"));
    server.putEvent(
      home,
      "standup.ics",
      ownerEvent("Standup", ["RRULE:FREQ=DAILY"]),
    );
    server.putEvent(
      work,
      "review.ics",
      ownerEvent("Review", ["ATTENDEE:mailto:ann@example.com"]),
    );
    const other = await startRun();
    const otherIds = await listIds(other);
    const call = await startRun();
    const update = (id: string) =>
      call("update_event", { id, title: "Renamed", reason: "Test" });
    expect(errorOf(await update(otherIds.Lunch))).toContain("Unknown event id");

    const ids = await listIds(call);
    server.putEvent(home, "lunch.ics", ownerEvent("Lunch", ["LOCATION:Cafe"]));
    expect(errorOf(await update(ids.Lunch))).toContain("changed since");
    expect(errorOf(await update(ids.Standup))).toContain("repeats");
    expect(errorOf(await update(ids.Review))).toContain("attendees");
    expect(errorOf(await update("e99"))).toContain("Unknown event id");
    expect(server.writes).toEqual([]);

    const fresh = await listIds(call);
    expect(fresh.Lunch).toBe(ids.Lunch);
    expect(errorOf(await update(fresh.Lunch))).toBeNull();
  });

  it("refuse writes to a calendar that the policy keeps read-only", async () => {
    const call = await startRun((calendar) => ({
      canWrite: calendar.name !== "Work",
    }));
    expect(
      errorOf(await call("create_event", { ...flight, calendar: "c2" })),
    ).toContain("not one the owner lets you change");
    expect(server.writes).toEqual([]);
  });
});
