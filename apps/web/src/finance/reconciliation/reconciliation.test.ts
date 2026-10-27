import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureInTransitAccount } from "../bank/ensure-in-transit-account.ts";
import { seedBankLink } from "../bank/testing/seed-bank-link.ts";
import { bankTransactions, rules, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { occurrenceId } from "../rules/occurrence-id.ts";
import type { RuleTemplate } from "../rules/rule-template-schema.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { mayAutoPost } from "./may-auto-post.ts";
import { reconciliation, type MatchLink } from "./reconciliation.ts";

const NOW = new Date("2026-01-25T12:00:00Z");
const RENT = -120_000;

let db: TestDb;
let home: SeededHousehold;
let link: MatchLink | undefined;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  link = undefined;
});

afterEach(async () => {
  await db.close();
});

async function push(name: string, args: Record<string, unknown>) {
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations: [{ id: randomUUID(), name, args }] },
    NOW,
  );
  expect(result.rejected).toEqual([]);
}

function rentTemplate(
  entries: RuleTemplate["entries"] = [
    { accountId: home.currentId, amountMinor: RENT },
  ],
): RuleTemplate {
  return {
    kind: entries.length > 1 ? "transfer" : "expense",
    categoryId: entries.length > 1 ? null : home.groceriesId,
    payeeId: home.grocerId,
    memberId: null,
    note: "",
    entries,
    tagIds: [],
  };
}

/** A monthly Rule from `startsOn`; Materialise makes its Expected Transactions up to a week ahead. */
async function createRule({
  startsOn = "2026-01-31",
  autoPost = false,
  template = rentTemplate(),
} = {}) {
  const id = randomUUID();
  await push("upsertRule", {
    id,
    name: "Rent",
    unit: "month",
    startsOn,
    autoPost,
    template,
  });
  return { id, template };
}

/** A posted payment from the current account. */
async function recordPayment(
  date: string,
  { amountMinor = RENT, accountId = home.currentId } = {},
) {
  const id = randomUUID();
  const entryId = randomUUID();
  await push("createTransaction", {
    id,
    kind: "expense",
    date,
    categoryId: home.groceriesId,
    entries: [{ id: entryId, accountId, amountMinor }],
  });
  return { id, entryId };
}

/** The current account's Bank link, made the first time a test needs it. */
async function currentLink() {
  link ??= {
    id: await seedBankLink(db, home, {
      accountId: home.currentId,
      providerAccountId: "provider-current",
    }),
    accountId: home.currentId,
    signMultiplier: 1,
    inTransitAccountId: null,
  };
  return link;
}

/** A bank row of the current account's link, matched to `transactionId` when one is given. */
async function bankRow(
  date: string,
  {
    amountMinor = RENT,
    transactionId = null,
  }: { amountMinor?: number; transactionId?: string | null } = {},
) {
  const id = randomUUID();
  await db.insert(bankTransactions).values({
    id,
    householdId: home.householdId,
    linkId: (await currentLink()).id,
    providerTxId: randomUUID(),
    date,
    amountMinor,
    currency: "GBP",
    raw: {},
    state: transactionId ? "matched" : "new",
    transactionId,
    version: 1,
  });
  return { id, date, amountMinor };
}

/** A payment that Bank sync made from a bank row, as when the bank row came before the Rule. */
async function bankSyncedPayment(date: string, amountMinor = RENT) {
  const { id } = await recordPayment(date, { amountMinor });
  await bankRow(date, { amountMinor, transactionId: id });
  return id;
}

function holders(
  rule: { id: string; template: RuleTemplate },
  days: readonly string[],
) {
  return withHousehold(db, home.householdId, (scope) =>
    reconciliation.occurrenceHolders(scope, rule, days),
  );
}

async function pairs(
  rows: readonly { id: string; date: string; amountMinor: number }[],
  linkFields: Partial<MatchLink> = {},
) {
  const matchLink = { ...(await currentLink()), ...linkFields };
  return withHousehold(db, home.householdId, (scope) =>
    reconciliation.pairBankRows(scope, matchLink, rows),
  );
}

