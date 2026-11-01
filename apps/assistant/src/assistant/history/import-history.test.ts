import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { writeCalendarEvents } from "#src/assistant/calendar/write-calendar-events.ts";
import type { ClassifyOutput } from "#src/assistant/classify/classify-prompt.ts";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import {
  mailClassifications,
  mailDigests,
  mailHistoryBatches,
  mailHistoryJobs,
  mailMessages,
  userSettings,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { buildDigest } from "#src/assistant/digest/build-digest.ts";
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
import { syncUserMail } from "../mail/sync/sync-user-mail.ts";
import { writeMailboxes } from "../mail/tidy/write-mailboxes.ts";
import { MAX_HISTORY_FAILURES } from "./history-batches.ts";
import { importHistory } from "./import-history.ts";
import { answer, createFakeBatchApi } from "./testing/create-fake-batch-api.ts";
import type { BatchItemOutcome, BatchRequest } from "./types.ts";

const HOUR = 60 * 60 * 1000;

let db: TestDb;
let userId: string;
let server: FakeMailServer;

/** A date a month from now, so that the event is not over when the calendar writer comes to it. */
function nextMonth() {
  return new Date(Date.now() + 30 * 24 * HOUR).toISOString().slice(0, 10);
}

function dentist(): MailEvent {
  return {
    kind: "appointment",
    change: "new",
    title: "Dentist",
    start: `${nextMonth()}T14:30`,
    end: null,
    allDay: false,
    timeZone: "Europe/London",
    location: null,
    certainty: "sure",
  };
}

/** An answer that needs the user, with an event the model is sure about. */
function actWithEvent(): ClassifyOutput {
  return {
    category: "none",
    asksUserToAct: "yes",
    personal: "yes",
    marketing: "no",
    worthKnowing: "yes",
    securityAlert: "no",
    oneTimeCode: "no",
    dueDate: null,
    summary: "The clinic asks you to confirm your visit.",
    event: dentist(),
  };
}

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  await withUser(db, userId, ({ db, userId }) =>
    db.insert(userSettings).values({ userId, historyImport: true }),
  );
});

afterEach(async () => {
  await db.close();
});

function deliverOld(count: number) {
  for (let index = 1; index <= count; index += 1) {
    server.deliver(
      "INBOX",
      rawMail({
        messageId: `<old-${String(index)}@example.com>`,
        from: "Clinic <clinic@example.com>",
        subject: "Please confirm your visit",
        body: "Reply to confirm your appointment.",
      }),
    );
  }
}

function sync() {
  return syncUserMail(
    { db, userId, endsAt: Infinity, now: () => new Date() },
    mailDeps({ connector: server.connector }),
  );
}

function run(api: ReturnType<typeof createFakeBatchApi>["api"]) {
  return importHistory(
    { db, userId, endsAt: Infinity },
    {
      mail: mailDeps({ connector: server.connector }),
      batchApi: api,
      now: () => new Date(),
    },
  );
}

function jobs() {
  return withUser(db, userId, ({ db }) =>
    db
      .select({
        failures: mailHistoryJobs.failures,
        batchId: mailHistoryJobs.batchId,
        lastError: mailHistoryJobs.lastError,
      })
      .from(mailHistoryJobs),
  );
}

function historyClassifications() {
  return withUser(db, userId, ({ db }) =>
    db
      .select({
        id: mailClassifications.id,
        bucket: mailClassifications.bucket,
        decidedBy: mailClassifications.decidedBy,
        modelId: mailClassifications.modelId,
        snippet: mailMessages.snippet,
      })
      .from(mailClassifications)
      .innerJoin(
        mailMessages,
        eq(mailMessages.id, mailClassifications.messageId),
      )
      .where(eq(mailMessages.origin, "history")),
  );
}

