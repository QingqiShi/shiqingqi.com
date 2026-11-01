import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import {
  calendarWrites,
  mailAccounts,
  mailClassifications,
  mailMessages,
  userSettings,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { readIcsEvents } from "./ics/read-ics-events.ts";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "./testing/create-fake-calendar-server.ts";
import { writeCalendarEvents } from "./write-calendar-events.ts";

const NOW = new Date("2026-11-01T10:00:00Z");
const HOUR = 60 * 60 * 1000;

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeCalendarServer;
let uid = 0;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  server = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
});

afterEach(async () => {
  await db.close();
});

function deps(connector = server.connector) {
  return {
    connector,
    auth: mailDeps({
      connector: () => Promise.reject(new Error("No IMAP in this test")),
      now: () => NOW,
    }).auth,
  };
}

function run(classificationIds?: string[]) {
  return writeCalendarEvents(
    { db, userId, endsAt: Infinity, classificationIds },
    deps(),
  );
}

function event(overrides: Partial<MailEvent> = {}): MailEvent {
  return {
    kind: "appointment",
    change: "new",
    title: "Dentist",
    start: "2026-11-05T14:30",
    end: null,
    allDay: false,
    timeZone: "Europe/London",
    location: "12 High St",
    certainty: "sure",
    ...overrides,
  };
}

/** Stores a classified mail with an event; returns the classification id. */
function receive({
  messageId,
  inReplyTo = null,
  mailEvent,
  classifiedAt = new Date(),
}: {
  messageId: string;
  inReplyTo?: string | null;
  mailEvent: MailEvent;
  classifiedAt?: Date;
}) {
  uid += 1;
  return withUser(db, userId, async ({ db, userId }) => {
    const [message] = await db
      .insert(mailMessages)
      .values({
        userId,
        accountId,
        uidValidity: 1,
        uid,
        messageId,
        inReplyTo,
        references: inReplyTo ? [inReplyTo] : [],
        fromAddress: "clinic@example.com",
        subject: "Your appointment",
        receivedAt: new Date(Date.now() + uid * 1000),
      })
      .returning();
    const [classification] = await db
      .insert(mailClassifications)
      .values({
        userId,
        messageId: message.id,
        bucket: "fyi",
        decidedBy: "model",
        reason: "test",
        summary: "Dentist on Thursday at 14:30.",
        event: mailEvent,
        classifiedAt,
      })
      .returning();
    return classification.id;
  });
}

function appCalendar() {
  const calendar = server
    .calendars()
    .find((entry) => entry.displayName === "Mail Assistant");
  if (!calendar) throw new Error("The app made no calendar");
  return calendar.url;
}

function appEvents() {
  return server.events(appCalendar()).map((object) => ({
    ...object,
    read: readIcsEvents(object.data, "UTC")[0],
  }));
}

function storedResult(classificationId: string) {
  return withUser(
    db,
    userId,
    async ({ db }) =>
      (
        await db
          .select({ result: calendarWrites.result })
          .from(calendarWrites)
          .where(eq(calendarWrites.classificationId, classificationId))
      ).at(0)?.result ?? null,
  );
}

