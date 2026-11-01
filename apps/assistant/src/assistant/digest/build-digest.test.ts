import { randomUUID } from "node:crypto";
import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mailClassifications,
  mailDigests,
  mailMessages,
  userSettings,
  type MailBucket,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  insertAccount,
  insertUser,
} from "#src/assistant/mail/testing/insert-account.ts";
import { buildDigest } from "./build-digest.ts";
import type { DigestPromptOutput } from "./digest-prompt.ts";

let db: TestDb;
let userId: string;
let accountId: string;
let uid = 0;

/** 08:05 in London on a Monday in winter. */
const MONDAY_MORNING = new Date("2026-11-02T08:05:00Z");
const hoursBefore = (hours: number) =>
  new Date(MONDAY_MORNING.getTime() - hours * 60 * 60 * 1000);

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  await withUser(db, userId, ({ db }) =>
    db.insert(userSettings).values({ userId, timeZone: "Europe/London" }),
  );
});

afterEach(async () => {
  await db.close();
});

async function insertClassified({
  subject,
  bucket,
  classifiedAt,
  doneAt = null,
  dueDate = null,
}: {
  subject: string;
  bucket: MailBucket;
  classifiedAt: Date;
  doneAt?: Date | null;
  dueDate?: string | null;
}) {
  uid += 1;
  return withUser(db, userId, async ({ db }) => {
    const [message] = await db
      .insert(mailMessages)
      .values({
        userId,
        accountId,
        uidValidity: 1,
        uid,
        messageId: `<${randomUUID()}@example.com>`,
        fromAddress: "someone@example.com",
        subject,
        receivedAt: classifiedAt,
      })
      .returning({ id: mailMessages.id });
    const [row] = await db
      .insert(mailClassifications)
      .values({
        userId,
        messageId: message.id,
        bucket,
        decidedBy: "model",
        reason: "test",
        summary: `${subject}.`,
        facts: dueDate
          ? {
              category: "none",
              asksUserToAct: "yes",
              personal: "no",
              marketing: "no",
              worthKnowing: "no",
              securityAlert: "no",
              oneTimeCode: "no",
              dueDate,
            }
          : null,
        classifiedAt,
        doneAt,
      })
      .returning({ id: mailClassifications.id });
    return row.id;
  });
}

async function insertDigest(localDate: string, builtAt: Date) {
  await withUser(db, userId, ({ db }) =>
    db.insert(mailDigests).values({
      userId,
      localDate,
      windowStart: hoursBefore(48),
      builtAt,
      arrangedBy: "fallback",
      content: {
        version: 1,
        sections: { act: [], unsure: [], fyi: [] },
        calendar: [],
        filed: [],
        sample: [],
      },
    }),
  );
}

async function storedDigest(localDate: string) {
  const [row] = await withUser(db, userId, ({ db }) =>
    db.select().from(mailDigests).where(eq(mailDigests.localDate, localDate)),
  );
  return row;
}

/** A model that answers with `output`, or fails when there is none. */
function editorModel(output: (prompt: string) => DigestPromptOutput | null) {
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const text = prompt
        .flatMap((message) =>
          message.role === "user"
            ? message.content.flatMap((part) =>
                part.type === "text" ? [part.text] : [],
              )
            : [],
        )
        .join("\n");
      const answer = output(text);
      if (!answer) return Promise.reject(new Error("The provider is down"));
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(answer) }],
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
  return { id: "test-editor", model };
}

/** The item key the prompt gave the mail with this subject. */
function keyOf(prompt: string, subject: string) {
  const match = new RegExp(
    `Item (m\\d+)\\n[^\\n]*\\n[^\\n]*\\nSubject: ${subject}\\n`,
  ).exec(prompt);
  if (!match) throw new Error(`No item for ${subject}`);
  return match[1];
}