describe("importHistory", () => {
  it("sends the queued mail in one batch with the shared instructions cached, then stores the answers through the truth table", async () => {
    deliverOld(3);
    await sync();
    const fake = createFakeBatchApi(() => answer(actWithEvent()));
    fake.state.holdBatches = true;

    expect(await run(fake.api)).toMatchObject({ stored: 3, submitted: 3 });
    const [requests] = [...fake.batches.values()];
    expect(requests).toHaveLength(3);
    const [request] = requests;
    expect(request.params.model).toBe("claude-haiku-5-5");
    expect(request.params.system).toEqual([
      expect.objectContaining({ cache_control: { type: "ephemeral" } }),
    ]);
    expect((await jobs()).every((job) => job.batchId !== null)).toBe(true);

    fake.state.holdBatches = false;
    expect(await run(fake.api)).toMatchObject({ classified: 3, submitted: 0 });

    expect(await jobs()).toEqual([]);
    const stored = await historyClassifications();
    expect(stored).toHaveLength(3);
    expect(stored[0]).toMatchObject({
      bucket: "act",
      decidedBy: "model",
      modelId: "claude-haiku-5-5",
      snippet: "",
    });
    const [batch] = await withUser(db, userId, ({ db }) =>
      db.select().from(mailHistoryBatches),
    );
    expect(batch.storedAt).toBeInstanceOf(Date);
    expect(batch).toMatchObject({
      inputTokens: 3000,
      outputTokens: 600,
      cacheReadTokens: 2400,
    });
  });

  it("puts a mail whose answer failed back in the queue, and stops trying at the limit", async () => {
    deliverOld(1);
    await sync();
    const fake = createFakeBatchApi((): BatchItemOutcome => ({
      type: "failed",
      reason: "expired",
    }));

    for (let round = 0; round <= MAX_HISTORY_FAILURES; round += 1) {
      await run(fake.api);
    }

    expect(await jobs()).toEqual([
      { failures: MAX_HISTORY_FAILURES, batchId: null, lastError: "expired" },
    ]);
    expect(fake.batches.size).toBe(MAX_HISTORY_FAILURES);
    await run(fake.api);
    expect(fake.batches.size).toBe(MAX_HISTORY_FAILURES);
  });

  it("gives the mail back to the queue when the API refuses the batch", async () => {
    deliverOld(2);
    await sync();
    const fake = createFakeBatchApi(() => answer(actWithEvent()));
    fake.state.failNextCreate = true;

    expect(await run(fake.api)).toMatchObject({ stored: 2, submitted: 0 });
    expect(await jobs()).toEqual([
      { failures: 0, batchId: null, lastError: null },
      { failures: 0, batchId: null, lastError: null },
    ]);
    expect(
      await withUser(db, userId, ({ db }) =>
        db.select().from(mailHistoryBatches),
      ),
    ).toEqual([]);

    expect(await run(fake.api)).toMatchObject({ submitted: 2 });
  });

  it("stores the answers of sent batches while paused, but walks and sends nothing new", async () => {
    deliverOld(1);
    await sync();
    const fake = createFakeBatchApi(() => answer(actWithEvent()));
    fake.state.holdBatches = true;
    await run(fake.api);
    await withUser(db, userId, ({ db }) =>
      db.update(userSettings).set({ historyImport: false }),
    );
    fake.state.holdBatches = false;

    expect(await run(fake.api)).toEqual({
      stored: 0,
      queued: 0,
      submitted: 0,
      classified: 1,
      failed: 0,
    });
  });

  it("never lets history mail reach a digest, a mailbox write or a calendar event", async () => {
    const calendar = createFakeCalendarServer({
      user: "me@icloud.com",
      password: "app-password",
    });
    await withUser(db, userId, ({ db }) =>
      db.update(userSettings).set({
        digestHour: 0,
        mailboxWrites: true,
        mailboxWritesSince: new Date(Date.now() - HOUR),
      }),
    );
    deliverOld(2);
    await sync();
    const liveUid = server.deliver(
      "INBOX",
      rawMail({
        messageId: "<live@example.com>",
        from: "Clinic <clinic@example.com>",
        subject: "Please confirm your visit",
      }),
    );
    await sync();
    const [live] = await withUser(db, userId, ({ db }) =>
      db
        .select({ id: mailMessages.id })
        .from(mailMessages)
        .where(eq(mailMessages.messageId, "<live@example.com>")),
    );
    const output = actWithEvent();
    const [liveClassification] = await withUser(db, userId, ({ db, userId }) =>
      db
        .insert(mailClassifications)
        .values({
          userId,
          messageId: live.id,
          bucket: "act",
          decidedBy: "model",
          reason: "act:asks-to-act",
          summary: output.summary,
          event: dentist(),
        })
        .returning({ id: mailClassifications.id }),
    );
    const fake = createFakeBatchApi((request: BatchRequest) => {
      expect(request.custom_id).not.toBe(live.id);
      return answer(output);
    });
    await run(fake.api);
    await run(fake.api);
    const history = await historyClassifications();
    expect(history.map((row) => row.bucket)).toEqual(["act", "act"]);

    await writeMailboxes(
      { db, userId, endsAt: Infinity },
      mailDeps({ connector: server.connector }),
    );
    await writeCalendarEvents(
      { db, userId, endsAt: Infinity },
      {
        connector: calendar.connector,
        auth: mailDeps({ connector: server.connector }).auth,
      },
    );
    const digest = await buildDigest(
      { db, userId },
      { model: null, now: () => new Date() },
    );

    expect(server.log.writes.length).toBeGreaterThan(0);
    expect(
      server.log.writes.every(
        (write) => write.uids.length === 1 && write.uids[0] === liveUid,
      ),
    ).toBe(true);
    expect(server.locate("<old-1@example.com>")[0].flags).toEqual([]);
    const events = calendar
      .calendars()
      .flatMap((entry) => calendar.events(entry.url));
    expect(events).toHaveLength(1);
    expect(events[0].data).toContain("live%40example.com");
    expect(digest).not.toBeNull();
    const [content] = await withUser(db, userId, ({ db }) =>
      db.select({ content: mailDigests.content }).from(mailDigests),
    );
    const shown = [
      ...Object.values(content.content.sections).flatMap((groups) =>
        groups.flatMap((group) => group.ids),
      ),
      ...content.content.calendar,
    ];
    expect(new Set(shown)).toEqual(new Set([liveClassification.id]));
  });
});