describe("writeCalendarEvents", () => {
  it("makes the app's calendar once and writes each sure event to it, with the summary and the link to the mail", async () => {
    const id = await receive({
      messageId: "<a@example.com>",
      mailEvent: event(),
    });

    await run();

    expect(await storedResult(id)).toBe("created");
    const [written] = appEvents();
    expect(new Date(written.read.start).toISOString()).toBe(
      "2026-11-05T14:30:00.000Z",
    );
    expect(written.data).toContain("DESCRIPTION:Dentist on Thursday at 14:30.");
    expect(written.data).toContain("message://%3Ca%40example.com%3E");
    const [account] = await withUser(db, userId, ({ db }) =>
      db
        .select({ calendarUrl: mailAccounts.calendarUrl })
        .from(mailAccounts)
        .where(eq(mailAccounts.id, accountId)),
    );
    expect(account.calendarUrl).toBe(appCalendar());

    await receive({
      messageId: "<b@example.com>",
      mailEvent: event({ title: "Haircut", start: "2026-11-06T10:00" }),
    });
    await run();
    expect(server.calendars()).toHaveLength(1);
    expect(appEvents()).toHaveLength(2);
  });

  it("names the calendar in the user's language", async () => {
    await withUser(db, userId, ({ db, userId }) =>
      db.insert(userSettings).values({ userId, locale: "zh" }),
    );
    await receive({ messageId: "<a@example.com>", mailEvent: event() });

    await run();

    expect(server.calendars().map((entry) => entry.displayName)).toEqual([
      "邮件助手",
    ]);
  });

  it("changes and then deletes the same event when later mail in the thread moves and cancels it", async () => {
    await receive({ messageId: "<a@example.com>", mailEvent: event() });
    await run();
    const [created] = appEvents();

    const moved = await receive({
      messageId: "<b@example.com>",
      inReplyTo: "<a@example.com>",
      mailEvent: event({ change: "update", start: "2026-11-06T09:00" }),
    });
    await run();
    expect(await storedResult(moved)).toBe("updated");
    const [updated] = appEvents();
    expect(updated.url).toBe(created.url);
    expect(updated.read.uid).toBe(created.read.uid);
    expect(updated.data).toContain("SEQUENCE:1");
    expect(new Date(updated.read.start).toISOString()).toBe(
      "2026-11-06T09:00:00.000Z",
    );

    const cancelled = await receive({
      messageId: "<c@example.com>",
      inReplyTo: "<b@example.com>",
      mailEvent: event({ change: "cancel", start: "2026-11-06T09:00" }),
    });
    await run();
    expect(await storedResult(cancelled)).toBe("cancelled");
    expect(appEvents()).toEqual([]);
  });

  it("skips an event that one of the user's calendars has already, and never writes to that calendar", async () => {
    const own = server.addCalendar("Home");
    server.putEvent(
      own,
      "invite.ics",
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:invite-1",
        "DTSTART;TZID=Europe/London:20261105T143000",
        "DTEND;TZID=Europe/London:20261105T150000",
        "SUMMARY:Dentist appointment",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
    const id = await receive({
      messageId: "<a@example.com>",
      mailEvent: event(),
    });

    await run();

    expect(await storedResult(id)).toBe("duplicate");
    expect(appEvents()).toEqual([]);
    expect(server.writes.every((write) => !write.url.startsWith(own))).toBe(
      true,
    );
  });

  it("writes an unsure event only when the user adds it from the digest", async () => {
    const id = await receive({
      messageId: "<a@example.com>",
      mailEvent: event({ certainty: "unsure" }),
    });

    await run();
    expect(server.writes).toEqual([]);

    const added = await run([id]);
    expect(added.results.get(id)).toBe("created");
    expect(appEvents()).toHaveLength(1);
  });

  it("leaves mail classified before the account was connected or the switch was turned on, and does nothing while it is off", async () => {
    const old = await receive({
      messageId: "<old@example.com>",
      mailEvent: event(),
      classifiedAt: new Date(Date.now() - HOUR),
    });
    await run();
    expect(await storedResult(old)).toBeNull();

    await withUser(db, userId, ({ db, userId }) =>
      db.insert(userSettings).values({ userId, calendarEvents: false }),
    );
    await receive({ messageId: "<new@example.com>", mailEvent: event() });
    await run();
    expect(server.writes).toEqual([]);
  });

  it("shows a refused calendar login on the account and tries again on the next run", async () => {
    const id = await receive({
      messageId: "<a@example.com>",
      mailEvent: event(),
    });
    const refusing = createFakeCalendarServer({
      user: "me@icloud.com",
      password: "another-password",
    });

    await writeCalendarEvents(
      { db, userId, endsAt: Infinity },
      deps(refusing.connector),
    );

    const [account] = await withUser(db, userId, ({ db }) =>
      db
        .select({ code: mailAccounts.calendarErrorCode })
        .from(mailAccounts)
        .where(eq(mailAccounts.id, accountId)),
    );
    expect(account.code).toBe("calendar_login_refused");

    await run();
    expect(await storedResult(id)).toBe("created");
  });
});
