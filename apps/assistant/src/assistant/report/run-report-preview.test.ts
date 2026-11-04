import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
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
import {
  openReportMailboxes,
  runReportOverMailboxes,
  type ReportBuildDeps,
} from "./build-morning-report.ts";
import { makeReportPreviewHandlers } from "./make-report-preview-handlers.ts";
import { previewMailboxSession } from "./preview-mailbox-session.ts";
import {
  readReportPreview,
  REPORT_PREVIEW_STALE_MS,
} from "./read-report-preview.ts";
import { readReportSettings } from "./read-report-settings.ts";

type DoGenerate = Extract<
  NonNullable<
    NonNullable<
      ConstructorParameters<typeof MockLanguageModelV3>[0]
    >["doGenerate"]
  >,
  (...args: never[]) => unknown
>;
type CallOptions = Parameters<DoGenerate>[0];
type Content = Awaited<ReturnType<DoGenerate>>["content"][number];

const ORIGIN = "http://localhost:3000";
/** 15:42 in London (GMT), after the report of 1 November has gone out: the next report is that of 2 November. */
const NOW = new Date("2026-11-01T15:42:00Z");
const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

let clock: Date;
const now = () => clock;
let db: TestDb;
let userId: string;
let accountId: string;
let invoiceUid: number;
let server: FakeMailServer;
let background: Promise<void>[];

function reply(content: Content[], toolCalls: boolean) {
  return Promise.resolve({
    content,
    finishReason: toolCalls
      ? { unified: "tool-calls" as const, raw: "tool_use" }
      : { unified: "stop" as const, raw: "end_turn" },
    usage: USAGE,
    warnings: [],
  });
}

function call(name: string, input: unknown, id = name) {
  return {
    type: "tool-call" as const,
    toolCallId: id,
    toolName: name,
    input: JSON.stringify(input),
  };
}

function toolOutputs(prompt: CallOptions["prompt"]) {
  const outputs = new Map<string, unknown>();
  for (const message of prompt) {
    if (message.role !== "tool") continue;
    for (const part of message.content) {
      if (part.type === "tool-result" && part.output.type === "json") {
        outputs.set(part.toolCallId, part.output.value);
      }
    }
  }
  return outputs;
}

const listedSchema = z.object({
  mails: z.array(
    z.object({ id: z.string(), subject: z.string(), unread: z.boolean() }),
  ),
  nextCursor: z.string().nullable(),
});

function userText(prompt: CallOptions["prompt"]) {
  return prompt
    .flatMap((message) =>
      message.role === "user" && typeof message.content !== "string"
        ? message.content.flatMap((part) =>
            part.type === "text" ? [part.text] : [],
          )
        : [],
    )
    .join("\n");
}

function readerModel() {
  return {
    id: "reader-model",
    model: new MockLanguageModelV3({
      doGenerate: ({ prompt }) => {
        const ids = [...userText(prompt).matchAll(/^Id: (m\d+)$/gm)].map(
          (m) => m[1],
        );
        return reply(
          [
            {
              type: "text",
              text: JSON.stringify({
                mails: ids.map((id) => ({
                  id,
                  kind: "transaction",
                  summary: "A bill.",
                  needsOwner: true,
                  warning: null,
                  events: [],
                })),
              }),
            },
          ],
          false,
        );
      },
    }),
  };
}

