import { and, asc, desc, eq, gte, inArray, lt, lte, or } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import {
  fundThesisSchema,
  positionThesisSchema,
  type FundThesis,
  type PositionThesis,
} from "../contracts/fund-thesis-schema.ts";
import {
  riskPolicySchema,
  type RiskPolicy,
} from "../contracts/risk-policy-schema.ts";
import {
  cashEntries,
  fills,
  orders,
  riskPolicyVersions,
  theses,
  thesisVersions,
} from "../fund-schema.ts";
import { BENCHMARK, FX_SYMBOL } from "../guardrails.ts";
import { addDays } from "../ledger/add-days.ts";
import { derivePortfolio } from "../ledger/derive-portfolio.ts";
import {
  instrumentOf,
  type InstrumentLookup,
} from "../ledger/instrument-of.ts";
import { valuePortfolio } from "../ledger/value-portfolio.ts";
import { getBars } from "../market/get-bars.ts";
import { getFxSeries } from "../market/get-fx-series.ts";
import { getInstruments } from "../market/get-instruments.ts";
import type {
  BarsBySymbol,
  CashEntry,
  FxSeries,
  Instrument,
  Order,
  ValuedPortfolio,
} from "../types.ts";

/** About 14 months of sessions: enough for a 12-month return and a 1-year beta. */
export const HISTORY_SESSIONS = 300;
/** An ended order stays in the PM's pack this long after its last day. */
const RECENT_ORDER_DAYS = 21;

export interface ThesisRecord<T> {
  thesisId: string;
  version: number;
  body: T;
  changeNote: string | null;
  createdAt: Date;
}

/** The fund as the meeting of `asOf` sees it. */
export interface FundState {
  asOf: string;
  instruments: Instrument[];
  instrumentFor: InstrumentLookup;
  cashEntries: CashEntry[];
  fx: FxSeries;
  gbpUsd: number;
  /** The held stocks, the stocks asked for, the benchmarks and the FX rate. */
  bars: BarsBySymbol;
  portfolio: ValuedPortfolio;
  openOrders: Order[];
  /** Orders that ended in the last weeks, newest first. */
  recentOrders: Order[];
  fundThesis: ThesisRecord<FundThesis> | null;
  riskPolicy: {
    version: number;
    policy: RiskPolicy;
    changeNote: string | null;
  } | null;
  /** Active position theses by symbol. */
  positionTheses: Map<string, ThesisRecord<PositionThesis>>;
}

export async function loadFundState(
  db: FundDb,
  asOf: string,
  { symbols = [] }: { symbols?: readonly string[] } = {},
): Promise<FundState> {
  // One query at a time: `db` can be a transaction, which has one connection.
  const instruments = await getInstruments(db);
  const fillRows = await db
    .select()
    .from(fills)
    .where(lte(fills.filledOn, asOf));
  const cashRows = await db
    .select()
    .from(cashEntries)
    .where(lte(cashEntries.date, asOf));
  const orderRows = await db
    .select()
    .from(orders)
    .where(
      and(
        lt(orders.placedFor, asOf),
        or(
          eq(orders.status, "open"),
          gte(orders.validUntil, addDays(asOf, -RECENT_ORDER_DAYS)),
        ),
      ),
    )
    .orderBy(desc(orders.placedFor), asc(orders.createdAt));
  const fx = await getFxSeries(db, {
    before: asOf,
    sessions: HISTORY_SESSIONS,
  });
  const gbpUsd = fx.at(-1)?.gbpUsd;
  if (gbpUsd === undefined) {
    throw new Error(`There is no GBPUSD rate before ${asOf}.`);
  }
  const portfolio = derivePortfolio({
    fills: fillRows,
    cashEntries: cashRows,
    asOf,
  });
  const openOrders = orderRows.filter((order) => order.status === "open");
  const recentOrders = orderRows.filter((order) => order.status !== "open");
  const wanted = new Set([
    ...symbols,
    ...portfolio.positions.map((p) => p.symbol),
    ...openOrders.map((o) => o.symbol),
    BENCHMARK.symbols.LSE,
    BENCHMARK.symbols.US,
    FX_SYMBOL,
  ]);
  const bars = await getBars(db, [...wanted], {
    before: asOf,
    sessions: HISTORY_SESSIONS,
  });
  const valued = valuePortfolio(portfolio, { instruments, bars, gbpUsd });

  return {
    asOf,
    instruments,
    instrumentFor: instrumentOf(instruments),
    cashEntries: cashRows,
    fx,
    gbpUsd,
    bars,
    portfolio: valued,
    openOrders,
    recentOrders,
    fundThesis: await latestFundThesis(db),
    riskPolicy: await latestRiskPolicy(db),
    positionTheses: await activePositionTheses(db),
  };
}

const isActiveFundThesis = and(
  eq(theses.scope, "fund"),
  eq(theses.status, "active"),
);

/** The id of the fund thesis that the meetings follow, or null before the first strategy session. */
export async function activeFundThesisId(db: FundDb): Promise<string | null> {
  const row = (
    await db
      .select({ id: theses.id })
      .from(theses)
      .where(isActiveFundThesis)
      .limit(1)
  ).at(0);
  return row?.id ?? null;
}

export async function hasFundThesis(db: FundDb): Promise<boolean> {
  return (await activeFundThesisId(db)) !== null;
}

async function latestFundThesis(
  db: FundDb,
): Promise<ThesisRecord<FundThesis> | null> {
  const row = (
    await db
      .select({
        thesisId: theses.id,
        version: thesisVersions.version,
        body: thesisVersions.body,
        changeNote: thesisVersions.changeNote,
        createdAt: thesisVersions.createdAt,
      })
      .from(thesisVersions)
      .innerJoin(theses, eq(theses.id, thesisVersions.thesisId))
      .where(isActiveFundThesis)
      .orderBy(desc(thesisVersions.createdAt), desc(thesisVersions.version))
      .limit(1)
  ).at(0);
  return row ? { ...row, body: fundThesisSchema.parse(row.body) } : null;
}

/** The newest version of the risk policy, or null before the first strategy session. */
export async function latestRiskPolicy(db: FundDb) {
  const row = (
    await db
      .select()
      .from(riskPolicyVersions)
      .orderBy(desc(riskPolicyVersions.version))
      .limit(1)
  ).at(0);
  return row
    ? {
        version: row.version,
        policy: riskPolicySchema.parse(row.policy),
        changeNote: row.changeNote,
      }
    : null;
}

async function activePositionTheses(
  db: FundDb,
): Promise<Map<string, ThesisRecord<PositionThesis>>> {
  const active = await db
    .select({ id: theses.id, symbol: theses.symbol })
    .from(theses)
    .where(and(eq(theses.scope, "position"), eq(theses.status, "active")));
  const result = new Map<string, ThesisRecord<PositionThesis>>();
  if (active.length === 0) return result;
  const versions = await db
    .select()
    .from(thesisVersions)
    .where(
      inArray(
        thesisVersions.thesisId,
        active.map((t) => t.id),
      ),
    )
    .orderBy(asc(thesisVersions.version));
  for (const thesis of active) {
    const latest = versions.filter((v) => v.thesisId === thesis.id).at(-1);
    if (!latest || thesis.symbol === null) continue;
    result.set(thesis.symbol, {
      thesisId: thesis.id,
      version: latest.version,
      body: positionThesisSchema.parse(latest.body),
      changeNote: latest.changeNote,
      createdAt: latest.createdAt,
    });
  }
  return result;
}
