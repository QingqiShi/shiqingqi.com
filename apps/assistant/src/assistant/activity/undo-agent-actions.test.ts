import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  callAgentTool,
  type AgentTools,
} from "#src/assistant/agent/agent-tool.ts";
import { createCalendarTools } from "#src/assistant/agent/calendar/create-calendar-tools.ts";
import { EventHandles } from "#src/assistant/agent/calendar/event-handles.ts";
import { RunCalendars } from "#src/assistant/agent/calendar/run-calendars.ts";
import { createMailTools } from "#src/assistant/agent/mail/create-mail-tools.ts";
import { MailHandles } from "#src/assistant/agent/mail/mail-handles.ts";
import { RunMailboxes } from "#src/assistant/agent/mail/run-mailboxes.ts";
import type { AgentRunContext } from "#src/assistant/agent/run-agent.ts";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { agentActions, agentRuns } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  createFakeMailServer,
  rawMail,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { undoAgentActions, type UndoDeps } from "./undo-agent-actions.ts";

const NOW = new Date("2026-11-02T10:00:00Z");

let db: TestDb;
let userId: string;
let mail: FakeMailServer;
let calendar: FakeCalendarServer;
let home: string;
let open: RunMailboxes[];

const noReader = {
  id: "no-reader",
  model: new MockLanguageModelV3({
    doGenerate: () => Promise.reject(new Error("No reader in this test")),
  }),
};

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  mail = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  mail.addFolder("Receipts");
  mail.addFolder("Purchases");
  calendar = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  home = calendar.addCalendar("Home", { isDefault: true });
  open = [];
});

afterEach(async () => {
  for (const mailboxes of open) await mailboxes.finish();
  await db.close();
});

function deps(): UndoDeps {
  return {
    ...mailDeps({ connector: mail.connector, now: () => NOW }),
    calendarConnector: calendar.connector,
  };
}

function deliver(folder: string, subject: string) {
  const messageId = `<${subject.toLowerCase().replaceAll(" ", "-")}@example.com>`;
  mail.deliver(folder, rawMail({ messageId, subject }));
  return messageId;
}

/** An agent run with the real mail and calendar tools, whose actions go to the database. */
async function startRun(user = userId) {
  const [run] = await db
    .insert(agentRuns)
    .values({
      userId: user,
      task: "organise",
      modelId: "test",
      startedAt: NOW,
    })
    .returning({ id: agentRuns.id });
  const context: AgentRunContext = {
    logAction: async (action) => {
      await db
        .insert(agentActions)
        .values({ ...action, runId: run.id, userId: user });
    },
    addUsage: () => undefined,
  };
  const mailboxes = await RunMailboxes.open(db, user, deps());
  open.push(mailboxes);
  const mailTools = createMailTools({
    mailboxes,
    handles: new MailHandles(),
    reader: noReader,
    run: context,
  });
  const calendarTools = createCalendarTools({
    calendars: await RunCalendars.open(db, user, deps()),
    handles: new EventHandles(),
    timeZone: "Europe/London",
    sourceMail: () => ({
      messageId: "<booking@dentist.example>",
      subject: "Your appointment",
      sender: "Dentist <hello@dentist.example>",
      href: null,
    }),
    run: context,
    now: () => NOW,
  });
  const tools: AgentTools = { ...mailTools.tools, ...calendarTools.tools };
  const call = (name: string, input: unknown) =>
    callAgentTool(tools[name], input);
  return { runId: run.id, call };
}

const listed = z.object({
  mails: z.array(z.object({ id: z.string(), subject: z.string() })),
});

async function idsIn(
  call: Awaited<ReturnType<typeof startRun>>["call"],
  folder: string,
) {
  const { mails } = listed.parse(
    await call("list_mail", { account: "a1", folder }),
  );
  return Object.fromEntries(mails.map((entry) => [entry.subject, entry.id]));
}

function undo(
  target: { runId: string } | { actionIds: string[] },
  user = userId,
) {
  return undoAgentActions({ db, userId: user, now: () => NOW }, deps(), target);
}

function actionsOf(runId: string) {
  return db.select().from(agentActions).where(eq(agentActions.runId, runId));
}

function folders() {
  return mail
    .connector(
      { host: "", port: 0 },
      {
        user: "me@icloud.com",
        pass: "app-password",
      },
    )
    .then(async (session) => (await session.listFolders()).map((f) => f.path));
}

