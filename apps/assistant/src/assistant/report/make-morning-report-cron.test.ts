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
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type { MailboxConnector } from "#src/assistant/mail/imap/types.ts";
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
/** 09:00 in London (GMT): the report of 1 November, set for 08:00, about the mail from 08:00 the day before up to 08:00. */
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
let sleeps: number[];
let onSleep: () => void;

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
        const day = {
          since: "2026-10-31T08:00:00.000Z",
          before: "2026-11-01T08:00:00.000Z",
        };
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
            call("update_todo", {
              todo: "t1",
              dueDate: "2026-11-05",
              reason: "The invoice says Thursday.",
            }),
            call("add_todo", {
              title: "Send the invoice to the accountant",
              mail: invoice,
              reason: "The accountant needs it.",
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

function runCron(
  agent: AgentModels["agent"] | null,
  connector: MailboxConnector = server.connector,
) {
  const handler = makeMorningReportCron({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    now,
    getBuildDeps: () => ({
      models: agent ? { agent, reader: scriptedReader() } : null,
      mail: mailDeps({ connector, now }),
      calendarConnector: calendar.connector,
      now,
      sleep: (ms) => {
        sleeps.push(ms);
        onSleep();
        return Promise.resolve();
      },
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
  target: FakeMailServer = server,
) {
  return target.deliver(path, rawMail({ messageId, ...mail }), {
    internalDate: new Date(internalDate),
  });
}

/** The four mails of the window, one on each side of it, and one the owner sent. */
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
    lastIn: deliver("INBOX", "<last-in@example.com>", "2026-11-01T07:59:59Z", {
      subject: "Sent just before the report time",
    }),
    late: deliver("INBOX", "<too-late@example.com>", "2026-11-01T08:00:00Z", {
      subject: "Sent at the report time",
    }),
    early: deliver("INBOX", "<too-early@example.com>", "2026-10-31T07:59:59Z", {
      subject: "Sent before the window",
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
  sleeps = [];
  onSleep = () => undefined;
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
  it("runs the report agent over the mail of the 24 hours before the report time and today's calendar, stores the report and the to-do changes, and then marks exactly that mail read", async () => {
    const uids = deliverDay();
    const { invoiceTodo, passportTodo } = await insertTodos();
    const agent = reportAgent();

    expect(await runCron(agent.model)).toMatchObject({
      users: 1,
      built: 1,
      pushed: 1,
    });

    expect(agent.seen.prompt).toContain(
      "The report covers every mail received from 2026-10-31 08:00 up to 2026-11-01 08:00 in the owner's time zone (2026-10-31T08:00:00.000Z to 2026-11-01T08:00:00.000Z).",
    );
    expect(agent.seen.prompt).toContain(
      '"INBOX" holds 2, 2 unread; "Archive" holds 1, 1 unread; "Newsletters" holds 1, 1 unread',
    );
    expect(agent.seen.prompt).not.toContain("Sent Messages");
    expect(agent.seen.prompt).toContain("t1: Pay the Example invoice");
    expect(agent.seen.prompt).toContain("t2: Renew the passport");
    expect(agent.seen.prompt).not.toContain("Book the dentist");
    const listed = JSON.stringify(agent.seen.listings);
    expect(listed).toContain("Invoice 42 from Example Ltd");
    expect(listed).toContain("Sent just before the report time");
    expect(listed).not.toContain("Sent at the report time");
    expect(listed).not.toContain("Sent before the window");
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
      mailCount: 4,
      ranOutOfTime: false,
      unreadMailboxes: [],
      doneTodos: [
        {
          id: passportTodo.id,
          title: "Renew the passport",
          reason: "The passport office sent the new one.",
        },
      ],
      waitingTodoIds: [],
      repliedTodoIds: [],
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
    expect(seenOf("INBOX", uids.lastIn)).toBe(true);
    expect(seenOf("INBOX", uids.late)).toBe(false);
    expect(seenOf("INBOX", uids.early)).toBe(false);
    expect(seenOf("Sent Messages", uids.mine)).toBe(false);
    const actions = await db.select().from(agentActions);
    expect(
      actions
        .filter((action) => action.kind === "mark_read")
        .map((action) => action.messageId)
        .sort(),
    ).toEqual([
      "<invoice@example.com>",
      "<last-in@example.com>",
      "<passport@example.com>",
      "<weekly@example.com>",
    ]);
    const [run] = await db.select().from(agentRuns);
    expect(
      actions
        .filter((action) => action.kind !== "mark_read")
        .map(({ kind, reason, runId }) => ({ kind, reason, runId }))
        .sort((a, b) => a.kind.localeCompare(b.kind)),
    ).toEqual([
      {
        kind: "add_todo",
        reason: "The accountant needs it.",
        runId: run.id,
      },
      {
        kind: "complete_todo",
        reason: "The passport office sent the new one.",
        runId: run.id,
      },
      {
        kind: "update_todo",
        reason: "The invoice says Thursday.",
        runId: run.id,
      },
    ]);
    expect(run).toMatchObject({ task: "report", status: "done" });

    const kept = JSON.stringify({ report, stored });
    for (const secret of ["billing@example.com", "12345678", "Please pay"]) {
      expect(kept).not.toContain(secret);
    }

    clock = new Date("2026-11-01T10:00:00Z");
    expect(await runCron(failingAgent())).toMatchObject({ built: 0 });
  });

  it("reads a mailbox whose server cannot move mail, and keeps saying that it cannot", async () => {
    server = createFakeMailServer({
      user: "me@icloud.com",
      password: "app-password",
      move: false,
      uidPlus: false,
    });
    server.addFolder("Archive", { specialUse: "\\Archive" });
    server.addFolder("Newsletters");
    server.addFolder("Sent Messages", { specialUse: "\\Sent" });
    const mails = deliverDay();

    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });

    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      unreadMailboxes: [],
    });
    expect(seenOf("INBOX", mails.invoice)).toBe(true);
    const [account] = await db.select().from(mailAccounts);
    expect(account).toMatchObject({
      status: "ok",
      writeErrorCode: "move_unsupported",
    });
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

    const afterEnd = deliver(
      "INBOX",
      "<after-end@example.com>",
      "2026-11-01T09:30:00Z",
      { subject: "Came before the late build" },
    );
    clock = new Date("2026-11-01T10:00:00Z");
    expect(await runCron(reportAgent().model)).toMatchObject({ built: 1 });
    expect(seenOf("INBOX", afterEnd)).toBe(false);
    const [built] = await db.select().from(morningReports);
    expect(built.content).toMatchObject({ mailCount: 4 });
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

  it("makes an agent that runs out of time submit what it has, and marks read only the window's mail of what it listed", async () => {
    const uids = deliverDay();
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
    expect(seenOf("INBOX", uids.invoice)).toBe(true);
    expect(seenOf("INBOX", uids.late)).toBe(false);
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

  describe("when one of two mailboxes fails to open", () => {
    /** The first run of the report: 08:05 in London, the default digest hour. */
    const REPORT_HOUR = new Date("2026-11-01T08:05:00Z");
    const SECOND = "you@icloud.com";
    let second: FakeMailServer;
    let secondId: string;
    let connector: MailboxConnector;

    beforeEach(async () => {
      second = createFakeMailServer({ user: SECOND, password: "app-password" });
      secondId = await insertAccount(db, userId, { address: SECOND });
      // The report agent reads account "a1". This keeps "me" first, also when the other one fails.
      await db
        .update(mailAccounts)
        .set({ lastSyncedAt: new Date("2026-12-01T00:00:00Z") })
        .where(eq(mailAccounts.id, secondId));
      connector = (host, auth) =>
        (auth.user === SECOND ? second : server).connector(host, auth);
      second.addFolder("Archive", { specialUse: "\\Archive" });
      deliverDay();
      second.failNextConnects(new Error("Login timed out"));
      clock = REPORT_HOUR;
    });

    const secondAccount = async () =>
      (
        await db
          .select()
          .from(mailAccounts)
          .where(eq(mailAccounts.id, secondId))
      )[0];

    it("reads it at the first run when it opens on a retry, and leaves no error on it", async () => {
      onSleep = () => {
        second.failNextConnects(null);
      };

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toHaveLength(1);
      const [report] = await db.select().from(morningReports);
      expect(report.content).toMatchObject({
        status: "written",
        unreadMailboxes: [],
      });
      expect(await secondAccount()).toMatchObject({
        status: "ok",
        lastErrorCode: null,
      });
    });

    it("stores the report on time when it stays down, and the next report also covers the mail it missed, from local midnight", async () => {
      const inSecond = (path: string, name: string, internalDate: string) =>
        deliver(
          path,
          `<${name}@example.com>`,
          internalDate,
          { subject: name },
          second,
        );
      const tooOld = inSecond("INBOX", "too-old", "2026-10-30T23:59:59Z");
      const atMidnight = inSecond(
        "INBOX",
        "at-midnight",
        "2026-10-31T00:00:00Z",
      );
      const missedInbox = inSecond("INBOX", "missed", "2026-10-31T10:00:00Z");
      const missedArchive = inSecond(
        "Archive",
        "missed-archived",
        "2026-10-31T23:30:00Z",
      );

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toHaveLength(2);
      const [first] = await db.select().from(morningReports);
      expect(first.content).toMatchObject({
        status: "written",
        unreadMailboxes: [{ accountId: secondId, address: SECOND }],
      });
      expect(await secondAccount()).toMatchObject({
        status: "error",
        lastErrorCode: "sync_failed",
      });
      expect(second.log.writes).toEqual([]);

      second.failNextConnects(null);
      const newInSecond = inSecond("INBOX", "new", "2026-11-01T09:00:00Z");
      const todayInSecond = inSecond("INBOX", "today", "2026-11-02T00:10:00Z");
      const afterWindow = inSecond("INBOX", "after", "2026-11-02T08:00:00Z");
      const olderInFirst = deliver(
        "INBOX",
        "<found-late@example.com>",
        "2026-10-31T15:00:00Z",
        { subject: "Filed back into the inbox after the first report" },
      );
      clock = new Date("2026-11-02T08:05:00Z");
      const agent = reportAgent();

      expect(await runCron(agent.model, connector)).toMatchObject({
        built: 1,
      });

      expect(agent.seen.prompt).toContain(
        'since 2026-10-31T00:00:00.000Z: "INBOX" holds 4, 4 unread',
      );
      const secondSeen = (path: string, uid: number) =>
        second.flagsOf(path, uid).includes(SEEN);
      expect(secondSeen("INBOX", atMidnight)).toBe(true);
      expect(secondSeen("INBOX", missedInbox)).toBe(true);
      expect(secondSeen("Archive", missedArchive)).toBe(true);
      expect(secondSeen("INBOX", newInSecond)).toBe(true);
      expect(secondSeen("INBOX", tooOld)).toBe(false);
      expect(secondSeen("INBOX", todayInSecond)).toBe(true);
      expect(secondSeen("INBOX", afterWindow)).toBe(false);
      expect(seenOf("INBOX", olderInFirst)).toBe(false);
      const latest = (await db.select().from(morningReports)).find(
        (report) => report.localDate === "2026-11-02",
      );
      expect(latest?.content).toMatchObject({
        status: "written",
        unreadMailboxes: [],
        // The window's mail: "Sent at the report time", "new" and "today".
        mailCount: 3,
      });
    });

    it("does not retry a login that only a new connect can fix", async () => {
      second.failNextConnects(new MailboxAuthError());

      expect(await runCron(reportAgent().model, connector)).toMatchObject({
        built: 1,
      });

      expect(sleeps).toEqual([]);
      const [report] = await db.select().from(morningReports);
      expect(report.content).toMatchObject({
        status: "written",
        unreadMailboxes: [{ accountId: secondId, address: SECOND }],
      });
      expect(await secondAccount()).toMatchObject({ status: "reconnect" });
    });
  });
});
