import { randomUUID } from "node:crypto";
import { MockLanguageModelV3 } from "ai/test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mailCategories,
  mailClassifications,
  mailMessages,
  type MailMessageOrigin,
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
import { classifyPrompt, type ClassifyOutput } from "./classify-prompt.ts";
import {
  classifyQueuedMail,
  MAX_CLASSIFY_ATTEMPTS,
} from "./classify-queued-mail.ts";
import { senderRules } from "./sender-rules.ts";

const routine: ClassifyOutput = {
  category: "Shopping",
  asksUserToAct: "no",
  personal: "no",
  marketing: "no",
  worthKnowing: "no",
  securityAlert: "no",
  oneTimeCode: "no",
  dueDate: null,
  summary: "A routine mail.",
  event: null,
};

/** A model that answers by the subject of the mail, or fails for a subject it has no answer for. */
function createClassifierModel(
  answers: Partial<Record<string, Partial<ClassifyOutput>>>,
) {
  const subjects: string[] = [];
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
      const subject = /^Subject: (.*)$/m.exec(text)?.[1] ?? "";
      subjects.push(subject);
      const answer = answers[subject];
      if (!answer) return Promise.reject(new Error("The provider is down"));
      return Promise.resolve({
        content: [
          { type: "text", text: JSON.stringify({ ...routine, ...answer }) },
        ],
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
  return { model: { id: "test-model", model }, subjects };
}

let db: TestDb;
let userId: string;
let accountId: string;
let shoppingId: string;
let uid = 0;
const now = () => new Date("2026-11-01T09:00:00Z");

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  accountId = await insertAccount(db, userId);
  const [shopping] = await withUser(db, userId, ({ db }) =>
    db.insert(mailCategories).values({ userId, name: "Shopping" }).returning(),
  );
  shoppingId = shopping.id;
});

afterEach(async () => {
  await db.close();
});

async function insertMail({
  subject,
  from = "shop@example.com",
  snippet = "Hello",
  origin = "live",
  flags = [],
}: {
  subject: string;
  from?: string;
  snippet?: string;
  origin?: MailMessageOrigin;
  flags?: string[];
}) {
  uid += 1;
  const [row] = await withUser(db, userId, ({ db }) =>
    db
      .insert(mailMessages)
      .values({
        userId,
        accountId,
        uidValidity: 1,
        uid,
        messageId: `<${randomUUID()}@example.com>`,
        fromAddress: from,
        subject,
        snippet,
        receivedAt: new Date(Date.UTC(2026, 10, 1, 8, 0, uid)),
        origin,
        flags,
      })
      .returning({ id: mailMessages.id }),
  );
  return row.id;
}

function run(model: ReturnType<typeof createClassifierModel>["model"] | null) {
  return classifyQueuedMail({ db, userId, endsAt: Infinity }, { model, now });
}

async function classificationOf(messageId: string) {
  const [row] = await withUser(db, userId, ({ db }) =>
    db
      .select()
      .from(mailClassifications)
      .where(eq(mailClassifications.messageId, messageId)),
  );
  return row;
}

describe("classifyQueuedMail", () => {
  it("classifies live mail once, with the model id and prompt version, and leaves history alone", async () => {
    const order = await insertMail({ subject: "Order shipped" });
    const bill = await insertMail({ subject: "Bill due" });
    const code = await insertMail({
      subject: "Your verification code",
      snippet: "Your code is 482913.",
    });
    const old = await insertMail({ subject: "Old mail", origin: "history" });
    const { model, subjects } = createClassifierModel({
      "Order shipped": {},
      "Bill due": { asksUserToAct: "yes", dueDate: "2026-11-15" },
    });

    expect(await run(model)).toEqual({ classified: 3, failed: 0, waiting: 0 });
    expect(await run(model)).toEqual({ classified: 0, failed: 0, waiting: 0 });

    expect(subjects.sort()).toEqual(["Bill due", "Order shipped"]);
    expect(await classificationOf(order)).toMatchObject({
      bucket: "filed",
      categoryId: shoppingId,
      decidedBy: "model",
      modelId: "test-model",
      promptVersion: classifyPrompt.version,
      summary: "A routine mail.",
    });
    expect(await classificationOf(bill)).toMatchObject({
      bucket: "act",
      facts: { dueDate: "2026-11-15" },
    });
    expect(await classificationOf(code)).toMatchObject({
      bucket: "fyi",
      decidedBy: "rule",
      reason: "rule:one-time-code",
      modelId: null,
    });
    expect(await classificationOf(old)).toBeUndefined();
  });

  it("applies a confirmed sender rule, and not a draft", async () => {
    const drafted = await insertMail({
      subject: "Deal",
      from: "news@deals.example.org",
    });
    const ruleId = await withUser(db, userId, (scope) =>
      senderRules.saveDraft(scope, {
        match: "domain",
        pattern: "Example.org",
        bucket: "act",
        categoryId: null,
        sourceMessageId: drafted,
      }),
    );
    const { model } = createClassifierModel({
      Deal: { marketing: "yes" },
      "Another deal": { marketing: "yes" },
    });
    await run(model);
    await withUser(db, userId, (scope) =>
      senderRules.confirm(scope, ruleId, now()),
    );
    const confirmed = await insertMail({
      subject: "Another deal",
      from: "news@deals.example.org",
    });
    await run(model);

    expect(await classificationOf(drafted)).toMatchObject({
      bucket: "filed",
      decidedBy: "model",
    });
    expect(await classificationOf(confirmed)).toMatchObject({
      bucket: "act",
      decidedBy: "sender_rule",
      senderRuleId: ruleId,
      categoryId: shoppingId,
    });
  });

  it("never files mail from a sender whose mail the user answered", async () => {
    await insertMail({
      subject: "Lunch?",
      from: "friend@example.com",
      origin: "history",
      flags: ["\\Seen", "\\Answered"],
    });
    const offer = await insertMail({
      subject: "My new shop",
      from: "friend@example.com",
    });
    const { model } = createClassifierModel({
      "My new shop": { marketing: "yes" },
    });
    await run(model);

    expect(await classificationOf(offer)).toMatchObject({
      bucket: "fyi",
      reason: "safety:replied-before",
    });
  });

  it("keeps mail whose model call fails `unsure`, and tries again only up to the limit", async () => {
    const mail = await insertMail({ subject: "Broken" });
    const { model, subjects } = createClassifierModel({});
    for (let run_ = 0; run_ <= MAX_CLASSIFY_ATTEMPTS; run_ += 1) {
      await run(model);
    }

    expect(subjects).toHaveLength(MAX_CLASSIFY_ATTEMPTS);
    expect(await classificationOf(mail)).toMatchObject({
      bucket: "unsure",
      decidedBy: "failed",
      attempts: MAX_CLASSIFY_ATTEMPTS,
    });
  });

  it("leaves mail that needs the model in the queue while there is no model", async () => {
    const mail = await insertMail({ subject: "Order shipped" });
    expect(await run(null)).toEqual({ classified: 0, failed: 0, waiting: 1 });
    expect(await classificationOf(mail)).toBeUndefined();

    const { model } = createClassifierModel({ "Order shipped": {} });
    expect(await run(model)).toEqual({ classified: 1, failed: 0, waiting: 0 });
  });
});
