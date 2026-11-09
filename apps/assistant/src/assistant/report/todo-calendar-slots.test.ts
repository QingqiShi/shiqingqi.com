import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildEventIcs } from "#src/assistant/calendar/ics/build-event-ics.ts";
import { parseLocalTime } from "#src/assistant/calendar/ics/instant-of.ts";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { todos, userSettings } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { makeTodoCalendarCron } from "./make-todo-calendar-cron.ts";
import { makeTodoHandlers } from "./make-todo-handlers.ts";
import { listTodos } from "./read-report.ts";

const ORIGIN = "http://localhost:3000";
const NOW = new Date("2026-11-02T09:00:00Z");
const TIME = {
  start: "2026-11-03T14:00:00.000Z",
  end: "2026-11-03T15:00:00.000Z",
};
const LATER = {
  start: "2026-11-04T16:00:00.000Z",
  end: "2026-11-04T16:30:00.000Z",
};

let db: TestDb;
let owner: string;
let accountId: string;
let server: FakeCalendarServer;
let calendarUrl: string;
let handlers: ReturnType<typeof makeTodoHandlers>;

const calendarDeps = () => ({
  calendarConnector: server.connector,
  auth: mailDeps({ connector: () => Promise.reject(new Error("No mail")) })
    .auth,
});

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  accountId = await insertAccount(db, owner);
  await db
    .insert(userSettings)
    .values({ userId: owner, timeZone: "Asia/Tokyo" });
  server = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addCalendar("Shared", { shared: true });
  calendarUrl = server.addCalendar("Home", { isDefault: true });
  handlers = handlersOf(owner);
});

afterEach(async () => {
  await db.close();
});

function handlersOf(userId: string, now = NOW) {
  return makeTodoHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getCalendarDeps: calendarDeps,
    getSession: () => Promise.resolve({ sessionId: randomUUID(), userId }),
    now: () => now,
  });
}

