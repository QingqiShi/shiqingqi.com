import { eq } from "drizzle-orm";
import { afterEach, beforeEach } from "vitest";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import {
  agentActions,
  agentRuns,
  morningReportPreviews,
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
import type { ReportBuildDeps } from "./build-morning-report.ts";
import { makeReportPreviewHandlers } from "./make-report-preview-handlers.ts";
import {
  NOW,
  readerModel,
  type silentAgent,
} from "./test-report-preview-agents.ts";

const ORIGIN = "http://localhost:3000";

export let clock: Date;
export const now = () => clock;

export function setClock(next: Date) {
  clock = next;
}

export let db: TestDb;
export let userId: string;
export let accountId: string;
export let invoiceUid: number;
export let server: FakeMailServer;
let background: Promise<void>[];

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

export function buildDeps(agent: ReturnType<typeof silentAgent> | null) {
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

export async function start(deps: ReportBuildDeps | null) {
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
export async function deliverRead(
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

export async function previewRow() {
  const [row] = await db
    .select()
    .from(morningReportPreviews)
    .where(eq(morningReportPreviews.userId, userId));
  return row;
}

export function setUpReportPreview() {
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
}
