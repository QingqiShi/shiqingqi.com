import { MockLanguageModelV3 } from "ai/test";
import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import {
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
import type { ReportPromptOutput } from "./report-prompt.ts";

const SECRET = "test-cron-secret";
/** 09:00 in London: the report of 1 November, about the mail of 31 October (GMT). */
const NOW = new Date("2026-11-01T09:00:00Z");
let clock: Date;
const now = () => clock;

let db: TestDb;
let userId: string;
let accountId: string;
let server: FakeMailServer;
let prompts: string[];
let pushed: PushMessage[];

function stubModel(output: ReportPromptOutput | Error): AssistantModel {
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      prompts.push(
        prompt
          .flatMap((message) =>
            message.role === "user"
              ? message.content.flatMap((part) =>
                  part.type === "text" ? [part.text] : [],
                )
              : [],
          )
          .join("\n"),
      );
      if (output instanceof Error) return Promise.reject(output);
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(output) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 10,
            noCache: 10,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 10, text: 10, reasoning: undefined },
        },
        warnings: [],
      });
    },
  });
  return { id: "test-model", model };
}

function runCron(model: AssistantModel | null) {
  const handler = makeMorningReportCron({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    now,
    getBuildDeps: () => ({
      model,
      mail: mailDeps({ connector: server.connector, now }),
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

beforeEach(async () => {
  clock = NOW;
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  prompts = [];
  pushed = [];
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addFolder("Archive", { specialUse: "\\Archive" });
  server.addFolder("Sent Messages", { specialUse: "\\Sent" });
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

describe("the morning report cron", () => {
  it("reads yesterday's mail read-only, stores the report and its new to-dos, and keeps nothing of the mail", async () => {
    const invoice = {
      subject: "Invoice 42 from Example Ltd",
      from: "Billing <billing@example.com>",
      body: "Please pay 120 GBP by 5 November. Account 12345678.",
    };
    const invoiceUid = deliver(
      "INBOX",
      "<invoice@example.com>",
      "2026-10-31T10:00:00Z",
      invoice,
    );
    deliver(
      "Archive",
      "<invoice@example.com>",
      "2026-10-31T10:00:00Z",
      invoice,
    );
    deliver("Archive", "<parcel@example.com>", "2026-10-31T23:30:00Z", {
      subject: "Your parcel is on its way",
    });
    deliver("INBOX", "<too-late@example.com>", "2026-11-01T00:30:00Z", {
      subject: "Sent after midnight",
    });
    deliver("INBOX", "<too-early@example.com>", "2026-10-30T23:59:00Z", {
      subject: "Sent the day before",
    });
    deliver("Sent Messages", "<mine@icloud.com>", "2026-10-31T12:00:00Z", {
      subject: "A mail I wrote",
    });
    const [passport, done] = await db
      .insert(todos)
      .values([
        { userId, title: "Renew the passport", detail: "It runs out in May" },
        { userId, title: "Book the dentist", doneAt: NOW },
      ])
      .returning();

    const totals = await runCron(
      stubModel({
        headline: "Pay the Example invoice by Thursday.",
        needsAction: [{ text: "Pay Example 120 GBP by Thursday.", mail: "m1" }],
        worthKnowing: [{ text: "A parcel arrives today.", mail: "m2" }],
        rest: "",
        todos: [
          {
            title: "Pay the Example invoice",
            detail: "120 GBP",
            dueDate: "2026-11-05",
            mail: "m1",
          },
          { title: "Call back", detail: null, dueDate: "Friday", mail: "m9" },
        ],
      }),
    );

    expect(totals).toMatchObject({ users: 1, built: 1, pushed: 1 });
    expect(prompts).toHaveLength(1);
    const [prompt] = prompts;
    expect(prompt).toContain(passport.id);
    expect(prompt).toContain("Renew the passport");
    expect(prompt).not.toContain(done.title);
    expect(prompt.split(invoice.subject)).toHaveLength(2);
    expect(prompt).toContain("Your parcel is on its way");
    expect(prompt).toContain("Please pay 120 GBP by 5 November.");
    for (const left of [
      "Sent after midnight",
      "Sent the day before",
      "A mail I wrote",
    ]) {
      expect(prompt).not.toContain(left);
    }

    const [report] = await db.select().from(morningReports);
    expect(report).toMatchObject({
      localDate: "2026-11-01",
      modelId: "test-model",
      notifiedAt: NOW,
      content: {
        mailDate: "2026-10-31",
        status: "written",
        headline: "Pay the Example invoice by Thursday.",
        needsAction: [
          {
            text: "Pay Example 120 GBP by Thursday.",
            source: { accountId, messageId: "<invoice@example.com>" },
          },
        ],
        mailCount: 2,
        leftOut: 0,
        unreadMailboxes: [],
      },
    });
    expect(pushed).toEqual([
      {
        title: "Pay the Example invoice by Thursday.",
        body: "2 new to-dos.",
        url: "/",
      },
    ]);

    const stored = await db
      .select()
      .from(todos)
      .orderBy(asc(todos.createdAt), asc(todos.title));
    expect(stored.filter((todo) => todo.createdReportId === report.id)).toEqual(
      [
        expect.objectContaining({
          title: "Call back",
          dueDate: null,
          sourceAccountId: null,
          sourceMessageId: null,
        }),
        expect.objectContaining({
          title: "Pay the Example invoice",
          detail: "120 GBP",
          dueDate: "2026-11-05",
          sourceAccountId: accountId,
          sourceMessageId: "<invoice@example.com>",
          doneAt: null,
        }),
      ],
    );

    const kept = JSON.stringify({ report, stored });
    for (const secret of [
      invoice.subject,
      "billing@example.com",
      "12345678",
      "Your parcel",
    ]) {
      expect(kept).not.toContain(secret);
    }
    expect(server.log.writes).toEqual([]);
    expect(server.log.opened.every((entry) => !entry.write)).toBe(true);
    expect(server.log.opened.map((entry) => entry.path)).toEqual([
      "INBOX",
      "Archive",
    ]);
    expect(server.flagsOf("INBOX", invoiceUid)).toEqual([]);

    expect(await runCron(stubModel(new Error("not again")))).toMatchObject({
      built: 0,
    });
    expect(prompts).toHaveLength(1);
  });

  it("stores nothing when the model fails, and the next hour stores the report and its to-dos once", async () => {
    const gmailId = await insertAccount(db, userId, {
      provider: "gmail",
      address: "me@gmail.com",
    });
    deliver("INBOX", "<hello@example.com>", "2026-10-31T10:00:00Z", {
      subject: "Hello",
    });

    expect(
      await runCron(stubModel(new Error("The provider is down"))),
    ).toMatchObject({ built: 0, retrying: 1 });
    const counts = () =>
      Promise.all([db.$count(morningReports), db.$count(todos)]).then(
        ([reports, todos]) => ({ reports, todos }),
      );
    expect(await counts()).toEqual({ reports: 0, todos: 0 });
    expect(pushed).toEqual([]);
    const [gmail] = await db
      .select()
      .from(mailAccounts)
      .where(eq(mailAccounts.id, gmailId));
    expect(gmail).toMatchObject({
      status: "reconnect",
      lastErrorCode: "login_refused",
    });

    clock = new Date("2026-11-01T10:00:00Z");
    const output: ReportPromptOutput = {
      headline: "Say hello back.",
      needsAction: [{ text: "Reply to the hello.", mail: "m1" }],
      worthKnowing: [],
      rest: "",
      todos: [
        {
          title: "Reply to the hello",
          detail: null,
          dueDate: null,
          mail: "m1",
        },
      ],
    };
    expect(await runCron(stubModel(output))).toMatchObject({ built: 1 });
    clock = new Date("2026-11-01T11:00:00Z");
    expect(await runCron(stubModel(output))).toMatchObject({
      built: 0,
      retrying: 0,
    });

    expect(await counts()).toEqual({ reports: 1, todos: 1 });
    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "written",
      unreadMailboxes: [{ accountId: gmailId, address: "me@gmail.com" }],
    });
    expect(pushed.map((message) => message.title)).toEqual(["Say hello back."]);
  });

  it("retries while no mailbox can be read, and at the last try of the day stores a report that says so", async () => {
    await db.update(mailAccounts).set({ status: "reconnect" });
    deliver("INBOX", "<hello@example.com>", "2026-10-31T10:00:00Z", {
      subject: "Hello",
    });
    const model = stubModel(new Error("The model is not called"));

    expect(await runCron(model)).toMatchObject({ built: 0, retrying: 1 });
    expect(await db.$count(morningReports)).toBe(0);

    clock = new Date("2026-11-01T23:05:00Z");
    expect(await runCron(model)).toMatchObject({ built: 1, notWritten: 1 });
    const [report] = await db.select().from(morningReports);
    expect(report.content).toMatchObject({
      status: "failed",
      mailCount: 0,
      unreadMailboxes: [{ accountId, address: "me@icloud.com" }],
    });
    expect(prompts).toEqual([]);
    expect(pushed.map((message) => message.title)).toEqual([
      "Your morning report could not be written today",
    ]);
  });
});