function request(method: string, body?: unknown) {
  return new Request(`${ORIGIN}/api/todos`, {
    method,
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function insertTodo(values: Partial<typeof todos.$inferInsert> = {}) {
  const [row] = await db
    .insert(todos)
    .values({ userId: owner, title: "Write the essay", ...values })
    .returning();
  return row;
}

async function stored(id: string) {
  const [row] = await db.select().from(todos).where(eq(todos.id, id));
  return row;
}

function addSlot(id: string, time = TIME, name: string = randomUUID()) {
  return handlers.addSlot(request("POST", { name, time }), id);
}

async function todoWithSlot(values: Partial<typeof todos.$inferInsert> = {}) {
  const { id } = await insertTodo(values);
  expect((await addSlot(id)).status).toBe(201);
  const [event] = server.events(calendarUrl);
  return { id, event };
}

/** The owner changes the event in another app. */
function changeInCalendar(url: string, title = "Changed elsewhere") {
  const name = new URL(url).pathname.split("/").at(-1) ?? "";
  server.putEvent(
    calendarUrl,
    name,
    buildEventIcs({
      uid: `${name}@elsewhere`,
      title,
      timing: {
        allDay: false,
        start: parseLocalTime("2026-11-05T10:00"),
        end: parseLocalTime("2026-11-05T11:00"),
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
}

describe("a slot that the owner sets", () => {
  it("makes an event on the default calendar at that time in the owner's zone, and stores where it is", async () => {
    const { id } = await insertTodo({ detail: "Two pages" });
    const response = await addSlot(id);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ calendar: "Home" });
    const [event] = server.events(calendarUrl);
    expect(event.data).toContain("DTSTART;TZID=Asia/Tokyo:20261103T230000");
    expect(event.data).toContain("DTEND;TZID=Asia/Tokyo:20261104T000000");
    expect(event.data).toContain("SUMMARY:Write the essay");
    expect(event.data).toContain("DESCRIPTION:Two pages");
    expect(await stored(id)).toMatchObject({
      calendarAccountId: accountId,
      calendarUrl,
      calendarHref: event.url,
      calendarEtag: event.etag,
      calendarStart: new Date(TIME.start),
      calendarEnd: new Date(TIME.end),
    });
    const { open } = await listTodos({ db, userId: owner });
    expect(open[0].calendarSlot).toEqual({
      start: new Date(TIME.start),
      end: new Date(TIME.end),
    });
  });

  it("does not make a second event when the answer to the first try was lost", async () => {
    const { id } = await insertTodo();
    const name = randomUUID();
    server.putEvent(calendarUrl, `${name}.ics`, "BEGIN:VCALENDAR");

    expect((await addSlot(id, TIME, name)).status).toBe(201);
    expect((await addSlot(id, TIME, name)).status).toBe(201);

    const events = server.events(calendarUrl);
    expect(events).toHaveLength(1);
    expect((await stored(id)).calendarHref).toBe(events[0].url);
  });

  it("refuses a second slot, a time that is over and a closed to-do, and writes nothing", async () => {
    const { id } = await todoWithSlot();
    expect((await addSlot(id, LATER)).status).toBe(409);

    const other = await insertTodo();
    const over = {
      start: "2026-11-01T14:00:00.000Z",
      end: "2026-11-01T15:00:00.000Z",
    };
    expect((await addSlot(other.id, over)).status).toBe(409);

    const closed = await insertTodo({ doneAt: NOW });
    expect((await addSlot(closed.id)).status).toBe(404);

    expect(server.events(calendarUrl)).toHaveLength(1);
  });

  it("does not reach a to-do of another user", async () => {
    const stranger = handlersOf(await insertUser(db));
    const { id, event } = await todoWithSlot();
    const slot = await stored(id);

    const answers = await Promise.all([
      stranger.addSlot(
        request("POST", { name: randomUUID(), time: LATER }),
        id,
      ),
      stranger.moveSlot(request("PUT", LATER), id),
      stranger.removeSlot(request("DELETE"), id),
      stranger.adoptSlot(request("PATCH"), id),
    ]);

    expect(answers.map(({ status }) => status)).toEqual([404, 404, 404, 404]);
    expect(server.events(calendarUrl)).toEqual([event]);
    expect(await stored(id)).toEqual(slot);
  });

  it("says that there is no calendar when the owner has no iCloud account", async () => {
    const stranger = await insertUser(db);
    const [row] = await db
      .insert(todos)
      .values({ userId: stranger, title: "Plan" })
      .returning();

    const response = await handlersOf(stranger).addSlot(
      request("POST", { name: randomUUID(), time: TIME }),
      row.id,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "no-calendar" });
  });

  it("moves the event with the etag that it knows", async () => {
    const { id, event } = await todoWithSlot();

    const moved = await handlers.moveSlot(request("PUT", LATER), id);

    expect(moved.status).toBe(204);
    const [after] = server.events(calendarUrl);
    expect(after.url).toBe(event.url);
    expect(after.data).toContain("DTSTART;TZID=Asia/Tokyo:20261105T010000");
    expect(await stored(id)).toMatchObject({
      calendarEtag: after.etag,
      calendarStart: new Date(LATER.start),
    });
  });

  it("refuses a move and a removal of an event that changed, and overwrites nothing", async () => {
    const { id, event } = await todoWithSlot();
    changeInCalendar(event.url);
    const [changed] = server.events(calendarUrl);
    const slot = await stored(id);

    const moved = await handlers.moveSlot(request("PUT", LATER), id);
    const removed = await handlers.removeSlot(request("DELETE"), id);

    expect(moved.status).toBe(409);
    expect(await moved.json()).toEqual({ error: "calendar-changed" });
    expect(removed.status).toBe(409);
    expect(server.events(calendarUrl)).toEqual([changed]);
    expect(await stored(id)).toEqual(slot);
  });

  it("takes the calendar's time when the owner asks, and a later move then goes through", async () => {
    const { id, event } = await todoWithSlot();
    changeInCalendar(event.url);

    expect((await handlers.adoptSlot(request("PATCH"), id)).status).toBe(204);

    expect(await stored(id)).toMatchObject({
      calendarStart: new Date("2026-11-05T10:00:00Z"),
      calendarEnd: new Date("2026-11-05T11:00:00Z"),
      calendarEtag: server.events(calendarUrl)[0].etag,
    });
    expect((await handlers.moveSlot(request("PUT", LATER), id)).status).toBe(
      204,
    );
  });

  it("lets go of an event that now has attendees, and leaves the event as it is", async () => {
    const { id, event } = await todoWithSlot();
    server.putEvent(
      calendarUrl,
      new URL(event.url).pathname.split("/").at(-1) ?? "",
      event.data.replace(
        "END:VEVENT",
        "ATTENDEE:mailto:someone@example.com\r\nEND:VEVENT",
      ),
    );
    const [changed] = server.events(calendarUrl);

    expect((await handlers.adoptSlot(request("PATCH"), id)).status).toBe(204);

    expect((await stored(id)).calendarHref).toBeNull();
    expect(server.events(calendarUrl)).toEqual([changed]);
  });

  it("takes the slot away when the event is gone from the calendar", async () => {
    const { id } = await todoWithSlot();
    const session = await server.connector({
      user: "me@icloud.com",
      pass: "app-password",
    });
    const [event] = server.events(calendarUrl);
    await session.deleteEvent(event.url, event.etag);

    const moved = await handlers.moveSlot(request("PUT", LATER), id);

    expect(await moved.json()).toEqual({ error: "calendar-gone" });
    expect((await stored(id)).calendarHref).toBeNull();
  });

  it("removes the event and the slot", async () => {
    const { id } = await todoWithSlot();

    expect((await handlers.removeSlot(request("DELETE"), id)).status).toBe(204);

    expect(server.events(calendarUrl)).toEqual([]);
    expect((await stored(id)).calendarAccountId).toBeNull();
  });

  it("says that the calendar did not answer, and keeps the row as it was", async () => {
    const { id } = await insertTodo();
    server.state.failNextWrites = 1;

    const response = await addSlot(id);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "calendar-unreachable" });
    expect((await stored(id)).calendarHref).toBeNull();
  });
});

describe("a to-do that ends while it holds time", () => {
  it("frees time to come when it closes or is deleted", async () => {
    const closing = await todoWithSlot();
    const closed = await handlers.update(
      request("PATCH", { done: true }),
      closing.id,
    );
    expect(await closed.json()).toEqual({
      calendar: [{ id: closing.id, outcome: "freed" }],
    });
    expect(server.events(calendarUrl)).toEqual([]);
    expect((await stored(closing.id)).calendarHref).toBeNull();

    const deleting = await todoWithSlot();
    const deleted = await handlers.delete(request("DELETE"), deleting.id);
    expect(await deleted.json()).toEqual({
      calendar: [{ id: deleting.id, outcome: "freed" }],
    });
    expect(server.events(calendarUrl)).toEqual([]);
  });

  it("frees the time of many in one request", async () => {
    const first = await insertTodo();
    const second = await insertTodo();
    await addSlot(first.id);
    await addSlot(second.id, LATER);

    const response = await handlers.bulk(
      request("POST", {
        action: "done",
        ids: [first.id, second.id],
      }),
    );

    const body = (await response.json()) as {
      closed: string[];
      calendar: { outcome: string }[];
    };
    expect(body.closed).toHaveLength(2);
    expect(body.calendar.map(({ outcome }) => outcome)).toEqual([
      "freed",
      "freed",
    ]);
    expect(server.events(calendarUrl)).toEqual([]);
  });

  it("keeps a slot that has begun, as a record of the time", async () => {
    const { id, event } = await todoWithSlot();

    const response = await handlersOf(
      owner,
      new Date("2026-11-03T14:30:00Z"),
    ).update(request("PATCH", { done: true }), id);

    expect(response.status).toBe(204);
    expect(server.events(calendarUrl)).toEqual([event]);
    expect((await stored(id)).calendarHref).toBe(event.url);
  });

  it("stores the change when the calendar fails, and the cron frees the time later", async () => {
    const { id, event } = await todoWithSlot();
    server.state.failNextWrites = 1;

    const closed = await handlers.update(request("PATCH", { done: true }), id);

    expect(closed.status).toBe(200);
    expect(await closed.json()).toEqual({
      calendar: [{ id, outcome: "unreachable" }],
    });
    expect((await stored(id)).doneAt).toEqual(NOW);
    expect((await stored(id)).calendarHref).toBe(event.url);
    expect(server.events(calendarUrl)).toEqual([event]);

    const cron = await makeTodoCalendarCron({
      isConfigured: () => true,
      getDb: () => db,
      getCronSecret: () => "secret",
      now: () => NOW,
      getCalendarDeps: calendarDeps,
    })(
      new Request(`${ORIGIN}/api/cron/todo-calendar`, {
        headers: { Authorization: "Bearer secret" },
      }),
    );

    expect(await cron.json()).toMatchObject({ freed: 1 });
    expect(server.events(calendarUrl)).toEqual([]);
    expect((await stored(id)).calendarHref).toBeNull();
  });

  it("leaves an event that changed, and the to-do lets it go", async () => {
    const { id, event } = await todoWithSlot();
    changeInCalendar(event.url);
    const [changed] = server.events(calendarUrl);

    const deleted = await handlers.delete(request("DELETE"), id);

    expect(await deleted.json()).toEqual({
      calendar: [{ id, outcome: "changed" }],
    });
    expect(server.events(calendarUrl)).toEqual([changed]);
    expect((await stored(id)).calendarHref).toBeNull();
    expect((await stored(id)).deletedAt).toEqual(NOW);
  });
});
