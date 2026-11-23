import { and, asc, desc, eq, inArray } from "drizzle-orm";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import { riskSignoffSchema } from "../contracts/risk-review-schema.ts";
import { journalEntries, orders, runSteps, runs } from "../fund-schema.ts";
import {
  instrumentOf,
  type InstrumentLookup,
} from "../ledger/instrument-of.ts";
import { toGbp } from "../ledger/to-gbp.ts";
import { getBars } from "../market/get-bars.ts";
import { hasFundThesis, latestRiskPolicy } from "../meeting/load-fund-state.ts";
import { meetingStatus } from "../meeting/meeting-status.ts";
import { sessionFor } from "../meeting/session-for.ts";
import { estimateFeesGbp } from "../orders/estimate-fees-gbp.ts";
import { formatPrice } from "../orders/format-price.ts";
import { ordersNeedingCheck } from "../orders/orders-needing-check.ts";
import { toQuoteUnits } from "../orders/to-major-units.ts";
import type { Instrument, Order, Run, RunStep } from "../types.ts";
import { loadFundState, type FundState } from "./load-fund-state.ts";
import { londonToday } from "./london-today.ts";
import { orderView, type OrderView } from "./order-view.ts";
import {
  summariseFillHint,
  type FillHintSummary,
} from "./summarise-fill-hint.ts";

export type FeeInstrument = Pick<
  Instrument,
  "exchange" | "currency" | "quoteScale"
>;

export interface PendingOrderView extends OrderView {
  placedFor: string;
  /** The last session the owner answers for now. */
  through: string;
  hint: FillHintSummary;
  /** The prices of `hint`, written as a broker quotes them. */
  hintText: { extreme: string; price: string | null } | null;
  instrument: FeeInstrument;
  gbpUsd: number;
  /** What the sheet starts with. The price is in quote units. */
  prefill: {
    quantity: number;
    quotePrice: number;
    filledOn: string;
    feesGbp: number;
  };
}

export type StepBrief = Pick<RunStep, "key" | "role" | "status">;

export interface ActiveRunView extends Pick<
  Run,
  "id" | "kind" | "asOf" | "error"
> {
  status: "running" | "failed";
  /** True when no worker advances a running meeting. */
  stalled: boolean;
  steps: StepBrief[];
}

export interface TicketView extends OrderView {
  onExpiry: Order["onExpiry"];
  repriceLimitText: string | null;
  unfilledPlan: string;
  rationale: string;
  status: Order["status"];
  valueGbp: number;
}

export interface DecisionNote {
  id: string;
  symbol: string | null;
  name: string | null;
  summary: string;
  rationale: string;
}

export interface DecisionsView {
  runId: string;
  asOf: string;
  tickets: TicketView[];
  holds: DecisionNote[];
  cancels: DecisionNote[];
  rejected: DecisionNote[];
  noAction: DecisionNote | null;
  signoff: string | null;
}

/** An open order of an earlier meeting that the owner has already answered for: it still works at the broker. */
export interface StillWorkingOrderView extends OrderView {
  /** The day of the meeting that placed it. */
  meetingAsOf: string | null;
  /** The newest meeting's `hold` note on the stock, when the fund does not hold it. */
  note: DecisionNote | null;
}

export interface DeskView {
  state: FundState;
  pending: PendingOrderView[];
  /** Oldest first. */
  stillWorking: StillWorkingOrderView[];
  /** The fund has a thesis and a risk policy: what a morning meeting needs. */
  hasStrategy: boolean;
  /** The daily meeting of the session that a meeting held now decides for is over. */
  doneToday: boolean;
  activeRun: ActiveRunView | null;
  decisions: DecisionsView | null;
}

