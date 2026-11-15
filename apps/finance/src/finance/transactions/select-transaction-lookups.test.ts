import { describe, expect, it } from "vitest";
import { selectTransactionLookups } from "./select-transaction-lookups.ts";
import {
  createTestReplica,
  TEST_IDS,
  testAccount,
  testReplicaRows,
} from "./testing/create-test-replica.ts";

async function labelsOf(accounts: ReturnType<typeof testAccount>[]) {
  const { store } = await createTestReplica({
    members: testReplicaRows().members,
    accounts,
  });
  const { accountLabelById } = selectTransactionLookups(store.getSnapshot());
  return accounts.map((account) => accountLabelById.get(account.id));
}

describe("the label of an account", () => {
  it("is the name alone when no other account has the name", async () => {
    expect(
      await labelsOf([
        testAccount("a", { name: "Savings", institution: "Monzo" }),
        testAccount("b", { name: "Current", institution: "Monzo" }),
      ]),
    ).toEqual(["Savings", "Current"]);
  });

  it("adds the institution when it tells same-named accounts apart", async () => {
    expect(
      await labelsOf([
        testAccount("a", { name: "Savings", institution: "Monzo" }),
        testAccount("b", { name: "Savings", institution: "Chase" }),
      ]),
    ).toEqual(["Savings · Monzo", "Savings · Chase"]);
  });

  it("adds only the owner when the institution is the same and the owners differ", async () => {
    expect(
      await labelsOf([
        testAccount("a", {
          name: "IBKR ISA",
          institution: "Interactive Brokers",
          ownerMemberId: TEST_IDS.alex,
        }),
        testAccount("b", {
          name: "IBKR ISA",
          institution: "Interactive Brokers",
          ownerMemberId: TEST_IDS.sam,
        }),
      ]),
    ).toEqual(["Alex · IBKR ISA", "Sam · IBKR ISA"]);
  });
});