/** An agent that lists and reads the mail, changes the to-dos in every way and submits. */
function reportAgent() {
  const seen = { prompt: "" };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const inbox = listedSchema.safeParse(outputs.get("inbox")).data;
      if (!inbox) {
        seen.prompt = userText(prompt);
        return reply(
          [
            call(
              "list_mail",
              {
                account: "a1",
                folder: "INBOX",
                since: "2026-10-31T15:42:00.000Z",
                before: NOW.toISOString(),
              },
              "inbox",
            ),
          ],
          true,
        );
      }
      const mail = inbox.mails[0].id;
      if (!outputs.has("read")) {
        return reply([call("read_mail", { ids: [mail] }, "read")], true);
      }
      if (!outputs.has("added")) {
        return reply(
          [
            call(
              "add_todo",
              { title: "Pay the new invoice", mail, reason: "It is due." },
              "added",
            ),
            call("complete_todo", { todo: "t2", reason: "It came." }, "closed"),
            call("update_todo", {
              todo: "t1",
              dueDate: "2026-11-05",
              reason: "The date moved.",
            }),
          ],
          true,
        );
      }
      return reply(
        [
          call("submit_report", {
            headline: "Pay the invoice.",
            needsAction: [
              { text: "Pay the new invoice.", mail, todo: "t3" },
              { text: "Book the dentist.", todo: "t1" },
            ],
            worthKnowing: [],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

/** An agent that lists the folder, walks its unread mail one page at a time and submits. */
function listingAgent() {
  const seen: {
    prompt: string;
    listed: Map<string, boolean>;
    unreadOnly: string[];
  } = { prompt: "", listed: new Map(), unreadOnly: [] };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const unreadPage = (cursor?: string) =>
        call(
          "list_mail",
          {
            account: "a1",
            folder: "INBOX",
            unreadOnly: true,
            limit: 1,
            cursor,
          },
          `page${String(outputs.size)}`,
        );
      if (outputs.size === 0) {
        seen.prompt = userText(prompt);
        return reply(
          [
            call(
              "list_mail",
              {
                account: "a1",
                folder: "INBOX",
                since: "2026-10-31T15:42:00.000Z",
                before: NOW.toISOString(),
              },
              "all",
            ),
            unreadPage(),
          ],
          true,
        );
      }
      const pages = [...outputs]
        .filter(([id]) => id.startsWith("page"))
        .map(([, output]) => listedSchema.parse(output));
      const cursor = pages.at(-1)?.nextCursor;
      if (cursor) return reply([unreadPage(cursor)], true);
      for (const mail of listedSchema.parse(outputs.get("all")).mails) {
        seen.listed.set(mail.subject, mail.unread);
      }
      seen.unreadOnly = pages.flatMap((page) =>
        page.mails.map((mail) => mail.subject),
      );
      return reply(
        [
          call("submit_report", {
            headline: "Nothing urgent.",
            needsAction: [],
            worthKnowing: [],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

function silentAgent() {
  return {
    id: "agent-model",
    model: new MockLanguageModelV3({
      doGenerate: () =>
        reply([{ type: "text", text: "Nothing to say." }], false),
    }),
  };
}

function handlers(deps: ReportBuildDeps | null) {
  return makeReportPreviewHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve({ sessionId: "s", userId }),
    now,
    getBuildDeps: () => deps,
    runInBackground: (work) => {
      background.push(work());
    },
  });
}

function buildDeps(agent: ReturnType<typeof silentAgent> | null) {
  const calendar = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  calendar.addCalendar("Home", { isDefault: true });
  return {
    models: agent ? { agent, reader: readerModel() } : null,
    mail: mailDeps({ connector: server.connector, now }),
    calendarConnector: calendar.connector,
    now,
    sleep: () => Promise.resolve(),
  };
}

async function start(deps: ReportBuildDeps | null) {
  const response = await handlers(deps).start(
    new Request(`${ORIGIN}/api/report-preview`, {
      method: "POST",
      headers: { Origin: ORIGIN },
    }),
  );
  await Promise.all(background);
  return response.status;
}

/** Delivers a mail that is read on the server, and logs that a real report marked it read when `action` is given. */
async function deliverRead(
  subject: string,
  internalDate: Date,
  action?: { createdAt: Date; undoneAt?: Date },
) {
  const messageId = `<${subject}@example.com>`;
  const uid = server.deliver(
    "INBOX",
    rawMail({ messageId, subject, body: "Text." }),
    { flags: ["\\Seen"], internalDate },
  );
  if (action) {
    const [run] = await db
      .insert(agentRuns)
      .values({
        userId,
        task: "report",
        modelId: "agent-model",
        startedAt: action.createdAt,
      })
      .returning({ id: agentRuns.id });
    await db.insert(agentActions).values({
      ...action,
      runId: run.id,
      userId,
      accountId,
      kind: "mark_read",
      messageId,
      reason: "In the morning report",
    });
  }
  return uid;
}

async function previewRow() {
  const [row] = await db
    .select()
    .from(morningReportPreviews)
    .where(eq(morningReportPreviews.userId, userId));
  return row;
}

beforeEach(async () => {
  clock = NOW;
  background = [];
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  invoiceUid = server.deliver(
    "INBOX",
    rawMail({
      messageId: "<invoice@example.com>",
      subject: "Invoice 42",
      body: "Please pay 120 GBP.",
    }),
    { internalDate: new Date("2026-11-01T10:00:00Z") },
  );
});

afterEach(async () => {
  await db.close();
});

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

  describe("with mail that a real report marked read", () => {
    const MARKED_AT = new Date("2026-11-01T12:00:00Z");
    const RECEIVED_AT = new Date("2026-11-01T09:00:00Z");
    const deliverMail = async () => ({
      marked: await deliverRead("Marked", RECEIVED_AT, {
        createdAt: MARKED_AT,
      }),
      ownerRead: await deliverRead("Owner-read", RECEIVED_AT),
      undone: await deliverRead("Undone", RECEIVED_AT, {
        createdAt: MARKED_AT,
        undoneAt: new Date("2026-11-01T13:00:00Z"),
      }),
    });

    it("shows that mail unread to a preview's agent, and no other read mail, and changes no flag", async () => {
      const uids = await deliverMail();
      const actionsBefore = await db.select().from(agentActions);
      const agent = listingAgent();

      expect(await start(buildDeps(agent.model))).toBe(204);

      expect(agent.seen.listed).toEqual(
        new Map([
          ["Invoice 42", true],
          ["Marked", true],
          ["Owner-read", false],
          ["Undone", false],
        ]),
      );
      expect(agent.seen.unreadOnly).toEqual(["Invoice 42", "Marked"]);
      expect(agent.seen.prompt).toContain("holds 4, 2 unread");

      expect((await previewRow()).status).toBe("done");
      expect(server.log.writes).toEqual([]);
      expect(server.flagsOf("INBOX", uids.marked)).toEqual(["\\Seen"]);
      expect(server.flagsOf("INBOX", uids.ownerRead)).toEqual(["\\Seen"]);
      expect(server.flagsOf("INBOX", invoiceUid)).toEqual([]);
      expect(await db.select().from(agentActions)).toEqual(actionsBefore);
    });

    it("leaves that mail read for a real report", async () => {
      await deliverMail();
      const agent = listingAgent();
      const deps = buildDeps(agent.model);
      const mailboxes = await openReportMailboxes({ db, userId }, deps);
      const mailWindow = {
        start: new Date("2026-10-31T15:42:00Z"),
        end: NOW,
      };
      const settings = await readReportSettings({ db, userId });
      try {
        await runReportOverMailboxes(
          { db, userId, endsAt: NOW.getTime() + 600_000 },
          { ...deps, models: { agent: agent.model, reader: readerModel() } },
          {
            mailboxes,
            settings,
            today: "2026-11-02",
            mailWindow,
            mailStart: () => mailWindow.start,
            task: "report",
          },
        );
      } finally {
        await mailboxes.finish();
      }

      expect(agent.seen.listed.get("Marked")).toBe(false);
      expect(agent.seen.unreadOnly).toEqual(["Invoice 42"]);
      expect(agent.seen.prompt).toContain("holds 4, 1 unread");
    });

    it("reaches back to the catch-up start of a missed mailbox", async () => {
      await db.insert(morningReports).values({
        userId,
        localDate: "2026-10-29",
        content: {
          version: 2,
          mailDate: "2026-10-28",
          status: "written",
          headline: "Yesterday",
          needsAction: [],
          worthKnowing: [],
          rest: null,
          agenda: null,
          mailCount: 0,
          ranOutOfTime: false,
          unreadMailboxes: [{ accountId, address: "me@icloud.com" }],
          doneTodos: [],
        },
        builtAt: new Date("2026-10-29T08:00:00Z"),
      });
      await deliverRead("Old", new Date("2026-10-28T03:00:00Z"), {
        createdAt: new Date("2026-10-28T08:00:00Z"),
      });
      const agent = listingAgent();

      expect(await start(buildDeps(agent.model))).toBe(204);

      expect(agent.seen.prompt).toContain("holds 2, 2 unread");
    });
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

    clock = new Date(NOW.getTime() + REPORT_PREVIEW_STALE_MS - 1000);
    expect(await start(buildDeps(reportAgent().model))).toBe(409);
    expect((await previewRow()).startedAt).toEqual(NOW);
    expect(await readReportPreview({ db, userId }, clock)).toEqual({
      status: "running",
    });

    clock = new Date(NOW.getTime() + REPORT_PREVIEW_STALE_MS);
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
