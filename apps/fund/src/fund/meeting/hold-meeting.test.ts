import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "#src/db/testing/create-test-db.ts";
import {
  cashEntries,
  journalEntries,
  orders,
  runSteps,
  theses,
} from "../fund-schema.ts";
import { addWeekdays } from "../orders/add-weekdays.ts";
import { advanceRun } from "./advance-run.ts";
import { AgentCallError } from "./agent-call-error.ts";
import { startMeeting } from "./start-meeting.ts";
import { fakeAgent } from "./testing/fake-agent.ts";
import { holdTestMeeting } from "./testing/hold-test-meeting.ts";
import { MEETING_DAY, seedTestMarket } from "./testing/seed-test-market.ts";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
  await seedTestMarket(db);
});

afterEach(async () => {
  await db.close();
});

async function journalKinds() {
  const rows = await db
    .select({ kind: journalEntries.kind, symbol: journalEntries.symbol })
    .from(journalEntries);
  return rows.map((r) => `${r.kind} ${r.symbol ?? "-"}`).sort();
}

describe("a daily meeting", () => {
  it("needs a strategy session first", async () => {
    expect(
      await startMeeting(db, { kind: "daily", asOf: MEETING_DAY, tier: "dev" }),
    ).toEqual({ status: "needs_strategy" });
  });

  it("places the order that passes the rules and journals the one that breaks them, once", async () => {
    const meeting = await holdTestMeeting(db);
    expect(meeting.outcome).toBe("completed");

    const deposits = await db.select().from(cashEntries);
    expect(deposits.map((d) => d.amountGbp)).toEqual([20_000]);

    const placed = await db.select().from(orders);
    expect(placed).toHaveLength(1);
    expect(placed[0]).toMatchObject({
      symbol: "AAPL",
      side: "buy",
      limitPrice: 199,
      status: "open",
    });
    expect(placed[0].thesisId).not.toBeNull();

    // The PM priced SHEL.L at 26, which is pence, not the 2600p it trades at.
    const rejected = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.kind, "rejected"));
    expect(rejected.map((r) => r.symbol)).toEqual(["SHEL.L"]);

    expect(await journalKinds()).toEqual([
      "buy AAPL",
      "rejected SHEL.L",
      "strategy -",
    ]);

    // A nomination outside the universe gets no analyst.
    const analysts = meeting.calls
      .map((c) => c.stepKey)
      .filter((k) => k.startsWith("analyst:"));
    expect(analysts).not.toContain("analyst:NOPE");

    const callsBefore = meeting.calls.length;
    expect(await meeting.advanceAgain()).toBe("busy");
    expect(meeting.calls).toHaveLength(callsBefore);
    expect(await db.select().from(orders)).toHaveLength(1);
    expect(await journalKinds()).toHaveLength(3);
  });

  it("goes on when an analyst fails", async () => {
    const meeting = await holdTestMeeting(db, {
      "analyst:AAPL": new AgentCallError("refusal", "Refused.", {
        transient: false,
      }),
    });
    expect(meeting.outcome).toBe("completed");
    const failed = await db
      .select({ key: runSteps.key, status: runSteps.status })
      .from(runSteps)
      .where(eq(runSteps.status, "failed"));
    expect(failed).toEqual([{ key: "analyst:AAPL", status: "failed" }]);
    const pm = meeting.calls.find((c) => c.stepKey === "pm_draft");
    expect(pm?.message).toContain("AAPL");
  });

  it("does not place an order that risk vetoes", async () => {
    const meeting = await holdTestMeeting(db, {
      risk_signoff: {
        statement: "No.",
        verdicts: [{ symbol: "AAPL", verdict: "vetoed", reason: "Too early." }],
      },
    });
    expect(meeting.outcome).toBe("completed");
    expect(await db.select().from(orders)).toEqual([]);
    expect(await journalKinds()).toEqual([
      "no_action -",
      "rejected AAPL",
      "rejected SHEL.L",
      "strategy -",
    ]);
    expect(
      await db.select().from(theses).where(eq(theses.scope, "position")),
    ).toEqual([]);
  });

  it("waits while the owner has not reported an open order", async () => {
    await holdTestMeeting(db);
    const order = (await db.select().from(orders))[0];
    const nextDay = addWeekdays(order.placedFor, 1);
    expect(
      await startMeeting(db, { kind: "daily", asOf: nextDay, tier: "dev" }),
    ).toEqual({ status: "blocked", ordersToCheck: [order.id] });
  });
});

describe("a meeting that a later one replaced", () => {
  it("is not advanced, so its old plan places nothing", async () => {
    const first = await startMeeting(db, {
      kind: "strategy",
      asOf: MEETING_DAY,
      tier: "dev",
    });
    const second = await startMeeting(db, {
      kind: "strategy",
      asOf: addWeekdays(MEETING_DAY, 1),
      tier: "dev",
    });
    if (first.status !== "started" || second.status !== "started") {
      throw new Error("The two runs did not start.");
    }
    const outcome = await advanceRun(
      {
        db,
        agent: fakeAgent(),
        language: "en",
        refreshMarket: null,
        now: () => new Date(),
      },
      first.runId,
      { deadline: Date.now() + 60_000 },
    );
    expect(outcome).toBe("busy");
    expect(await db.select().from(theses)).toEqual([]);
  });
});
