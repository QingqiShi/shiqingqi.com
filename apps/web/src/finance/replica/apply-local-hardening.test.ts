import { describe, expect, it } from "vitest";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";

const NEW_MEMBER = "00000000-0000-4000-8000-0000000000a9";

describe("applyLocal mirrors the server", () => {
  it("adds a Member without a user", async () => {
    const { store } = await createTestReplica();

    store.applyLocal({
      name: "upsertMember",
      args: { id: NEW_MEMBER, name: "Robin" },
    });

    expect(store.getSnapshot().tables.members.get(NEW_MEMBER)).toMatchObject({
      name: "Robin",
      role: "member",
      userId: null,
    });
  });

  it("refuses to delete a Category or an account that is in use", async () => {
    const { store } = await createTestReplica();

    expect(() =>
      store.applyLocal({
        name: "upsertCategory",
        args: { id: TEST_IDS.groceries, deleted: true },
      }),
    ).toThrow(/archive/);
    expect(() =>
      store.applyLocal({
        name: "upsertAccount",
        args: { id: TEST_IDS.card, deleted: true },
      }),
    ).toThrow(/close/);
  });
});
