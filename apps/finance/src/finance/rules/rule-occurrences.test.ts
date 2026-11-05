import { randomUUID } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bankLinks,
  bankTransactions,
  connections,
  households,
  rules,
  transactions,
} from "../db/schema.ts";
import { materialiseRules } from "./materialise-rules.ts";
import { occurrenceId } from "./occurrence-id.ts";
import {
  balanceDays,
  createRule,
  db,
  home,
  insertImported,
  push,
  ruleDays,
  ruleTransactions,
  setUpRuleTestHousehold,
} from "./test-rule-occurrences.ts";

setUpRuleTestHousehold();

describe("a schedule change", () => {
  it("keeps one Expected per occurrence when the schedule changes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "previous" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-10-30"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "stay" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);
  });

  it("keeps a skipped occurrence skipped when the schedule keeps its day", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    await push("skipExpected", { id: occurrenceId(ruleId, "2026-11-01") }, now);

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleDays(ruleId)).toEqual([]);
  });

  it("leaves past Expected transactions alone when the schedule changes", async () => {
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1 },
      new Date("2026-09-28T12:00:00Z"),
    );
    expect(await ruleDays(ruleId)).toEqual(["2026-10-01"]);

    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "next" },
      new Date("2026-10-26T12:00:00Z"),
    );

    expect(await ruleDays(ruleId)).toEqual(["2026-10-01", "2026-11-02"]);
  });

  it("adds no second occurrence next to an imported one when the schedule changes", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-12-01" },
      now,
    );
    const importedId = await insertImported(ruleId, "2026-11-01");

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: importedId, date: "2026-11-01", status: "expected" },
    ]);
  });

  it("posts an imported auto_post occurrence once when the rule resumes on its day", async () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const ruleId = await createRule(
      {
        startsOn: "2026-10-01",
        dayOfMonth: 1,
        nextOn: "2026-12-01",
        autoPost: true,
        paused: true,
      },
      new Date("2026-10-26T12:00:00Z"),
    );
    const importedId = await insertImported(ruleId, "2026-11-01");

    await push("upsertRule", { id: ruleId, paused: false }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: importedId, date: "2026-11-01", status: "posted" },
    ]);
    expect(await balanceDays()).toEqual([
      { day: "2026-11-01", balanceMinor: -120_000 },
    ]);
  });

  it("does not bring back an occurrence that Bank sync confirmed on another day", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-11-01" },
      now,
    );
    const id = occurrenceId(ruleId, "2026-11-01");
    await push("confirmExpected", { id, patch: { date: "2026-10-30" } }, now);

    await push("upsertRule", { id: ruleId, startsOn: "2026-09-01" }, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id, date: "2026-10-30", status: "posted" },
    ]);
  });

  it("creates the occurrence of a day that a moved occurrence now has", async () => {
    const now = new Date("2026-10-28T12:00:00Z");
    const ruleId = await createRule(
      { unit: "week", startsOn: "2026-10-27", nextOn: "2026-12-01" },
      now,
    );
    const movedId = await insertImported(ruleId, "2026-11-03", {
      id: occurrenceId(ruleId, "2026-10-27"),
    });
    await db.update(rules).set({ nextOn: "2026-10-27" });

    await materialiseRules(db, home.householdId, now);

    const rows = await ruleTransactions(ruleId);
    expect(rows.map((row) => row.id).sort()).toEqual(
      [movedId, occurrenceId(ruleId, "2026-11-03")].sort(),
    );
    expect(rows.map((row) => row.date)).toEqual(["2026-11-03", "2026-11-03"]);
  });

  it("restores one occurrence for a day that has two deleted ones", async () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const ruleId = await createRule(
      { startsOn: "2026-10-01", dayOfMonth: 1, nextOn: "2026-12-01" },
      now,
    );
    await insertImported(ruleId, "2026-11-01");
    await insertImported(ruleId, "2026-11-01", {
      id: occurrenceId(ruleId, "2026-11-01"),
      deletedAt: new Date("2026-10-20T12:00:00Z"),
    });

    await push("upsertRule", { id: ruleId, nonBusinessDay: "next" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-02"]);

    await push("upsertRule", { id: ruleId, nonBusinessDay: "stay" }, now);
    expect(await ruleDays(ruleId)).toEqual(["2026-11-01"]);
  });
});