describe("buildDigest", () => {
  it("carries open act items over until they are done, and shows the rest of the mail since the last digest once", async () => {
    await insertDigest("2026-11-01", hoursBefore(24));
    const open = await insertClassified({
      subject: "Sign the lease",
      bucket: "act",
      classifiedAt: hoursBefore(72),
    });
    await insertClassified({
      subject: "Pay the old bill",
      bucket: "act",
      classifiedAt: hoursBefore(72),
      doneAt: hoursBefore(30),
    });
    await insertClassified({
      subject: "Yesterday's news",
      bucket: "fyi",
      classifiedAt: hoursBefore(30),
    });
    const fresh = await insertClassified({
      subject: "Parcel arrives today",
      bucket: "fyi",
      classifiedAt: hoursBefore(2),
    });
    await insertClassified({
      subject: "Receipt",
      bucket: "filed",
      classifiedAt: hoursBefore(2),
    });

    const built = await buildDigest(
      { db, userId },
      { model: null, now: () => MONDAY_MORNING },
    );

    expect(built).toMatchObject({
      localDate: "2026-11-02",
      headline: null,
      counts: { act: 1, unsure: 0, fyi: 1 },
    });
    const digest = await storedDigest("2026-11-02");
    expect(digest.arrangedBy).toBe("fallback");
    expect(digest.windowStart).toEqual(hoursBefore(24));
    expect(digest.content.sections).toEqual({
      act: [{ ids: [open], line: null, carriedOver: true }],
      unsure: [],
      fyi: [{ ids: [fresh], line: null, carriedOver: false }],
    });
    expect(digest.content.filed).toEqual([{ categoryId: null, count: 1 }]);
    expect(digest.content.sample).toEqual([]);

    expect(
      await buildDigest(
        { db, userId },
        { model: null, now: () => new Date("2026-11-02T09:05:00Z") },
      ),
    ).toBeNull();
  });

  it("builds the digest in the code's order when the model fails", async () => {
    const later = await insertClassified({
      subject: "Renew passport",
      bucket: "act",
      classifiedAt: hoursBefore(3),
      dueDate: "2026-12-01",
    });
    const sooner = await insertClassified({
      subject: "Return the form",
      bucket: "act",
      classifiedAt: hoursBefore(2),
      dueDate: "2026-11-04",
    });

    const built = await buildDigest(
      { db, userId },
      { model: editorModel(() => null), now: () => MONDAY_MORNING },
    );

    expect(built?.headline).toBeNull();
    const digest = await storedDigest("2026-11-02");
    expect(digest.arrangedBy).toBe("fallback");
    expect(digest.content.sections.act.map((group) => group.ids)).toEqual([
      [sooner],
      [later],
    ]);
  });

  it("takes the model's order and lines, and keeps an item the model left out", async () => {
    const first = await insertClassified({
      subject: "Call the school",
      bucket: "act",
      classifiedAt: hoursBefore(3),
    });
    const second = await insertClassified({
      subject: "Book the dentist",
      bucket: "act",
      classifiedAt: hoursBefore(2),
    });
    const left = await insertClassified({
      subject: "Trip photos",
      bucket: "fyi",
      classifiedAt: hoursBefore(1),
    });

    await buildDigest(
      { db, userId },
      {
        model: editorModel((prompt) => ({
          headline: "Book the dentist first.",
          items: [
            { key: keyOf(prompt, "Book the dentist"), line: "Book it." },
            { key: keyOf(prompt, "Call the school"), line: "Call them." },
            { key: "m99", line: "An item that does not exist." },
          ],
        })),
        now: () => MONDAY_MORNING,
      },
    );

    const digest = await storedDigest("2026-11-02");
    expect(digest).toMatchObject({
      arrangedBy: "model",
      modelId: "test-editor",
      headline: "Book the dentist first.",
    });
    expect(digest.content.sections).toEqual({
      act: [
        { ids: [second], line: "Book it.", carriedOver: false },
        { ids: [first], line: "Call them.", carriedOver: false },
      ],
      unsure: [],
      fyi: [{ ids: [left], line: null, carriedOver: false }],
    });
  });

  it("adds a sample of the week's filed mail on a Sunday", async () => {
    const filed = await insertClassified({
      subject: "Newsletter",
      bucket: "filed",
      classifiedAt: new Date("2026-10-30T10:00:00Z"),
    });

    await buildDigest(
      { db, userId },
      { model: null, now: () => new Date("2026-11-01T08:05:00Z") },
    );

    expect((await storedDigest("2026-11-01")).content.sample).toEqual([filed]);
  });
});
