import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { ToolRefusal } from "#src/assistant/agent/agent-tool.ts";
import { RunMailboxes } from "#src/assistant/agent/mail/run-mailboxes.ts";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import {
  agentActions,
  agentRuns,
  morningReportPreviews,
  morningReports,
  todos,
} from "#src/assistant/db/schema.ts";
import { mailDeps } from "#src/assistant/mail/testing/insert-account.ts";
import { previewMailboxSession } from "./preview-mailbox-session.ts";
import {
  readReportPreview,
  REPORT_PREVIEW_STALE_MS,
} from "./read-report-preview.ts";
import {
  NOW,
  type CallOptions,
  reply,
  call,
  toolOutputs,
  reportAgent,
  silentAgent,
} from "./test-report-preview-agents.ts";
import {
  clock,
  now,
  db,
  userId,
  invoiceUid,
  server,
  buildDeps,
  start,
  previewRow,
  setClock,
  setUpReportPreview,
} from "./test-report-preview.ts";

setUpReportPreview();

describe("a preview of the next morning report", () => {
  it("runs the real agent over the last 24 hours and stores what it submits, with no effect on mail, to-dos, reports or actions", async () => {
    const [kept, closing] = await db
      .insert(todos)
      .values([
        {
          userId,
          title: "Book the dentist",
          createdAt: new Date("2026-10-20T08:00:00Z"),
        },
        {
          userId,
          title: "Renew the passport",
          createdAt: new Date("2026-10-21T08:00:00Z"),
        },
      ])
      .returning();
    await db.insert(morningReports).values({
      userId,
      localDate: "2026-11-01",
      content: {
        version: 2,
        mailDate: "2026-10-31",
        status: "written",
        headline: "Yesterday",
        needsAction: [],
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
      builtAt: new Date("2026-11-01T08:00:00Z"),
    });
    const todosBefore = await db.select().from(todos);
    const agent = reportAgent();

    expect(await start(buildDeps(agent.model))).toBe(204);

    expect(server.flagsOf("INBOX", invoiceUid)).toEqual([]);
    expect(server.log.writes).toEqual([]);
    expect(await db.select().from(todos)).toEqual(todosBefore);
    expect(await db.select().from(agentActions)).toEqual([]);
    expect(await db.$count(morningReports)).toBe(1);
    const [run] = await db.select().from(agentRuns);
    expect(run.task).toBe("report-preview");

    expect(agent.seen.prompt).toContain(
      "from 2026-10-31 15:42 up to 2026-11-01 15:42 in the owner's time zone",
    );
    expect(agent.seen.prompt).toContain("Today is Monday 2026-11-02");

    const row = await previewRow();
    expect(row).toMatchObject({
      status: "done",
      localDate: "2026-11-02",
      error: null,
      builtAt: NOW,
    });
    expect(row.content?.headline).toBe("Pay the invoice.");
    expect(row.content?.mailCount).toBe(1);
    expect(row.todoChanges?.added.map((todo) => todo.title)).toEqual([
      "Pay the new invoice",
    ]);

    const preview = await readReportPreview({ db, userId }, NOW);
    if (preview?.status !== "done") throw new Error("Expected a done preview");
    const [newLine, keptLine] = preview.report.needsAction;
    expect(newLine.todo?.title).toBe("Pay the new invoice");
    expect(newLine.todo?.openHref).not.toBeNull();
    expect(keptLine.todo?.id).toBe(kept.id);
    expect(keptLine.todo?.dueDate).toBe("2026-11-05");
    expect(preview.report.doneTodos.map((todo) => todo.id)).toEqual([
      closing.id,
    ]);
    expect(preview.report.doneTodos[0].doneAt).not.toBeNull();
    expect(preview.openTodos).toBe(2);
  });

  it("refuses every calendar write of its agent", async () => {
    const calendar = createFakeCalendarServer({
      user: "me@icloud.com",
      password: "app-password",
    });
    const home = calendar.addCalendar("Home", { isDefault: true });
    calendar.putEvent(
      home,
      "dentist.ics",
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:dentist",
        "DTSTART:20261101T100000Z",
        "DTEND:20261101T103000Z",
        "SUMMARY:Dentist",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
    const eventsBefore = calendar.events(home);
    const offered: string[][] = [];
    const prompts: CallOptions["prompt"][] = [];
    const writes = [
      call("create_event", {
        title: "Flight",
        start: "2026-11-03T10:00",
        allDay: false,
        fromMail: "m1",
        reason: "A booking.",
      }),
      call("update_event", { id: "e1", title: "Moved", reason: "It moved." }),
      call("delete_event", { id: "e1", reason: "It was cancelled." }),
    ];
    const steps = [
      [call("list_events", { from: "2026-11-01", to: "2026-11-01" })],
      writes,
      [
        call("submit_report", {
          headline: "Nothing urgent.",
          needsAction: [],
          worthKnowing: [],
          rest: "",
        }),
      ],
    ];
    const agent = {
      id: "agent-model",
      model: new MockLanguageModelV3({
        doGenerate: ({ tools = [], prompt }) => {
          offered.push(tools.map((tool) => tool.name));
          prompts.push(prompt);
          return reply(steps[offered.length - 1], true);
        },
      }),
    };

    await start({ ...buildDeps(agent), calendarConnector: calendar.connector });

    expect(offered).toHaveLength(steps.length);
    expect(offered[0]).toEqual(
      expect.arrayContaining(writes.map(({ toolName }) => toolName)),
    );
    const outputs = toolOutputs(prompts[2]);
    expect(JSON.stringify(outputs.get("list_events"))).toContain("Dentist");
    for (const { toolName } of writes) {
      expect(outputs.get(toolName)).toEqual({
        error:
          "This is a preview, so the calendar was not changed. Say in the report what you would change.",
      });
    }
    expect(calendar.events(home)).toEqual(eventsBefore);
    expect(await db.select().from(agentActions)).toEqual([]);
    const row = await previewRow();
    expect(row.status).toBe("done");
    expect(row.content?.agenda?.map((entry) => entry.title)).toEqual([
      "Dentist",
    ]);
  });

  it("shows every edit of a to-do, not only the last", async () => {
    const [todo] = await db
      .insert(todos)
      .values({ userId, title: "Book the dentist" })
      .returning();
    await db.insert(morningReportPreviews).values({
      userId,
      status: "done",
      localDate: "2026-11-02",
      content: {
        version: 2,
        mailDate: "2026-10-31",
        status: "written",
        headline: "Book it.",
        needsAction: [{ text: "Book it.", source: null, todoId: todo.id }],
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
      todoChanges: {
        added: [],
        done: [],
        updated: [
          {
            id: todo.id,
            reason: "In the mail.",
            edit: { dueDate: "2026-11-05" },
          },
          {
            id: todo.id,
            reason: "In the mail.",
            edit: { detail: "Before the trip." },
          },
        ],
      },
      startedAt: NOW,
      builtAt: NOW,
    });

    const preview = await readReportPreview({ db, userId }, NOW);
    if (preview?.status !== "done") throw new Error("Expected a done preview");
    expect(preview.report.needsAction[0].todo).toMatchObject({
      dueDate: "2026-11-05",
      detail: "Before the trip.",
    });
  });

  it("refuses every write through its session, also after a new login", async () => {
    const mailboxes = await RunMailboxes.open(
      db,
      userId,
      mailDeps({ connector: server.connector, now }),
      {
        decorateSession: (session) => previewMailboxSession(session, new Set()),
      },
    );
    const expectRefusals = () =>
      mailboxes.use("a1", async ({ session }) => {
        await session.openFolder("INBOX");
        for (const write of [
          session.createFolder("New"),
          session.renameFolder("INBOX", "Old"),
          session.deleteEmptyFolder("Old"),
          session.openFolder("INBOX", { write: true }),
          session.addFlags([invoiceUid], ["\\Seen"]),
          session.removeFlags([invoiceUid], ["\\Seen"]),
          session.moveMessages([invoiceUid], "Archive"),
        ]) {
          await expect(write).rejects.toBeInstanceOf(ToolRefusal);
        }
      });

    await expectRefusals();
    server.dropConnections();
    await expectRefusals();
    await mailboxes.finish();

    expect(server.log.logins).toBe(2);
    expect(server.log.writes).toEqual([]);
    expect(server.log.createdFolders).toEqual([]);
    expect(server.flagsOf("INBOX", invoiceUid)).toEqual([]);
  });

  it("refuses a second start while one runs, and accepts one once the running row is stale", async () => {
    const running = () =>
      db.insert(morningReportPreviews).values({
        userId,
        status: "running",
        localDate: "2026-11-02",
        startedAt: NOW,
      });
    await running();

    setClock(new Date(NOW.getTime() + REPORT_PREVIEW_STALE_MS - 1000));
    expect(await start(buildDeps(reportAgent().model))).toBe(409);
    expect((await previewRow()).startedAt).toEqual(NOW);
    expect(await readReportPreview({ db, userId }, clock)).toEqual({
      status: "running",
    });

    setClock(new Date(NOW.getTime() + REPORT_PREVIEW_STALE_MS));
    expect(await readReportPreview({ db, userId }, clock)).toEqual({
      status: "failed",
      reason: "interrupted",
    });
    expect(await start(buildDeps(silentAgent()))).toBe(204);
    expect((await previewRow()).startedAt).toEqual(clock);
  });

  it("ends in a failed row when there is no model, no mail set-up or no submitted report", async () => {
    const outcomes = [
      { deps: buildDeps(null), error: "no-model" },
      { deps: null, error: "no-mailbox" },
      { deps: buildDeps(silentAgent()), error: "no-report" },
    ];
    for (const { deps, error } of outcomes) {
      expect(await start(deps)).toBe(204);
      expect(await previewRow()).toMatchObject({
        status: "failed",
        error,
        builtAt: null,
      });
    }
  });

  it("ends in a failed row when no mailbox can be read", async () => {
    server.failNextConnects(new Error("The server is down"));
    expect(await start(buildDeps(silentAgent()))).toBe(204);
    expect(await previewRow()).toMatchObject({
      status: "failed",
      error: "no-mailbox",
    });
  });
});