describe("a bank-backed Transaction on an occurrence's day", () => {
  const now = new Date("2026-01-25T12:00:00Z");
  let linkId: string | undefined;

  beforeEach(() => {
    linkId = undefined;
  });

  async function currentAccountLink() {
    if (linkId) return linkId;
    const connectionId = randomUUID();
    linkId = randomUUID();
    await db.insert(connections).values({
      id: connectionId,
      householdId: home.householdId,
      label: "Lunch Flow",
      version: 1,
    });
    await db.insert(bankLinks).values({
      id: linkId,
      householdId: home.householdId,
      connectionId,
      accountId: home.currentId,
      providerAccountId: "provider-current",
      currency: "GBP",
      version: 1,
    });
    return linkId;
  }

  /** A posted payment from the current account, matched to a bank row of it unless `backed` is false. */
  async function recordPayment(
    date: string,
    { amountMinor = -120_000, backed = true } = {},
  ) {
    const id = randomUUID();
    await push(
      "createTransaction",
      {
        id,
        kind: "expense",
        date,
        categoryId: home.groceriesId,
        entries: [{ id: randomUUID(), accountId: home.currentId, amountMinor }],
      },
      now,
    );
    if (backed) {
      await db.insert(bankTransactions).values({
        id: randomUUID(),
        householdId: home.householdId,
        linkId: await currentAccountLink(),
        providerTxId: randomUUID(),
        date,
        amountMinor,
        currency: "GBP",
        raw: {},
        state: "matched",
        transactionId: id,
        version: 1,
      });
    }
    return id;
  }

  async function transaction(id: string) {
    const [row] = await db
      .select({
        ruleId: transactions.ruleId,
        date: transactions.date,
        status: transactions.status,
        categoryId: transactions.categoryId,
        payeeId: transactions.payeeId,
        version: transactions.version,
      })
      .from(transactions)
      .where(eq(transactions.id, id));
    return row;
  }

  it("gives the Transaction the Rule and creates no occurrence", async () => {
    const paymentId = await recordPayment("2026-01-31");
    const before = await transaction(paymentId);

    const ruleId = await createRule({}, now);

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    const [household] = await db.select().from(households);
    expect(await transaction(paymentId)).toEqual({
      ...before,
      ruleId,
      version: household.clock,
    });
  });

  it("posts nothing twice for a Rule that posts automatically from before the Bank link", async () => {
    const paymentId = await recordPayment("2026-01-31");
    const ruleId = await createRule(
      { startsOn: "2026-02-01", dayOfMonth: 1 },
      new Date("2026-01-31T12:00:00Z"),
    );
    await db.update(rules).set({ autoPost: true }).where(eq(rules.id, ruleId));

    await materialiseRules(
      db,
      home.householdId,
      new Date("2026-02-01T08:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    expect(await balanceDays()).toEqual([
      { day: "2026-01-31", balanceMinor: -120_000 },
    ]);
  });

  it("gives one Transaction to one Rule only", async () => {
    const paymentId = await recordPayment("2026-01-31");

    const firstId = await createRule({}, now);
    const secondId = await createRule({ name: "Rent again" }, now);

    expect(await ruleTransactions(firstId)).toEqual([
      { id: paymentId, date: "2026-01-31", status: "posted" },
    ]);
    expect(await ruleTransactions(secondId)).toEqual([
      {
        id: occurrenceId(secondId, "2026-01-31"),
        date: "2026-01-31",
        status: "expected",
      },
    ]);
  });

  it("gives each of two Rules with the same amount its own Transaction", async () => {
    const paymentIds = [
      await recordPayment("2026-01-31"),
      await recordPayment("2026-01-31"),
    ];

    const ruleIds = [
      await createRule({}, now),
      await createRule({ name: "Rent again" }, now),
    ];

    const adopted = await db
      .select({ id: transactions.id, ruleId: transactions.ruleId })
      .from(transactions)
      .where(isNull(transactions.deletedAt));
    expect(adopted).toHaveLength(2);
    expect(adopted.map((row) => row.id).sort()).toEqual(paymentIds.sort());
    expect(adopted.map((row) => row.ruleId).sort()).toEqual(ruleIds.sort());
  });

  it("adds no occurrence next to the Transaction when the schedule changes", async () => {
    const paymentId = await recordPayment("2026-01-30");
    const ruleId = await createRule({}, now);

    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "next" },
      new Date("2026-01-30T12:00:00Z"),
    );
    await push(
      "upsertRule",
      { id: ruleId, nonBusinessDay: "stay" },
      new Date("2026-01-30T12:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([
      { id: paymentId, date: "2026-01-30", status: "posted" },
    ]);
  });
});