/** What the Desk shows: the fund, the orders that wait for the owner, the meeting, and the newest decisions. */
export async function loadDesk(db: FundDb): Promise<DeskView> {
  const today = londonToday();
  const [state, [openOrders, thesisExists, riskPolicy, latestRuns]] =
    await Promise.all([
      loadFundState(db, { history: "return", today }),
      Promise.all([
        db
          .select()
          .from(orders)
          .where(eq(orders.status, "open"))
          .orderBy(asc(orders.placedFor), asc(orders.symbol)),
        hasFundThesis(db),
        latestRiskPolicy(db),
        db.select().from(runs).orderBy(desc(runs.createdAt)).limit(20),
      ]),
    ]);
  const instrumentFor = instrumentOf(state.instruments);
  const gbpUsd = state.gbpUsd ?? 1;

  const needing = ordersNeedingCheck(openOrders, today);
  const newest = latestRuns.at(0);
  const activeRunRow =
    newest !== undefined &&
    (newest.status === "running" || newest.status === "failed")
      ? newest
      : null;
  const lastDaily = latestRuns.find(
    (run) => run.kind === "daily" && run.status === "completed",
  );
  const pendingIds = new Set(needing.map(({ order }) => order.id));
  const earlier = openOrders.filter(
    (order) => order.runId !== lastDaily?.id && !pendingIds.has(order.id),
  );
  const earlierRunIds = [...new Set(earlier.map((order) => order.runId))];

  const [hintBars, activeStatus, meetingRows, decisions] = await Promise.all([
    getBars(db, [...new Set(needing.map(({ order }) => order.symbol))], {
      before: today,
      sessions: 15,
    }),
    activeRunRow === null
      ? null
      : meetingStatus(db, activeRunRow.id, new Date()),
    earlierRunIds.length === 0
      ? []
      : db
          .select({ id: runs.id, asOf: runs.asOf })
          .from(runs)
          .where(inArray(runs.id, earlierRunIds)),
    lastDaily === undefined
      ? null
      : loadDecisions(db, lastDaily, instrumentFor, gbpUsd),
  ]);

  const pending = needing.map(({ order, through }): PendingOrderView => {
    const instrument = instrumentFor(order.symbol);
    const hint = summariseFillHint(order, hintBars, through);
    const price = hint.kind === "reachable" ? hint.price : order.limitPrice;
    return {
      ...orderView(order, instrument),
      placedFor: order.placedFor,
      through,
      hint,
      hintText:
        hint.kind === "no_sessions"
          ? null
          : {
              extreme: formatPrice(hint.extreme, instrument),
              price:
                hint.kind === "reachable"
                  ? formatPrice(hint.price, instrument)
                  : null,
            },
      instrument: {
        exchange: instrument.exchange,
        currency: instrument.currency,
        quoteScale: instrument.quoteScale,
      },
      gbpUsd,
      prefill: {
        quantity: order.quantity,
        quotePrice: toQuoteUnits(price, instrument),
        filledOn: hint.kind === "reachable" ? hint.date : through,
        feesGbp: estimateFeesGbp({
          instrument,
          side: order.side,
          quantity: order.quantity,
          price,
          gbpUsd,
        }),
      },
    };
  });

  const activeRun: ActiveRunView | null =
    activeRunRow === null
      ? null
      : {
          id: activeRunRow.id,
          kind: activeRunRow.kind,
          asOf: activeRunRow.asOf,
          status: activeRunRow.status === "failed" ? "failed" : "running",
          error: activeRunRow.error,
          stalled:
            activeRunRow.status === "running" && activeStatus?.held !== true,
          steps: activeStatus?.steps ?? [],
        };

  const meetingDays = new Map(meetingRows.map((run) => [run.id, run.asOf]));
  const held = new Set(
    state.portfolio.positions.map((position) => position.symbol),
  );
  const unheldHolds = new Map(
    (decisions?.holds ?? []).flatMap((note) =>
      note.symbol === null || held.has(note.symbol)
        ? []
        : [[note.symbol, note] as const],
    ),
  );
  const session = sessionFor(today);

  return {
    state,
    pending,
    stillWorking: earlier.map((order) => ({
      ...orderView(order, instrumentFor(order.symbol)),
      meetingAsOf: meetingDays.get(order.runId) ?? null,
      note: unheldHolds.get(order.symbol) ?? null,
    })),
    hasStrategy: thesisExists && riskPolicy !== null,
    doneToday: latestRuns.some(
      (run) =>
        run.kind === "daily" &&
        run.asOf === session &&
        run.status === "completed",
    ),
    activeRun,
    decisions:
      decisions === null
        ? null
        : {
            ...decisions,
            holds: decisions.holds.filter(
              (note) => note.symbol !== null && held.has(note.symbol),
            ),
          },
  };
}

async function loadDecisions(
  db: FundDb,
  run: Run,
  instrumentFor: InstrumentLookup,
  gbpUsd: number,
): Promise<DecisionsView> {
  const [runOrders, entries, signoffStep] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.runId, run.id))
      .orderBy(asc(orders.side), asc(orders.symbol)),
    db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.runId, run.id),
          inArray(journalEntries.kind, [
            "hold",
            "no_action",
            "rejected",
            "cancel_order",
          ]),
        ),
      )
      .orderBy(asc(journalEntries.symbol)),
    db
      .select({ output: runSteps.output })
      .from(runSteps)
      .where(and(eq(runSteps.runId, run.id), eq(runSteps.key, "risk_signoff")))
      .limit(1),
  ]);
  const note = (entry: (typeof entries)[number]): DecisionNote => ({
    id: entry.id,
    symbol: entry.symbol,
    name: entry.symbol === null ? null : instrumentFor(entry.symbol).name,
    summary: entry.summary,
    rationale: entry.rationale,
  });
  const signoff = riskSignoffSchema.safeParse(signoffStep.at(0)?.output);
  const noAction = entries.find((entry) => entry.kind === "no_action");
  return {
    runId: run.id,
    asOf: run.asOf,
    tickets: runOrders.map((order) => {
      const instrument = instrumentFor(order.symbol);
      return {
        ...orderView(order, instrument),
        onExpiry: order.onExpiry,
        repriceLimitText:
          order.repriceLimit === null
            ? null
            : formatPrice(order.repriceLimit, instrument),
        unfilledPlan: order.unfilledPlan,
        rationale: order.rationale,
        status: order.status,
        valueGbp: toGbp(order.quantity * order.limitPrice, instrument, gbpUsd),
      };
    }),
    holds: entries.filter((entry) => entry.kind === "hold").map(note),
    cancels: entries.filter((entry) => entry.kind === "cancel_order").map(note),
    rejected: entries.filter((entry) => entry.kind === "rejected").map(note),
    noAction: noAction === undefined ? null : note(noAction),
    signoff: signoff.success ? signoff.data.statement : null,
  };
}