describe("a Rule occurrence", () => {
  const rule = () => ({ id: randomUUID(), template: rentTemplate() });

  it("is held by the Transaction the Rule made for it, after Bank sync moved that Transaction to the bank row's day", async () => {
    const rent = await createRule();
    const madeId = occurrenceId(rent.id, "2026-01-31");
    await push("confirmExpected", {
      id: madeId,
      patch: { date: "2026-02-02" },
    });
    await bankRow("2026-02-02", { transactionId: madeId });

    expect(await holders(rent, ["2026-01-31"])).toEqual(
      new Map([["2026-01-31", { kind: "rule", transactionId: madeId }]]),
    );
  });

  it("is held by an imported Transaction of the Rule on its day", async () => {
    const rent = await createRule({ startsOn: "2026-03-31" });
    const { id } = await recordPayment("2026-01-31");
    await db
      .update(transactions)
      .set({ ruleId: rent.id, source: "import" })
      .where(eq(transactions.id, id));

    expect(await holders(rent, ["2026-01-31"])).toEqual(
      new Map([["2026-01-31", { kind: "rule", transactionId: id }]]),
    );
  });

  it("stays held by a skipped Transaction of the Rule", async () => {
    const rent = await createRule();
    const madeId = occurrenceId(rent.id, "2026-01-31");
    await push("skipExpected", { id: madeId });

    expect(await holders(rent, ["2026-01-31"])).toEqual(
      new Map([["2026-01-31", { kind: "rule", transactionId: madeId }]]),
    );
  });

  it.each(["2026-01-28", "2026-01-31", "2026-02-03"])(
    "is held by a bank-synced Transaction with no Rule dated %s, within three days",
    async (date) => {
      const paymentId = await bankSyncedPayment(date);

      expect(await holders(rule(), ["2026-01-31"])).toEqual(
        new Map([
          [
            "2026-01-31",
            { kind: "bank", transactionId: paymentId, ruleId: null },
          ],
        ]),
      );
    },
  );

  it.each([
    { case: "four days early", date: "2026-01-27", amountMinor: RENT },
    { case: "four days late", date: "2026-02-04", amountMinor: RENT },
    { case: "another amount", date: "2026-01-31", amountMinor: RENT + 1 },
  ])(
    "is free next to a bank-synced Transaction $case",
    async ({ date, amountMinor }) => {
      await bankSyncedPayment(date, amountMinor);

      expect(await holders(rule(), ["2026-01-31"])).toEqual(new Map());
    },
  );

  it("is free next to a Transaction that no bank row stands for", async () => {
    await recordPayment("2026-01-31");

    expect(await holders(rule(), ["2026-01-31"])).toEqual(new Map());
  });

  it("is free next to a bank-synced Transaction that another Rule has", async () => {
    const other = await createRule({ startsOn: "2026-03-31" });
    const paymentId = await bankSyncedPayment("2026-01-31");
    await db
      .update(transactions)
      .set({ ruleId: other.id })
      .where(eq(transactions.id, paymentId));

    expect(await holders(rule(), ["2026-01-31"])).toEqual(new Map());
  });

  it("gives each of two days its own bank-synced Transaction, the nearest one", async () => {
    const late = await bankSyncedPayment("2026-02-03");
    const early = await bankSyncedPayment("2026-02-02");

    expect(await holders(rule(), ["2026-01-31", "2026-02-05"])).toEqual(
      new Map([
        ["2026-01-31", { kind: "bank", transactionId: early, ruleId: null }],
        ["2026-02-05", { kind: "bank", transactionId: late, ruleId: null }],
      ]),
    );
  });
});