describe("undoing what an agent did", () => {
  it("moves mail back and flips its flags back, and records the undo", async () => {
    const receipt = deliver("INBOX", "Your Uber receipt");
    const { runId, call } = await startRun();
    const ids = await idsIn(call, "INBOX");
    await call("mark_flagged", {
      ids: [ids["Your Uber receipt"]],
      flagged: true,
      reason: "Expense it",
    });
    await call("move_mail", {
      ids: [ids["Your Uber receipt"]],
      folder: "Receipts",
      reason: "A receipt",
    });
    expect(mail.locate(receipt)).toMatchObject([
      { path: "Receipts", flags: ["\\Flagged"] },
    ]);

    const outcomes = await undo({ runId });

    expect(outcomes).toHaveLength(2);
    expect(outcomes?.every((outcome) => outcome.undone)).toBe(true);
    expect(mail.locate(receipt)).toEqual([
      expect.objectContaining({ path: "INBOX", flags: [] }),
    ]);
    expect(
      (await actionsOf(runId)).every((action) => action.undoneAt !== null),
    ).toBe(true);
  });

  it("restores a merged folder with its mail, and deletes nothing", async () => {
    const shoes = deliver("Purchases", "Your shoes shipped");
    const lamp = deliver("Purchases", "Lamp order confirmed");
    deliver("Receipts", "Coffee receipt");
    const { runId, call } = await startRun();
    const ids = await idsIn(call, "Purchases");
    await call("move_mail", {
      ids: Object.values(ids),
      folder: "Receipts",
      reason: "Merge Purchases into Receipts",
    });
    await call("delete_folder", {
      account: "a1",
      folder: "Purchases",
      reason: "Merged into Receipts",
    });
    expect(await folders()).not.toContain("Purchases");
    const before = mail.countMail();

    await undo({ runId });

    expect(await folders()).toContain("Purchases");
    expect(mail.locate(shoes)).toMatchObject([{ path: "Purchases" }]);
    expect(mail.locate(lamp)).toMatchObject([{ path: "Purchases" }]);
    expect(mail.countMail()).toBe(before);
    expect(mail.log.deletedFolders).toEqual(["Purchases"]);
  });

  it("keeps a folder it made once the owner files mail into it, and says so", async () => {
    const ticket = deliver("INBOX", "Train ticket");
    const own = deliver("INBOX", "Hotel booking");
    const { runId, call } = await startRun();
    const ids = await idsIn(call, "INBOX");
    await call("create_folder", {
      account: "a1",
      name: "Travel",
      reason: "Trips",
    });
    await call("move_mail", {
      ids: [ids["Train ticket"]],
      folder: "Travel",
      reason: "A trip",
    });
    const [hotel] = mail.locate(own);
    mail.moveAsUser("INBOX", hotel.uid, "Travel");
    const before = mail.countMail();

    const outcomes = await undo({ runId });

    expect(mail.locate(ticket)).toMatchObject([{ path: "INBOX" }]);
    expect(outcomes).toContainEqual(
      expect.objectContaining({
        undone: false,
        refusal: "folder-not-empty",
        folder: "Travel",
      }),
    );
    expect(await folders()).toContain("Travel");
    expect(mail.locate(own)).toMatchObject([{ path: "Travel" }]);
    expect(mail.countMail()).toBe(before);
    expect(mail.log.deletedFolders).toEqual([]);
  });

  it("refuses a move whose mail the owner moved on, and changes nothing", async () => {
    const letter = deliver("INBOX", "Council tax");
    const { runId, call } = await startRun();
    const ids = await idsIn(call, "INBOX");
    await call("move_mail", {
      ids: [ids["Council tax"]],
      folder: "Receipts",
      reason: "Bills",
    });
    const [filed] = mail.locate(letter);
    mail.moveAsUser("Receipts", filed.uid, "Purchases");
    const writes = mail.log.writes.length;

    expect(await undo({ runId })).toEqual([
      expect.objectContaining({
        undone: false,
        refusal: "mail-gone",
        folder: "Receipts",
      }),
    ]);
    expect(mail.locate(letter)).toMatchObject([{ path: "Purchases" }]);
    expect(mail.log.writes).toHaveLength(writes);
    expect((await actionsOf(runId))[0].undoneAt).toBeNull();
  });

  it("puts a changed event back as it was, and a deleted one back in the calendar", async () => {
    const event = (uid: string, title: string) =>
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "DTSTART:20261210T190000Z",
        "DTEND:20261210T210000Z",
        `SUMMARY:${title}`,
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n");
    const dinner = event("dinner", "Dinner at Dishoom");
    const flight = event("flight", "Flight BA2490");
    const dinnerUrl = calendar.putEvent(home, "dinner.ics", dinner);
    calendar.putEvent(home, "flight.ics", flight);
    const { runId, call } = await startRun();
    const events = z
      .object({
        events: z.array(z.object({ id: z.string(), title: z.string() })),
      })
      .parse(
        await call("list_events", { from: "2026-12-01", to: "2026-12-31" }),
      );
    const id = (title: string) =>
      events.events.find((event) => event.title === title)?.id;
    await call("update_event", {
      id: id("Flight BA2490"),
      start: "2026-12-10T20:40",
      allDay: false,
      reason: "The airline moved it",
    });
    await call("delete_event", {
      id: id("Dinner at Dishoom"),
      reason: "Cancelled",
    });
    expect(calendar.events(home)).toHaveLength(1);
    expect(calendar.events(home)[0].data).not.toBe(flight);

    const outcomes = await undo({ runId });

    expect(outcomes?.every((outcome) => outcome.undone)).toBe(true);
    const stored = Object.fromEntries(
      calendar
        .events(home)
        .map((event): [string, string] => [
          event.url.split("/").at(-1) ?? "",
          event.data,
        ]),
    );
    expect(stored["flight.ics"]).toBe(flight);
    expect(stored["dinner.ics"]).toBe(dinner);
    expect(calendar.events(home).map((event) => event.url)).toContain(
      dinnerUrl,
    );
  });

  it("leaves an older event change while a later one stands, then undoes both in order", async () => {
    const flight = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:flight",
      "DTSTART:20261210T181000Z",
      "DTEND:20261210T193500Z",
      "SUMMARY:Flight BA2490",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    calendar.putEvent(home, "flight.ics", flight);
    const moveFlight = async (start: string) => {
      const run = await startRun();
      const { events } = z
        .object({ events: z.array(z.object({ id: z.string() })) })
        .parse(
          await run.call("list_events", {
            from: "2026-12-01",
            to: "2026-12-31",
          }),
        );
      await run.call("update_event", {
        id: events[0].id,
        start,
        allDay: false,
        reason: "The airline moved it",
      });
      return run.runId;
    };
    const first = await moveFlight("2026-12-10T20:40");
    const second = await moveFlight("2026-12-10T21:15");
    const latest = calendar.events(home)[0].data;

    expect(await undo({ runId: first })).toEqual([
      expect.objectContaining({ undone: false, refusal: "event-changed" }),
    ]);
    expect(calendar.events(home)[0].data).toBe(latest);

    expect(await undo({ runId: second })).toEqual([
      expect.objectContaining({ undone: true }),
    ]);
    expect(await undo({ runId: first })).toEqual([
      expect.objectContaining({ undone: true }),
    ]);
    expect(calendar.events(home)[0].data).toBe(flight);
  });

  it("leaves an event the owner put back after the agent deleted it", async () => {
    const { runId, call } = await startRun();
    const created = z.object({ id: z.string() }).parse(
      await call("create_event", {
        title: "Dentist",
        start: "2026-12-03T09:00",
        allDay: false,
        fromMail: "m1",
        reason: "Booking mail",
      }),
    );
    const [made] = calendar.events(home);
    await call("delete_event", { id: created.id, reason: "Cancelled" });
    const restored = made.data.replace("Dentist", "Dentist (kept by me)");
    calendar.putEvent(home, made.url.split("/").at(-1) ?? "", restored);

    const outcomes = await undo({ runId });

    expect(outcomes?.every((outcome) => !outcome.undone)).toBe(true);
    expect(calendar.events(home).map((event) => event.data)).toEqual([
      restored,
    ]);
  });

  it("leaves an event the owner changed since, and says so", async () => {
    const { runId, call } = await startRun();
    await call("create_event", {
      title: "Dentist",
      start: "2026-12-03T09:00",
      allDay: false,
      fromMail: "m1",
      reason: "Booking mail",
    });
    const [made] = calendar.events(home);
    const edited = made.data.replace("Dentist", "Dentist (moved by me)");
    calendar.putEvent(home, made.url.split("/").at(-1) ?? "", edited);

    expect(await undo({ runId })).toEqual([
      expect.objectContaining({ undone: false, refusal: "event-changed" }),
    ]);
    expect(calendar.events(home).map((event) => event.data)).toEqual([edited]);
  });

  it("refuses the actions of another user", async () => {
    const receipt = deliver("INBOX", "Your Uber receipt");
    const { runId, call } = await startRun();
    const ids = await idsIn(call, "INBOX");
    await call("move_mail", {
      ids: [ids["Your Uber receipt"]],
      folder: "Receipts",
      reason: "A receipt",
    });
    const stranger = await insertUser(db);
    const [action] = await actionsOf(runId);

    expect(await undo({ runId }, stranger)).toBeNull();
    expect(await undo({ actionIds: [action.id] }, stranger)).toBeNull();
    expect(mail.locate(receipt)).toMatchObject([{ path: "Receipts" }]);
    expect((await actionsOf(runId))[0].undoneAt).toBeNull();
  });
});
