import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "#src/db/testing/create-test-db.ts";
import { recordNoFill } from "../desk/record-no-fill.ts";
import {
  cashEntries,
  journalEntries,
  orders,
  riskPolicyVersions,
  runSteps,
  theses,
  thesisVersions,
} from "../fund-schema.ts";
import { addWeekdays } from "../orders/add-weekdays.ts";
import { advanceRun } from "./advance-run.ts";
import { AgentCallError } from "./agent-call-error.ts";
import { startMeeting } from "./start-meeting.ts";
import { stepOutputs } from "./step-outputs.ts";
import {
  fakeAgent,
  testAction,
  testDecision,
  testPolicy,
  testReview,
} from "./testing/fake-agent.ts";
import { holdTestMeeting } from "./testing/hold-test-meeting.ts";
import { MEETING_DAY, seedTestMarket } from "./testing/seed-test-market.ts";

let db: TestDb;
const NEXT_DAY = addWeekdays(MEETING_DAY, 1);

beforeEach(async () => {
  db = await createTestDb();
  await seedTestMarket(db);
});

afterEach(async () => {
  await db.close();
});

async function journalKinds(date?: string) {
  const rows = await db
    .select({ kind: journalEntries.kind, symbol: journalEntries.symbol })
    .from(journalEntries)
    .where(date === undefined ? undefined : eq(journalEntries.date, date));
  return rows.map((r) => `${r.kind} ${r.symbol ?? "-"}`).sort();
}

async function versionCounts() {
  return {
    thesis: (await db.select().from(thesisVersions)).length,
    policy: (await db.select().from(riskPolicyVersions)).length,
  };
}

/** Holds the first meeting and reports its order unfilled, so that the next day's meeting can start. */
async function holdFirstDay() {
  const first = await holdTestMeeting(db);
  expect(first.outcome).toBe("completed");
  for (const order of await db.select().from(orders)) {
    await recordNoFill(db, { orderId: order.id, through: MEETING_DAY });
  }
}

const keepThesis = {
  verdict: "keep",
  evidence: "Nothing new changes it.",
  revised: null,
  changeNote: null,
} as const;

describe("the first meeting", () => {
  it("writes the thesis and the policy, books the deposit once and places the order that passes the rules", async () => {
    const meeting = await holdTestMeeting(db);
    expect(meeting.outcome).toBe("completed");

    const fundTheses = await db
      .select()
      .from(theses)
      .where(eq(theses.scope, "fund"));
    expect(fundTheses).toHaveLength(1);
    const fundVersions = await db
      .select({ version: thesisVersions.version })
      .from(thesisVersions)
      .where(eq(thesisVersions.thesisId, fundTheses[0].id));
    expect(fundVersions).toEqual([{ version: 1 }]);
    const policies = await db.select().from(riskPolicyVersions);
    expect(policies.map((p) => p.version)).toEqual([1]);

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
    expect(await journalKinds()).toEqual([
      "buy AAPL",
      "fund_thesis -",
      "rejected SHEL.L",
      "risk_policy -",
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
    expect(await journalKinds()).toHaveLength(4);

    await recordNoFill(db, { orderId: placed[0].id, through: MEETING_DAY });
    const next = await startMeeting(db, {
      asOf: NEXT_DAY,
      tier: "dev",
      language: "en",
    });
    expect(next.status).toBe("started");
    const deposits = await db.select().from(cashEntries);
    expect(deposits.map((d) => [d.date, d.amountGbp])).toEqual([
      [MEETING_DAY, 20_000],
    ]);
  });

  it("clamps a policy limit that is looser than the owner's guardrails", async () => {
    const meeting = await holdTestMeeting(db, {
      risk_review: testReview({
        policyReview: {
          verdict: "revise",
          evidence: "First policy.",
          revised: testPolicy({ maxPositionWeightPct: 35 }),
          changeNote: null,
        },
      }),
    });
    expect(meeting.outcome).toBe("completed");
    const [policy] = await db.select().from(riskPolicyVersions);
    expect(policy.policy).toMatchObject({
      limits: { maxPositionWeightPct: 20 },
    });
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
      "fund_thesis -",
      "no_action -",
      "rejected AAPL",
      "rejected SHEL.L",
      "risk_policy -",
    ]);
    expect(
      await db.select().from(theses).where(eq(theses.scope, "position")),
    ).toEqual([]);
  });
});

