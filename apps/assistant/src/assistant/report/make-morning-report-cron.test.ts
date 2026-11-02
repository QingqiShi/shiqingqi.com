import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { AgentModels } from "#src/assistant/ai/get-agent-models.ts";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import {
  agentActions,
  agentRuns,
  mailAccounts,
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
import type { PushMessage } from "#src/assistant/push/get-push-sender.ts";
import { pushDevices } from "#src/assistant/push/push-devices.ts";
import { makeMorningReportCron } from "./make-morning-report-cron.ts";

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

const SECRET = "test-cron-secret";
/** 09:00 in London: the report of 1 November, about the mail of 31 October (GMT). */
const NOW = new Date("2026-11-01T09:00:00Z");
const SEEN = "\\Seen";
let clock: Date;
const now = () => clock;

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeMailServer;
let calendar: FakeCalendarServer;
let pushed: PushMessage[];
let readerTexts: string[];

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

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

function textOf(prompt: CallOptions["prompt"], role: "system" | "user") {
  return prompt
    .flatMap((message) => {
      if (message.role !== role) return [];
      if (typeof message.content === "string") return [message.content];
      return message.content.flatMap((part) =>
        part.type === "text" ? [part.text] : [],
      );
    })
    .join("\n");
}

const listedSchema = z.object({
  mails: z.array(z.object({ id: z.string(), subject: z.string() })),
});
const eventsSchema = z.object({
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});

/** A reader that says each mail it gets is a bill. */
function scriptedReader() {
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const text = textOf(prompt, "user");
      readerTexts.push(text);
      const ids = [...text.matchAll(/^Id: (m\d+)$/gm)].map((match) => match[1]);
      return reply(
        [
          {
            type: "text",
            text: JSON.stringify({
              mails: ids.map((id) => ({
                id,
                kind: "transaction",
                summary: "A bill of 120 GBP, due on 5 November.",
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
  });
  return { id: "reader-model", model };
}

/**
 * A report agent that lists both folders and today's events, reads the
 * invoice, changes the to-dos and submits the report.
 */
function reportAgent() {
  const listings: unknown[] = [];
  const seen = { instructions: "", prompt: "", listings };
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const outputs = toolOutputs(prompt);
      const inbox = listedSchema.safeParse(outputs.get("inbox")).data;
      const archive = listedSchema.safeParse(outputs.get("archive")).data;
      const events = eventsSchema.safeParse(outputs.get("events")).data;
      if (!inbox || !archive || !events) {
        seen.instructions = textOf(prompt, "system");
        seen.prompt = textOf(prompt, "user");
        const day = { since: "2026-10-31", before: "2026-11-01" };
        return reply(
          [
            call(
              "list_mail",
              { account: "a1", folder: "INBOX", ...day },
              "inbox",
            ),
            call(
              "list_mail",
              { account: "a1", folder: "Archive", ...day },
              "archive",
            ),
            call(
              "list_events",
              { from: "2026-11-01", to: "2026-11-01" },
              "events",
            ),
          ],
          true,
        );
      }
      listings.splice(0, listings.length, inbox, archive);
      const id = (subject: string) =>
        [...inbox.mails, ...archive.mails].find(
          (mail) => mail.subject === subject,
        )?.id ?? "";
      const invoice = id("Invoice 42 from Example Ltd");
      const passport = id("Your new passport is on its way");
      if (!outputs.has("read")) {
        return reply([call("read_mail", { ids: [invoice] }, "read")], true);
      }
      if (!outputs.has("done")) {
        return reply(
          [
            call(
              "complete_todo",
              { todo: "t2", reason: "The passport office sent the new one." },
              "done",
            ),
            call("update_todo", { todo: "t1", dueDate: "2026-11-05" }),
            call("add_todo", {
              title: "Send the invoice to the accountant",
              mail: invoice,
            }),
          ],
          true,
        );
      }
      return reply(
        [
          call("submit_report", {
            headline: "Pay the Example invoice by Thursday.",
            needsAction: [
              {
                text: "Pay Example 120 GBP by Thursday.",
                mail: invoice,
                todo: "t1",
              },
            ],
            worthKnowing: [
              { text: "Your new passport is on its way.", mail: passport },
              { text: "A line about a mail the run never saw.", mail: "m99" },
            ],
            agenda: [
              { event: events.events[0].id, note: "Bring the referral form." },
              { event: "e99" },
            ],
            rest: "",
          }),
        ],
        true,
      );
    },
  });
  return { model: { id: "agent-model", model }, seen };
}

/** An agent model that fails at once. */
function failingAgent() {
  return {
    id: "agent-model",
    model: new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("The provider is down")),
    }),
  };
}

function runCron(agent: AgentModels["agent"] | null) {
  const handler = makeMorningReportCron({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    now,
    getBuildDeps: () => ({
      models: agent ? { agent, reader: scriptedReader() } : null,
      mail: mailDeps({ connector: server.connector, now }),
      calendarConnector: calendar.connector,
      now,
    }),
    getPushSender: () => (_device, message) => {
      pushed.push(message);
      return Promise.resolve("sent");
    },
  });
  return handler(
    new Request("https://assistant.qingqi.dev/api/cron/morning-report", {
      headers: { Authorization: `Bearer ${SECRET}` },
    }),
  ).then((response): Promise<unknown> => response.json());
}

function deliver(
  path: string,
  messageId: string,
  internalDate: string,
  mail: { subject: string; from?: string; body?: string },
) {
  return server.deliver(path, rawMail({ messageId, ...mail }), {
    internalDate: new Date(internalDate),
  });
}

/** Yesterday's three mails, one before and one after that day, and one the owner sent. */
function deliverDay() {
  return {
    invoice: deliver("INBOX", "<invoice@example.com>", "2026-10-31T10:00:00Z", {
      subject: "Invoice 42 from Example Ltd",
      from: "Billing <billing@example.com>",
      body: "Please pay 120 GBP by 5 November. Account 12345678.",
    }),
    passport: deliver(
      "Archive",
      "<passport@example.com>",
      "2026-10-31T23:30:00Z",
      { subject: "Your new passport is on its way" },
    ),
    late: deliver("INBOX", "<too-late@example.com>", "2026-11-01T00:30:00Z", {
      subject: "Sent after midnight",
    }),
    early: deliver("INBOX", "<too-early@example.com>", "2026-10-30T23:59:00Z", {
      subject: "Sent the day before",
    }),
    newsletter: deliver(
      "Newsletters",
      "<weekly@example.com>",
      "2026-10-31T08:00:00Z",
      { subject: "The weekly digest" },
    ),
    mine: deliver(
      "Sent Messages",
      "<mine@icloud.com>",
      "2026-10-31T12:00:00Z",
      {
        subject: "A mail I wrote",
      },
    ),
  };
}

function seenOf(path: string, uid: number) {
  return server.flagsOf(path, uid).includes(SEEN);
}

beforeEach(async () => {
  clock = NOW;
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  pushed = [];
  readerTexts = [];
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addFolder("Archive", { specialUse: "\\Archive" });
  server.addFolder("Newsletters");
  server.addFolder("Sent Messages", { specialUse: "\\Sent" });
  calendar = createFakeCalendarServer({
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
      "LOCATION:High Street 4",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n"),
  );
  await pushDevices.save(
    { db, userId },
    {
      endpoint: "https://push.example.com/device",
      keys: { p256dh: "key", auth: "secret" },
    },
    "",
  );
});

afterEach(async () => {
  await db.close();
});

async function insertTodos() {
  const [invoiceTodo, passportTodo] = await db
    .insert(todos)
    .values([
      {
        userId,
        title: "Pay the Example invoice",
        createdAt: new Date("2026-10-20T08:00:00Z"),
      },
      {
        userId,
        title: "Renew the passport",
        createdAt: new Date("2026-10-21T08:00:00Z"),
      },
      { userId, title: "Book the dentist", doneAt: NOW },
    ])
    .returning();
  return { invoiceTodo, passportTodo };
}

describe("the morning report cron", () => {
  it("runs the report agent over yesterday's mail and today's calendar, stores the report and the to-do changes, and then marks that day's mail read", async () => {
    const uids = deliverDay();
    const { invoiceTodo, passportTodo } = await insertTodos();
    const agent = reportAgent();

    expect(await runCron(agent.model)).toMatchObject({
      users: 1,
      built: 1,
      pushed: 1,
    });

    expect(agent.seen.prompt).toContain(
      '"INBOX" holds 1, 1 unread; "Archive" holds 1, 1 unread; "Newsletters" holds 1, 1 unread',
    );
    expect(agent.seen.prompt).not.toContain("Sent Messages");
    expect(agent.seen.prompt).toContain("t1: Pay the Example invoice");
    expect(agent.seen.prompt).toContain("t2: Renew the passport");
    expect(agent.seen.prompt).not.toContain("Book the dentist");
    const listed = JSON.stringify(agent.seen.listings);
    expect(listed).toContain("Invoice 42 from Example Ltd");
    expect(listed).not.toContain("Sent after midnight");
    expect(listed).not.toContain("Sent the day before");
    expect(readerTexts.join("\n")).toContain("Please pay 120 GBP");

    const [report] = await db.select().from(morningReports);
    expect(report).toMatchObject({
      localDate: "2026-11-01",
      modelId: "agent-model",
      notifiedAt: NOW,
    });
    expect(report.content).toEqual({
      version: 2,
      mailDate: "2026-10-31",
      status: "written",
      headline: "Pay the Example invoice by Thursday.",
      needsAction: [
        {
          text: "Pay Example 120 GBP by Thursday.",
          source: { accountId, messageId: "<invoice@example.com>" },
          todoId: invoiceTodo.id,
        },
      ],
      worthKnowing: [
        {
          text: "Your new passport is on its way.",
          source: { accountId, messageId: "<passport@example.com>" },
        },
        { text: "A line about a mail the run never saw.", source: null },
      ],
      rest: null,
      agenda: [
        {
          title: "Dentist",
          allDay: false,
          start: "2026-11-01T10:00",
          end: "2026-11-01T10:30",
          timeZone: null,
          location: "High Street 4",
          note: "Bring the referral form.",
        },
      ],
      mailCount: 3,
      ranOutOfTime: false,
      unreadMailboxes: [],
      doneTodos: [
        {
          id: passportTodo.id,
          title: "Renew the passport",
          reason: "The passport office sent the new one.",
        },
      ],
    });
    expect(pushed).toEqual([
      {
        title: "Pay the Example invoice by Thursday.",
        body: "1 new to-do.",
        url: "/",
      },
    ]);

    const stored = await db.select().from(todos);
    expect(stored.find((todo) => todo.id === invoiceTodo.id)).toMatchObject({
      dueDate: "2026-11-05",
      doneAt: null,
    });
    expect(stored.find((todo) => todo.id === passportTodo.id)?.doneAt).toEqual(
      NOW,
    );
    expect(stored.filter((todo) => todo.createdReportId === report.id)).toEqual(
      [
        expect.objectContaining({
          title: "Send the invoice to the accountant",
          sourceAccountId: accountId,
          sourceMessageId: "<invoice@example.com>",
        }),
      ],
    );

    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(seenOf("Archive", uids.passport)).toBe(true);
    expect(seenOf("Newsletters", uids.newsletter)).toBe(true);
    expect(seenOf("INBOX", uids.late)).toBe(false);
    expect(seenOf("INBOX", uids.early)).toBe(false);
    expect(seenOf("Sent Messages", uids.mine)).toBe(false);
    const actions = await db.select().from(agentActions);
    expect(
      actions.map((action) => [action.kind, action.messageId]).sort(),
    ).toEqual([
      ["mark_read", "<invoice@example.com>"],
      ["mark_read", "<passport@example.com>"],
      ["mark_read", "<weekly@example.com>"],
    ]);
    const [run] = await db.select().from(agentRuns);
    expect(run).toMatchObject({ task: "report", status: "done" });

    const kept = JSON.stringify({ report, stored });
    for (const secret of ["billing@example.com", "12345678", "Please pay"]) {
      expect(kept).not.toContain(secret);
    }

    clock = new Date("2026-11-01T10:00:00Z");
    expect(await runCron(failingAgent())).toMatchObject({ built: 0 });
  });

  it("stores nothing and marks no mail read while the agent submits no report, and the next hour stores the report once", async () => {
    const uids = deliverDay();
    await insertTodos();

    expect(await runCron(failingAgent())).toMatchObject({
      built: 0,
      retrying: 1,
    });
    expect(await db.$count(morningReports)).toBe(0);
    expect(await db.$count(todos)).toBe(3);
    expect(seenOf("INBOX", uids.invoice)).toBe(false);
    expect(server.log.writes).toEqual([]);
    expect(pushed).toEqual([]);

    clock = new Date("2026-11-01T10:00:00Z");
    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });
    clock = new Date("2026-11-01T11:00:00Z");
    expect(await runCron(reportAgent().model)).toMatchObject({
      built: 0,
      retrying: 0,
    });
    expect(await db.$count(morningReports)).toBe(1);
    expect(await db.$count(todos)).toBe(4);
    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(pushed.map((message) => message.title)).toEqual([
      "Pay the Example invoice by Thursday.",
    ]);
  });

  it("makes an agent that runs out of time submit what it has", async () => {
    deliverDay();
    const offered: string[][] = [];
    const choices: unknown[] = [];
    let lastAsk = "";
    const model = new MockLanguageModelV3({
      doGenerate: ({ prompt, toolChoice, tools }) => {
        const names = (tools ?? []).map((tool) => tool.name);
        offered.push(names);
        choices.push(toolChoice);
        lastAsk = textOf(prompt.slice(-1), "user");
        clock = new Date(clock.getTime() + 2 * 60_000);
        if (names.length === 1) {
          return reply(
            [
              call("submit_report", {
                headline: "A first look at yesterday's mail.",
                needsAction: [],
                worthKnowing: [],
                rest: "Not all mail was read.",
              }),
            ],
            true,
          );
        }
        return reply(
          [
            call(
              "list_mail",
              { account: "a1", folder: "INBOX" },
              `list${String(offered.length)}`,
            ),
          ],
          true,
        );
      },
    });

    expect(await runCron({ id: "agent-model", model })).toMatchObject({
      built: 1,
    });
    expect(offered.at(-1)).toEqual(["submit_report"]);
    expect(choices.at(-1)).toEqual({ type: "auto" });
    expect(lastAsk).toContain("Call submit_report now");
    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      headline: "A first look at yesterday's mail.",
      ranOutOfTime: true,
    });
  });

  it("retries while no mailbox can be read, and at the last try of the day stores a report that says so", async () => {
    await db.update(mailAccounts).set({ status: "reconnect" });
    deliverDay();
    const agent = reportAgent();

    expect(await runCron(agent.model)).toMatchObject({
      built: 0,
      retrying: 1,
    });
    expect(await db.$count(morningReports)).toBe(0);

    clock = new Date("2026-11-01T23:05:00Z");
    expect(await runCron(agent.model)).toMatchObject({
      built: 1,
      notWritten: 1,
    });
    const [report] = await db
      .select()
      .from(morningReports)
      .where(eq(morningReports.userId, userId));
    expect(report.content).toMatchObject({
      status: "failed",
      mailCount: 0,
      unreadMailboxes: [{ accountId, address: "me@icloud.com" }],
    });
    expect(agent.seen.prompt).toBe("");
    expect(pushed.map((message) => message.title)).toEqual([
      "Your morning report could not be written today",
    ]);
  });
});
