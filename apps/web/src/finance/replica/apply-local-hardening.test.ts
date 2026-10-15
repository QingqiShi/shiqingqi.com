import { describe, expect, it } from "vitest";
import {
  createTestReplica,
  TEST_IDS,
  testReplicaRows,
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

  it("drops the icon version only when the domain the account shows changes", async () => {
    const rows = testReplicaRows();
    const { store } = await createTestReplica({
      ...rows,
      accounts: (rows.accounts ?? []).map((account) =>
        account.id === TEST_IDS.current || account.id === TEST_IDS.card
          ? {
              ...account,
              institution: "Barclay",
              guessedInstitutionDomain: "barclays.co.uk",
              institutionIconVersion: "v1",
            }
          : account,
      ),
    });
    const account = (id: string) => store.getSnapshot().tables.accounts.get(id);

    store.applyLocal({
      name: "upsertAccount",
      args: { id: TEST_IDS.current, institutionDomain: "barclays.co.uk" },
    });
    expect(account(TEST_IDS.current)?.institutionIconVersion).toBe("v1");

    store.applyLocal({
      name: "upsertAccount",
      args: { id: TEST_IDS.current, institution: "Wise" },
    });
    expect(account(TEST_IDS.current)).toMatchObject({
      guessedInstitutionDomain: null,
      institutionIconVersion: "v1",
    });

    store.applyLocal({
      name: "upsertAccount",
      args: { id: TEST_IDS.current, institutionDomain: "monzo.com" },
    });
    expect(account(TEST_IDS.current)?.institutionIconVersion).toBeNull();

    store.applyLocal({
      name: "upsertAccount",
      args: { id: TEST_IDS.card, institution: "Wise" },
    });
    expect(account(TEST_IDS.card)).toMatchObject({
      guessedInstitutionDomain: null,
      institutionIconVersion: null,
    });
  });

  it("lets a member only move In transit", async () => {
    const rows = testReplicaRows();
    const current = rows.accounts?.find(
      (account) => account.id === TEST_IDS.current,
    );
    if (!current) throw new Error("No current account");
    const inTransit = {
      ...current,
      id: "00000000-0000-4000-8000-0000000000b1",
      name: "In transit",
      ownerMemberId: null,
      isSystem: true,
    };
    const { store } = await createTestReplica({
      ...rows,
      accounts: [...(rows.accounts ?? []), inTransit],
    });

    store.applyLocal({
      name: "upsertAccount",
      args: { id: inTransit.id, position: 5 },
    });
    expect(
      store.getSnapshot().tables.accounts.get(inTransit.id)?.position,
    ).toBe(5);
    expect(() =>
      store.applyLocal({
        name: "upsertAccount",
        args: { id: inTransit.id, name: "Float" },
      }),
    ).toThrow(/In transit/);
    expect(() =>
      store.applyLocal({
        name: "putValuation",
        args: {
          id: "00000000-0000-4000-8000-0000000000b2",
          accountId: inTransit.id,
          on: "2026-10-01",
          amountMinor: 100,
        },
      }),
    ).toThrow(/In transit/);
  });
});