describe("a later meeting", () => {
  it("waits while the owner has not reported an open order", async () => {
    await holdTestMeeting(db);
    const order = (await db.select().from(orders))[0];
    expect(
      await startMeeting(db, { asOf: NEXT_DAY, tier: "dev", language: "en" }),
    ).toEqual({ status: "blocked", ordersToCheck: [order.id] });
  });

  it("writes no version and no journal entry for them when the thesis and the policy are kept", async () => {
    await holdFirstDay();
    const before = await versionCounts();
    const keepDecision = testDecision({
      thesisReview: keepThesis,
      actions: [],
      noActionReason: "Wait for the AAPL order.",
    });
    const meeting = await holdTestMeeting(
      db,
      {
        pm_draft: keepDecision,
        pm_final: keepDecision,
        risk_review: testReview({
          policyReview: keepThesis,
        }),
      },
      { asOf: NEXT_DAY },
    );
    expect(meeting.outcome).toBe("completed");
    expect(await versionCounts()).toEqual(before);
    expect(await journalKinds(NEXT_DAY)).toEqual(["no_action -"]);
  });

  it("checks the final decision against a policy that the review tightened", async () => {
    await holdFirstDay();
    const buyMsft = testDecision({
      thesisReview: keepThesis,
      actions: [
        testAction({
          symbol: "MSFT",
          action: "buy",
          targetWeightPct: 10,
          limitPrice: 398,
          validSessions: 3,
          onExpiry: "cancel",
          unfilledPlan: "Lapse.",
          thesis: {
            summary: "Cloud.",
            drivers: [],
            invalidation: [],
            horizonMonths: 12,
            valuation: "Fair.",
          },
        }),
      ],
    });
    const meeting = await holdTestMeeting(
      db,
      {
        pm_draft: buyMsft,
        pm_final: buyMsft,
        risk_review: testReview({
          policyReview: {
            verdict: "revise",
            evidence: "Volatility rose.",
            revised: testPolicy({ maxPositionWeightPct: 5 }),
            changeNote: "One stock is now at most 5%.",
          },
        }),
      },
      { asOf: NEXT_DAY },
    );
    expect(meeting.outcome).toBe("completed");
    const steps = await db
      .select({ key: runSteps.key, output: runSteps.output })
      .from(runSteps)
      .where(eq(runSteps.runId, meeting.runId));
    const planned = (key: string) =>
      stepOutputs.checks
        .parse(steps.find((s) => s.key === key)?.output)
        .plan.planned.map((o) => o.symbol);
    expect(planned("checks_draft")).toEqual(["MSFT"]);
    expect(planned("checks_final")).toEqual([]);
    expect(
      (await db.select().from(orders)).filter((o) => o.symbol === "MSFT"),
    ).toEqual([]);
    const policies = await db.select().from(riskPolicyVersions);
    expect(policies.map((p) => p.version).sort()).toEqual([1, 2]);
    expect(await journalKinds(NEXT_DAY)).toEqual([
      "no_action -",
      "rejected MSFT",
      "risk_policy -",
    ]);
  });
});

describe("a meeting that a later one replaced", () => {
  it("is not advanced, so its old plan places nothing", async () => {
    const first = await startMeeting(db, {
      asOf: MEETING_DAY,
      tier: "dev",
      language: "en",
    });
    const second = await startMeeting(db, {
      asOf: NEXT_DAY,
      tier: "dev",
      language: "en",
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
