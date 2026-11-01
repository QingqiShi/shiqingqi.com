import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailCategories, mailFolders } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  insertAccount,
  insertUser,
} from "#src/assistant/mail/testing/insert-account.ts";
import { saveCategoryMapping } from "./save-category-mapping.ts";

let db: TestDb;
let userId: string;
let folder: Record<string, string>;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  const icloud = await insertAccount(db, userId);
  const gmail = await insertAccount(db, userId, {
    provider: "gmail",
    address: "me@gmail.com",
    credential: {
      type: "oauth",
      refreshToken: "r",
      accessToken: "a",
      accessTokenExpiresAt: 0,
    },
  });
  const rows = await withUser(db, userId, ({ db }) =>
    db
      .insert(mailFolders)
      .values(
        [
          [icloud, "Bills"],
          [icloud, "Travel"],
          [gmail, "Finance/Bills"],
        ].map(([accountId, path]) => ({ userId, accountId, path, name: path })),
      )
      .returning(),
  );
  folder = Object.fromEntries(
    rows.map((row) => [
      `${row.accountId === icloud ? "icloud" : "gmail"}:${row.path}`,
      row.id,
    ]),
  );
});

afterEach(async () => {
  await db.close();
});

function mapping() {
  return withUser(db, userId, async ({ db }) => {
    const categories = await db.select().from(mailCategories);
    const folders = await db.select().from(mailFolders);
    const nameOf = new Map(categories.map((c) => [c.id, c.name]));
    return Object.fromEntries(
      Object.entries(folder).map(([key, id]) => [
        key,
        nameOf.get(folders.find((f) => f.id === id)?.categoryId ?? "") ?? null,
      ]),
    );
  });
}

function save(assignments: [string, string | null][]) {
  return withUser(db, userId, (scope) =>
    saveCategoryMapping(
      scope,
      assignments.map(([key, category]) => ({
        folderId: folder[key],
        category,
      })),
    ),
  );
}

describe("saveCategoryMapping", () => {
  it("maps one category to differently named folders of each account, and drops a category with no folder left", async () => {
    await save([
      ["icloud:Bills", "Bills"],
      ["gmail:Finance/Bills", " Bills "],
      ["icloud:Travel", "Trips"],
    ]);
    expect(await mapping()).toEqual({
      "icloud:Bills": "Bills",
      "icloud:Travel": "Trips",
      "gmail:Finance/Bills": "Bills",
    });

    await save([
      ["icloud:Travel", "Bills"],
      ["icloud:Bills", "Trips"],
      ["gmail:Finance/Bills", null],
    ]);
    expect(await mapping()).toEqual({
      "icloud:Bills": "Trips",
      "icloud:Travel": "Bills",
      "gmail:Finance/Bills": null,
    });

    await save([["icloud:Bills", null]]);
    const names = await withUser(db, userId, ({ db }) =>
      db.select({ name: mailCategories.name }).from(mailCategories),
    );
    expect(names).toEqual([{ name: "Bills" }]);
  });

  it("refuses two folders of one account in one category", async () => {
    await expect(
      save([
        ["icloud:Bills", "Bills"],
        ["icloud:Travel", "bills"],
      ]),
    ).rejects.toMatchObject({ code: "duplicate-category" });
    expect(await mapping()).toEqual({
      "icloud:Bills": null,
      "icloud:Travel": null,
      "gmail:Finance/Bills": null,
    });
  });
});
