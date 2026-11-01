import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mailClassifications,
  mailCorrections,
  mailMessages,
  mailSenderRules,
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
import { pushDevices } from "#src/assistant/push/push-devices.ts";
import { correctItems } from "./correct-items.ts";
import { notifyDigest } from "./notify-digest.ts";

let db: TestDb;
let userId: string;
let accountId: string;
const now = new Date("2026-11-02T08:30:00Z");

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
});

afterEach(async () => {
  await db.close();
});

async function insertAct(from: string) {
  return withUser(db, userId, async ({ db }) => {
    const [message] = await db
      .insert(mailMessages)
      .values({
        userId,
        accountId,
        uidValidity: 1,
        uid: 1,
        messageId: `<${randomUUID()}@example.com>`,
        fromAddress: from,
        subject: "Rate your stay",
        receivedAt: now,
      })
      .returning({ id: mailMessages.id });
    const [row] = await db
      .insert(mailClassifications)
      .values({
        userId,
        messageId: message.id,
        bucket: "act",
        decidedBy: "model",
        reason: "test",
      })
      .returning({ id: mailClassifications.id });
    return row.id;
  });
}

describe("correctItems", () => {
  it("closes a mail marked not important, and drafts a rule for its address that waits for the user", async () => {
    const id = await insertAct("hotel@stays.example.com");

    const result = await correctItems(
      { db, userId },
      { classificationIds: [id], kind: "not_important", now },
      null,
    );

    expect(result.closedMessageIds).toHaveLength(1);
    expect(result.rule).toMatchObject({
      match: "address",
      pattern: "hotel@stays.example.com",
      bucket: "filed",
    });
    const state = await withUser(db, userId, async ({ db }) => ({
      classification: (await db.select().from(mailClassifications))[0],
      corrections: await db.select().from(mailCorrections),
      rules: await db.select().from(mailSenderRules),
    }));
    expect(state.classification.doneAt).toEqual(now);
    expect(state.corrections).toMatchObject([
      { kind: "not_important", senderRuleId: result.rule?.id },
    ]);
    expect(state.rules).toMatchObject([{ status: "draft" }]);
  });

  it("does nothing for an item of another user", async () => {
    const otherUser = await insertUser(db);
    const result = await correctItems(
      { db, userId: otherUser },
      {
        classificationIds: [await insertAct("a@example.com")],
        kind: "not_important",
        now,
      },
      null,
    );
    expect(result).toEqual({
      messageIds: [],
      closedMessageIds: [],
      rule: null,
    });
  });
});

describe("notifyDigest", () => {
  it("removes a device the push service no longer knows", async () => {
    await withUser(db, userId, async (scope) => {
      for (const endpoint of [
        "https://push.example/live",
        "https://push.example/gone",
      ]) {
        await pushDevices.save(
          scope,
          { endpoint, keys: { p256dh: "key", auth: "secret" } },
          "",
        );
      }
    });

    const result = await notifyDigest(
      { db, userId },
      {
        id: randomUUID(),
        localDate: "2026-11-02",
        headline: null,
        arrangedBy: "fallback",
        locale: "en",
        counts: { act: 2, unsure: 0, fyi: 0 },
      },
      {
        send: (device) =>
          Promise.resolve(device.endpoint.endsWith("gone") ? "gone" : "sent"),
        now: () => now,
      },
    );

    expect(result).toEqual({ sent: 1, removed: 1 });
    expect(
      (await withUser(db, userId, pushDevices.list)).map(
        (device) => device.endpoint,
      ),
    ).toEqual(["https://push.example/live"]);
  });
});
