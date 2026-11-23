import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "#src/db/testing/create-test-db.ts";
import { fills, journalEntries, orders, theses } from "../fund-schema.ts";
import { addDays } from "../ledger/add-days.ts";
import { holdTestMeeting } from "../meeting/testing/hold-test-meeting.ts";
import {
  GBP_USD,
  MEETING_DAY,
  seedTestMarket,
} from "../meeting/testing/seed-test-market.ts";
import { addWeekdays } from "../orders/add-weekdays.ts";
import type { Order } from "../types.ts";
import { recordFill } from "./record-fill.ts";
import { recordNoFill } from "./record-no-fill.ts";

let db: TestDb;
/** The AAPL buy of the test meeting: limit $199, three sessions. */
let buy: Order;

beforeEach(async () => {
  db = await createTestDb();
  await seedTestMarket(db);
  await holdTestMeeting(db);
  buy = (await db.select().from(orders))[0];
});

afterEach(async () => {
  await db.close();
});

async function orderNow(id: string) {
  return (await db.select().from(orders).where(eq(orders.id, id)))[0];
}

async function sellOrder(placedFor: string, quantity: number) {
  const [row] = await db
    .insert(orders)
    .values({
      runId: buy.runId,
      symbol: "AAPL",
      side: "sell",
      quantity,
      limitPrice: 190,
      placedFor,
      validUntil: addWeekdays(placedFor, 2),
      onExpiry: "cancel",
      unfilledPlan: "Sell at the next meeting.",
      rationale: "The thesis broke.",
      thesisId: buy.thesisId,
      status: "open",
    })
    .returning();
  return row;
}

describe("recordFill", () => {
  it("refuses a fill the order could not have had", async () => {
    const fill = (patch: Partial<Parameters<typeof recordFill>[1]>) =>
      recordFill(db, {
        orderId: buy.id,
        quantity: buy.quantity,
        price: 198,
        filledOn: MEETING_DAY,
        ...patch,
      });
    await expect(fill({ quantity: buy.quantity + 1 })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      fill({ filledOn: addWeekdays(buy.validUntil, 1) }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(fill({ price: 200 })).rejects.toMatchObject({ status: 400 });
    expect(await db.select().from(fills)).toEqual([]);
  });

  it("ends the rest of a partial fill and keeps new shares locked", async () => {
    await recordFill(db, {
      orderId: buy.id,
      quantity: buy.quantity - 2,
      price: 198,
      filledOn: MEETING_DAY,
    });
    const after = await orderNow(buy.id);
    expect(after.status).toBe("filled");
    expect(after.statusNote).not.toBeNull();
    const [fill] = await db.select().from(fills);
    expect(fill).toMatchObject({
      quantity: buy.quantity - 2,
      price: 198,
      gbpUsd: GBP_USD,
    });
    const filled = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.kind, "filled"));
    expect(filled).toHaveLength(1);

    const early = await sellOrder(addWeekdays(MEETING_DAY, 5), 1);
    await expect(
      recordFill(db, {
        orderId: early.id,
        quantity: 1,
        price: 195,
        filledOn: early.placedFor,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("closes the thesis when a sale empties the position", async () => {
    const quantity = buy.quantity;
    await recordFill(db, {
      orderId: buy.id,
      quantity,
      price: 199,
      filledOn: MEETING_DAY,
    });
    const sell = await sellOrder(addDays(MEETING_DAY, 45), quantity);
    await recordFill(db, {
      orderId: sell.id,
      quantity,
      price: 195,
      filledOn: sell.placedFor,
    });
    expect(buy.thesisId).not.toBeNull();
    const [thesis] = await db
      .select()
      .from(theses)
      .where(eq(theses.id, buy.thesisId ?? ""));
    expect(thesis.status).toBe("closed");
  });
});

describe("recordNoFill", () => {
  it("keeps the order open until its last session, then expires it with its plan and closes its thesis", async () => {
    await recordNoFill(db, { orderId: buy.id, through: buy.placedFor });
    expect(await orderNow(buy.id)).toMatchObject({
      status: "open",
      checkedThrough: buy.placedFor,
    });

    await recordNoFill(db, {
      orderId: buy.id,
      through: addWeekdays(buy.validUntil, 3),
      language: "en",
    });
    expect(await orderNow(buy.id)).toMatchObject({
      status: "expired",
      checkedThrough: buy.validUntil,
    });
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.orderId, buy.id));
    expect(entries.map((e) => e.kind).sort()).toEqual([
      "buy",
      "expired",
      "not_filled",
    ]);
    const expired = entries.find((e) => e.kind === "expired");
    expect(expired?.rationale).toContain("Let it lapse and look again.");
    const [thesis] = await db
      .select()
      .from(theses)
      .where(eq(theses.id, buy.thesisId ?? ""));
    expect(thesis.status).toBe("closed");
  });
});