describe("a bank row", () => {
  it("confirms the Expected Transaction of a Rule within three days, and says its day", async () => {
    const rent = await createRule();
    const row = await bankRow("2026-02-02");

    expect(await pairs([row])).toEqual(
      new Map([
        [
          row.id,
          {
            action: "confirm",
            transactionId: occurrenceId(rent.id, "2026-01-31"),
            transactionDate: "2026-01-31",
          },
        ],
      ]),
    );
  });

  it("links a recorded Transaction, with the link's sign multiplier", async () => {
    const { id } = await recordPayment("2026-01-20");
    const row = await bankRow("2026-01-20", { amountMinor: -RENT });

    expect(await pairs([row], { signMultiplier: -1 })).toEqual(
      new Map([[row.id, { action: "link", transactionId: id }]]),
    );
  });

  it("settles an In transit Entry", async () => {
    const { result: inTransitId } = await runServerWrite(
      db,
      home.householdId,
      NOW,
      (context) => ensureInTransitAccount(context, "GBP"),
    );
    const { id, entryId } = await recordPayment("2026-01-20", {
      accountId: inTransitId,
    });
    const row = await bankRow("2026-01-22");

    expect(await pairs([row], { inTransitAccountId: inTransitId })).toEqual(
      new Map([[row.id, { action: "settle", transactionId: id, entryId }]]),
    );
  });

  it("pairs with no Transaction that another row of the link stands for", async () => {
    await bankSyncedPayment("2026-01-20");
    const row = await bankRow("2026-01-20");

    expect(await pairs([row])).toEqual(new Map());
  });

  it("stands for the same Transaction as the Rule occurrence it confirms", async () => {
    const rent = await createRule();
    const row = await bankRow("2026-02-02");
    const pair = (await pairs([row])).get(row.id);

    const holder = (await holders(rent, ["2026-01-31"])).get("2026-01-31");

    expect(holder?.transactionId).toBe(pair?.transactionId);
  });
});

describe("which Transactions a bank row stands for", () => {
  it("names the bank-synced ones only", async () => {
    const synced = await bankSyncedPayment("2026-01-20");
    const { id: recorded } = await recordPayment("2026-01-20");

    const backed = await withHousehold(db, home.householdId, (scope) =>
      reconciliation.bankBackedIds(scope, [synced, recorded]),
    );

    expect(backed).toEqual(new Set([synced]));
  });
});

describe("posting automatically", () => {
  it.each([
    { linked: [], expected: true },
    { linked: ["current"], expected: false },
    { linked: ["savings"], expected: false },
  ])(
    "a transfer Rule with linked accounts $linked may post automatically: $expected",
    ({ linked, expected }) => {
      const accountIds = linked.map((name) =>
        name === "current" ? home.currentId : home.savingsId,
      );
      const { entries } = rentTemplate([
        { accountId: home.savingsId, amountMinor: RENT },
        { accountId: home.currentId, amountMinor: -RENT },
      ]);

      expect(
        mayAutoPost(entries, (accountId) => accountIds.includes(accountId)),
      ).toBe(expected);
    },
  );

  it("stops on each Rule that uses an account once it gets a Bank link, and on no other", async () => {
    const current = await createRule({
      startsOn: "2026-11-01",
      autoPost: true,
    });
    const transfer = await createRule({
      startsOn: "2026-11-01",
      autoPost: true,
      template: rentTemplate([
        { accountId: home.savingsId, amountMinor: RENT },
        { accountId: home.cardId, amountMinor: -RENT },
      ]),
    });
    const autoPostOf = async () =>
      new Map(
        (
          await db
            .select({ id: rules.id, autoPost: rules.autoPost })
            .from(rules)
        ).map((row) => [row.id, row.autoPost]),
      );
    const before = await autoPostOf();
    await currentLink();

    await runServerWrite(db, home.householdId, NOW, (context) =>
      reconciliation.onAccountLinked(context.scope, home.currentId),
    );

    expect(before).toEqual(
      new Map([
        [current.id, true],
        [transfer.id, true],
      ]),
    );
    expect(await autoPostOf()).toEqual(
      new Map([
        [current.id, false],
        [transfer.id, true],
      ]),
    );
  });
});
