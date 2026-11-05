import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach } from "vitest";
import type { AgentModels } from "#src/assistant/ai/get-agent-models.ts";
import {
  createFakeCalendarServer,
  type FakeCalendarServer,
} from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
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
import { reply, textOf } from "./test-morning-report-agents.ts";

const SECRET = "test-cron-secret";
/** 09:00 in London (GMT): the report of 1 November, set for 08:00, about the mail from 08:00 the day before up to 08:00. */
export const NOW = new Date("2026-11-01T09:00:00Z");
export const SEEN = "\\Seen";
export let clock: Date;
export const now = () => clock;

export function setClock(next: Date) {
  clock = next;
}

export function setServer(next: FakeMailServer) {
  server = next;
}

export function setCalendar(next: FakeCalendarServer) {
  calendar = next;
}

export function setOnSleep(next: () => void) {
  onSleep = next;
}

export let db: TestDb;
export let userId: string;
export let accountId: string;
export let server: FakeMailServer;
export let calendar: FakeCalendarServer;
export let pushed: PushMessage[];
export let readerTexts: string[];
export let sleeps: number[];
let onSleep: () => void;

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

export function runCron(
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

export function deliver(
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
export function deliverDay() {
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

export function seenOf(path: string, uid: number) {
  return server.flagsOf(path, uid).includes(SEEN);
}

export function setUpMorningReportCron() {
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
}

export async function insertTodos() {
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
