import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailMessages, userSettings } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
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
import type { OrganiseOutput } from "./organise-prompt.ts";
import { organiseUserMail } from "./organise-user-mail.ts";

/** A model that answers by the subject of the mail, or fails for a subject it has no answer for. */
function createOrganiseModel(
  answers: Partial<Record<string, OrganiseOutput["target"]>>,
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
      const target = answers[subject];
      if (!target) return Promise.reject(new Error("The provider is down"));
      return Promise.resolve({
        content: [
          {
            type: "text",
            text: JSON.stringify({ reason: "A test answer.", target }),
          },
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
let server: FakeMailServer;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.addFolder("Finance");
  server.addFolder("Sent Messages", { specialUse: "\\Sent" });
});

afterEach(async () => {
  await db.close();
});

async function setOrganise(enabled: boolean) {
  await withUser(db, userId, ({ db }) =>
    db
      .insert(userSettings)
      .values({ userId, organiseEnabled: enabled })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { organiseEnabled: enabled },
      }),
  );
}

function deliver(subject: string) {
  const messageId = `<${subject.toLowerCase().replaceAll(" ", "-")}@example.com>`;
  server.deliver("INBOX", rawMail({ messageId, subject }));
  return messageId;
}

function organise(model: ReturnType<typeof createOrganiseModel>["model"]) {
  return organiseUserMail(
    { db, userId, endsAt: Infinity },
    { ...mailDeps({ connector: server.connector }), model },
  );
}

describe("organising the inbox", () => {
  it("does nothing, and opens no mailbox, while the user has it off", async () => {
    const statement = deliver("Card statement");
    const { model, subjects } = createOrganiseModel({
      "Card statement": { folder: "Finance" },
    });

    expect(await organise(model)).toMatchObject({ enabled: false, moved: 0 });
    await setOrganise(false);
    expect(await organise(model)).toMatchObject({ enabled: false, moved: 0 });

    expect(server.log.logins).toBe(0);
    expect(subjects).toEqual([]);
    expect(server.locate(statement)).toEqual([
      { path: "INBOX", uid: 1, flags: [] },
    ]);
  });

  it("files each mail read into the folder the model picks, makes a new folder once, and leaves unusable answers in the inbox", async () => {
    await setOrganise(true);
    const statement = deliver("Card statement");
    const flight = deliver("Flight to Tokyo");
    const hotel = deliver("Hotel in Kyoto");
    const sent = deliver("Odd answer");
    const failed = deliver("Model fails");
    const { model } = createOrganiseModel({
      "Card statement": { folder: "Finance" },
      "Flight to Tokyo": { newFolder: "Travel" },
      "Hotel in Kyoto": { newFolder: " travel " },
      "Odd answer": { folder: "Sent Messages" },
    });

    expect(await organise(model)).toMatchObject({
      enabled: true,
      accounts: 1,
      failedAccounts: 0,
      moved: 3,
      createdFolders: 1,
      left: 2,
    });

    expect(server.locate(statement)).toMatchObject([
      { path: "Finance", flags: ["\\Seen"] },
    ]);
    expect(server.locate(flight)).toMatchObject([
      { path: "Travel", flags: ["\\Seen"] },
    ]);
    expect(server.locate(hotel)).toMatchObject([
      { path: "Travel", flags: ["\\Seen"] },
    ]);
    expect(server.log.createdFolders).toEqual(["Travel"]);
    expect(server.locate(sent)).toMatchObject([{ path: "INBOX", flags: [] }]);
    expect(server.locate(failed)).toMatchObject([{ path: "INBOX", flags: [] }]);
    expect(
      await withUser(db, userId, ({ db }) => db.$count(mailMessages)),
    ).toBe(0);
  });
});
